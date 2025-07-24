import https from 'https';
import zlib from 'zlib';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

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
        if (method === 'GET' || method === 'DELETE') {
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

async function loadProductFromS3(userId, productId) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`
        }));
        
        const compressedData = await response.Body.transformToByteArray();
        const productsData = JSON.parse(zlib.gunzipSync(compressedData).toString());
        
        return productsData.products[parseInt(productId)] || {};
    } catch (error) {
        console.error('Failed to load product from S3:', error);
        return {};
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

        // Clean up undefined and empty values for parent
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
                        description: variation.description ? variation.description.replace(/<\/?p>/g, '') : '',
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

                    // CRITICAL FIX: Explicitly remove fields that shouldn't be on variations
                    delete variationUpdateData.type;
                    delete variationUpdateData.parent_id;
                    delete variationUpdateData.id;
                    delete variationUpdateData.permalink;
                    delete variationUpdateData.date_created;
                    delete variationUpdateData.date_modified;
                    delete variationUpdateData.categories;
                    delete variationUpdateData.tags;
                    delete variationUpdateData.default_attributes;
                    delete variationUpdateData.grouped_products;
                    delete variationUpdateData.upsell_ids;
                    delete variationUpdateData.cross_sell_ids;
                    delete variationUpdateData.variations;

                    // Clean up undefined and empty values for variation
                    Object.keys(variationUpdateData).forEach(key => {
                        if (variationUpdateData[key] === undefined) {
                            delete variationUpdateData[key];
                        }
                        if (variationUpdateData[key] === '' && !['sale_price', 'regular_price'].includes(key)) {
                            delete variationUpdateData[key];
                        }
                    });

                    console.log(`🔄 Updating variation ${variation.id} with data:`, JSON.stringify(variationUpdateData, null, 2));

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

        // 3. Get original product data from S3 to preserve all variations
        const originalProductData = await loadProductFromS3(userId, productId);
        const allVariations = originalProductData.variations || [];

        // Update only the changed variations
        variationResults.forEach(result => {
            if (result.success) {
                const index = allVariations.findIndex(v => v.id === result.id);
                if (index !== -1) {
                    allVariations[index] = result.data;
                }
            }
        });

        const completeProductData = {
            ...updatedParent,
            variations: allVariations
        };

        // Update S3 cache with complete data
        await updateProductInS3Categories(userId, productId, completeProductData);

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
        const timestamp = new Date().toISOString();
        
        // Update categories.json.gz with proper structure
        const categoriesData = {
            categories: {},
            last_updated: timestamp
        };
        
        // Convert categories array to object format keyed by ID
        if (categories && categories.length > 0) {
            categories.forEach(category => {
                categoriesData.categories[category.id] = {
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                    parent_id: category.parent || 0,
                    description: category.description || '',
                    count: category.count || 0
                };
            });
        }
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/categories.json.gz`,
            Body: zlib.gzipSync(JSON.stringify(categoriesData)),
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));
        
        // Update store-metadata.json.gz
        let storeMetadata;
        try {
            const metadataResponse = await s3Client.send(new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/store-metadata.json.gz`
            }));
            
            const compressedMetadata = await metadataResponse.Body.transformToByteArray();
            storeMetadata = JSON.parse(zlib.gunzipSync(compressedMetadata).toString());
        } catch (error) {
            // If store-metadata doesn't exist, create basic structure
            storeMetadata = {
                store_info: {
                    total_products: 0,
                    total_categories: categories ? categories.length : 0
                },
                sync_status: {
                    last_sync: timestamp,
                    status: 'completed'
                },
                architecture_version: '2.0'
            };
        }
        
        // Update store metadata with new category count
        storeMetadata.store_info.total_categories = categories ? categories.length : 0;
        storeMetadata.sync_status.last_sync = timestamp;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/store-metadata.json.gz`,
            Body: zlib.gzipSync(JSON.stringify(storeMetadata)),
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

async function updateCategoryInWooCommerce(url, username, appPassword, categoryId, categoryData) {
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    return makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/categories/${categoryId}`, auth, {}, 'PUT', categoryData);
}

async function updateCategoryIndex(userId, productId, productCategories) {
    try {
        console.log(`🔄 Updating category index for product: ${productId}`);
        
        // Load current category index
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/indexes/by-category.json.gz`
        }));
        
        const compressedData = await response.Body.transformToByteArray();
        const categoryIndex = JSON.parse(zlib.gunzipSync(compressedData).toString());
        
        // Ensure category_products exists
        if (!categoryIndex.category_products) {
            categoryIndex.category_products = {};
        }
        
        const numericProductId = parseInt(productId);
        
        // FIRST: Remove product from ALL existing categories
        Object.keys(categoryIndex.category_products).forEach(categoryId => {
            const productIndex = categoryIndex.category_products[categoryId].indexOf(numericProductId);
            if (productIndex > -1) {
                categoryIndex.category_products[categoryId].splice(productIndex, 1);
            }
        });
        
        // THEN: Add product to new categories
        if (productCategories && productCategories.length > 0) {
            productCategories.forEach(category => {
                const categoryId = category.id.toString();
                if (!categoryIndex.category_products[categoryId]) {
                    categoryIndex.category_products[categoryId] = [];
                }
                // Add product to new category
                if (!categoryIndex.category_products[categoryId].includes(numericProductId)) {
                    categoryIndex.category_products[categoryId].push(numericProductId);
                }
            });
        } else {
            // Add to uncategorized
            if (!categoryIndex.category_products['uncategorized']) {
                categoryIndex.category_products['uncategorized'] = [];
            }
            if (!categoryIndex.category_products['uncategorized'].includes(numericProductId)) {
                categoryIndex.category_products['uncategorized'].push(numericProductId);
            }
        }
        
        // Update timestamp
        categoryIndex.lastUpdated = new Date().toISOString();
        
        // Save back to S3
        const updatedJson = JSON.stringify(categoryIndex);
        const compressedUpdated = zlib.gzipSync(updatedJson);
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/indexes/by-category.json.gz`,
            Body: compressedUpdated,
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));
        
        console.log(`✅ Updated category index for product: ${productId}`);
        
    } catch (error) {
        console.error(`❌ Failed to update category index for product ${productId}:`, error);
        throw error;
    }
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

async function createProductInWooCommerce(url, username, appPassword, productData) {
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    return makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products', auth, {}, 'POST', productData);
}

async function createVariationsInWooCommerce(url, username, appPassword, productId, variations) {
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    for (const variation of variations) {
        await makeWordPressRequest(
            baseUrl, 
            `/wp-json/wc/v3/products/${productId}/variations`, 
            auth, 
            {}, 
            'POST', 
            variation
        );
    }
}

// Add job utilities at top of file
function generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function saveJobStatus(userId, jobId, status, progress = 0, result = null, error = null) {
    try {
        console.log(`💾 Saving job status: ${jobId} - ${status} (${progress}%)`);
        const jobData = { jobId, userId, status, progress, result, error, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const compressedData = zlib.gzipSync(JSON.stringify(jobData));
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/jobs/${jobId}.json.gz`,
            Body: compressedData,
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));
        console.log(`✅ Job status saved successfully: ${jobId}`);
    } catch (error) {
        console.error(`❌ Failed to save job status:`, error);
        throw error;
    }
}

async function getJobStatus(userId, jobId) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/jobs/${jobId}.json.gz`
        }));
        const compressed = await response.Body.transformToByteArray();
        return JSON.parse(zlib.gunzipSync(compressed).toString());
    } catch (error) {
        if (error.name === 'NoSuchKey') return null;
        throw error;
    }
}

export async function createProductBackground(userId, productData, jobId) {
    try {
        console.log(`🚀 Starting background product creation for job: ${jobId}`);
        await saveJobStatus(userId, jobId, 'processing', 10);
        
        const credentials = await getUserCredentials(userId);
        if (!credentials) {
            await saveJobStatus(userId, jobId, 'failed', 0, null, 'User credentials not found');
            return;
        }
        
        await saveJobStatus(userId, jobId, 'processing', 20);
        
        // Process attributes
        let processedAttributes = [];
        if (productData.attributes && Array.isArray(productData.attributes) && productData.attributes.length > 0) {
            try {
                const result = await processNewAttributes(
                    credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`,
                    Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64'),
                    productData.attributes
                );
                processedAttributes = Array.isArray(result) ? result : [];
            } catch (error) {
                console.error('❌ Failed to process attributes:', error);
                processedAttributes = [];
            }
        }
        
        await saveJobStatus(userId, jobId, 'processing', 40);
        
        const processedProductData = {
            ...productData,
            attributes: processedAttributes,
            stock_quantity: productData.stock_quantity ? parseInt(productData.stock_quantity) : null,
            regular_price: productData.regular_price ? parseFloat(productData.regular_price).toString() : '',
            sale_price: productData.sale_price ? parseFloat(productData.sale_price).toString() : '',
            weight: productData.weight ? parseFloat(productData.weight).toString() : '',
            menu_order: productData.menu_order ? parseInt(productData.menu_order) : 0,
            download_limit: productData.download_limit ? parseInt(productData.download_limit) : -1,
            download_expiry: productData.download_expiry ? parseInt(productData.download_expiry) : -1,
            categories: productData.categories?.map(cat => ({
                id: parseInt(cat.key.replace('category-', ''))
            })) || []
        };

        // Process images
        if (productData.images && productData.images.length > 0) {
            const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
            const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
            
            await saveJobStatus(userId, jobId, 'processing', 60);
            processedProductData.images = await processProductImages(productData.images, baseUrl, auth, productData.name);
        } else {
            processedProductData.images = [];
        }

        await saveJobStatus(userId, jobId, 'processing', 80);
        
        const newProduct = await createProductInWooCommerce(
            credentials.url,
            credentials.username,
            credentials.appPassword,
            processedProductData
        );
        
        // Handle variations for variable products
        if (productData.type === 'variable' && productData.variations) {
            await createVariationsInWooCommerce(
                credentials.url,
                credentials.username,
                credentials.appPassword,
                newProduct.id,
                productData.variations
            );
        }
        
        await saveJobStatus(userId, jobId, 'processing', 95);
        
        // Update S3 storage
        try {
            const existingData = await s3Client.send(new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/products.json.gz`
            }));
            const compressed = await existingData.Body.transformToByteArray();
            const data = JSON.parse(zlib.gunzipSync(compressed).toString());
            
            data.products[newProduct.id] = newProduct;
            data.lastUpdated = new Date().toISOString();
            
            const updatedJson = JSON.stringify(data);
            const compressedUpdated = zlib.gzipSync(updatedJson);
            
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/products.json.gz`,
                Body: compressedUpdated,
                ContentType: 'application/json',
                ContentEncoding: 'gzip'
            }));
            
            await updateCategoryIndex(userId, newProduct.id, newProduct.categories);
        } catch (s3Error) {
            console.error('❌ Failed to update S3 storage:', s3Error);
        }
        
        await saveJobStatus(userId, jobId, 'completed', 100, { 
            product: newProduct,
            success: true,
            productId: newProduct.id 
        });
        
        console.log(`✅ Background job ${jobId} completed successfully`);
        
    } catch (error) {
        console.error(`❌ Background job ${jobId} failed:`, error);
        await saveJobStatus(userId, jobId, 'failed', 0, null, error.message);
    }
}

export async function handleProduct(event, userId) {
    // Handle job status check
    if (event.httpMethod === 'GET' && event.queryStringParameters?.action === 'job-status') {
        const jobId = event.queryStringParameters?.jobId;
        if (!jobId) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Job ID required' })
            };
        }
        
        try {
            const jobStatus = await getJobStatus(userId, jobId);
            if (!jobStatus) {
                return {
                    statusCode: 404,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: 'Job not found' })
                };
            }
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true, job: jobStatus })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: error.message })
            };
        }
    }

    if (event.httpMethod === 'POST' && event.queryStringParameters?.action === 'create-product') {
        console.log('➕ Create product request received');
        
        let productData;
        try {
            productData = JSON.parse(event.body || '{}');
            console.log(`🔍 DEBUGGING: Product data received:`, JSON.stringify(productData, null, 2));
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' })
            };
        }
        
        if (!productData.name || !productData.name.trim()) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Product name is required' })
            };
        }
        
        try {
            // Generate job ID and return immediately
            const jobId = generateJobId();
            
            // Start background processing via separate Lambda invocation
            const lambda = new (await import('@aws-sdk/client-lambda')).LambdaClient({ region: 'ap-southeast-2' });
            await lambda.send(new (await import('@aws-sdk/client-lambda')).InvokeCommand({
                FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
                InvocationType: 'Event', // Async
                Payload: JSON.stringify({
                    source: 'background-job',
                    jobType: 'create-product',
                    userId,
                    productData,
                    jobId
                })
            }));
            
            // Return immediately with job ID
            return {
                statusCode: 202,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true, 
                    jobId,
                    message: 'Product creation started',
                    status: 'processing'
                })
            };
            
            // Process attributes if they exist (for variable products)
            let processedAttributes = [];
            if (productData.attributes && Array.isArray(productData.attributes) && productData.attributes.length > 0) {
                try {
                    const result = await processNewAttributes(
                        credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`,
                        Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64'),
                        productData.attributes
                    );
                    processedAttributes = Array.isArray(result) ? result : [];
                    console.log(`✅ Processed ${processedAttributes.length} attributes for variable product`);
                } catch (error) {
                    console.error('❌ Failed to process attributes:', error);
                    processedAttributes = [];
                }
            }
            
            console.log(`🔍 DEBUGGING: Final processed attributes:`, JSON.stringify(processedAttributes, null, 2));
            
            // Convert string values to proper types for WooCommerce API
            const processedProductData = {
                ...productData,
                attributes: processedAttributes, // Explicitly set as array
                stock_quantity: productData.stock_quantity ? parseInt(productData.stock_quantity) : null,
                regular_price: productData.regular_price ? parseFloat(productData.regular_price).toString() : '',
                sale_price: productData.sale_price ? parseFloat(productData.sale_price).toString() : '',
                weight: productData.weight ? parseFloat(productData.weight).toString() : '',
                menu_order: productData.menu_order ? parseInt(productData.menu_order) : 0,
                download_limit: productData.download_limit ? parseInt(productData.download_limit) : -1,
                download_expiry: productData.download_expiry ? parseInt(productData.download_expiry) : -1,
                // Transform categories from frontend format to WooCommerce format
                categories: productData.categories?.map(cat => ({
                    id: parseInt(cat.key.replace('category-', ''))
                })) || []
            };
            
            console.log(`🔍 DEBUGGING: Final processedProductData attributes:`, JSON.stringify(processedProductData.attributes, null, 2));

            // Process images with WooCommerce media upload support (same as updates)
            if (productData.images && productData.images.length > 0) {
                const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
                const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
                
                console.log(`🖼️ Processing ${productData.images.length} images for new product...`);
                processedProductData.images = await processProductImages(
                    productData.images,
                    baseUrl,
                    auth,
                    productData.name
                );
                console.log(`✅ Processed ${processedProductData.images.length} images for new product`);
            } else {
                processedProductData.images = [];
            }

            const newProduct = await createProductInWooCommerce(
                credentials.url,
                credentials.username,
                credentials.appPassword,
                processedProductData
            );
            
            console.log(`🔍 DEBUGGING: Created product:`, JSON.stringify(newProduct, null, 2));
            console.log(`🔍 DEBUGGING: Original product data categories:`, JSON.stringify(productData.categories));
            
            // If variable product, create variations
            if (productData.type === 'variable' && productData.variations) {
                await createVariationsInWooCommerce(
                    credentials.url,
                    credentials.username,
                    credentials.appPassword,
                    newProduct.id,
                    productData.variations
                );
            }
            
            // Add new product to S3 storage
            try {
                console.log(`🔄 Adding new product ${newProduct.id} to S3 storage`);
                
                const response = await s3Client.send(new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: `users/${userId}/products.json.gz`
                }));
                
                const compressedData = await response.Body.transformToByteArray();
                const productsData = JSON.parse(zlib.gunzipSync(compressedData).toString());
                
                // Add new product to products object
                const numericProductId = parseInt(newProduct.id);
                productsData.products[numericProductId] = newProduct;
                productsData.lastUpdated = new Date().toISOString();
                
                console.log(`📝 Adding product ${numericProductId} to products data`);
                
                // Save back to S3
                const updatedJson = JSON.stringify(productsData);
                const compressedUpdated = zlib.gzipSync(updatedJson);
                
                await s3Client.send(new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: `users/${userId}/products.json.gz`,
                    Body: compressedUpdated,
                    ContentType: 'application/json',
                    ContentEncoding: 'gzip'
                }));
                
                console.log(`✅ Successfully added new product ${newProduct.id} to S3 storage`);
                
                // Update category index so product appears in category views
                console.log(`🔄 Updating category index for new product ${newProduct.id}`);
                // Transform frontend category format to index format
                const categoryIds = productData.categories?.map(cat => ({
                    id: parseInt(cat.key.replace('category-', ''))
                })) || [];
                await updateCategoryIndex(userId, newProduct.id, categoryIds);
                console.log(`✅ Updated category index for new product ${newProduct.id}`);
                
            } catch (s3Error) {
                console.error(`❌ Failed to add new product ${newProduct.id} to S3:`, s3Error);
                console.error('S3 Error details:', s3Error.message);
                // Don't fail the entire request if S3 update fails
            }
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true, 
                    product: newProduct 
                })
            };
            
        } catch (error) {
            console.error('Product creation error:', error);
            
            // Extract specific error message for duplicate SKU
            let errorMessage = error.message;
            if (error.message.includes('product_invalid_sku') || error.message.includes('duplicated SKU')) {
                // Extract SKU from the error data if available
                let sku = 'provided SKU';
                try {
                    const errorData = JSON.parse(error.message.split(': ')[1]);
                    if (errorData.data && errorData.data.unique_sku) {
                        sku = errorData.data.unique_sku;
                    }
                } catch (parseError) {
                    // Fallback to generic message if we can't parse
                }
                errorMessage = `SKU "${sku}" already exists. Please use a different SKU.`;
            }
            
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: errorMessage
                })
            };
        }
    }

    if (event.httpMethod === 'PUT' && event.queryStringParameters?.action === 'update-category') {
        console.log('📝 Update category request received');
        
        const categoryId = event.queryStringParameters?.categoryId;
        if (!categoryId) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Category ID is required' })
            };
        }
        
        let categoryData;
        try {
            categoryData = JSON.parse(event.body || '{}');
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' })
            };
        }
        
        const { name, slug, parent } = categoryData;
        
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
            
            const updatedCategory = await updateCategoryInWooCommerce(
                credentials.url,
                credentials.username,
                credentials.appPassword,
                categoryId,
                {
                    name: name.trim(),
                    slug: slug?.trim() || '',
                    parent: parseInt(parent) || 0
                }
            );
            
            // Update metadata after category change
            await updateMetadataAfterCategoryChange(userId);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true, 
                    category: updatedCategory 
                })
            };
            
        } catch (error) {
            console.error('Category update error:', error);
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

    if (event.httpMethod === 'POST' && event.queryStringParameters?.action === 'duplicate-product') {
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
            
            // Add to S3 cache
            await addProductToS3(userId, duplicatedProduct);
            
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
            
            // Remove from S3 cache
            await removeProductFromS3(userId, productId);
            
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
            
            // Update S3 category indexes if categories changed
            if (productData.categories) {
                await updateCategoryIndex(userId, productId, productData.categories);
                console.log(`✅ Updated S3 category index for product ${productId}`);
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
    
    if (event.httpMethod === 'POST' && event.queryStringParameters?.action === 'upload-product-image') {
        const { productId } = event.queryStringParameters;
        const { image, index } = JSON.parse(event.body || '{}');
        
        try {
            const credentials = await getUserCredentials(userId);
            const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
            const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
            
            const processedImages = await processProductImages([image], baseUrl, auth, `Product ${productId}`);
            
            // Update product with new image
            const existingProduct = await makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/${productId}`, auth);
            const updatedImages = [...(existingProduct.images || []), ...processedImages];
            
            await makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/${productId}`, auth, {}, 'PUT', { 
                images: updatedImages 
            });
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true, image: processedImages[0] })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: error.message })
            };
        }
    }

    if (event.httpMethod === 'POST' && event.queryStringParameters?.action === 'refresh-product') {
        const { productId } = event.queryStringParameters;
        
        try {
            const credentials = await getUserCredentials(userId);
            const baseUrl = credentials.url.startsWith('http') ? credentials.url : `https://${credentials.url}`;
            const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
            
            // Get updated product from WooCommerce
            const updatedProduct = await makeWordPressRequest(baseUrl, `/wp-json/wc/v3/products/${productId}`, auth);
            
            // Update S3 storage
            const existingData = await s3Client.send(new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/products.json.gz`
            }));
            const compressed = await existingData.Body.transformToByteArray();
            const data = JSON.parse(zlib.gunzipSync(compressed).toString());
            
            data.products[productId] = updatedProduct;
            data.lastUpdated = new Date().toISOString();
            
            const updatedJson = JSON.stringify(data);
            const compressedUpdated = zlib.gzipSync(updatedJson);
            
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `users/${userId}/products.json.gz`,
                Body: compressedUpdated,
                ContentType: 'application/json',
                ContentEncoding: 'gzip'
            }));
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true })
            };
        } catch (error) {
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

async function removeProductFromS3(userId, productId) {
    try {
        // Update products.json.gz to remove the product
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`
        }));
        
        const compressed = await response.Body.transformToByteArray();
        const productsData = JSON.parse(zlib.gunzipSync(compressed).toString());
        
        delete productsData.products[productId];
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`,
            Body: zlib.gzipSync(JSON.stringify(productsData)),
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));
        
        console.log(`✅ Removed product ${productId} from S3 cache`);
    } catch (error) {
        console.error(`❌ Failed to remove product ${productId} from S3:`, error)
    }
}

async function addProductToS3(userId, product) {
    try {
        // Update products.json.gz
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`
        }));
        
        const compressed = await response.Body.transformToByteArray();
        const productsData = JSON.parse(zlib.gunzipSync(compressed).toString());
        
        productsData.products[product.id] = product;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/products.json.gz`,
            Body: zlib.gzipSync(JSON.stringify(productsData)),
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));

        // Update category index
        await updateCategoryIndex(userId, product.id, product.categories);
        
        console.log(`✅ Added product ${product.id} to S3 cache and category index`);
    } catch (error) {
        console.error(`❌ Failed to add product to S3:`, error);
    }
}