import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function OrderDetailPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
    } catch (err) {
      return isoString || err ;
    }
  };

  // --- Fetch order details ---
  useEffect(() => {
    if (!orderId) {
      setError("Order ID not found in URL.");
      setLoading(false);
      return;
    }
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    console.log(`OrderDetailPage: Fetching details for Order ID: ${orderId}`);
    setLoading(true);
    setError(null);

    fetch(`/api/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    .then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error || `Error fetching order: ${response.status}`;
        console.error("OrderDetailPage: API Error:", errorMessage);
        // Handle specific errors like 404 Not Found or 401/403 Unauthorized if needed
        throw new Error(errorMessage);
      }
      console.log("OrderDetailPage: Order details fetched:", data);
      setOrder(data);
    })
    .catch(err => {
      console.error("OrderDetailPage: Fetch error:", err);
      setError(err.message || 'Failed to load order details.');
      setOrder(null);
    })
    .finally(() => {
      setLoading(false);
    });

  }, [orderId, token]);

  // --- Render Logic ---
  if (loading) {
    // Loading style
    return <div className="text-center text-gray-500 py-10">Loading order details...</div>;
  }

  if (error) {
    // Error style
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-md mx-auto">Error loading order details: {error}</div>;
  }

  if (!order) {
    return <div className="text-center text-gray-500 py-10">Order not found or unable to load.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        to="/orders"
        className="inline-block mb-6 text-blue-600 hover:text-blue-800 hover:underline"
      >
        &larr; Back to Order History
      </Link>

      {/* Order Summary Header Section */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Order Details</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500 block">Order ID:</span>
            <span className="text-gray-900">{order.id}</span>
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
            <span className="text-gray-900">{order.status}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid (Items and Shipping) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Items Ordered Section (Takes 2 columns on medium+ screens) */}
        <div className="md:col-span-2 bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Items Ordered</h2>
          <div className="space-y-4">
            {order.items && order.items.length > 0 ? (
              order.items.map(item => (
                <div key={item.productId} className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-sm text-gray-700">
                    ${Number(item.pricePerUnit).toFixed(2)} each
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No items found for this order.</p>
            )}
          </div>
        </div>

        {/* Shipping Address Section (Takes 1 column on medium+ screens) */}
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Shipping Address</h2>
          {order.shippingAddress ? (
            <div className="text-sm text-gray-700 space-y-1">
              <p>{order.shippingAddress.address_line1}</p>
              {order.shippingAddress.address_line2 && <p>{order.shippingAddress.address_line2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state_province_region || ''}</p>
              <p>{order.shippingAddress.postal_code}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Shipping address not available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
