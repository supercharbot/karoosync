import React, { useState, useRef } from 'react';
import { X, Upload, Plus, ChevronLeft, ChevronRight, Image, ArrowLeft, RefreshCw, Store, Folder, Package, Loader2, AlertTriangle } from 'lucide-react';
import { loadCategoryProducts } from './api';
import { useAuth } from './AuthContext';

const ProductEditor = ({ syncData, storeUrl, credentials, onProductUpdate, onReset, onResync }) => {
  const { getAuthToken } = useAuth();
  
  // Navigation states
  const [currentView, setCurrentView] = useState('categories'); // 'categories', 'products', 'editor'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  
  // Product editing states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Check if credentials are available
  const hasCredentials = credentials && credentials.url && 
    ((credentials.authMethod === 'woocommerce' && credentials.consumerKey && credentials.consumerSecret) ||
     (credentials.authMethod === 'application' && credentials.username && credentials.appPassword));

  // Handle category selection and load products
  const handleCategorySelect = async (category) => {
    setLoadingCategory(true);
    setSelectedCategory(category);
    
    try {
      const authToken = await getAuthToken();
      const categoryKey = category.id === 'uncategorized' ? 'uncategorized' : `category-${category.id}`;
      
      const result = await loadCategoryProducts(categoryKey, authToken);
      
      if (result.success) {
        setCategoryProducts(result.products || []);
        setCurrentView('products');
      } else {
        console.error('Failed to load category products:', result.error);
        setCategoryProducts([]);
        setCurrentView('products');
      }
    } catch (error) {
      console.error('Error loading category:', error);
      setCategoryProducts([]);
      setCurrentView('products');
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setEditingProduct({
      name: product.name,
      description: product.description,
      short_description: product.short_description,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      sku: product.sku,
      stock_quantity: product.stock_quantity,
      stock_status: product.stock_status,
      images: product.images || []
    });
    setActiveImageIndex(0);
    setPublishStatus('');
    setCurrentView('editor');
  };

  const handleFieldChange = (field, value) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageDelete = (index) => {
    setEditingProduct(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      if (activeImageIndex >= index && activeImageIndex > 0) {
        setActiveImageIndex(activeImageIndex - 1);
      } else if (newImages.length === 0) {
        setActiveImageIndex(0);
      }
      return {
        ...prev,
        images: newImages
      };
    });
  };

  const handleImageAdd = (url) => {
    if (!url) return;
    
    setEditingProduct(prev => {
      const newImages = [...prev.images, { src: url }];
      setActiveImageIndex(newImages.length - 1);
      return {
        ...prev,
        images: newImages
      };
    });
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + 10;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 200);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const MAX_RECOMMENDED_SIZE = 2 * 1024 * 1024; // 2MB
        if (file.size > MAX_RECOMMENDED_SIZE) {
          console.warn(`File ${file.name} is ${(file.size/1024/1024).toFixed(1)}MB which exceeds the recommended size of 2MB`);
          setPublishStatus(`Warning: Large image may cause upload issues (${(file.size/1024/1024).toFixed(1)}MB)`);
        }
        
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
          reader.onload = (e) => {
            const src = e.target.result;
            setEditingProduct(prev => {
              const newImages = [...prev.images, { src }];
              setActiveImageIndex(newImages.length - 1);
              return {
                ...prev,
                images: newImages
              };
            });
            resolve();
          };
          
          reader.onerror = () => {
            reject(new Error('Error reading file'));
          };
          
          reader.readAsDataURL(file);
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      setPublishStatus(`Error: ${error.message}`);
    } finally {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePublish = async () => {
    if (!selectedProduct || !editingProduct) return;
    
    // Check if credentials are available
    if (!hasCredentials) {
      setPublishStatus('Error: Store credentials expired. Please re-sync your store to enable updates.');
      return;
    }
    
    setIsPublishing(true);
    setPublishStatus('Publishing changes...');
    
    try {
      if (!editingProduct.name) {
        throw new Error('Product name is required');
      }
      
      if (!editingProduct.regular_price) {
        throw new Error('Regular price is required');
      }
      
      const result = await onProductUpdate(selectedProduct.id, editingProduct);
      
      if (result.success) {
        // Check if S3 sync succeeded and show appropriate message
        if (result.data && result.s3Updated === false) {
          setPublishStatus(`Published to WooCommerce (${result.categoriesUpdated || 0} cache categories updated)`);
        } else if (result.data && result.s3Updated === true) {
          setPublishStatus(`Published successfully (${result.categoriesUpdated || 0} categories updated)!`);
        } else {
          setPublishStatus('Published successfully!');
        }
        
        // Extract the actual product data
        const updatedProduct = result.data;
        if (updatedProduct) {
          setSelectedProduct(updatedProduct);
          
          // Update the product in the category list
          setCategoryProducts(prev => 
            prev.map(p => p.id === selectedProduct.id ? updatedProduct : p)
          );
          
          // Update the editing product with fresh data
          setEditingProduct({
            name: updatedProduct.name,
            description: updatedProduct.description,
            short_description: updatedProduct.short_description,
            regular_price: updatedProduct.regular_price,
            sale_price: updatedProduct.sale_price,
            sku: updatedProduct.sku,
            stock_quantity: updatedProduct.stock_quantity,
            stock_status: updatedProduct.stock_status,
            images: updatedProduct.images || []
          });
        }
        
        // Clear status after 5 seconds for longer messages
        setTimeout(() => setPublishStatus(''), 5000);
      } else {
        setPublishStatus(`Error: ${result.error}`);
      }
    } catch (err) {
      setPublishStatus(`Error: ${err.message}`);
    }
    
    setIsPublishing(false);
  };

  const navigateImage = (direction) => {
    if (!editingProduct?.images?.length) return;
    
    if (direction === 'next') {
      setActiveImageIndex((prevIndex) => 
        prevIndex === editingProduct.images.length - 1 ? 0 : prevIndex + 1
      );
    } else {
      setActiveImageIndex((prevIndex) => 
        prevIndex === 0 ? editingProduct.images.length - 1 : prevIndex - 1
      );
    }
  };

  // Handle categorized data structure
  if (syncData?.structure === 'categorized') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Karoosync</h1>
              {currentView === 'products' && selectedCategory && (
                <span className="text-gray-500">
                  / <span className="font-medium">{selectedCategory.name}</span>
                </span>
              )}
              {currentView === 'editor' && selectedProduct && (
                <span className="text-gray-500">
                  / <span className="font-medium">{selectedCategory?.name}</span>
                  / <span className="font-medium">{selectedProduct.name}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Credentials warning */}
              {!hasCredentials && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-yellow-800 text-sm font-medium">
                      Updates disabled - credentials expired
                    </span>
                  </div>
                </div>
              )}
              
              {/* Publish status */}
              {publishStatus && (
                <span 
                  className={`text-sm px-4 py-2 rounded-full ${
                    publishStatus.includes('Error') 
                      ? 'bg-red-50 text-red-600' 
                      : publishStatus.includes('Warning')
                      ? 'bg-yellow-50 text-yellow-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {publishStatus}
                </span>
              )}
              
              <button
                onClick={() => {
                  if (window.confirm('This will fetch fresh data from your WooCommerce store. Continue?')) {
                    onResync();
                  }
                }}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-sync Store
              </button>

              {currentView === 'editor' && (
                <button
                  onClick={handlePublish}
                  disabled={!selectedProduct || isPublishing || !hasCredentials}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    selectedProduct && !isPublishing && hasCredentials
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transform hover:translate-y-[-1px]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title={!hasCredentials ? 'Please re-sync your store to enable updates' : ''}
                >
                  {isPublishing ? (
                    <span className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </span>
                  ) : (
                    'Publish Changes'
                  )}
                </button>
              )}
              
              <button
                onClick={onReset}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row h-[calc(100vh-73px)]">
          {/* Categories View */}
          {currentView === 'categories' && (
            <div className="p-6 w-full">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  Categories ({(syncData.categories?.length || 0) + 1})
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {/* Uncategorized Folder */}
                  <div
                    onClick={() => handleCategorySelect({ id: 'uncategorized', name: 'Uncategorized' })}
                    className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:translate-y-[-2px]"
                  >
                    <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-400" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-3 left-3 right-3">
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                            Open
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900">Uncategorized</h3>
                      <p className="text-sm text-gray-500 mt-1">Products without categories</p>
                    </div>
                  </div>

                  {/* Category Folders */}
                  {syncData.categories?.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => handleCategorySelect(category)}
                      className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:translate-y-[-2px]"
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <Folder className="w-16 h-16 text-blue-600" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-3 left-3 right-3">
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                              Open
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 line-clamp-2">{category.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{category.count || 0} products</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Products View */}
          {currentView === 'products' && (
            <div className="p-6 w-full">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center mb-6">
                  <button
                    onClick={() => setCurrentView('categories')}
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium mr-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Categories
                  </button>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedCategory?.name} ({loadingCategory ? '...' : categoryProducts.length})
                  </h2>
                </div>
                
                {loadingCategory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading products...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {categoryProducts.map((product, index) => (
                      <div
                        key={`${selectedCategory?.id}-${product.id}-${index}`}
                        onClick={() => handleProductSelect(product)}
                        className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:translate-y-[-2px]"
                      >
                        <div className="relative aspect-square bg-gray-100">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0].src}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-10 h-10 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-3 left-3 right-3">
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                                Edit
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 line-clamp-2">{product.name}</h3>
                          <div className="flex items-baseline justify-between mt-2">
                            <p className="text-lg font-bold text-blue-600">${product.price || product.regular_price || '0.00'}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              product.stock_status === 'instock'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Editor */}
          {currentView === 'editor' && selectedProduct && editingProduct && (
            <>
              {/* Left Side - Product Preview */}
              <div className="w-full md:w-1/2 md:border-r bg-white overflow-auto">
                <div className="sticky top-0 bg-white border-b p-4 z-10">
                  <button
                    onClick={() => setCurrentView('products')}
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to {selectedCategory?.name}
                  </button>
                </div>
                
                <div className="p-8">
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                      {/* Image gallery */}
                      {editingProduct?.images?.length > 0 ? (
                        <div className="relative">
                          <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                            <img
                              src={editingProduct.images[activeImageIndex].src}
                              alt={editingProduct.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          
                          {/* Image navigation arrows */}
                          {editingProduct.images.length > 1 && (
                            <>
                              <button 
                                onClick={() => navigateImage('prev')}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                              >
                                <ChevronLeft className="w-5 h-5 text-gray-700" />
                              </button>
                              <button 
                                onClick={() => navigateImage('next')}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                              >
                                <ChevronRight className="w-5 h-5 text-gray-700" />
                              </button>
                            </>
                          )}
                          
                          {/* Image counter */}
                          {editingProduct.images.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs">
                              {activeImageIndex + 1} / {editingProduct.images.length}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                          <div className="text-center p-8">
                            <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No product images</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Thumbnails */}
                      {editingProduct?.images?.length > 1 && (
                        <div className="px-4 py-3 border-t border-gray-100 overflow-auto">
                          <div className="flex gap-2 items-center">
                            {editingProduct.images.map((image, index) => (
                              <button
                                key={index}
                                onClick={() => setActiveImageIndex(index)}
                                className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ${
                                  activeImageIndex === index 
                                    ? 'ring-2 ring-blue-500 ring-offset-2' 
                                    : 'border border-gray-200'
                                }`}
                              >
                                <img
                                  src={image.src}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">{editingProduct?.name}</h1>
                        
                        <div className="flex items-baseline gap-3 mb-6">
                          {editingProduct?.sale_price ? (
                            <>
                              <span className="text-3xl font-bold text-green-600">${editingProduct.sale_price}</span>
                              <span className="text-xl text-gray-500 line-through">${editingProduct.regular_price}</span>
                            </>
                          ) : (
                            <span className="text-3xl font-bold text-gray-900">${editingProduct?.regular_price}</span>
                          )}
                        </div>
                        
                        <div className="prose prose-gray max-w-none mb-6">
                          <div dangerouslySetInnerHTML={{ __html: editingProduct?.short_description || editingProduct?.description }} />
                        </div>
                        
                        <div className="border-t pt-4 space-y-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">SKU:</span> {editingProduct?.sku || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Stock:</span> {editingProduct?.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                            {editingProduct?.stock_quantity && ` (${editingProduct.stock_quantity} available)`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Editor */}
              <div className="w-full md:w-1/2 bg-gray-50 overflow-auto">
                <div className="p-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Product</h2>
                    
                    {/* Credentials warning in editor */}
                    {!hasCredentials && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-yellow-800 font-medium text-sm">Updates Disabled</p>
                            <p className="text-yellow-700 text-sm mt-1">
                              Your store credentials have expired. Please re-sync your store to enable product updates.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-6">
                      {/* Product Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Name
                        </label>
                        <input
                          type="text"
                          value={editingProduct?.name || ''}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={!hasCredentials}
                        />
                      </div>

                      {/* Prices */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Regular Price ($)
                          </label>
                          <input
                            type="text"
                            value={editingProduct?.regular_price || ''}
                            onChange={(e) => handleFieldChange('regular_price', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!hasCredentials}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sale Price ($)
                          </label>
                          <input
                            type="text"
                            value={editingProduct?.sale_price || ''}
                            onChange={(e) => handleFieldChange('sale_price', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Leave empty for no sale price"
                            disabled={!hasCredentials}
                          />
                        </div>
                      </div>

                      {/* SKU and Stock */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            SKU
                          </label>
                          <input
                            type="text"
                            value={editingProduct?.sku || ''}
                            onChange={(e) => handleFieldChange('sku', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!hasCredentials}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stock Status
                          </label>
                          <select
                            value={editingProduct?.stock_status || 'instock'}
                            onChange={(e) => handleFieldChange('stock_status', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                            disabled={!hasCredentials}
                          >
                            <option value="instock">In Stock</option>
                            <option value="outofstock">Out of Stock</option>
                            <option value="onbackorder">On Backorder</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={editingProduct?.stock_quantity || ''}
                            onChange={(e) => handleFieldChange('stock_quantity', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!hasCredentials}
                          />
                        </div>
                      </div>

                      {/* Descriptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Short Description
                        </label>
                        <textarea
                          value={editingProduct?.short_description || ''}
                          onChange={(e) => handleFieldChange('short_description', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Brief product summary (displayed in product lists)"
                          disabled={!hasCredentials}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Description
                        </label>
                        <textarea
                          value={editingProduct?.description || ''}
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                          rows={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Detailed product description (HTML supported)"
                          disabled={!hasCredentials}
                        />
                      </div>

                      {/* Images */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Product Images
                          </label>
                          <span className="text-xs text-gray-500">
                            {editingProduct?.images?.length || 0} image(s)
                          </span>
                        </div>
                        
                        {/* Upload section */}
                        <div className="mb-4">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block w-full cursor-pointer">
                                <div className={`px-4 py-3 border border-gray-300 border-dashed rounded-lg transition-colors ${
                                  hasCredentials ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100'
                                }`}>
                                  <div className="flex items-center justify-center gap-2">
                                    <Upload className={`w-5 h-5 ${hasCredentials ? 'text-gray-500' : 'text-gray-400'}`} />
                                    <span className={`text-sm ${hasCredentials ? 'text-gray-700' : 'text-gray-500'}`}>
                                      Upload from device
                                    </span>
                                  </div>
                                </div>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  ref={fileInputRef}
                                  onChange={handleFileUpload}
                                  multiple
                                  className="sr-only"
                                  disabled={!hasCredentials}
                                />
                              </label>
                            </div>
                            
                            <div className="flex-1">
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Enter image URL"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && e.target.value && hasCredentials) {
                                      handleImageAdd(e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                                  disabled={!hasCredentials}
                                />
                                <button
                                  onClick={() => {
                                    const input = document.querySelector('input[placeholder="Enter image URL"]');
                                    if (input?.value && hasCredentials) {
                                      handleImageAdd(input.value);
                                      input.value = '';
                                    }
                                  }}
                                  disabled={!hasCredentials}
                                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                    hasCredentials ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-100 text-gray-400'
                                  }`}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Upload progress */}
                          {isUploading && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Uploading image(s)...</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Image list */}
                        <div className="space-y-3 max-h-80 overflow-y-auto p-1">
                          {editingProduct?.images?.map((image, index) => (
                            <div 
                              key={index} 
                              className={`flex items-center gap-3 p-3 rounded-lg border ${
                                activeImageIndex === index ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="relative w-16 h-16 flex-shrink-0">
                                <img 
                                  src={image.src} 
                                  alt="" 
                                  className="w-full h-full object-cover rounded-lg"
                                  onClick={() => setActiveImageIndex(index)}
                                />
                                {activeImageIndex === index && (
                                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">✓</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col">
                                <div className="flex items-center">
                                  <span className="text-xs font-medium text-gray-700">Image {index + 1}</span>
                                  {index === 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                      Featured
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-1">{image.src}</p>
                              </div>
                              <div className="flex-shrink-0 flex gap-2">
                                <button
                                  onClick={() => setActiveImageIndex(index)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    activeImageIndex === index
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  <Image className="w-4 h-4" />
                                </button>
                                {hasCredentials && (
                                  <button
                                    onClick={() => handleImageDelete(index)}
                                    className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {(!editingProduct?.images || editingProduct.images.length === 0) && (
                            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                              <Image className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                              <p className="text-gray-500">No images added yet</p>
                              <p className="text-sm text-gray-400 mt-1">Upload images or add from URL</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Legacy structure fallback
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Karoosync</h1>
            {selectedProduct && (
              <span className="text-gray-500">
                / <span className="font-medium">{selectedProduct.name}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!hasCredentials && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-yellow-800 text-sm font-medium">
                    Updates disabled - credentials expired
                  </span>
                </div>
              </div>
            )}
            
            {publishStatus && (
              <span 
                className={`text-sm px-4 py-2 rounded-full ${
                  publishStatus.includes('Error') 
                    ? 'bg-red-50 text-red-600' 
                    : 'bg-green-50 text-green-600'
                }`}
              >
                {publishStatus}
              </span>
            )}
            
            <button
              onClick={() => {
                if (window.confirm('This will fetch fresh data from your WooCommerce store. Continue?')) {
                  onResync();
                }
              }}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-sync Store
            </button>

            <button
              onClick={handlePublish}
              disabled={!selectedProduct || isPublishing || !hasCredentials}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedProduct && !isPublishing && hasCredentials
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transform hover:translate-y-[-1px]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isPublishing ? (
                <span className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </span>
              ) : (
                'Publish Changes'
              )}
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-73px)]">
        {!selectedProduct ? (
          <div className="p-6 w-full">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Products ({syncData.products.length})</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {syncData.products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:translate-y-[-2px]"
                  >
                    <div className="relative aspect-square bg-gray-100">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].src}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-3 left-3 right-3">
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                            Edit
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 line-clamp-2">{product.name}</h3>
                      <div className="flex items-baseline justify-between mt-2">
                        <p className="text-lg font-bold text-blue-600">${product.price || '0.00'}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          product.stock_status === 'instock'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-gray-500">Legacy product editor would go here...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductEditor;