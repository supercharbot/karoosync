import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image, Search, X, Plus } from 'lucide-react';
import { useAuth } from './AuthContext';
import { loadCategoryProducts } from './api';
import LoadingScreen from './LoadingScreen';

const CategoryView = ({ userData, selectedCategory, onCategorySelect, onProductSelect, onBack }) => {
  const { getAuthToken } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('categories'); // 'categories' or 'all-products'
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (selectedCategory) {
      loadProducts();
    }
  }, [selectedCategory]);

  useEffect(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, [selectedCategory, searchMode]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const authToken = await getAuthToken();
      const result = await loadCategoryProducts(selectedCategory.key, authToken);
      
      if (result.success) {
        setProducts(result.products || []);
      } else {
        setError(result.error || 'Failed to load products');
      }
    } catch (err) {
      setError(err.message);
    }
    
    setLoading(false);
  };

  const loadAllProducts = async () => {
    setSearching(true);
    const authToken = await getAuthToken();
    const allProducts = [];
    const availableCategories = userData?.availableCategories || [];
    
    try {
      for (const categoryKey of availableCategories) {
        try {
          const result = await loadCategoryProducts(categoryKey, authToken);
          if (result.success && result.products) {
            const productsWithCategory = result.products.map(product => ({
              ...product,
              _categoryKey: categoryKey,
              _categoryName: getCategoryName(categoryKey)
            }));
            allProducts.push(...productsWithCategory);
          }
        } catch (categoryError) {
          console.error(`Failed to load category ${categoryKey}:`, categoryError);
        }
      }
      
      setSearching(false);
      return allProducts;
      
    } catch (error) {
      console.error('Failed to load all products:', error);
      setSearching(false);
      return [];
    }
  };

  const getCategoryName = (categoryKey) => {
    if (categoryKey === 'uncategorized') return 'Uncategorized';
    if (categoryKey.startsWith('category-')) {
      const categoryId = categoryKey.replace('category-', '');
      const category = userData?.metadata?.categories?.find(cat => cat.id.toString() === categoryId);
      return category ? category.name : `Category ${categoryId}`;
    }
    return categoryKey;
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (!term) {
      setSearchResults([]);
      return;
    }

    const searchLower = term.toLowerCase();

    if (selectedCategory) {
      // Search within current category only
      const filtered = products.filter(product => {
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const skuMatch = product.sku?.toLowerCase().includes(searchLower);
        return nameMatch || skuMatch;
      });
      setSearchResults(filtered);
      
    } else if (searchMode === 'categories') {
      // Search categories
      const categories = userData?.metadata?.categories || [];
      const filtered = categories.filter(category => 
        category.name?.toLowerCase().includes(searchLower)
      );
      setSearchResults(filtered);
      
    } else if (searchMode === 'all-products') {
      // Search all products
      const allProducts = await loadAllProducts();
      const filtered = allProducts.filter(product => {
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const skuMatch = product.sku?.toLowerCase().includes(searchLower);
        return nameMatch || skuMatch;
      });
      setSearchResults(filtered);
    }
  };

  const handleProductClick = (product) => {
    if (product._categoryKey && !selectedCategory) {
      // If searching all products from categories view, jump directly to product
      onProductSelect(product);
    } else {
      // Normal product selection
      onProductSelect(product);
    }
  };

  const getDisplayData = () => {
    if (searchTerm && searchResults.length >= 0) {
      return searchResults;
    }
    if (selectedCategory) {
      return products;
    }
    
    const categories = userData?.metadata?.categories || [];
    const hasUncategorized = userData?.availableCategories?.includes('uncategorized');
    const sortedCategories = [...categories].sort((a, b) => (b.count || 0) - (a.count || 0));
    
    if (hasUncategorized) {
      return [{ name: 'Uncategorized', key: 'uncategorized', isUncategorized: true }, ...sortedCategories];
    }
    return sortedCategories;
  };

  const displayData = getDisplayData();

  // Categories view
  if (!selectedCategory) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Categories ({userData?.metadata?.categories?.length + (userData?.availableCategories?.includes('uncategorized') ? 1 : 0) || 0})
          </h2>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </button>
        </div>

        {/* Search with Mode Toggle */}
        <div className="mb-6">
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchMode === 'categories' ? 'Search categories...' : 'Search all products...'}
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults([]);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              )}
            </div>
            
            {/* Search Mode Toggle */}
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
              <button
                onClick={() => {
                  setSearchMode('categories');
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className={`px-4 py-3 text-sm font-medium rounded-l-lg transition-colors ${
                  searchMode === 'categories'
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => {
                  setSearchMode('all-products');
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className={`px-4 py-3 text-sm font-medium rounded-r-lg border-l border-gray-300 dark:border-gray-600 transition-colors ${
                  searchMode === 'all-products'
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                All Products
              </button>
            </div>
          </div>
          
          {/* Search Info */}
          {searchTerm && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{displayData.length}</span> {searchMode === 'categories' ? 'categories' : 'products'} found
              {searching && <span className="ml-2 text-blue-600 dark:text-blue-400">Loading...</span>}
            </p>
          )}
        </div>
        
        {/* Results Grid */}
        {searchMode === 'categories' || !searchTerm ? (
          // Categories List
          <div className="space-y-3">
            {displayData.map((category) => (
              <div
                key={category.id || category.key}
                onClick={() => onCategorySelect(category.isUncategorized ? { name: 'Uncategorized', key: 'uncategorized' } : { name: category.name, key: `category-${category.id}` })}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.name}</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {category.isUncategorized ? 'Products without categories' : `${category.count || 0} products`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Products Grid (for all-products search)
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {displayData.map((product, index) => (
              <div
                key={`search-${product.id}-${index}`}
                onClick={() => handleProductClick(product)}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:translate-y-[-2px]"
              >
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].src}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{product.name}</h3>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ${product.price || product.regular_price || '0.00'}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stock_status === 'instock'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                    }`}>
                      {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  {/* Show category for cross-category search */}
                  {product._categoryName && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      {product._categoryName}
                    </p>
                  )}
                  {/* Show SKU if it matches search */}
                  {searchTerm && product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      SKU: {product.sku}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {searchTerm && displayData.length === 0 && !searching && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No {searchMode === 'categories' ? 'categories' : 'products'} found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No {searchMode === 'categories' ? 'categories' : 'products'} match "{searchTerm}"
            </p>
          </div>
        )}
      </div>
    );
  }

  // Products view (inside a category)
  if (loading) {
    return <LoadingScreen message={`Loading ${selectedCategory.name} products...`} />;
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-medium mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Categories
          </button>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {selectedCategory.name} ({(searchTerm ? displayData : products).length})
          </h2>
        </div>
        
        <button className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Create Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Search in ${selectedCategory.name}...`}
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>
        
        {searchTerm && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{displayData.length}</span> of{' '}
            <span className="font-medium">{products.length}</span> products found
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* No Results */}
      {searchTerm && displayData.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No products found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No products match "{searchTerm}" in {selectedCategory.name}
          </p>
        </div>
      )}
      
      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {displayData.map((product, index) => (
          <div
            key={`${selectedCategory.key}-${product.id}-${index}`}
            onClick={() => onProductSelect(product)}
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:translate-y-[-2px]"
          >
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
              {product.images?.[0] ? (
                <img
                  src={product.images[0].src}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{product.name}</h3>
              <div className="flex items-baseline justify-between mt-2">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  ${product.price || product.regular_price || '0.00'}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  product.stock_status === 'instock'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                }`}>
                  {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              {/* Show SKU if it matches search */}
              {searchTerm && product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  SKU: {product.sku}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryView;