import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import fetchApi from '../utils/api';

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const fetchOrders = useCallback(async () => {
    if (!token) { setError("Authentication token not found."); setLoading(false); return; }
    console.log("AdminOrdersPage: Fetching orders...");
    setLoading(true); setError(null);
    try {
      const data = await fetchApi('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("AdminOrdersPage: Orders fetched:", data.length);
      setOrders(data);
    } catch (err) { 
      console.error("AdminOrdersPage: Error fetching orders:", err); 
      setError(err.message); 
      setOrders([]);
    } finally { 
      setLoading(false); 
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    console.log(`Updating order ${orderId} status to ${newStatus}`);
    try {
      const result = await fetchApi(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      console.log(`Order ${orderId} status updated successfully:`, result);
      fetchOrders(); // Refresh the orders list
    } catch (err) {
      console.error(`Error updating order ${orderId} status:`, err);
      setError(err.message || 'Failed to update order status');
    }
  };

  // Helper
  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
    } catch (err) {
      return isoString || err; 
    }
  };

  // --- Render Logic ---
  if (loading) {
    return <div className="text-center text-gray-500 py-10">Loading all orders...</div>;
  }
  if (error) {
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-lg mx-auto">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage All Orders</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found.</p>
      ) : (
        <div className="shadow-md rounded-lg overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Placed</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User (Email)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.order_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(order.order_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.user_email} ({order.user_username || 'N/A'})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(order.total_amount).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      to={`/admin/orders/${order.order_id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminOrdersPage;
