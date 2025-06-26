import React, { useState } from 'react';
import { 
  Settings, 
  Tag,
  Package,
  Truck,
  Calculator
} from 'lucide-react';
import SettingsAdvancedPage from './settings/SettingsAdvancedPage';
import SettingsAttributesPage from './settings/SettingsAttributesPage';
import SettingsShippingPage from './settings/SettingsShippingPage';
import SettingsTagsPage from './settings/SettingsTagsPage';
import SettingsTaxClassesPage from './settings/SettingsTaxClassesPage';

const SettingsPage = ({ onStartResync }) => {
  const [activeTab, setActiveTab] = useState('attributes');

  const tabConfig = {
    attributes: { 
      icon: Tag, 
      label: 'Attributes',
      component: SettingsAttributesPage
    },
    shipping: { 
      icon: Truck, 
      label: 'Shipping',
      component: SettingsShippingPage
    },
    tags: { 
      icon: Package, 
      label: 'Tags',
      component: SettingsTagsPage
    },
    'tax-classes': { 
      icon: Calculator, 
      label: 'Tax Classes',
      component: SettingsTaxClassesPage
    },
    advanced: {
      icon: Settings,
      label: 'Advanced Settings',
      component: SettingsAdvancedPage
    }
  };

  const renderContent = () => {
    const TabComponent = tabConfig[activeTab].component;
    return <TabComponent onStartResync={onStartResync} />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
            {Object.entries(tabConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {React.createElement(config.icon, { size: 16 })}
                {config.label}
              </button>
            ))}
          </nav>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default SettingsPage;