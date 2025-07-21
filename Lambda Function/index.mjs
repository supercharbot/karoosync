import { handleSync } from './handlers/syncHandler.mjs';
import { handleProduct } from './handlers/productHandler.mjs';
import { handleData } from './handlers/dataHandler.mjs';
//import { handleStore } from './handlers/storeHandler.mjs';
import { handleAccount } from './handlers/accountHandler.mjs';
import { handleStripe } from './handlers/stripeHandler.mjs';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,stripe-signature',
    'Access-Control-Max-Age': '86400'
};

// Extract user ID from JWT
function extractUserId(event) {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('No valid Authorization header');
    }
    
    try {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        const payload = parts[1] + '='.repeat((4 - parts[1].length % 4) % 4);
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        
        return decoded.sub;
    } catch (error) {
        throw new Error('Invalid JWT token');
    }
}

export const handler = async (event) => {
    console.log(`=== LAMBDA START: ${event.httpMethod} ${event.path || 'undefined'} ===`);
    console.log('Headers:', JSON.stringify(event.headers, null, 2));
    console.log('Path:', event.path);
    console.log('Resource:', event.resource);
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: ''
            };
        }
        
        // *** WEBHOOK REQUESTS - No Authentication Required ***
        // Check if this is a webhook request (path contains /webhook or has stripe signature)
        const isWebhookPath = event.path === '/webhook' || 
                             event.resource === '/webhook' ||
                             event.path?.includes('/webhook');
        
        const stripeSignature = event.headers?.['stripe-signature'] || 
                               event.headers?.['Stripe-Signature'];
        
        if (isWebhookPath || stripeSignature) {
            console.log('🔔 Webhook request detected - routing to Stripe handler (no auth)');
            return await handleStripe(event, null); // No userId needed for webhooks
        }
        
        // *** Handle async invocations differently ***
        if (event.source === 'async-sync') {
            console.log('🔄 Async sync invocation detected - no JWT extraction needed');
            // For async invocations, userId is in the payload
            return await handleSync(event, null);
        }

        // *** ALL OTHER REQUESTS - Require Authentication ***
        console.log('🔒 Non-webhook request - extracting user ID from JWT');
        const userId = extractUserId(event);
        console.log('✅ Authenticated user:', userId);
        
        // Route to appropriate handler based on action/method
        const action = event.queryStringParameters?.action;
        console.log('📍 Action:', action);
        console.log('📍 Method:', event.httpMethod);
        
        // Stripe operations (authenticated)
        if (action === 'get-subscription-status' || 
            action === 'create-subscription' || 
            action === 'cancel-subscription') {
            console.log('💳 Routing to Stripe handler (authenticated)');
            return await handleStripe(event, userId);
        }
        
        // Account management operations
        if (action === 'delete-account' ||
            action === 'create-backup' ||
            action === 'backup-status' ||
            action === 'download-backup' ||
            action === 'export-data') {
            console.log('👤 Routing to Account handler');
            return await handleAccount(event, userId);
        }
        
        // Sync operations: init-auth (GET), sync (POST without action), resync, and sync-status
        if (action === 'init-auth' || action === 'resync' || action === 'sync-status' || (event.httpMethod === 'POST' && !action)) {
            console.log('🔄 Routing to Sync handler');
            return await handleSync(event, userId);
        }
        
        // Product operations: PUT requests and category management
        if (event.httpMethod === 'PUT' ||
            (event.httpMethod === 'POST' && action === 'create-product') ||
            (event.httpMethod === 'POST' && action === 'create-category') ||
            (event.httpMethod === 'POST' && action === 'duplicate-product') ||
            (event.httpMethod === 'PUT' && action === 'update-category') ||
            (event.httpMethod === 'DELETE' && action === 'delete-category') ||
            (event.httpMethod === 'DELETE' && action === 'delete-product')) {
            console.log('🛍️ Routing to Product handler');
            return await handleProduct(event, userId);
        }
        
        // Data operations: check-data and load-category (GET)
        if (action === 'check-data' || action === 'load-category' || action === 'load-categories' || action === 'load-product' || action === 'load-variations' || action === 'search' || action === 'load-woocommerce-tags' || action === 'load-woocommerce-attributes' || action === 'load-woocommerce-shipping-classes') {
            console.log('📊 Routing to Data handler');
            return await handleData(event, userId);
        }
        
        // [Removed: Store settings operations - no longer supported]
        
        // Health check - default GET without action
        if (event.httpMethod === 'GET') {
            console.log('❤️ Health check');
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'healthy', 
                    timestamp: new Date().toISOString(),
                    message: 'Karoosync API is running',
                    path: event.path,
                    resource: event.resource
                })
            };
        }
        
        // Unknown route
        console.log('❓ Unknown route');
        return {
            statusCode: 405,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
        
    } catch (error) {
        console.error('❌ Handler Error:', error);
        
        // Return appropriate error based on error type
        if (error.message.includes('Authorization') || error.message.includes('JWT')) {
            return {
                statusCode: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, error: 'Unauthorized' })
            };
        }
        
        return {
            statusCode: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};