import React, { useState } from 'react';
import { ArrowLeft, Save, Image, ChevronLeft, ChevronRight, X, Plus, Upload, Eye, Edit3, Package, Settings } from 'lucide-react';
import { useAuth } from './AuthContext';
import { updateProduct } from './api';
import BasicSettings from './BasicSettings';
import AdvancedSettings from './AdvancedSettings';
import VariableProductView from './VariableProductView';

const ParentProduct = ({ product, onBack, onProductUpdate }) => {
  const { getAuthToken } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState('parent-product'); // Main tab state
  const [activeTab, setActiveTab] = useState('preview'); // Sub-tab state for parent product
  const [editData, setEditData] = useState({
    // Basic Information
    name: product.name || '',
    slug: product.slug || '',
    description: product.description || '',
    short_description: product.short_description || '',
    status: product.status || 'publish',
    catalog_visibility: product.catalog_visibility || 'visible',
    featured: product.featured || false,
    type: product.type || 'variable',
    virtual: product.virtual || false,
    downloadable: product.downloadable || false,
    date_created: product.date_created || '',
    
    // NO PRICING - Removed all pricing fields
    
    // Inventory
    sku: product.sku || '',
    manage_stock: product.manage_stock || false,
    stock_quantity: product.stock_quantity || '',
    stock_status: product.stock_status || 'instock',
    backorders: product.backorders || 'no',
    sold_individually: product.sold_individually || false,
    
    // Shipping
    weight: product.weight || '',
    dimensions: {
      length: product.dimensions?.length || '',
      width: product.dimensions?.width || '',
      height: product.dimensions?.height || ''
    },
    shipping_class: product.shipping_class || '',
    
    // External Product
    external_url: product.external_url || '',
    button_text: product.button_text || '',
    
    // Categories and Tags
    categories: product.categories || [],
    tags: product.tags || [],
    tag_ids: product.tag_ids || [],
    
    // Images
    images: product.images || [],
    
    // Attributes
    attributes: product.attributes || [],
    default_attributes: product.default_attributes || [],
    
    // Advanced
    reviews_allowed: product.reviews_allowed !== false,
    purchase_note: product.purchase_note || '',
    menu_order: product.menu_order || 0,
    tax_status: product.tax_status || 'taxable',
    tax_class: product.tax_class || '',
    
    // Download settings
    downloads: product.downloads || [],
    download_limit: product.download_limit || -1,
    download_expiry: product.download_expiry || -1,
    
    // Product data
    cross_sell_ids: product.cross_sell_ids || [],
    upsell_ids: product.upsell_ids || [],
    grouped_products: product.grouped_products || []
  });

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageAdd = (imageData) => {
    setEditData(prev => ({
      ...prev,
      images: [...(prev.images || []), imageData]
    }));
  };

  const handleFileUpload = (files) => {
    const filePromises = Array.from(files).map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Date.now() + Math.random(),
            src: e.target.result,
            alt: file.name,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(imageData => {
      setEditData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...imageData]
      }));
    });
  };

  const handleImageDelete = (imageIndex) => {
    setEditData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== imageIndex)
    }));
    
    if (activeImageIndex >= editData.images.length - 1) {
      setActiveImageIndex(Math.max(0, editData.images.length - 2));
    }
  };

  const navigateImage = (direction) => {
    if (direction === 'prev') {
      setActiveImageIndex(prev => prev > 0 ? prev - 1 : editData.images.length - 1);
    } else {
      setActiveImageIndex(prev => prev < editData.images.length - 1 ? prev + 1 : 0);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('Saving...');
    
    try {
      const authToken = await getAuthToken();
      const result = await updateProduct(product.id, editData, authToken);
      
      if (result.success) {
        setSaveStatus('✓ Saved successfully!');
        if (onProductUpdate) {
          onProductUpdate(result.product);
        }
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('✗ Save failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('✗ Save failed: ' + error.message);
    }
    
    setSaving(false);
  };

  const mainTabs = [
    { id: 'parent-product', label: 'Parent Product', icon: Settings },
    { id: 'variations', label: 'Variations', icon: Package }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeMainTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeMainTab === 'parent-product' && (
        <ParentProductContent
            editData={editData}
            handleInputChange={handleInputChange}
            handleImageAdd={handleImageAdd}
            handleFileUpload={handleFileUpload}
            handleImageDelete={handleImageDelete}
            activeImageIndex={activeImageIndex}
            setActiveImageIndex={setActiveImageIndex}
            navigateImage={navigateImage}
            product={product}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleSave={handleSave}
            saving={saving}
            saveStatus={saveStatus}
          />
        )}
        
      {activeMainTab === 'variations' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <VariableProductView
            product={product}
            onBack={() => setActiveMainTab('parent-product')}
            onProductUpdate={onProductUpdate}
          />
        </div>
      )}
    </div>
  );
};

// Parent Product Content Component (the original ProductView layout)
const ParentProductContent = ({ 
  editData, 
  handleInputChange, 
  handleImageAdd, 
  handleFileUpload, 
  handleImageDelete, 
  activeImageIndex, 
  setActiveImageIndex, 
  navigateImage, 
  product, 
  activeTab, 
  setActiveTab, 
  handleSave, 
  saving, 
  saveStatus 
}) => {
  return (
    <div className="flex flex-col h-full lg:max-w-7xl lg:mx-auto lg:px-4 lg:sm:px-6 lg:lg:px-8 lg:py-8">
      {/* Mobile Tab Navigation */}
      <div className="lg:hidden mb-6">
        <div className="flex bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'edit'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Desktop Layout: Side by Side */}
      <div className="hidden lg:flex flex-1">
        {/* Left Panel - Product Preview (Desktop) */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <ProductPreview 
            editData={editData} 
            activeImageIndex={activeImageIndex} 
            setActiveImageIndex={setActiveImageIndex}
            navigateImage={navigateImage} 
            product={product} 
          />
        </div>

        {/* Right Panel - Editor (Desktop) */}
        <div className="w-1/2 bg-gray-50 dark:bg-gray-900">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-10 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Product</h2>
            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className={`text-sm px-3 py-1 rounded-full ${
                  saveStatus.includes('Error') 
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                    : saveStatus.includes('Saving')
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}>
                  {saveStatus}
                </span>
              )}
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          <div>
            <ProductEditor
              editData={editData}
              handleInputChange={handleInputChange}
              handleImageAdd={handleImageAdd}
              handleFileUpload={handleFileUpload}
              handleImageDelete={handleImageDelete}
              activeImageIndex={activeImageIndex}
              setActiveImageIndex={setActiveImageIndex}
              isMobile={false}
            />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex-1">
        {activeTab === 'preview' ? (
          <div className="bg-white dark:bg-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Product Preview</h2>
            </div>
            <ProductPreview 
              editData={editData} 
              activeImageIndex={activeImageIndex} 
              setActiveImageIndex={setActiveImageIndex}
              navigateImage={navigateImage} 
              product={product} 
              isMobile={true} 
            />
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-10">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Product</h2>
              </div>
              {saveStatus && (
                <div className={`text-sm px-3 py-2 rounded-lg ${
                  saveStatus.includes('Error') 
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                    : saveStatus.includes('Saving')
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}>
                  {saveStatus}
                </div>
              )}
            </div>
            <ProductEditor
              editData={editData}
              handleInputChange={handleInputChange}
              handleImageAdd={handleImageAdd}
              handleFileUpload={handleFileUpload}
              handleImageDelete={handleImageDelete}
              activeImageIndex={activeImageIndex}
              setActiveImageIndex={setActiveImageIndex}
              isMobile={true}
            />
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Product Editor Component (NO SALE SETTINGS)
const ProductEditor = ({ 
  editData, 
  handleInputChange, 
  handleImageAdd, 
  handleFileUpload, 
  handleImageDelete, 
  activeImageIndex, 
  setActiveImageIndex,
  isMobile = false 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={`${isMobile ? 'p-4 pb-20 w-full max-w-full min-w-0' : 'p-6'} ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      {/* Basic Settings - NO PRICING */}
      <BasicSettings 
        editData={editData}
        handleInputChange={handleInputChange}
        handleImageAdd={handleImageAdd}
        handleFileUpload={handleFileUpload}
        handleImageDelete={handleImageDelete}
        activeImageIndex={activeImageIndex}
        setActiveImageIndex={setActiveImageIndex}
        isMobile={isMobile}
        hidepricing={true}
      />

      {/* Advanced Toggle */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left ${isMobile ? 'text-base' : ''}`}
        >
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Advanced Settings
          </span>
          <svg 
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
          <AdvancedSettings 
            editData={editData}
            handleInputChange={handleInputChange}
            isMobile={isMobile}
          />
      )}
    </div>
  );
};

// Product Preview Component (same as original)
const ProductPreview = ({ editData, activeImageIndex, setActiveImageIndex, navigateImage, product, isMobile = false }) => (
  <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Image Gallery */}
      {editData.images.length > 0 ? (
        <div className="relative">
          <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <img
              src={editData.images[activeImageIndex]?.src}
              alt={editData.images[activeImageIndex]?.alt}
              className="w-full h-full object-cover"
            />
          </div>
          
          {editData.images.length > 1 && (
            <>
              <button
                onClick={() => navigateImage('prev')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => navigateImage('next')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {editData.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === activeImageIndex 
                        ? 'bg-blue-600 dark:bg-blue-400' 
                        : 'bg-white dark:bg-gray-600 opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <div className="text-center">
            <Image className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No image</p>
          </div>
        </div>
      )}
      
      {/* Product Information */}
      <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4`}>
        <div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-gray-100`}>
            {editData.name || 'Product Name'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            SKU: {editData.sku || 'Not set'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            editData.status === 'publish' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            {editData.status === 'publish' ? 'Published' : 'Draft'}
          </span>
          {editData.featured && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              Featured
            </span>
          )}
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
            Variable Product
          </span>
        </div>
        
        {editData.short_description && (
          <div className="text-sm text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: editData.short_description }} />
          </div>
        )}
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {editData.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Type:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {editData.type === 'variable' ? 'Variable' : 'Simple'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ParentProduct;