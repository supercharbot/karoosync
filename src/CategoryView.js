import React, { useState, useEffect } from 'react';
import { Folder, Package, ArrowLeft, Image, Loader2, Search, X, Plus, MoreVertical, Edit3, Trash2, Move, Eye } from 'lucide-react';
import { useAuth } from './AuthContext';
import { loadCategoryProducts } from './api';
import LoadingScreen from './LoadingScreen';

const CategoryView = ({ userData, selectedCategory, onCategorySelect, onProductSelect, onBack }) => {
  const { getAuthToken } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('category'); // 'category', 'all'
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Modal states
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveProduct, setShowMoveProduct] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    if (selectedCategory) {
      loadProducts();
      setSearchMode('category');
    } else {
      setSearchMode('categories');
    }
  }, [selectedCategory]);

  useEffect(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, [selectedCategory]);

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

  // Search functionality
  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (!term) {
      setSearchResults([]);
      return;
    }

    if (searchMode === 'category') {
      // Filter current category products
      const filtered = products.filter(product => {
        const searchLower = term.toLowerCase();
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const skuMatch = product.sku?.toLowerCase().includes(searchLower);
        return nameMatch || skuMatch;
      });
      setSearchResults(filtered);
    } else if (searchMode === 'categories') {
      // Filter categories
      const categories = userData?.metadata?.categories || [];
      const filtered = categories.filter(category => 
        category.name?.toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(filtered);
    } else if (searchMode === 'all') {
      // TODO: Backend search across all products
      setSearching(true);
      try {
        // Placeholder for backend call
        await new Promise(resolve => setTimeout(resolve, 500));
        setSearchResults([]);
      } catch (err) {
        console.error('Search error:', err);
      }
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  // Action handlers
  const handleDeleteItem = (item, type) => {
    setDeleteTarget({ item, type });
    setShowDeleteConfirm(true);
    setOpenDropdown(null);
  };

  const handleMoveProduct = (product) => {
    setMoveTarget(product);
    setShowMoveProduct(true);
    setOpenDropdown(null);
  };

  const confirmDelete = async () => {
    // TODO: Implement delete API calls
    console.log('Delete:', deleteTarget);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmMove = async (newCategoryId) => {
    // TODO: Implement move API call
    console.log('Move product', moveTarget.id, 'to category', newCategoryId);
    setShowMoveProduct(false);
    setMoveTarget(null);
  };

  // Get display data based on search
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
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Categories ({userData?.metadata?.categories?.length + (userData?.availableCategories?.includes('uncategorized') ? 1 : 0) || 0})
          </h2>
          <button
            onClick={() => setShowCreateCategory(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Category
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
              placeholder="Search categories..."
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
          </div>
          
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{displayData.length}</span> categories found
            </p>
          )}
        </div>
        
        {/* Categories List */}
        <div className="space-y-3">
          {displayData.map((category) => (
            <div
              key={category.id || category.key}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              <div className="flex justify-between items-center">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onCategorySelect(category.isUncategorized ? { name: 'Uncategorized', key: 'uncategorized' } : { name: category.name, key: `category-${category.id}` })}
                >
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.name}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {category.isUncategorized ? 'Products without categories' : `${category.count || 0} products`}
                  </span>
                </div>
                
                {!category.isUncategorized && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === `cat-${category.id}` ? null : `cat-${category.id}`);
                      }}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {openDropdown === `cat-${category.id}` && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        <button
                          onClick={() => {
                            setOpenDropdown(null);
                            // TODO: Edit category
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Category
                        </button>
                        <button
                          onClick={() => handleDeleteItem(category, 'category')}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
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

        {/* Create Category Modal */}
        {showCreateCategory && (
          <CreateCategoryModal 
            onClose={() => setShowCreateCategory(false)}
            onConfirm={(categoryData) => {
              // TODO: Create category API call
              console.log('Create category:', categoryData);
              setShowCreateCategory(false);
            }}
          />
        )}
      </div>
    );
  }

  // Products view
  if (loading) {
    return <LoadingScreen message={`Loading ${selectedCategory.name} products...`} />;
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
      {/* Header with Back Button and Create Product */}
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
            {selectedCategory.name}
          </h2>
        </div>
        
        <button
          onClick={() => setShowCreateProduct(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Product
        </button>
      </div>

      {/* Search Bar with Mode Selector */}
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
              placeholder={searchMode === 'category' ? `Search in ${selectedCategory.name}...` : 'Search all products...'}
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
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
                setSearchMode('category');
                setSearchTerm('');
                setSearchResults([]);
              }}
              className={`px-4 py-3 text-sm font-medium rounded-l-lg transition-colors ${
                searchMode === 'category'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              This Category
            </button>
            <button
              onClick={() => {
                setSearchMode('all');
                setSearchTerm('');
                setSearchResults([]);
              }}
              className={`px-4 py-3 text-sm font-medium rounded-r-lg border-l border-gray-300 dark:border-gray-600 transition-colors ${
                searchMode === 'all'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              All Products
            </button>
          </div>
        </div>
        
        {/* Search Results Info */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {searchTerm ? (
              <>
                <span className="font-medium">{displayData.length}</span> products found
                {searchTerm && (
                  <>
                    {' '}for "<span className="font-medium">{searchTerm}</span>"
                  </>
                )}
                {searchMode === 'all' && ' across all categories'}
              </>
            ) : (
              <>
                <span className="font-medium">{products.length}</span> products
              </>
            )}
            {searching && <span className="ml-2">Searching...</span>}
          </p>
          
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* No Results Message */}
      {searchTerm && displayData.length === 0 && !searching && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No products found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No products match "{searchTerm}" {searchMode === 'category' ? `in ${selectedCategory.name}` : 'across all categories'}
          </p>
          <button
            onClick={clearSearch}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Clear search to see all products
          </button>
        </div>
      )}
      
      {/* Products Grid */}
      {(!searchTerm || displayData.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {displayData.map((product, index) => (
            <div
              key={`${selectedCategory.key}-${product.id}-${index}`}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all"
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
                
                {/* Action Overlay */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === `prod-${product.id}` ? null : `prod-${product.id}`);
                    }}
                    className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  </button>
                  
                  {openDropdown === `prod-${product.id}` && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <button
                        onClick={() => {
                          onProductSelect(product);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View/Edit
                      </button>
                      <button
                        onClick={() => handleMoveProduct(product)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <Move className="w-4 h-4 mr-2" />
                        Move to Category
                      </button>
                      <button
                        onClick={() => handleDeleteItem(product, 'product')}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Product
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div 
                className="p-4 cursor-pointer"
                onClick={() => onProductSelect(product)}
              >
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

      {/* Modals */}
      {showCreateProduct && (
        <CreateProductModal 
          categoryName={selectedCategory.name}
          onClose={() => setShowCreateProduct(false)}
          onConfirm={(productData) => {
            // TODO: Create product API call
            console.log('Create product:', productData);
            setShowCreateProduct(false);
          }}
        />
      )}

      {showDeleteConfirm && deleteTarget && (
        <DeleteConfirmModal 
          target={deleteTarget}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
        />
      )}

      {showMoveProduct && moveTarget && (
        <MoveProductModal 
          product={moveTarget}
          categories={userData?.metadata?.categories || []}
          currentCategory={selectedCategory}
          onClose={() => setShowMoveProduct(false)}
          onConfirm={confirmMove}
        />
      )}
    </div>
  );
};

// Modal Components
const CreateCategoryModal = ({ onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Category</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter category name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter category description"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ name, description })}
            disabled={!name.trim()}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateProductModal = ({ categoryName, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Create New Product in {categoryName}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter product name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price ($)
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ name, price })}
            disabled={!name.trim()}
            className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Create Product
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ target, onClose, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const isCategory = target.type === 'category';
  const name = target.item.name;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          Delete {isCategory ? 'Category' : 'Product'}
        </h3>
        
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Are you sure you want to delete "{name}"? This action cannot be undone.
          {isCategory && ' All products in this category will become uncategorized.'}
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type "{name}" to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder={name}
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmText !== name}
            className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Delete {isCategory ? 'Category' : 'Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MoveProductModal = ({ product, categories, currentCategory, onClose, onConfirm }) => {
  const [selectedCategory, setSelectedCategory] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Move "{product.name}"
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Currently in: <span className="font-medium">{currentCategory.name}</span>
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Move to Category:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select a category...</option>
            {categories
              .filter(cat => `category-${cat.id}` !== currentCategory.key)
              .map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            <option value="uncategorized">Uncategorized</option>
          </select>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedCategory)}
            disabled={!selectedCategory}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            Move Product
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryView;