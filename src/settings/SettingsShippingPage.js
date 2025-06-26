import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3,
  Trash2,
  Truck,
  Globe,
  ShoppingCart,
  Package,
  MapPin,
  Settings as SettingsIcon,
  CheckCircle,
  XCircle,
  Hash,
  ChevronDown,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { loadStoreData, createStoreItem, updateStoreItem, deleteStoreItem } from '../api';

const SettingsShippingPage = () => {
  const { getAuthToken } = useAuth();
  const [activeShippingTab, setActiveShippingTab] = useState('classes');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('all');
  
  const [shippingData, setShippingData] = useState({
    classes: [],
    zones: [],
    methods: []
  });

  const shippingTabs = {
    classes: { icon: Package, label: 'Classes' },
    zones: { icon: Globe, label: 'Zones' },
    methods: { icon: ShoppingCart, label: 'Methods' }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const authToken = await getAuthToken();
      const [classesResult, zonesResult, methodsResult] = await Promise.all([
        loadStoreData('shipping-classes', authToken),
        loadStoreData('shipping-zones', authToken),
        loadStoreData('shipping-methods', authToken)
      ]);

      setShippingData({
        classes: classesResult.success ? Object.values(classesResult.classes || {}) : [],
        zones: zonesResult.success ? Object.values(zonesResult.zones || {}) : [],
        methods: methodsResult.success ? Object.values(methodsResult.methods || {}) : []
      });
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
    const itemName = item.name || item.title;
    if (window.confirm(`Delete ${itemName}?`)) {
      try {
        const authToken = await getAuthToken();
        const result = await deleteStoreItem(`shipping-${activeShippingTab}`, item.id, authToken);
        if (result.success) {
          loadData();
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
      const result = editingItem 
        ? await updateStoreItem(`shipping-${activeShippingTab}`, editingItem.id, formData, authToken)
        : await createStoreItem(`shipping-${activeShippingTab}`, formData, authToken);
      
      if (result.success) {
        setShowCreateModal(false);
        setEditingItem(null);
        loadData();
      } else {
        setError(result.error || 'Failed to save item');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getFilteredData = () => {
    let data = shippingData[activeShippingTab] || [];
    
    // Search filter
    data = data.filter(item => {
      const searchableText = [
        item.name || '',
        item.title || '',
        item.description || '',
        item.zone_name || '',
        item.method_title || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm.toLowerCase());
    });

    // Enabled filter for methods
    if (activeShippingTab === 'methods' && filterEnabled !== 'all') {
      data = data.filter(item => 
        filterEnabled === 'enabled' ? item.enabled : !item.enabled
      );
    }

    return data;
  };

  const getZoneMethods = (zoneId) => {
    return shippingData.methods.filter(method => method.zone_id === zoneId);
  };

  const renderLocationBadge = (location) => {
    const getLocationDisplay = (loc) => {
      if (loc.type === 'country') return `🌍 ${loc.code}`;
      if (loc.type === 'state') return `📍 ${loc.code}`;
      if (loc.type === 'postcode') return `📮 ${loc.code}`;
      return `📍 ${loc.code}`;
    };

    return (
      <span key={`${location.type}-${location.code}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
        {getLocationDisplay(location)}
      </span>
    );
  };

  const renderMethodSettings = (settings) => {
    if (!settings || Object.keys(settings).length === 0) {
      return <span className="text-gray-500 italic">No settings</span>;
    }

    const settingsEntries = Object.entries(settings).slice(0, 3);
    
    return (
      <div className="space-y-1">
        {settingsEntries.map(([key, setting]) => (
          <div key={key} className="flex justify-between text-xs">
            <span className="font-medium text-gray-600">{setting.label || key}:</span>
            <span className="text-gray-900 max-w-24 truncate">{setting.value || 'Not set'}</span>
          </div>
        ))}
        {Object.keys(settings).length > 3 && (
          <div className="text-xs text-gray-500 text-center">+{Object.keys(settings).length - 3} more</div>
        )}
      </div>
    );
  };

  const renderShippingClassCard = (shippingClass) => (
    <div key={shippingClass.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Package size={16} className="text-blue-600" />
          {shippingClass.name}
        </h3>
        <div className="flex gap-1">
          <button onClick={() => handleEdit(shippingClass)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
            <Edit3 size={14} />
          </button>
          <button onClick={() => handleDelete(shippingClass)} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {shippingClass.description && (
        <p className="text-sm text-gray-600 mb-2">{shippingClass.description}</p>
      )}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{shippingClass.slug}</span>
        <span>{shippingClass.count || 0} products</span>
      </div>
    </div>
  );

  const renderShippingZoneCard = (zone) => {
    const zoneMethods = getZoneMethods(zone.id);
    
    return (
      <div key={zone.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Globe size={16} className="text-blue-600" />
            {zone.name}
          </h3>
          <div className="flex gap-1">
            <button onClick={() => handleEdit(zone)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
              <Edit3 size={14} />
            </button>
            <button onClick={() => handleDelete(zone)} className="p-1 text-red-600 hover:bg-red-50 rounded">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {/* Locations */}
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
            <MapPin size={12} />
            Locations
          </h4>
          {zone.detailed_locations && zone.detailed_locations.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {zone.detailed_locations.slice(0, 4).map(location => renderLocationBadge(location))}
              {zone.detailed_locations.length > 4 && (
                <span className="text-xs text-gray-500">+{zone.detailed_locations.length - 4}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-500">No specific locations</span>
          )}
        </div>

        {/* Methods */}
        <div className="mb-2">
          <h4 className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
            <Truck size={12} />
            Methods ({zoneMethods.length})
          </h4>
          {zoneMethods.length > 0 ? (
            <div className="space-y-1">
              {zoneMethods.slice(0, 2).map(method => (
                <div key={method.id} className="flex items-center justify-between text-xs bg-gray-50 p-1 rounded">
                  <span>{method.title}</span>
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    method.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {method.enabled ? 'On' : 'Off'}
                  </span>
                </div>
              ))}
              {zoneMethods.length > 2 && (
                <div className="text-xs text-gray-500 text-center">+{zoneMethods.length - 2} more</div>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-500">No methods</span>
          )}
        </div>
        
        <div className="text-xs text-gray-500">Order: {zone.order || 0} • ID: {zone.id}</div>
      </div>
    );
  };

  const renderShippingMethodCard = (method) => (
    <div key={method.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <CreditCard size={16} className="text-blue-600" />
          {method.title}
        </h3>
        <div className="flex items-center gap-1">
          {method.enabled ? (
            <CheckCircle size={14} className="text-green-600" />
          ) : (
            <XCircle size={14} className="text-red-600" />
          )}
          <button onClick={() => handleEdit(method)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
            <Edit3 size={14} />
          </button>
          <button onClick={() => handleDelete(method)} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 mb-3 text-sm">
        <div><span className="font-medium">Zone:</span> {method.zone_name}</div>
        <div><span className="font-medium">Type:</span> {method.method_title}</div>
      </div>

      {/* Settings */}
      <div className="mb-2">
        <h4 className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
          <SettingsIcon size={12} />
          Settings
        </h4>
        <div className="bg-gray-50 p-2 rounded text-xs">
          {renderMethodSettings(method.settings)}
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        Order: {method.order} • Instance: {method.instance_id}
      </div>
    </div>
  );

  const renderContent = () => {
    const filteredData = getFilteredData();
    
    return (
      <div className="grid gap-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              {React.createElement(shippingTabs[activeShippingTab].icon, { size: 32 })}
            </div>
            <h3 className="font-medium text-gray-900 mb-1">
              No {shippingTabs[activeShippingTab].label.toLowerCase()} found
            </h3>
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'Try adjusting your search.' : `Create your first shipping ${activeShippingTab.slice(0, -1)}.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredData.map(item => {
              if (activeShippingTab === 'classes') return renderShippingClassCard(item);
              if (activeShippingTab === 'zones') return renderShippingZoneCard(item);
              if (activeShippingTab === 'methods') return renderShippingMethodCard(item);
              return null;
            })}
          </div>
        )}
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

  const activeData = shippingData[activeShippingTab] || [];
  const enabledCount = activeShippingTab === 'methods' 
    ? shippingData.methods.filter(m => m.enabled).length 
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Truck size={24} className="text-blue-600" />
            Shipping Settings
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage shipping classes, zones, and methods
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{shippingData.classes.length} classes</span>
            <span>•</span>
            <span>{shippingData.zones.length} zones</span>
            <span>•</span>
            <span>{shippingData.methods.length} methods</span>
            {enabledCount !== null && (
              <>
                <span>•</span>
                <span>{enabledCount} enabled</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add {shippingTabs[activeShippingTab].label.slice(0, -1)}
        </button>
      </div>

      {/* Shipping Tabs */}
      <div className="border-b border-gray-200 bg-white p-1 rounded-lg">
        <nav className="flex space-x-1">
          {Object.entries(shippingTabs).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveShippingTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeShippingTab === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {React.createElement(config.icon, { size: 16 })}
              {config.label}
              <span className="text-xs opacity-75">
                ({shippingData[key]?.length || 0})
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${shippingTabs[activeShippingTab].label.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {activeShippingTab === 'methods' && (
          <select
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Methods</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default SettingsShippingPage;