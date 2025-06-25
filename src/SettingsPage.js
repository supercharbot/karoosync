import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Search, 
  Plus, 
  X,
  Save,
  Tag,
  Package,
  Truck,
  Calculator,
  Edit3,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { loadStoreData, createStoreItem, updateStoreItem, deleteStoreItem } from './api';
import SettingsAdvancedPage from './SettingsAdvancedPage';

const SettingsPage = ({ onStartResync }) => {
  const { getAuthToken } = useAuth();
  const [activeTab, setActiveTab] = useState('attributes');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const tabConfig = {
    attributes: { 
      icon: Tag, 
      label: 'Attributes', 
      fields: ['name', 'type', 'terms']
    },
    'shipping-classes': { 
      icon: Truck, 
      label: 'Shipping Classes', 
      fields: ['name', 'description']
    },
    tags: { 
      icon: Package, 
      label: 'Tags', 
      fields: ['name']
    },
    'tax-classes': { 
      icon: Calculator, 
      label: 'Tax Classes', 
      fields: ['name']
    },
    advanced: {
      icon: Settings,
      label: 'Advanced Settings',
      fields: []
    }
  };

  useEffect(() => {
    if (activeTab !== 'advanced') {
      loadData();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const authToken = await getAuthToken();
      const result = await loadStoreData(activeTab, authToken);
      if (result.success) {
        const dataKey = activeTab.replace('-', '_');
        setData(result[dataKey] || []);
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowCreateModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowCreateModal(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Delete ${item.name}? This action cannot be undone.`)) {
      try {
        const authToken = await getAuthToken();
        const result = await deleteStoreItem(activeTab, item.id, authToken);
        if (result.success) {
          await loadData();
        } else {
          setError(result.error || 'Failed to delete item');
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      const authToken = await getAuthToken();
      let result;
      
      if (editingItem) {
        result = await updateStoreItem(activeTab, editingItem.id, formData, authToken);
      } else {
        result = await createStoreItem(activeTab, formData, authToken);
      }
      
      if (result.success) {
        await loadData();
        setShowCreateModal(false);
      } else {
        setError(result.error || 'Failed to save item');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredData = Array.isArray(data) ? data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Settings className="w-6 h-6 mr-2" />
              Store Settings
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {Object.entries(tabConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {config.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'advanced' ? (
          <SettingsAdvancedPage onStartResync={onStartResync} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {tabConfig[activeTab].label}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {tabConfig[activeTab].label.slice(0, -1)}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${tabConfig[activeTab].label.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Items List */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-4">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="space-y-3">
                {filteredData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.description}
                        </p>
                      )}
                      {item.terms && Array.isArray(item.terms) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Terms: {item.terms.join(', ')}
                        </p>
                      )}
                      {item.count !== undefined && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Used in {item.count} products
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No {tabConfig[activeTab].label.toLowerCase()} found
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm 
                    ? `No items match "${searchTerm}"`
                    : `You haven't created any ${tabConfig[activeTab].label.toLowerCase()} yet.`
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {tabConfig[activeTab].label.slice(0, -1)}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateEditModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          item={editingItem}
          type={activeTab}
          config={tabConfig[activeTab]}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Create/Edit Modal Component
const CreateEditModal = ({ isOpen, onClose, item, type, config, onSave }) => {
  const [formData, setFormData] = useState(
    item || { name: '', description: '', terms: [] }
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({ name: '', description: '', terms: [] });
    }
  }, [item]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {item ? 'Edit' : 'Create'} {config.label.slice(0, -1)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name..."
            />
          </div>

          {config.fields.includes('description') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter description..."
              />
            </div>
          )}

          {config.fields.includes('terms') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Terms (comma separated)
              </label>
              <input
                type="text"
                value={formData.terms?.join(', ') || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  terms: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Red, Blue, Green..."
              />
            </div>
          )}

          {config.fields.includes('type') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={formData.type || 'select'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="select">Select</option>
                <option value="text">Text</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;