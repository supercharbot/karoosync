import React, { useState } from 'react';
import { ArrowLeft, Save, Image, ChevronLeft, ChevronRight, X, Plus, Upload, Eye, Edit3 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { updateProduct } from './api';
import SaleSettings from './SaleSettings';
import BasicSettings from './BasicSettings';
import AdvancedSettings from './AdvancedSettings';

const ProductView = ({ product, onBack, onProductUpdate }) => {
  const { getAuthToken } = useAuth();
  const [activeTab, setActiveTab] = useState('preview');
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
    tag_ids: product.tag_ids || [],
    
    // Advanced
    reviews_allowed: product.reviews_allowed !== false,
    purchase_note: product.purchase_note || '',
    menu_order: product.menu_order || 0,
    low_stock_amount: product.low_stock_amount || '',
    tax_status: product.tax_status || 'taxable',
    tax_class: product.tax_class || '',
    attributes: product.attributes || [],
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
    setSaveStatus('Saving...');
    
    const hasUploadedFiles = editData.images.some(img => img.file);
    if (hasUploadedFiles) {
      setSaveStatus('Uploading images to WooCommerce media library...');
    }
    
    try {
      const authToken = await getAuthToken();
      console.log('🔍 DEBUGGING: Saving product with attributes:', editData.attributes);
      console.log('🔍 DEBUGGING: Full editData:', editData);
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
    <div className="min-h-screen flex flex-col lg:flex-row">
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

      {/* Desktop Layout: Side by Side */}
      <div className="hidden lg:flex flex-1">
        {/* Left Panel - Product Preview (Desktop) */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <ProductPreview editData={editData} activeImageIndex={activeImageIndex} navigateImage={navigateImage} product={product} />
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
            <ProductPreview editData={editData} activeImageIndex={activeImageIndex} navigateImage={navigateImage} product={product} isMobile={true} />
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

// Product Editor Component
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
      {/* Sale Settings */}
      <SaleSettings 
        editData={editData}
        handleInputChange={handleInputChange}
        isMobile={isMobile}
      />

      {/* Basic Settings */}
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

// Product Preview Component
const ProductPreview = ({ editData, activeImageIndex, navigateImage, product, isMobile = false }) => (
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
          {editData.sale_price && parseFloat(editData.sale_price) > 0 ? (
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
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Created:</span> {product.date_created ? new Date(product.date_created).toLocaleDateString() : 'N/A'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Modified:</span> {product.date_modified ? new Date(product.date_modified).toLocaleDateString() : 'N/A'}
          </p>
          {product.permalink && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">View:</span> 
              <a href={product.permalink} target="_blank" rel="noopener noreferrer" 
                 className="ml-1 text-blue-600 dark:text-blue-400 hover:underline">
                Live Product
              </a>
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Rating:</span> {product.average_rating || '0'} ({product.rating_count || 0} reviews)
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default ProductView;