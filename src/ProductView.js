import React, { useState } from 'react';
import { ArrowLeft, Save, Image, ChevronLeft, ChevronRight, X, Plus, Upload, Eye, Edit3 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { updateProduct } from './api';

const ProductView = ({ product, onBack, onProductUpdate }) => {
  const { getAuthToken } = useAuth();
  const [activeTab, setActiveTab] = useState('preview'); // preview or edit (mobile only)
  const [editData, setEditData] = useState({
    // Basic Information
    name: product.name || '',
    slug: product.slug || '',
    description: product.description || '',
    short_description: product.short_description || '',
    status: product.status || 'publish',
    catalog_visibility: product.catalog_visibility || 'visible',
    featured: product.featured || false,
    type: product.type || 'simple',
    virtual: product.virtual || false,
    downloadable: product.downloadable || false,
    
    // Pricing
    regular_price: product.regular_price || '',
    sale_price: product.sale_price || '',
    date_on_sale_from: product.date_on_sale_from || '',
    date_on_sale_to: product.date_on_sale_to || '',
    
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
    
    // Advanced
    reviews_allowed: product.reviews_allowed !== false,
    purchase_note: product.purchase_note || '',
    menu_order: product.menu_order || 0,
    
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
    setSaveStatus('Saving...');
    
    const hasUploadedFiles = editData.images.some(img => img.file);
    if (hasUploadedFiles) {
      setSaveStatus('Note: Uploaded files are not saved to WooCommerce (URL images only)');
    }
    
    try {
      const authToken = await getAuthToken();
      const result = await updateProduct(product.id, editData, authToken);
      
      if (result.success) {
        setSaveStatus('Saved successfully!');
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

  return (
    <div className="h-[calc(100vh-64px)] lg:h-[calc(100vh-73px)] flex flex-col lg:flex-row">
      {/* Mobile Tab Navigation */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
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

      {/* Desktop Layout: Side by Side (preserved exactly) */}
      <div className="hidden lg:flex flex-1">
        {/* Left Panel - Product Preview (Desktop) */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-auto">
          
          <ProductPreview editData={editData} activeImageIndex={activeImageIndex} navigateImage={navigateImage} />
        </div>

        {/* Right Panel - Editor (Desktop) */}
        <div className="w-1/2 bg-gray-50 dark:bg-gray-900 overflow-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-10 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Product</h2>
            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className={`text-sm px-3 py-1 rounded-full ${
                  saveStatus.includes('Error') 
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                    : saveStatus.includes('Saving')
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}>
                  {saveStatus}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center font-medium"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <ProductEditor 
            editData={editData} 
            handleInputChange={handleInputChange}
            handleImageAdd={handleImageAdd}
            handleFileUpload={handleFileUpload}
            handleImageDelete={handleImageDelete}
            activeImageIndex={activeImageIndex}
            setActiveImageIndex={setActiveImageIndex}
          />
        </div>
      </div>

      {/* Mobile Layout: Single Panel with Tabs */}
      <div className="lg:hidden flex-1 overflow-auto">
        {activeTab === 'preview' ? (
          <ProductPreview editData={editData} activeImageIndex={activeImageIndex} navigateImage={navigateImage} isMobile={true} />
        ) : (
          <div className="relative">
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
            {/* Mobile Save Button */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center justify-center font-medium"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Product Preview Component (preserved exactly)
const ProductPreview = ({ editData, activeImageIndex, navigateImage, isMobile = false }) => (
  <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
          {editData.sale_price ? (
            <>
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                ${editData.sale_price}
              </span>
              <span className="text-xl text-gray-500 dark:text-gray-400 line-through">
                ${editData.regular_price}
              </span>
            </>
          ) : (
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              ${editData.regular_price || '0.00'}
            </span>
          )}
        </div>
        
        {editData.short_description && (
          <div className="prose prose-gray dark:prose-invert max-w-none mb-6">
            <div dangerouslySetInnerHTML={{ __html: editData.short_description }} />
          </div>
        )}
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">SKU:</span> {editData.sku || 'N/A'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Stock:</span> {editData.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
            {editData.stock_quantity && ` (${editData.stock_quantity} available)`}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Status:</span> {editData.status}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Type:</span> {editData.type}
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Product Editor Component (ALL comprehensive WooCommerce functionality)
const ProductEditor = ({ 
  editData, 
  handleInputChange, 
  handleImageAdd, 
  handleFileUpload, 
  handleImageDelete, 
  activeImageIndex, 
  setActiveImageIndex,
  isMobile = false 
}) => (
  <div className={`${isMobile ? 'p-4 pb-20 w-full max-w-full min-w-0' : 'p-6'} ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
    {/* Basic Information */}
    <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Basic Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Product Name
        </label>
        <input
          type="text"
          value={editData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`w-full ${isMobile ? 'min-w-0 max-w-full' : ''} px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
          placeholder="Enter product name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Product Slug
        </label>
        <input
          type="text"
          value={editData.slug}
          onChange={(e) => handleInputChange('slug', e.target.value)}
          className={`w-full ${isMobile ? 'min-w-0 max-w-full' : ''} px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
          placeholder="product-slug"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Short Description
        </label>
        <textarea
          value={editData.short_description}
          onChange={(e) => handleInputChange('short_description', e.target.value)}
          rows={isMobile ? 4 : 3}
          className={`w-full ${isMobile ? 'min-w-0 max-w-full' : ''} px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none ${isMobile ? 'text-base' : ''}`}
          placeholder="Brief product summary for listings..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Full Description
        </label>
        <textarea
          value={editData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={isMobile ? 6 : 6}
          className={`w-full ${isMobile ? 'min-w-0 max-w-full' : ''} px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${isMobile ? 'text-base' : ''}`}
          placeholder="Detailed product description with features, benefits..."
        />
      </div>

      {/* Status and Flags */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={editData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
          >
            <option value="publish">Published</option>
            <option value="draft">Draft</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Visibility
          </label>
          <select
            value={editData.catalog_visibility}
            onChange={(e) => handleInputChange('catalog_visibility', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
          >
            <option value="visible">Visible</option>
            <option value="catalog">Catalog Only</option>
            <option value="search">Search Only</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* Product Flags */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-wrap gap-4'}`}>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.featured}
            onChange={(e) => handleInputChange('featured', e.target.checked)}
            className={`mr-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-blue-600 rounded`}
          />
          <span className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-700 dark:text-gray-300`}>Featured Product</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.virtual}
            onChange={(e) => handleInputChange('virtual', e.target.checked)}
            className={`mr-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-blue-600 rounded`}
          />
          <span className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-700 dark:text-gray-300`}>Virtual</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.downloadable}
            onChange={(e) => handleInputChange('downloadable', e.target.checked)}
            className={`mr-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-blue-600 rounded`}
          />
          <span className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-700 dark:text-gray-300`}>Downloadable</span>
        </label>
      </div>
    </div>

    {/* Pricing */}
    <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Pricing</h3>
      
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Regular Price ($)
          </label>
          <input
            type="text"
            value={editData.regular_price}
            onChange={(e) => handleInputChange('regular_price', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sale Price ($)
          </label>
          <input
            type="text"
            value={editData.sale_price}
            onChange={(e) => handleInputChange('sale_price', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sale Start Date
          </label>
          <input
            type="datetime-local"
            value={editData.date_on_sale_from}
            onChange={(e) => handleInputChange('date_on_sale_from', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sale End Date
          </label>
          <input
            type="datetime-local"
            value={editData.date_on_sale_to}
            onChange={(e) => handleInputChange('date_on_sale_to', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
          />
        </div>
      </div>
    </div>

    {/* External Product */}
    {editData.type === 'external' && (
      <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>External Product</h3>
        
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'} ${isMobile ? 'w-full' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product URL
            </label>
            <input
              type="url"
              value={editData.external_url}
              onChange={(e) => handleInputChange('external_url', e.target.value)}
              className={`w-full ${isMobile ? 'min-w-0 max-w-full' : ''} px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Button Text
            </label>
            <input
              type="text"
              value={editData.button_text}
              onChange={(e) => handleInputChange('button_text', e.target.value)}
              className={`w-full ${isMobile ? 'min-w-0 max-w-full' : ''} px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              placeholder="Buy Now"
            />
          </div>
        </div>
      </div>
    )}

    {/* Inventory */}
    <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Inventory</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          SKU
        </label>
        <input
          type="text"
          value={editData.sku}
          onChange={(e) => handleInputChange('sku', e.target.value)}
          className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
          placeholder="Product SKU"
        />
      </div>

      <div className={`flex items-center ${isMobile ? 'mb-4' : 'mb-4'}`}>
        <input
          type="checkbox"
          checked={editData.manage_stock}
          onChange={(e) => handleInputChange('manage_stock', e.target.checked)}
          className={`mr-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-blue-600 rounded`}
        />
        <label className={`${isMobile ? 'text-base' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300`}>
          Manage Stock
        </label>
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stock Status
          </label>
          <select
            value={editData.stock_status}
            onChange={(e) => handleInputChange('stock_status', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
          >
            <option value="instock">In Stock</option>
            <option value="outofstock">Out of Stock</option>
            <option value="onbackorder">On Backorder</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stock Quantity
          </label>
          <input
            type="number"
            value={editData.stock_quantity}
            onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
            disabled={!editData.manage_stock}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 ${isMobile ? 'text-base' : ''}`}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Allow Backorders
        </label>
        <select
          value={editData.backorders}
          onChange={(e) => handleInputChange('backorders', e.target.value)}
          disabled={!editData.manage_stock}
          className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 ${isMobile ? 'text-base' : ''}`}
        >
          <option value="no">Do not allow</option>
          <option value="notify">Allow, but notify customer</option>
          <option value="yes">Allow</option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={editData.sold_individually}
          onChange={(e) => handleInputChange('sold_individually', e.target.checked)}
          className={`mr-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-blue-600 rounded`}
        />
        <label className={`${isMobile ? 'text-base' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300`}>
          Sold Individually (limit to 1 per order)
        </label>
      </div>
    </div>

    {/* Shipping */}
    <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Shipping</h3>
      
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Weight (kg)
          </label>
          <input
            type="text"
            value={editData.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Shipping Class
          </label>
          <input
            type="text"
            value={editData.shipping_class}
            onChange={(e) => handleInputChange('shipping_class', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="Enter shipping class"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dimensions (cm)
        </label>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
          <input
            type="text"
            value={editData.dimensions.length}
            onChange={(e) => handleInputChange('dimensions.length', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="Length"
          />
          <input
            type="text"
            value={editData.dimensions.width}
            onChange={(e) => handleInputChange('dimensions.width', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="Width"
          />
          <input
            type="text"
            value={editData.dimensions.height}
            onChange={(e) => handleInputChange('dimensions.height', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="Height"
          />
        </div>
      </div>
    </div>

    {/* Categories & Tags */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Categories & Tags</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Categories
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700 min-h-[80px]">
          {editData.categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {editData.categories.map((category, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                  {category.name}
                  <button
                    onClick={() => {
                      const newCategories = editData.categories.filter((_, i) => i !== index);
                      handleInputChange('categories', newCategories);
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">No categories assigned</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700 min-h-[80px]">
          {editData.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {editData.tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                  {tag.name}
                  <button
                    onClick={() => {
                      const newTags = editData.tags.filter((_, i) => i !== index);
                      handleInputChange('tags', newTags);
                    }}
                    className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">No tags assigned</p>
          )}
        </div>
      </div>
    </div>

    {/* Downloadable Product */}
    {editData.downloadable && (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Downloadable Product</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Download Limit
            </label>
            <input
              type="number"
              value={editData.download_limit}
              onChange={(e) => handleInputChange('download_limit', parseInt(e.target.value) || -1)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="-1 for unlimited"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Download Expiry (days)
            </label>
            <input
              type="number"
              value={editData.download_expiry}
              onChange={(e) => handleInputChange('download_expiry', parseInt(e.target.value) || -1)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="-1 for no expiry"
            />
          </div>
        </div>
      </div>
    )}

    {/* Product Images */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Product Images</h3>
      
      {/* Upload Methods */}
      <div className="space-y-3">
        {/* File Upload */}
        <div>
          <label className="block w-full cursor-pointer">
            <div className="px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Upload image files (max 5MB each)
                </span>
              </div>
            </div>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileUpload}
              multiple
              className="sr-only"
            />
          </label>
        </div>

        {/* URL Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Or enter image URL and press Enter"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                handleImageAdd(e.target.value);
                e.target.value = '';
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder*="image URL"]');
              if (input?.value) {
                handleImageAdd(input.value);
                input.value = '';
              }
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Image List */}
      <div className={`space-y-3 ${isMobile ? 'max-h-60' : 'max-h-80'} overflow-y-auto`}>
        {editData.images.map((image, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              activeImageIndex === index 
                ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
            }`}
          >
            <div className="relative w-16 h-16 flex-shrink-0">
              <img 
                src={image.src} 
                alt="" 
                className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveImageIndex(index)}
              />
              {activeImageIndex === index && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Image {index + 1}
                </span>
                {index === 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-xs">
                    Featured
                  </span>
                )}
                {image.file && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full text-xs">
                    Uploaded
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {image.file ? 'Uploaded file (preview only)' : image.src}
              </p>
            </div>
            <button
              onClick={() => handleImageDelete(index)}
              className="w-8 h-8 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {editData.images.length === 0 && (
          <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <Image className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No images added yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Upload files or add image URLs above
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Advanced Settings */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Advanced Settings</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Purchase Note
        </label>
        <textarea
          value={editData.purchase_note}
          onChange={(e) => handleInputChange('purchase_note', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Note to customer after purchase"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Menu Order
        </label>
        <input
          type="number"
          value={editData.menu_order}
          onChange={(e) => handleInputChange('menu_order', parseInt(e.target.value) || 0)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="0"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={editData.reviews_allowed}
          onChange={(e) => handleInputChange('reviews_allowed', e.target.checked)}
          className="mr-2 w-4 h-4 text-blue-600 rounded"
        />
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Allow Reviews
        </label>
      </div>
    </div>
  </div>
);

export default ProductView;