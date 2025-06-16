import React from 'react';
import { X, Upload, Plus, Image } from 'lucide-react';

const BasicSettings = ({ 
  editData, 
  handleInputChange, 
  handleImageAdd, 
  handleFileUpload, 
  handleImageDelete, 
  activeImageIndex, 
  setActiveImageIndex,
  isMobile = false 
}) => {
  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
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

        {/* Status and Visibility */}
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
              <option value="pending">Pending Review</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catalog Visibility
            </label>
            <select
              value={editData.catalog_visibility}
              onChange={(e) => handleInputChange('catalog_visibility', e.target.value)}
              className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            >
              <option value="visible">Visible</option>
              <option value="catalog">Catalog only</option>
              <option value="search">Search only</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>
      </div>

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
              className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              placeholder="0"
            />
          </div>
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
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Categories & Tags</h3>
        
        {/* Categories */}
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
          
          {/* Add Category Input */}
          <div className="mt-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add category (press Enter)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const newCategory = { id: Date.now(), name: e.target.value.trim() };
                    handleInputChange('categories', [...editData.categories, newCategory]);
                    e.target.value = '';
                  }
                }}
                className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
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
          
          {/* Add Tag Input */}
          <div className="mt-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add tag (press Enter)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const newTag = { id: Date.now(), name: e.target.value.trim() };
                    handleInputChange('tags', [...editData.tags, newTag]);
                    e.target.value = '';
                  }
                }}
                className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product Images */}
      <div className="space-y-4">
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Product Images</h3>
        
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
        <div className="space-y-3">
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
                <p className="text-xs text-gray-500 dark:text-gray-400 break-all overflow-hidden line-clamp-2 leading-tight">
                  {image.file ? image.file.name : image.src}
                </p>
              </div>
              <button
                onClick={() => handleImageDelete(index)}
                className="flex-shrink-0 w-8 h-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {editData.images.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No images added yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicSettings;