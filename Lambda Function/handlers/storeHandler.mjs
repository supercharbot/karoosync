import zlib from 'zlib';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'ap-southeast-2' });
const BUCKET_NAME = 'karoosync';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

// Store data file mapping
const STORE_FILES = {
    attributes: 'attributes.json.gz',
    'shipping-classes': 'shipping-classes.json.gz',
    tags: 'tags.json.gz',
    'tax-classes': 'tax-classes.json.gz'
};

// Load data from S3
async function loadStoreData(userId, type) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/${STORE_FILES[type]}`
        }));
        
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const decompressed = zlib.gunzipSync(buffer);
        const data = JSON.parse(decompressed.toString());
        
        return data;
        
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return getEmptyStructure(type);
        }
        throw error;
    }
}

// Save data to S3
async function saveStoreData(userId, type, data) {
    const compressed = zlib.gzipSync(JSON.stringify(data));
    
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `users/${userId}/${STORE_FILES[type]}`,
        Body: compressed,
        ContentType: 'application/json',
        ContentEncoding: 'gzip'
    }));
}

// Get empty structure for each type
function getEmptyStructure(type) {
    switch (type) {
        case 'attributes':
            return { attributes: {}, last_updated: new Date().toISOString() };
        case 'shipping-classes':
            return { shipping_classes: {}, last_updated: new Date().toISOString() };
        case 'tags':
            return { tags: {}, last_updated: new Date().toISOString() };
        case 'tax-classes':
            return { tax_classes: {}, last_updated: new Date().toISOString() };
        default:
            return {};
    }
}

// Generate new ID
function generateId(existingData, type) {
    const dataKey = getDataKey(type);
    const existingIds = Object.keys(existingData[dataKey] || {}).map(id => parseInt(id));
    return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
}

// Get data key for each type
function getDataKey(type) {
    switch (type) {
        case 'attributes': return 'attributes';
        case 'shipping-classes': return 'shipping_classes';
        case 'tags': return 'tags';
        case 'tax-classes': return 'tax_classes';
        default: return type;
    }
}

// Main handler
export async function handleStore(event, userId) {
    const action = event.queryStringParameters?.action;
    const type = action.split('-').slice(1).join('-'); // Extract type from action
    
    try {
        // Load operations
        if (action.startsWith('load-')) {
            console.log(`📖 Loading ${type} for user: ${userId}`);
            
            const data = await loadStoreData(userId, type);
            const dataKey = getDataKey(type);
            const items = Object.values(data[dataKey] || {});
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    [type.replace('-', '_')]: items,
                    total: items.length
                })
            };
        }
        
        // Create operations
        if (action.startsWith('create-')) {
            const itemData = JSON.parse(event.body);
            console.log(`📝 Creating ${type}:`, itemData);
            
            const data = await loadStoreData(userId, type);
            const dataKey = getDataKey(type);
            const newId = generateId(data, type);
            
            const newItem = {
                id: newId,
                name: itemData.name,
                slug: itemData.name.toLowerCase().replace(/\s+/g, '-'),
                ...itemData,
                created_at: new Date().toISOString()
            };
            
            // Add type-specific fields
            if (type === 'attributes') {
                newItem.type = itemData.type || 'select';
                newItem.terms = itemData.terms || [];
            }
            
            data[dataKey][newId] = newItem;
            data.last_updated = new Date().toISOString();
            
            await saveStoreData(userId, type, data);
            
            return {
                statusCode: 201,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    item: newItem,
                    message: `${type.replace('-', ' ')} created successfully`
                })
            };
        }
        
        // Update operations
        if (action.startsWith('update-')) {
            const itemId = event.pathParameters?.id || event.queryStringParameters?.id;
            const itemData = JSON.parse(event.body);
            console.log(`✏️ Updating ${type} ${itemId}:`, itemData);
            
            const data = await loadStoreData(userId, type);
            const dataKey = getDataKey(type);
            
            if (!data[dataKey][itemId]) {
                return {
                    statusCode: 404,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: `${type.replace('-', ' ')} not found`
                    })
                };
            }
            
            const updatedItem = {
                ...data[dataKey][itemId],
                ...itemData,
                slug: itemData.name.toLowerCase().replace(/\s+/g, '-'),
                updated_at: new Date().toISOString()
            };
            
            data[dataKey][itemId] = updatedItem;
            data.last_updated = new Date().toISOString();
            
            await saveStoreData(userId, type, data);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    item: updatedItem,
                    message: `${type.replace('-', ' ')} updated successfully`
                })
            };
        }
        
        // Delete operations
        if (action.startsWith('delete-')) {
            const itemId = event.pathParameters?.id || event.queryStringParameters?.id;
            console.log(`🗑️ Deleting ${type} ${itemId}`);
            
            const data = await loadStoreData(userId, type);
            const dataKey = getDataKey(type);
            
            if (!data[dataKey][itemId]) {
                return {
                    statusCode: 404,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: `${type.replace('-', ' ')} not found`
                    })
                };
            }
            
            const deletedItem = data[dataKey][itemId];
            delete data[dataKey][itemId];
            data.last_updated = new Date().toISOString();
            
            await saveStoreData(userId, type, data);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    message: `${type.replace('-', ' ')} deleted successfully`,
                    deleted_item: deletedItem
                })
            };
        }
        
        return {
            statusCode: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'Invalid action'
            })
        };
        
    } catch (error) {
        console.error(`❌ Store handler error:`, error);
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