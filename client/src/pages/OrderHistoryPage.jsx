import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// Import useAuth to get the token for the API call
import { useAuth } from '../context/AuthContext';

function OrderHistoryPage() {
  // State for orders, loading, and errors
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get token from AuthContext
  const { token } = useAuth();

  // Effect to fetch order history on component mount
  useEffect(() => {
    // Only fetch if token is available ( ProtectedRoute should handle this)
    if (!token) {
      setError("Not logged in."); // Should ideally not be reached if route is protected
      setLoading(false);
      return;
    }

    console.log("OrderHistoryPage: Fetching order history...");
    setLoading(true);
    setError(null);

    fetch('/api/orders', { // The new backend endpoint
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    .then(async response => {
      const data = await response.json().catch(() => null); // Try parsing JSON even on error
      if (!response.ok) {
        const errorMessage = data?.error || `Error fetching orders: ${response.status}`;
        console.error("OrderHistoryPage: API Error:", errorMessage);
        // Handle specific errors like 401/403
        throw new Error(errorMessage);
      }
      console.log("OrderHistoryPage: Orders fetched successfully:", data);
      setOrders(data); // Set the fetched orders
    })
    .catch(err => {
      console.error("OrderHistoryPage: Fetch error:", err);
      setError(err.message || 'Failed to load order history.');
      setOrders([]); // Clear orders on error
    })
    .finally(() => {
      setLoading(false); // Set loading to false
    });

  // Dependency array includes token to refetch if user logs in/out (though typically navigated away)
  }, [token]);

  // Helper function to format date/time nicely
  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, { // Use locale default formatting
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
        console.error("Error formatting date:", e);
        return isoString; // Return original string if formatting fails
    }
  };

   // Basic styles (replace with CSS later)
   const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };
   const thTdStyle = { border: '1px solid #ddd', padding: '8px', textAlign: 'left' };
   const thStyle = { ...thTdStyle, backgroundColor: '#f2f2f2' };

  // --- Render Logic ---

  if (loading) {
    return <div>Loading order history...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error loading orders: {error}</div>;
  }

  return (
    <div>
      <h1>Your Order History</h1>
      {orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              {/* Header Order: ID, Date, Total, Status, Actions */}
              <th style={thStyle}>Order ID</th>
              <th style={thStyle}>Date Placed</th>
              <th style={thStyle}>Total Amount</th>
              <th style={thStyle}>Status</th>
              {/* Removed Address ID headers for now as they aren't displayed */}
              {/* <th style={thStyle}>Shipping Address ID</th> */}
              {/* <th style={thStyle}>Billing Address ID</th> */}
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
                <tr key={order.id}>
                    {/* Data Order MUST match Header Order */}
                    <td style={thTdStyle}>{order.id}</td>
                    <td style={thTdStyle}>{formatDateTime(order.order_date)}</td>
                    <td style={thTdStyle}>${Number(order.total_amount).toFixed(2)}</td>
                    <td style={thTdStyle}>{order.status}</td>
                    {/* <td style={thTdStyle}>{order.shipping_address_id}</td> */}
                    {/* <td style={thTdStyle}>{order.billing_address_id}</td> */}
                    <td style={thTdStyle}>
                        {/* TODO: Link to a specific Order Detail page later */}
                        <button disabled>View Details</button>
                    </td>
            </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default OrderHistoryPage;

