import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import fetchApi from '../utils/api';

const VALID_ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

function AdminOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { token } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState('');

  const fetchOrderDetails = useCallback(async () => {
    if (!token) { setError("Authentication token not found."); setLoading(false); return; }
    console.log(`AdminOrderDetailPage: Fetching order ${orderId}...`);
    setLoading(true); setError(null);
    try {
      const data = await fetchApi(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("AdminOrderDetailPage: Order details fetched:", data);
      setOrder(data);
      setSelectedStatus(data.status || '');
    } catch (err) { 
      console.error("AdminOrderDetailPage: Error fetching order details:", err); 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  }, [orderId, token]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleUpdateStatus = async (newStatus) => {
    if (!order) return;
    console.log(`Updating order ${orderId} status to ${newStatus}`);
    setIsUpdating(true); setError(null);
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
      setOrder(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error(`Error updating order ${orderId} status:`, err);
      setError(err.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return isoString;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-10">Loading order details...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-lg mx-auto">
          Error: {error}
        </div>
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600">
          Order not found
        </div>
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/orders')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Orders
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Order Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Order #{order.order_id}</h1>
              <p className="text-gray-600 mt-1">Placed on {formatDateTime(order.order_date)}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <select
                value={order.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={isUpdating}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-gray-800">{order.user_email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Username</p>
              <p className="text-gray-800">{order.user_username || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.order_items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      ${Number(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${Number(order.total_amount).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Order Notes */}
        {order.notes && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Notes</h2>
            <p className="text-gray-600">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrderDetailPage;
