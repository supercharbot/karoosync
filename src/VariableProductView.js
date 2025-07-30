import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { loadVariations, updateProduct, loadWooCommerceShippingClasses } from './api';
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

const VariableProductView = ({ 
  product, 
  onBack, 
  onProductUpdate,
  // Create mode props
  createMode = false,
  variations: propVariations,
  onVariationUpdate,
  selectedVariations,
  onVariationSelectionChange
}) => {
  const { getAuthToken } = useAuth();
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(!createMode); // Don't load in create mode
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [expandedVariation, setExpandedVariation] = useState(null);
  const [shippingClasses, setShippingClasses] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Define initial bulk data state to prevent field loss during resets
  const initialBulkData = {
    sku: '',
    regular_price: '',
    sale_price: '',
    date_on_sale_from: '',
    date_on_sale_to: '',
    stock_status: 'instock',
    manage_stock: false,
    stock_quantity: '',
    weight: '',
    shipping_class: '',
    status: 'publish',
    virtual: false,
    downloadable: false,
    backorders: 'no',
    low_stock_amount: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    description: '',
    image: null,
    downloads: []
  };

  const [bulkData, setBulkData] = useState(initialBulkData);
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [changedVariations, setChangedVariations] = useState(new Set());

  useEffect(() => {
    if (createMode) {
      // Use variations from props in create mode
      setVariations(propVariations || []);
      setLoading(false);
    } else {
      // Load from API in edit mode
      loadProductVariations();
    }
    loadShippingClasses();
  }, [createMode, propVariations, product?.id]);

  const loadProductVariations = async () => {
    try {
      setLoading(true);
      setError('');
      const authToken = await getAuthToken();
      const result = await loadVariations(product.id, authToken);
      
      if (result.success) {
        // Initialize variations with proper default values
        const initializedVariations = (result.variations || []).map(variation => ({
          ...variation,
          // Ensure all fields have default values
          sku: variation.sku || '',
          regular_price: variation.regular_price || '',
          sale_price: variation.sale_price || '',
          stock_status: variation.stock_status || 'instock',
          weight: variation.weight || '',
          dimensions: variation.dimensions || { length: '', width: '', height: '' },
          shipping_class: variation.shipping_class || '',
          description: variation.description || '',
          // Status toggles
          status: variation.status || 'publish', // enabled/disabled
          downloadable: variation.downloadable || false,
          virtual: variation.virtual || false,
          manage_stock: variation.manage_stock || false,
          // Stock management
          stock_quantity: variation.stock_quantity || '',
          backorders: variation.backorders || 'no',
          low_stock_amount: variation.low_stock_amount || '',
          // Downloadable files
          downloads: variation.downloads || []
        }));
        setVariations(initializedVariations);
      } else {
        setError(result.error || 'Failed to load variations');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadShippingClasses = async () => {
    try {
      const authToken = await getAuthToken();
      const result = await loadWooCommerceShippingClasses(authToken);
      if (result.success) {
        setShippingClasses(result.shipping_classes || []);
      }
    } catch (err) {
      console.error('Failed to load shipping classes:', err);
    }
  };

  const handleVariationChange = (variationId, field, value) => {
    if (createMode) {
      // Use callback in create mode
      onVariationUpdate(variationId, field, value);
    } else {
      // Update local state in edit mode
      setVariations(prev => prev.map(variation => 
        variation.id === variationId 
          ? { ...variation, [field]: value }
          : variation
      ));
      setChangedVariations(prev => new Set([...prev, variationId]));
    }
  };

  const handleDimensionChange = (variationId, dimension, value) => {
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? { 
            ...variation, 
            dimensions: {
              ...variation.dimensions,
              [dimension]: value
            }
          }
        : variation
    ));
  };

  const handleToggleChange = (variationId, field) => {
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? { 
            ...variation, 
            [field]: field === 'status' 
              ? (variation.status === 'publish' ? 'private' : 'publish')
              : !variation[field] 
          }
        : variation
    ));
  };

  const handleDownloadFileChange = (variationId, fileIndex, field, value) => {
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? {
            ...variation,
            downloads: variation.downloads.map((download, index) => 
              index === fileIndex 
                ? { ...download, [field]: value }
                : download
            )
          }
        : variation
    ));
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
      
      setVariations(prev => prev.map(variation => 
        variation.id === variationId 
          ? {
              ...variation,
              downloads: variation.downloads.map((download, index) => 
                index === fileIndex 
                  ? { ...download, ...fileData }
                  : download
              )
            }
          : variation
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleVariationImageUpload = (variationId, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setVariations(prev => prev.map(variation => 
        variation.id === variationId 
          ? {
              ...variation,
              image: {
                id: 0,
                src: e.target.result,
                name: file.name,
                alt: `${formatAttributeText(variation.attributes || [])} image`
              }
            }
          : variation
      ));
    };
    reader.readAsDataURL(file);
    setChangedVariations(prev => new Set([...prev, variationId]));
  };

  const handleVariationImageUrl = (variationId, url) => {
    if (!url.trim()) return;
    
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? {
            ...variation,
            image: {
              id: 0,
              src: url,
              name: 'variation-image',
              alt: `${formatAttributeText(variation.attributes || [])} image`
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
    setChangedVariations(prev => new Set([...prev, variationId]));
  };

  const handleBulkInputChange = (field, value) => {
    setBulkData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyBulkChanges = (fieldsToApply) => {
    if (createMode) {
      // In create mode, apply only to selected variations
      selectedVariations?.forEach(variationId => {
        fieldsToApply.forEach(field => {
          if (bulkData[field] !== '' && bulkData[field] !== null && bulkData[field] !== undefined) {
            onVariationUpdate(variationId, field, bulkData[field]);
          }
        });
      });
    } else {
      // In edit mode, apply to all variations
      setVariations(prev => prev.map(variation => {
        const updates = {};
        
        // Apply only the specified fields that have values
        fieldsToApply.forEach(field => {
          if (bulkData[field] !== '' && bulkData[field] !== null && bulkData[field] !== undefined) {
            if (field === 'date_on_sale_from' || field === 'date_on_sale_to') {
              updates[field] = bulkData[field];
            } else {
              updates[field] = bulkData[field];
            }
          }
        });
        
        return { ...variation, ...updates };
      }));
    }
  };

  const applyAllBulkChanges = () => {
    if (createMode) {
      // In create mode, apply template to ALL variations
      variations.forEach(variation => {
        // Apply all non-empty fields from the template
        Object.keys(bulkData).forEach(field => {
          const value = bulkData[field];
          if (value !== '' && value !== null && value !== undefined) {
            if (field === 'dimensions' && typeof value === 'object') {
              // Handle dimensions specially
              onVariationUpdate(variation.id, field, value);
            } else {
              onVariationUpdate(variation.id, field, value);
            }
          }
        });
      });
      
      setBulkFeedback(`Applied template to all ${variations.length} variations`);
      setTimeout(() => setBulkFeedback(''), 3000);
    } else {
      // EDIT MODE: Keep existing edit mode logic
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
        setVariations(prev => prev.map(variation => ({
          ...variation,
          status: bulkData.status
        })));
        appliedChanges.push('status');
      }
      
      // Show feedback
      if (appliedChanges.length > 0) {
        setBulkFeedback(`Applied ${appliedChanges.join(', ')} to all variations`);
        setTimeout(() => setBulkFeedback(''), 3000);
        
        // Clear all bulk data - reset to initial state to prevent field loss
        setBulkData(initialBulkData);
      }
    }
  };

  const addDownloadFile = (variationId) => {
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? {
            ...variation,
            downloads: [
              ...variation.downloads,
              { id: Date.now(), name: '', file: '' }
            ]
          }
        : variation
    ));
  };

  const removeDownloadFile = (variationId, fileIndex) => {
    setVariations(prev => prev.map(variation => 
      variation.id === variationId 
        ? {
            ...variation,
            downloads: variation.downloads.filter((_, index) => index !== fileIndex)
          }
        : variation
    ));
  };

  const toggleVariationExpanded = (variationId) => {
    setExpandedVariation(prev => prev === variationId ? null : variationId);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const variationsToUpdate = variations.filter(v => changedVariations.has(v.id));
    
    if (variationsToUpdate.length === 0) {
      setSaveStatus('No changes to save');
      setSaving(false);
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    
    setSaveStatus(`Saving ${variationsToUpdate.length} changed variation${variationsToUpdate.length > 1 ? 's' : ''}...`);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        setSaveStatus('Error: Authentication required');
        setSaving(false);
        return;
      }

      // Send parent product update with changed variations
      const parentProductData = {
        ...product,
        type: 'variable',
        variations: variationsToUpdate
      };

      const result = await updateProduct(product.id, parentProductData, token);
      
      if (result.success) {
        const successCount = result.variationResults?.filter(r => r.success).length || 0;
        
        // Clear changed variations on success
        setChangedVariations(new Set());
        
        setSaveStatus(`Successfully updated ${successCount}/${variationsToUpdate.length} variation${successCount > 1 ? 's' : ''}`);
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setSaveStatus(`Error: ${result.error || 'Update failed'}`);
        setTimeout(() => setSaveStatus(''), 4000);
      }
      
    } catch (err) {
      setSaveStatus(`Error: ${err.message}`);
      setTimeout(() => setSaveStatus(''), 4000);
    }
    
    setSaving(false);
  };

  const formatAttributeText = (attributes) => {
    return attributes
      .map(attr => `${attr.name}: ${attr.option}`)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading variations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Bulk Actions Section - Different for Create vs Edit Mode */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-6">
          {createMode ? (
            /* CREATE MODE: Separate Template Variation */
            <>
              <div 
                className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center">
                    <Package className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Are all of your variations the same?</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Configure the template below and apply to all {variations.length} variations
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {showBulkActions ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              {showBulkActions && (
                <div className="p-6">
                  {/* Bulk Feedback */}
                  {bulkFeedback && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg mb-6">
                      <div className="flex items-center">
                        <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        <span className="text-sm text-green-700 dark:text-green-400">{bulkFeedback}</span>
                      </div>
                    </div>
                  )}

                  {/* PASTE THE EXACT VARIATION CODE HERE - from your paste.txt file */}
                  <div className="mt-6 space-y-6">
                    {/* Image Management Section - Side by Side Layout */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Image className="w-5 h-5 mr-2" />
                        Variation Image
                      </h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Current Image Display */}
                        <div className="flex flex-col items-center">
                          <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative group">
                            {bulkData.image?.src ? (
                              <>
                                <img
                                  src={bulkData.image.src}
                                  alt={bulkData.image.alt || 'Variation image'}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                {/* Delete Image Overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={() => handleBulkInputChange('image', null)}
                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center">
                                <Image className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                                <p className="text-xs text-gray-500 dark:text-gray-400">No image</p>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                            Current variation image
                          </p>
                        </div>

                        {/* Image Upload Controls */}
                        <div className="space-y-4">
                          {/* Image URL Input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Image URL
                            </label>
                            <div className="flex space-x-2">
                              <input
                                type="url"
                                placeholder="https://example.com/image.jpg"
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleBulkInputChange('image', { src: e.target.value, alt: 'Template variation image' });
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  const input = e.target.parentElement.querySelector('input');
                                  handleBulkInputChange('image', { src: input.value, alt: 'Template variation image' });
                                  input.value = '';
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                              >
                                Add
                              </button>
                            </div>
                          </div>

                          {/* File Upload */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Upload from Device
                            </label>
                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-2 pb-3">
                                  <Upload className="w-6 h-6 mb-1 text-gray-400" />
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold">Click to upload</span>
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (e) => {
                                        handleBulkInputChange('image', {
                                          src: e.target.result,
                                          alt: 'Template variation image'
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleBulkInputChange('image', null)}
                              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg transition-colors text-sm flex items-center justify-center"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove Image
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {/* Enabled Toggle */}
                      <button
                        onClick={() => handleBulkInputChange('status', bulkData.status === 'publish' ? 'private' : 'publish')}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                          bulkData.status === 'publish'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {bulkData.status === 'publish' ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {bulkData.status === 'publish' ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>

                      {/* Downloadable Toggle */}
                      <button
                        onClick={() => handleBulkInputChange('downloadable', !bulkData.downloadable)}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                          bulkData.downloadable
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Downloadable</span>
                      </button>

                      {/* Virtual Toggle */}
                      <button
                        onClick={() => handleBulkInputChange('virtual', !bulkData.virtual)}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                          bulkData.virtual
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <Cloud className="w-4 h-4" />
                        <span className="text-sm font-medium">Virtual</span>
                      </button>

                      {/* Manage Stock Toggle */}
                      <button
                        onClick={() => handleBulkInputChange('manage_stock', !bulkData.manage_stock)}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                          bulkData.manage_stock
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        <span className="text-sm font-medium">Manage Stock</span>
                      </button>
                    </div>

                    {/* Variation Fields - Organized into Sections */}
                    <div className="space-y-8">
                      
                      {/* Basic Information Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                          <Hash className="w-5 h-5 mr-2" />
                          Basic Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* SKU - Hidden in create mode */}
                          {!createMode && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                SKU
                              </label>
                              <div className="relative">
                                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  value={bulkData.sku || ''}
                                  onChange={(e) => handleBulkInputChange('sku', e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="variation-sku"
                                />
                              </div>
                            </div>
                          )}

                          {/* Regular Price */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Regular Price
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                value={bulkData.regular_price || ''}
                                onChange={(e) => handleBulkInputChange('regular_price', e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {/* Sale Price */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Sale Price
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                value={bulkData.sale_price || ''}
                                onChange={(e) => handleBulkInputChange('sale_price', e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inventory Management Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                          <Package className="w-5 h-5 mr-2" />
                          Inventory Management
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Stock Status (shown when not managing stock) */}
                          {!bulkData.manage_stock && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Stock Status
                              </label>
                              <select
                                value={bulkData.stock_status || 'instock'}
                                onChange={(e) => handleBulkInputChange('stock_status', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <option value="instock">In Stock</option>
                                <option value="outofstock">Out of Stock</option>
                                <option value="onbackorder">On Backorder</option>
                              </select>
                            </div>
                          )}

                          {/* Stock Quantity (shown when managing stock) */}
                          {bulkData.manage_stock && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Stock Quantity
                              </label>
                              <input
                                type="number"
                                value={bulkData.stock_quantity || ''}
                                onChange={(e) => handleBulkInputChange('stock_quantity', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="0"
                              />
                            </div>
                          )}

                          {/* Allow Backorders (shown when managing stock) */}
                          {bulkData.manage_stock && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Allow Backorders
                              </label>
                              <select
                                value={bulkData.backorders || 'no'}
                                onChange={(e) => handleBulkInputChange('backorders', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <option value="no">Do not allow</option>
                                <option value="notify">Allow, but notify customer</option>
                                <option value="yes">Allow</option>
                              </select>
                            </div>
                          )}

                          {/* Low Stock Threshold (shown when managing stock) */}
                          {bulkData.manage_stock && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Low Stock Threshold
                              </label>
                              <input
                                type="number"
                                value={bulkData.low_stock_amount || ''}
                                onChange={(e) => handleBulkInputChange('low_stock_amount', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Shipping Section (hidden when virtual) */}
                      {!bulkData.virtual && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <Truck className="w-5 h-5 mr-2" />
                            Shipping
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Weight */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Weight (kg)
                              </label>
                              <div className="relative">
                                <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={bulkData.weight || ''}
                                  onChange={(e) => handleBulkInputChange('weight', e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            {/* Shipping Class */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Shipping Class
                              </label>
                              <select
                                value={bulkData.shipping_class || ''}
                                onChange={(e) => handleBulkInputChange('shipping_class', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <option value="">No shipping class</option>
                                {shippingClasses.map((shippingClass) => (
                                  <option key={shippingClass.id} value={shippingClass.slug}>
                                    {shippingClass.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Dimensions */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Dimensions (cm)
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                              <input
                                type="number"
                                step="0.01"
                                value={bulkData.dimensions?.length || ''}
                                onChange={(e) => handleBulkInputChange('dimensions', { ...bulkData.dimensions, length: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Length"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={bulkData.dimensions?.width || ''}
                                onChange={(e) => handleBulkInputChange('dimensions', { ...bulkData.dimensions, width: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Width"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={bulkData.dimensions?.height || ''}
                                onChange={(e) => handleBulkInputChange('dimensions', { ...bulkData.dimensions, height: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Height"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                          <FileText className="w-5 h-5 mr-2" />
                          Content
                        </h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                          </label>
                          <textarea
                            value={bulkData.description || ''}
                            onChange={(e) => handleBulkInputChange('description', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Variation description..."
                          />
                        </div>
                      </div>

                      {/* Downloadable Files Section */}
                      {bulkData.downloadable && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                              <Download className="w-5 h-5 mr-2" />
                              Downloadable Files
                            </h4>
                            <button
                              onClick={() => {
                                const newDownloads = [...(bulkData.downloads || []), { id: Date.now(), name: '', file: '' }];
                                handleBulkInputChange('downloads', newDownloads);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add File
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            {(bulkData.downloads || []).map((download, fileIndex) => (
                              <div key={fileIndex} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                    File {fileIndex + 1}
                                  </h5>
                                  <button
                                    onClick={() => {
                                      const newDownloads = bulkData.downloads.filter((_, index) => index !== fileIndex);
                                      handleBulkInputChange('downloads', newDownloads);
                                    }}
                                    className="text-red-600 hover:text-red-700 p-1"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                <div className="space-y-3">
                                  {/* File Name */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      File Name
                                    </label>
                                    <input
                                      type="text"
                                      value={download.name || ''}
                                      onChange={(e) => {
                                        const newDownloads = [...(bulkData.downloads || [])];
                                        newDownloads[fileIndex] = { ...newDownloads[fileIndex], name: e.target.value };
                                        handleBulkInputChange('downloads', newDownloads);
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      placeholder="File name"
                                    />
                                  </div>

                                  {/* File URL */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      File URL
                                    </label>
                                    <input
                                      type="url"
                                      value={download.file || ''}
                                      onChange={(e) => {
                                        const newDownloads = [...(bulkData.downloads || [])];
                                        newDownloads[fileIndex] = { ...newDownloads[fileIndex], file: e.target.value };
                                        handleBulkInputChange('downloads', newDownloads);
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      placeholder="https://example.com/file.pdf"
                                    />
                                  </div>

                                  {/* File Upload Alternative */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Or Upload from Device
                                    </label>
                                    <div className="flex items-center justify-center w-full">
                                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 transition-colors">
                                        <div className="flex items-center justify-center">
                                          <Upload className="w-5 h-5 mr-2 text-gray-400" />
                                          <p className="text-sm text-gray-500 dark:text-gray-400">
                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                          </p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          Any file type up to 50MB
                                        </p>
                                        <input
                                          type="file"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onload = (e) => {
                                                const newDownloads = [...(bulkData.downloads || [])];
                                                newDownloads[fileIndex] = { 
                                                  ...newDownloads[fileIndex], 
                                                  name: file.name,
                                                  file: e.target.result,
                                                  type: file.type,
                                                  size: file.size
                                                };
                                                handleBulkInputChange('downloads', newDownloads);
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>

                                  {/* File Info Display */}
                                  {download.type && (
                                    <div className="bg-gray-50 dark:bg-gray-600 p-3 rounded-lg">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-300">
                                          Type: {download.type}
                                        </span>
                                        {download.size && (
                                          <span className="text-gray-600 dark:text-gray-300">
                                            Size: {(download.size / 1024 / 1024).toFixed(2)} MB
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {(!bulkData.downloads || bulkData.downloads.length === 0) && (
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Download className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p>No downloadable files added yet</p>
                                <p className="text-sm">Click "Add File" to get started</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={applyAllBulkChanges}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply Template to All {variations.length} Variations</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* EDIT MODE: Original Bulk Actions */
            <>
              <div 
                className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center">
                    <Zap className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bulk Actions</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400 block sm:hidden">
                        Apply to all variations
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-2">
                    <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">
                      Apply changes to all variations
                    </span>
                    {showBulkActions && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          applyAllBulkChanges();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center transition-colors text-sm font-medium"
                      >
                        <Check className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Apply All</span>
                        <span className="xs:hidden">Apply</span>
                      </button>
                    )}
                    {showBulkActions ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              {showBulkActions && (
                /* Keep all the existing bulk actions content for edit mode */
                <div className="p-4 space-y-4">
                  {/* ... all the existing bulk actions content stays the same ... */}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-6">
          {/* Variations List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Product Variations</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage individual variation settings, pricing, and inventory
              </p>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {variations.map((variation) => (
                <div key={variation.id} className="p-6">
                  {/* Variation Header */}
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-4 rounded-lg transition-colors"
                    onClick={() => toggleVariationExpanded(variation.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {createMode && (
                        <input
                          type="checkbox"
                          checked={selectedVariations?.has(variation.id) || false}
                          onChange={(e) => {
                            e.stopPropagation();
                            onVariationSelectionChange(variation.id);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      )}
                      <div className="flex-shrink-0">
                        <Package2 className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {formatAttributeText(variation.attributes || [])}
                        </h4>
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
                      {/* Image Management Section - Side by Side Layout */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                          <Image className="w-5 h-5 mr-2" />
                          Variation Image
                        </h4>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Current Image Display */}
                          <div className="flex flex-col items-center">
                            <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative group">
                              {variation.image?.src ? (
                                <>
                                  <img
                                    src={variation.image.src}
                                    alt={variation.image.alt || 'Variation image'}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                  {/* Delete Image Overlay */}
                                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                      onClick={() => handleVariationImageDelete(variation.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center">
                                  <Image className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                                  <p className="text-xs text-gray-500 dark:text-gray-400">No image</p>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                              Current variation image
                            </p>
                          </div>

                          {/* Image Upload Controls */}
                          <div className="space-y-4">
                            {/* Image URL Input */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Image URL
                              </label>
                              <div className="flex space-x-2">
                                <input
                                  type="url"
                                  placeholder="https://example.com/image.jpg"
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleVariationImageUrl(variation.id, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                                <button
                                  onClick={(e) => {
                                    const input = e.target.parentElement.querySelector('input');
                                    handleVariationImageUrl(variation.id, input.value);
                                    input.value = '';
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                                >
                                  Add
                                </button>
                              </div>
                            </div>

                            {/* File Upload */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Upload from Device
                              </label>
                              <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 transition-colors">
                                  <div className="flex flex-col items-center justify-center pt-2 pb-3">
                                    <Upload className="w-6 h-6 mb-1 text-gray-400" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      <span className="font-semibold">Click to upload</span>
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
                                  </div>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        handleVariationImageUpload(variation.id, file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleVariationImageDelete(variation.id)}
                                className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg transition-colors text-sm flex items-center justify-center"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Remove Image
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Toggle Buttons */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {/* Enabled Toggle */}
                        <button
                          onClick={() => handleToggleChange(variation.id, 'status')}
                          className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                            variation.status === 'publish'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {variation.status === 'publish' ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">
                            {variation.status === 'publish' ? 'Enabled' : 'Disabled'}
                          </span>
                        </button>

                        {/* Downloadable Toggle */}
                        <button
                          onClick={() => handleToggleChange(variation.id, 'downloadable')}
                          className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                            variation.downloadable
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-sm font-medium">Downloadable</span>
                        </button>

                        {/* Virtual Toggle */}
                        <button
                          onClick={() => handleToggleChange(variation.id, 'virtual')}
                          className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                            variation.virtual
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <Cloud className="w-4 h-4" />
                          <span className="text-sm font-medium">Virtual</span>
                        </button>

                        {/* Manage Stock Toggle */}
                        <button
                          onClick={() => handleToggleChange(variation.id, 'manage_stock')}
                          className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                            variation.manage_stock
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <Package className="w-4 h-4" />
                          <span className="text-sm font-medium">Manage Stock</span>
                        </button>
                      </div>

                      {/* Variation Fields - Organized into Sections */}
                      <div className="space-y-8">
                        
                        {/* Basic Information Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <Hash className="w-5 h-5 mr-2" />
                            Basic Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* SKU - Hidden in create mode */}
                            {!createMode && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  SKU
                                </label>
                                <div className="relative">
                                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="text"
                                    value={variation.sku || ''}
                                    onChange={(e) => handleVariationChange(variation.id, 'sku', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="variation-sku"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Regular Price */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Regular Price
                              </label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variation.regular_price || ''}
                                  onChange={(e) => handleVariationChange(variation.id, 'regular_price', e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            {/* Sale Price */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sale Price
                              </label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variation.sale_price || ''}
                                  onChange={(e) => handleVariationChange(variation.id, 'sale_price', e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Inventory Management Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <Package className="w-5 h-5 mr-2" />
                            Inventory Management
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Stock Status (shown when not managing stock) */}
                            {!variation.manage_stock && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Stock Status
                                </label>
                                <select
                                  value={variation.stock_status || 'instock'}
                                  onChange={(e) => handleVariationChange(variation.id, 'stock_status', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="instock">In Stock</option>
                                  <option value="outofstock">Out of Stock</option>
                                  <option value="onbackorder">On Backorder</option>
                                </select>
                              </div>
                            )}

                            {/* Stock Quantity (shown when managing stock) */}
                            {variation.manage_stock && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Stock Quantity
                                </label>
                                <input
                                  type="number"
                                  value={variation.stock_quantity || ''}
                                  onChange={(e) => handleVariationChange(variation.id, 'stock_quantity', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="0"
                                />
                              </div>
                            )}

                            {/* Allow Backorders (shown when managing stock) */}
                            {variation.manage_stock && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Allow Backorders
                                </label>
                                <select
                                  value={variation.backorders || 'no'}
                                  onChange={(e) => handleVariationChange(variation.id, 'backorders', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="no">Do not allow</option>
                                  <option value="notify">Allow, but notify customer</option>
                                  <option value="yes">Allow</option>
                                </select>
                              </div>
                            )}

                            {/* Low Stock Threshold (shown when managing stock) */}
                            {variation.manage_stock && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Low Stock Threshold
                                </label>
                                <input
                                  type="number"
                                  value={variation.low_stock_amount || ''}
                                  onChange={(e) => handleVariationChange(variation.id, 'low_stock_amount', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Shipping Section (hidden when virtual) */}
                        {!variation.virtual && (
                          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                              <Truck className="w-5 h-5 mr-2" />
                              Shipping
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Weight */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Weight (kg)
                                </label>
                                <div className="relative">
                                  <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={variation.weight || ''}
                                    onChange={(e) => handleVariationChange(variation.id, 'weight', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>

                              {/* Shipping Class */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Shipping Class
                                </label>
                                <select
                                  value={variation.shipping_class || ''}
                                  onChange={(e) => handleVariationChange(variation.id, 'shipping_class', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="">No shipping class</option>
                                  {shippingClasses.map((shippingClass) => (
                                    <option key={shippingClass.id} value={shippingClass.slug}>
                                      {shippingClass.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Dimensions */}
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Dimensions (cm)
                              </label>
                              <div className="grid grid-cols-3 gap-4">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variation.dimensions?.length || ''}
                                  onChange={(e) => handleDimensionChange(variation.id, 'length', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Length"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variation.dimensions?.width || ''}
                                  onChange={(e) => handleDimensionChange(variation.id, 'width', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Width"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variation.dimensions?.height || ''}
                                  onChange={(e) => handleDimensionChange(variation.id, 'height', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Height"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Content Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2" />
                            Content
                          </h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Description
                            </label>
                            <textarea
                              value={variation.description || ''}
                              onChange={(e) => handleVariationChange(variation.id, 'description', e.target.value)}
                              rows={4}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="Variation description..."
                            />
                          </div>
                        </div>

                        {/* Downloadable Files Section */}
                        {variation.downloadable && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                <Download className="w-5 h-5 mr-2" />
                                Downloadable Files
                              </h4>
                              <button
                                onClick={() => addDownloadFile(variation.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add File
                              </button>
                            </div>
                            
                            <div className="space-y-4">
                              {variation.downloads.map((download, fileIndex) => (
                                <div key={fileIndex} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                      File {fileIndex + 1}
                                    </h5>
                                    <button
                                      onClick={() => removeDownloadFile(variation.id, fileIndex)}
                                      className="text-red-600 hover:text-red-700 p-1"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {/* File Name */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        File Name
                                      </label>
                                      <input
                                        type="text"
                                        value={download.name || ''}
                                        onChange={(e) => handleDownloadFileChange(variation.id, fileIndex, 'name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="File name"
                                      />
                                    </div>

                                    {/* File URL */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        File URL
                                      </label>
                                      <input
                                        type="url"
                                        value={download.file || ''}
                                        onChange={(e) => handleDownloadFileChange(variation.id, fileIndex, 'file', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="https://example.com/file.pdf"
                                      />
                                    </div>

                                    {/* File Upload Alternative */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Or Upload from Device
                                      </label>
                                      <div className="flex items-center justify-center w-full">
                                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 transition-colors">
                                          <div className="flex items-center justify-center">
                                            <Upload className="w-5 h-5 mr-2 text-gray-400" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                              <span className="font-semibold">Click to upload</span> or drag and drop
                                            </p>
                                          </div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Any file type up to 50MB
                                          </p>
                                          <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files[0];
                                              if (file) {
                                                handleDownloadFileUpload(variation.id, fileIndex, file);
                                              }
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>

                                    {/* File Info Display */}
                                    {download.type && (
                                      <div className="bg-gray-50 dark:bg-gray-600 p-3 rounded-lg">
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-600 dark:text-gray-300">
                                            Type: {download.type}
                                          </span>
                                          {download.size && (
                                            <span className="text-gray-600 dark:text-gray-300">
                                              Size: {(download.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {variation.downloads.length === 0 && (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                  <Download className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                  <p>No downloadable files added yet</p>
                                  <p className="text-sm">Click "Add File" to get started</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
  );
};

export default VariableProductView;