import React from 'react';

const AdvancedSettings = ({ editData, handleInputChange, isMobile = false }) => {
  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      {/* Advanced Product Settings */}
      <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Advanced Product Settings</h3>
        
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

        {/* Product Type and Flags */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Type
            </label>
            <select
              value={editData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            >
              <option value="simple">Simple Product</option>
              <option value="grouped">Grouped Product</option>
              <option value="external">External/Affiliate Product</option>
              <option value="variable">Variable Product</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Menu Order
            </label>
            <input
              type="number"
              value={editData.menu_order}
              onChange={(e) => handleInputChange('menu_order', parseInt(e.target.value) || 0)}
              className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              placeholder="0"
            />
          </div>
        </div>

        {/* Product Flags */}
        <div className="space-y-3">
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
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editData.reviews_allowed}
              onChange={(e) => handleInputChange('reviews_allowed', e.target.checked)}
              className={`mr-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-blue-600 rounded`}
            />
            <span className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-700 dark:text-gray-300`}>Allow Reviews</span>
          </label>
        </div>
      </div>

      {/* Advanced Inventory */}
      <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Advanced Inventory</h3>
        
        <div className="flex items-center mb-4">
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
              Backorders
            </label>
            <select
              value={editData.backorders}
              onChange={(e) => handleInputChange('backorders', e.target.value)}
              className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
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

      {/* Downloadable Product */}
      {editData.downloadable && (
        <div className="space-y-4">
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Downloadable Product</h3>
          
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Download Limit
              </label>
              <input
                type="number"
                value={editData.download_limit}
                onChange={(e) => handleInputChange('download_limit', parseInt(e.target.value) || -1)}
                className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
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
                className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
                placeholder="-1 for no expiry"
              />
            </div>
          </div>
        </div>
      )}

      {/* Additional Settings */}
      <div className="space-y-4">
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Additional Settings</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Purchase Note
          </label>
          <textarea
            value={editData.purchase_note}
            onChange={(e) => handleInputChange('purchase_note', e.target.value)}
            rows={3}
            className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            placeholder="Note to customer after purchase"
          />
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettings;