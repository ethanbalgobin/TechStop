import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("ProductsPage: Fetching products...");
    setLoading(true);
    setError(null); 
    fetch('/api/products')
      .then(response => {
        if (!response.ok) {
           return response.json().catch(() => null).then(errData => {
               throw new Error(errData?.error || `HTTP error fetching products! status: ${response.status}`);
           });
        }
        return response.json();
      })
      .then(data => {
        console.log("ProductsPage: Products fetched successfully.", data);
        setProducts(data);
      })
      .catch(err => {
        console.error("ProductsPage: Error fetching products:", err);
        setError(err.message);
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // --- Render logic ---
  return (
    <div className="container mx-auto px-4 py-8"> {/* Centered container with padding */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Products</h1> {/* Styled heading */}

      {/* Loading State */}
      {loading && (
        <div className="text-center text-gray-500">Loading products...</div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="text-center text-red-600 bg-red-100 p-4 rounded-md">Error loading products: {error}</div>
      )}

      {/* No Products State */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center text-gray-500">No products found.</div>
      )}

      {/* Products Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              <Link to={`/products/${product.id}`} className="block">
                {/* Image Placeholder/Container */}
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300 ease-in-out" // Added mix-blend, hover effect
                        onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} // Hide broken image, show placeholder text
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">No Image</span> // Placeholder text
                  )}
                   {/* Image Fallback*/}
                   {!product.image_url && <span className="text-gray-500 text-sm hidden">No Image</span>}
                </div>
                {/* Product Info Section */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 truncate" title={product.name}>
                    {product.name}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    ${Number(product.price).toFixed(2)}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductsPage;
