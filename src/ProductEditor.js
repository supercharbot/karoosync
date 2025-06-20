import React, { useState } from 'react';
import CategoryView from './CategoryView';
import ProductView from './ProductView';
import VariableProductView from './VariableProductView'; // NEW IMPORT
import { ChevronRight, Home } from 'lucide-react';

const ProductEditor = ({ userData, onReset }) => {
  const [currentView, setCurrentView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryPath, setCategoryPath] = useState([]);

  const handleCategorySelect = (category) => {
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
      const parentCategory = categoryPath[categoryPath.length - 1];
      const newPath = categoryPath.slice(0, -1);
      setCategoryPath(newPath);
      setSelectedCategory(parentCategory);
    } else {
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

  const getParentCategoryName = () => {
    if (categoryPath.length > 0) {
      return categoryPath[categoryPath.length - 1].name;
    }
    return 'Categories';
  };

  const getBreadcrumbPath = () => {
    const path = ['Categories'];
    categoryPath.forEach(cat => path.push(cat.name));
    if (selectedCategory) path.push(selectedCategory.name);
    if (selectedProduct) path.push(selectedProduct.name);
    return path;
  };

  const navigateToBreadcrumb = (index) => {
    const breadcrumbs = getBreadcrumbPath();
    
    if (index === 0) {
      setSelectedCategory(null);
      setSelectedProduct(null);
      setCategoryPath([]);
      setCurrentView('categories');
    } else if (index < breadcrumbs.length - 1) {
      if (selectedProduct && index === breadcrumbs.length - 2) {
        handleBackToProducts();
      } else {
        const targetPath = categoryPath.slice(0, index);
        const targetCategory = index === 1 ? 
          (categoryPath.length > 0 ? categoryPath[0] : selectedCategory) :
          categoryPath[index - 1];
        
        setCategoryPath(targetPath);
        setSelectedCategory(targetCategory);
        setSelectedProduct(null);
        setCurrentView('products');
      }
    }
  };

  // NEW FUNCTION: Check if product is variable type
  const isVariableProduct = (product) => {
    return product && product.type === 'variable';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb Navigation */}
      {(currentView === 'products' || currentView === 'product-edit') && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center space-x-2 text-sm overflow-x-auto">
              {getBreadcrumbPath().map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  {index === 0 && (
                    <Home className="w-4 h-4 text-gray-400 flex-shrink-0 mr-1" />
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

      {/* UPDATED: Route to appropriate product editor based on type */}
      {currentView === 'product-edit' && selectedProduct && (
        <>
          {isVariableProduct(selectedProduct) ? (
            <VariableProductView
              product={selectedProduct}
              onBack={handleBackToProducts}
              onProductUpdate={(updatedProduct) => {
                setSelectedProduct(updatedProduct);
              }}
            />
          ) : (
            <ProductView
              product={selectedProduct}
              onBack={handleBackToProducts}
              onProductUpdate={(updatedProduct) => {
                setSelectedProduct(updatedProduct);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ProductEditor;