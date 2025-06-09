import React from 'react';
import { Package, ShoppingCart, TrendingUp, Clock } from 'lucide-react';

const Dashboard = ({ userData }) => {
  const totalProducts = userData?.metadata?.totalProducts || 0;
  const totalCategories = userData?.metadata?.categories?.length || 0;
  const lastSync = userData?.metadata?.cachedAt ? new Date(userData.metadata.cachedAt).toLocaleDateString() : 'Never';

  const stats = [
    {
      name: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      name: 'Categories',
      value: totalCategories,
      icon: ShoppingCart,
      color: 'bg-green-500'
    },
    {
      name: 'Last Sync',
      value: lastSync,
      icon: Clock,
      color: 'bg-purple-500'
    },
    {
      name: 'Status',
      value: 'Connected',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your WooCommerce store</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Store data synchronized</p>
              <p className="text-sm text-gray-500">{lastSync}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Completed
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Connected to WooCommerce</p>
              <p className="text-sm text-gray-500">Authentication successful</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;