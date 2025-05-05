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
    if (!token) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    console.log("OrderHistoryPage: Fetching order history...");
    setLoading(true);
    setError(null);

    fetch('/api/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    .then(async response => {
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = data?.error || `Error fetching orders: ${response.status}`;
        console.error("OrderHistoryPage: API Error:", errorMessage);
        throw new Error(errorMessage);
      }
      console.log("OrderHistoryPage: Orders fetched successfully:", data);
      setOrders(data);
    })
    .catch(err => {
      console.error("OrderHistoryPage: Fetch error:", err);
      setError(err.message || 'Failed to load order history.');
      setOrders([]);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [token]);

  // Helper function to format date/time nicely
  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return isoString; }
  };

  // --- Render Logic ---

  if (loading) {
    // Consistent loading style
    return <div className="text-center text-gray-500 py-10">Loading order history...</div>;
  }

  if (error) {
     // Consistent error style
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-md mx-auto">Error loading orders: {error}</div>;
  }

  return (
    // Page container
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Order History</h1>
      {orders.length === 0 ? (
        // Empty state message
        <div className="text-center py-10">
            <p className="text-xl text-gray-500 mb-4">You haven't placed any orders yet.</p>
            <Link
                to="/products"
                className="inline-block px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                Start Shopping
            </Link>
        </div>
      ) : (
        // Styled table container
        <div className="shadow-md rounded-lg overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Styled table headers */}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Placed</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id}>
                  {/* Styled table data cells */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(order.order_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(order.total_amount).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* Styled link */}
                    <Link
                        to={`/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View Details
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

export default OrderHistoryPage;

