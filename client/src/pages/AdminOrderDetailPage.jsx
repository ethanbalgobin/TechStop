import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // To get the token for API calls

function AdminOrderDetailPage() {
  const { orderId } = useParams(); // Get orderId from URL
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

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

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    if (!token || !orderId) {
      setError("Missing token or Order ID.");
      setLoading(false);
      return;
    }
    console.log(`AdminOrderDetailPage: Fetching details for Order ID: ${orderId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch order details: ${response.status}`);
      }
      console.log("AdminOrderDetailPage: Order details fetched:", data);
      setOrder(data);
    } catch (err) {
      console.error("AdminOrderDetailPage: Error fetching order details:", err);
      setError(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [token, orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // --- Render Logic ---
  if (loading) {
    return <div className="text-center text-gray-500 py-10">Loading order details...</div>;
  }
  if (error) {
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-lg mx-auto">Error: {error}</div>;
  }
  if (!order) {
    return <div className="text-center text-gray-500 py-10">Order not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/admin/orders" className="inline-block mb-6 text-blue-600 hover:text-blue-800 hover:underline">
        ← Back to All Orders
      </Link>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Order Details - ID: {order.order_id}</h1>

      {/* Main Order Info Section */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Order Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
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
          <div>
            <span className="font-medium text-gray-500 block">Status:</span>
            <span className="text-gray-900">{order.status}</span> {/* TODO: Make this editable later */}
          </div>
          <div>
            <span className="font-medium text-gray-500 block">Stripe Payment Intent ID:</span>
            <span className="text-gray-900 break-all">{order.payment_intent_id || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Customer & Shipping Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Customer Information */}
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Customer Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-500">User ID:</span>
              <span className="text-gray-900 ml-2">{order.user_id}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Username:</span>
              <span className="text-gray-900 ml-2">{order.customer_username || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Email:</span>
              <span className="text-gray-900 ml-2">{order.customer_email || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Shipping Address</h2>
          {order.shippingAddress ? (
            <div className="text-sm text-gray-700 space-y-1">
              <p>{order.shippingAddress.address_line1}</p>
              {order.shippingAddress.address_line2 && <p>{order.shippingAddress.address_line2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state_province_region || ''}</p>
              <p>{order.shippingAddress.postal_code}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Shipping address unavailable for this order.</p>
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
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-16 w-16 object-contain rounded border border-gray-200 bg-gray-50" />
                ) : (
                  <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No Image</div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">Product ID: {item.productId}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="text-sm text-gray-700 text-right">
                  <p>${Number(item.pricePerUnit).toFixed(2)} each</p>
                  <p className="font-medium">${(Number(item.pricePerUnit) * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No items were found for this order.</p>
        )}
      </div>
    </div>
  );
}

export default AdminOrderDetailPage;
