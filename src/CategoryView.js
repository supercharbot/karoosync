import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image, Search, X, Plus, Grid, List, MoreHorizontal, Edit, Trash2, Settings, Copy, Archive } from 'lucide-react';
import CreateProductForm from './CreateProductForm';
import { useAuth } from './AuthContext';
import { loadCategoryProducts, searchProducts, deleteCategory, updateCategory, duplicateProduct, deleteProduct, updateProduct } from './api';
import LoadingScreen from './LoadingScreen';
import MasterModal from './MasterModal';

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
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, action: '', item: null });
  const [viewMode, setViewMode] = useState('grid');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(null);
  const [productMenuOpen, setProductMenuOpen] = useState(null);
  const [operationLoading, setOperationLoading] = useState(null);

  useEffect(() => {
    if (selectedCategory) {
      loadProducts();
    }
  }, [selectedCategory]);

  useEffect(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, [selectedCategory, searchMode]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setCategoryMenuOpen(null);
      setProductMenuOpen(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

    setSearching(true);
    const authToken = await getAuthToken();

    try {
      if (selectedCategory) {
        // Search within current category products
        const filtered = products.filter(product => {
          const nameMatch = product.name?.toLowerCase().includes(term.toLowerCase());
          const skuMatch = product.sku?.toLowerCase().includes(term.toLowerCase());
          return nameMatch || skuMatch;
        });
        setSearchResults(filtered);
        
      } else if (searchMode === 'categories') {
        // Search categories locally
        const categories = userData?.metadata?.categories || [];
        const filtered = categories.filter(category => 
          category.name?.toLowerCase().includes(term.toLowerCase())
        );
        setSearchResults(filtered);
        
      } else if (searchMode === 'all-products') {
        // Use optimized search API with search index
        const result = await searchProducts(term, { limit: 100 }, authToken);
        if (result.success) {
          const productsWithCategory = result.products.map(product => ({
            ...product,
            _categoryName: getCategoryNameFromProduct(product)
          }));
          setSearchResults(productsWithCategory);
        } else {
          setSearchResults([]);
          console.error('Search failed:', result.error);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
    
    setSearching(false);
  };

  const getCategoryNameFromProduct = (product) => {
    if (!product.categories || product.categories.length === 0) return 'Uncategorized';
    const category = userData?.metadata?.categories?.find(cat => 
      cat.id === product.categories[0].id
    );
    return category ? category.name : 'Unknown Category';
  };

  const handleProductClick = (product) => {
    onProductSelect(product);
  };

  const handleCreateCategory = () => {
    setModalConfig({ isOpen: true, action: 'create-category', item: null });
  };

  const handleModalClose = () => {
    setModalConfig({ isOpen: false, action: '', item: null });
  };

  const handleModalSuccess = () => {
    if (onDataUpdate) {
      onDataUpdate();
    }
  };

  const handleCategoryMenuClick = (categoryId, e) => {
    e.stopPropagation();
    setCategoryMenuOpen(categoryMenuOpen === categoryId ? null : categoryId);
  };

  const handleEditCategory = (category, e) => {
    e.stopPropagation();
    setCategoryMenuOpen(null);
    setModalConfig({ isOpen: true, action: 'edit-category', item: category });
  };

  const handleDeleteCategory = (category, e) => {
    e.stopPropagation();
    setCategoryMenuOpen(null);
    setModalConfig({ isOpen: true, action: 'delete-category', item: category });
  };

  // Product Menu Handlers
  const handleProductMenuClick = (productId, e) => {
    e.stopPropagation();
    setProductMenuOpen(productMenuOpen === productId ? null : productId);
  };

  const handleDuplicateProduct = async (product, e) => {
    e.stopPropagation();
    setProductMenuOpen(null);
    setOperationLoading(`duplicate-${product.id}`);
    
    try {
      const authToken = await getAuthToken();
      const result = await duplicateProduct(product.id, authToken);
      
      if (result.success) {
        loadProducts(); // Reload to show the duplicated product
      } else {
        setError(result.error || 'Failed to duplicate product');
      }
    } catch (error) {
      console.error('Duplicate product error:', error);
      setError(error.message);
    }
    
    setOperationLoading(null);
  };

  const handleDeleteProduct = async (product, e) => {
    e.stopPropagation();
    setProductMenuOpen(null);
    
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    setOperationLoading(`delete-${product.id}`);
    
    try {
      const authToken = await getAuthToken();
      const result = await deleteProduct(product.id, authToken);
      
      if (result.success) {
        loadProducts(); // Reload to remove the deleted product
      } else {
        setError(result.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Delete product error:', error);
      setError(error.message);
    }
    
    setOperationLoading(null);
  };

const handleArchiveProduct = async (product, e) => {
  e.stopPropagation();
  setProductMenuOpen(null);
  setOperationLoading(`archive-${product.id}`);
  
  try {
    const authToken = await getAuthToken();
    const result = await updateProduct(product.id, { status: 'draft' }, authToken);
    
    if (result.success) {
      loadProducts(); // Reload to update product status
    } else {
      setError(result.error || 'Failed to archive product');
    }
  } catch (error) {
    console.error('Archive product error:', error);
    setError(error.message);
  }
  
  setOperationLoading(null);
};

  const getDisplayData = () => {
    if (searchTerm && searchResults.length >= 0) {
      return searchResults;
    }
    if (selectedCategory) {
      return products;
    }
    
    // Show only top-level categories (parent_id = 0)
    const categories = userData?.metadata?.categories?.filter(cat => cat.parent_id === 0) || [];
    const hasUncategorized = userData?.availableCategories?.includes('uncategorized');
    const sortedCategories = [...categories].sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    
    if (hasUncategorized) {
      return [{ name: 'Uncategorized', key: 'uncategorized', isUncategorized: true }, ...sortedCategories];
    }
    return sortedCategories;
  };

  const displayData = getDisplayData();

  // Categories view (no category selected)
  if (!selectedCategory) {
    return (
      <div className="p-4 lg:p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)] lg:min-h-[calc(100vh-73px)]">
        <MasterModal
          isOpen={modalConfig.isOpen}
          onClose={handleModalClose}
          action={modalConfig.action}
          item={modalConfig.item}
          parentCategories={userData?.metadata?.categories || []}
          onSuccess={handleModalSuccess}
        />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-200">
            Categories ({userData?.metadata?.categories?.length + (userData?.availableCategories?.includes('uncategorized') ? 1 : 0)})
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateCategory}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Category
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search categories or products..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {!searchTerm && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Search in:</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setSearchMode('categories')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    searchMode === 'categories'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Categories
                </button>
                <button
                  onClick={() => setSearchMode('all-products')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    searchMode === 'all-products'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  All Products
                </button>
              </div>
            </div>
          )}
          
          {searchTerm && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div 
                    onClick={() => onCategorySelect(category.isUncategorized ? { name: 'Uncategorized', key: 'uncategorized' } : { name: category.name, key: `category-${category.id}` })}
                    className="flex-1 cursor-pointer"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.name}</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {category.isUncategorized ? 'Products without categories' : `${category.productCount || category.count || 0} products`}
                    </span>
                  </div>

                  {!category.isUncategorized && (
                    <div className="relative">
                      <button
                        onClick={(e) => handleCategoryMenuClick(category.id, e)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        disabled={operationLoading === `delete-category-${category.id}`}
                      >
                        {operationLoading === `delete-category-${category.id}` ? (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      
                      {categoryMenuOpen === category.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                          <button
                            onClick={(e) => handleEditCategory(category, e)}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Category
                          </button>
                          <button
                            onClick={(e) => handleDeleteCategory(category, e)}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Category
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Your store doesn't have any categories yet.
            </p>
            <button
              onClick={handleCreateCategory}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Category
            </button>
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

  // Selected category view (products)
  return (
    <div className="p-4 lg:p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)] lg:min-h-[calc(100vh-73px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
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
          <button 
            onClick={() => setShowCreateProductModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Product
          </button>

          {/* View Mode Toggle */}
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {searchTerm && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            <span className="font-medium">{displayData.length}</span> products found
          </p>
        )}
      </div>

      {/* Child Categories */}
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
          : "space-y-3"
      }>
        {displayData.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onProductSelect={handleProductClick}
            onProductMenuClick={handleProductMenuClick}
            productMenuOpen={productMenuOpen}
            onDuplicateProduct={handleDuplicateProduct}
            onDeleteProduct={handleDeleteProduct}
            onArchiveProduct={handleArchiveProduct}
            operationLoading={operationLoading}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Empty State */}
      {displayData.length === 0 && (
        <div className="text-center py-12">
          <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchTerm ? 'No products found' : 'No products in this category'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm 
              ? `No products match "${searchTerm}"`
              : 'This category doesn\'t have any products yet.'
            }
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Create Product Modal */}
      <CreateProductForm
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onProductCreated={(product) => {
          setShowCreateProductModal(false);
          if (onDataUpdate) {
            onDataUpdate();
          }
          // Refresh current view
          if (selectedCategory) {
            loadProducts();
          }
        }}
        selectedCategory={selectedCategory}
      />
    </div>
  );
};

// Product Card Component

const ProductCard = ({ 
  product, 
  onProductSelect, 
  onProductMenuClick,
  productMenuOpen,
  onDuplicateProduct,
  onDeleteProduct,
  onArchiveProduct,
  operationLoading,
  viewMode 
}) => {
  
  if (viewMode === 'list') {
    // rest of code...
    return (
      <div
        onClick={() => onProductSelect(product)}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-all flex items-center space-x-4"
      >
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
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
            {product.type === 'variable' ? 'Variable Product' : `$${product.regular_price || product.price || '0.00'}`}
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
          {product.type === 'variable' ? 'Variable Product' : `$${product.regular_price || product.price || '0.00'}`}
        </p>
      </div>
    </div>
  );
};

export default CategoryView;