import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { loadWooCommerceTags, loadWooCommerceAttributes, searchProducts } from './api';
import { useAuth } from './AuthContext';

const AdvancedSettings = ({ editData, handleInputChange, isMobile, isCreating = false, hideAttributes = false }) => {
  const { getAuthToken } = useAuth();
  // State for input fields
  const [tagInput, setTagInput] = useState('');
  const [tagDescription, setTagDescription] = useState('');
  const [upsellInput, setUpsellInput] = useState('');
  const [crossSellInput, setCrossSellInput] = useState('');
  const [attributeInput, setAttributeInput] = useState({
    name: '',
    values: '',
    visible: true
  });

  // State for existing data selection
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showAttributeSelector, setShowAttributeSelector] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [showUpsellSearch, setShowUpsellSearch] = useState(false);
  const [showCrossSellSearch, setShowCrossSellSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Convert tag IDs to tag objects for display
  const getTagsForDisplay = () => {
    // First check if we have a tags array (ProductView.js format)
    if (editData.tags && Array.isArray(editData.tags) && editData.tags.length > 0) {
      return editData.tags;
    }
    
    // Fallback: check for tag_ids array (normalized format)
    if (editData.tag_ids && Array.isArray(editData.tag_ids) && editData.tag_ids.length > 0) {
      return editData.tag_ids.map(tagId => ({
        id: tagId,
        name: `Tag ${tagId}`
      }));
    }
    
    return [];
  };

  // Fetch existing tags from WooCommerce
  const fetchExistingTags = async () => {
    setLoadingTags(true);
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        console.error('No authentication token available');
        return;
      }
      
      const result = await loadWooCommerceTags(authToken);
      
      if (result.success) {
        setAvailableTags(result.tags || []);
        setShowTagSelector(true);
      } else {
        console.error('Failed to fetch tags:', result.error);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  // Fetch existing attributes from WooCommerce
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

  // Add existing tag to product
  const addExistingTag = (tag) => {
    const currentTags = editData.tags || [];
    const alreadyExists = currentTags.find(t => t.id === tag.id);
    
    if (!alreadyExists) {
      const newTags = [...currentTags, tag];
      handleInputChange('tags', newTags);
    }
    
    setShowTagSelector(false);
  };

  // Add existing attribute to product
  const addExistingAttribute = (attribute) => {
    console.log('🔍 DEBUGGING: Adding attribute:', attribute);
    const currentAttributes = editData.attributes || [];
    const alreadyExists = currentAttributes.find(a => a.id === attribute.id || a.name === attribute.name);
    
    if (!alreadyExists) {
      const newAttributes = [...currentAttributes, {
        id: attribute.id,
        name: attribute.name,
        slug: attribute.slug,
        options: attribute.terms ? attribute.terms.map(term => term.name) : [],
        visible: true
      }];
      console.log('🔍 DEBUGGING: New attribute object:', newAttributes[newAttributes.length - 1]);
      handleInputChange('attributes', newAttributes);
    }
    
    setShowAttributeSelector(false);
  };

  // Add tag by name (simplified - works with existing tags array)
  const addTag = (tagName, tagDesc) => {
    if (!tagName.trim() || !tagDesc.trim()) return;
    
    // Check if tag already exists
    const currentTags = editData.tags || [];
    const existingTag = currentTags.find(tag => 
      tag.name && tag.name.toLowerCase() === tagName.trim().toLowerCase()
    );
    
    if (existingTag) {
      return; // Tag already exists
    }
    
    // Create new tag with temporary ID
    const tempId = Date.now();
    const newTag = { 
      id: tempId, 
      name: tagName.trim(),
      description: tagDesc.trim()
    };
    
    const newTags = [...currentTags, newTag];
    handleInputChange('tags', newTags);
    
    setTagInput('');
    setTagDescription('');
  };

  // Remove tag
  const removeTag = (tagId) => {
    const currentTags = editData.tags || [];
    const newTags = currentTags.filter(tag => tag.id !== tagId);
    handleInputChange('tags', newTags);
  };

  const addAttribute = () => {
    if (!attributeInput.name || !attributeInput.values) return;
    
    const newAttribute = {
      name: attributeInput.name,
      options: attributeInput.values.split('|').map(v => v.trim()).filter(v => v),
      visible: attributeInput.visible
    };
    
    const newAttributes = [...(editData.attributes || []), newAttribute];
    handleInputChange('attributes', newAttributes);
    
    setAttributeInput({
      name: '',
      values: '',
      visible: true
    });
  };

  const handleProductSearch = async (term) => {
    setProductSearchTerm(term);
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const authToken = await getAuthToken();
      const result = await searchProducts(term, { limit: 20 }, authToken);
      setSearchResults(result.success ? result.products : []);
    } catch (error) {
      console.error('Product search error:', error);
      setSearchResults([]);
    }
    setSearching(false);
  };

  const addUpsellProduct = (product) => {
    const current = editData.upsell_ids || [];
    if (!current.includes(product.id)) {
      handleInputChange('upsell_ids', [...current, product.id]);
    }
    setShowUpsellSearch(false);
    setProductSearchTerm('');
    setSearchResults([]);
  };

  const addCrossSellProduct = (product) => {
    const current = editData.cross_sell_ids || [];
    if (!current.includes(product.id)) {
      handleInputChange('cross_sell_ids', [...current, product.id]);
    }
    setShowCrossSellSearch(false);
    setProductSearchTerm('');
    setSearchResults([]);
  };

  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      
      {/* Tags & Attributes Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>{hideAttributes ? 'Tags' : 'Tags & Attributes'}</h3>
        
        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={fetchExistingTags}
              disabled={loadingTags}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loadingTags ? 'Loading...' : 'Choose Existing Tag'}
            </button>
            <span className="text-gray-400 self-center">or</span>
            <span className="text-sm text-gray-600 dark:text-gray-400 self-center">create new below</span>
          </div>

          {/* Existing Tag Selector */}
          {showTagSelector && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-blue-50 dark:bg-blue-900/20 mb-3">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Existing Tag</h5>
                <button
                  onClick={() => setShowTagSelector(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addExistingTag(tag)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{tag.name}</div>
                    {tag.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">{tag.description}</div>
                    )}
                  </button>
                ))}
                {availableTags.length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">No existing tags found</div>
                )}
              </div>
            </div>
          )}
          
          {/* Add New Tag Form */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-800 mb-3">
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Add New Tag</h5>
            <div className="space-y-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
                placeholder="Tag name..."
              />
              <textarea
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
                placeholder="Tag description..."
                rows="2"
              />
              <button
                onClick={() => addTag(tagInput.trim(), tagDescription.trim())}
                disabled={!tagInput.trim() || !tagDescription.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add Tag
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {getTagsForDisplay().map((tag) => (
              <span key={tag.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                {tag.name}
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {(!editData.tags || editData.tags.length === 0) && (
              <span className="text-sm text-gray-500 dark:text-gray-400">No tags assigned</span>
            )}
          </div>
        </div>

        {/* Attributes */}
        {!hideAttributes && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Attributes</label>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={fetchExistingAttributes}
              disabled={loadingAttributes}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loadingAttributes ? 'Loading...' : 'Choose Existing Attribute'}
            </button>
            <span className="text-gray-400 self-center">or</span>
            <span className="text-sm text-gray-600 dark:text-gray-400 self-center">create new below</span>
          </div>

          {/* Existing Attribute Selector */}
          {showAttributeSelector && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-blue-50 dark:bg-blue-900/20 mb-3">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Existing Attribute</h5>
                <button
                  onClick={() => setShowAttributeSelector(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableAttributes.map((attribute) => (
                  <button
                    key={attribute.id}
                    onClick={() => addExistingAttribute(attribute)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{attribute.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Type: {attribute.type || 'select'}</div>
                  </button>
                ))}
                {availableAttributes.length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">No existing attributes found</div>
                )}
              </div>
            </div>
          )}
          
          {/* Existing Attributes */}
          {editData.attributes && editData.attributes.length > 0 && (
            <div className="space-y-3 mb-4">
              {editData.attributes.map((attribute, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{attribute.name}</span>
                    <button
                      onClick={() => {
                        const newAttributes = editData.attributes.filter((_, i) => i !== index);
                        handleInputChange('attributes', newAttributes);
                      }}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Values: {Array.isArray(attribute.options) ? attribute.options.join(', ') : attribute.options || 'No values'}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Visible: {attribute.visible ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Attribute */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Add New Attribute</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attribute Name</label>
                <input
                  type="text"
                  value={attributeInput.name}
                  onChange={(e) => setAttributeInput(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
                  placeholder="e.g., Color, Size, Material"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attribute Values</label>
                <input
                  type="text"
                  value={attributeInput.values}
                  onChange={(e) => setAttributeInput(prev => ({ ...prev, values: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
                  placeholder="e.g., Red | Blue | Green (separate with |)"
                />
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={attributeInput.visible}
                    onChange={(e) => setAttributeInput(prev => ({ ...prev, visible: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Visible on product page</span>
                </label>
              </div>
              
              <button
                onClick={addAttribute}
                disabled={!attributeInput.name || !attributeInput.values}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add Attribute
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Published Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Published Date</label>
          <div className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ${isMobile ? 'text-base' : ''}`}>
            {editData.date_created ? new Date(editData.date_created).toLocaleString() : 'Not published yet'}
          </div>
        </div>

        {/* Upsells */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upsells</label>
          
          {editData.upsell_ids?.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {editData.upsell_ids.map((productId, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-sm">
                  Product {productId}
                  <button
                    onClick={() => {
                      const newUpsells = editData.upsell_ids.filter(id => id !== productId);
                      handleInputChange('upsell_ids', newUpsells);
                    }}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <button
            onClick={() => setShowUpsellSearch(true)}
            className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            + Search and Add Products
          </button>
        </div>

        {/* Cross-sells */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cross-sells</label>
          
          {editData.cross_sell_ids?.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {editData.cross_sell_ids.map((productId, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-sm">
                  Product {productId}
                  <button
                    onClick={() => {
                      const newCrossSells = editData.cross_sell_ids.filter(id => id !== productId);
                      handleInputChange('cross_sell_ids', newCrossSells);
                    }}
                    className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <button
            onClick={() => setShowCrossSellSearch(true)}
            className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            + Search and Add Products
          </button>
        </div>
      </div>

      {/* Stock Management Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Stock Management</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Backorders */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Backorders
            </label>
            <select
              value={editData.backorders || 'no'}
              onChange={(e) => handleInputChange('backorders', e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            >
              <option value="no">Do not allow</option>
              <option value="notify">Allow, but notify customer</option>
              <option value="yes">Allow</option>
            </select>
          </div>

          {/* Stock Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock Status
            </label>
            <select
              value={editData.stock_status || 'instock'}
              onChange={(e) => handleInputChange('stock_status', e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            >
              <option value="instock">In Stock</option>
              <option value="outofstock">Out of Stock</option>
              <option value="onbackorder">On Backorder</option>
            </select>
          </div>
        </div>

        {/* Stock Options */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editData.manage_stock || false}
              onChange={(e) => handleInputChange('manage_stock', e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manage Stock</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editData.sold_individually || false}
              onChange={(e) => handleInputChange('sold_individually', e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sold Individually (limit to 1 per order)</span>
          </label>
        </div>

        {/* Stock Quantity - only show if manage_stock is enabled */}
        {editData.manage_stock && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock Quantity
            </label>
            <input
              type="number"
              value={editData.stock_quantity || ''}
              onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
              placeholder="0"
              min="0"
            />
          </div>
        )}
      </div>

      {/* Advanced Product Settings Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-gray-100`}>Advanced Product Settings</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product Slug
          </label>
          <input
            type="text"
            value={editData.slug || ''}
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
              disabled={isCreating}
              className={`w-full px-4 ${isMobile ? 'py-4' : 'py-3'} border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isCreating ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-700'} text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            >
              <option value="simple">Simple Product</option>
              <option value="variable">Variable Product</option>
            </select>
            {isCreating && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Product type cannot be changed during creation</p>
            )}
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
              checked={editData.virtual || false}
              onChange={(e) => handleInputChange('virtual', e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Virtual Product</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editData.downloadable || false}
              onChange={(e) => handleInputChange('downloadable', e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Downloadable Product</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editData.reviews_allowed !== false}
              onChange={(e) => handleInputChange('reviews_allowed', e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow Reviews</span>
          </label>
        </div>
      </div>
    {/* Product Search Modals */}
      {showUpsellSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Search Products for Upsells</h3>
              <button onClick={() => setShowUpsellSearch(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={productSearchTerm}
              onChange={(e) => handleProductSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              placeholder="Search products..."
              autoFocus
            />
            <div className="flex-1 overflow-y-auto space-y-2">
              {searching && <div className="text-center text-gray-500">Searching...</div>}
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addUpsellProduct(product)}
                  className="w-full text-left p-3 border rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">ID: {product.id} • SKU: {product.sku}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCrossSellSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Search Products for Cross-sells</h3>
              <button onClick={() => setShowCrossSellSearch(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={productSearchTerm}
              onChange={(e) => handleProductSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              placeholder="Search products..."
              autoFocus
            />
            <div className="flex-1 overflow-y-auto space-y-2">
              {searching && <div className="text-center text-gray-500">Searching...</div>}
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addCrossSellProduct(product)}
                  className="w-full text-left p-3 border rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">ID: {product.id} • SKU: {product.sku}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSettings;