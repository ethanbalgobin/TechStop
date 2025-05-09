import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/authContext';
import { API_BASE_URL } from '../constants/api';

function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useCart();
  const { token, user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedMessage, setAddedMessage] = useState('');
  
  // Review states
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    image: null
  });
  const [submitStatus, setSubmitStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

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

    fetch(`${API_BASE_URL}/api/products/${productId}`)
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

    // Fetch reviews
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    // Check if user has already reviewed this product
    if (user && reviews.length > 0) {
      const userReview = reviews.find(review => review.user_id === user.id);
      setHasUserReviewed(!!userReview);
    }
  }, [user, reviews]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/product/${productId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reviews');
      }
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError(error.message);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewReview(prev => ({ ...prev, image: file }));
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitStatus('submitting');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('rating', newReview.rating);
      formData.append('comment', newReview.comment);
      if (newReview.image) {
        formData.append('image', newReview.image);
      }

      const response = await fetch(`${API_BASE_URL}/api/reviews/product/${productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to submit review');
      }

      const submittedReview = data;
      setReviews(prevReviews => [submittedReview, ...prevReviews]);
      setNewReview({ rating: 5, comment: '', image: null });
      setSubmitStatus('success');
      setHasUserReviewed(true);
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message);
    }
  };

  const handleUpdateReview = async (reviewId) => {
    try {
      const formData = new FormData();
      formData.append('rating', rating);
      formData.append('comment', comment);

      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update review');
      }

      const updatedReview = await response.json();
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId ? updatedReview : review
        )
      );
      setEditingReviewId(null);
      setRating(5);
      setComment('');
    } catch (error) {
      console.error('Error updating review:', error);
      setErrorMessage(error.message);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete review');
      }

      setReviews(prevReviews =>
        prevReviews.filter(review => review.id !== reviewId)
      );
      setHasUserReviewed(false);
    } catch (error) {
      console.error('Error deleting review:', error);
      setErrorMessage(error.message);
    }
  };

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
    <div className="container mx-auto px-4 py-16">
      <Link
        to="/products"
        className="inline-block mb-6 text-blue-600 hover:text-blue-800"
      >
        &larr; Back to Products
      </Link>

      <section className="mb-32">
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
                className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add to Cart
              </button>
              {addedMessage && <p className="text-green-600 mt-3 text-sm">{addedMessage}</p>}
            </div>
          </div>
        </div>
      </section>

      <div style={{ height: '100px' }}></div>

      <section className="relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gray-200"></div>
        <div className="pt-16">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errorMessage}
            </div>
          )}

          {user ? (
            hasUserReviewed ? (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
                You have already reviewed this product. Thank you for your feedback!
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Write a Review</h3>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Rating
                    </label>
                    <select
                      value={newReview.rating}
                      onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} {rating === 1 ? 'Star' : 'Stars'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Your Review
                    </label>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                      placeholder="Share your thoughts about this product..."
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Add Photo (optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {newReview.image && (
                      <div className="mt-2">
                        <img
                          src={URL.createObjectURL(newReview.image)}
                          alt="Preview"
                          className="max-w-xs h-auto rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitStatus === 'submitting'}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitStatus === 'submitting' ? 'Submitting...' : 'Submit Review'}
                  </button>

                  {submitStatus === 'success' && (
                    <p className="text-green-600 mt-3">Review submitted successfully!</p>
                  )}
                  {submitStatus === 'error' && (
                    <p className="text-red-600 mt-3">{errorMessage}</p>
                  )}
                </div>
              </form>
            )
          ) : (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              Please <Link to="/login" className="underline">log in</Link> to write a review.
            </div>
          )}

          <div className="space-y-6">
            {reviews.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No reviews yet. Be the first to review!</p>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold">{review.username}</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-yellow-400">
                            {i < review.rating ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                    {user && user.id === review.user_id && (
                      <div className="space-x-2">
                        <button
                          onClick={() => {
                            setEditingReviewId(review.id);
                            setRating(review.rating);
                            setComment(review.comment);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                  {review.image_url && (
                    <div className="mt-4">
                      <img
                        src={`${API_BASE_URL}${review.image_url}`}
                        alt="Review"
                        className="max-w-xs h-auto rounded-lg"
                      />
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {editingReviewId && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateReview(editingReviewId);
            }} className="mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Review</h3>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Rating
                  </label>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className="text-2xl focus:outline-none"
                      >
                        {value <= rating ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Comment
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReviewId(null);
                      setRating(5);
                      setComment('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Update Review
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export default ProductDetailPage;
