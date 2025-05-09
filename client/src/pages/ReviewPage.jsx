import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../constants/api';

function ReviewPage() {
  const { productId } = useParams();
  const { token, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    image: null
  });
  const [submitStatus, setSubmitStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [error, setError] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    // Check if user has already reviewed this product
    if (user && reviews.length > 0) {
      const userReview = reviews.find(review => review.user_id === user.id);
      setHasUserReviewed(!!userReview);
    }
  }, [user, reviews]);

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
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message);
    }
  };

  const handleUpdateReview = async (reviewId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: parseInt(newReview.rating),
          comment: newReview.comment
        })
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
      setNewReview({ rating: 5, comment: '' });
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
    } catch (error) {
      console.error('Error deleting review:', error);
      setErrorMessage(error.message);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-10">Loading reviews...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to={`/products/${productId}`}
        className="inline-block mb-6 text-blue-600 hover:text-blue-800"
      >
        &larr; Back to Product
      </Link>

      <h1 className="text-3xl font-bold mb-8">Product Reviews</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Write a Review</h2>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Review</h2>
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
  );
}

export default ReviewPage; 