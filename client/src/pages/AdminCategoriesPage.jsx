import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/authContext';
import fetchApi from '../utils/api';

function CategoryForm({ initialData = {}, onSubmit, onCancel, isLoading, formError }) {
  const [name, setName] = useState(initialData.name || '');
  const [description, setDescription] = useState(initialData.description || '');

  useEffect(() => {
    setName(initialData.name || '');
    setDescription(initialData.description || '');
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { 
        alert("Category name cannot be empty.");
        return;
    }
    onSubmit({ name, description });
  };

  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const buttonClasses = "px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50";
  const secondaryButtonClasses = "px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50";

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {initialData.id ? 'Edit Category' : 'Add New Category'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category-name" className={labelClasses}>Category Name</label>
            <input type="text" name="name" id="category-name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClasses} disabled={isLoading} />
          </div>
          <div>
            <label htmlFor="category-description" className={labelClasses}>Description (Optional)</label>
            <textarea name="description" id="category-description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} disabled={isLoading}></textarea>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onCancel} disabled={isLoading} className={secondaryButtonClasses}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className={buttonClasses}>
              {isLoading ? 'Saving...' : (initialData.id ? 'Update Category' : 'Add Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!token) { setError("Authentication token not found."); setLoading(false); return; }
    console.log("AdminCategoriesPage: Fetching categories...");
    setLoading(true); setError(null);
    try {
      const data = await fetchApi('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("AdminCategoriesPage: Categories fetched:", data.length);
      setCategories(data);
    } catch (err) { 
      console.error("AdminCategoriesPage: Error fetching categories:", err); 
      setError(err.message); 
      setCategories([]);
    } finally { 
      setLoading(false); 
    }
  }, [token]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleShowAddForm = () => { setEditingCategory(null); setFormError(''); setShowForm(true); };
  const handleShowEditForm = (category) => { setEditingCategory(category); setFormError(''); setShowForm(true); };
  const handleCancelForm = () => { setShowForm(false); setEditingCategory(null); setFormError(''); };

  const handleFormSubmit = async (categoryData) => {
    setIsSubmitting(true); setFormError('');
    const isEditing = !!editingCategory;
    const url = isEditing ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
    const method = isEditing ? 'PUT' : 'POST';
    console.log(`Submitting ${isEditing ? 'update' : 'add'} for category:`, categoryData);
    try {
      const result = await fetchApi(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      console.log(`Category ${isEditing ? 'updated' : 'added'} successfully:`, result);
      setShowForm(false); setEditingCategory(null); fetchCategories(); // Refresh list
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} category:`, err); 
      setFormError(err.message || `An error occurred.`);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteCategory = (categoryId, categoryName) => {
    setCategoryToDelete({ id: categoryId, name: categoryName });
    setDeleteConfirmChecked(false);
    setShowDeleteConfirm(true);
    setError('');
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete || !deleteConfirmChecked) return;
    setIsSubmitting(true); setError('');
    try {
      const result = await fetchApi(`/api/admin/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log(`Category ID: ${categoryToDelete.id} deleted successfully.`);
      setShowDeleteConfirm(false); setCategoryToDelete(null); fetchCategories();
    } catch (err) {
      console.error(`Error deleting category ID ${categoryToDelete.id}:`, err); 
      setError(err.message || 'Could not delete category.'); 
      setShowDeleteConfirm(false); 
      setCategoryToDelete(null);
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleCancelDelete = () => { 
    setShowDeleteConfirm(false); 
    setCategoryToDelete(null); 
  };

  const deleteButtonClasses = "px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonClassesDelete = "px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"; // Renamed to avoid conflict
  const checkboxLabelClasses = "ml-2 block text-sm text-gray-900";
  const checkboxClasses = "h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500";

  // Render Logic
  if (loading) { return <div className="text-center text-gray-500 py-10">Loading categories...</div>; }
  // Show primary error if category fetch failed and no categories are loaded
  if (error && categories.length === 0 && !error.includes('categories')) {
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-lg mx-auto">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manage Categories</h1>
        <button onClick={handleShowAddForm} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Add New Category
        </button>
      </div>

      {/* General page errors */}
      {error && <div className="text-center text-red-600 bg-red-100 p-3 rounded-md mb-4">Error: {error}</div>}

      {categories.length === 0 && !loading ? (
        <p className="text-gray-500">No categories found. Add some!</p>
      ) : (
        <div className="shadow-md rounded-lg overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map(category => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-md" title={category.description || ''}>
                    {category.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleShowEditForm(category)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Conditional rendering for Add/Edit Form --- */}
      {showForm && (
        <CategoryForm
          initialData={editingCategory || {}}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          isLoading={isSubmitting}
          formError={formError}
        />
      )}

      {/* --- Conditional rendering for Delete Confirmation --- */}
      {showDeleteConfirm && categoryToDelete && (
         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deletion</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to delete the category "{categoryToDelete.name}" (ID: {categoryToDelete.id})? This action cannot be undone.
                </p>
                <div className="flex items-center mb-4">
                    <input
                        id="delete-confirm-checkbox"
                        name="delete-confirm-checkbox"
                        type="checkbox"
                        checked={deleteConfirmChecked}
                        onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                        className={checkboxClasses}
                    />
                    <label htmlFor="delete-confirm-checkbox" className={checkboxLabelClasses}>
                        Yes, I am sure I want to delete this category.
                    </label>
                </div>
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={handleCancelDelete}
                        disabled={isSubmitting}
                        className={secondaryButtonClassesDelete} // Use renamed class
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={!deleteConfirmChecked || isSubmitting}
                        className={deleteButtonClasses}
                    >
                        {isSubmitting ? 'Deleting...' : 'Delete Category'}
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}

export default AdminCategoriesPage;
