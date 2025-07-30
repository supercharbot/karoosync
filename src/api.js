const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://ofbdn9zezl.execute-api.ap-southeast-2.amazonaws.com/v1/sync';

// Core API request function with better error handling
async function makeRequest(url, options = {}) {
  try {
    console.log(`🌐 API Request: ${url} ${options.method || 'GET'}`);
    
    // Use custom timeout if provided, otherwise default to 45 seconds
    const timeoutMs = options.timeout || 45000;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    console.log(`🌐 API Response: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`🌐 API Error Response: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
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

export async function duplicateProduct(productId, authToken) {
  console.log(`📋 Duplicating product: ${productId}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=duplicate-product&productId=${productId}`, {
    method: 'POST',
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
  
  const maxRetries = 2;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const result = await makeRequest(`${API_ENDPOINT}?action=load-woocommerce-attributes`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      return result;
    } catch (error) {
      attempt++;
      
      if (error.message.includes('504') && attempt <= maxRetries) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for attribute loading...`);
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      throw error;
    }
  }
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
  
  // Retry logic for timeouts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await makeRequest(`${API_ENDPOINT}?action=create-product`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(productData),
        timeout: 120000 // 2 minutes for product creation
      });
      return result;
    } catch (error) {
      if (error.name === 'TimeoutError' && attempt < 3) {
        console.log(`⏰ Timeout on attempt ${attempt}, retrying...`);
        continue;
      }
      throw error;
    }
  }
}

export async function createProductVariations(productId, variations, authToken, progressCallback) {
  console.log(`🔄 Creating ${variations.length} variations for product ${productId}`);
  
  // Streamline variation data to include all fields displayed in VariableProductView
  // Note: SKU is intentionally omitted - it will be auto-generated in the backend
  const streamlinedVariations = variations.map(variation => ({
    attributes: variation.attributes,
    // Pricing fields
    regular_price: variation.regular_price || '',
    sale_price: variation.sale_price || '',
    // SKU removed - will be auto-generated in backend based on product name + attributes
    
    // Stock management fields
    stock_status: variation.stock_status || 'instock',
    manage_stock: variation.manage_stock || false,
    stock_quantity: variation.stock_quantity || '',
    backorders: variation.backorders || 'no',
    low_stock_amount: variation.low_stock_amount || '',
    
    // Physical properties (only if not virtual)
    weight: variation.weight || '',
    dimensions: variation.dimensions || { length: '', width: '', height: '' },
    shipping_class: variation.shipping_class || '',
    
    // Status and type fields
    status: variation.status || 'publish',
    virtual: variation.virtual || false,
    downloadable: variation.downloadable || false,
    
    // Content fields
    description: variation.description || '',
    
    // Media field
    image: variation.image || null,
    
    // Downloadable files (only include if downloadable)
    ...(variation.downloadable && { downloads: variation.downloads || [] })
  }));
  
  // Process variations in smaller chunks to avoid payload size issues
  const CHUNK_SIZE = 2; // Further reduced due to complete field set
  const chunks = [];
  
  for (let i = 0; i < streamlinedVariations.length; i += CHUNK_SIZE) {
    chunks.push(streamlinedVariations.slice(i, i + CHUNK_SIZE));
  }
  
  let createdVariations = [];
  let totalProcessed = 0;
  
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    
    try {
      console.log(`📦 Sending chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} variations`);
      console.log(`📊 Chunk payload size: ~${JSON.stringify(chunk).length} characters`);
      
      const result = await makeRequest(`${API_ENDPOINT}?action=create-product-variations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          productId: productId,
          variations: chunk
        }),
        timeout: 60000 // 1 minute per chunk
      });
      
      if (result.success) {
        createdVariations.push(...(result.variations || []));
        totalProcessed += chunk.length;
        
        // Update progress
        const progress = Math.round((totalProcessed / streamlinedVariations.length) * 100);
        if (progressCallback) {
          progressCallback(progress);
        }
        
        console.log(`✅ Created chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} variations)`);
      } else {
        console.error(`❌ Failed to create variation chunk ${chunkIndex + 1}:`, result.error);
        throw new Error(result.error || `Failed to create variation chunk ${chunkIndex + 1}`);
      }
      
      // Small delay between chunks to avoid overwhelming the server
      if (chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Error creating variation chunk ${chunkIndex + 1}:`, error);
      throw error;
    }
  }
  
  return {
    success: true,
    variations: createdVariations,
    message: `Successfully created ${createdVariations.length} out of ${streamlinedVariations.length} variations`
  };
}

export async function getJobStatus(jobId, authToken) {
  const result = await makeRequest(`${API_ENDPOINT}?action=job-status&jobId=${jobId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  return result;
}

export async function pollJobUntilComplete(jobId, authToken, onProgress = null) {
  const maxWait = 300000; // 5 minutes max
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const statusResult = await getJobStatus(jobId, authToken);
      
      if (!statusResult.success) {
        throw new Error(statusResult.error || 'Failed to get job status');
      }
      
      const job = statusResult.job;
      
      if (onProgress) {
        onProgress(job);
      }
      
      if (job.status === 'completed') {
        return { success: true, result: job.result };
      }
      
      if (job.status === 'failed') {
        // Check if the error is about SKU duplication but product was actually created
        if (job.error && job.error.includes('Invalid or duplicated SKU') && job.result && job.result.product) {
          console.warn('⚠️ SKU duplication error but product was created successfully:', job.result.product.id);
          return { success: true, result: job.result };
        }
        throw new Error(job.error || 'Job failed');
      }
      
      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('Polling error:', error);
      throw error;
    }
  }
  
  throw new Error('Job timeout - product creation took too long');
}

export async function uploadProductImages(productId, images, authToken, onProgress = null) {
  let successfulUploads = 0;
  const failedUploads = [];
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    if (onProgress) {
      onProgress(Math.round(((i + 1) / images.length) * 100));
    }
    
    // Retry logic for individual image uploads
    let attempt = 0;
    const maxRetries = 2;
    let uploaded = false;
    
    while (attempt <= maxRetries && !uploaded) {
      try {
        await makeRequest(`${API_ENDPOINT}?action=upload-product-image&productId=${productId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ image, index: i }),
          timeout: 60000 // 60 seconds for image uploads
        });
        uploaded = true;
        successfulUploads++;
        console.log(`✅ Image ${i + 1}/${images.length} uploaded successfully`);
      } catch (error) {
        attempt++;
        console.warn(`⚠️ Image upload attempt ${attempt}/${maxRetries + 1} failed:`, error.message);
        
        if (attempt <= maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        } else {
          failedUploads.push({ index: i, error: error.message });
          console.error(`❌ Failed to upload image ${i + 1} after ${maxRetries + 1} attempts`);
        }
      }
    }
  }
  
  // Always try to refresh the product, even if some images failed
  try {
    await makeRequest(`${API_ENDPOINT}?action=refresh-product&productId=${productId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 30000 // 30 seconds for refresh
    });
    console.log(`🔄 Product ${productId} refreshed successfully`);
  } catch (refreshError) {
    console.warn(`⚠️ Failed to refresh product after image uploads:`, refreshError.message);
    // Don't throw here - the product was created successfully
  }
  
  // If some images failed but at least one succeeded, show a warning instead of throwing
  if (failedUploads.length > 0 && successfulUploads > 0) {
    console.warn(`⚠️ ${failedUploads.length} of ${images.length} images failed to upload`);
    // Return partial success info instead of throwing
    return {
      partialSuccess: true,
      successfulUploads,
      failedUploads: failedUploads.length,
      message: `${successfulUploads} of ${images.length} images uploaded successfully`
    };
  }
  
  // If all images failed, throw error
  if (failedUploads.length === images.length && images.length > 0) {
    throw new Error(`Failed to upload all ${images.length} images. Last error: ${failedUploads[failedUploads.length - 1]?.error}`);
  }
}