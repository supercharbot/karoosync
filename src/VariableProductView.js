import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { loadVariations, updateProduct } from './api';
import { ArrowLeft, ChevronDown, ChevronUp, Package, Edit3, Save, X, Plus, Minus, DollarSign, Hash, Package2, Ruler, Eye, EyeOff, Image, Upload } from 'lucide-react';

const VariableProductView = ({ product, onBack, onProductUpdate }) => {
  const { getAuthToken } = useAuth();
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [expandedVariation, setExpandedVariation] = useState(null);
  const [editingParent, setEditingParent] = useState(false);
  
  // Parent product edit data
  const [parentEditData, setParentEditData] = useState({
    name: product.name || '',
    description: product.description || '',
    short_description: product.short_description || '',
    categories: product.categories || [],
    images: product.images || [],
    status: product.status || 'publish'
  });

  useEffect(() => {
    loadProductVariations();
  }, [product.id]);

  const loadProductVariations = async () => {
    try {
      setLoading(true);
      setError('');
      const authToken = await getAuthToken();
      const result = await loadVariations(product.id, authToken);
      
      if (result.success) {
        setVariations(result.variations || []);
      } else {
        setError(result.error || 'Failed to load variations');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleParentInputChange = (field, value) => {
    setParentEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVariationChange = (variationId, field, value) => {
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? { ...variation, [field]: value }
        : variation
    ));
  };

  const handleVariationImageAdd = (variationId, imageUrl) => {
    if (!imageUrl.trim()) return;
    
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? { 
            ...variation, 
            image: {
              id: 0,
              src: imageUrl,
              name: 'variation-image',
              alt: formatAttributeText(variation.attributes || [])
            }
          }
        : variation
    ));
  };

  const handleVariationImageDelete = (variationId) => {
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? { ...variation, image: null }
        : variation
    ));
  };

  const handleVariationFileUpload = (variationId, event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const file = files[0]; // Only handle first file for variations
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageData = {
        id: 0,
        src: e.target.result,
        name: file.name,
        alt: formatAttributeText(variations.find(v => v.id === variationId)?.attributes || [])
      };
      
      setVariations(prev => prev.map(variation => 
        variation.id === variationId 
          ? { ...variation, image: imageData }
          : variation
      ));
    };
    
    reader.readAsDataURL(file);
  };

  const toggleVariationExpanded = (variationId) => {
    setExpandedVariation(expandedVariation === variationId ? null : variationId);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('Updating parent product...');
    
    try {
      const authToken = await getAuthToken();
      
      // Prepare data structure for backend
      const updateData = {
        ...parentEditData,
        type: 'variable',
        variations: variations.map(variation => ({
          id: variation.id,
          regular_price: variation.regular_price || '',
          sale_price: variation.sale_price || '',
          sku: variation.sku || '',
          gtin: variation.gtin || '',
          status: variation.status || 'publish',
          downloadable: variation.downloadable || false,
          virtual: variation.virtual || false,
          manage_stock: variation.manage_stock || false,
          stock_status: variation.stock_status || 'instock',
          weight: variation.weight || '',
          dimensions: variation.dimensions || { length: '', width: '', height: '' },
          shipping_class: variation.shipping_class || '',
          description: variation.description || '',
          image: variation.image || null
        }))
      };

      setSaveStatus('Updating variations...');
      const result = await updateProduct(product.id, updateData, authToken);
      
      if (result.success) {
        const successCount = result.variationResults?.filter(r => r.success).length || 0;
        const totalCount = result.variationResults?.length || 0;
        setSaveStatus(`✅ Saved! Updated ${successCount}/${totalCount} variations`);
        onProductUpdate(result.data);
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setSaveStatus(`Error: ${result.error}`);
      }
    } catch (err) {
      setSaveStatus(`Error: ${err.message}`);
    }
    
    setSaving(false);
  };

  const formatAttributeText = (attributes) => {
    return attributes
      .map(attr => `${attr.name}: ${attr.option}`)
      .join(', ');
  };

  const getPriceRange = () => {
    if (variations.length === 0) return '$0';
    
    const prices = variations
      .map(v => parseFloat(v.sale_price || v.regular_price || 0))
      .filter(p => p > 0);
    
    if (prices.length === 0) return '$0';
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    return min === max ? `$${min}` : `$${min} - $${max}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading variations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Product Details</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          {saveStatus && (
            <span className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {saveStatus}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Variations List */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Product Variations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage individual variation pricing, images, and details
                </p>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {variations.map((variation) => (
                  <div key={variation.id} className="p-6">
                    {/* Variation Header */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleVariationExpanded(variation.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Package2 className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {formatAttributeText(variation.attributes || [])}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span>Price: ${variation.sale_price || variation.regular_price || '0'}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              variation.stock_status === 'instock' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {variation.stock_status || 'instock'}
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

                    {/* Expanded Variation Form */}
                    {expandedVariation === variation.id && (
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        
                        {/* Pricing */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Regular Price
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              value={variation.regular_price || ''}
                              onChange={(e) => handleVariationChange(variation.id, 'regular_price', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Sale Price
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              value={variation.sale_price || ''}
                              onChange={(e) => handleVariationChange(variation.id, 'sale_price', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {/* SKU */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            SKU
                          </label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={variation.sku || ''}
                              onChange={(e) => handleVariationChange(variation.id, 'sku', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="Product SKU"
                            />
                          </div>
                        </div>

                        {/* Stock Status */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Stock Status
                          </label>
                          <select
                            value={variation.stock_status || 'instock'}
                            onChange={(e) => handleVariationChange(variation.id, 'stock_status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="instock">In Stock</option>
                            <option value="outofstock">Out of Stock</option>
                            <option value="onbackorder">On Backorder</option>
                          </select>
                        </div>

                        {/* Variation Image */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Variation Image
                          </label>
                          
                          {variation.image ? (
                            <div className="space-y-3">
                              {/* Current Image Display */}
                              <div className="relative w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                <img
                                  src={variation.image.src}
                                  alt={variation.image.alt || 'Variation image'}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => handleVariationImageDelete(variation.id)}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                              <Image className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No variation image</p>
                            </div>
                          )}

                          {/* Upload Controls */}
                          <div className="flex gap-2 mt-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleVariationFileUpload(variation.id, e)}
                              className="hidden"
                              id={`variation-image-upload-${variation.id}`}
                            />
                            <label
                              htmlFor={`variation-image-upload-${variation.id}`}
                              className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-sm"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Image
                            </label>
                            
                            <div className="flex-1">
                              <input
                                type="url"
                                placeholder="Or paste image URL..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleVariationImageAdd(variation.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Status Checkboxes */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status Options
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={variation.status === 'publish'}
                                onChange={(e) => handleVariationChange(variation.id, 'status', e.target.checked ? 'publish' : 'private')}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={variation.downloadable || false}
                                onChange={(e) => handleVariationChange(variation.id, 'downloadable', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Downloadable</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={variation.virtual || false}
                                onChange={(e) => handleVariationChange(variation.id, 'virtual', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Virtual</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={variation.manage_stock || false}
                                onChange={(e) => handleVariationChange(variation.id, 'manage_stock', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Manage Stock</span>
                            </label>
                          </div>
                        </div>

                        {/* Weight */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Weight
                          </label>
                          <input
                            type="text"
                            value={variation.weight || ''}
                            onChange={(e) => handleVariationChange(variation.id, 'weight', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="0"
                          />
                        </div>

                        {/* Dimensions */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dimensions
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <input
                                type="text"
                                value={variation.dimensions?.length || ''}
                                onChange={(e) => handleVariationChange(variation.id, 'dimensions', {
                                  ...variation.dimensions,
                                  length: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Length"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={variation.dimensions?.width || ''}
                                onChange={(e) => handleVariationChange(variation.id, 'dimensions', {
                                  ...variation.dimensions,
                                  width: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Width"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={variation.dimensions?.height || ''}
                                onChange={(e) => handleVariationChange(variation.id, 'dimensions', {
                                  ...variation.dimensions,
                                  height: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Height"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {variations.length === 0 && (
                  <div className="p-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Variations Found</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      This variable product doesn't have any variations yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariableProductView;