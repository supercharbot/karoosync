import React, { useState, useEffect } from 'react';
import SaleSettings from './SaleSettings';
import { 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Save, 
  X, 
  Plus,
  DollarSign, 
  Hash, 
  Package2, 
  Ruler, 
  Eye, 
  EyeOff, 
  Image, 
  Upload, 
  Download,
  Cloud,
  Truck,
  ToggleLeft,
  ToggleRight,
  FileText,
  AlertCircle,
  Check,
  Zap,
  Users
} from 'lucide-react';

const CreateVariableProductView = ({ 
  variations, 
  onVariationUpdate, 
  selectedVariations,
  onVariationSelectionChange,
  onBulkActionApply 
}) => {
  const [expandedVariation, setExpandedVariation] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkData, setBulkData] = useState({
    regular_price: '',
    sale_price: '',
    date_on_sale_from: '',
    date_on_sale_to: '',
    stock_status: '',
    manage_stock: false,
    stock_quantity: '',
    weight: '',
    shipping_class: '',
    status: ''
  });
  const [bulkFeedback, setBulkFeedback] = useState('');

  const handleVariationChange = (variationId, field, value) => {
    onVariationUpdate(variationId, field, value);
  };

  const handleDimensionChange = (variationId, dimension, value) => {
    const variation = variations.find(v => v.id === variationId);
    const updatedDimensions = {
      ...variation.dimensions,
      [dimension]: value
    };
    handleVariationChange(variationId, 'dimensions', updatedDimensions);
  };

  const handleToggleChange = (variationId, field) => {
    const variation = variations.find(v => v.id === variationId);
    let newValue;
    
    if (field === 'status') {
      newValue = variation.status === 'publish' ? 'private' : 'publish';
    } else {
      newValue = !variation[field];
    }
    
    handleVariationChange(variationId, field, newValue);
  };

  const handleDownloadFileChange = (variationId, fileIndex, field, value) => {
    const variation = variations.find(v => v.id === variationId);
    const updatedDownloads = [...(variation.downloads || [])];
    updatedDownloads[fileIndex] = { ...updatedDownloads[fileIndex], [field]: value };
    handleVariationChange(variationId, 'downloads', updatedDownloads);
  };

  const handleDownloadFileUpload = (variationId, fileIndex, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = {
        name: file.name,
        file: e.target.result,
        type: file.type,
        size: file.size
      };
      
      const variation = variations.find(v => v.id === variationId);
      const updatedDownloads = [...(variation.downloads || [])];
      updatedDownloads[fileIndex] = { ...updatedDownloads[fileIndex], ...fileData };
      handleVariationChange(variationId, 'downloads', updatedDownloads);
    };
    reader.readAsDataURL(file);
  };

  const handleVariationImageUpload = (variationId, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        id: 0,
        src: e.target.result,
        name: file.name,
        alt: `${formatAttributeText(variations.find(v => v.id === variationId)?.attributes || [])} image`
      };
      handleVariationChange(variationId, 'image', imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleVariationImageUrl = (variationId, url) => {
    if (!url.trim()) {
      handleVariationChange(variationId, 'image', null);
      return;
    }
    
    const imageData = {
      id: 0,
      src: url,
      name: 'variation-image',
      alt: `${formatAttributeText(variations.find(v => v.id === variationId)?.attributes || [])} image`
    };
    handleVariationChange(variationId, 'image', imageData);
  };

  const handleVariationImageDelete = (variationId) => {
    handleVariationChange(variationId, 'image', null);
  };

  const toggleVariationExpanded = (variationId) => {
    setExpandedVariation(prev => prev === variationId ? null : variationId);
  };

  const formatAttributeText = (attributes) => {
    if (Array.isArray(attributes)) {
      return attributes.map(attr => `${attr.name}: ${attr.option}`).join(', ');
    }
    return Object.entries(attributes || {}).map(([name, option]) => `${name}: ${option}`).join(', ');
  };

  const handleBulkInputChange = (field, value) => {
    setBulkData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyBulkChanges = (fieldsToApply) => {
    selectedVariations.forEach(variationId => {
      fieldsToApply.forEach(field => {
        if (bulkData[field] !== '' && bulkData[field] !== null && bulkData[field] !== undefined) {
          handleVariationChange(variationId, field, bulkData[field]);
        }
      });
    });
  };

  const applyAllBulkChanges = () => {
    if (selectedVariations.size === 0) {
      setBulkFeedback('No variations selected');
      setTimeout(() => setBulkFeedback(''), 3000);
      return;
    }

    const appliedChanges = [];
    
    // Apply pricing if any pricing fields are filled
    if (bulkData.regular_price || bulkData.sale_price || bulkData.date_on_sale_from || bulkData.date_on_sale_to) {
      const pricingFields = ['regular_price', 'sale_price', 'date_on_sale_from', 'date_on_sale_to'];
      applyBulkChanges(pricingFields);
      appliedChanges.push('pricing');
    }
    
    // Apply inventory if any inventory fields are filled
    if (bulkData.stock_status || bulkData.stock_quantity) {
      const inventoryFields = ['stock_status', 'manage_stock', 'stock_quantity'];
      applyBulkChanges(inventoryFields);
      appliedChanges.push('inventory');
    }
    
    // Apply shipping if any shipping fields are filled
    if (bulkData.weight || bulkData.shipping_class) {
      const shippingFields = ['weight', 'shipping_class'];
      applyBulkChanges(shippingFields);
      appliedChanges.push('shipping');
    }
    
    // Apply status if filled
    if (bulkData.status) {
      selectedVariations.forEach(variationId => {
        handleVariationChange(variationId, 'status', bulkData.status);
      });
      appliedChanges.push('status');
    }
    
    // Show feedback
    if (appliedChanges.length > 0) {
      setBulkFeedback(`Applied ${appliedChanges.join(', ')} to ${selectedVariations.size} variation${selectedVariations.size > 1 ? 's' : ''}`);
      setTimeout(() => setBulkFeedback(''), 3000);
      
      // Clear all bulk data
      setBulkData({
        regular_price: '',
        sale_price: '',
        date_on_sale_from: '',
        date_on_sale_to: '',
        stock_status: '',
        manage_stock: false,
        stock_quantity: '',
        weight: '',
        shipping_class: '',
        status: ''
      });
    }
  };

  const addDownloadFile = (variationId) => {
    const variation = variations.find(v => v.id === variationId);
    const updatedDownloads = [
      ...(variation.downloads || []),
      { id: Date.now(), name: '', file: '' }
    ];
    handleVariationChange(variationId, 'downloads', updatedDownloads);
  };

  const removeDownloadFile = (variationId, fileIndex) => {
    const variation = variations.find(v => v.id === variationId);
    const updatedDownloads = variation.downloads.filter((_, index) => index !== fileIndex);
    handleVariationChange(variationId, 'downloads', updatedDownloads);
  };

  const toggleVariationSelection = (variationId) => {
    onVariationSelectionChange(variationId);
  };

  const selectAllVariations = () => {
    const allIds = new Set(variations.map(v => v.id));
    onVariationSelectionChange(null, allIds);
  };

  const deselectAllVariations = () => {
    onVariationSelectionChange(null, new Set());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bulk Actions Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div 
          className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setShowBulkActions(!showBulkActions)}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <Zap className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
                <span className="text-sm text-gray-500">
                  Apply changes to multiple variations at once{selectedVariations.size > 0 ? ` (${selectedVariations.size} selected)` : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectAllVariations();
                }}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deselectAllVariations();
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Deselect All
              </button>
              <ChevronDown className={`w-4 h-4 transition-transform ${showBulkActions ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {showBulkActions && (
          <div className="p-6">
            {bulkFeedback && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">{bulkFeedback}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Pricing Section */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Pricing
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Regular Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkData.regular_price}
                      onChange={(e) => handleBulkInputChange('regular_price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkData.sale_price}
                      onChange={(e) => handleBulkInputChange('sale_price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sale Start Date</label>
                    <input
                      type="date"
                      value={bulkData.date_on_sale_from}
                      onChange={(e) => handleBulkInputChange('date_on_sale_from', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sale End Date</label>
                    <input
                      type="date"
                      value={bulkData.date_on_sale_to}
                      onChange={(e) => handleBulkInputChange('date_on_sale_to', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Inventory Section */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Inventory
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
                    <select
                      value={bulkData.stock_status}
                      onChange={(e) => handleBulkInputChange('stock_status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="instock">In Stock</option>
                      <option value="outofstock">Out of Stock</option>
                      <option value="onbackorder">On Backorder</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      value={bulkData.stock_quantity}
                      onChange={(e) => handleBulkInputChange('stock_quantity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manage Stock</label>
                    <select
                      value={bulkData.manage_stock}
                      onChange={(e) => handleBulkInputChange('manage_stock', e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="true">Enable</option>
                      <option value="false">Disable</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipping Section */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <Truck className="w-4 h-4 mr-2" />
                  Shipping
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkData.weight}
                      onChange={(e) => handleBulkInputChange('weight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={bulkData.status}
                      onChange={(e) => handleBulkInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="publish">Enable All</option>
                      <option value="private">Disable All</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={applyAllBulkChanges}
                  disabled={selectedVariations.size === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Apply to Selected ({selectedVariations.size})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Variations List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Product Variations</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage individual variation settings, pricing, and inventory
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {variations.map((variation) => (
            <div key={variation.id} className="p-6">
              {/* Variation Header */}
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
                onClick={() => toggleVariationExpanded(variation.id)}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedVariations.has(variation.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleVariationSelection(variation.id);
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-shrink-0">
                    <Package2 className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {formatAttributeText(variation.attributes || [])}
                    </h4>
                    <div className="flex items-center space-x-4 mt-1">
                      {variation.regular_price && (
                        <span className="text-sm text-gray-600">
                          Price: ${variation.regular_price}
                        </span>
                      )}
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        variation.stock_status === 'instock' 
                          ? 'bg-green-100 text-green-800'
                          : variation.stock_status === 'outofstock'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {variation.stock_status === 'instock' ? 'In Stock' :
                         variation.stock_status === 'outofstock' ? 'Out of Stock' : 
                         'On Backorder'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {expandedVariation === variation.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Variation Content */}
              {expandedVariation === variation.id && (
                <div className="mt-6 space-y-6">
                  {/* Image Management Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Image className="w-5 h-5 mr-2" />
                      Variation Image
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Current Image Display */}
                      <div className="flex flex-col items-center">
                        <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 relative group">
                          {variation.image?.src ? (
                            <>
                              <img
                                src={variation.image.src}
                                alt={variation.image.alt || 'Variation image'}
                                className="w-full h-full object-cover rounded-lg"
                              />
                              <button
                                onClick={() => handleVariationImageDelete(variation.id)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center">
                              <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">No image set</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Image Upload Controls */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image URL
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={variation.image?.src || ''}
                              onChange={(e) => handleVariationImageUrl(variation.id, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="https://example.com/image.jpg"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Alt Text
                          </label>
                          <input
                            type="text"
                            value={variation.image?.alt || ''}
                            onChange={(e) => {
                              const updatedImage = variation.image ? { ...variation.image, alt: e.target.value } : { src: '', alt: e.target.value };
                              handleVariationChange(variation.id, 'image', updatedImage);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Describe the image for accessibility"
                          />
                        </div>

                        <div className="text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                handleVariationImageUpload(variation.id, file);
                              }
                            }}
                            className="hidden"
                            id={`image-upload-${variation.id}`}
                          />
                          <label
                            htmlFor={`image-upload-${variation.id}`}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Toggles */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <ToggleLeft className="w-5 h-5 mr-2" />
                      Status Settings
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => handleToggleChange(variation.id, 'status')}
                        className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          variation.status === 'publish'
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-gray-100 border-gray-200 text-gray-600'
                        }`}
                      >
                        {variation.status === 'publish' ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {variation.status === 'publish' ? 'Published' : 'Private'}
                        </span>
                      </button>

                      <button
                        onClick={() => handleToggleChange(variation.id, 'virtual')}
                        className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          variation.virtual
                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                            : 'bg-gray-100 border-gray-200 text-gray-600'
                        }`}
                      >
                        <Cloud className="w-4 h-4" />
                        <span className="text-sm font-medium">Virtual</span>
                      </button>

                      <button
                        onClick={() => handleToggleChange(variation.id, 'downloadable')}
                        className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          variation.downloadable
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-100 border-gray-200 text-gray-600'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Downloadable</span>
                      </button>
                    </div>
                  </div>

                  {/* Basic Information Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Hash className="w-5 h-5 mr-2" />
                      Basic Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* SKU */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SKU
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={variation.sku || ''}
                            onChange={(e) => handleVariationChange(variation.id, 'sku', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="variation-sku"
                          />
                        </div>
                      </div>

                      {/* Regular Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Regular Price
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={variation.regular_price || ''}
                            onChange={(e) => handleVariationChange(variation.id, 'regular_price', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Sale Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sale Price
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={variation.sale_price || ''}
                            onChange={(e) => handleVariationChange(variation.id, 'sale_price', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sale Settings */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      Sale Settings
                    </h4>
                    <SaleSettings
                      editData={variation}
                      handleInputChange={(field, value) => handleVariationChange(variation.id, field, value)}
                      isMobile={false}
                    />
                  </div>

                  {/* Inventory Management Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Inventory Management
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stock Status
                          </label>
                          <select
                            value={variation.stock_status || 'instock'}
                            onChange={(e) => handleVariationChange(variation.id, 'stock_status', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="instock">In Stock</option>
                            <option value="outofstock">Out of Stock</option>
                            <option value="onbackorder">On Backorder</option>
                          </select>
                        </div>

                        <div className="flex items-center">
                          <button
                            onClick={() => handleToggleChange(variation.id, 'manage_stock')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                              variation.manage_stock
                                ? 'bg-orange-50 border-orange-200 text-orange-700'
                                : 'bg-gray-100 border-gray-200 text-gray-600'
                            }`}
                          >
                            <Package className="w-4 h-4" />
                            <span className="text-sm font-medium">Manage Stock</span>
                          </button>
                        </div>
                      </div>

                      {variation.manage_stock && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Stock Quantity
                            </label>
                            <input
                              type="number"
                              value={variation.stock_quantity || ''}
                              onChange={(e) => handleVariationChange(variation.id, 'stock_quantity', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Allow Backorders
                            </label>
                            <select
                              value={variation.backorders || 'no'}
                              onChange={(e) => handleVariationChange(variation.id, 'backorders', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="no">Do not allow</option>
                              <option value="notify">Allow, but notify customer</option>
                              <option value="yes">Allow</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Low Stock Threshold
                            </label>
                            <input
                              type="number"
                              value={variation.low_stock_amount || ''}
                              onChange={(e) => handleVariationChange(variation.id, 'low_stock_amount', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping Section (hidden when virtual) */}
                  {!variation.virtual && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Truck className="w-5 h-5 mr-2" />
                        Shipping
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Weight (optional)
                            </label>
                            <div className="relative">
                              <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                value={variation.weight || ''}
                                onChange={(e) => handleVariationChange(variation.id, 'weight', e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Dimensions (L × W × H)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={variation.dimensions?.length || ''}
                                onChange={(e) => handleDimensionChange(variation.id, 'length', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Length"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={variation.dimensions?.width || ''}
                                onChange={(e) => handleDimensionChange(variation.id, 'width', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Width"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={variation.dimensions?.height || ''}
                                onChange={(e) => handleDimensionChange(variation.id, 'height', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Height"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Downloadable Files Section */}
                  {variation.downloadable && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900 flex items-center">
                          <Download className="w-5 h-5 mr-2" />
                          Downloadable Files
                        </h4>
                        <button
                          onClick={() => addDownloadFile(variation.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add File
                        </button>
                      </div>

                      <div className="space-y-4">
                        {(variation.downloads || []).map((download, index) => (
                          <div key={download.id || index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900">File {index + 1}</h5>
                              <button
                                onClick={() => removeDownloadFile(variation.id, index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  File Name
                                </label>
                                <input
                                  type="text"
                                  value={download.name || ''}
                                  onChange={(e) => handleDownloadFileChange(variation.id, index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="download-file.pdf"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  File URL
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="url"
                                    value={download.file || ''}
                                    onChange={(e) => handleDownloadFileChange(variation.id, index, 'file', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://example.com/file.pdf"
                                  />
                                  <input
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        handleDownloadFileUpload(variation.id, index, file);
                                      }
                                    }}
                                    className="hidden"
                                    id={`file-upload-${variation.id}-${index}`}
                                  />
                                  <label
                                    htmlFor={`file-upload-${variation.id}-${index}`}
                                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                                  >
                                    Upload
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* File Info Display */}
                            {download.type && (
                              <div className="bg-gray-50 p-3 rounded-lg mt-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    Type: {download.type}
                                  </span>
                                  {download.size && (
                                    <span className="text-gray-600">
                                      Size: {(download.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {(!variation.downloads || variation.downloads.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <Download className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p>No downloadable files added yet</p>
                            <p className="text-sm">Click "Add File" to get started</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Additional Information
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variation Description
                      </label>
                      <textarea
                        value={variation.description || ''}
                        onChange={(e) => handleVariationChange(variation.id, 'description', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe this specific variation..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {variations.length === 0 && (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Variations Found</h3>
              <p className="text-gray-600">
                This variable product doesn't have any variations yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateVariableProductView;