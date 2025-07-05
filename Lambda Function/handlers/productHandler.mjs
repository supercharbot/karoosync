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

// NEW: Upload base64 image to WooCommerce media library
async function uploadImageToWooCommerceMedia(baseUrl, auth, base64Data, fileName, altText) {
    return new Promise((resolve, reject) => {
        try {
            // Extract image data from base64
            const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new Error('Invalid base64 image format');
            }
            
            const imageType = matches[1];
            const imageBuffer = Buffer.from(matches[2], 'base64');
            
            // Generate filename with proper extension
            const fileExtension = imageType === 'jpeg' ? 'jpg' : imageType;
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            const finalFileName = `${sanitizedFileName}.${fileExtension}`;
            
            const url = new URL(`${baseUrl}/wp-json/wp/v2/media`);
            
            // Create proper multipart form data
            const boundary = `----formdata-karoosync-${Date.now()}`;
            const CRLF = '\r\n';
            
            const formDataParts = [
                `--${boundary}${CRLF}`,
                `Content-Disposition: form-data; name="file"; filename="${finalFileName}"${CRLF}`,
                `Content-Type: image/${imageType}${CRLF}${CRLF}`
            ];
            
            const formDataEnd = [
                `${CRLF}--${boundary}${CRLF}`,
                `Content-Disposition: form-data; name="alt_text"${CRLF}${CRLF}`,
                altText || 'Product image',
                `${CRLF}--${boundary}--${CRLF}`
            ];
            
            // Calculate content length
            const formDataStart = Buffer.from(formDataParts.join(''));
            const formDataEndBuffer = Buffer.from(formDataEnd.join(''));
            const contentLength = formDataStart.length + imageBuffer.length + formDataEndBuffer.length;
            
            const options = {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'User-Agent': 'Karoosync/2.0',
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': contentLength
                },
                timeout: 60000
            };
            
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const mediaResponse = JSON.parse(data);
                            console.log(`✅ Uploaded image to media library: ${mediaResponse.source_url}`);
                            resolve({
                                id: mediaResponse.id,
                                url: mediaResponse.source_url,
                                alt: mediaResponse.alt_text || altText
                            });
                        } catch (e) {
                            reject(new Error('Invalid JSON response from media upload'));
                        }
                    } else {
                        console.error(`Media upload failed: ${res.statusCode} - ${data}`);
                        reject(new Error(`Media upload failed: HTTP ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error('Media upload request error:', error);
                reject(error);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Media upload timeout'));
            });
            
            // Write the multipart form data properly
            req.write(formDataStart);
            req.write(imageBuffer);
            req.write(formDataEndBuffer);
            req.end();
            
        } catch (error) {
            reject(error);
        }
    });
}

// NEW: Process product images with WooCommerce media upload
async function processProductImages(images, baseUrl, auth, productName) {
    if (!images || !Array.isArray(images)) {
        return [];
    }
    
    const processedImages = [];
    
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        try {
            if (image.src?.startsWith('data:image/')) {
                // Upload base64 image to WooCommerce media library
                console.log(`📤 Uploading base64 image ${i + 1} to WooCommerce media library...`);
                
                const fileName = image.name || `${productName?.replace(/[^a-zA-Z0-9]/g, '-')}-${i + 1}` || `image-${i + 1}`;
                const altText = image.alt || productName || 'Product image';
                
                const uploadResult = await uploadImageToWooCommerceMedia(
                    baseUrl, 
                    auth, 
                    image.src, 
                    fileName, 
                    altText
                );
                
                processedImages.push({
                    src: uploadResult.url,
                    name: fileName,
                    alt: uploadResult.alt,
                    id: uploadResult.id
                });
                
                console.log(`✅ Successfully uploaded image to WooCommerce: ${uploadResult.url}`);
                
            } else if (image.src && typeof image.src === 'string') {
                // Handle URL image (pass through unchanged - don't upload)
                console.log(`📎 Using existing URL image: ${image.src}`);
                processedImages.push({
                    src: image.src,
                    name: image.name || `image-${i + 1}`,
                    alt: image.alt || productName || 'Product image',
                    id: image.id || 0
                });
            }
        } catch (error) {
            console.error(`❌ Failed to process image ${i + 1}:`, error);
            // Continue with other images even if one fails
            // You could optionally add a fallback here or skip the image
        }
    }
    
    return processedImages;
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

async function updateProductInMainS3File(userId, productId, updatedProduct) {
    try {
        console.log(`🔄 Updating main products file for product: ${productId}`);
        
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`
        }));
        
        const compressedData = await response.Body.transformToByteArray();
        const productsData = JSON.parse(zlib.gunzipSync(compressedData).toString());
        
        const numericProductId = parseInt(productId);
        if (productsData.products && productsData.products[numericProductId]) {
            productsData.products[numericProductId] = updatedProduct;
            productsData.lastUpdated = new Date().toISOString();
            
            const updatedJson = JSON.stringify(productsData);
            const compressedUpdated = zlib.gzipSync(updatedJson);
            
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/products.json.gz`,
                Body: compressedUpdated,
                ContentType: 'application/json',
                ContentEncoding: 'gzip'
            }));
            
            console.log(`✅ Updated main products file for product: ${productId}`);
        } else {
            console.warn(`⚠️ Product ${productId} not found in main products file`);
        }
        
    } catch (error) {
        console.error(`❌ Failed to update main products file:`, error);
        throw error;
    }
}

async function updateProductInS3Categories(userId, productId, updatedProduct) {
    try {
        console.log(`🔄 Starting S3 updates for product: ${productId}`);
        
        // 1. Update the main products.json.gz file FIRST
        await updateProductInMainS3File(userId, productId, updatedProduct);
        
        // 2. Update category-specific files
        const numericProductId = parseInt(productId);
        
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: `users/${userId}/categories/`
        }));
        
        if (!listResponse.Contents) {
            console.log(`✅ S3 updates completed for product: ${productId} (main file only)`);
            return;
        }
        
        let categoryUpdates = 0;
        
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
                categoryUpdates++;
                }
            } catch (categoryError) {
                console.error(`Error updating ${object.Key}:`, categoryError);
            }
        }
        
        console.log(`✅ S3 updates completed for product: ${productId} (main file + ${categoryUpdates} categories)`);
        
    } catch (error) {
        console.error('❌ S3 product update failed:', error);
        throw error;
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
        
        // NEW: Process images with WooCommerce media upload support
        if (processedData.images) {
            console.log(`🖼️  Processing ${processedData.images.length} images...`);
            processedData.images = await processProductImages(
                processedData.images, 
                baseUrl, 
                auth, 
                processedData.name
            );
            console.log(`✅ Processed ${processedData.images.length} images for upload`);
        }

        // NEW: Process new tags and attributes
        if (processedData.tags) {
            console.log(`🏷️ Processing ${processedData.tags.length} tags...`);
            processedData.tags = await processNewTags(baseUrl, auth, processedData.tags);
        }
        
        if (processedData.attributes) {
            console.log(`🔧 Processing ${processedData.attributes.length} attributes...`);
            processedData.attributes = await processNewAttributes(baseUrl, auth, processedData.attributes);
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

        // NEW: Process parent product images with WooCommerce media upload
        if (parentData.images) {
            console.log(`🖼️  Processing parent product images...`);
            parentData.images = await processProductImages(
                parentData.images,
                baseUrl,
                auth,
                parentData.name
            );
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
                    // Process variation image if it's a file upload (base64)
                    if (variation.image && variation.image.src && variation.image.src.startsWith('data:')) {
                        console.log(`🖼️ Processing variation image for ${variation.id}...`);
                        const processedImages = await processProductImages([variation.image], baseUrl, auth, `Variation ${variation.id}`);
                        variation.image = processedImages[0];
                    }

                    const variationUpdateData = {
                    // Pricing
                    regular_price: variation.regular_price || '',
                    sale_price: variation.sale_price || '',
                    date_on_sale_from: variation.date_on_sale_from || '',
                    date_on_sale_to: variation.date_on_sale_to || '',
                    
                    // Basic info
                    sku: variation.sku || '',
                    description: variation.description || '',
                    status: variation.status || 'publish',
                    
                    // Product type toggles
                    downloadable: variation.downloadable || false,
                    virtual: variation.virtual || false,
                    
                    // Inventory
                    manage_stock: variation.manage_stock || false,
                    stock_status: variation.stock_status || 'instock',
                    stock_quantity: variation.stock_quantity || null,
                    backorders: variation.backorders || 'no',
                    low_stock_amount: variation.low_stock_amount || null,
                    
                    // Shipping (will be ignored if virtual=true)
                    weight: variation.weight || '',
                    dimensions: variation.dimensions || { length: '', width: '', height: '' },
                    shipping_class: variation.shipping_class || '',
                    
                    // Media
                    image: variation.image || null,
                    
                    // Downloads (for downloadable variations)
                    downloads: variation.downloads || []
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

// Add after your existing helper functions
async function createTagInWooCommerce(baseUrl, auth, tagData) {
    return makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/tags', auth, {}, 'POST', tagData);
}

async function createAttributeInWooCommerce(baseUrl, auth, attributeData) {
    return makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/attributes', auth, {}, 'POST', attributeData);
}

async function processNewTags(baseUrl, auth, tags) {
    const processedTags = [];
    
    for (const tag of tags) {
        if (tag.id < 0 || typeof tag.id === 'string') {
            // This is a new tag, create it in WooCommerce
            try {
                const newTag = await createTagInWooCommerce(baseUrl, auth, {
                    name: tag.name,
                    description: tag.description || ''
                });
                processedTags.push(newTag);
                console.log(`✅ Created new tag: ${newTag.name} (ID: ${newTag.id})`);
            } catch (error) {
                console.error(`❌ Failed to create tag ${tag.name}:`, error);
            }
        } else {
            // Existing tag
            processedTags.push(tag);
        }
    }
    
    return processedTags;
}

async function processNewAttributes(baseUrl, auth, attributes) {
    const processedAttributes = [];
    
    for (const attr of attributes) {
        if (!attr.id || attr.id === 0) {
            // This is a custom attribute (id: 0), format for WooCommerce
            processedAttributes.push({
                id: 0,
                name: attr.name,
                position: attr.position || 0,
                visible: attr.visible !== false,
                variation: attr.variation || false,
                options: attr.options || []
            });
            console.log(`✅ Formatted custom attribute: ${attr.name}`);
        } else if (attr.id < 0) {
            // This is a new global attribute, create it in WooCommerce
            try {
                const newAttribute = await createAttributeInWooCommerce(baseUrl, auth, {
                    name: attr.name,
                    slug: attr.name.toLowerCase().replace(/\s+/g, '-'),
                    type: 'select',
                    order_by: 'menu_order',
                    has_archives: false
                });
                
                // Add terms/options to the attribute
                if (attr.options && attr.options.length > 0) {
                    for (const option of attr.options) {
                        await makeWordPressRequest(
                            baseUrl, 
                            `/wp-json/wc/v3/products/attributes/${newAttribute.id}/terms`, 
                            auth, 
                            {}, 
                            'POST', 
                            { name: option }
                        );
                    }
                }
                
                processedAttributes.push({
                    id: newAttribute.id,
                    name: newAttribute.name,
                    position: attr.position || 0,
                    visible: attr.visible !== false,
                    variation: attr.variation || false,
                    options: attr.options || []
                });
                console.log(`✅ Created new global attribute: ${newAttribute.name} (ID: ${newAttribute.id})`);
            } catch (error) {
                console.error(`❌ Failed to create attribute ${attr.name}:`, error);
                // Fallback to custom attribute
                processedAttributes.push({
                    id: 0,
                    name: attr.name,
                    position: attr.position || 0,
                    visible: attr.visible !== false,
                    variation: attr.variation || false,
                    options: attr.options || []
                });
            }
        } else {
            // Existing global attribute
            processedAttributes.push({
                id: attr.id,
                name: attr.name,
                position: attr.position || 0,
                visible: attr.visible !== false,
                variation: attr.variation || false,
                options: attr.options || []
            });
        }
    }
    
    return processedAttributes;
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
                body: JSON.stringify({ success: false, error: 'Category name is required' })
            };
        }
        
        try {
            const credentials = await getUserCredentials(userId);
            if (!credentials) {
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: 'User credentials not found' })
                };
            }
            
            const categoryData = {
                name: name.trim(),
                description: description || '',
                parent: parent || 0
            };
            
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

    if (event.httpMethod === 'DELETE' && event.queryStringParameters?.action === 'delete-category') {
        console.log('🗑️ Delete category request received');
        
        const categoryId = event.queryStringParameters?.categoryId;
        if (!categoryId) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Category ID is required' })
            };
        }
        
        try {
            const credentials = await getUserCredentials(userId);
            if (!credentials) {
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: 'User credentials not found' })
                };
            }
            
            await deleteCategoryInWooCommerce(
                credentials.url,
                credentials.username,
                credentials.appPassword,
                categoryId
            );
            
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

    if (event.httpMethod === 'POST' && event.queryStringParameters?.action === 'duplicate') {
        console.log('📋 Duplicate product request received');
        
        const productId = event.queryStringParameters?.productId;
        if (!productId) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Product ID is required' })
            };
        }
        
        try {
            const credentials = await getUserCredentials(userId);
            if (!credentials) {
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: 'User credentials not found' })
                };
            }
            
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

    if (event.httpMethod === 'DELETE' && event.queryStringParameters?.action === 'delete') {
        console.log('🗑️ Delete product request received');
        
        const productId = event.queryStringParameters?.productId;
        if (!productId) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Product ID is required' })
            };
        }
        
        try {
            const credentials = await getUserCredentials(userId);
            if (!credentials) {
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: 'User credentials not found' })
                };
            }
            
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