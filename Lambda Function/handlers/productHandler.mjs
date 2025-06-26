import https from 'https';
import zlib from 'zlib';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'ap-southeast-2' });
const BUCKET_NAME = 'karoosync';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

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
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (body && (method === 'POST' || method === 'PUT')) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
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

async function updateProductInS3Categories(userId, productId, updatedProduct) {
    try {
        const numericProductId = parseInt(productId);
        
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: `users/${userId}/categories/`
        }));
        
        if (!listResponse.Contents) return;
        
        for (const object of listResponse.Contents) {
            if (!object.Key.endsWith('.json.gz')) continue;
            
            try {
                const response = await s3Client.send(new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: object.Key
                }));
                
                const compressedData = await response.Body.transformToByteArray();
                const decompressedData = zlib.gunzipSync(compressedData);
                const categoryData = JSON.parse(decompressedData.toString());
                
                const productIndex = categoryData.products.findIndex(p => 
                    p.id === numericProductId || parseInt(p.id) === numericProductId
                );
                
                if (productIndex !== -1) {
                    categoryData.products[productIndex] = updatedProduct;
                    categoryData.lastUpdated = new Date().toISOString();
                    
                    const updatedJson = JSON.stringify(categoryData);
                    const compressedUpdated = zlib.gzipSync(updatedJson);
                    
                    await s3Client.send(new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: object.Key,
                        Body: compressedUpdated,
                        ContentType: 'application/json',
                        ContentEncoding: 'gzip'
                    }));
                }
            } catch (categoryError) {
                console.error(`Error updating ${object.Key}:`, categoryError);
            }
        }
    } catch (error) {
        console.error('S3 category update failed:', error);
    }
}

async function updateRegularProduct(userId, productId, productData) {
    try {
        const credentials = await getUserCredentials(userId);
        if (!credentials) {
            return {
                success: false,
                error: 'User credentials not found. Please reconnect your store.'
            };
        }

        const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
        const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
        
        const processedData = {
            ...productData,
            regular_price: productData.regular_price ? String(productData.regular_price) : undefined,
            sale_price: productData.sale_price ? String(productData.sale_price) : '',
            stock_quantity: productData.stock_quantity ? parseInt(productData.stock_quantity) : null
        };
        
        if (processedData.images) {
            processedData.images = processedData.images
                .filter(image => !image.src?.startsWith('data:image/'))
                .map((image, index) => ({
                    src: image.src,
                    name: image.name || `image-${index + 1}`,
                    alt: image.alt || processedData.name || 'Product image'
                }));
        }
        
        Object.keys(processedData).forEach(key => {
            if (processedData[key] === undefined) {
                delete processedData[key];
            }
            if (processedData[key] === '' && !['sale_price', 'regular_price'].includes(key)) {
                delete processedData[key];
            }
        });
        
        const updatedProduct = await makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/${productId}`, auth, {}, 'PUT', processedData);
        await updateProductInS3Categories(userId, productId, updatedProduct);
        
        return {
            success: true,
            data: updatedProduct
        };
    } catch (error) {
        console.error('Regular product update error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function updateVariableProduct(userId, productId, productData) {
    console.log(`Updating variable product: ${productId}`);
    
    try {
        const credentials = await getUserCredentials(userId);
        if (!credentials) {
            return {
                success: false,
                error: 'User credentials not found. Please reconnect your store.'
            };
        }

        const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
        const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');

        // 1. Update parent product (excluding variations)
        const parentData = { ...productData };
        delete parentData.variations;

        // Process parent data same as regular product
        if (parentData.images) {
            parentData.images = parentData.images
                .filter(image => !image.src?.startsWith('data:image/'))
                .map((image, index) => ({
                    src: image.src,
                    name: image.name || `image-${index + 1}`,
                    alt: image.alt || parentData.name || 'Product image'
                }));
        }

        Object.keys(parentData).forEach(key => {
            if (parentData[key] === undefined) {
                delete parentData[key];
            }
            if (parentData[key] === '' && !['sale_price', 'regular_price'].includes(key)) {
                delete parentData[key];
            }
        });

        const updatedParent = await makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/${productId}`, auth, {}, 'PUT', parentData);
        console.log(`✅ Updated parent product: ${productId}`);

        // 2. Update each variation
        const variationResults = [];
        if (productData.variations && productData.variations.length > 0) {
            for (const variation of productData.variations) {
                try {
                    const variationUpdateData = {
                        regular_price: variation.regular_price || '',
                        sale_price: variation.sale_price || '',
                        sku: variation.sku || '',
                        manage_stock: variation.manage_stock || false,
                        stock_status: variation.stock_status || 'instock',
                        weight: variation.weight || '',
                        dimensions: variation.dimensions || { length: '', width: '', height: '' },
                        image: variation.image || null
                    };

                    const updatedVariation = await makeWordPressRequest(
                        baseUrl, 
                        `/wp-json/wc/v3/products/${productId}/variations/${variation.id}`, 
                        auth, 
                        {}, 
                        'PUT', 
                        variationUpdateData
                    );

                    variationResults.push({ id: variation.id, success: true, data: updatedVariation });
                    console.log(`✅ Updated variation: ${variation.id}`);
                } catch (variationError) {
                    console.error(`Variation ${variation.id} update error:`, variationError);
                    variationResults.push({ id: variation.id, success: false, error: variationError.message });
                }
            }
        }

        // 3. Update S3 cache
        await updateProductInS3Categories(userId, productId, updatedParent);

        console.log(`🔄 Variable product update complete. Parent: ✅, Variations: ${variationResults.filter(r => r.success).length}/${variationResults.length}`);

        return {
            success: true,
            data: updatedParent,
            variationResults: variationResults,
            message: `Updated parent product and ${variationResults.filter(r => r.success).length} variations`
        };

    } catch (error) {
        console.error('Variable product update error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function createCategoryInWooCommerce(url, username, appPassword, categoryData) {
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    return makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/categories', auth, {}, 'POST', categoryData);
}

async function deleteCategoryInWooCommerce(url, username, appPassword, categoryId) {
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    return makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/categories/${categoryId}`, auth, { force: true }, 'DELETE');
}

async function duplicateProductInWooCommerce(url, username, appPassword, productId) {
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    // First get the original product
    const originalProduct = await makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/${productId}`, auth);
    
    // Create duplicate with modified name
    const duplicateData = {
        ...originalProduct,
        name: `${originalProduct.name} - Copy`,
        slug: '',  // Let WooCommerce generate new slug
        sku: originalProduct.sku ? `${originalProduct.sku}-copy` : '',
        status: 'draft'  // Start as draft
    };
    
    // Remove fields that shouldn't be duplicated
    delete duplicateData.id;
    delete duplicateData.permalink;
    delete duplicateData.date_created;
    delete duplicateData.date_modified;
    
    return makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products', auth, {}, 'POST', duplicateData);
}

async function deleteProductInWooCommerce(url, username, appPassword, productId) {
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    return makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/${productId}`, auth, { force: true }, 'DELETE');
}

async function updateMetadataAfterCategoryChange(userId) {
    try {
        const credentials = await getUserCredentials(userId);
        
        const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
        const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
        
        const categories = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/categories', auth, { per_page: 100 });
        
        const metadataResponse = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/metadata.json.gz`
        }));
        
        const compressedMetadata = await metadataResponse.Body.transformToByteArray();
        const metadata = JSON.parse(zlib.gunzipSync(compressedMetadata).toString());
        
        metadata.categories = categories || [];
        metadata.lastUpdated = new Date().toISOString();
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/metadata.json.gz`,
            Body: zlib.gzipSync(JSON.stringify(metadata)),
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));
        
        return { success: true, categories };
    } catch (error) {
        console.error('Failed to update metadata after category change:', error);
        throw error;
    }
}

export async function handleProduct(event, userId) {
    if (event.httpMethod === 'POST' && event.queryStringParameters?.action === 'create-category') {
        console.log('📝 Create category request received');
        
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
        
        const { name, description, parent } = requestData;
        
        if (!name || !name.trim()) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Category name required' })
            };
        }

        try {
            const credentials = await getUserCredentials(userId);
            const categoryData = { name, description: description || '', parent: parent || 0 };
            
            const newCategory = await createCategoryInWooCommerce(
                credentials.url,
                credentials.username,
                credentials.appPassword,
                categoryData
            );
            
            await updateMetadataAfterCategoryChange(userId);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    category: newCategory
                })
            };
            
        } catch (error) {
            console.error('Category creation error:', error);
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: error.message
                })
            };
        }
    }

    if (event.httpMethod === 'POST' && event.queryStringParameters?.action === 'duplicate-product') {
        console.log('📋 Duplicate product request received');
        
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
        
        const { productId } = requestData;
        
        if (!productId) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Product ID required' })
            };
        }

        try {
            const credentials = await getUserCredentials(userId);
            
            const duplicatedProduct = await duplicateProductInWooCommerce(
                credentials.url,
                credentials.username,
                credentials.appPassword,
                productId
            );
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    product: duplicatedProduct
                })
            };
            
        } catch (error) {
            console.error('Product duplication error:', error);
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: error.message
                })
            };
        }
    }

    if (event.httpMethod === 'DELETE' && event.queryStringParameters?.action === 'delete-product') {
        console.log('🗑️ Delete product request received');
        
        const productId = event.queryStringParameters?.productId;
        
        if (!productId) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Product ID required' })
            };
        }

        try {
            const credentials = await getUserCredentials(userId);
            
            await deleteProductInWooCommerce(
                credentials.url,
                credentials.username,
                credentials.appPassword,
                productId
            );
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true })
            };
            
        } catch (error) {
            console.error('Product deletion error:', error);
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: error.message
                })
            };
        }
    }

    if (event.httpMethod === 'DELETE' && event.queryStringParameters?.action === 'delete-category') {
        const categoryId = event.queryStringParameters?.categoryId;
        
        if (!categoryId) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Category ID required' })
            };
        }

        try {
            const credentials = await getUserCredentials(userId);
            
            await deleteCategoryInWooCommerce(
                credentials.url,
                credentials.username,
                credentials.appPassword,
                categoryId
            );
            
            try {
                const categoryKey = `category-${categoryId}`;
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: `users/${userId}/categories/${categoryKey}/products.json.gz`
                }));
            } catch (s3Error) {
                console.log('S3 category file not found, skipping deletion');
            }
            
            await updateMetadataAfterCategoryChange(userId);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true })
            };
            
        } catch (error) {
            console.error('Category deletion error:', error);
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: error.message
                })
            };
        }
    }

    if (event.httpMethod === 'PUT') {
        const { productId, productData } = JSON.parse(event.body || '{}');
        
        if (!productId || !productData) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Product ID and data required' })
            };
        }

        try {
            let result;
            
            // Check if this is a variable product
            if (productData.type === 'variable' && productData.variations) {
                console.log(`🔧 Updating variable product: ${productId}`);
                result = await updateVariableProduct(userId, productId, productData);
            } else {
                console.log(`🔧 Updating regular product: ${productId}`);
                result = await updateRegularProduct(userId, productId, productData);
            }
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            };
            
        } catch (updateError) {
            console.error('Product update error:', updateError);
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: updateError.message
                })
            };
        }
    }
    
    return {
        statusCode: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
}