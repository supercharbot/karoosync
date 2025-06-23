import zlib from 'zlib';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'ap-southeast-2' });
const BUCKET_NAME = 'karoosync';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

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
                const response = await s3Client.send(new GetObjectCommand({
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
        
        // Load categories for UI structure
        const categoriesResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/categories.json.gz`
        }));
        
        const categoriesCompressed = await categoriesResponse.Body.transformToByteArray();
        const categoriesData = JSON.parse(zlib.gunzipSync(categoriesCompressed).toString());
        
        console.log(`✅ User data found - ${storeMetadata.store_info?.total_products || 0} products across ${Object.keys(categoriesData.categories || {}).length} categories`);
        
        return {
            success: true,
            hasData: true,
            structure: 'unified', // New architecture identifier
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

async function loadCategory(userId, categoryKey) {
    console.log(`📂 Loading category: ${categoryKey} for user: ${userId}`);
    
    try {
        // Parse category ID from categoryKey (format: "category-123" or just "123")
        const categoryId = categoryKey.toString().replace('category-', '');
        
        // Load the category index to get product IDs for this category
        const categoryIndexResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/indexes/by-category.json.gz`
        }));
        
        const categoryIndexCompressed = await categoryIndexResponse.Body.transformToByteArray();
        const categoryIndex = JSON.parse(zlib.gunzipSync(categoryIndexCompressed).toString());
        
        // Get product IDs for this category
        const productIds = categoryIndex.category_products?.[categoryId] || [];
        
        if (productIds.length === 0) {
            console.log(`📭 No products found for category: ${categoryId}`);
            return {
                success: true,
                products: [],
                category: { id: categoryId, name: `Category ${categoryId}` },
                total: 0,
                message: 'No products in this category'
            };
        }
        
        // Load all products
        const productsResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`
        }));
        
        const productsCompressed = await productsResponse.Body.transformToByteArray();
        const productsData = JSON.parse(zlib.gunzipSync(productsCompressed).toString());
        
        // Filter products for this category
        const categoryProducts = productIds
            .map(productId => productsData.products[productId])
            .filter(product => product) // Remove any undefined products
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        
        // Load category details
        const categoriesResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/categories.json.gz`
        }));
        
        const categoriesCompressed = await categoriesResponse.Body.transformToByteArray();
        const categoriesData = JSON.parse(zlib.gunzipSync(categoriesCompressed).toString());
        
        const categoryInfo = categoriesData.categories?.[categoryId] || {
            id: categoryId,
            name: `Category ${categoryId}`,
            slug: `category-${categoryId}`
        };
        
        console.log(`✅ Loaded ${categoryProducts.length} products for category: ${categoryInfo.name}`);
        
        return {
            success: true,
            products: categoryProducts,
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

async function loadProductVariations(userId, productId) {
    console.log(`🔄 Loading variations for product: ${productId}`);
    
    try {
        // Load all products
        const productsResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`
        }));
        
        const productsCompressed = await productsResponse.Body.transformToByteArray();
        const productsData = JSON.parse(zlib.gunzipSync(productsCompressed).toString());
        
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
                message: 'Product is not a variable product'
            };
        }
        
        // Get variation IDs from the parent product
        const variationIds = parentProduct.variations || [];
        
        // Load variation products
        const variations = variationIds
            .map(variationId => productsData.products[variationId])
            .filter(variation => variation && variation.type === 'variation');
        
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

// Get user credentials from the new architecture
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

// Enhanced search function using the search index
async function searchProducts(userId, searchTerm, options = {}) {
    console.log(`🔍 Searching products for: "${searchTerm}"`);
    
    try {
        const { limit = 50, offset = 0, category = null, status = null, type = null } = options;
        
        // Load search index
        const searchIndexResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/indexes/search-index.json.gz`
        }));
        
        const searchIndexCompressed = await searchIndexResponse.Body.transformToByteArray();
        const searchIndex = JSON.parse(zlib.gunzipSync(searchIndexCompressed).toString());
        
        // Find matching product IDs
        const searchTerms = searchTerm.toLowerCase().split(/\s+/);
        const matchingProductIds = new Set();
        
        searchTerms.forEach(term => {
            const productIds = searchIndex.search_terms?.[term] || [];
            productIds.forEach(id => matchingProductIds.add(id));
        });
        
        if (matchingProductIds.size === 0) {
            return {
                success: true,
                products: [],
                total: 0,
                message: 'No products found matching search criteria'
            };
        }
        
        // Load products and filter
        const productsResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`
        }));
        
        const productsCompressed = await productsResponse.Body.transformToByteArray();
        const productsData = JSON.parse(zlib.gunzipSync(productsCompressed).toString());
        
        let filteredProducts = Array.from(matchingProductIds)
            .map(productId => productsData.products[productId])
            .filter(product => product);
        
        // Apply additional filters
        if (category) {
            filteredProducts = filteredProducts.filter(product => 
                product.category_ids?.includes(parseInt(category))
            );
        }
        
        if (status) {
            filteredProducts = filteredProducts.filter(product => 
                product.status === status
            );
        }
        
        if (type) {
            filteredProducts = filteredProducts.filter(product => 
                product.type === type
            );
        }
        
        // Sort by relevance (name matches first, then others)
        filteredProducts.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
            const bNameMatch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            
            return a.name.localeCompare(b.name);
        });
        
        // Apply pagination
        const total = filteredProducts.length;
        const paginatedProducts = filteredProducts.slice(offset, offset + limit);
        
        console.log(`✅ Found ${total} products matching "${searchTerm}"`);
        
        return {
            success: true,
            products: paginatedProducts,
            total: total,
            offset: offset,
            limit: limit,
            hasMore: offset + limit < total
        };
        
    } catch (error) {
        console.error(`❌ Error searching products:`, error);
        if (error.name === 'NoSuchKey') {
            return {
                success: false,
                error: 'Search index not found - may need to resync'
            };
        }
        throw error;
    }
}

export async function handleData(event, userId) {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: ''
        };
    }

    if (event.httpMethod === 'GET') {
        const action = event.queryStringParameters?.action;
        console.log(`📍 Processing GET action: ${action}`);
        
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
        
        if (action === 'load-category') {
            const categoryKey = event.queryStringParameters?.category;
            if (!categoryKey) {
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: 'Category required' })
                };
            }
            
            const result = await loadCategory(userId, categoryKey);
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
    }
    
    return {
        statusCode: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
}