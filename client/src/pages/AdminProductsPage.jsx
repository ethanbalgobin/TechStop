import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


function ProductForm({ initialData = {}, categories = [], onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '', description: initialData.description || '',
    price: initialData.price || '', stock_quantity: initialData.stock_quantity || '',
    image_url: initialData.image_url || '', category_id: initialData.category_id || '',
  });
  useEffect(() => {
      setFormData({
          name: initialData.name || '', description: initialData.description || '',
          price: initialData.price || '', stock_quantity: initialData.stock_quantity || '',
          image_url: initialData.image_url || '', category_id: initialData.category_id || '',
      });
  }, [initialData]);
  const handleChange = (e) => { /* ... */ const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSubmit = (e) => { /* ... */ e.preventDefault(); const submitData = { ...formData, price: parseFloat(formData.price) || 0, stock_quantity: parseInt(formData.stock_quantity, 10) || 0, category_id: formData.category_id ? parseInt(formData.category_id, 10) : null, }; onSubmit(submitData); };
  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const buttonClasses = "px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50";
  const secondaryButtonClasses = "px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50";
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{initialData.id ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label htmlFor="name" className={labelClasses}>Product Name</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputClasses} disabled={isLoading}/></div>
          <div><label htmlFor="description" className={labelClasses}>Description</label><textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} required className={inputClasses} disabled={isLoading}></textarea></div>
          <div><label htmlFor="price" className={labelClasses}>Price ($)</label><input type="number" name="price" id="price" step="0.01" min="0" value={formData.price} onChange={handleChange} required className={inputClasses} disabled={isLoading}/></div>
          <div><label htmlFor="stock_quantity" className={labelClasses}>Stock Quantity</label><input type="number" name="stock_quantity" id="stock_quantity" min="0" value={formData.stock_quantity} onChange={handleChange} required className={inputClasses} disabled={isLoading}/></div>
          <div><label htmlFor="image_url" className={labelClasses}>Image URL (Optional)</label><input type="url" name="image_url" id="image_url" value={formData.image_url} onChange={handleChange} className={inputClasses} disabled={isLoading}/></div>
          <div><label htmlFor="category_id" className={labelClasses}>Category</label><select name="category_id" id="category_id" value={formData.category_id} onChange={handleChange} className={inputClasses} disabled={isLoading}><option value="">Select a category...</option>{Array.isArray(categories) && categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div>
          <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onCancel} disabled={isLoading} className={secondaryButtonClasses}>Cancel</button><button type="submit" disabled={isLoading} className={buttonClasses}>{isLoading ? 'Saving...' : (initialData.id ? 'Update Product' : 'Add Product')}</button></div>
        </form>
      </div>
    </div>
  );
}


function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!token) { setError("Authentication token not found."); setLoading(false); return; } 
    setLoading(true); 
    setError(null); 
    try { 
      const response = await fetch('/api/admin/products', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json(); 
      if (!response.ok) { 
        throw new Error(data.error || `Failed to fetch products: ${response.status}`); 
      } 
      setProducts(data); 
    } catch (err) { 
      setError(err.message); setProducts([]); 
    } finally { 
      setLoading(false); 
    } }, [token]);

  const fetchCategories = useCallback(async () => {
     if (!token) return; 
     setLoadingCategories(true); 
     try {
      const response = await fetch('/api/admin/categories', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json(); 
      if (!response.ok) {
         throw new Error(data.error || `Failed to fetch categories: ${response.status}`); 
      } 
      setCategories(data); 
    } catch {
      setError(prev => prev ? `${prev}\nCould not load categories.` : 'Could not load categories.');
      setCategories([]); 
    } finally { setLoadingCategories(false); } }, [token]);

  useEffect(() => { fetchProducts(); fetchCategories(); }, [fetchProducts, fetchCategories]);

  // Form Handlers
  const handleShowAddForm = () => { setEditingProduct(null); setFormError(''); setShowForm(true); };
  const handleShowEditForm = (product) => { setEditingProduct(product); setFormError(''); setShowForm(true); };
  const handleCancelForm = () => { setShowForm(false); setEditingProduct(null); setFormError(''); };
  const handleFormSubmit = async (productData) => {
    setIsSubmitting(true); 
    setFormError(''); 
    const isEditing = !!editingProduct; 
    const url = isEditing ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products'; 
    const method = isEditing ? 'PUT' : 'POST';
    try { 
      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json', }, 
        body: JSON.stringify(productData), 
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'add'} product.`);
      }
      setShowForm(false);
      setEditingProduct(null);
      fetchProducts(); 
    }
    catch (err) {
      setFormError(err.message || `An error occurred.`); 
    } finally {
      setIsSubmitting(false); 
    } };

  const handleDeleteProduct = (productId, productName) => {
    console.log(`Initiating delete for Product ID: ${productId}`);
    setProductToDelete({ id: productId, name: productName });
    setDeleteConfirmChecked(false); 
    setShowDeleteConfirm(true); 
    setError('');
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || !deleteConfirmChecked) {
      console.log("Delete confirmation not checked or product not set.");
      return;
    }
    console.log(`Confirming delete for Product ID: ${productToDelete.id}`);
    setIsSubmitting(true);
    setError('');
    try {
        const response = await fetch(`/api/admin/products/${productToDelete.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Failed to delete product: ${response.status}`);
        }
        console.log(`Product ID: ${productToDelete.id} deleted successfully.`);
        setShowDeleteConfirm(false);
        setProductToDelete(null);
        fetchProducts();
    } catch (err) {
        console.error(`Error deleting product ID ${productToDelete.id}:`, err);
        setError(err.message || 'Could not delete product.'); 
        setShowDeleteConfirm(false);
        setProductToDelete(null);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  // --- Render Logic ---
  if (loading || loadingCategories) { return <div className="text-center text-gray-500 py-10">Loading data...</div>; }
  if (error && products.length === 0 && !error.includes('categories')) { return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-lg mx-auto">Error: {error}</div>; }

  // Styling classes
  const deleteButtonClasses = "px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonClasses = "px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50";
  const checkboxLabelClasses = "ml-2 block text-sm text-gray-900";
  const checkboxClasses = "h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500";


  return (
    <div className="container mx-auto px-4 py-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manage Products</h1>
        <button onClick={handleShowAddForm} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Add New Product
        </button>
      </div>

      {/* General Errors */}
      {error && <div className="text-center text-red-600 bg-red-100 p-3 rounded-md mb-4">Error: {error}</div>}

      {/* Product Table */}
      {products.length === 0 ? ( <p className="text-gray-500">No products found. Add some!</p> ) : (
        <div className="shadow-md rounded-lg overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category ID</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map(product => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs" title={product.name}>{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(product.price).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category_id || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleShowEditForm(product)} className="text-indigo-600 hover:text-indigo-900"> Edit </button>
                    <button onClick={() => handleDeleteProduct(product.id, product.name)} className="text-red-600 hover:text-red-900"> Delete </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <ProductForm
          initialData={editingProduct || {}} categories={categories}
          onSubmit={handleFormSubmit} onCancel={handleCancelForm}
          isLoading={isSubmitting}
        />
      )}
      {/* Display form-specific errors */}
      {formError && <div className="text-red-600 mt-4">{formError}</div>}


      {/* --- Delete Confirmation Dialog --- */}
      {showDeleteConfirm && productToDelete && (
         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deletion</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to delete the product "{productToDelete.name}" (ID: {productToDelete.id})? This action cannot be undone.
                </p>
                <div className="flex items-center mb-4">
                    <input
                        id="delete-confirm-checkbox"
                        name="delete-confirm-checkbox"
                        type="checkbox"
                        checked={deleteConfirmChecked}
                        onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                        className={checkboxClasses + " border-red-300"}
                    />
                    <label htmlFor="delete-confirm-checkbox" className={checkboxLabelClasses}>
                        Yes, I am sure I want to delete this product.
                    </label>
                </div>
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={handleCancelDelete}
                        disabled={isSubmitting}
                        className={secondaryButtonClasses}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={!deleteConfirmChecked || isSubmitting}
                        className={deleteButtonClasses}
                    >
                        {isSubmitting ? 'Deleting...' : 'Delete Product'}
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}

export default AdminProductsPage;
