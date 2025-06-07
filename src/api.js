const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://tmaob4c6n9.execute-api.ap-southeast-2.amazonaws.com/v1/sync';
const OAUTH_REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || 
  (window.location.hostname === 'localhost' 
    ? 'https://your-domain.com/oauth/callback'
    : `${window.location.origin}/oauth/callback`);

const handleApiResponse = async (response) => {
  console.log(`=== API RESPONSE ===`);
  console.log('Status:', response.status);
  console.log('Status text:', response.statusText);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorDetails = null;
    
    try {
      const responseText = await response.text();
      console.log('Error response body:', responseText);
      
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || null;
          
          console.log('Parsed error data:', errorData);
        } catch (jsonError) {
          console.log('Could not parse error as JSON, using raw text');
          errorMessage = responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '');
        }
      }
    } catch (textError) {
      console.error('Failed to read error response:', textError);
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.details = errorDetails;
    throw error;
  }
  
  try {
    const responseText = await response.text();
    console.log('Success response body preview:', responseText.substring(0, 200) + '...');
    
    if (!responseText.trim()) {
      throw new Error('Empty response from server');
    }
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to parse successful response:', error);
    throw new Error(`Failed to parse response as JSON: ${error.message}`);
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
    console.log('=== CHECK USER DATA START ===');
    
    if (!authToken) {
      throw new Error('No authentication token provided');
    }
    
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'Cache-Control': 'no-cache'
    };
    
    console.log('Making request to check user data...');
    console.log('Headers:', headers);
    
    const response = await fetch(`${API_ENDPOINT}?action=check-data`, {
      method: 'GET',
      headers
    });
    
    const result = await handleApiResponse(response);
    
    console.log('✅ Check user data response:', {
      success: result.success,
      hasData: result.hasData,
      structure: result.structure,
      totalProducts: result.totalProducts || result.productCount || 0
    });
    
    return result;
  } catch (error) {
    console.error('❌ Check user data failed:', error);
    
    let errorMessage = error.message;
    
    if (error.status === 400) {
      errorMessage = 'Bad request: ' + errorMessage;
    } else if (error.status === 401 || error.status === 403) {
      errorMessage = 'Authentication failed. Please try logging out and back in.';
    } else if (error.status === 500) {
      errorMessage = 'Server error: ' + errorMessage;
    } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      status: error.status,
      details: error.details,
      retryable: !errorMessage.includes('Authentication')
    };
  }
};

export const loadCategoryProducts = async (categoryKey, authToken) => {
  try {
    console.log(`=== LOADING CATEGORY: ${categoryKey} ===`);
    
    if (!authToken) {
      throw new Error('No authentication token provided');
    }
    
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}` 
    };
    
    const response = await fetch(
      `${API_ENDPOINT}?action=load-category&category=${encodeURIComponent(categoryKey)}`, 
      {
        method: 'GET',
        headers
      }
    );
    
    const result = await handleApiResponse(response);
    
    if (result.success) {
      console.log(`✅ Loaded ${result.products?.length || 0} products from category ${categoryKey}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to load category ${categoryKey}:`, error);
    return { 
      success: false, 
      error: error.message,
      status: error.status
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
    console.log('=== SYNC STORE START ===');
    
    let url = credentials.url;
    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
      credentials = { ...credentials, url };
    }
    
    console.log('=== REQUEST DETAILS ===');
    console.log(`Connecting to: ${url}`);
    console.log('Auth method:', credentials.authMethod);
    console.log('Has consumer key:', !!credentials.consumerKey);
    console.log('Has consumer secret:', !!credentials.consumerSecret);
    console.log('Has username:', !!credentials.username);
    console.log('Has app password:', !!credentials.appPassword);
    console.log('Auth token available:', !!authToken);
    
    const headers = { 
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const requestBody = {
      url: credentials.url,
      authMethod: credentials.authMethod,
      consumerKey: credentials.consumerKey,
      consumerSecret: credentials.consumerSecret,
      username: credentials.username,
      appPassword: credentials.appPassword
    };
    
    console.log('=== SENDING REQUEST ===');
    console.log('Endpoint:', API_ENDPOINT);
    console.log('Method: POST');
    console.log('Headers:', headers);
    console.log('Body structure:', {
      url: !!requestBody.url,
      authMethod: requestBody.authMethod,
      hasConsumerKey: !!requestBody.consumerKey,
      hasConsumerSecret: !!requestBody.consumerSecret,
      hasUsername: !!requestBody.username,
      hasAppPassword: !!requestBody.appPassword
    });
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    const result = await handleApiResponse(response);
    
    if (result.success) {
      // Handle new categorized structure
      if (result.structure === 'categorized') {
        console.log(`✅ Sync complete: ${result.metadata?.totalProducts || 0} products organized into ${result.categoriesStored || 0} categories`);
        
        return {
          success: true,
          data: {
            products: [],
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
    console.error("❌ Sync store error:", error);
    
    let errorMessage = error.message;
    
    if (error.status === 400) {
      errorMessage = 'Bad request - check your store URL and credentials: ' + errorMessage;
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed - check your credentials: ' + errorMessage;
    } else if (error.status === 500) {
      errorMessage = 'Server error - try again in a moment: ' + errorMessage;
    } else if (errorMessage.includes('HTML instead of JSON')) {
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
      error: errorMessage,
      status: error.status,
      details: error.details
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

    console.log('=== UPDATE REQUEST DETAILS ===');
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

    const result = await handleApiResponse(response);
      
    if (!result.success) {
      console.log('=== LAMBDA FAILURE RESPONSE ===');
      console.log('result.success:', result.success);
      console.log('result.error:', result.error);
      console.log('result.message:', result.message);
      
      const errorMessage = result.error || result.message || 'Update failed - no error details provided';
      console.error('Lambda returned failure:', errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log('=== SUCCESS RESPONSE ===');
    console.log('result.success:', result.success);
    console.log('result.s3Updated:', result.s3Updated);
    console.log('result.categoriesUpdated:', result.categoriesUpdated);
    
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
    console.error("Error message:", error.message);
    console.error("Error status:", error.status);
    console.error("Error details:", error.details);
    
    let errorMessage = error.message;
    
    if (error.status === 400) {
      errorMessage = 'Bad request: ' + errorMessage;
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed: ' + errorMessage;
    } else if (error.status === 500) {
      errorMessage = 'Server error: ' + errorMessage;
    } else if (errorMessage.includes('No stored credentials found')) {
      errorMessage = 'Store credentials have expired. Please re-sync your store to enable updates.';
    } else if (errorMessage.includes('API key') && errorMessage.includes('write permissions')) {
      errorMessage = 'Permission error: Your WooCommerce API key does not have write permissions. Please update your API key to have Read/Write access.';
    } else if (errorMessage.includes('HTML instead of JSON')) {
      errorMessage = 'Connection error: The store URL may be incorrect or the site is not responding with proper WooCommerce API data.';
    } else if (errorMessage.includes('Failed to fetch')) {
      errorMessage = 'Network error: Could not connect to the server. Please check your internet connection.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      status: error.status,
      details: error.details
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