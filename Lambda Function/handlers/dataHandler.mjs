import zlib from 'zlib';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'ap-southeast-2' });
const BUCKET_NAME = 'karoosync';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

export async function handleData(event, userId) {
    console.log('📊 Data handler started');
    console.log('📊 Action:', event.queryStringParameters?.action);
    console.log('📊 Method:', event.httpMethod);
    
    try {
        if (event.httpMethod === 'GET') {
            const action = event.queryStringParameters?.action;
            
            if (action === 'check-data') {
                const result = await checkUserData(userId);
                
                if (event.queryStringParameters?.include_credentials === 'true') {
                    const credentials = await getUserCredentials(userId);
                    result.credentials = credentials;
                }
                
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }
            
            if (action === 'load-categories') {
                const result = await loadCategories(userId);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }
            
            if (action === 'load-category') {
                const categoryKey = event.queryStringParameters?.category;
                if (!categoryKey) {
                    return {
                        statusCode: 400,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ success: false, error: 'Category required' })
                    };
                }
                
                const result = await loadCategoryProducts(userId, categoryKey);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }
            
            if (action === 'load-product') {
                const productId = event.queryStringParameters?.productId;
                if (!productId) {
                    return {
                        statusCode: 400,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ success: false, error: 'Product ID required' })
                    };
                }
                
                const result = await loadProduct(userId, productId);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }

            if (action === 'load-variations') {
                const productId = event.queryStringParameters?.productId;
                if (!productId) {
                    return {
                        statusCode: 400,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ success: false, error: 'Product ID required' })
                    };
                }
                
                const result = await loadProductVariations(userId, productId);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }
            
            if (action === 'load-woo-categories') {
                console.log('📂 Loading WooCommerce categories');
                const result = await loadWooCommerceCategories(userId);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }

            if (action === 'load-woo-tags') {
                console.log('🏷️ Loading WooCommerce tags');
                const result = await loadWooCommerceTags(userId);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }
            
            if (action === 'search') {
                const searchTerm = event.queryStringParameters?.q;
                if (!searchTerm) {
                    return {
                        statusCode: 400,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ success: false, error: 'Search term required' })
                    };
                }
                
                const options = {
                    limit: parseInt(event.queryStringParameters?.limit) || 50,
                    offset: parseInt(event.queryStringParameters?.offset) || 0,
                    category: event.queryStringParameters?.category,
                    status: event.queryStringParameters?.status,
                    type: event.queryStringParameters?.type
                };
                
                const result = await searchProducts(userId, searchTerm, options);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }
            
            if (action === 'load-woocommerce-tags') {
                const result = await loadWooCommerceTags(userId);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }

            if (action === 'load-woocommerce-attributes') {
                const result = await loadWooCommerceAttributes(userId);
                return {
                    statusCode: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            }
        }
        
        return {
            statusCode: 405,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
        
    } catch (error) {
        console.error('❌ Data handler error:', error);
        return {
            statusCode: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
}

// ===============================
// CORE DATA FUNCTIONS
// ===============================

async function checkUserData(userId) {
    try {
        console.log(`🔍 Checking user data for: ${userId}`);
        
        // Check for the main store metadata file
        const metadataResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/store-metadata.json.gz`
        }));
        
        const metadataCompressed = await metadataResponse.Body.transformToByteArray();
        const storeMetadata = JSON.parse(zlib.gunzipSync(metadataCompressed).toString());
        
        // Check for other essential files to verify complete sync
        const essentialFiles = [
            'products.json.gz',
            'categories.json.gz',
            'indexes/by-category.json.gz'
        ];
        
        const fileChecks = await Promise.allSettled(
            essentialFiles.map(async (filename) => {
                await s3Client.send(new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: `users/${userId}/${filename}`
                }));
                return filename;
            })
        );
        
        const missingFiles = fileChecks
            .filter(result => result.status === 'rejected')
            .map((_, index) => essentialFiles[index]);
        
        if (missingFiles.length > 0) {
            console.log(`⚠️  Missing essential files: ${missingFiles.join(', ')}`);
            return { 
                success: true, 
                hasData: false, 
                missingFiles,
                error: 'Incomplete sync data - missing essential files'
            };
        }
        
        // Build availableCategories array from category index
        const categoryIndex = await loadCategoryIndex(userId);
        const availableCategories = [];

        // Add category keys for each category that has products
        Object.keys(categoryIndex.category_products || {}).forEach(categoryId => {
            if (categoryId === 'uncategorized') {
                availableCategories.push('uncategorized');
            } else {
                availableCategories.push(`category-${categoryId}`);
            }
        });

        console.log(`✅ Available categories: ${availableCategories.join(', ')}`);

        console.log(`✅ User data found - ${storeMetadata.store_info?.total_products || 0} products across ${availableCategories.length} categories`);

        // Load categories using the corrected loadCategories function
        const categoriesResult = await loadCategories(userId);
        const categories = categoriesResult.success ? categoriesResult.categories : [];

        return {
            success: true,
            hasData: true,
            structure: 'unified',
            availableCategories: availableCategories,
            metadata: {
                ...storeMetadata,
                categories: categories,
                totalProducts: storeMetadata.store_info?.total_products || 0,
                totalCategories: categories.length, // Use actual loaded categories count
                lastSync: storeMetadata.sync_status?.last_sync,
                architectureVersion: storeMetadata.architecture_version || '2.0'
            }
        };
        
        console.log(`✅ User data found - ${storeMetadata.store_info?.total_products || 0} products across ${Object.keys(categoriesData.categories || {}).length} categories`);
        
        return {
            success: true,
            hasData: true,
            structure: 'unified',
            availableCategories: availableCategories,  // ADD THIS LINE
            metadata: {
                ...storeMetadata,
                categories: Object.values(categoriesData.categories || {}),
                totalProducts: storeMetadata.store_info?.total_products || 0,
                totalCategories: storeMetadata.store_info?.total_categories || 0,
                lastSync: storeMetadata.sync_status?.last_sync,
                architectureVersion: storeMetadata.architecture_version || '2.0'
            }
        };
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log('📭 No user data found');
            return { success: true, hasData: false };
        }
        console.error('❌ Error checking user data:', error);
        throw error;
    }
}

async function loadCategories(userId) {
    try {
        console.log(`📂 Loading categories for user: ${userId}`);
        
        // Load categories data and category index
        const categoriesData = await loadCategoriesData(userId);
        const categoryIndex = await loadCategoryIndex(userId);
        
        const allCategories = Object.values(categoriesData.categories || {});
        console.log(`📊 Found ${allCategories.length} categories in categories.json.gz`);
        
        // Add product counts from category index and filter categories that have products
        const categoriesWithCounts = allCategories
            .map(category => ({
                ...category,
                productCount: categoryIndex.category_products?.[category.id]?.length || 0
            }))
            .filter(category => category.productCount > 0); // Only include categories with products
        
        // Add uncategorized if it has products
        const uncategorizedCount = categoryIndex.category_products?.['uncategorized']?.length || 0;
        if (uncategorizedCount > 0) {
            categoriesWithCounts.push({
                id: 'uncategorized',
                name: 'Uncategorized',
                slug: 'uncategorized',
                parent_id: 0,
                productCount: uncategorizedCount
            });
        }
        
        // Sort categories by name
        categoriesWithCounts.sort((a, b) => {
            if (a.id === 'uncategorized') return 1;
            if (b.id === 'uncategorized') return -1;
            return a.name.localeCompare(b.name);
        });
        
        console.log(`✅ Loaded ${categoriesWithCounts.length} categories with products:`, 
            categoriesWithCounts.map(c => `${c.name} (${c.productCount})`));
        
        return {
            success: true,
            categories: categoriesWithCounts,
            hasUncategorized: uncategorizedCount > 0,
            total: categoriesWithCounts.length
        };
        
    } catch (error) {
        console.error('❌ Error loading categories:', error);
        if (error.name === 'NoSuchKey') {
            return {
                success: false,
                error: 'Categories data not found - may need to resync'
            };
        }
        throw error;
    }
}

async function loadCategoryProducts(userId, categoryKey) {
    try {
        console.log(`📂 Loading products for category: ${categoryKey} for user: ${userId}`);
        
        // Parse category ID from categoryKey (format: "category-123", "123", or "uncategorized")
        const categoryId = categoryKey === 'uncategorized' ? 'uncategorized' : categoryKey.toString().replace('category-', '');
        
        // Load the category index to get product IDs for this category
        const categoryIndex = await loadCategoryIndex(userId);
        const productIds = categoryIndex.category_products?.[categoryId] || [];
        
        // Load all products
        const productsData = await loadProductsData(userId);
        
        // Filter products for this category
        const categoryProducts = productIds
            .map(productId => productsData.products[productId])
            .filter(product => product) // Remove any undefined products
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        
        // Get child categories (NEW ADDITION)
        let childCategories = [];
        if (categoryId !== 'uncategorized') {
            const categoriesData = await loadCategoriesData(userId);
            const allCategories = Object.values(categoriesData.categories || {});
            
            childCategories = allCategories
                .filter(cat => cat.parent_id.toString() === categoryId)
                .map(child => ({
                    ...child,
                    productCount: categoryIndex.category_products?.[child.id]?.length || 0
                }));
        }
        
        // Get category info
        const categoryInfo = await getCategoryInfo(userId, categoryId);
        
        console.log(`✅ Loaded ${categoryProducts.length} products and ${childCategories.length} child categories for category: ${categoryInfo.name}`);
        
        return {
            success: true,
            products: categoryProducts,
            childCategories: childCategories,  // ADD THIS LINE
            category: categoryInfo,
            total: categoryProducts.length,
            structure: 'unified'
        };
        
    } catch (error) {
        console.error(`❌ Error loading category ${categoryKey}:`, error);
        if (error.name === 'NoSuchKey') {
            return {
                success: false,
                error: 'Category data not found - may need to resync'
            };
        }
        throw error;
    }
}

async function loadProduct(userId, productId) {
    try {
        console.log(`📦 Loading product: ${productId} for user: ${userId}`);
        
        // Load all products
        const productsData = await loadProductsData(userId);
        const product = productsData.products[productId];
        
        if (!product) {
            return {
                success: false,
                error: 'Product not found'
            };
        }
        
        console.log(`✅ Loaded product: ${product.name}`);
        
        return {
            success: true,
            product: product
        };
        
    } catch (error) {
        console.error(`❌ Error loading product ${productId}:`, error);
        if (error.name === 'NoSuchKey') {
            return {
                success: false,
                error: 'Product data not found - may need to resync'
            };
        }
        throw error;
    }
}

async function loadProductVariations(userId, productId) {
    try {
        console.log(`🔄 Loading variations for product: ${productId}`);
        
        // Load all products
        const productsData = await loadProductsData(userId);
        const parentProduct = productsData.products[productId];
        
        if (!parentProduct) {
            return {
                success: false,
                error: 'Product not found'
            };
        }
        
        if (parentProduct.type !== 'variable') {
            return {
                success: true,
                variations: [],
                parent: parentProduct,
                message: 'Product is not a variable product'
            };
        }
        
        // Get variations from the parent product (now stored as objects, not IDs)
        const variations = parentProduct.variations || [];
        
        console.log(`✅ Loaded ${variations.length} variations for product: ${parentProduct.name}`);
        
        return {
            success: true,
            variations: variations,
            parent: parentProduct,
            total: variations.length
        };
        
    } catch (error) {
        console.error(`❌ Error loading variations for product ${productId}:`, error);
        if (error.name === 'NoSuchKey') {
            return {
                success: false,
                error: 'Product data not found - may need to resync'
            };
        }
        throw error;
    }
}

async function searchProducts(userId, searchTerm, options = {}) {
    try {
        console.log(`🔍 Searching products for: "${searchTerm}" for user: ${userId}`);
        
        const { limit = 50, offset = 0, category, status, type } = options;
        
        // Load search index
        const searchIndex = await loadSearchIndex(userId);
        const searchTerms = searchTerm.toLowerCase().split(/\s+/);
        
        // Find product IDs that match search terms
        const matchingProductIds = new Set();
        
        searchTerms.forEach(term => {
            if (term.length > 2) {
                const productIds = searchIndex.search_terms?.[term] || [];
                productIds.forEach(id => matchingProductIds.add(id));
            }
        });
        
        if (matchingProductIds.size === 0) {
            return {
                success: true,
                products: [],
                total: 0,
                query: searchTerm,
                message: 'No products found matching search criteria'
            };
        }
        
        // Load products and filter
        const productsData = await loadProductsData(userId);
        let products = Array.from(matchingProductIds)
            .map(id => productsData.products[id])
            .filter(product => product);
        
        // Apply filters
        if (category) {
            products = products.filter(product => 
                product.categories?.some(cat => cat.id.toString() === category.toString())
            );
        }
        
        if (status) {
            products = products.filter(product => product.status === status);
        }
        
        if (type) {
            products = products.filter(product => product.type === type);
        }
        
        // Sort by relevance (simple name match score)
        products.sort((a, b) => {
            const aScore = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 2 : 1;
            const bScore = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 2 : 1;
            return bScore - aScore;
        });
        
        const total = products.length;
        const paginatedProducts = products.slice(offset, offset + limit);
        
        console.log(`✅ Found ${total} products matching "${searchTerm}"`);
        
        return {
            success: true,
            products: paginatedProducts,
            total: total,
            query: searchTerm,
            limit: limit,
            offset: offset
        };
        
    } catch (error) {
        console.error(`❌ Error searching products for "${searchTerm}":`, error);
        if (error.name === 'NoSuchKey') {
            return {
                success: false,
                error: 'Search index not found - may need to resync'
            };
        }
        throw error;
    }
}

// ===============================
// HELPER FUNCTIONS
// ===============================

async function loadCategoriesData(userId) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `users/${userId}/categories.json.gz`
    }));
    
    const compressed = await response.Body.transformToByteArray();
    return JSON.parse(zlib.gunzipSync(compressed).toString());
}

async function loadProductsData(userId) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `users/${userId}/products.json.gz`
    }));
    
    const compressed = await response.Body.transformToByteArray();
    return JSON.parse(zlib.gunzipSync(compressed).toString());
}

async function loadCategoryIndex(userId) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `users/${userId}/indexes/by-category.json.gz`
    }));
    
    const compressed = await response.Body.transformToByteArray();
    return JSON.parse(zlib.gunzipSync(compressed).toString());
}

async function loadSearchIndex(userId) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `users/${userId}/indexes/search-index.json.gz`
    }));
    
    const compressed = await response.Body.transformToByteArray();
    return JSON.parse(zlib.gunzipSync(compressed).toString());
}

async function getCategoryInfo(userId, categoryId) {
    if (categoryId === 'uncategorized') {
        return {
            id: 'uncategorized',
            name: 'Uncategorized',
            slug: 'uncategorized',
            parent: 0
        };
    }
    
    try {
        const categoriesData = await loadCategoriesData(userId);
        return categoriesData.categories?.[categoryId] || {
            id: categoryId,
            name: `Category ${categoryId}`,
            slug: `category-${categoryId}`,
            parent: 0
        };
    } catch (error) {
        return {
            id: categoryId,
            name: `Category ${categoryId}`,
            slug: `category-${categoryId}`,
            parent: 0
        };
    }
}

async function getUserCredentials(userId) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/credentials.json.gz`
        }));
        
        const compressed = await response.Body.transformToByteArray();
        return JSON.parse(zlib.gunzipSync(compressed).toString());
    } catch (error) {
        throw new Error(`Failed to get user credentials: ${error.message}`);
    }
}

// Fetch categories directly from WooCommerce
async function loadWooCommerceCategories(userId) {
    try {
        const credentials = await getUserCredentials(userId);
        if (!credentials) {
            return { success: false, error: 'User credentials not found' };
        }

        const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
        const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
        
        const categories = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/categories', auth, { 
            per_page: 100,
            orderby: 'name',
            order: 'asc'
        });
        
        return {
            success: true,
            categories: categories || []
        };
    } catch (error) {
        console.error('Failed to load WooCommerce categories:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function loadWooCommerceTags(userId) {
    try {
        console.log(`🏷️ Loading WooCommerce tags for user: ${userId}`);
        
        const credentials = await getUserCredentials(userId);
        if (!credentials) {
            return {
                success: false,
                error: 'User credentials not found. Please reconnect your store.'
            };
        }

        const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
        const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
        
        // Fetch all tags from WooCommerce
        const tags = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/tags', auth, { per_page: 100 });
        
        console.log(`✅ Loaded ${tags.length} tags from WooCommerce`);
        
        return {
            success: true,
            tags: tags
        };
        
    } catch (error) {
        console.error(`❌ Error loading WooCommerce tags:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function loadWooCommerceAttributes(userId) {
    try {
        console.log(`🔧 Loading WooCommerce attributes for user: ${userId}`);
        
        const credentials = await getUserCredentials(userId);
        if (!credentials) {
            return {
                success: false,
                error: 'User credentials not found. Please reconnect your store.'
            };
        }

        const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
        const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
        
        // Fetch all attributes from WooCommerce
        const attributes = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/attributes', auth, { per_page: 100 });
        
        console.log(`✅ Loaded ${attributes.length} attributes from WooCommerce`);
        
        return {
            success: true,
            attributes: attributes
        };
        
    } catch (error) {
        console.error(`❌ Error loading WooCommerce attributes:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}