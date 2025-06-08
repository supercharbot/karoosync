import React, { useState } from 'react';
import { ArrowLeft, Save, Image, ChevronLeft, ChevronRight, X, Plus, Upload } from 'lucide-react';
import { useAuth } from './AuthContext';
import { updateProduct } from './api';

const ProductView = ({ product, onBack, onProductUpdate }) => {
  const { getAuthToken } = useAuth();
  const [editData, setEditData] = useState({
    name: product.name || '',
    description: product.description || '',
    short_description: product.short_description || '',
    regular_price: product.regular_price || '',
    sale_price: product.sale_price || '',
    sku: product.sku || '',
    stock_quantity: product.stock_quantity || '',
    stock_status: product.stock_status || 'instock',
    images: product.images || []
  });
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('Saving...');
    
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
    <div className="flex h-[calc(100vh-73px)]">
      {/* Left Side - Product Preview */}
      <div className="w-1/2 border-r bg-white overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 z-10">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Products
          </button>
        </div>
        
        <div className="p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Image Gallery */}
            {editData.images.length > 0 ? (
              <div className="relative">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
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
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs">
                      {activeImageIndex + 1} / {editData.images.length}
                    </div>
                  </>
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
            
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{editData.name}</h1>
              
              <div className="flex items-baseline gap-3 mb-6">
                {editData.sale_price ? (
                  <>
                    <span className="text-3xl font-bold text-green-600">${editData.sale_price}</span>
                    <span className="text-xl text-gray-500 line-through">${editData.regular_price}</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">${editData.regular_price}</span>
                )}
              </div>
              
              {editData.short_description && (
                <div className="prose prose-gray max-w-none mb-6">
                  <div dangerouslySetInnerHTML={{ __html: editData.short_description }} />
                </div>
              )}
              
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">SKU:</span> {editData.sku || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Stock:</span> {editData.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                  {editData.stock_quantity && ` (${editData.stock_quantity} available)`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Editor */}
      <div className="w-1/2 bg-gray-50 overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 z-10 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className={`text-sm px-3 py-1 rounded-full ${
                saveStatus.includes('Error') 
                  ? 'bg-red-50 text-red-600' 
                  : saveStatus.includes('Saving')
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-green-50 text-green-600'
              }`}>
                {saveStatus}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Regular Price ($)</label>
              <input
                type="text"
                value={editData.regular_price}
                onChange={(e) => handleInputChange('regular_price', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price ($)</label>
              <input
                type="text"
                value={editData.sale_price}
                onChange={(e) => handleInputChange('sale_price', e.target.value)}
                placeholder="Leave empty for no sale"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* SKU and Stock */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
              <input
                type="text"
                value={editData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
              <select
                value={editData.stock_status}
                onChange={(e) => handleInputChange('stock_status', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="instock">In Stock</option>
                <option value="outofstock">Out of Stock</option>
                <option value="onbackorder">On Backorder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={editData.stock_quantity}
                onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
            <textarea
              value={editData.short_description}
              onChange={(e) => handleInputChange('short_description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief product summary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Description</label>
            <textarea
              value={editData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detailed product description"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
            
            {/* Add Image URL */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter image URL and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      handleImageAdd(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="image URL"]');
                    if (input?.value) {
                      handleImageAdd(input.value);
                      input.value = '';
                    }
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Image List */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {editData.images.map((image, index) => (
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
                      className="w-full h-full object-cover rounded-lg cursor-pointer"
                      onClick={() => setActiveImageIndex(index)}
                    />
                    {activeImageIndex === index && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
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
                  <button
                    onClick={() => handleImageDelete(index)}
                    className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {editData.images.length === 0 && (
                <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                  <Image className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No images added yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add images from URL above</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductView;