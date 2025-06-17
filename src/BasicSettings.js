import React from 'react';
import { X, Upload, Plus, Image } from 'lucide-react';
import WysiwygEditor from './WysiwygEditor';

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
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Brief summary for product listings)</span>
          </label>
          <WysiwygEditor
            value={editData.short_description}
            onChange={(content) => handleInputChange('short_description', content)}
            placeholder="Brief product summary for listings..."
            className={`w-full ${isMobile ? 'min-w-0 max-w-full' : ''}`}
            isMobile={isMobile}
            minHeight={isMobile ? '120px' : '100px'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Description
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Detailed product information)</span>
          </label>
          <WysiwygEditor
            value={editData.description}
            onChange={(content) => handleInputChange('description', content)}
            placeholder="Detailed product description with features, benefits, specifications..."
            className={`w-full ${isMobile ? 'min-w-0 max-w-full' : ''}`}
            isMobile={isMobile}
            minHeight={isMobile ? '200px' : '180px'}
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
          
          {editData.manage_stock && (
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
                min="0"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editData.manage_stock}
              onChange={(e) => handleInputChange('manage_stock', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Manage stock</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editData.sold_individually}
              onChange={(e) => handleInputChange('sold_individually', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Sold individually</span>
          </label>
        </div>
      </div>

      {/* Shipping */}
      <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Shipping</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Weight (kg)
          </label>
          <input
            type="text"
            value={editData.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dimensions (cm)
          </label>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
            <input
              type="text"
              value={editData.dimensions?.length || ''}
              onChange={(e) => handleInputChange('dimensions.length', e.target.value)}
              className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              placeholder="Length"
            />
            <input
              type="text"
              value={editData.dimensions?.width || ''}
              onChange={(e) => handleInputChange('dimensions.width', e.target.value)}
              className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              placeholder="Width"
            />
            <input
              type="text"
              value={editData.dimensions?.height || ''}
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
        
        {/* Image Gallery */}
        {editData.images.length > 0 ? (
          <div className="space-y-4">
            {/* Main Image Display */}
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={editData.images[activeImageIndex]?.src}
                alt={`Product image ${activeImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleImageDelete(activeImageIndex)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Image Thumbnails */}
            {editData.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {editData.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      index === activeImageIndex
                        ? 'border-blue-500'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={image.src}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Image className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No images uploaded</p>
          </div>
        )}

        {/* Upload Buttons */}
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className={`flex-1 flex items-center justify-center px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${isMobile ? 'text-base' : ''}`}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Images
          </label>
          <button
            type="button"
            onClick={handleImageAdd}
            className={`px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isMobile ? 'text-base' : ''}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BasicSettings;