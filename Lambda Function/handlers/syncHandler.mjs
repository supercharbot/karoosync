import https from 'https';
import zlib from 'zlib';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const s3Client = new S3Client({ region: 'ap-southeast-2' });
const lambdaClient = new LambdaClient({ region: 'ap-southeast-2' });
const BUCKET_NAME = 'karoosync';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

// Preserve description formatting - Handle both HTML and plain text with full formatting preservation
function preserveDescriptionFormatting(htmlContent) {
    if (!htmlContent) return '';
    
    let content = htmlContent.trim();
    
    // If content contains HTML tags, preserve all formatting
    if (content.includes('<') && content.includes('>')) {
        // Normalize line endings but preserve all HTML structure and formatting
        content = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Preserve paragraph breaks by normalizing excessive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Clean up whitespace around HTML tags while preserving structure
            .replace(/>\s+</g, '><')
            // Ensure proper spacing after block elements
            .replace(/(<\/(?:p|div|h[1-6]|ul|ol|li|blockquote|pre)>)(?!\s*<)/gi, '$1\n')
            // Remove any orphaned closing paragraph tags that might cause issues
            .replace(/^\s*<\/p>/gi, '')
            // Ensure we don't have unclosed paragraph tags
            .replace(/<p([^>]*)>([^<]*(?:<(?!\/p>)[^<]*)*)<\/p>/gi, '<p$1>$2</p>');
        
        // If content doesn't start with a block element, wrap in paragraph
        if (!/^\s*<(?:p|div|h[1-6]|ul|ol|blockquote|pre|table)/i.test(content)) {
            // Check if it's just inline content that needs wrapping
            if (!/<\/(?:p|div|h[1-6]|ul|ol|blockquote|pre|table)>/i.test(content)) {
                content = `<p>${content}</p>`;
            }
        }
        
        return content;
    }
    
    // For plain text content, convert to proper HTML with paragraph structure
    // Split by double line breaks to create paragraphs
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    
    if (paragraphs.length === 0) return '';
    
    // Convert each paragraph, preserving single line breaks as <br> within paragraphs
    const htmlParagraphs = paragraphs.map(para => {
        const cleanPara = para.trim()
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n/g, '<br>');
        return `<p>${cleanPara}</p>`;
    });
    
    return htmlParagraphs.join('\n');
}

// Generate UUID for WordPress auth and sync tracking
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

async function initializeWordPressAuth(storeUrl) {
    try {
        let url = storeUrl;
        if (url && !url.startsWith('http')) {
            url = `https://${url}`;
        }

        const apiUrl = `${url}/wp-json`;
        
        return new Promise((resolve, reject) => {
            const req = https.request(apiUrl, { timeout: 10000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.authentication && parsed.authentication['application-passwords']) {
                            const authEndpoint = parsed.authentication['application-passwords'].endpoints.authorization;
                            const redirectUri = process.env.REDIRECT_URI || process.env.FRONTEND_URL || 'https://karoosync.com/app';
                            
                            const params = new URLSearchParams({
                                app_name: 'Karoosync - WooCommerce Product Editor',
                                app_id: generateUUID(),
                                success_url: `${redirectUri}?store_url=${encodeURIComponent(storeUrl)}`,
                                reject_url: `${redirectUri}?error=access_denied`
                            });
                            
                            resolve({
                                success: true,
                                authUrl: `${authEndpoint}?${params}`
                            });
                        } else {
                            reject(new Error('Application Passwords not available on this site'));
                        }
                    } catch (parseError) {
                        reject(new Error('Invalid response from WordPress site'));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(new Error(`Cannot connect to WordPress site: ${error.message}`));
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Connection timeout'));
            });
            
            req.end();
        });
    } catch (err) {
        throw new Error('Failed to initialize WordPress auth: ' + err.message);
    }
}

// Enhanced WordPress API request function
function makeWordPressRequest(baseUrl, endpoint, auth, params = {}, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${baseUrl}${endpoint}`);
        if (method === 'GET') {
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        }
        
        const options = {
            method: method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'User-Agent': 'Karoosync/2.0',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data ? JSON.parse(data) : {});
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (parseError) {
                    reject(new Error(`Parse error: ${parseError.message}`));
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (body && method !== 'GET') {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        
        req.end();
    });
}

// Update sync status in S3
async function updateSyncStatus(userId, syncId, statusUpdate) {
    try {
        let currentStatus = {
            syncId,
            status: 'unknown',
            progress: 0,
            startedAt: new Date().toISOString()
        };
        
        // Try to get current status
        try {
            const currentResponse = await s3Client.send(new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/sync-status.json`
            }));
            
            currentStatus = JSON.parse(await currentResponse.Body.transformToString());
        } catch (error) {
            // File doesn't exist yet, use defaults
        }
        
        // Merge with update
        const updatedStatus = {
            ...currentStatus,
            ...statusUpdate,
            lastUpdated: new Date().toISOString()
        };
        
        // Store updated status
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/sync-status.json`,
            Body: JSON.stringify(updatedStatus),
            ContentType: 'application/json'
        }));
        
        console.log(`📊 Sync status updated: ${updatedStatus.status} (${updatedStatus.progress}%)`);
        
    } catch (error) {
        console.error('❌ Failed to update sync status:', error);
    }
}

async function fetchAllProducts(baseUrl, auth, onProgress = null) {
    console.log('🔄 Starting fetchAllProducts with API approach testing...');
    const allProducts = [];
    
    // Test different API approaches to find one that works
    const apiApproaches = [
        { 
            name: "Minimal parameters",
            params: { per_page: 50 },
            perPage: 50
        },
        { 
            name: "Published products only",
            params: { page: 1, per_page: 100, status: 'publish' },
            perPage: 100
        },
        { 
            name: "All products (no status filter)",
            params: { page: 1, per_page: 100 },
            perPage: 100
        }
    ];
    
    let workingApproach = null;
    
    // Test each approach until we find one that returns an array
    for (let i = 0; i < apiApproaches.length; i++) {
        const approach = apiApproaches[i];
        console.log(`🧪 Testing approach ${i + 1}: ${approach.name}`);
        
        try {
            const testResponse = await makeWordPressRequest(
                baseUrl, 
                '/wp-json/wc/v3/products', 
                auth, 
                approach.params
            );
            
            console.log(`📊 Response type: ${typeof testResponse}, Is array: ${Array.isArray(testResponse)}, Length: ${testResponse?.length || 'N/A'}`);
            
            if (testResponse && Array.isArray(testResponse) && testResponse.length > 0) {
                console.log(`✅ SUCCESS! Approach "${approach.name}" returned ${testResponse.length} products`);
                workingApproach = approach;
                allProducts.push(...testResponse);
                break;
            }
            
        } catch (error) {
            console.error(`❌ Approach "${approach.name}" failed:`, error.message);
        }
    }
    
    if (!workingApproach) {
        console.error('❌ All API approaches failed to return products');
        return [];
    }
    
    console.log(`🚀 Using working approach: "${workingApproach.name}"`);
    
    // Now use the working approach for pagination
    let page = 2; // Start from page 2 since we got page 1 already
    
    while (page <= 50) {
        console.log(`📄 Fetching products page ${page}...`);
        
        try {
            const pageParams = {
                ...workingApproach.params,
                page: page
            };
            
            const products = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products', auth, pageParams);
            
            // Check if we got no products (end reached)
            if (!products || !Array.isArray(products) || products.length === 0) {
                console.log(`✅ End reached: Page ${page} returned 0 products`);
                break;
            }
            
            // Check if we got the same products (duplicate page)
            const currentProductIds = products.map(p => p.id);
            const isAllDuplicates = currentProductIds.every(id => 
                allProducts.some(existingProduct => existingProduct.id === id)
            );
            
            if (isAllDuplicates && page > 2) {
                console.log(`✅ End reached: Page ${page} contains duplicate products`);
                break;
            }
            
            // Add products
            allProducts.push(...products);
            
            if (onProgress) {
                onProgress(0.1 + (page / 50) * 0.5);
            }
            
            console.log(`✅ Page ${page}: ${products.length} products loaded, total: ${allProducts.length}`);
            
            // Traditional end detection
            if (products.length < workingApproach.perPage) {
                console.log(`✅ End reached: Page ${page} has ${products.length} < ${workingApproach.perPage} products`);
                break;
            }
            
            page++;
            await new Promise(resolve => setTimeout(resolve, 150));
            
        } catch (error) {
            console.error(`❌ Failed to fetch products page ${page}:`, error.message);
            break;
        }
    }
    
    console.log(`🎉 Total products fetched: ${allProducts.length}`);
    return allProducts;
}

// Fetch all variations for variable products
async function fetchAllVariations(baseUrl, auth, variableProducts, onProgress = null) {
    console.log(`🔄 Fetching variations for ${variableProducts.length} variable products...`);
    const allVariations = [];
    const startTime = Date.now();
    const MAX_VARIATIONS_TIME = 300000; // 5 minutes max for variations
    
    for (let i = 0; i < variableProducts.length; i++) {
        const product = variableProducts[i];
        
        // TIMEOUT PROTECTION: Check if we've been running too long
        const elapsed = Date.now() - startTime;
        if (elapsed > MAX_VARIATIONS_TIME) {
            console.warn(`⏰ TIMEOUT PROTECTION: Variations fetch stopped after ${elapsed/1000}s at product ${i+1}/${variableProducts.length}`);
            console.warn(`⏰ Collected ${allVariations.length} variations so far - continuing sync without remaining variations`);
            break;
        }
        
        try {
            console.log(`📄 Fetching variations for product ${product.id} (${i + 1}/${variableProducts.length}) - ${Math.round(elapsed/1000)}s elapsed`);
            
            // Add timeout to individual request
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Individual variation request timeout')), 30000) // 30 sec per product
            );
            
            const fetchPromise = makeWordPressRequest(
                baseUrl, 
                `/wp-json/wc/v3/products/${product.id}/variations`, 
                auth, 
                { per_page: 100 }
            );
            
            const variations = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (variations && variations.length > 0) {
                const enhancedVariations = variations.map(variation => ({
                    ...variation,
                    parent_id: product.id,
                    type: 'variation'
                }));
                
                allVariations.push(...enhancedVariations);
                console.log(`✅ Loaded ${variations.length} variations for product ${product.id} (Total: ${allVariations.length})`);
            } else {
                console.log(`📄 No variations found for product ${product.id}`);
            }
            
            // Report progress
            if (onProgress) {
                onProgress(0.6 + (i / variableProducts.length) * 0.2);
            }
            
            // Shorter rate limiting to speed up process
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`⚠️ Failed to fetch variations for product ${product.id}:`, error.message);
            
            // CONTINUE WITH NEXT PRODUCT instead of stopping
            if (error.message.includes('timeout')) {
                console.warn(`⚠️ Timeout on product ${product.id} - skipping to next product`);
            }
            continue; // Important: continue to next product
        }
    }
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`🎉 Variations fetch completed in ${totalTime}s: ${allVariations.length} total variations from ${variableProducts.length} variable products`);
    
    return allVariations;
}

// Fetch orders data for analytics
async function fetchOrdersData(baseUrl, auth, onProgress = null) {
    console.log('📊 Fetching orders data for analytics...');
    const allOrders = [];
    let page = 1;
    const perPage = 100;
    
    // Fetch orders from last 365 days (configurable)
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 365);
    const dateFromISO = dateFrom.toISOString();
    
    while (true) {
        try {
            console.log(`📄 Fetching orders page ${page}...`);
            
            const orders = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/orders', auth, {
                page: page,
                per_page: perPage,
                after: dateFromISO,
                orderby: 'date',
                order: 'desc'
            });
            
            if (!orders || orders.length === 0) {
                console.log(`✅ No more orders found on page ${page}`);
                break;
            }
            
            // Process and add orders
            const processedOrders = orders.map(order => ({
                id: order.id,
                number: order.number,
                status: order.status,
                currency: order.currency,
                date_created: order.date_created,
                date_modified: order.date_modified,
                total: parseFloat(order.total) || 0,
                subtotal: parseFloat(order.subtotal) || 0,
                total_tax: parseFloat(order.total_tax) || 0,
                shipping_total: parseFloat(order.shipping_total) || 0,
                discount_total: parseFloat(order.discount_total) || 0,
                payment_method: order.payment_method,
                payment_method_title: order.payment_method_title,
                customer_id: order.customer_id,
                billing: {
                    email: order.billing?.email || '',
                    phone: order.billing?.phone || '',
                    country: order.billing?.country || ''
                },
                line_items: (order.line_items || []).map(item => ({
                    id: item.id,
                    name: item.name,
                    product_id: item.product_id,
                    variation_id: item.variation_id,
                    quantity: item.quantity,
                    price: parseFloat(item.price) || 0,
                    total: parseFloat(item.total) || 0
                }))
            }));
            
            allOrders.push(...processedOrders);
            
            console.log(`✅ Loaded ${orders.length} orders from page ${page} (Total: ${allOrders.length})`);
            
            // Report progress
            if (onProgress) {
                onProgress(page / 10); // Estimate progress
            }
            
            // Break if we got fewer orders than requested (last page)
            if (orders.length < perPage) break;
            page++;
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            console.error(`❌ Failed to fetch orders page ${page}:`, error.message);
            break;
        }
    }
    
    console.log(`🎉 Total orders fetched: ${allOrders.length}`);
    return allOrders;
}

// Comprehensive data extraction (no time limits)
async function extractWooCommerceData(url, username, appPassword, userId, syncId) {
    console.log('🚀 Starting comprehensive WooCommerce data extraction...');
    const startTime = Date.now();
    
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    try {
        // Test connection first
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 5,
            message: 'Testing WooCommerce connection...'
        });
        
        try {
            await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/system_status', auth);
            console.log('✅ WooCommerce connection successful');
        } catch (connectionError) {
            throw new Error(`Cannot connect to WooCommerce API: ${connectionError.message}`);
        }
        
        // Fetch core data
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 10,
            message: 'Fetching products and categories...'
        });
        
        const [products, categories] = await Promise.all([
            fetchAllProducts(baseUrl, auth, (progress) => {
                updateSyncStatus(userId, syncId, {
                    status: 'processing',
                    progress: 10 + (progress * 50), // 10-60%
                    message: `Fetching products... (${Math.round(progress * 100)}%)`
                });
            }),
            makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/categories', auth, { per_page: 100 })
        ]);
        
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 80,
            message: 'Fetching product variations...'
        });
        
        // Fetch variations
        const variableProducts = products.filter(p => p.type === 'variable');
        const variations = await fetchAllVariations(baseUrl, auth, variableProducts, (progress) => {
            updateSyncStatus(userId, syncId, {
                status: 'processing',
                progress: 80 + (progress - 0.6) * 50, // 80-90%
                message: `Fetching variations... (${Math.round((progress - 0.6) * 250)}%)`
            });
        });
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        // Fetch orders data for analytics
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 90,
            message: 'Fetching orders data for analytics...'
        });
        
        const orders = await fetchOrdersData(baseUrl, auth, (progress) => {
            updateSyncStatus(userId, syncId, {
                status: 'processing',
                progress: 90 + (progress * 5), // 90-95%
                message: `Fetching orders... (${Math.round(progress * 100)}%)`
            });
        });
        console.log(`✅ Comprehensive data extraction completed in ${totalTime}s`);
        
        return {
            products: products || [],
            variations: variations || [],
            categories: categories || [],
            orders: orders || [],
            totalProducts: products.length + variations.length,
            extractedAt: new Date().toISOString(),
            extractionTime: totalTime,
            isComplete: true
        };
                
    } catch (error) {
        console.error('❌ Data extraction failed:', error);
        throw new Error(`Failed to extract WooCommerce data: ${error.message}`);
    }
}

// Normalize and structure data for new architecture
function normalizeWooCommerceData(rawData) {
    console.log('🔄 Normalizing WooCommerce data for new architecture...');
    
    const {
        products: rawProducts,
        variations: rawVariations,
        categories: rawCategories
    } = rawData;
    
    // 1. Normalize products
    const normalizedProducts = {};

    // Group variations by parent_id
    const variationsByParent = {};
    rawVariations.forEach(variation => {
        const parentId = variation.parent_id;
        if (!variationsByParent[parentId]) {
            variationsByParent[parentId] = [];
        }
        variationsByParent[parentId].push(variation);
    });

    // Add main products with their variations
    rawProducts.forEach(product => {
        // Attach variations to variable products
        if (product.type === 'variable' && variationsByParent[product.id]) {
            product.variations = variationsByParent[product.id];
        }
        normalizedProducts[product.id] = normalizeProduct(product);
    });
    
    // 2. Normalize categories with hierarchy
    const normalizedCategories = {};
    const categoryHierarchy = { root: [] };
    
    rawCategories.forEach(category => {
        normalizedCategories[category.id] = {
            id: category.id,
            name: category.name,
            slug: category.slug,
            parent_id: category.parent || 0,
            description: category.description || '',
            display: category.display || 'default',
            image: category.image || null,
            menu_order: category.menu_order || 0,
            count: category.count || 0,
            children: []
        };
        
        // Build hierarchy
        if (!category.parent || category.parent === 0) {
            categoryHierarchy.root.push(category.id);
        } else {
            if (!categoryHierarchy[category.parent]) {
                categoryHierarchy[category.parent] = [];
            }
            categoryHierarchy[category.parent].push(category.id);
        }
    });
    
    // Update children arrays
    Object.keys(categoryHierarchy).forEach(parentId => {
        if (parentId !== 'root' && normalizedCategories[parentId]) {
            normalizedCategories[parentId].children = categoryHierarchy[parentId] || [];
        }
    });
    
    console.log('✅ Data normalization completed');
    console.log(`📊 Normalized: ${Object.keys(normalizedProducts).length} products, ${Object.keys(normalizedCategories).length} categories`);
    
    return {
        products: normalizedProducts,
        categories: { categories: normalizedCategories, hierarchy: categoryHierarchy }
    };
}

// Normalize individual product data
function normalizeProduct(product) {
    // Extract category IDs from objects
    const categoryIds = (product.categories || []).map(cat => {
        console.log(`🔍 Product ${product.id} processing category:`, cat, 'extracted ID:', cat.id);
        return cat.id;
    }).filter(id => id);

    console.log(`✅ Product ${product.id} final category_ids:`, categoryIds);
    
    // Keep product-level references but don't rely on global data
    const tagIds = (product.tags || []).map(tag => tag.id);
    const shippingClassId = product.shipping_class_id || 
        (product.shipping_class ? parseInt(product.shipping_class) : null);
    const taxClassId = product.tax_class || 'standard';
    
    // Normalize attributes
    const attributes = (product.attributes || []).map(attr => ({
        id: attr.id || 0,
        name: attr.name,
        slug: attr.slug || attr.name?.toLowerCase().replace(/\s+/g, '-'),
        position: attr.position || 0,
        visible: attr.visible !== false,
        variation: attr.variation || false,
        options: attr.options || []
    }));
    
    // Handle variations (for variable products)
    const variations = product.type === 'variable' ? 
        (product.variations || []) : [];
    
    return {
        id: product.id,
        name: product.name || '',
        slug: product.slug || '',
        sku: product.sku || '',
        type: product.type || 'simple',
        status: product.status || 'publish',
        featured: product.featured || false,
        virtual: product.virtual || false,
        downloadable: product.downloadable || false,
        
        // Parent ID for variations
        ...(product.parent_id && { parent_id: product.parent_id }),
        
        // NEW: Additional WooCommerce fields
        permalink: product.permalink || '',
        tax_status: product.tax_status || 'taxable',
        default_attributes: product.default_attributes || [],
        grouped_products: product.grouped_products || [],
        upsell_ids: product.upsell_ids || [],
        cross_sell_ids: product.cross_sell_ids || [],
        meta_data: product.meta_data || [],
        
        // Pricing
        regular_price: product.regular_price || '',
        sale_price: product.sale_price || '',
        date_on_sale_from: product.date_on_sale_from || '',
        date_on_sale_to: product.date_on_sale_to || '',
        
        // Content - WITH FORMATTING PRESERVATION
        description: preserveDescriptionFormatting(product.description || ''),
        short_description: preserveDescriptionFormatting(product.short_description || ''),
        purchase_note: product.purchase_note || '',
        
        // Taxonomy (as IDs for relationships)
        category_ids: categoryIds,
        tag_ids: tagIds,
        shipping_class_id: shippingClassId,
        tax_class_id: taxClassId,
        
        // Keep original arrays for display
        tags: product.tags || [],
        shipping_classes: product.shipping_classes || [],
        
        // Attributes
        attributes: attributes,
        
        // Inventory
        manage_stock: product.manage_stock || false,
        stock_quantity: product.stock_quantity || null,
        stock_status: product.stock_status || 'instock',
        backorders: product.backorders || 'no',
        sold_individually: product.sold_individually || false,
        low_stock_amount: product.low_stock_amount || null,
        
        // Shipping
        weight: product.weight || '',
        dimensions: product.dimensions || { length: '', width: '', height: '' },
        shipping_class: product.shipping_class || '',
        shipping_class_id: shippingClassId,
        
        // Images
        images: product.images || [],
        
        // Variable product data
        ...(variations.length > 0 && { variations: variations }),
        
        // External product
        external_url: product.external_url || '',
        button_text: product.button_text || '',
        
        // Downloads
        downloads: product.downloads || [],
        download_limit: product.download_limit || -1,
        download_expiry: product.download_expiry || -1,
        
        // Meta
        menu_order: product.menu_order || 0,
        reviews_allowed: product.reviews_allowed !== false,
        average_rating: product.average_rating || '0',
        rating_count: product.rating_count || 0,
        date_created: product.date_created || '',
        date_modified: product.date_modified || '',
        
        // Catalog
        catalog_visibility: product.catalog_visibility || 'visible'
    };
}

// Build query optimization indexes
function buildIndexes(normalizedData) {
    console.log('🔄 Building query optimization indexes...');
    
    const { products, categories } = normalizedData;
    
    // 1. Category index
    const categoryProducts = {};
    const productCategories = {};
    
    Object.values(products).forEach(product => {
        if (product.category_ids && product.category_ids.length > 0) {
            // Add product to each category
            product.category_ids.forEach(categoryId => {
                if (!categoryProducts[categoryId]) {
                    categoryProducts[categoryId] = [];
                }
                categoryProducts[categoryId].push(product.id);
            });
            
            // Track which categories this product belongs to
            productCategories[product.id] = product.category_ids;
        } else {
            // Uncategorized products
            if (!categoryProducts['uncategorized']) {
                categoryProducts['uncategorized'] = [];
            }
            categoryProducts['uncategorized'].push(product.id);
            productCategories[product.id] = ['uncategorized'];
        }
    });
    
    // 2. Status index
    const statusProducts = {};
    Object.values(products).forEach(product => {
        if (!statusProducts[product.status]) {
            statusProducts[product.status] = [];
        }
        statusProducts[product.status].push(product.id);
    });
    
    // 3. Type index
    const typeProducts = {};
    Object.values(products).forEach(product => {
        if (!typeProducts[product.type]) {
            typeProducts[product.type] = [];
        }
        typeProducts[product.type].push(product.id);
    });
    
    // 4. Search index (basic)
    const searchIndex = {};
    Object.values(products).forEach(product => {
        const searchTerms = [
            product.name,
            product.sku,
            product.description,
            product.short_description
        ].filter(Boolean).join(' ').toLowerCase().split(/\s+/);
        
        searchTerms.forEach(term => {
            if (term.length > 2) { // Only index terms longer than 2 characters
                if (!searchIndex[term]) {
                    searchIndex[term] = [];
                }
                if (!searchIndex[term].includes(product.id)) {
                    searchIndex[term].push(product.id);
                }
            }
        });
    });
    
    console.log('✅ Index building completed');
    console.log(`📊 Built indexes: ${Object.keys(categoryProducts).length} categories, ${Object.keys(statusProducts).length} statuses, ${Object.keys(typeProducts).length} types`);
    
    return {
        byCategoryIndex: {
            category_products: categoryProducts,
            product_categories: productCategories,
            last_updated: new Date().toISOString()
        },
        byStatusIndex: {
            status_products: statusProducts,
            last_updated: new Date().toISOString()
        },
        byTypeIndex: {
            type_products: typeProducts,
            last_updated: new Date().toISOString()
        },
        searchIndex: {
            search_terms: searchIndex,
            last_updated: new Date().toISOString()
        }
    };
}

// Calculate analytics metrics from orders data
function calculateAnalytics(orders) {
    console.log('📊 Calculating analytics metrics...');
    
    if (!orders || orders.length === 0) {
        return {
            total_orders: 0,
            total_revenue: 0,
            avg_order_value: 0,
            orders_this_month: 0,
            revenue_this_month: 0,
            top_products: [],
            sales_by_status: {},
            monthly_trends: [],
            last_calculated: new Date().toISOString()
        };
    }
    
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedOrders = orders.filter(order => 
        ['completed', 'processing', 'on-hold'].includes(order.status)
    );
    
    // Basic metrics
    const totalOrders = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // This month metrics
    const thisMonthOrders = completedOrders.filter(order => 
        new Date(order.date_created) >= thisMonth
    );
    const ordersThisMonth = thisMonthOrders.length;
    const revenueThisMonth = thisMonthOrders.reduce((sum, order) => sum + order.total, 0);
    
    // Top products by revenue
    const productSales = {};
    completedOrders.forEach(order => {
        order.line_items.forEach(item => {
            if (!productSales[item.product_id]) {
                productSales[item.product_id] = {
                    product_id: item.product_id,
                    name: item.name,
                    total_sold: 0,
                    quantity_sold: 0,
                    revenue: 0
                };
            }
            productSales[item.product_id].total_sold += item.total;
            productSales[item.product_id].quantity_sold += item.quantity;
            productSales[item.product_id].revenue += item.total;
        });
    });
    
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    
    // Sales by status
    const salesByStatus = {};
    orders.forEach(order => {
        if (!salesByStatus[order.status]) {
            salesByStatus[order.status] = {
                count: 0,
                revenue: 0
            };
        }
        salesByStatus[order.status].count++;
        salesByStatus[order.status].revenue += order.total;
    });
    
    // Monthly trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthOrders = completedOrders.filter(order => {
            const orderDate = new Date(order.date_created);
            return orderDate >= monthStart && orderDate <= monthEnd;
        });
        
        const monthRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0);
        
        monthlyTrends.push({
            month: monthStart.toISOString().substring(0, 7), // YYYY-MM
            orders: monthOrders.length,
            revenue: monthRevenue,
            avg_order_value: monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0
        });
    }
    
    console.log(`✅ Analytics calculated: ${totalOrders} orders, $${totalRevenue.toFixed(2)} revenue`);
    
    return {
        total_orders: totalOrders,
        total_revenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
        avg_order_value: Math.round(avgOrderValue * 100) / 100,
        orders_this_month: ordersThisMonth,
        revenue_this_month: Math.round(revenueThisMonth * 100) / 100,
        top_products: topProducts,
        sales_by_status: salesByStatus,
        monthly_trends: monthlyTrends,
        last_calculated: new Date().toISOString()
    };
}

// Store all data in new S3 architecture
async function storeInS3(userId, normalizedData, syncId) {
    console.log('💾 Storing data in new S3 architecture...');
    const timestamp = new Date().toISOString();
    
    try {
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 90,
            message: 'Building indexes and preparing files...'
        });
        
        // Build indexes
        const indexes = buildIndexes(normalizedData);
        // Calculate analytics from orders
        const analytics = calculateAnalytics(normalizedData.orders || []);
        
        // Prepare all files for upload
        const files = [
            // Core data files
            {
                key: `users/${userId}/products.json.gz`,
                data: {
                    products: normalizedData.products,
                    total_count: Object.keys(normalizedData.products).length,
                    last_updated: timestamp,
                    sync_version: '2.0'
                }
            },
            {
                key: `users/${userId}/categories.json.gz`,
                data: {
                    ...normalizedData.categories,
                    last_updated: timestamp
                }
            },
            // Analytics data files
            {
                key: `users/${userId}/analytics/orders.json.gz`,
                data: {
                    orders: normalizedData.orders || [],
                    total_count: (normalizedData.orders || []).length,
                    last_updated: timestamp,
                    sync_version: '2.0'
                }
            },
            
            // Index files
            {
                key: `users/${userId}/indexes/by-category.json.gz`,
                data: indexes.byCategoryIndex
            },
            {
                key: `users/${userId}/indexes/by-status.json.gz`,
                data: indexes.byStatusIndex
            },
            {
                key: `users/${userId}/indexes/by-type.json.gz`,
                data: indexes.byTypeIndex
            },
            {
                key: `users/${userId}/indexes/search-index.json.gz`,
                data: indexes.searchIndex
            },
            
            // Store metadata
            {
                key: `users/${userId}/store-metadata.json.gz`,
                data: {
                    store_info: {
                        total_products: Object.keys(normalizedData.products).length,
                        total_categories: Object.keys(normalizedData.categories.categories).length
                    },
                    analytics_info: {
                        total_orders: analytics.total_orders,
                        total_revenue: analytics.total_revenue,
                        avg_order_value: analytics.avg_order_value,
                        orders_this_month: analytics.orders_this_month,
                        revenue_this_month: analytics.revenue_this_month,
                        last_analytics_sync: timestamp
                    },
                    sync_status: {
                        last_sync: timestamp,
                        sync_version: '2.0',
                        status: 'completed'
                    },
                    architecture_version: '2.0'
                }
            },
            // Analytics summary file
            {
                key: `users/${userId}/analytics/summary.json.gz`,
                data: analytics
            }
        ];
        
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 95,
            message: `Uploading ${files.length} files to S3...`
        });
        
        // Upload all files
        await Promise.all(files.map(async (file) => {
            const compressedData = zlib.gzipSync(JSON.stringify(file.data));
            
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file.key,
                Body: compressedData,
                ContentType: 'application/json',
                ContentEncoding: 'gzip'
            }));
            
            console.log(`✅ Uploaded: ${file.key.split('/').pop()}`);
        }));
        
        console.log('🎉 All data successfully stored in new S3 architecture!');
        
        return {
            success: true,
            architecture_version: '2.0-focused',
            files_created: files.length,
            total_products: Object.keys(normalizedData.products || {}).length,
            total_categories: Object.keys(normalizedData.categories?.categories || {}).length,
            sync_completed_at: timestamp
        };
        
    } catch (error) {
        console.error('❌ Failed to store data in S3:', error);
        throw new Error(`S3 storage failed: ${error.message}`);
    }
}

async function processBackgroundSync(event) {
    const { userId, syncId, credentials } = event;
    const { url, username, appPassword } = credentials;
    
    console.log(`🚀 Starting background sync for user: ${userId}, syncId: ${syncId}`);
    console.log(`📍 Store URL: ${url}`);
    
    try {
        // RESTART PREVENTION: Check if already completed
        try {
            const existingStatus = await s3Client.send(new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/sync-status.json`
            }));
            const status = JSON.parse(await existingStatus.Body.transformToString());
            if (status.status === 'completed') {
                console.log('✅ RESTART PREVENTION: Sync already completed, exiting');
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, message: 'Already completed' })
                };
            }
        } catch (e) {
            console.log('📝 No existing completed status, proceeding...');
        }

        // STEP 1: Extract data
        console.log('🔄 STEP 1: Starting data extraction...');
        const rawData = await extractWooCommerceData(url, username, appPassword, userId, syncId);
        console.log(`✅ STEP 1 COMPLETE: ${rawData.products.length} products, ${rawData.variations.length} variations, ${rawData.orders.length} orders`);

        // STEP 2: Normalize data  
        console.log('🔄 STEP 2: Starting data normalization...');
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 85,
            message: 'Normalizing data structure...'
        });
        
        const normalizedData = normalizeWooCommerceData(rawData);
        console.log(`✅ STEP 2 COMPLETE: Normalized ${Object.keys(normalizedData.products).length} products`);

        // STEP 3: Store in S3
        console.log('🔄 STEP 3: Starting S3 storage...');
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 90,
            message: 'Storing data in cloud...'
        });
        
        const storeResult = await storeInS3(userId, normalizedData, syncId);
        console.log('✅ STEP 3 COMPLETE: Data stored in S3');

        // STEP 4: Store credentials
        console.log('🔄 STEP 4: Storing credentials...');
        const credentialsData = { url, username, appPassword };
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/credentials.json.gz`,
            Body: zlib.gzipSync(JSON.stringify(credentialsData)),
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));
        console.log('✅ STEP 4 COMPLETE: Credentials stored');

        // STEP 5: Mark as completed
        console.log('🔄 STEP 5: Marking sync as completed...');
        await updateSyncStatus(userId, syncId, {
            status: 'completed',
            progress: 100,
            message: 'Sync completed successfully!',
            completedAt: new Date().toISOString(),
            result: {
                ...storeResult,
                metadata: {
                    totalProducts: Object.keys(normalizedData.products).length,
                    totalCategories: Object.keys(normalizedData.categories.categories).length,
                    extractedAt: rawData.extractedAt,
                    isComplete: rawData.isComplete
                }
            }
        });
        
        console.log('🎉 ALL STEPS COMPLETE: Background sync finished successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Background sync completed' })
        };
        
    } catch (error) {
        console.error('❌ SYNC FAILED AT SOME STEP:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Stack trace:', error.stack);
        
        await updateSyncStatus(userId, syncId, {
            status: 'failed',
            progress: 0,
            message: `Sync failed: ${error.message}`,
            failedAt: new Date().toISOString(),
            error: error.message
        });
        
        // Return error response instead of throwing to prevent AWS retry
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
}

// Get user credentials from S3
async function getUserCredentials(userId) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/credentials.json.gz`
        }));
        
        const compressed = await response.Body.transformToByteArray();
        const credentials = JSON.parse(zlib.gunzipSync(compressed).toString());
        
        return credentials;
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return null;
        }
        throw error;
    }
}

export async function handleSync(event, userId) {
    console.log(`🔄 Sync handler called: ${event.httpMethod}, userId: ${userId}`);
    console.log(`📋 Query params:`, event.queryStringParameters);
    
    // Handle background sync processing (from async invocation)
    if (event.source === 'async-sync') {
        await processBackgroundSync(event);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Background sync completed' })
        };
    }
    
    // Handle WordPress auth initialization
    if (event.httpMethod === 'GET' && event.queryStringParameters?.action === 'init-auth') {
        const storeUrl = event.queryStringParameters.url;
        
        try {
            const result = await initializeWordPressAuth(storeUrl);
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            };
        } catch (error) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: error.message })
            };
        }
    }
    
    // Handle sync status check
    if (event.httpMethod === 'GET' && event.queryStringParameters?.action === 'sync-status') {
        try {
            const response = await s3Client.send(new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/sync-status.json`
            }));
            
            const statusData = JSON.parse(await response.Body.transformToString());
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(statusData)
            };
            
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        status: 'not_found', 
                        message: 'No sync in progress' 
                    })
                };
            }
            
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: error.message })
            };
        }
    }
    
    // Handle POST requests (sync operations)
    if (event.httpMethod === 'POST') {
        console.log(`🔄 Processing sync request for user: ${userId}`);
        
        try {
            let requestData;
            try {
                requestData = JSON.parse(event.body || '{}');
            } catch (parseError) {
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' })
                };
            }
            
            // Handle resync with stored credentials
            if (event.queryStringParameters?.action === 'resync') {
                console.log('🔄 Re-sync requested - using stored credentials');
                
                try {
                    const credentials = await getUserCredentials(userId);
                    
                    if (!credentials) {
                        return {
                            statusCode: 400,
                            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                success: false, 
                                error: 'No stored credentials found. Please reconnect your store.'
                            })
                        };
                    }
                    
                    // Start async sync
                    const syncId = generateUUID();
                    
                    // Store initial sync status
                    await updateSyncStatus(userId, syncId, {
                        status: 'started',
                        progress: 0,
                        message: 'Sync started...',
                        syncType: 'resync'
                    });
                    
                    // Invoke Lambda function asynchronously
                    await lambdaClient.send(new InvokeCommand({
                        FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
                        InvocationType: 'Event',
                        Payload: JSON.stringify({
                            source: 'async-sync',
                            userId: userId,
                            syncId: syncId,
                            credentials: credentials
                        })
                    }));
                    
                    return {
                        statusCode: 200,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            success: true,
                            syncId: syncId,
                            message: 'Re-sync started in background',
                            statusUrl: `?action=sync-status&syncId=${syncId}`
                        })
                    };
                    
                } catch (error) {
                    console.error('Re-sync error:', error);
                    return {
                        statusCode: 500,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ success: false, error: error.message })
                    };
                }
            }
            
            // Handle initial sync
            const { url, username, appPassword } = requestData;
            
            if (!url || !username || !appPassword) {
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: 'Missing required fields: url, username, appPassword' })
                };
            }
            
            console.log(`🔗 Starting async sync for store: ${url}`);
            
            // Start async sync
            const syncId = generateUUID();
            
            // Store initial sync status
            await updateSyncStatus(userId, syncId, {
                status: 'started',
                progress: 0,
                message: 'Initial sync started...',
                syncType: 'initial'
            });
            
            // Invoke Lambda function asynchronously
            await lambdaClient.send(new InvokeCommand({
                FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
                InvocationType: 'Event',
                Payload: JSON.stringify({
                    source: 'async-sync',
                    userId: userId,
                    syncId: syncId,
                    credentials: { url, username, appPassword }
                })
            }));
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    syncId: syncId,
                    message: 'Sync started in background',
                    statusUrl: `?action=sync-status&syncId=${syncId}`
                })
            };
            
        } catch (error) {
            console.error('Sync error:', error);
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: error.message })
            };
        }
    }
    
    return {
        statusCode: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
}