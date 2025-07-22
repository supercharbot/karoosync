import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Edit, Trash2, AlertTriangle, FolderPlus, Settings } from 'lucide-react';
import { useAuth } from './AuthContext';
import { createCategory, updateCategory, deleteCategory, updateProduct } from './api';

const MasterModal = ({ 
  isOpen, 
  onClose, 
  action, // 'create-category', 'edit-category', 'delete-category', 'move-product'
  item, // category or product data
  parentCategories = [],
  onSuccess 
}) => {
  const { getAuthToken } = useAuth();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data based on action and item
  useEffect(() => {
    if (isOpen) {
      initializeFormData();
      setError('');
    }
  }, [isOpen, action, item]);

  const initializeFormData = () => {
    switch (action) {
      case 'create-category':
        setFormData({
          name: '',
          description: '',
          parent: '0'
        });
        break;
      case 'edit-category':
        setFormData({
          name: item?.name || '',
          slug: item?.slug || '',
          parent: item?.parent_id?.toString() || '0'
        });
        break;
      case 'delete-category':
        setFormData({}); // No form data needed for delete
        break;
      case 'move-product':
        setFormData({
          category: item?.categories?.[0]?.id?.toString() || ''
        });
        break;
      default:
        setFormData({});
    }
  };

  // Auto-generate slug from name for create and edit (if slug is empty)
  useEffect(() => {
    if ((action === 'create-category' || action === 'edit-category') && formData.name) {
      if (!formData.slug || (action === 'create-category')) {
        const slug = formData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        setFormData(prev => ({ ...prev, slug }));
      }
    }
  }, [formData.name, action]);

  const handleClose = () => {
    setFormData({});
    setError('');
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const authToken = await getAuthToken();
      let result;

      switch (action) {
        case 'create-category':
          result = await createCategory({
            name: formData.name.trim(),
            description: formData.description?.trim() || '',
            parent: parseInt(formData.parent) || 0
          }, authToken);
          break;

        case 'edit-category':
          result = await updateCategory(item.id, {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            parent: parseInt(formData.parent) || 0
          }, authToken);
          break;

        case 'delete-category':
          result = await deleteCategory(item.id, authToken);
          break;

        case 'move-product':
          result = await updateProduct(item.id, {
            categories: [{ id: parseInt(formData.category) }]
          }, authToken);
          break;

        default:
          throw new Error('Unknown action');
      }

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || `Failed to ${action.replace('-', ' ')}`);
      }
    } catch (err) {
      setError(err.message || `Failed to ${action.replace('-', ' ')}`);
    }

    setLoading(false);
  };

  const validateForm = () => {
    if (action === 'create-category' || action === 'edit-category') {
      if (!formData.name?.trim()) {
        setError('Category name is required');
        return false;
      }
    }
    if (action === 'move-product') {
      if (!formData.category) {
        setError('Please select a category');
        return false;
      }
    }
    return true;
  };

  const getModalConfig = () => {
    switch (action) {
      case 'create-category':
        return {
          title: 'Create New Category',
          icon: <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          submitText: 'Create Category',
          submitBg: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'edit-category':
        return {
          title: 'Edit Category',
          icon: <Edit className="w-5 h-5 text-green-600 dark:text-green-400" />,
          iconBg: 'bg-green-100 dark:bg-green-900/20',
          submitText: 'Update Category',
          submitBg: 'bg-green-600 hover:bg-green-700'
        };
      case 'delete-category':
        return {
          title: 'Delete Category',
          icon: <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />,
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          submitText: 'Delete Category',
          submitBg: 'bg-red-600 hover:bg-red-700'
        };
      case 'move-product':
        return {
          title: 'Move Product',
          icon: <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          submitText: 'Move Product',
          submitBg: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          title: 'Action',
          icon: <Plus className="w-5 h-5" />,
          iconBg: 'bg-gray-100',
          submitText: 'Submit',
          submitBg: 'bg-blue-600 hover:bg-blue-700'
        };
    }
  };

  const renderFormContent = () => {
    switch (action) {
      case 'create-category':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter category name"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter category description (optional)"
                rows={3}
              />
            </div>

            {parentCategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Category
                </label>
                <select
                  value={formData.parent}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="0">None (Top Level)</option>
                  {parentCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.parent_id === 0 ? category.name : `-- ${category.name}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        );

      case 'edit-category':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter category name"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="category-slug"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                URL-friendly version of the name
              </p>
            </div>

            {parentCategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Category
                </label>
                <select
                  value={formData.parent}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="0">None (Top Level)</option>
                  {parentCategories
                    .filter(cat => cat.id !== item?.id) // Prevent category from being its own parent
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.parent_id === 0 ? cat.name : `-- ${cat.name}`}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </>
        );

      case 'delete-category':
        return (
          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Are you sure you want to delete the category <strong>"{item?.name}"</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              This action cannot be undone. All products in this category will be moved to "Uncategorized".
            </p>
          </div>
        );

      case 'move-product':
        return (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Move "{item?.name}" to a different category
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Move to Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Select category...</option>
              {parentCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.parent_id === 0 ? category.name : `-- ${category.name}`}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const config = getModalConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className={`w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center mr-3`}>
              {config.icon}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {config.title}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4 mb-6">
            {renderFormContent()}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 ${config.submitBg} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {action.includes('create') ? 'Creating...' : action.includes('edit') ? 'Updating...' : action.includes('delete') ? 'Deleting...' : 'Moving...'}
                </>
              ) : (
                <>
                  {action === 'delete-category' && <Trash2 className="w-4 h-4 mr-2" />}
                  {config.submitText}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MasterModal;