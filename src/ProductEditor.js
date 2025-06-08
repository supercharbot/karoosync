import React, { useState } from 'react';
import { Store, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import CategoryView from './CategoryView';
import ProductView from './ProductView';

const ProductEditor = ({ userData, onReset }) => {
  const { user, logout } = useAuth();
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

  const renderNavigation = () => {
    const parts = ['Categories'];
    
    if (selectedCategory) {
      parts.push(selectedCategory.name);
    }
    
    if (selectedProduct) {
      parts.push(selectedProduct.name);
    }

    return (
      <div className="text-gray-500">
        {parts.map((part, index) => (
          <span key={index}>
            {index > 0 && ' / '}
            <span className={index === parts.length - 1 ? 'font-medium text-gray-900' : ''}>
              {part}
            </span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Store className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Karoosync</h1>
            {renderNavigation()}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Disconnect
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors flex items-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
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
    </div>
  );
};

export default ProductEditor;