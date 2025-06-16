import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image, Search, X, Plus, Grid, List, Filter } from 'lucide-react';
import { useAuth } from './AuthContext';
import { loadCategoryProducts } from './api';
import LoadingScreen from './LoadingScreen';
import CreateCategoryModal from './CreateCategoryModal';

const CategoryView = ({ userData, selectedCategory, onCategorySelect, onProductSelect, onBack, onDataUpdate, parentCategoryName }) => {
  const { getAuthToken } = useAuth();
  const [products, setProducts] = useState([]);
  const [childCategories, setChildCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('categories');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
        setChildCategories(result.childCategories || []);
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
      const filtered = products.filter(product => {
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const skuMatch = product.sku?.toLowerCase().includes(searchLower);
        return nameMatch || skuMatch;
      });
      setSearchResults(filtered);
      
    } else if (searchMode === 'categories') {
      const categories = userData?.metadata?.categories || [];
      const filtered = categories.filter(category => 
        category.name?.toLowerCase().includes(searchLower)
      );
      setSearchResults(filtered);
      
    } else if (searchMode === 'all-products') {
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
      onProductSelect(product);
    } else {
      onProductSelect(product);
    }
  };

  const handleCategoryCreated = (newCategory) => {
    // Refresh data to show new category
    if (onDataUpdate) {
      onDataUpdate();
    }
  };

  const getDisplayData = () => {
    if (searchTerm && searchResults.length >= 0) {
      return searchResults;
    }
    if (selectedCategory) {
      return products;
    }
    
    // Show only top-level categories (parent = 0)
    const categories = userData?.metadata?.categories?.filter(cat => cat.parent === 0) || [];
    const hasUncategorized = userData?.availableCategories?.includes('uncategorized');
    const sortedCategories = [...categories].sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    
    if (hasUncategorized) {
      return [{ name: 'Uncategorized', key: 'uncategorized', isUncategorized: true }, ...sortedCategories];
    }
    return sortedCategories;
  };

  const displayData = getDisplayData();

  // Top-level categories view
  if (!selectedCategory) {
    return (
      <div className="p-4 lg:p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)] lg:min-h-[calc(100vh-73px)]">
        <CreateCategoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCategoryCreated={handleCategoryCreated}
          parentCategories={userData?.metadata?.categories || []}
        />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-200">
            Categories ({userData?.metadata?.categories?.length + (userData?.availableCategories?.includes('uncategorized') ? 1 : 0) || 0})
          </h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium text-sm lg:text-base"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
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
            
            {/* Desktop Search Mode Toggle */}
            <div className="hidden sm:flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
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

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Search Mode Toggle */}
          {showMobileFilters && (
            <div className="sm:hidden mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Search Mode</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSearchMode('categories');
                    setSearchTerm('');
                    setSearchResults([]);
                    setShowMobileFilters(false);
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    searchMode === 'categories'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Categories
                </button>
                <button
                  onClick={() => {
                    setSearchMode('all-products');
                    setSearchTerm('');
                    setSearchResults([]);
                    setShowMobileFilters(false);
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    searchMode === 'all-products'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  All Products
                </button>
              </div>
            </div>
          )}
          
          {searchTerm && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{displayData.length}</span> {searchMode === 'categories' ? 'categories' : 'products'} found
              {searching && <span className="ml-2 text-blue-600 dark:text-blue-400">Loading...</span>}
            </p>
          )}
        </div>
        
        {/* Categories List or Search Results */}
        {searchMode === 'categories' || !searchTerm ? (
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
                      {category.isUncategorized ? 'Products without categories' : `${category.productCount || category.count || 0} products`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {displayData.map((product, index) => (
              <ProductCard
                key={`search-${product.id}-${index}`}
                product={product}
                onProductSelect={handleProductClick}
                viewMode="grid"
              />
            ))}
          </div>
        )}

        {/* Empty States */}
        {displayData.length === 0 && !searchTerm && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No categories found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Your store doesn't have any categories yet.
            </p>
          </div>
        )}

        {displayData.length === 0 && searchTerm && (
          <div className="text-center py-12">
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

  // Loading state
  if (loading) {
    return <LoadingScreen message={`Loading ${selectedCategory.name} products...`} />;
  }

  // Selected category view
  return (
    <div className="p-4 lg:p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)] lg:min-h-[calc(100vh-73px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          
          <div>
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {selectedCategory.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {(searchTerm ? searchResults : displayData).length} items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium text-sm lg:text-base">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create Product</span>
            <span className="sm:hidden">Product</span>
          </button>

          {/* View Mode Toggle - Desktop only */}
          <div className="hidden lg:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            <span className="font-medium">{displayData.length}</span> products found
          </p>
        )}
      </div>

      {/* Child Categories (Folders) */}
      {!searchTerm && childCategories.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Categories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {childCategories.map((childCategory) => (
              <div
                key={childCategory.id}
                onClick={() => onCategorySelect({ name: childCategory.name, key: `category-${childCategory.id}` })}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-colors">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{childCategory.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{childCategory.productCount || 0} products</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Section */}
      {!searchTerm && products.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Products</h3>
        </div>
      )}

      {/* Products Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
          : "space-y-4"
      }>
        {displayData.map((product, index) => (
          <ProductCard
            key={`${product.id}-${index}`}
            product={product}
            onProductSelect={onProductSelect}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Empty States */}
      {displayData.length === 0 && !searchTerm && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No products found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This category doesn't contain any products yet.
          </p>
        </div>
      )}

      {displayData.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No products found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No products match "{searchTerm}"
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
            Error Loading Products
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={loadProducts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

// Product Card Component - supports both grid and list views
const ProductCard = ({ product, onProductSelect, viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onProductSelect(product)}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-all hover:translate-y-[-1px] flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
          {product.images?.[0] ? (
            <img
              src={product.images[0].src}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500" style={{ display: product.images?.[0] ? 'none' : 'flex' }}>
            <Image className="w-6 h-6" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
            {product.name}
          </h3>
          {product._categoryName && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              {product._categoryName}
            </p>
          )}
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            ${product.regular_price || product.price || '0.00'}
          </p>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      onClick={() => onProductSelect(product)}
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:translate-y-[-2px]"
    >
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
        {product.images?.[0] ? (
          <img
            src={product.images[0].src}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500" style={{ display: product.images?.[0] ? 'none' : 'flex' }}>
          <Image className="w-12 h-12" />
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2 mb-1">
          {product.name}
        </h3>
        {product._categoryName && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
            {product._categoryName}
          </p>
        )}
        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
          ${product.regular_price || product.price || '0.00'}
        </p>
      </div>
    </div>
  );
};

export default CategoryView;