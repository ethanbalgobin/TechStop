// client/src/pages/ProductDetailPage.jsx

import React, { useState, useEffect } from 'react';
// Import useParams to access URL parameters
import { useParams, Link } from 'react-router-dom';

function ProductDetailPage() {
  // Get the productId from the URL parameters (defined in the Route path)
  const { productId } = useParams();

  // State for the product data, loading status, and errors
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect to fetch product data when the component mounts or productId changes
  useEffect(() => {
    // Ensure productId is available before fetching
    if (!productId) {
      setError("Product ID not found in URL.");
      setLoading(false);
      return;
    }

    console.log(`ProductDetailPage: Fetching product with ID: ${productId}`);
    setLoading(true);
    setError(null); // Clear previous errors

    // Fetch data for the specific product ID
    fetch(`/api/products/${productId}`)
      .then(response => {
        if (!response.ok) {
           // If response is not OK, try to parse error message, otherwise use status text
           return response.json().catch(() => null).then(errData => {
               throw new Error(errData?.error || `HTTP error! status: ${response.status}`);
           });
        }
        return response.json(); // Parse JSON if response is OK
      })
      .then(data => {
        console.log("ProductDetailPage: Product data fetched:", data);
        setProduct(data); // Set the fetched product data
      })
      .catch(err => {
        console.error("ProductDetailPage: Error fetching product:", err);
        setError(err.message); // Set error state
        setProduct(null); // Clear product data on error
      })
      .finally(() => {
        setLoading(false); // Set loading to false
      });

  // Dependency array includes productId to refetch if the ID changes
  }, [productId]);

  // --- Render Logic ---

  if (loading) {
    return <div>Loading product details...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error loading product: {error}</div>;
  }

  if (!product) {
    // This case might be hit if loading finished but product is still null (e.g., unexpected error)
    return <div>Product not found or unable to load.</div>;
  }

  // Display product details if successfully loaded
  return (
    <div>
      {/* Link back to the main products list */}
      <Link to="/products">&larr; Back to Products</Link>
      <h1>{product.name}</h1>
      {/* Add more details here */}
      <p><strong>Price:</strong> ${product.price}</p>
      {/* Display image if available */}
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          style={{ maxWidth: '300px', height: 'auto', marginTop: '15px', border: '1px solid #eee' }}
          // Basic error handling for image loading
          onError={(e) => { e.target.style.display = 'none'; /* Hide broken image */ }}
        />
      )}
      <p style={{ marginTop: '15px' }}>
        {/* Placeholder for description - add this field to your DB/API if needed */}
        {product.description || 'No description available.'}
      </p>
      {/* TODO: Add "Add to Cart" button here later */}
      <button style={{marginTop: '20px'}}>Add to Cart (Placeholder)</button>
    </div>
  );
}

export default ProductDetailPage;
