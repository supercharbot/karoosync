import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3,
  Trash2,
  Package,
  Hash
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { loadStoreData, createStoreItem, updateStoreItem, deleteStoreItem } from '../api';

const SettingsTagsPage = () => {
  const { getAuthToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tags, setTags] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const authToken = await getAuthToken();
      const result = await loadStoreData('tags', authToken);
      
      if (result.success) {
        setTags(Object.values(result.tags || {}));
      } else {
        setError(result.error || 'Failed to load tags');
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
    if (window.confirm(`Delete tag "${item.name}"?`)) {
      try {
        const authToken = await getAuthToken();
        const result = await deleteStoreItem('tags', item.id, authToken);
        if (result.success) {
          loadData();
        } else {
          setError(result.error || 'Failed to delete tag');
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      const authToken = await getAuthToken();
      const result = editingItem 
        ? await updateStoreItem('tags', editingItem.id, formData, authToken)
        : await createStoreItem('tags', formData, authToken);
      
      if (result.success) {
        setShowCreateModal(false);
        setEditingItem(null);
        loadData();
      } else {
        setError(result.error || 'Failed to save tag');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getFilteredTags = () => {
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tag.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const renderTagCard = (tag) => (
    <div key={tag.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Hash size={20} className="text-blue-600" />
          {tag.name}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => handleEdit(tag)} 
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit tag"
          >
            <Edit3 size={16} />
          </button>
          <button 
            onClick={() => handleDelete(tag)} 
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete tag"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {tag.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">{tag.description}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Slug</div>
          <div className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
            {tag.slug}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Products</div>
          <div className="flex items-center gap-1">
            <Package size={14} className="text-gray-400" />
            <span className="text-sm text-gray-900">{tag.count || 0}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
        <span>Tag ID: {tag.id}</span>
        {tag.count > 0 && (
          <span className="flex items-center gap-1">
            <Package size={12} />
            Used by {tag.count} products
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredTags = getFilteredTags();
  const totalProducts = tags.reduce((sum, tag) => sum + (tag.count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Package size={24} className="text-blue-600" />
            Product Tags
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Organize and categorize products with descriptive tags
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{tags.length} tags</span>
            <span>•</span>
            <span>{totalProducts} tag assignments</span>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Tag
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tags..."
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

      {/* Tags Grid */}
      {filteredTags.length === 0 ? (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tags found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search term.' : 'Create your first product tag to organize your catalog.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Tag
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTags.map(tag => renderTagCard(tag))}
        </div>
      )}
    </div>
  );
};

export default SettingsTagsPage;