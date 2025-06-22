import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { loadVariations, updateProduct } from './api';
import { ArrowLeft, ChevronDown, ChevronUp, Package, Edit3, Save, X, Plus, Minus, DollarSign, Hash, Package2, Ruler, Eye, EyeOff, Image, Upload, Settings, List } from 'lucide-react';

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

  const toggleVariationExpanded = (variationId) => {
    setExpandedVariation(prev => prev === variationId ? null : variationId);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('Saving variations...');
    
    try {
      const token = await getAuthToken();
      if (!token) {
        setSaveStatus('Error: Authentication required');
        setSaving(false);
        return;
      }

      let successCount = 0;
      const totalCount = variations.length;

      // Update each variation
      for (const variation of variations) {
        try {
          const result = await updateProduct(variation.id, variation, token);
          if (result.success) {
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to update variation ${variation.id}:`, err);
        }
      }

      if (successCount === totalCount) {
        setSaveStatus(`Successfully updated all ${totalCount} variations`);
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setSaveStatus(`Updated ${successCount}/${totalCount} variations`);
        setTimeout(() => setSaveStatus(''), 4000);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Tabs moved to header and inline with save button */}
            <nav className="flex space-x-8">
              <button
                onClick={onBack}
                className="py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Product Details
              </button>
              <button
                className="py-2 px-1 border-b-2 font-medium text-sm border-blue-500 text-blue-600 dark:text-blue-400"
              >
                <List className="w-4 h-4 inline mr-2" />
                Manage Variations
              </button>
            </nav>
            
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
                <span>{saving ? 'Saving...' : 'Save Product'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

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
                              placeholder="VAR-SKU"
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

                        {/* Weight */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Weight
                          </label>
                          <div className="relative">
                            <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={variation.weight || ''}
                              onChange={(e) => handleVariationChange(variation.id, 'weight', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Stock Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Stock Quantity
                          </label>
                          <input
                            type="number"
                            value={variation.stock_quantity || ''}
                            onChange={(e) => handleVariationChange(variation.id, 'stock_quantity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="0"
                          />
                        </div>

                        {/* Variation Image */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Variation Image
                          </label>
                          <div className="flex items-center space-x-4">
                            {variation.image?.src ? (
                              <div className="relative">
                                <img
                                  src={variation.image.src}
                                  alt="Variation"
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                />
                                <button
                                  onClick={() => handleVariationImageDelete(variation.id)}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                                <Image className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="Enter image URL"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleVariationImageAdd(variation.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>
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