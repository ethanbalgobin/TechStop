import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
// Import useAuth to get the token for the API call
import { useAuth } from '../context/AuthContext'; 

function OrderDetailPage() {
  // Get the orderId from the URL parameter
  const { orderId } = useParams();

  // State for the detailed order data, loading, and errors
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get token from AuthContext
  const { token } = useAuth();

  // --- Helper function to format date/time ---
  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return isoString; }
  };

  // --- Effect to fetch order details ---
  useEffect(() => {
    // Ensure orderId and token are available
    if (!orderId) {
      setError("Order ID not found in URL.");
      setLoading(false);
      return;
    }
    if (!token) {
      setError("Not authenticated."); // Should be caught by ProtectedRoute but worth checking
      setLoading(false);
      return;
    }

    console.log(`OrderDetailPage: Fetching details for Order ID: ${orderId}`);
    setLoading(true);
    setError(null);

    // Fetch data for the specific order ID
    fetch(`/api/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    .then(async response => {
      const data = await response.json().catch(() => ({})); // Parsing JSON
      if (!response.ok) {
        const errorMessage = data?.error || `Error fetching order: ${response.status}`;
        console.error("OrderDetailPage: API Error:", errorMessage);
        // Handling specific errors like 404 Not Found or 401/403 Unauthorized
        throw new Error(errorMessage);
      }
      console.log("OrderDetailPage: Order details fetched:", data);
      setOrder(data); // Set the fetched order data
    })
    .catch(err => {
      console.error("OrderDetailPage: Fetch error:", err);
      setError(err.message || 'Failed to load order details.');
      setOrder(null); // Clear order data on error
    })
    .finally(() => {
      setLoading(false); // Set loading to false
    });

  // Dependency array includes orderId and token
  }, [orderId, token]);

  // --- Basic Styles ---
  const containerStyle = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', maxWidth: '900px', margin: '20px auto' };
  const sectionStyle = { border: '1px solid #eee', padding: '20px', borderRadius: '8px', marginBottom: '20px' };
  const itemRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' };
  const addressStyle = { marginTop: '10px', lineHeight: '1.6' };
  const totalStyle = { fontWeight: 'bold', marginTop: '15px', textAlign: 'right' };
  // --- End Styles ---


  // --- Render Logic ---
  if (loading) {
    return <div>Loading order details...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error loading order details: {error}</div>;
  }

  if (!order) {
    return <div>Order not found or unable to load.</div>;
  }

  // Display order details if successfully loaded
  return (
    <div>
      <Link to="/orders">&larr; Back to Order History</Link>
      <h1>Order Details</h1>

      {/* Order Summary Section */}
      <div style={sectionStyle}>
        <h2>Order Summary</h2>
        <p><strong>Order ID:</strong> {order.id}</p>
        <p><strong>Date Placed:</strong> {formatDateTime(order.order_date)}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Total Amount:</strong> ${Number(order.total_amount).toFixed(2)}</p>
      </div>

      <div style={containerStyle}>
        {/* Column 1: Items Ordered */}
        <div style={sectionStyle}>
          <h2>Items Ordered</h2>
          {order.items && order.items.length > 0 ? (
            order.items.map(item => (
              <div key={item.productId} style={itemRowStyle}>
                <span>{item.name} (x{item.quantity})</span>
                <span>${Number(item.pricePerUnit).toFixed(2)} each</span>
              </div>
            ))
          ) : (
            <p>No items found for this order.</p>
          )}
        </div>

        {/* Column 2: Shipping Address */}
        <div style={sectionStyle}>
          <h2>Shipping Address</h2>
          {order.shippingAddress ? (
            <div style={addressStyle}>
              {order.shippingAddress.address_line1}<br />
              {order.shippingAddress.address_line2 && <>{order.shippingAddress.address_line2}<br /></>}
              {order.shippingAddress.city}, {order.shippingAddress.state_province_region || ''} {order.shippingAddress.postal_code}<br />
              {order.shippingAddress.country}
            </div>
          ) : (
            <p>Shipping address not available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
