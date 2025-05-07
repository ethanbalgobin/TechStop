import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const VALID_ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

function AdminOrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState('');


  // Helper function to format date/time
  const formatDateTime = (isoString) => { 
    if (!isoString) return 'N/A'; 
    try {
         return new Date(isoString).toLocaleString(undefined, 
            { year: 'numeric', 
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit' }); 
        } catch (err) { 
          return isoString || err ;
        } 
      };

  const fetchOrderDetails = useCallback(async () => {
    if (!token || !orderId) { setError("Missing token or Order ID."); setLoading(false); return; }
    setLoading(true); setError(null); setStatusUpdateError(''); setStatusUpdateSuccess('');
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', },
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error || `Failed to fetch order details: ${response.status}`); }
      console.log("AdminOrderDetailPage: Order details fetched:", data);
      setOrder(data);
      setSelectedStatus(data.status || '');
    } catch (err) {
      console.error("AdminOrderDetailPage: Error fetching order details:", err);
      setError(err.message); setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [token, orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);


  const handleStatusUpdate = async () => {
    if (!selectedStatus || selectedStatus === order?.status) {
      setStatusUpdateError("Please select a new status or no change detected.");
      setTimeout(() => setStatusUpdateError(''), 3000);
      return;
    }
    if (!VALID_ORDER_STATUSES.includes(selectedStatus)) {
        setStatusUpdateError("Invalid status selected.");
        setTimeout(() => setStatusUpdateError(''), 3000);
        return;
    }

    console.log(`AdminOrderDetailPage: Updating status for Order ID: ${orderId} to ${selectedStatus}`);
    setIsUpdatingStatus(true);
    setStatusUpdateError('');
    setStatusUpdateSuccess('');

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: selectedStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to update order status: ${response.status}`);
      }
      console.log("AdminOrderDetailPage: Order status updated successfully:", data);
      setOrder(data);
      setSelectedStatus(data.status);
      setStatusUpdateSuccess(`Order status successfully updated to "${data.status}".`);
      setTimeout(() => {
        setStatusUpdateSuccess('');
        fetchOrderDetails();
      }, 3000);
    } catch (err) {
      console.error("AdminOrderDetailPage: Error updating order status:", err);
      setStatusUpdateError(err.message || "Could not update status.");
      setTimeout(() => setStatusUpdateError(''), 5000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };


  if (loading) { return <div className="text-center text-gray-500 py-10">Loading order details...</div>; }
  if (error) { return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-lg mx-auto">Error: {error}</div>; }
  if (!order) { return <div className="text-center text-gray-500 py-10">Order not found.</div>; }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/admin/orders" className="inline-block mb-6 text-blue-600 hover:text-blue-800 hover:underline">
        &larr; Back to All Orders
      </Link>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Order Details - ID: {order.order_id}</h1>

      {/* Main Order Info Section */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Order Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <div>
            <span className="font-medium text-gray-500 block">Order ID:</span>
            <span className="text-gray-900">{order.order_id}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500 block">Date Placed:</span>
            <span className="text-gray-900">{formatDateTime(order.order_date)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500 block">Total Amount:</span>
            <span className="text-gray-900 font-semibold">${Number(order.total_amount).toFixed(2)}</span>
          </div>
          {/* --- Status Display and Update UI --- */}
          <div className="md:col-span-1 lg:col-span-1">
            <label htmlFor="orderStatus" className="font-medium text-gray-500 block mb-1">Status:</label>
            <select
                id="orderStatus"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-2" // Added mb-2
                disabled={isUpdatingStatus}
            >
                {VALID_ORDER_STATUSES.map(statusOption => (
                    <option key={statusOption} value={statusOption}>{statusOption}</option>
                ))}
            </select>
            <button
                onClick={handleStatusUpdate}
                disabled={isUpdatingStatus || selectedStatus === order.status}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUpdatingStatus ? 'Saving...' : 'Update Status'}
            </button>
            {/* Status update messages */}
            {statusUpdateError && <p className="text-xs text-red-500 mt-1">{statusUpdateError}</p>}
            {statusUpdateSuccess && <p className="text-xs text-green-500 mt-1">{statusUpdateSuccess}</p>}
          </div>
          {/* --- End Status Display and Update UI --- */}
          <div>
            <span className="font-medium text-gray-500 block">Payment Intent ID:</span>
            <span className="text-gray-900 break-all">{order.payment_intent_id || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Customer & Shipping Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Customer Information</h2>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium text-gray-500">User ID:</span><span className="text-gray-900 ml-2">{order.user_id}</span></div>
            <div><span className="font-medium text-gray-500">Username:</span><span className="text-gray-900 ml-2">{order.customer_username || 'N/A'}</span></div>
            <div><span className="font-medium text-gray-500">Email:</span><span className="text-gray-900 ml-2">{order.customer_email || 'N/A'}</span></div>
          </div>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Shipping Address</h2>
          {order.shippingAddress ? ( 
            <div className="text-sm text-gray-700 space-y-1"> 
            <p>{order.shippingAddress.address_line1}</p> 
            {order.shippingAddress.address_line2 && <p>{order.shippingAddress.address_line2}</p>}
            <p>{order.shippingAddress.city}, {order.shippingAddress.state_province_region || ''}</p>
            <p>{order.shippingAddress.postal_code}</p> <p>{order.shippingAddress.country}</p> </div>
             ) : (
             <p className="text-sm text-gray-500">Shipping address not available.</p>
             )}
        </div>
      </div>

      {/* Items Ordered Section */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Items Ordered ({order.items?.length || 0})</h2>
        {order.items && order.items.length > 0 ? ( 
            <div className="divide-y divide-gray-200"> 
            {order.items.map(item => ( 
                <div key={item.productId} className="py-4 flex space-x-4"> 
                {item.imageUrl ? 
                ( <img src={item.imageUrl} alt={item.name} className="h-16 w-16 object-contain rounded border border-gray-200 bg-gray-50" /> 
                ) : ( <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No Image</div> )}
                <div className="flex-1"> <p className="text-sm font-medium text-gray-900">{item.name}</p> 
                <p className="text-xs text-gray-500">Product ID: {item.productId}</p>
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div> <div className="text-sm text-gray-700 text-right">
                    <p>${Number(item.pricePerUnit).toFixed(2)} each</p>
                    <p className="font-medium">${(Number(item.pricePerUnit) * item.quantity).toFixed(2)}</p> 
                </div>
            </div> 
        ))} 
        </div> 
        ) : ( <p className="text-sm text-gray-500">No items found.</p> )}
      </div>
    </div>
  );
}

export default AdminOrderDetailPage;
