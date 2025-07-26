import React, { useState } from 'react';
import { Image, X, Upload, Plus } from 'lucide-react';
import SaleSettings from './SaleSettings';
import WysiwygEditor from './WysiwygEditor';
import { loadWooCommerceShippingClasses } from './api';
import { useAuth } from './AuthContext';

const BasicSettings = ({ 
  editData, 
  handleInputChange, 
  handleImageAdd, 
  handleFileUpload, 
  handleImageDelete, 
  activeImageIndex, 
  setActiveImageIndex,
  isMobile = false,
  hidepricing = false
}) => {
  const { getAuthToken } = useAuth();
  const [availableShippingClasses, setAvailableShippingClasses] = useState([]);
  const [loadingShippingClasses, setLoadingShippingClasses] = useState(false);
  const [showShippingClassSelector, setShowShippingClassSelector] = useState(false);

  const fetchExistingShippingClasses = async () => {
    setLoadingShippingClasses(true);
    try {
      const authToken = await getAuthToken();
      const result = await loadWooCommerceShippingClasses(authToken);
      if (result.success) {
        setAvailableShippingClasses(result.shipping_classes || []);
        setShowShippingClassSelector(true);
      }
    } catch (error) {
      console.error('Error fetching shipping classes:', error);
    } finally {
      setLoadingShippingClasses(false);
    }
  };

  const addExistingShippingClass = (shippingClass) => {
    handleInputChange('shipping_class', shippingClass.slug);
    setShowShippingClassSelector(false);
  };

  return (
    <div className={`${isMobile ? 'p-2 pb-20 w-full max-w-full min-w-0' : 'p-6'} ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      
      {/* Sale Settings */}
      {!hidepricing && (
        <SaleSettings 
          editData={editData}
          handleInputChange={handleInputChange}
          isMobile={isMobile}
        />
      )}

      {/* Basic Product Information */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-4 ${isMobile ? '-mx-4' : ''}`}>
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Basic Information</h3>
        
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product Name
          </label>
          <input
            type="text"
            value={editData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="Enter product name"
          />
        </div>

        {/* SKU */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            SKU
          </label>
          <input
            type="text"
            value={editData.sku || ''}
            onChange={(e) => handleInputChange('sku', e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="Product SKU"
          />
        </div>

        {/* Short Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Short Description
          </label>
          <WysiwygEditor
            value={editData.short_description || ''}
            onChange={(value) => handleInputChange('short_description', value)}
            placeholder="Brief product description"
            isMobile={isMobile}
            minHeight="120px"
          />
        </div>

        {/* Full Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <WysiwygEditor
            value={editData.description || ''}
            onChange={(value) => handleInputChange('description', value)}
            placeholder="Detailed product description"
            isMobile={isMobile}
            minHeight="200px"
          />
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
            className={`flex-1 flex items-center justify-center px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${isMobile ? 'text-base' : 'text-sm'}`}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Images
          </label>
        </div>

        {/* Add Image URL */}
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Or paste image URL and press Enter..."
            className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : 'text-sm'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleImageAdd(e.target.value);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.target.closest('div').querySelector('input[type="url"]');
              if (input && input.value) {
                handleImageAdd(input.value);
                input.value = '';
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Status & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={editData.status || 'publish'}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="publish">Published</option>
            <option value="draft">Draft</option>
            <option value="private">Private</option>
          </select>
        </div>

        {/* Catalog Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Catalog Visibility
          </label>
          <select
            value={editData.catalog_visibility || 'visible'}
            onChange={(e) => handleInputChange('catalog_visibility', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="visible">Visible</option>
            <option value="catalog">Catalog Only</option>
            <option value="search">Search Only</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.featured || false}
            onChange={(e) => handleInputChange('featured', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Featured</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.virtual || false}
            onChange={(e) => handleInputChange('virtual', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Virtual</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.downloadable || false}
            onChange={(e) => handleInputChange('downloadable', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Downloadable</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.reviews_allowed !== false}
            onChange={(e) => handleInputChange('reviews_allowed', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Reviews</span>
        </label>
      </div>

      {/* Inventory Section */}
      {!hidepricing && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Inventory</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manage Stock */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.manage_stock || false}
                onChange={(e) => handleInputChange('manage_stock', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Manage stock?</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.sold_individually || false}
                onChange={(e) => handleInputChange('sold_individually', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Sold individually?</span>
            </label>
          </div>

          {editData.manage_stock && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={editData.stock_quantity || ''}
                  onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Backorders
                </label>
                <select
                  value={editData.backorders || 'no'}
                  onChange={(e) => handleInputChange('backorders', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="no">Do not allow</option>
                  <option value="notify">Allow, but notify customer</option>
                  <option value="yes">Allow</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock Status
            </label>
            <select
              value={editData.stock_status || 'instock'}
              onChange={(e) => handleInputChange('stock_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 md:w-1/2"
            >
              <option value="instock">In stock</option>
              <option value="outofstock">Out of stock</option>
              <option value="onbackorder">On backorder</option>
            </select>
          </div>
        </div>
      )}

      {/* Shipping */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">Shipping</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Weight
            </label>
            <input
              type="text"
              value={editData.weight || ''}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shipping Class
            </label>
            <div className="flex gap-2 mb-2">
              <div className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300 min-h-[42px] flex items-center">
                {editData.shipping_class || 'No shipping class selected'}
              </div>
              <button
                onClick={fetchExistingShippingClasses}
                disabled={loadingShippingClasses}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loadingShippingClasses ? 'Loading...' : 'Browse'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dimensions
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={editData.dimensions?.length || ''}
              onChange={(e) => handleInputChange('dimensions.length', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Length"
            />
            <input
              type="text"
              value={editData.dimensions?.width || ''}
              onChange={(e) => handleInputChange('dimensions.width', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Width"
            />
            <input
              type="text"
              value={editData.dimensions?.height || ''}
              onChange={(e) => handleInputChange('dimensions.height', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Height"
            />
          </div>
        </div>
      </div>

      {/* Shipping Class Selector Modal */}
      {showShippingClassSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Select Shipping Class</h3>
              <button
                onClick={() => setShowShippingClassSelector(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {availableShippingClasses.map((shippingClass) => (
                <button
                  key={shippingClass.id}
                  onClick={() => addExistingShippingClass(shippingClass)}
                  className="w-full text-left p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">{shippingClass.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{shippingClass.slug}</div>
                  {shippingClass.description && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{shippingClass.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicSettings;