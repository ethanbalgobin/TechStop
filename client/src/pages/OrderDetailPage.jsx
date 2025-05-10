import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import fetchApi from '../utils/api';

function OrderDetailsPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { orderId } = useParams();

  useEffect(() => {
    if (!token) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    console.log("OrderDetailsPage: Fetching order details...");
    setLoading(true);
    setError(null);

    fetchApi(`/api/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    .then(data => {
      console.log("OrderDetailsPage: Order details fetched successfully:", data);
      setOrder(data);
    })
    .catch(err => {
      console.error("OrderDetailsPage: Fetch error:", err);
      setError(err.message || 'Failed to load order details.');
    })
    .finally(() => {
      setLoading(false);
    });
  }, [token, orderId]);

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
    return <div className="text-center text-gray-500 py-10">Loading order details...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-md mx-auto">Error loading order: {error}</div>;
  }

  if (!order) {
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-md mx-auto">Order not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/orders" className="text-blue-600 hover:text-blue-800">
          ← Back to Orders
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Order Details</h1>
        
        {/* Order Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Order Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-medium">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="font-medium">{formatDateTime(order.order_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-medium">${Number(order.total_amount).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Shipping Address</h2>
          {order.shippingAddress ? (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">{order.shippingAddress.full_name}</p>
              <p>{order.shippingAddress.address_line1}</p>
              {order.shippingAddress.address_line2 && <p>{order.shippingAddress.address_line2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state_province_region} {order.shippingAddress.postal_code}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          ) : (
            <p className="text-gray-500">No shipping address available</p>
          )}
        </div>

        {/* Order Items */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items && order.items.map((item) => (
              <div key={item.productId} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-md">
                {item.imageUrl && (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-sm text-gray-600">Price: ${Number(item.pricePerUnit).toFixed(2)} each</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${Number(item.pricePerUnit * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsPage; 