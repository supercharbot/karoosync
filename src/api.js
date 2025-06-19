const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://ofbdn9zezl.execute-api.ap-southeast-2.amazonaws.com/v1/sync';

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export async function checkUserData(authToken) {
  console.log('Checking user data...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=check-data`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function loadCategoryProducts(categoryKey, authToken) {
  console.log(`Loading category: ${categoryKey}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=load-category&category=${encodeURIComponent(categoryKey)}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function initializeWordPressAuth(storeUrl, authToken) {
  console.log('Initializing WordPress auth...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=init-auth&url=${encodeURIComponent(storeUrl)}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function syncWordPressStore(credentials, authToken) {
  console.log('Syncing WordPress store...');
  
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

export async function updateProduct(productId, productData, authToken) {
  console.log(`Updating product: ${productId}`);
  
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
  console.log('Creating category:', categoryData.name);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=create-category`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(categoryData)
  });

  return result;
}

export async function deleteCategory(categoryId, authToken) {
  console.log(`Deleting category: ${categoryId}`);
  
  const result = await makeRequest(`${API_ENDPOINT}?action=delete-category&categoryId=${categoryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

// ============================================
// NEW ACCOUNT MANAGEMENT FUNCTIONS
// ============================================

export async function deleteAccount(authToken) {
  console.log('Deleting account...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=delete-account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function createBackup(backupName, authToken) {
  console.log('Creating backup:', backupName);
  
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
  console.log('Getting backup status...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=backup-status`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function downloadBackup(authToken) {
  console.log('Downloading backup...');
  
  const result = await makeRequest(`${API_ENDPOINT}?action=download-backup`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  return result;
}

export async function exportData(format, dataTypes, authToken) {
  console.log('Exporting data:', format, dataTypes);
  
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