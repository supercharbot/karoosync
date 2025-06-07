const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://tmaob4c6n9.execute-api.ap-southeast-2.amazonaws.com/v1/sync';
const OAUTH_REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || 
  (window.location.hostname === 'localhost' 
    ? 'https://karoosync.com/oauth/callback'
    : `${window.location.origin}/oauth/callback`);

const handleApiResponse = async (response) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || `Server responded with ${response.status}`);
    } catch (jsonError) {
      try {
        const textContent = await response.text();
        if (textContent.includes('<!DOCTYPE html>')) {
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. Check if the store URL is correct and includes 'https://'`);
        }
        throw new Error(`Server error: ${response.status} - ${textContent.substring(0, 100)}...`);
      } catch (textError) {
        throw new Error(`Request failed with status: ${response.status}`);
      }
    }
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse successful response as JSON: ${error.message}`);
  }
};

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const checkUserData = async (authToken) => {
  try {
    console.log('Checking for user data...');
    
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}` 
    };
    
    const response = await fetch(`${API_ENDPOINT}?action=check-data`, {
      method: 'GET',
      headers
    });
    
    const result = await handleApiResponse(response);
    
    if (result.success) {
      if (result.structure === 'categorized') {
        console.log(`Found categorized data: ${result.totalProducts} products in ${result.availableCategories?.length || 0} categories (${result.cacheAgeHours}h old)`);
        if (result.credentials) {
          console.log('Stored credentials found for updates');
        } else {
          console.warn('No stored credentials - updates will be disabled');
        }
      } else if (result.structure === 'legacy') {
        console.log(`Found legacy data: ${result.productCount} products (needs migration) (${result.cacheAgeHours}h old)`);
      } else {
        console.log('No user data found');
      }
    }
    
    return result;
  } catch (error) {
    console.error('Failed to check user data:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export const loadCategoryProducts = async (categoryKey, authToken) => {
  try {
    console.log(`Loading products for category: ${categoryKey}`);
    
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}` 
    };
    
    const response = await fetch(`${API_ENDPOINT}?action=load-category&category=${encodeURIComponent(categoryKey)}`, {
      method: 'GET',
      headers
    });
    
    const result = await handleApiResponse(response);
    
    if (result.success) {
      console.log(`Loaded ${result.products?.length || 0} products from category ${categoryKey}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to load category ${categoryKey}:`, error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export const initializeAppPasswordAuth = async (storeUrl) => {
  try {
    let url = storeUrl;
    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
    }

    const apiUrl = `${url}/wp-json`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.authentication && data.authentication['application-passwords']) {
      const authEndpoint = data.authentication['application-passwords'].endpoints.authorization;
      const params = new URLSearchParams({
        app_name: 'Karoosync - WooCommerce Data Sync',
        app_id: generateUUID(),
        success_url: OAUTH_REDIRECT_URI,
        reject_url: `${OAUTH_REDIRECT_URI}?error=access_denied`
      });
      
      return {
        success: true,
        authUrl: `${authEndpoint}?${params}`
      };
    } else {
      throw new Error('Application Passwords not available on this site');
    }
  } catch (err) {
    return {
      success: false,
      error: 'Failed to initialize Application Password auth: ' + err.message
    };
  }
};

export const syncStore = async (credentials, authToken = null) => {
  try {
    let url = credentials.url;
    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
      credentials = { ...credentials, url };
    }
    
    console.log(`Connecting to: ${url}`);
    
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(credentials)
    });
    
    const result = await handleApiResponse(response);
    
    if (result.success) {
      // Handle new categorized structure
      if (result.structure === 'categorized') {
        console.log(`Sync complete: ${result.metadata?.totalProducts || 0} products organized into ${result.categoriesStored || 0} categories`);
        
        // Return data structure that matches what App.js expects
        return {
          success: true,
          data: {
            products: [], // Empty array for compatibility with existing ProductEditor
            categories: result.metadata?.categories || [],
            attributes: result.metadata?.attributes || [],
            systemStatus: result.metadata?.systemStatus,
            totalProducts: result.metadata?.totalProducts || 0,
            structure: 'categorized',
            availableCategories: result.metadata?.categories?.map(cat => `category-${cat.id}`) || []
          }
        };
      }
      
      // Handle legacy structure for backward compatibility
      if (result.data && (!result.data.products || result.data.products.length === 0)) {
        return { 
          success: false, 
          error: 'No products found in the store or API key has insufficient permissions.'
        };
      }
    }
    
    return result;
  } catch (error) {
    console.error("Sync store error:", error);
    
    let errorMessage = error.message;
    
    if (errorMessage.includes('HTML instead of JSON')) {
      errorMessage = 'Connection error: The store URL may be incorrect or the site is not responding with proper WooCommerce API data.';
    } else if (errorMessage.includes('API key') && errorMessage.includes('permissions')) {
      errorMessage = 'Permission error: Make sure your WooCommerce API key has Read/Write permissions.';
    } else if (errorMessage.includes('cannot list resources')) {
      errorMessage = 'Authentication error: The API credentials do not have permission to list products. Please check your API key permissions.';
    } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      errorMessage = 'Network error: Could not connect to the store. Please check your internet connection and the store URL.';
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

export const updateProduct = async (credentials, productId, updatedData, authToken = null) => {
  try {
    console.log('=== UPDATE PRODUCT DEBUG START ===');
    console.log('Input credentials:', {
      url: credentials?.url,
      authMethod: credentials?.authMethod,
      hasConsumerKey: !!credentials?.consumerKey,
      hasConsumerSecret: !!credentials?.consumerSecret,
      hasUsername: !!credentials?.username,
      hasAppPassword: !!credentials?.appPassword
    });
    console.log('Product ID:', productId);
    console.log('Updated data keys:', Object.keys(updatedData || {}));
    console.log('Auth token present:', !!authToken);

    // Handle case where credentials might be null (shouldn't happen, but safety first)
    if (!credentials) {
      throw new Error('No credentials available for product update. Please re-sync your store.');
    }

    let url = credentials.url;
    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
      credentials = { ...credentials, url };
    }
    
    console.log(`Updating product ${productId}...`);
    
    const processedProductData = {
      ...updatedData,
      images: updatedData.images.map(image => {
        if (image.src && image.src.startsWith('data:image')) {
          return { 
            ...image,
            base64_upload: true
          };
        }
        return image;
      })
    };

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const requestBody = {
      ...credentials,
      action: 'updateProduct',
      productId,
      productData: processedProductData
    };

    console.log('=== REQUEST DETAILS ===');
    console.log('API Endpoint:', API_ENDPOINT);
    console.log('Request method: PUT');
    console.log('Request headers:', headers);
    console.log('Request body structure:', {
      url: requestBody.url,
      authMethod: requestBody.authMethod,
      action: requestBody.action,
      productId: requestBody.productId,
      hasProductData: !!requestBody.productData,
      productDataKeys: Object.keys(requestBody.productData || {}),
      hasConsumerKey: !!requestBody.consumerKey,
      hasConsumerSecret: !!requestBody.consumerSecret,
      hasUsername: !!requestBody.username,
      hasAppPassword: !!requestBody.appPassword
    });

    console.log('Sending update request to Lambda...');

    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers,
      body: JSON.stringify(requestBody)
    });

    console.log('=== RESPONSE DETAILS ===');
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text first to debug what we're actually receiving
    const responseText = await response.text();
    console.log('=== RAW RESPONSE ===');
    console.log('Response length:', responseText.length);
    console.log('Response first 1000 chars:', responseText.substring(0, 1000));
    
    if (!responseText) {
      throw new Error('Lambda returned empty response');
    }
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('=== PARSED RESPONSE ===');
      console.log('Parsed result:', result);
      
      // Handle AWS Lambda response format
      if (result.statusCode && result.body && typeof result.body === 'string') {
        console.log('=== DETECTED AWS LAMBDA RESPONSE FORMAT ===');
        console.log('Status Code:', result.statusCode);
        console.log('Parsing body...');
        
        try {
          const actualResult = JSON.parse(result.body);
          console.log('=== ACTUAL RESPONSE DATA ===');
          console.log('Actual result:', actualResult);
          result = actualResult;
        } catch (bodyParseError) {
          console.error('Failed to parse Lambda body:', bodyParseError);
          throw new Error(`Lambda returned invalid body format: ${result.body.substring(0, 100)}...`);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse Lambda response as JSON:', parseError);
      console.error('Raw response that failed to parse:', responseText);
      throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}...`);
    }
      
    // Check if the response indicates success
    if (!result.success) {
      console.log('=== LAMBDA FAILURE RESPONSE ===');
      console.log('result.success:', result.success);
      console.log('result.error:', result.error);
      console.log('result.message:', result.message);
      console.log('All result keys:', Object.keys(result));
      console.log('Full result object:', JSON.stringify(result, null, 2));
      
      const errorMessage = result.error || result.message || 'Update failed - no error details provided';
      console.error('Lambda returned failure:', errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log('=== SUCCESS RESPONSE ===');
    console.log('result.success:', result.success);
    console.log('result.s3Updated:', result.s3Updated);
    console.log('result.categoriesUpdated:', result.categoriesUpdated);
    
    // Log detailed success info
    if (result.s3Updated === false) {
      console.warn('Product updated in WooCommerce but S3 sync failed:', result.s3Error);
      console.log(`Categories updated: ${result.categoriesUpdated || 0}`);
    } else {
      console.log(`Product updated successfully - WooCommerce ✅, S3 categories: ${result.categoriesUpdated || 0} ✅`);
    }
    
    console.log('=== UPDATE PRODUCT DEBUG END ===');
    return result;
  } catch (error) {
    console.error("=== UPDATE PRODUCT ERROR ===");
    console.error("Error object:", error);
    console.error("Error type:", typeof error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    let errorMessage = error.message;
    
    // More specific error handling
    if (errorMessage.includes('No stored credentials found')) {
      errorMessage = 'Store credentials have expired. Please re-sync your store to enable updates.';
    } else if (errorMessage.includes('API key') && errorMessage.includes('write permissions')) {
      errorMessage = 'Permission error: Your WooCommerce API key does not have write permissions. Please update your API key to have Read/Write access.';
    } else if (errorMessage.includes('HTML instead of JSON')) {
      errorMessage = 'Connection error: The store URL may be incorrect or the site is not responding with proper WooCommerce API data.';
    } else if (errorMessage.includes('Failed to fetch')) {
      errorMessage = 'Network error: Could not connect to the server. Please check your internet connection.';
    } else if (errorMessage.includes('Server returned invalid response')) {
      errorMessage = 'Server error: The server returned an invalid response. This may be a temporary issue.';
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

export const processImageFile = (file) => {
  return new Promise((resolve, reject) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`File size (${(file.size/1024/1024).toFixed(2)}MB) exceeds recommended maximum of 5MB.`);
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve({
        src: e.target.result,
        name: file.name,
        type: file.type,
        size: file.size
      });
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
};