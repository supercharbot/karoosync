import React, { useState } from 'react';
import CategoryView from './CategoryView';
import ProductView from './ProductView';

const ProductEditor = ({ userData, onReset }) => {
  const [currentView, setCurrentView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentView('products');
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setCurrentView('product-edit');
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedProduct(null);
    setCurrentView('categories');
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setCurrentView('products');
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
      {/* Breadcrumb Navigation - only show when not on categories page */}
      {(selectedCategory || selectedProduct) && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="text-sm">
            <button 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              onClick={handleBackToCategories}
            >
              Categories
            </button>
            {selectedCategory && (
              <>
                <span className="mx-2 text-gray-400 dark:text-gray-500">/</span>
                {selectedProduct ? (
                  <button 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    onClick={handleBackToProducts}
                  >
                    {selectedCategory.name}
                  </button>
                ) : (
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedCategory.name}
                  </span>
                )}
              </>
            )}
            {selectedProduct && (
              <>
                <span className="mx-2 text-gray-400 dark:text-gray-500">/</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedProduct.name}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      {currentView === 'categories' && (
        <CategoryView
          userData={userData}
          onCategorySelect={handleCategorySelect}
        />
      )}

      {currentView === 'products' && selectedCategory && (
        <CategoryView
          userData={userData}
          selectedCategory={selectedCategory}
          onProductSelect={handleProductSelect}
          onBack={handleBackToCategories}
        />
      )}

      {currentView === 'product-edit' && selectedProduct && (
        <ProductView
          product={selectedProduct}
          onBack={handleBackToProducts}
          onProductUpdate={(updatedProduct) => {
            setSelectedProduct(updatedProduct);
          }}
        />
      )}
    </div>
  );
};

export default ProductEditor;