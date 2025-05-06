import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // For linking to individual order details
import { useAuth } from '../context/AuthContext'; // To get the token for API calls

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth(); // Get token for authenticated API requests

  // Fetch all orders
  const fetchAllOrders = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found. Admin access required.");
      setLoading(false);
      return;
    }
    console.log("AdminOrdersPage: Fetching all orders for admin...");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch orders: ${response.status}`);
      }
      console.log("AdminOrdersPage: All orders fetched successfully:", data.length);
      setOrders(data);
    } catch (err) {
      console.error("AdminOrdersPage: Error fetching all orders:", err);
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // Helper function to format date/time
  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return isoString; }
  };

  // Placeholder for status update logic
  const handleUpdateStatus = (orderId, newStatus) => {
    console.log(`TODO: Implement update status for Order ID: ${orderId} to status: ${newStatus}`);
    // This would involve a PUT request to a new admin API endpoint
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
                    {/* TODO: Make status editable later */}
                    {order.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {/* TODO: Link to a specific Admin Order Detail page later */}
                    <Link
                      to={`/admin/orders/${order.order_id}`} // Placeholder for admin order detail route
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
                    {/* Placeholder for status update trigger */}
                    {/* <button onClick={() => handleUpdateStatus(order.order_id, 'Shipped')} className="text-green-600 hover:text-green-900">Mark Shipped</button> */}
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
