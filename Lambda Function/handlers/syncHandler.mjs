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

// Fetch all products with comprehensive pagination
async function fetchAllProducts(baseUrl, auth, onProgress = null) {
    console.log('🛒 Starting comprehensive product fetch...');
    const allProducts = [];
    let page = 1;
    let hasLoggedStructure = false;
    
    while (page <= 500) { // Increased limit
        console.log(`📄 Fetching products page ${page}...`);
        
        try {
            // Try multiple API approaches for categories
            const products = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products', auth, {
                page,
                per_page: 100, // Increased from 20
                status: 'any',
                _embed: true,
                context: 'edit' // Request full edit context for more data
            });
            
            if (!products || products.length === 0) break;
            
            // DEBUG: Log structure once
            if (!hasLoggedStructure && products[0]) {
                console.log('🔍 Raw WordPress product structure:', JSON.stringify(products[0], null, 2));
                hasLoggedStructure = true;
                
                // Log available fields
                const fields = Object.keys(products[0]);
                console.log('🔍 Available product fields:', fields);
                
                // Check for category-related fields
                const categoryFields = fields.filter(field => 
                    field.toLowerCase().includes('cat') || 
                    field.toLowerCase().includes('term') ||
                    field.toLowerCase().includes('tax')
                );
                console.log('🔍 Category-related fields found:', categoryFields);
            }
            
            // Enhanced category extraction for each product
            const enhancedProducts = products.map(product => {
                let extractedCategories = [];
                
                // Method 1: Standard categories field
                if (product.categories && Array.isArray(product.categories)) {
                    extractedCategories = product.categories;
                    console.log(`📂 Product ${product.id} - Standard categories:`, extractedCategories);
                }
                
                // Method 2: Check _embedded data
                else if (product._embedded && product._embedded['wp:term']) {
                    const terms = product._embedded['wp:term'].flat();
                    extractedCategories = terms.filter(term => term.taxonomy === 'product_cat');
                    console.log(`📂 Product ${product.id} - Embedded categories:`, extractedCategories);
                }
                
                // Method 3: Check _links for category relations
                else if (product._links && product._links['wp:term']) {
                    console.log(`📂 Product ${product.id} - Found category links, may need separate fetch`);
                }
                
                // Method 4: Check for custom category fields
                const customCatFields = ['product_cat', 'product_category', 'categories_ids'];
                for (const field of customCatFields) {
                    if (product[field]) {
                        console.log(`📂 Product ${product.id} - Found custom category field '${field}':`, product[field]);
                        break;
                    }
                }
                
                return {
                    ...product,
                    _debug_categories: extractedCategories // Keep for debugging
                };
            });
            
            allProducts.push(...enhancedProducts);
            console.log(`✅ Page ${page}: Loaded ${products.length} products (total: ${allProducts.length})`);
            
            // Progress reporting
            if (onProgress) {
                onProgress(Math.min(page / 100, 0.6)); // Products = 60% of total progress
            }
            
            // Stop if we got fewer products than requested (last page)
            if (products.length < 100) break;
            page++;
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));
            
        } catch (error) {
            console.error(`❌ Failed to fetch products page ${page}:`, error.message);
            
            // Try alternative endpoint if main fails
            if (page === 1) {
                console.log('🔄 Trying alternative products endpoint...');
                try {
                    const altProducts = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products', auth, {
                        page: 1,
                        per_page: 10,
                        status: 'publish' // Try just published products
                    });
                    
                    if (altProducts && altProducts.length > 0) {
                        console.log('🔍 Alternative endpoint product structure:', JSON.stringify(altProducts[0], null, 2));
                    }
                } catch (altError) {
                    console.error('❌ Alternative endpoint also failed:', altError.message);
                }
            }
            
            break;
        }
    }
    
    console.log(`🎉 Total products fetched: ${allProducts.length}`);
    
    // Final category analysis
    const productsWithCategories = allProducts.filter(p => 
        (p.categories && p.categories.length > 0) || 
        (p._debug_categories && p._debug_categories.length > 0)
    );
    
    console.log(`📊 Products with categories: ${productsWithCategories.length}/${allProducts.length}`);
    
    if (productsWithCategories.length === 0) {
        console.warn('⚠️ NO PRODUCTS HAVE CATEGORIES - This suggests:');
        console.warn('   1. WooCommerce API permissions issue');
        console.warn('   2. Products genuinely have no categories assigned');
        console.warn('   3. Categories stored in non-standard field');
        console.warn('   4. Plugin/theme modifying API response');
    }
    
    return allProducts;
}

// Fetch all variations for variable products
async function fetchAllVariations(baseUrl, auth, variableProducts, onProgress = null) {
    console.log(`🔄 Fetching variations for ${variableProducts.length} variable products...`);
    const allVariations = [];
    
    for (let i = 0; i < variableProducts.length; i++) {
        const product = variableProducts[i];
        
        try {
            console.log(`📄 Fetching variations for product ${product.id} (${i + 1}/${variableProducts.length})...`);
            
            const variations = await makeWordPressRequest(
                baseUrl, 
                `/wp-json/wc/v3/products/${product.id}/variations`, 
                auth, 
                { per_page: 100 }
            );
            
            if (variations && variations.length > 0) {
                const enhancedVariations = variations.map(variation => ({
                    ...variation,
                    parent_id: product.id,
                    type: 'variation'
                }));
                
                allVariations.push(...enhancedVariations);
                console.log(`✅ Loaded ${variations.length} variations for product ${product.id}`);
            }
            
            // Report progress if callback provided
            if (onProgress) {
                onProgress(0.6 + (i / variableProducts.length) * 0.2); // Variations = 20% of total progress
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));
            
        } catch (error) {
            console.error(`⚠️ Failed to fetch variations for product ${product.id}:`, error.message);
        }
    }
    
    console.log(`🎉 Total variations fetched: ${allVariations.length}`);
    return allVariations;
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
        console.log(`✅ Comprehensive data extraction completed in ${totalTime}s`);
        
        return {
            products: products || [],
            variations: variations || [],
            categories: categories || [],
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
        
        // Pricing
        regular_price: product.regular_price || '',
        sale_price: product.sale_price || '',
        date_on_sale_from: product.date_on_sale_from || '',
        date_on_sale_to: product.date_on_sale_to || '',
        
        // Content
        description: product.description || '',
        short_description: product.short_description || '',
        purchase_note: product.purchase_note || '',
        
        // Taxonomy (as IDs for relationships)
        category_ids: categoryIds,
        tag_ids: tagIds,
        shipping_class_id: shippingClassId,
        tax_class_id: taxClassId,
        
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
                    sync_status: {
                        last_sync: timestamp,
                        sync_version: '2.0',
                        status: 'completed'
                    },
                    architecture_version: '2.0'
                }
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

// Background sync processor (handles async invocation)
async function processBackgroundSync(event) {
    const { userId, syncId, credentials } = event;
    const { url, username, appPassword } = credentials;
    
    console.log(`🚀 Starting background sync for user: ${userId}, syncId: ${syncId}`);
    console.log(`📍 Store URL: ${url}`);
    
    try {
        // Perform comprehensive sync
        const rawData = await extractWooCommerceData(url, username, appPassword, userId, syncId);
        
        await updateSyncStatus(userId, syncId, {
            status: 'processing',
            progress: 85,
            message: 'Normalizing data structure...'
        });
        
        const normalizedData = normalizeWooCommerceData(rawData);
        
        const storeResult = await storeInS3(userId, normalizedData, syncId);
        
        // Store credentials
        const credentialsData = { url, username, appPassword };
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/credentials.json.gz`,
            Body: zlib.gzipSync(JSON.stringify(credentialsData)),
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));
        
        // Update final status
        await updateSyncStatus(userId, syncId, {
            status: 'completed',
            progress: 100,
            message: 'Sync completed successfully',
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
        
        console.log('🎉 Background sync completed successfully');
        
    } catch (error) {
        console.error('❌ Background sync failed:', error);
        
        await updateSyncStatus(userId, syncId, {
            status: 'failed',
            progress: 0,
            message: `Sync failed: ${error.message}`,
            failedAt: new Date().toISOString(),
            error: error.message
        });
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