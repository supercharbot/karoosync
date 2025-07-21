const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://ofbdn9zezl.execute-api.ap-southeast-2.amazonaws.com/v1/sync';

// Core API request function with better error handling
async function makeRequest(url, options = {}) {
  try {
    console.log('🌐 API Request:', url, options.method || 'GET');
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    console.log('🌐 API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🌐 API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const result = await response.json();
    console.log('🌐 API Result:', result);
    return result;
    
  } catch (error) {
    console.error('🌐 API Error:', error);
    throw error;
  }
}

// ============================================
// DATA CHECKING FUNCTIONS
// ============================================

export async function checkUserData(authToken) {
  console.log('🔍 Checking user data...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=check-data&include_credentials=true`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function loadCategoryProducts(categoryKey, authToken) {
  console.log(`🔍 Loading category: ${categoryKey}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=load-category&category=${encodeURIComponent(categoryKey)}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function loadVariations(productId, authToken) {
  console.log(`🔍 Loading variations for product: ${productId}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=load-variations&productId=${productId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

// ============================================
// WORDPRESS AUTH & SYNC FUNCTIONS
// ============================================

export async function initializeWordPressAuth(storeUrl, authToken) {
  console.log('🔐 Initializing WordPress auth for:', storeUrl);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=init-auth&url=${encodeURIComponent(storeUrl)}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

// Legacy sync function (kept for compatibility)
export async function syncWordPressStore(credentials, authToken) {
  console.log('🔄 Starting legacy WordPress store sync...');
  
  const result = await makeRequest(API_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      url: credentials.url,
      username: credentials.username,
      appPassword: credentials.appPassword
    })
  });

  return result;
}

// New async sync function
export async function startAsyncSync(credentials, authToken) {
  console.log('🚀 Starting async WordPress sync...');
  console.log('🚀 Store URL:', credentials.url);
  console.log('🚀 Username:', credentials.username);
  
  const result = await makeRequest(API_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      url: credentials.url,
      username: credentials.username,
      appPassword: credentials.appPassword
    })
  });

  console.log('🚀 Async sync response:', result);
  return result;
}

// New async resync function
export async function startAsyncResync(authToken) {
  console.log('🔄 Starting async WordPress resync...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=resync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` }
  });

  console.log('🔄 Async resync response:', result);
  return result;
}

// Get sync status function (critical for progress updates)
export async function getSyncStatus(authToken) {
  console.log('📊 Getting sync status...');
  
  try {
    const result = await makeRequest(`${API_ENDPOINT}?action=sync-status`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('📊 Sync status response:', result);
    
    // Handle different response formats
    if (result && typeof result === 'object') {
      // If the response is the status object directly
      if (result.status || result.syncId || result.progress !== undefined) {
        return result;
      }
      
      // If the response is wrapped (some APIs return {success: true, data: {...}})
      if (result.success && result.data) {
        return result.data;
      }
      
      // If it's a "not found" response but still valid
      if (result.status === 'not_found' || result.message === 'No sync in progress') {
        return { status: 'not_found', message: 'No sync in progress' };
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('📊 Error getting sync status:', error);
    
    // If it's a 404, that means no sync in progress
    if (error.message.includes('404')) {
      return { status: 'not_found', message: 'No sync in progress' };
    }
    
    throw error;
  }
}

// ============================================
// PRODUCT MANAGEMENT FUNCTIONS
// ============================================

export async function updateProduct(productId, productData, authToken) {
  console.log(`📝 Updating product: ${productId}`);
  
  const result = await makeRequest(API_ENDPOINT, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      productId,
      productData
    })
  });

  return result;
}

export async function createCategory(categoryData, authToken) {
  console.log('📁 Creating category:', categoryData.name);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=create-category`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(categoryData)
  });

  return result;
}

export async function updateCategory(categoryId, categoryData, authToken) {
  console.log(`📝 Updating category: ${categoryId}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=update-category&categoryId=${categoryId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(categoryData)
  });

  return result;
}

export async function deleteCategory(categoryId, authToken) {
  console.log(`🗑️ Deleting category: ${categoryId}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=delete-category&categoryId=${categoryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

// ============================================
// ACCOUNT MANAGEMENT FUNCTIONS
// ============================================

export async function deleteAccount(authToken) {
  console.log('🗑️ Deleting account...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=delete-account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function createBackup(backupName, authToken) {
  console.log('💾 Creating backup:', backupName);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=create-backup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      backupName: backupName || 'Product Backup'
    })
  });

  return result;
}

export async function getBackupStatus(authToken) {
  console.log('📋 Getting backup status...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=backup-status`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function downloadBackup(authToken) {
  console.log('⬇️ Downloading backup...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=download-backup`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function exportData(format, dataTypes, authToken) {
  console.log('📤 Exporting data:', format, dataTypes);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=export-data`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      format: format,
      dataTypes: dataTypes
    })
  });

  return result;
}

// ============================================
// STORE SETTINGS FUNCTIONS
// ============================================

export async function loadStoreData(type, authToken) {
  return await makeRequest(`${API_ENDPOINT}?action=load-${type}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
}

export async function createStoreItem(type, itemData, authToken) {
  return await makeRequest(`${API_ENDPOINT}?action=create-${type}`, {
    method: 'POST',
    body: JSON.stringify(itemData),
    headers: { Authorization: `Bearer ${authToken}` }
  });
}

export async function updateStoreItem(type, itemId, itemData, authToken) {
  return await makeRequest(`${API_ENDPOINT}?action=update-${type}&id=${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(itemData),
    headers: { Authorization: `Bearer ${authToken}` }
  });
}

export async function deleteStoreItem(type, itemId, authToken) {
  return await makeRequest(`${API_ENDPOINT}?action=delete-${type}&id=${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` }
  });
}

// ============================================
// SUBSCRIPTION MANAGEMENT FUNCTIONS (if you use Stripe)
// ============================================

export async function getSubscriptionStatus(authToken) {
  console.log('💳 Getting subscription status...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=get-subscription-status`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function createSubscription(priceId, authToken) {
  console.log('💳 Creating subscription...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=create-subscription`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ priceId })
  });

  return result;
}

export async function cancelSubscription(authToken) {
  console.log('💳 Canceling subscription...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=cancel-subscription`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

export async function searchProducts(searchTerm, options = {}, authToken) {
  console.log(`🔍 Searching products: "${searchTerm}"`);
  
  const { limit = 50, offset = 0, category, status, type } = options;
  
  const params = new URLSearchParams({
    action: 'search',
    q: searchTerm,
    limit: limit.toString(),
    offset: offset.toString()
  });
  
  if (category) params.append('category', category);
  if (status) params.append('status', status);
  if (type) params.append('type', type);
  
  const result = await makeRequest(`${API_ENDPOINT}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Test API connection
export async function testConnection(authToken) {
  console.log('🔍 Testing API connection...');
  
  try {
    const result = await makeRequest(API_ENDPOINT, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get API health status
export async function getHealthStatus() {
  console.log('❤️ Getting API health status...');
  
  try {
    const result = await makeRequest(API_ENDPOINT);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function duplicateProduct(productId, authToken) {
  console.log(`📋 Duplicating product: ${productId}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=duplicate-product`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ productId })
  });

  return result;
}

export async function deleteProduct(productId, authToken) {
  console.log(`🗑️ Deleting product: ${productId}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=delete-product&productId=${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

// ============================================
// WOOCOMMERCE DATA FUNCTIONS
// ============================================

export async function loadWooCommerceTags(authToken) {
  console.log('🏷️ Loading WooCommerce tags...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=load-woocommerce-tags`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function loadWooCommerceAttributes(authToken) {
  console.log('🔧 Loading WooCommerce attributes...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=load-woocommerce-attributes`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function loadWooCommerceShippingClasses(authToken) {
  console.log('🚚 Loading WooCommerce shipping classes...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=load-woocommerce-shipping-classes`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function createProduct(productData, authToken) {
  console.log('➕ Creating product:', productData.name);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=create-product`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(productData)
  });

  return result;
}