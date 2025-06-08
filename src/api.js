const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://tmaob4c6n9.execute-api.ap-southeast-2.amazonaws.com/v1/sync';

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