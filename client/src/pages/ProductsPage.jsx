// client/src/pages/ProductsPage.jsx

import React, { useState, useEffect } from 'react';
// Import Link component for navigation
import { Link } from 'react-router-dom';

function ProductsPage() {
  // --- State for products, loading, and errors ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Effect to fetch products when the component mounts ---
  useEffect(() => {
    console.log("ProductsPage: Fetching products...");
    setLoading(true);
    setError(null); // Clear previous errors
    fetch('/api/products') // Assuming proxy is set up in vite.config.js
      .then(response => {
        if (!response.ok) {
           // Try parsing error JSON, fallback to status text
           return response.json().catch(() => null).then(errData => {
               throw new Error(errData?.error || `HTTP error fetching products! status: ${response.status}`);
           });
        }
        return response.json(); // Parse JSON if response is OK
      })
      .then(data => {
        console.log("ProductsPage: Products fetched successfully.", data);
        setProducts(data);
      })
      .catch(err => {
        console.error("ProductsPage: Error fetching products:", err);
        setError(err.message); // Set error state to display to user
        setProducts([]); // Clear products on error
      })
      .finally(() => {
        setLoading(false); // Set loading to false
      });
  }, []); // Empty dependency array means this runs once when the component mounts

  // --- Render logic based on state ---
  return (
    <div>
      <h1>E-commerce Products</h1>
      {loading ? (
        <div>Loading products...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>Error loading products: {error}</div>
      ) : products.length > 0 ? (
        <ul>
          {/* Map over products and create links */}
          {products.map(product => (
            <li key={product.id} style={{ marginBottom: '10px' }}>
              {/* Wrap product name (or more content) in a Link */}
              <Link to={`/products/${product.id}`} style={{ textDecoration: 'none', color: '#007bff' }}>
                {product.name}
              </Link>
              <span> - ${product.price}</span>
              {/* Add image thumbnails here too if desired */}
            </li>
          ))}
        </ul>
      ) : (
        <p>No products found.</p>
      )}
    </div>
  );
}

export default ProductsPage;
