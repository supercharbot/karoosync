import React from 'react';
import { Tag, X } from 'lucide-react';

const SaleSettings = ({ editData, handleInputChange, isMobile = false }) => {
  const isOnSale = editData.sale_price && parseFloat(editData.sale_price) > 0;

  const handlePutOnSale = () => {
    // Set sale price to 80% of regular price as default
    const defaultSalePrice = editData.regular_price ? (parseFloat(editData.regular_price) * 0.8).toFixed(2) : '';
    handleInputChange('sale_price', defaultSalePrice);
  };

  const handleRemoveFromSale = () => {
    handleInputChange('sale_price', '');
    handleInputChange('date_on_sale_from', '');
    handleInputChange('date_on_sale_to', '');
  };

  if (isOnSale) {
    return (
      <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
        {/* Sale Status Banner */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-800 dark:text-green-300">
                This product is on sale
              </span>
            </div>
            <button
              onClick={handleRemoveFromSale}
              className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Remove Sale
            </button>
          </div>
        </div>

        {/* Sale Fields */}
        <div className={`bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-4`}>
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>
            Sale Configuration
          </h3>

          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sale Price ($)
              </label>
              <input
                type="text"
                value={editData.sale_price}
                onChange={(e) => handleInputChange('sale_price', e.target.value)}
                className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
                placeholder="0.00"
              />
            </div>
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
                className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
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
                className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not on sale - show put on sale button
  return (
    <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100 mb-1`}>
              Put Product on Sale
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a discounted price for this product
            </p>
          </div>
          <button
            onClick={handlePutOnSale}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Tag className="w-4 h-4" />
            Put on Sale
          </button>
        </div>
      </div>

      {/* Regular Price */}
      <div className={`${isMobile ? 'space-y-3 w-full max-w-full' : 'space-y-4'}`}>
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Pricing</h3>
        
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
      </div>
    </div>
  );
};

export default SaleSettings;