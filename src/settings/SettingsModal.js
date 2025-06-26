import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  AlertTriangle,
  Loader2,
  Plus,
  Minus
} from 'lucide-react';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  type, 
  editingItem, 
  onSave, 
  onDelete,
  loading = false 
}) => {
  const [formData, setFormData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(editingItem || getDefaultFormData(type));
      setErrors({});
      setShowDeleteConfirm(false);
    }
  }, [isOpen, editingItem, type]);

  const getDefaultFormData = (type) => {
    const base = { name: '', slug: '', description: '' };
    
    switch (type) {
      case 'attributes':
        return { ...base, type: 'select', order_by: 'menu_order', has_archives: false, terms: [] };
      case 'shipping-classes':
        return base;
      case 'shipping-zones':
        return { ...base, order: 0, locations: [] };
      case 'shipping-methods':
        return { ...base, title: '', zone_id: '', enabled: true, method_id: '', settings: {} };
      case 'tags':
        return base;
      case 'tax-classes':
        return { ...base };
      default:
        return base;
    }
  };

  const getModalTitle = () => {
    const action = editingItem ? 'Edit' : 'Create';
    const typeLabels = {
      'attributes': 'Attribute',
      'shipping-classes': 'Shipping Class',
      'shipping-zones': 'Shipping Zone',
      'shipping-methods': 'Shipping Method',
      'tags': 'Tag',
      'tax-classes': 'Tax Class'
    };
    return `${action} ${typeLabels[type]}`;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (type === 'shipping-methods' && !formData.title?.trim()) newErrors.title = 'Title is required';
    if (type === 'shipping-methods' && !formData.zone_id) newErrors.zone_id = 'Zone is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSave(formData);
  };

  const handleDelete = () => {
    onDelete(editingItem);
    setShowDeleteConfirm(false);
  };

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const addTerm = () => {
    const newTerm = { id: Date.now(), name: '', slug: '', description: '' };
    updateFormData('terms', [...(formData.terms || []), newTerm]);
  };

  const removeTerm = (index) => {
    const newTerms = formData.terms.filter((_, i) => i !== index);
    updateFormData('terms', newTerms);
  };

  const updateTerm = (index, key, value) => {
    const newTerms = [...formData.terms];
    newTerms[index] = { ...newTerms[index], [key]: value };
    if (key === 'name' && !newTerms[index].slug) {
      newTerms[index].slug = value.toLowerCase().replace(/\s+/g, '-');
    }
    updateFormData('terms', newTerms);
  };

  const addLocation = () => {
    const newLocation = { type: 'country', code: '' };
    updateFormData('locations', [...(formData.locations || []), newLocation]);
  };

  const removeLocation = (index) => {
    const newLocations = formData.locations.filter((_, i) => i !== index);
    updateFormData('locations', newLocations);
  };

  const updateLocation = (index, key, value) => {
    const newLocations = [...formData.locations];
    newLocations[index] = { ...newLocations[index], [key]: value };
    updateFormData('locations', newLocations);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-6 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-600" size={20} />
              <h3 className="font-medium text-red-900">Confirm Deletion</h3>
            </div>
            <p className="text-red-700 mb-4">
              Are you sure you want to delete "{editingItem?.name || editingItem?.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {type === 'shipping-methods' ? 'Method ID' : 'Name'} *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => updateFormData('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={type === 'shipping-methods' ? 'flat_rate' : 'Enter name...'}
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Title Field (Shipping Methods) */}
            {type === 'shipping-methods' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Flat Rate Shipping"
                />
                {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
              </div>
            )}

            {/* Slug Field */}
            {type !== 'shipping-methods' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => updateFormData('slug', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="auto-generated-slug"
                />
              </div>
            )}

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => updateFormData('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter description..."
              />
            </div>

            {/* Attribute-specific fields */}
            {type === 'attributes' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={formData.type || 'select'}
                    onChange={(e) => updateFormData('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="select">Select</option>
                    <option value="text">Text</option>
                    <option value="color">Color</option>
                    <option value="image">Image</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order By</label>
                  <select
                    value={formData.order_by || 'menu_order'}
                    onChange={(e) => updateFormData('order_by', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="menu_order">Menu Order</option>
                    <option value="name">Name</option>
                    <option value="name_num">Name (numeric)</option>
                    <option value="id">ID</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.has_archives || false}
                    onChange={(e) => updateFormData('has_archives', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">Enable archives</label>
                </div>

                {/* Terms */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Terms</label>
                    <button
                      type="button"
                      onClick={addTerm}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus size={14} />
                      Add Term
                    </button>
                  </div>
                  {formData.terms?.map((term, index) => (
                    <div key={index} className="flex gap-2 mb-2 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Term name"
                          value={term.name || ''}
                          onChange={(e) => updateTerm(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Slug"
                          value={term.slug || ''}
                          onChange={(e) => updateTerm(index, 'slug', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTerm(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Shipping Zone fields */}
            {type === 'shipping-zones' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input
                    type="number"
                    value={formData.order || 0}
                    onChange={(e) => updateFormData('order', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Locations</label>
                    <button
                      type="button"
                      onClick={addLocation}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus size={14} />
                      Add Location
                    </button>
                  </div>
                  {formData.locations?.map((location, index) => (
                    <div key={index} className="flex gap-2 mb-2 p-3 border border-gray-200 rounded-lg">
                      <select
                        value={location.type || 'country'}
                        onChange={(e) => updateLocation(index, 'type', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="country">Country</option>
                        <option value="state">State</option>
                        <option value="postcode">Postcode</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Code (e.g., US, CA, 90210)"
                        value={location.code || ''}
                        onChange={(e) => updateLocation(index, 'code', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeLocation(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Shipping Method fields */}
            {type === 'shipping-methods' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zone ID *</label>
                  <input
                    type="text"
                    value={formData.zone_id || ''}
                    onChange={(e) => updateFormData('zone_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.zone_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Zone ID"
                  />
                  {errors.zone_id && <p className="text-red-600 text-sm mt-1">{errors.zone_id}</p>}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled !== false}
                    onChange={(e) => updateFormData('enabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">Enabled</label>
                </div>
              </>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div>
            {editingItem && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;