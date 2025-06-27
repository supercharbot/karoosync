import React, { useState } from 'react';
import { Tag, X, Percent } from 'lucide-react';

const SaleSettings = ({ editData, handleInputChange, isMobile = false }) => {
  // Track if user has activated sale mode
  const [saleMode, setSaleMode] = useState(() => {
    return !!(editData.sale_price || editData.date_on_sale_from || editData.date_on_sale_to);
  });

  // Track percentage input separately 
  const [percentageInput, setPercentageInput] = useState(() => {
    if (editData.regular_price && editData.sale_price) {
      const regular = parseFloat(editData.regular_price);
      const sale = parseFloat(editData.sale_price);
      if (regular > 0 && sale >= 0 && sale < regular) {
        return Math.round(((regular - sale) / regular) * 100).toString();
      }
    }
    return '';
  });

  // Format date input with slashes
  const formatDateInput = (value) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  // Convert dd/mm/yyyy to ISO format for WooCommerce
  const convertToISODate = (dateString) => {
    if (!dateString || dateString.length < 10) return '';
    
    const [day, month, year] = dateString.split('/');
    if (day && month && year && year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
    }
    return '';
  };

  // Convert ISO date back to dd/mm/yyyy for display
  const convertFromISODate = (isoString) => {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (field, value) => {
    const formattedValue = formatDateInput(value);
    const isoDate = convertToISODate(formattedValue);
    handleInputChange(field, isoDate);
  };

  const handlePutOnSale = () => {
    setSaleMode(true);
    const defaultSalePrice = editData.regular_price ? (parseFloat(editData.regular_price) * 0.8).toFixed(2) : '';
    handleInputChange('sale_price', defaultSalePrice);
    if (defaultSalePrice) {
      setPercentageInput('20');
    }
  };

  const handleRemoveFromSale = () => {
    setSaleMode(false);
    setPercentageInput('');
    handleInputChange('sale_price', '');
    handleInputChange('date_on_sale_from', '');
    handleInputChange('date_on_sale_to', '');
  };

  const handlePercentageChange = (value) => {
    setPercentageInput(value);
    
    if (value === '' || !editData.regular_price) {
      return;
    }
    
    const percentage = parseFloat(value);
    if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
      const regularPrice = parseFloat(editData.regular_price);
      const discountAmount = (regularPrice * percentage) / 100;
      const salePrice = (regularPrice - discountAmount).toFixed(2);
      handleInputChange('sale_price', salePrice);
    }
  };

  if (saleMode) {
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

          {/* Percentage Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Discount Percentage (%)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={percentageInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 100)) {
                      handlePercentageChange(value);
                    }
                  }}
                  className={`w-full px-4 pr-10 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  placeholder="20"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">off regular price</span>
            </div>
          </div>

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
                type="text"
                autoComplete="off"
                value={convertFromISODate(editData.date_on_sale_from)}
                onChange={(e) => handleDateChange('date_on_sale_from', e.target.value)}
                className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
                placeholder="DD/MM/YYYY"
                maxLength="10"
              />

            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sale End Date
              </label>
              <input
                type="text"
                autoComplete="off"
                value={convertFromISODate(editData.date_on_sale_to)}
                onChange={(e) => handleDateChange('date_on_sale_to', e.target.value)}
                className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
                placeholder="DD/MM/YYYY"
                maxLength="10"
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