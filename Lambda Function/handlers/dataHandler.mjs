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
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/metadata.json.gz`
        }));
        
        const compressed = await response.Body.transformToByteArray();
        const metadata = JSON.parse(zlib.gunzipSync(compressed).toString());
        
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: `users/${userId}/categories/`
        }));
        
        const actualCategories = (listResponse.Contents || [])
            .filter(obj => obj.Key.endsWith('.json.gz'))
            .map(obj => obj.Key.split('/').slice(-2, -1)[0]);
        
        const metadataCategories = metadata.categories?.map(cat => `category-${cat.id}`) || [];
        const missing = metadataCategories.filter(cat => !actualCategories.includes(cat));
        if (missing.length > 0) {
            console.log(`⚠️  Metadata has categories not in S3: ${missing.join(', ')}`);
        }
        
        return {
            success: true,
            hasData: true,
            structure: 'categorized',
            metadata,
            availableCategories: actualCategories
        };
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return { success: true, hasData: false };
        }
        throw error;
    }
}

async function loadCategory(userId, categoryKey) {
    console.log(`Loading category: ${categoryKey} for user: ${userId}`);
    
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/categories/${categoryKey}/products.json.gz`
        }));
        
        const compressed = await response.Body.transformToByteArray();
        const data = JSON.parse(zlib.gunzipSync(compressed).toString());
        
        const expectedCategoryId = parseInt(categoryKey.replace('category-', ''));
        
        const primaryCategoryProducts = data.products.filter(product => {
            const productCategories = product.categories || [];
            const primaryCategoryId = productCategories.length > 0 ? productCategories[0].id : null;
            return primaryCategoryId === expectedCategoryId;
        });

        const metadataResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/metadata.json.gz`
        }));
        
        const compressedMetadata = await metadataResponse.Body.transformToByteArray();
        const metadata = JSON.parse(zlib.gunzipSync(compressedMetadata).toString());
        
        const childCategories = metadata.categories.filter(cat => 
            cat.parent === expectedCategoryId
        );
        
        console.log(`📊 Category ${categoryKey}: ${data.products.length} total → ${primaryCategoryProducts.length} primary, ${childCategories.length} children`);
        
        return {
            success: true,
            products: primaryCategoryProducts,
            childCategories: childCategories
        };
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log(`Category ${categoryKey} not found - checking for child categories only`);
            
            try {
                const metadataResponse = await s3Client.send(new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: `users/${userId}/metadata.json.gz`
                }));
                
                const compressedMetadata = await metadataResponse.Body.transformToByteArray();
                const metadata = JSON.parse(zlib.gunzipSync(compressedMetadata).toString());
                
                const expectedCategoryId = parseInt(categoryKey.replace('category-', ''));
                const childCategories = metadata.categories.filter(cat => 
                    cat.parent === expectedCategoryId
                );
                
                return {
                    success: true,
                    products: [],
                    childCategories: childCategories,
                    warning: 'Category file not found'
                };
            } catch (metadataError) {
                return {
                    success: true,
                    products: [],
                    childCategories: [],
                    warning: 'Category file not found'
                };
            }
        }
        console.error('Category load error:', error);
        throw error;
    }
}

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

async function loadProductVariations(userId, productId) {
    console.log(`Loading variations for product ${productId}, user: ${userId}`);
    
    try {
        const credentials = await getUserCredentials(userId);
        if (!credentials) {
            return {
                success: false,
                error: 'User credentials not found. Please reconnect your store.'
            };
        }

        const wooCommerceUrl = `${credentials.url}/wp-json/wc/v3/products/${productId}/variations`;
        
        const response = await fetch(wooCommerceUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WooCommerce API error: ${response.status} - ${errorText}`);
        }

        const variations = await response.json();
        
        console.log(`✅ Loaded ${variations.length} variations for product ${productId}`);
        
        return {
            success: true,
            variations: variations
        };
        
    } catch (error) {
        console.error('Variation load error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function handleData(event, userId) {
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
    }
    
    return {
        statusCode: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
}