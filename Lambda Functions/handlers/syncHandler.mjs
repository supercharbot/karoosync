import https from 'https';
import zlib from 'zlib';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'ap-southeast-2' });
const BUCKET_NAME = 'karoosync';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

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

async function syncWordPress(url, username, appPassword) {
    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    const products = await fetchAllProducts(baseUrl, auth);
    const categories = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products/categories', auth, { per_page: 100 });
    
    return {
        products,
        categories: categories || [],
        attributes: [],
        systemStatus: null,
        totalProducts: products.length,
        extractedAt: new Date().toISOString()
    };
}

async function fetchAllProducts(baseUrl, auth) {
    const allProducts = [];
    let page = 1;
    
    while (page <= 100) {
        const products = await makeWordPressRequest(baseUrl, '/wp-json/wc/v3/products', auth, {
            page,
            per_page: 20,
            status: 'any'
        });
        
        if (!products || products.length === 0) break;
        
        allProducts.push(...products);
        if (products.length < 20) break;
        
        page++;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allProducts;
}

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

async function storeData(userId, syncData, credentials) {
    const timestamp = new Date().toISOString();
    
    const productsByCategory = { uncategorized: [] };
    const categoryProductCounts = {};
    
    syncData.products.forEach(product => {
        const categoryIds = product.categories?.map(cat => cat.id) || [];
        
        if (categoryIds.length === 0) {
            productsByCategory.uncategorized.push(product);
            categoryProductCounts['uncategorized'] = (categoryProductCounts['uncategorized'] || 0) + 1;
        } else {
            const primaryCategoryId = categoryIds[0];
            const key = `category-${primaryCategoryId}`;
            
            if (!productsByCategory[key]) {
                productsByCategory[key] = [];
            }
            
            productsByCategory[key].push(product);
            categoryProductCounts[key] = (categoryProductCounts[key] || 0) + 1;
            
            console.log(`Product "${product.name}" assigned to primary category: ${primaryCategoryId}`);
        }
    });
    
    // Create metadata with accurate category counts
    const categoriesWithCounts = syncData.categories.map(category => ({
        ...category,
        productCount: categoryProductCounts[`category-${category.id}`] || 0
    }));
    
    const metadata = {
        categories: categoriesWithCounts,
        totalProducts: syncData.totalProducts,
        categoryProductCounts,
        cachedAt: timestamp
    };
    
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `users/${userId}/metadata.json.gz`,
        Body: zlib.gzipSync(JSON.stringify(metadata)),
        ContentType: 'application/json',
        ContentEncoding: 'gzip'
    }));
    
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `users/${userId}/credentials.json.gz`,
        Body: zlib.gzipSync(JSON.stringify(credentials)),
        ContentType: 'application/json',
        ContentEncoding: 'gzip'
    }));
    
    // Store each category's products
    for (const [categoryKey, products] of Object.entries(productsByCategory)) {
        if (products.length === 0) continue;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `users/${userId}/categories/${categoryKey}/products.json.gz`,
            Body: zlib.gzipSync(JSON.stringify({ products, categoryKey })),
            ContentType: 'application/json',
            ContentEncoding: 'gzip'
        }));
    }
    
    console.log(`✅ Stored products in ${Object.keys(productsByCategory).length} categories (no duplicates)`);
    
    return { success: true, categoriesStored: Object.keys(productsByCategory).length };
}

export async function handleSync(event, userId) {
    if (event.httpMethod === 'GET' && event.queryStringParameters?.action === 'init-auth') {
        const storeUrl = event.queryStringParameters?.url;
        if (!storeUrl) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Store URL required' })
            };
        }
        
        const result = await initializeWordPressAuth(storeUrl);
        return {
            statusCode: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        };
    }
    
    if (event.httpMethod === 'POST') {
        const { url, username, appPassword } = JSON.parse(event.body || '{}');
        
        if (!url || !username || !appPassword) {
            return {
                statusCode: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'URL, username, and app password required' })
            };
        }
        
        const syncData = await syncWordPress(url, username, appPassword);
        const storeResult = await storeData(userId, syncData, { url, username, appPassword });
        
        return {
            statusCode: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                structure: 'categorized',
                metadata: { categories: syncData.categories, totalProducts: syncData.totalProducts },
                categoriesStored: storeResult.categoriesStored
            })
        };
    }
    
    return {
        statusCode: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
}