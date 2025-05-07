import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedMessage, setAddedMessage] = useState('');

  useEffect(() => {
    if (!productId) {
      setError("Product ID not found in URL.");
      setLoading(false);
      return;
    }

    console.log(`ProductDetailPage: Fetching product with ID: ${productId}`);
    setLoading(true);
    setError(null);
    setAddedMessage('');

    fetch(`/api/products/${productId}`)
      .then(response => {
        if (!response.ok) {
           return response.json().catch(() => null).then(errData => {
               throw new Error(errData?.error || `HTTP error! status: ${response.status}`);
           });
        }
        return response.json();
      })
      .then(data => {
        console.log("ProductDetailPage: Product data fetched:", data);
        setProduct(data);
      })
      .catch(err => {
        console.error("ProductDetailPage: Error fetching product:", err);
        setError(err.message);
        setProduct(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
      console.log("ProductDetailPage: Added to cart:", product.name);
      setAddedMessage(`${product.name} added to cart!`);
      setTimeout(() => setAddedMessage(''), 3000);
    } else {
      console.error("ProductDetailPage: Cannot add to cart, product data not loaded.");
    }
  };


  // --- Render Logic ---

  if (loading) {
    return <div className="text-center text-gray-500 py-10">Loading product details...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-md mx-auto">Error loading product: {error}</div>;
  }

  if (!product) {
    return <div className="text-center text-gray-500 py-10">Product not found or unable to load.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/products"
        className="inline-block mb-6 text-blue-600 hover:text-blue-800"
      >
        &larr; Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden rounded-lg border border-gray-200">
           {product.image_url ? (
            <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-contain mix-blend-multiply" 
            />
          ) : (
            <span className="text-gray-400 text-sm">No Image Available</span>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            {product.name}
          </h1>
          <p className="text-2xl lg:text-3xl font-semibold text-gray-700 mb-4">
            ${Number(product.price).toFixed(2)}
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            {product.description || 'No description available.'}
          </p>

          <div className="mt-auto">
            <button
              onClick={handleAddToCart}
              // Primary action button style
              className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add to Cart
            </button>
            {addedMessage && <p className="text-green-600 mt-3 text-sm">{addedMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
