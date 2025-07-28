import React, { useState, useEffect } from 'react';
import { X, Plus, ArrowLeft, ArrowRight, Save, Upload, Image, Package, AlertCircle, Check, ChevronDown } from 'lucide-react';
import BasicSettings from './BasicSettings';
import AdvancedSettings from './AdvancedSettings';
import { createProduct, loadWooCommerceAttributes, pollJobUntilComplete, uploadProductImages } from './api';
import { useAuth } from './AuthContext';
import VariableProductView from './VariableProductView';

const CreateProductForm = ({ isOpen, onClose, onProductCreated, selectedCategory }) => {
  const { getAuthToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [productType, setProductType] = useState('simple');
  const [productData, setProductData] = useState({
    // Basic Info
    name: '',
    slug: '',
    description: '',
    short_description: '',
    type: 'simple',
    status: 'draft',
    catalog_visibility: 'visible',
    featured: false,
    virtual: false,
    downloadable: false,
    
    // Pricing (only for simple products)
    regular_price: '',
    sale_price: '',
    date_on_sale_from: '',
    date_on_sale_to: '',
    
    // Inventory
    sku: '',
    manage_stock: false,
    stock_quantity: '',
    stock_status: 'instock',
    backorders: 'no',
    sold_individually: false,
    
    // Shipping
    weight: '',
    dimensions: { length: '', width: '', height: '' },
    shipping_class: '',
    
    // Images
    images: [],
    
    // Categories
    categories: selectedCategory ? [selectedCategory] : [],
    tags: [],
    
    // Advanced
    attributes: [],
    reviews_allowed: true,
    purchase_note: '',
    tax_status: 'taxable',
    tax_class: '',
    upsell_ids: [],
    cross_sell_ids: [],
    
    // Variable product specific
    variations: [],
    default_attributes: []
  });

  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [showAttributeSelector, setShowAttributeSelector] = useState(false);
  const [newAttributeValues, setNewAttributeValues] = useState(['', '', '']);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState(new Set());
  const [showAllVariations, setShowAllVariations] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch existing attributes from WooCommerce (same as AdvancedSettings.js)
  const fetchExistingAttributes = async () => {
    setLoadingAttributes(true);
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        console.error('No authentication token available');
        return;
      }
      
      const result = await loadWooCommerceAttributes(authToken);
      
      if (result.success) {
        console.log('🔍 DEBUGGING: Raw attributes from WooCommerce:', result.attributes);
        result.attributes.forEach((attr, index) => {
          console.log(`🔍 DEBUGGING: Attribute ${index}:`, attr);
        });
        setAvailableAttributes(result.attributes || []);
        setShowAttributeSelector(true);
      } else {
        console.error('Failed to fetch attributes:', result.error);
      }
    } catch (error) {
      console.error('Error fetching attributes:', error);
    } finally {
      setLoadingAttributes(false);
    }
  };

  // Add existing attribute to product (same as AdvancedSettings.js)
  const addExistingAttribute = (attribute) => {
    console.log('🔍 DEBUGGING: Adding attribute:', attribute);
    const currentAttributes = productData.attributes || [];
    const alreadyExists = currentAttributes.find(a => a.id === attribute.id || a.name === attribute.name);
    
    if (!alreadyExists) {
      const newAttributes = [...currentAttributes, {
        id: attribute.id,
        name: attribute.name,
        slug: attribute.slug,
        options: attribute.terms ? 
          attribute.terms.map(term => term.name) : [],
        visible: true,
        variation: true
      }];
      console.log('🔍 DEBUGGING: New attribute object:', newAttributes[newAttributes.length - 1]);
      handleInputChange('attributes', newAttributes);
    }
    
    setShowAttributeSelector(false);
  };

  const addNewAttributeValue = () => {
    setNewAttributeValues([...newAttributeValues, '']);
  };

  const removeAttributeValue = (index) => {
    if (newAttributeValues.length > 1) {
      setNewAttributeValues(newAttributeValues.filter((_, i) => i !== index));
    }
  };

  const updateAttributeValue = (index, value) => {
    const updated = [...newAttributeValues];
    updated[index] = value;
    setNewAttributeValues(updated);
  };

  const addNewAttribute = () => {
    const name = newAttributeName.trim();
    const values = newAttributeValues.filter(v => v.trim());
    
    if (name && values.length > 0) {
      const newAttribute = {
        id: -1, // Negative ID triggers global attribute creation
        name: name,
        options: values,
        visible: true,
        variation: true
      };
      
      const newAttributes = [...(productData.attributes || []), newAttribute];
      setProductData(prev => ({ ...prev, attributes: newAttributes }));
      
      setNewAttributeName('');
      setNewAttributeValues(['', '', '']);
    }
  };

  // Steps configuration
  const getSteps = () => {
    if (productType === 'simple') {
      return [
        { id: 1, title: 'Product Type', description: 'Choose product type' },
        { id: 2, title: 'Basic Settings', description: 'Product info, pricing & inventory' },
        { id: 3, title: 'Advanced Settings', description: 'Tags, attributes & more' }
      ];
    } else {
      return [
        { id: 1, title: 'Product Type', description: 'Choose product type' },
        { id: 2, title: 'Basic Settings', description: 'Product info & inventory' },
        { id: 3, title: 'Advanced Settings', description: 'Tags, attributes & more' },
        { id: 4, title: 'Attributes', description: 'Define product variations' },
        { id: 5, title: 'Variations', description: 'Configure individual variations' }
      ];
    }
  };

  const steps = getSteps();

  // Track if slug was manually edited
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Auto-generate slug from name only if not manually edited
  useEffect(() => {
    if (productData.name && !slugManuallyEdited) {
      const slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setProductData(prev => ({ ...prev, slug }));
    }
  }, [productData.name, slugManuallyEdited]);

  // Update product type
  useEffect(() => {
    setProductData(prev => ({ ...prev, type: productType }));
  }, [productType]);

  const handleInputChange = (field, value) => {
    setProductData(prev => {
      // Handle nested field updates (e.g., 'dimensions.length')
      if (field.includes('.')) {
        const [parentField, childField] = field.split('.');
        return {
          ...prev,
          [parentField]: {
            ...prev[parentField],
            [childField]: value
          }
        };
      }
      
      // Handle regular field updates
      return { ...prev, [field]: value };
    });
    
    // Track if slug was manually edited
    if (field === 'slug') {
      setSlugManuallyEdited(true);
    }
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageAdd = (url) => {
    if (url.trim()) {
      setProductData(prev => ({
        ...prev,
        images: [...prev.images, { src: url.trim(), alt: productData.name }]
      }));
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 5MB)`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setProductData(prev => ({
          ...prev,
          images: [...prev.images, { 
            src: e.target.result, 
            alt: productData.name,
            file: true 
          }]
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleImageDelete = (index) => {
    setProductData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    if (activeImageIndex >= index && activeImageIndex > 0) {
      setActiveImageIndex(activeImageIndex - 1);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 2: // Basic Settings
        if (!productData.name.trim()) newErrors.name = 'Product name is required';
        if (productType === 'simple' && !productData.regular_price) {
          newErrors.regular_price = 'Regular price is required for simple products';
        }
        if (productData.sale_price && parseFloat(productData.sale_price) >= parseFloat(productData.regular_price)) {
          newErrors.sale_price = 'Sale price must be less than regular price';
        }
        if (productData.manage_stock && !productData.stock_quantity) {
          newErrors.stock_quantity = 'Stock quantity is required when managing stock';
        }
        break;
      case 4: // Attributes (variable products)
        if (productType === 'variable' && productData.attributes.length === 0) {
          newErrors.attributes = 'At least one attribute is required for variable products';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      // Auto-generate variations when entering step 5 (variations)
      if (currentStep === 4 && productType === 'variable') {
        generateVariations();
      }
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (stepNumber) => {
    if (stepNumber <= currentStep) {
      setCurrentStep(stepNumber);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setSaving(true);
    try {
      setSubmitStatus('Creating product...');
      
      const authToken = await getAuthToken();
      
      // Extract images and create product without them
      const images = productData.images || [];
      const productDataWithoutImages = { ...productData, images: [] };
      
      // Start async product creation
      const jobResult = await createProduct(productDataWithoutImages, authToken);
      
      if (!jobResult.success) {
        throw new Error(jobResult.error || 'Failed to start product creation');
      }
      
      const jobId = jobResult.jobId;
      console.log('🔄 Product creation started, job ID:', jobId);
      
      // Poll for completion with progress updates
      const result = await pollJobUntilComplete(jobId, authToken, (job) => {
        setSubmitStatus(`Creating product... ${job.progress}%`);
        console.log(`Job progress: ${job.status} - ${job.progress}%`);
      });
      
      if (result.success) {
        const createdProduct = result.result.product;
        
        // Upload images if any exist
        if (images.length > 0) {
          setSubmitStatus(`Uploading ${images.length} images...`);
          await uploadProductImages(createdProduct.id, images, authToken, (progress) => {
            setSubmitStatus(`Uploading images... ${progress}%`);
          });
        }
        
        onProductCreated(createdProduct);
        onClose();
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      if (error.message.includes('SKU') && error.message.includes('already exists')) {
        setErrors({ sku: error.message });
      } else {
        setErrors({ submit: error.message });
      }
    }
    setSaving(false);
  };

  const generateVariations = () => {
    if (productData.attributes.length === 0) return;

    const attributeOptions = productData.attributes.map(attr => ({
      name: attr.name,
      options: Array.isArray(attr.options) ? attr.options : attr.options.split('|').map(v => v.trim())
    }));

    // Generate all combinations
    const generateCombinations = (attrs, index = 0, current = {}) => {
      if (index === attrs.length) {
        return [current];
      }

      const combinations = [];
      const attr = attrs[index];
      
      for (const option of attr.options) {
        combinations.push(...generateCombinations(attrs, index + 1, {
          ...current,
          [attr.name]: option
        }));
      }
      
      return combinations;
    };

    const combinations = generateCombinations(attributeOptions);
    
    const variations = combinations.map((combo, index) => {
      const attributes = Object.entries(combo).map(([name, option]) => {
        const attr = productData.attributes.find(a => a.name === name);
        return {
          id: attr?.id || 0,
          name: name,
          option: option
        };
      });
      
      return {
        id: `temp-${Date.now()}-${index}`,
        attributes: attributes,
        regular_price: '',
        sale_price: '',
        sku: '',
        stock_status: 'instock',
        manage_stock: false,
        stock_quantity: '',
        weight: '',
        image: null,
        description: '',
        // Additional fields for full VariableProductView functionality
        status: 'publish',
        virtual: false,
        downloadable: false,
        downloads: [],
        date_on_sale_from: '',
        date_on_sale_to: '',
        dimensions: {
          length: '',
          width: '',
          height: ''
        },
        shipping_class: '',
        // Additional inventory fields
        backorders: 'no',
        low_stock_amount: ''
      };
    });

    setProductData(prev => ({ ...prev, variations }));
  };

  const updateVariation = (variationId, field, value) => {
    setProductData(prev => ({
      ...prev,
      variations: prev.variations.map(variation =>
        variation.id === variationId
          ? { ...variation, [field]: value }
          : variation
      )
    }));
  };

  const toggleVariationSelection = (variationId, allSelected = null) => {
    if (allSelected !== null) {
      // Handle bulk selection
      setSelectedVariations(allSelected);
      return;
    }
    
    setSelectedVariations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variationId)) {
        newSet.delete(variationId);
      } else {
        newSet.add(variationId);
      }
      return newSet;
    });
  };

  const selectAllVariations = () => {
    setSelectedVariations(new Set(productData.variations.map(v => v.id)));
    setShowAllVariations(true);
  };

  const deselectAllVariations = () => {
    setSelectedVariations(new Set());
    setShowAllVariations(false);
  };

  const applyBulkToVariations = (field, value) => {
    selectedVariations.forEach(variationId => {
      updateVariation(variationId, field, value);
    });
  };

  const handleVariationSelectionChange = (variationId, allSelected = null) => {
    toggleVariationSelection(variationId, allSelected);
  };

  // Freeze background when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Choose Product Type</h3>
              <p className="text-gray-600 max-w-md mx-auto">Select the type of product you want to create. This determines the available features and settings.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div 
                onClick={() => setProductType('simple')}
                className={`relative p-8 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                  productType === 'simple' 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Simple Product</h4>
                  <p className="text-sm text-gray-600">A single product with one price, SKU, and set of attributes</p>
                </div>
                {productType === 'simple' && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              <div 
                onClick={() => setProductType('variable')}
                className={`relative p-8 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                  productType === 'variable' 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Variable Product</h4>
                  <p className="text-sm text-gray-600">A product with multiple variations like size, color, or material</p>
                </div>
                {productType === 'variable' && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-xl font-semibold text-gray-900">Basic Product Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Configure the essential product information</p>
            </div>
            
            <BasicSettings 
              editData={productData}
              handleInputChange={handleInputChange}
              handleImageAdd={handleImageAdd}
              handleFileUpload={handleFileUpload}
              handleImageDelete={handleImageDelete}
              activeImageIndex={activeImageIndex}
              setActiveImageIndex={setActiveImageIndex}
              hidepricing={productType === 'variable'}
              isMobile={window.innerWidth < 640}
            />
            
            {/* Error Display */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
                </div>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-xl font-semibold text-gray-900">Advanced Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Configure attributes, tags, and additional product options</p>
            </div>
            
            <AdvancedSettings 
              editData={productData}
              handleInputChange={handleInputChange}
              isMobile={false}
              isCreating={true}
              hideAttributes={productType === 'variable'}
            />
          </div>
        );

      case 4: // Create Variations (Variable products only)
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-xl font-semibold text-gray-900">Create Variations</h3>
              <p className="text-sm text-gray-600 mt-1">Choose existing variation types or create new ones to define your product options</p>
            </div>

            {/* Use AdvancedSettings Attributes Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Variation Types</h4>
              
              {/* Load Existing Attributes - same as AdvancedSettings.js */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={fetchExistingAttributes}
                  disabled={loadingAttributes}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {loadingAttributes ? 'Loading...' : 'Choose Existing Variation Type'}
                </button>
                <span className="text-gray-400 text-sm">or</span>
                <span className="text-sm text-gray-600">create new below</span>
              </div>

              {/* Existing Attribute Selector - same as AdvancedSettings.js */}
              {showAttributeSelector && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium text-gray-900">Select Existing Variation Type</h5>
                    <button
                      onClick={() => setShowAttributeSelector(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {availableAttributes.map((attribute) => (
                      <button
                        key={attribute.id}
                        onClick={() => addExistingAttribute(attribute)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 bg-white"
                      >
                        <div className="font-medium text-gray-900">{attribute.name}</div>
                        <div className="text-sm text-gray-600">Type: {attribute.type || 'select'}</div>
                      </button>
                    ))}
                    {availableAttributes.length === 0 && (
                      <div className="text-sm text-gray-500 p-3 text-center">No existing variation types found</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Existing Attributes */}
              {productData.attributes && productData.attributes.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h5 className="font-medium text-gray-900">Selected Variation Types</h5>
                  {productData.attributes.map((attribute, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{attribute.name}</span>
                        <button
                          onClick={() => {
                            const newAttributes = productData.attributes.filter((_, i) => i !== index);
                            handleInputChange('attributes', newAttributes);
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-gray-600">
                        Options: {Array.isArray(attribute.options) ? attribute.options.join(', ') : attribute.options || 'No options'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Attribute */}
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <h5 className="font-medium text-gray-900 mb-4">Create New Variation Type</h5>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variation Name *</label>
                    <input
                      type="text"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                      placeholder="e.g., Color, Size, Material"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Variation Options *</label>
                    <div className="space-y-3">
                      {newAttributeValues.map((value, index) => (
                        <div key={index} className="flex gap-3">
                          <input
                            type="text"
                            placeholder={index === 0 ? 'Size 10' : index === 1 ? 'Size 12' : index === 2 ? 'Size 14' : `Option ${index + 1}`}
                            value={value}
                            onChange={(e) => updateAttributeValue(index, e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                          />
                          {index > 0 && (
                            <button
                              onClick={() => removeAttributeValue(index)}
                              className="text-red-600 hover:text-red-800 p-3"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={addNewAttributeValue}
                      className="mt-3 text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Option
                    </button>
                  </div>
                  
                  <button
                    onClick={addNewAttribute}
                    disabled={!newAttributeName.trim() || newAttributeValues.filter(v => v.trim()).length === 0}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium w-full mt-4"
                  >
                    Add Variation Type
                  </button>
                  
                </div>
              </div>

              {productData.attributes.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <p className="text-green-800 flex items-center font-medium">
                    <Check className="w-5 h-5 mr-2" />
                    Ready to create{' '}
                    <strong className="mx-1">
                      {productData.attributes.reduce((total, attr) => {
                        const options = Array.isArray(attr.options) ? attr.options : [];
                        return total * options.length;
                      }, 1)}
                    </strong>
                    product variations. Click "Continue" to configure them.
                  </p>
                </div>
              )}
            </div>

            {errors.attributes && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errors.attributes}
                </p>
              </div>
            )}
          </div>
        );

      case 5: // Variations (Variable products only)
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-xl font-semibold text-gray-900">Product Variations</h3>
              <p className="text-sm text-gray-600 mt-1">Configure pricing, inventory, and detailed settings for each variation</p>
            </div>

            {productData.variations.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Variations Generated</h4>
                <p className="text-gray-600 mb-4">Click the button below to generate variations from your attributes.</p>
                <button
                  onClick={generateVariations}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate Variations
                </button>
              </div>
            )}

            {productData.variations.length > 0 && (
              <VariableProductView
                createMode={true}
                variations={productData.variations}
                onVariationUpdate={updateVariation}
                selectedVariations={selectedVariations}
                onVariationSelectionChange={handleVariationSelectionChange}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Create New Product</h2>
            <p className="hidden sm:block text-xs sm:text-sm text-gray-600 mt-1">
              Step {currentStep} of {steps.length} • {steps[currentStep - 1]?.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg ml-2 flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="hidden sm:block px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center">
                  <div
                    onClick={() => goToStep(step.id)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                      step.id <= currentStep
                        ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="w-3 h-3 sm:w-5 sm:h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span 
                    onClick={() => goToStep(step.id)}
                    className={`mt-1 sm:mt-2 text-xs font-medium text-center max-w-16 sm:max-w-24 leading-tight ${
                      step.id <= currentStep ? 'text-blue-600 cursor-pointer hover:text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full ${
                    step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Global Error Display */}
        {Object.keys(errors).length > 0 && (
          <div className="hidden sm:block flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 bg-red-50">
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
              </div>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Mobile-First Footer */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Previous Button */}
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`order-2 sm:order-1 flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 border rounded-lg transition-colors text-sm sm:font-medium ${
                currentStep === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-white hover:shadow-sm'
              }`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            {/* Action Buttons */}
            <div className="order-1 sm:order-2 flex flex-col sm:flex-row gap-3 sm:ml-auto">
              {currentStep < steps.length ? (
                <button
                  onClick={nextStep}
                  className="flex items-center justify-center px-4 py-2 sm:px-8 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm sm:font-medium sm:text-base"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center justify-center px-4 py-2 sm:px-8 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm text-sm sm:font-medium sm:text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {submitStatus || 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Create Product
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProductForm;