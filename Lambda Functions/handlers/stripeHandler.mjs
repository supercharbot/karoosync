import { CognitoIdentityProviderClient, ListUsersCommand, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

// Main Stripe handler function
export async function handleStripe(event, userId) {
    console.log('🎯 Stripe handler started');
    console.log('🎯 User ID:', userId);
    console.log('🎯 Path:', event.path);
    console.log('🎯 Resource:', event.resource);
    console.log('🎯 Method:', event.httpMethod);
    
    try {
        // Check if this is a webhook request
        const stripeSignature = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'];
        const isWebhookPath = event.path === '/webhook' || 
                             event.resource === '/webhook' ||
                             event.path?.includes('/webhook');
        
        console.log('🎯 Has stripe signature:', !!stripeSignature);
        console.log('🎯 Is webhook path:', isWebhookPath);
        
        // If it's a webhook path OR has a Stripe signature, treat as webhook
        if (isWebhookPath || stripeSignature) {
            console.log('🔔 Processing as Stripe webhook');
            return await handleWebhook(event);
        }
        
        // Handle authenticated Stripe API calls (future use)
        console.log('🔐 Processing authenticated Stripe request');
        const action = event.queryStringParameters?.action;
        
        switch (action) {
            case 'get-subscription-status':
                return await getSubscriptionStatus(userId);
            
            default:
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false, 
                        error: `Unsupported Stripe action: ${action}` 
                    })
                };
        }
        
    } catch (error) {
        console.error('❌ Stripe handler error:', error);
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

// Handle incoming Stripe webhooks
async function handleWebhook(event) {
    try {
        console.log('📨 Processing webhook...');
        console.log('📨 Body length:', event.body?.length || 0);
        console.log('📨 Content-Type:', event.headers?.['content-type'] || event.headers?.['Content-Type']);
        
        // For testing: if this is just a test request, return success
        if (event.body && event.body.includes('"test"')) {
            console.log('🧪 Test webhook request detected');
            return {
                statusCode: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true,
                    message: 'Test webhook received successfully',
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        // Parse the Stripe event
        if (!event.body) {
            throw new Error('No body in webhook request');
        }
        
        const stripeEvent = JSON.parse(event.body);
        console.log(`📨 Event Type: ${stripeEvent.type}`);
        console.log(`📨 Event ID: ${stripeEvent.id}`);
        
        // Handle different event types
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                await handlePaymentSuccess(stripeEvent.data.object);
                break;
                
            case 'customer.subscription.created':
                await handleSubscriptionCreated(stripeEvent.data.object);
                break;
                
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(stripeEvent.data.object);
                break;
                
            case 'customer.subscription.deleted':
                await handleSubscriptionCanceled(stripeEvent.data.object);
                break;
                
            case 'invoice.payment_failed':
                await handlePaymentFailed(stripeEvent.data.object);
                break;
                
            default:
                console.log(`⚠️ Unhandled event type: ${stripeEvent.type}`);
        }
        
        // Always return success to Stripe
        console.log('✅ Webhook processed successfully');
        return {
            statusCode: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                received: true,
                eventType: stripeEvent.type || 'test',
                eventId: stripeEvent.id || 'test',
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        return {
            statusCode: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Webhook processing failed',
                message: error.message 
            })
        };
    }
}

// Handle successful payment (Payment Links)
async function handlePaymentSuccess(checkoutSession) {
    try {
        console.log('💰 Processing successful payment');
        
        const customerEmail = checkoutSession.customer_details?.email;
        const paymentAmount = checkoutSession.amount_total;
        const currency = checkoutSession.currency;
        
        console.log(`💰 Payment details:`);
        console.log(`   Email: ${customerEmail}`);
        console.log(`   Amount: ${paymentAmount} ${currency}`);
        console.log(`   Session ID: ${checkoutSession.id}`);
        
        if (!customerEmail) {
            console.log('⚠️ No customer email found in checkout session');
            return;
        }
        
        // Update user's subscription status
        await updateUserSubscriptionByEmail(customerEmail, 'active');
        
        console.log(`✅ Successfully activated subscription for ${customerEmail}`);
        
    } catch (error) {
        console.error('❌ Error processing payment success:', error);
        throw error;
    }
}

// Handle subscription events
async function handleSubscriptionCreated(subscription) {
    console.log(`📋 Subscription created: ${subscription.id} (Status: ${subscription.status})`);
    // Handle if needed - Payment Links usually trigger checkout.session.completed instead
}

async function handleSubscriptionUpdated(subscription) {
    console.log(`🔄 Subscription updated: ${subscription.id} (Status: ${subscription.status})`);
    // Handle status changes if needed
}

async function handleSubscriptionCanceled(subscription) {
    try {
        console.log(`🚫 Subscription canceled: ${subscription.id}`);
        
        // For now, we'll skip this since we don't have easy access to customer email
        // In a full implementation, you'd look up the customer and update Cognito
        console.log('⚠️ Subscription cancellation handling not implemented yet');
        
    } catch (error) {
        console.error('❌ Error handling subscription cancellation:', error);
    }
}

async function handlePaymentFailed(invoice) {
    console.log(`💸 Payment failed for invoice: ${invoice.id}`);
    // Handle payment failures if needed
}

// Find Cognito user by email and update subscription status
async function updateUserSubscriptionByEmail(email, subscriptionStatus) {
    try {
        console.log(`🔍 Searching for user with email: ${email}`);
        
        // Search for user in Cognito by email
        const listCommand = new ListUsersCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Filter: `email = "${email}"`
        });
        
        const result = await cognitoClient.send(listCommand);
        console.log(`📋 Found ${result.Users.length} users with email ${email}`);
        
        if (result.Users.length === 0) {
            console.log('❌ No Cognito user found with that email address');
            throw new Error(`No user found with email: ${email}`);
        }
        
        if (result.Users.length > 1) {
            console.log('⚠️ Multiple users found with same email, using first one');
        }
        
        const user = result.Users[0];
        const username = user.Username;
        
        console.log(`📝 Updating subscription for user: ${username}`);
        console.log(`📝 Setting status to: ${subscriptionStatus}`);
        
        // Update the custom attribute
        const updateCommand = new AdminUpdateUserAttributesCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username,
            UserAttributes: [
                {
                    Name: 'custom:subscription_status',
                    Value: subscriptionStatus
                }
            ]
        });
        
        await cognitoClient.send(updateCommand);
        
        console.log(`✅ Successfully updated ${username} subscription status to: ${subscriptionStatus}`);
        
    } catch (error) {
        console.error('❌ Error updating user subscription:', error);
        throw error;
    }
}

// Get subscription status for authenticated user
async function getSubscriptionStatus(userId) {
    try {
        console.log(`📊 Getting subscription status for user: ${userId}`);
        
        // This is a placeholder - you can implement this later if needed
        return {
            statusCode: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                message: 'Subscription status check not implemented yet'
            })
        };
        
    } catch (error) {
        console.error('❌ Error getting subscription status:', error);
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