// api.js with WordPress Application Password authorization flow
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://tmaob4c6n9.execute-api.ap-southeast-2.amazonaws.com/v1/sync';
const OAUTH_REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || 
  (window.location.hostname === 'localhost' 
    ? 'https://your-domain.com/oauth/callback' // Replace with your actual HTTPS domain
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

export const syncStore = async (credentials) => {
  try {
    let url = credentials.url;
    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
      credentials = { ...credentials, url };
    }
    
    console.log(`Connecting to: ${url}`);
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const result = await handleApiResponse(response);
    
    if (result.success && (!result.data.products || result.data.products.length === 0)) {
      return { 
        success: false, 
        error: 'No products found in the store or API key has insufficient permissions.'
      };
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

export const updateProduct = async (credentials, productId, productData) => {
  try {
    let url = credentials.url;
    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
      credentials = { ...credentials, url };
    }
    
    const processedProductData = {
      ...productData,
      images: productData.images.map(image => {
        if (image.src && image.src.startsWith('data:image')) {
          return { 
            ...image,
            base64_upload: true
          };
        }
        return image;
      })
    };

    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...credentials,
        action: 'updateProduct',
        productId,
        productData: processedProductData
      })
    });
      
    const result = await handleApiResponse(response);
      
    if (!result.success) {
      throw new Error(result.error || 'Update failed');
    }
      
    return result;
  } catch (error) {
    console.error("Update product error:", error);
    
    let errorMessage = error.message;
    
    if (errorMessage.includes('API key') && errorMessage.includes('write permissions')) {
      errorMessage = 'Permission error: Your WooCommerce API key does not have write permissions. Please update your API key to have Read/Write access.';
    } else if (errorMessage.includes('HTML instead of JSON')) {
      errorMessage = 'Connection error: The store URL may be incorrect or the site is not responding with proper WooCommerce API data.';
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