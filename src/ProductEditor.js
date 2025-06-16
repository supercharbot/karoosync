import React, { useState } from 'react';
import CategoryView from './CategoryView';
import ProductView from './ProductView';
import { ChevronRight, Home } from 'lucide-react';

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

  // Navigate to specific breadcrumb level
  const navigateToBreadcrumb = (index) => {
    const breadcrumbs = getBreadcrumbPath();
    
    if (index === 0) {
      // Navigate to root categories
      setSelectedCategory(null);
      setSelectedProduct(null);
      setCategoryPath([]);
      setCurrentView('categories');
    } else if (index < breadcrumbs.length - 1) {
      if (selectedProduct && index === breadcrumbs.length - 2) {
        // Navigate back to products (from product view)
        handleBackToProducts();
      } else {
        // Navigate to specific category in path
        const targetPath = categoryPath.slice(0, index);
        const targetCategory = index === 1 ? categoryPath[0] : categoryPath[index - 1];
        setCategoryPath(targetPath);
        setSelectedCategory(targetCategory);
        setSelectedProduct(null);
        setCurrentView('products');
      }
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)] lg:min-h-[calc(100vh-73px)]">
      {/* Breadcrumb Navigation */}
      {(selectedCategory || selectedProduct) && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-3">
          <div className="flex items-center min-w-0">
            {/* Mobile: Show home, parent (if exists), and current */}
            <div className="flex items-center lg:hidden">
              <button 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center mr-2 flex-shrink-0"
                onClick={() => navigateToBreadcrumb(0)}
              >
                <Home className="w-4 h-4" />
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-1 flex-shrink-0" />
              
              {getBreadcrumbPath().length > 2 ? (
                // Show parent level as clickable when there are multiple levels
                <>
                  <button 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium truncate"
                    onClick={() => navigateToBreadcrumb(getBreadcrumbPath().length - 2)}
                  >
                    {getBreadcrumbPath()[getBreadcrumbPath().length - 2]}
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-1 flex-shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {getBreadcrumbPath()[getBreadcrumbPath().length - 1]}
                  </span>
                </>
              ) : (
                // Show only current level when at top level
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {getBreadcrumbPath()[getBreadcrumbPath().length - 1]}
                </span>
              )}
            </div>

            {/* Desktop: Show full breadcrumb path */}
            <div className="hidden lg:flex items-center min-w-0 flex-wrap">
              {getBreadcrumbPath().map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-2 flex-shrink-0" />
                  )}
                  {index < getBreadcrumbPath().length - 1 ? (
                    <button 
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium truncate"
                      onClick={() => navigateToBreadcrumb(index)}
                    >
                      {item}
                    </button>
                  ) : (
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{item}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
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