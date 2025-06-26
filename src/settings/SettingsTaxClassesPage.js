import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3,
  Trash2,
  Calculator,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { loadStoreData, createStoreItem, updateStoreItem, deleteStoreItem } from '../api';

const SettingsTaxClassesPage = () => {
  const { getAuthToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taxClasses, setTaxClasses] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const authToken = await getAuthToken();
      const result = await loadStoreData('tax-classes', authToken);
      
      if (result.success) {
        setTaxClasses(Object.values(result.tax_classes || {}));
      } else {
        setError(result.error || 'Failed to load tax classes');
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
    if (window.confirm(`Delete tax class "${item.name}"?`)) {
      try {
        const authToken = await getAuthToken();
        const result = await deleteStoreItem('tax-classes', item.id, authToken);
        if (result.success) {
          loadData();
        } else {
          setError(result.error || 'Failed to delete tax class');
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
        ? await updateStoreItem('tax-classes', editingItem.id, formData, authToken)
        : await createStoreItem('tax-classes', formData, authToken);
      
      if (result.success) {
        setShowCreateModal(false);
        setEditingItem(null);
        loadData();
      } else {
        setError(result.error || 'Failed to save tax class');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getFilteredTaxClasses = () => {
    return taxClasses.filter(taxClass => 
      taxClass.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      taxClass.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getTaxClassIcon = (slug) => {
    if (slug === 'standard') return '📊';
    if (slug === 'reduced-rate') return '📉';
    if (slug === 'zero-rate') return '⭕';
    return '💰';
  };

  const renderTaxClassCard = (taxClass) => (
    <div key={taxClass.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-xl">{getTaxClassIcon(taxClass.slug)}</span>
          {taxClass.name}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => handleEdit(taxClass)} 
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit tax class"
          >
            <Edit3 size={16} />
          </button>
          <button 
            onClick={() => handleDelete(taxClass)} 
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete tax class"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Slug</div>
          <div className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
            {taxClass.slug}
          </div>
        </div>
        
        {taxClass.slug === 'standard' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <DollarSign size={16} />
              <span className="text-sm font-medium">Default Tax Class</span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              This is the default tax class applied to products
            </div>
          </div>
        )}
        
        {taxClass.slug.includes('zero') && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <span className="text-lg">⭕</span>
              <span className="text-sm font-medium">Zero Rate</span>
            </div>
            <div className="text-xs text-green-600 mt-1">
              Products in this class typically have no tax applied
            </div>
          </div>
        )}
        
        {taxClass.slug.includes('reduced') && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <span className="text-lg">📉</span>
              <span className="text-sm font-medium">Reduced Rate</span>
            </div>
            <div className="text-xs text-orange-600 mt-1">
              Products in this class typically have reduced tax rates
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
        <span>Class ID: {taxClass.id}</span>
        <span>Type: {taxClass.slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
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

  const filteredTaxClasses = getFilteredTaxClasses();
  const standardClass = taxClasses.find(tc => tc.slug === 'standard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calculator size={24} className="text-blue-600" />
            Tax Classes
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Define tax classes for different tax rates and categories
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{taxClasses.length} tax classes</span>
            {standardClass && (
              <>
                <span>•</span>
                <span>Default: {standardClass.name}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Tax Class
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tax classes..."
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

      {/* Tax Classes Grid */}
      {filteredTaxClasses.length === 0 ? (
        <div className="text-center py-12">
          <Calculator size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tax classes found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search term.' : 'Create your first tax class to manage different tax rates.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Tax Class
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTaxClasses.map(taxClass => renderTaxClassCard(taxClass))}
        </div>
      )}
    </div>
  );
};

export default SettingsTaxClassesPage;