import React, { useState } from 'react';
import CategoryView from './CategoryView';
import ProductView from './ProductView';

const ProductEditor = ({ userData, onReset }) => {
  const [currentView, setCurrentView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryPath, setCategoryPath] = useState([]); // Track navigation path

  const handleCategorySelect = (category) => {
    // Add current category to path for breadcrumbs
    const newPath = selectedCategory 
      ? [...categoryPath, selectedCategory]
      : categoryPath;
    
    setCategoryPath(newPath);
    setSelectedCategory(category);
    setCurrentView('products');
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setCurrentView('product-edit');
  };

  const handleBackToCategories = () => {
    if (categoryPath.length > 0) {
      // Go back to parent category
      const parentCategory = categoryPath[categoryPath.length - 1];
      const newPath = categoryPath.slice(0, -1);
      setCategoryPath(newPath);
      setSelectedCategory(parentCategory);
    } else {
      // Go back to top level
      setSelectedCategory(null);
      setSelectedProduct(null);
      setCategoryPath([]);
      setCurrentView('categories');
    }
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setCurrentView('products');
  };

  const handleDataUpdate = () => {
    window.location.reload();
  };

  // Get parent category name for back button
  const getParentCategoryName = () => {
    if (categoryPath.length > 0) {
      return categoryPath[categoryPath.length - 1].name;
    }
    return 'Categories';
  };

  // Build full breadcrumb path
  const getBreadcrumbPath = () => {
    const path = ['Categories'];
    categoryPath.forEach(cat => path.push(cat.name));
    if (selectedCategory) path.push(selectedCategory.name);
    if (selectedProduct) path.push(selectedProduct.name);
    return path;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
      {/* Breadcrumb Navigation */}
      {(selectedCategory || selectedProduct) && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="text-sm">
            {getBreadcrumbPath().map((item, index) => (
              <span key={index}>
                {index > 0 && <span className="mx-2 text-gray-400 dark:text-gray-500">/</span>}
                {index === 0 ? (
                  <button 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedProduct(null);
                      setCategoryPath([]);
                      setCurrentView('categories');
                    }}
                  >
                    {item}
                  </button>
                ) : index < getBreadcrumbPath().length - 1 ? (
                  selectedProduct && index === getBreadcrumbPath().length - 2 ? (
                    <button 
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                      onClick={handleBackToProducts}
                    >
                      {item}
                    </button>
                  ) : (
                    <span className="font-medium text-gray-900 dark:text-gray-100">{item}</span>
                  )
                ) : (
                  <span className="font-medium text-gray-900 dark:text-gray-100">{item}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      {currentView === 'categories' && (
        <CategoryView
          userData={userData}
          onCategorySelect={handleCategorySelect}
          onDataUpdate={handleDataUpdate}
        />
      )}

      {currentView === 'products' && selectedCategory && (
        <CategoryView
          userData={userData}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          onProductSelect={handleProductSelect}
          onBack={handleBackToCategories}
          onDataUpdate={handleDataUpdate}
          parentCategoryName={getParentCategoryName()}
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