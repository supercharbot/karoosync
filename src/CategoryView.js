import React, { useState, useEffect } from 'react';
import { Folder, Package, ArrowLeft, Image, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { loadCategoryProducts } from './api';
import LoadingScreen from './LoadingScreen';

const CategoryView = ({ userData, selectedCategory, onCategorySelect, onProductSelect, onBack }) => {
  const { getAuthToken } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedCategory) {
      loadProducts();
    }
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

  // Show categories list
  if (!selectedCategory) {
    const categories = userData?.metadata?.categories || [];
    const hasUncategorized = userData?.availableCategories?.includes('uncategorized');

    // Sort categories by product count (most to least)
    const sortedCategories = [...categories].sort((a, b) => (b.count || 0) - (a.count || 0));

    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
          Categories ({categories.length + (hasUncategorized ? 1 : 0)})
        </h2>
        
        <div className="space-y-3">
          {/* Uncategorized */}
          {hasUncategorized && (
            <div
              onClick={() => onCategorySelect({ name: 'Uncategorized', key: 'uncategorized' })}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Uncategorized</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">Products without categories</span>
              </div>
            </div>
          )}

          {/* Categories */}
          {sortedCategories.map((category) => (
            <div
              key={category.id}
              onClick={() => onCategorySelect({ 
                name: category.name, 
                key: `category-${category.id}` 
              })}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.name}</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">{category.count || 0} products</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show products in selected category
  if (loading) {
    return <LoadingScreen message={`Loading ${selectedCategory.name} products...`} />;
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-medium mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Categories
        </button>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {selectedCategory.name} ({products.length})
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {products.map((product, index) => (
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
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded">
                    Edit
                  </span>
                </div>
              </div>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryView;