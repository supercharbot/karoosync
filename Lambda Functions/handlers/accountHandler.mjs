import zlib from 'zlib';
import { 
    S3Client, 
    ListObjectsV2Command, 
    DeleteObjectsCommand, 
    GetObjectCommand,
    PutObjectCommand 
} from '@aws-sdk/client-s3';
import { 
    CognitoIdentityProviderClient, 
    ListUsersCommand, 
    AdminDeleteUserCommand 
} from '@aws-sdk/client-cognito-identity-provider';

const s3Client = new S3Client({ region: 'ap-southeast-2' });
const cognitoClient = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });

const BUCKET_NAME = 'karoosync';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

// Delete user data from S3 (but preserve backups)
async function deleteUserS3Data(userId) {
    try {
        console.log(`🗑️ Deleting S3 data for user: ${userId}`);
        
        // Only delete objects under users/{userId}/ 
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: `users/${userId}/`
        }));

        if (listResponse.Contents && listResponse.Contents.length > 0) {
            const deleteParams = {
                Bucket: BUCKET_NAME,
                Delete: {
                    Objects: listResponse.Contents.map(obj => ({ Key: obj.Key }))
                }
            };

            await s3Client.send(new DeleteObjectsCommand(deleteParams));
            console.log(`✅ Deleted ${listResponse.Contents.length} S3 objects for user: ${userId}`);
        }

    } catch (error) {
        console.error('❌ Error deleting user data from S3:', error);
        throw error;
    }
}

// Delete user from Cognito User Pool
async function deleteCognitoUser(userId) {
    try {
        console.log(`🗑️ Deleting Cognito user: ${userId}`);

        await cognitoClient.send(new AdminDeleteUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: userId
        }));

        console.log(`✅ Deleted Cognito user: ${userId}`);

    } catch (error) {
        console.error('❌ Error deleting user from Cognito:', error);
        throw error;
    }
}

// Create CSV backup of user data
async function createUserBackup(userId, backupName) {
    try {
        console.log(`💾 Creating CSV backup for user: ${userId}`);
        
        // Get all user products from all categories
        const allProducts = [];
        
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: `users/${userId}/categories/`
        }));

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            throw new Error('No product data found to backup');
        }

        // Read all category files and collect products
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
                
                if (categoryData.products && Array.isArray(categoryData.products)) {
                    allProducts.push(...categoryData.products);
                }
            } catch (fileError) {
                console.warn(`⚠️ Could not read category file ${object.Key}:`, fileError.message);
            }
        }

        if (allProducts.length === 0) {
            throw new Error('No products found in any category');
        }

        // Create comprehensive CSV content (same as enhanced export)
        const csvHeaders = [
            'ID',
            'Name',
            'Slug',
            'SKU',
            'Status',
            'Type',
            'Featured',
            'Virtual',
            'Downloadable',
            'Regular Price',
            'Sale Price',
            'Sale Date From',
            'Sale Date To',
            'Stock Status',
            'Stock Quantity',
            'Manage Stock',
            'Backorders',
            'Sold Individually',
            'Weight',
            'Length',
            'Width',
            'Height',
            'Shipping Class',
            'Categories',
            'Tags',
            'Description',
            'Short Description',
            'Purchase Note',
            'Menu Order',
            'Reviews Allowed',
            'External URL',
            'Button Text',
            'Download Limit',
            'Download Expiry',
            'Image URLs',
            'Gallery URLs',
            'Attributes',
            'Created Date',
            'Modified Date'
        ];

        const csvRows = allProducts.map(product => [
            product.id || '',
            `"${(product.name || '').replace(/"/g, '""')}"`,
            product.slug || '',
            product.sku || '',
            product.status || '',
            product.type || '',
            product.featured ? 'Yes' : 'No',
            product.virtual ? 'Yes' : 'No',
            product.downloadable ? 'Yes' : 'No',
            product.regular_price || '',
            product.sale_price || '',
            product.date_on_sale_from || '',
            product.date_on_sale_to || '',
            product.stock_status || '',
            product.stock_quantity || '',
            product.manage_stock ? 'Yes' : 'No',
            product.backorders || '',
            product.sold_individually ? 'Yes' : 'No',
            product.weight || '',
            product.dimensions?.length || '',
            product.dimensions?.width || '',
            product.dimensions?.height || '',
            product.shipping_class || '',
            `"${product.categories?.map(cat => cat.name).join('; ') || ''}"`,
            `"${product.tags?.map(tag => tag.name).join('; ') || ''}"`,
            `"${(product.description || '').replace(/<[^>]*>/g, '').replace(/"/g, '""').substring(0, 1000)}"`,
            `"${(product.short_description || '').replace(/<[^>]*>/g, '').replace(/"/g, '""').substring(0, 500)}"`,
            `"${(product.purchase_note || '').replace(/"/g, '""')}"`,
            product.menu_order || '',
            product.reviews_allowed ? 'Yes' : 'No',
            product.external_url || '',
            product.button_text || '',
            product.download_limit || '',
            product.download_expiry || '',
            `"${product.images?.map(img => img.src).join('; ') || ''}"`,
            `"${product.images?.slice(1)?.map(img => img.src).join('; ') || ''}"`, // Gallery images (excluding first)
            `"${product.attributes?.map(attr => `${attr.name}: ${attr.options?.join(', ')}`).join('; ') || ''}"`,
            product.date_created || '',
            product.date_modified || ''
        ]);

        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

        // Store as regular CSV file (not compressed)
        const backupKey = `backups/${userId}/backup.csv`;
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: backupKey,
            Body: csvContent,
            ContentType: 'text/csv',
            Metadata: {
                'backup-name': backupName,
                'created-at': new Date().toISOString(),
                'product-count': allProducts.length.toString(),
                'field-count': csvHeaders.length.toString()
            }
        }));

        const backupSize = Math.round(Buffer.byteLength(csvContent) / 1024);
        
        console.log(`✅ Comprehensive CSV Backup created: ${backupSize}KB, ${allProducts.length} products, ${csvHeaders.length} fields`);
        
        return {
            success: true,
            backup: {
                exists: true,
                name: backupName,
                date: new Date().toISOString().split('T')[0],
                size: `${backupSize} KB`,
                status: 'completed',
                productCount: allProducts.length,
                fieldCount: csvHeaders.length
            }
        };

    } catch (error) {
        console.error('❌ Error creating backup:', error);
        throw error;
    }
}

// Get backup status
async function getBackupStatus(userId) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `backups/${userId}/backup.csv`
        }));
        
        const backupName = response.Metadata?.['backup-name'] || 'Product Backup';
        const createdAt = response.Metadata?.['created-at'] || new Date().toISOString();
        const productCount = response.Metadata?.['product-count'] || '0';
        const fieldCount = response.Metadata?.['field-count'] || '15'; // Default to old format
        
        const backupSize = Math.round(response.ContentLength / 1024);
        
        return {
            exists: true,
            name: backupName,
            date: createdAt.split('T')[0],
            size: `${backupSize} KB`,
            status: 'completed',
            productCount: parseInt(productCount),
            fieldCount: parseInt(fieldCount)
        };
        
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return { exists: false };
        }
        throw error;
    }
}

// Download backup as CSV file
async function downloadBackup(userId) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `backups/${userId}/backup.csv`
        }));
        
        const csvContent = await response.Body.transformToString();
        const backupName = response.Metadata?.['backup-name'] || 'Product Backup';
        const date = new Date().toISOString().split('T')[0];
        
        return {
            success: true,
            downloadUrl: `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`,
            filename: `${backupName.replace(/[^a-zA-Z0-9]/g, '-')}-${date}.csv`,
            size: `${Math.round(Buffer.byteLength(csvContent) / 1024)} KB`
        };
        
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            throw new Error('No backup found');
        }
        throw error;
    }
}

// Enhanced CSV generation function
function generateCSV(products, format = 'comprehensive') {
    if (!products || products.length === 0) {
        return 'No products to export';
    }

    let headers, mapProduct;

    switch (format) {
        case 'basic':
            headers = ['ID', 'Name', 'SKU', 'Price', 'Stock Status', 'Categories'];
            mapProduct = (product) => [
                product.id || '',
                `"${(product.name || '').replace(/"/g, '""')}"`,
                product.sku || '',
                product.regular_price || '',
                product.stock_status || '',
                `"${product.categories?.map(cat => cat.name).join('; ') || ''}"`
            ];
            break;

        case 'woocommerce':
            // Format compatible with WooCommerce product importer
            headers = [
                'ID', 'Type', 'SKU', 'Name', 'Published', 'Featured?', 'Visibility in catalog',
                'Short description', 'Description', 'Date sale price starts', 'Date sale price ends',
                'Tax status', 'Tax class', 'In stock?', 'Stock', 'Backorders allowed?',
                'Sold individually?', 'Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)',
                'Allow customer reviews?', 'Purchase note', 'Sale price', 'Regular price',
                'Categories', 'Tags', 'Shipping class', 'Images', 'Download limit',
                'Download expiry days', 'External URL', 'Button text', 'Position'
            ];
            mapProduct = (product) => [
                product.id || '', product.type || 'simple', product.sku || '',
                `"${(product.name || '').replace(/"/g, '""')}"`,
                product.status === 'publish' ? '1' : '0', product.featured ? '1' : '0',
                product.catalog_visibility || 'visible',
                `"${(product.short_description || '').replace(/<[^>]*>/g, '').replace(/"/g, '""')}"`,
                `"${(product.description || '').replace(/<[^>]*>/g, '').replace(/"/g, '""')}"`,
                product.date_on_sale_from || '', product.date_on_sale_to || '',
                'taxable', '', product.stock_status === 'instock' ? '1' : '0',
                product.stock_quantity || '', product.backorders || 'no',
                product.sold_individually ? '1' : '0', product.weight || '',
                product.dimensions?.length || '', product.dimensions?.width || '',
                product.dimensions?.height || '', product.reviews_allowed ? '1' : '0',
                `"${(product.purchase_note || '').replace(/"/g, '""')}"`,
                product.sale_price || '', product.regular_price || '',
                `"${product.categories?.map(cat => cat.name).join(' > ') || ''}"`,
                `"${product.tags?.map(tag => tag.name).join(', ') || ''}"`,
                product.shipping_class || '',
                `"${product.images?.map(img => img.src).join(', ') || ''}"`,
                product.download_limit || '', product.download_expiry || '',
                product.external_url || '', product.button_text || '', product.menu_order || ''
            ];
            break;

        case 'comprehensive':
        default:
            headers = [
                'ID', 'Name', 'Slug', 'SKU', 'Status', 'Type', 'Featured', 'Virtual', 'Downloadable',
                'Regular Price', 'Sale Price', 'Sale Date From', 'Sale Date To', 'Stock Status',
                'Stock Quantity', 'Manage Stock', 'Backorders', 'Sold Individually', 'Weight',
                'Length', 'Width', 'Height', 'Shipping Class', 'Categories', 'Tags',
                'Description', 'Short Description', 'Purchase Note', 'Menu Order', 'Reviews Allowed',
                'External URL', 'Button Text', 'Download Limit', 'Download Expiry', 'Image URLs',
                'Gallery URLs', 'Attributes', 'Created Date', 'Modified Date'
            ];
            mapProduct = (product) => [
                product.id || '', `"${(product.name || '').replace(/"/g, '""')}"`,
                product.slug || '', product.sku || '', product.status || '', product.type || '',
                product.featured ? 'Yes' : 'No', product.virtual ? 'Yes' : 'No',
                product.downloadable ? 'Yes' : 'No', product.regular_price || '',
                product.sale_price || '', product.date_on_sale_from || '',
                product.date_on_sale_to || '', product.stock_status || '',
                product.stock_quantity || '', product.manage_stock ? 'Yes' : 'No',
                product.backorders || '', product.sold_individually ? 'Yes' : 'No',
                product.weight || '', product.dimensions?.length || '',
                product.dimensions?.width || '', product.dimensions?.height || '',
                product.shipping_class || '',
                `"${product.categories?.map(cat => cat.name).join('; ') || ''}"`,
                `"${product.tags?.map(tag => tag.name).join('; ') || ''}"`,
                `"${(product.description || '').replace(/<[^>]*>/g, '').replace(/"/g, '""').substring(0, 1000)}"`,
                `"${(product.short_description || '').replace(/<[^>]*>/g, '').replace(/"/g, '""').substring(0, 500)}"`,
                `"${(product.purchase_note || '').replace(/"/g, '""')}"`,
                product.menu_order || '', product.reviews_allowed ? 'Yes' : 'No',
                product.external_url || '', product.button_text || '',
                product.download_limit || '', product.download_expiry || '',
                `"${product.images?.map(img => img.src).join('; ') || ''}"`,
                `"${product.images?.slice(1)?.map(img => img.src).join('; ') || ''}"`,
                `"${product.attributes?.map(attr => `${attr.name}: ${attr.options?.join(', ')}`).join('; ') || ''}"`,
                product.date_created || '', product.date_modified || ''
            ];
            break;
    }

    const csvRows = products.map(mapProduct);
    return [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
}

// Enhanced export user data with comprehensive CSV
async function exportUserData(userId, format, dataTypes) {
    try {
        console.log(`📤 Exporting data for user: ${userId}, format: ${format}`);
        
        const exportData = {};
        
        // Get metadata if requested
        if (dataTypes.includes('products') || dataTypes.includes('categories')) {
            try {
                const metadataResponse = await s3Client.send(new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: `users/${userId}/metadata.json.gz`
                }));
                
                const compressedMetadata = await metadataResponse.Body.transformToByteArray();
                const metadata = JSON.parse(zlib.gunzipSync(compressedMetadata).toString());
                
                if (dataTypes.includes('categories')) {
                    exportData.categories = metadata.categories;
                }
            } catch (error) {
                console.warn('⚠️ Could not load metadata for export');
            }
        }
        
        // Get products if requested
        if (dataTypes.includes('products')) {
            exportData.products = [];
            
            const listResponse = await s3Client.send(new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: `users/${userId}/categories/`
            }));
            
            if (listResponse.Contents) {
                for (const object of listResponse.Contents) {
                    if (!object.Key.endsWith('.json.gz')) continue;
                    
                    try {
                        const response = await s3Client.send(new GetObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: object.Key
                        }));
                        
                        const compressedData = await response.Body.transformToByteArray();
                        const categoryData = JSON.parse(zlib.gunzipSync(compressedData).toString());
                        
                        exportData.products.push(...categoryData.products);
                    } catch (fileError) {
                        console.warn(`⚠️ Could not load category data from ${object.Key}`);
                    }
                }
            }
        }
        
        exportData.exportedAt = new Date().toISOString();
        exportData.format = format;
        
        // Convert to requested format
        let fileContent;
        let contentType;
        let filename;
        
        switch (format) {
            case 'json':
                fileContent = JSON.stringify(exportData, null, 2);
                contentType = 'application/json';
                filename = 'karoosync-export.json';
                break;
                
            case 'csv':
                if (exportData.products && exportData.products.length > 0) {
                    fileContent = generateCSV(exportData.products, 'comprehensive');
                    console.log(`📊 CSV Export: ${exportData.products.length} products with comprehensive fields`);
                } else {
                    fileContent = 'No products to export';
                }
                contentType = 'text/csv';
                filename = 'karoosync-products-comprehensive.csv';
                break;
                
            default:
                fileContent = JSON.stringify(exportData, null, 2);
                contentType = 'application/json';
                filename = 'karoosync-export.json';
        }
        
        return {
            success: true,
            downloadUrl: `data:${contentType};base64,${Buffer.from(fileContent).toString('base64')}`,
            filename,
            size: `${Math.round(Buffer.byteLength(fileContent) / 1024)} KB`
        };
        
    } catch (error) {
        console.error('❌ Error exporting data:', error);
        throw error;
    }
}

export async function handleAccount(event, userId) {
    const action = event.queryStringParameters?.action;
    
    try {
        // DELETE account
        if (action === 'delete-account' && event.httpMethod === 'DELETE') {
            console.log(`🗑️ Account deletion requested for user: ${userId}`);
            
            await deleteUserS3Data(userId);
            await deleteCognitoUser(userId);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    message: 'Account deleted successfully'
                })
            };
        }
        
        // CREATE backup
        if (action === 'create-backup' && event.httpMethod === 'POST') {
            const { backupName } = JSON.parse(event.body || '{}');
            const result = await createUserBackup(userId, backupName || 'Product Backup');
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            };
        }
        
        // GET backup status
        if (action === 'backup-status' && event.httpMethod === 'GET') {
            const status = await getBackupStatus(userId);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true, backup: status })
            };
        }
        
        // DOWNLOAD backup
        if (action === 'download-backup' && event.httpMethod === 'GET') {
            const result = await downloadBackup(userId);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            };
        }
        
        // EXPORT data
        if (action === 'export-data' && event.httpMethod === 'POST') {
            const { format, dataTypes } = JSON.parse(event.body || '{}');
            const result = await exportUserData(userId, format || 'json', dataTypes || ['products']);
            
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            };
        }
        
        return {
            statusCode: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Invalid action or method' })
        };
        
    } catch (error) {
        console.error(`❌ Account operation error (${action}):`, error);
        return {
            statusCode: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
}