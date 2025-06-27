import React, { useState } from 'react';
import { Save, Image, ChevronLeft, ChevronRight, X, Upload, Eye, Edit3, Package, Settings, List } from 'lucide-react';
import { useAuth } from './AuthContext';
import { updateProduct } from './api';
import BasicSettings from './BasicSettings';
import AdvancedSettings from './AdvancedSettings';
import VariableProductView from './VariableProductView';
import WysiwygEditor from './WysiwygEditor';

const ParentProduct = ({ product, onBack, onProductUpdate }) => {
  const { getAuthToken } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [editData, setEditData] = useState({
    // Basic Information (no pricing)
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
    
    // Inventory (no pricing)
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
    
    // Advanced
    reviews_allowed: product.reviews_allowed !== false,
    purchase_note: product.purchase_note || '',
    menu_order: product.menu_order || 0,
    low_stock_amount: product.low_stock_amount || '',
    tax_status: product.tax_status || 'taxable',
    tax_class: product.tax_class || '',
    attributes: product.attributes || [],
    default_attributes: product.default_attributes || [],
    grouped_products: product.grouped_products || [],
    upsell_ids: product.upsell_ids || [],
    cross_sell_ids: product.cross_sell_ids || [],
    parent_id: product.parent_id || 0,
    meta_data: product.meta_data || [],
    
    // Downloadable
    downloads: product.downloads || [],
    download_limit: product.download_limit || -1,
    download_expiry: product.download_expiry || -1,
    
    // Images
    images: product.images || []
  });
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEditData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setEditData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('Saving parent product...');
    
    const hasUploadedFiles = editData.images.some(img => img.file);
    if (hasUploadedFiles) {
      setSaveStatus('Note: Uploaded files are not saved to WooCommerce (URL images only)');
    }
    
    try {
      const authToken = await getAuthToken();   
      const result = await updateProduct(product.id, editData, authToken);
      
      if (result.success) {
        setSaveStatus('Parent product saved successfully!');
        onProductUpdate(result.data);
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus(`Error: ${result.error}`);
      }
    } catch (err) {
      setSaveStatus(`Error: ${err.message}`);
    }
    
    setSaving(false);
  };

  const handleImageAdd = (url) => {
    if (url.trim()) {
      setEditData(prev => ({
        ...prev,
        images: [...prev.images, { src: url.trim() }]
      }));
      setActiveImageIndex(editData.images.length);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 5MB)`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setEditData(prev => ({
          ...prev,
          images: [...prev.images, { src: e.target.result, file: true }]
        }));
        setActiveImageIndex(editData.images.length);
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  const handleImageDelete = (index) => {
    setEditData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: newImages };
    });
    if (activeImageIndex >= index && activeImageIndex > 0) {
      setActiveImageIndex(activeImageIndex - 1);
    }
  };

  const navigateImage = (direction) => {
    if (editData.images.length === 0) return;
    
    if (direction === 'next') {
      setActiveImageIndex((prev) => 
        prev === editData.images.length - 1 ? 0 : prev + 1
      );
    } else {
      setActiveImageIndex((prev) => 
        prev === 0 ? editData.images.length - 1 : prev - 1
      );
    }
  };

  const getPriceRange = () => {
    // This would come from variations - placeholder for now
    return 'Set by variations';
  };

  // If we're on the variations tab, show the VariableProductView
  if (activeTab === 'variations') {
    return (
      <VariableProductView 
        product={product}
        onBack={() => setActiveTab('details')}
        onProductUpdate={onProductUpdate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Tabs moved to header and inline with save button */}
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Product Details
              </button>
              <button
                onClick={() => setActiveTab('variations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'variations'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <List className="w-4 h-4 inline mr-2" />
                Manage Variations
              </button>
            </nav>
            
            <div className="flex items-center space-x-3">
              {saveStatus && (
                <span className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveStatus}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Product'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Product Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Image Gallery */}
            {editData.images.length > 0 ? (
              <div className="relative">
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <img
                    src={editData.images[activeImageIndex].src}
                    alt={editData.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {editData.images.length > 1 && (
                  <>
                    <button 
                      onClick={() => navigateImage('prev')}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <button 
                      onClick={() => navigateImage('next')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs">
                      {activeImageIndex + 1} / {editData.images.length}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <div className="text-center p-8">
                  <Image className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No product images</p>
                </div>
              </div>
            )}
            
            {/* Product Details */}
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {editData.name || 'Product Name'}
              </h1>
              
              <div className="flex items-baseline gap-3 mb-6">
                <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  {getPriceRange()}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Variable Product
                </span>
              </div>

              {editData.short_description && (
                <div 
                  className="text-gray-600 dark:text-gray-400 mb-4 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: editData.short_description }}
                />
              )}

              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </div>

          {/* Product Editor */}
          <div className="space-y-6">
            {/* Basic Settings with WYSIWYG */}
            <BasicSettings 
              editData={editData}
              handleInputChange={handleInputChange}
              handleImageAdd={handleImageAdd}
              handleFileUpload={handleFileUpload}
              handleImageDelete={handleImageDelete}
              activeImageIndex={activeImageIndex}
              setActiveImageIndex={setActiveImageIndex}
              hidepricing={true} // Hide pricing fields for variable products
              isMobile={false}
            />

            {/* Description Sections */}
            <DescriptionSections 
              editData={editData}
              handleInputChange={handleInputChange}
            />

            {/* Advanced Settings */}
            <AdvancedSettingsSection 
              editData={editData}
              handleInputChange={handleInputChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Description Sections Component
const DescriptionSections = ({ editData, handleInputChange }) => {
  const [showDescription, setShowDescription] = useState(false);
  const [showShortDescription, setShowShortDescription] = useState(false);

  return (
    <div className="space-y-4">
      {/* Short Description Toggle */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setShowShortDescription(!showShortDescription)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
        >
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Short Description
          </span>
          <svg 
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform ${showShortDescription ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showShortDescription && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <textarea
              value={editData.short_description || ''}
              onChange={(e) => handleInputChange('short_description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={4}
              placeholder="Enter short description..."
            />
          </div>
        )}
      </div>

      {/* Description Toggle */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setShowDescription(!showDescription)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
        >
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Description
          </span>
          <svg 
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform ${showDescription ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDescription && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <textarea
              value={editData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={6}
              placeholder="Enter full description..."
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Advanced Settings Section Component
const AdvancedSettingsSection = ({ editData, handleInputChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      {/* Advanced Toggle */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
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
        {showAdvanced && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <AdvancedSettings 
              editData={editData}
              handleInputChange={handleInputChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentProduct;