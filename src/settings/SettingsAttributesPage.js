import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Tag,
  ChevronDown,
  ChevronRight,
  Hash,
  Archive
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { loadStoreData, createStoreItem, updateStoreItem, deleteStoreItem } from '../api';
import SettingsModal from './SettingsModal';

const SettingsAttributesPage = () => {
  const { getAuthToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [expandedAttributes, setExpandedAttributes] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const authToken = await getAuthToken();
      const result = await loadStoreData('attributes', authToken);
      
      if (result.success) {
        setAttributes(Object.values(result.attributes || {}));
      } else {
        setError(result.error || 'Failed to load attributes');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSave = async (formData) => {
    setModalLoading(true);
    try {
      const authToken = await getAuthToken();
      const result = editingItem 
        ? await updateStoreItem('attributes', editingItem.id, formData, authToken)
        : await createStoreItem('attributes', formData, authToken);
      
      if (result.success) {
        setShowModal(false);
        setEditingItem(null);
        loadData();
      } else {
        setError(result.error || 'Failed to save attribute');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (item) => {
    setModalLoading(true);
    try {
      const authToken = await getAuthToken();
      const result = await deleteStoreItem('attributes', item.id, authToken);
      if (result.success) {
        setShowModal(false);
        loadData();
      } else {
        setError(result.error || 'Failed to delete attribute');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const getFilteredAttributes = () => {
    return attributes.filter(attribute => 
      attribute.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attribute.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const toggleAttributeExpansion = (attributeId) => {
    const newExpanded = new Set(expandedAttributes);
    if (newExpanded.has(attributeId)) {
      newExpanded.delete(attributeId);
    } else {
      newExpanded.add(attributeId);
    }
    setExpandedAttributes(newExpanded);
  };

  const getAttributeTypeIcon = (type) => {
    switch (type) {
      case 'select': return '📋';
      case 'text': return '📝';
      case 'color': return '🎨';
      case 'image': return '🖼️';
      default: return '📋';
    }
  };

  const getAttributeTypeLabel = (type) => {
    switch (type) {
      case 'select': return 'Select';
      case 'text': return 'Text';
      case 'color': return 'Color';
      case 'image': return 'Image';
      default: return 'Select';
    }
  };

  const renderAttributeCard = (attribute) => {
    const isExpanded = expandedAttributes.has(attribute.id);
    const termCount = attribute.terms ? Object.keys(attribute.terms).length : 0;
    
    return (
      <div key={attribute.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Tag size={20} className="text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{attribute.name}</h3>
              <p className="text-sm text-gray-600 font-mono">{attribute.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {termCount > 0 && (
              <button
                onClick={() => toggleAttributeExpansion(attribute.id)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                title={`${isExpanded ? 'Hide' : 'Show'} terms`}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            <button 
              onClick={() => handleEdit(attribute)} 
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
        
        {/* Attribute Info */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getAttributeTypeIcon(attribute.type)}</span>
              <span className="text-sm text-gray-900">{getAttributeTypeLabel(attribute.type)}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Terms</div>
            <div className="flex items-center gap-1">
              <Hash size={14} className="text-gray-400" />
              <span className="text-sm text-gray-900">{termCount}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Archives</div>
            <div className="flex items-center gap-1">
              <Archive size={14} className="text-gray-400" />
              <span className="text-sm text-gray-900">
                {attribute.has_archives ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Terms (Expandable) */}
        {isExpanded && termCount > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Terms ({termCount})</h4>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {Object.values(attribute.terms).map(term => (
                <div key={term.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{term.name}</div>
                    <div className="text-xs text-gray-600 font-mono">{term.slug}</div>
                    {term.description && (
                      <div className="text-xs text-gray-500 mt-1">{term.description}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {term.count || 0} products
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Attribute Meta */}
        <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
          <span>ID: {attribute.id}</span>
          <span>Type: {attribute.type}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredAttributes = getFilteredAttributes();
  const totalTerms = attributes.reduce((sum, attr) => sum + (attr.terms ? Object.keys(attr.terms).length : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Tag size={24} className="text-blue-600" />
            Product Attributes
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage product attributes and their terms for variations and filters
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{attributes.length} attributes</span>
            <span>•</span>
            <span>{totalTerms} terms</span>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Attribute
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search attributes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Attributes Grid */}
      {filteredAttributes.length === 0 ? (
        <div className="text-center py-12">
          <Tag size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No attributes found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search term.' : 'Create your first product attribute to organize variations.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Attribute
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {filteredAttributes.map(attribute => renderAttributeCard(attribute))}
        </div>
      )}

      {/* Modal */}
      <SettingsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type="attributes"
        editingItem={editingItem}
        onSave={handleSave}
        onDelete={handleDelete}
        loading={modalLoading}
      />
    </div>
  );
};

export default SettingsAttributesPage;