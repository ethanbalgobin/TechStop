const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const upload = require('../middleware/upload');
const db = require('../db');

// Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await db.query(
      `SELECT r.*, u.username 
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create a new review
router.post('/product/:productId', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;
    const imageUrl = req.file ? `/uploads/reviews/${req.file.filename}` : null;

    console.log('Creating review:', { productId, rating, comment, userId, imageUrl });

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      console.log('Invalid rating:', rating);
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Validate comment
    if (!comment || comment.trim().length === 0) {
      console.log('Invalid comment:', comment);
      return res.status(400).json({ error: 'Comment is required' });
    }

    // Check if user has already reviewed this product
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (existingReview.rows.length > 0) {
      console.log('User already reviewed this product:', { userId, productId });
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    // Insert the new review
    const result = await db.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, productId, rating, comment, imageUrl]
    );

    console.log('Review created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating review:', error);
    // Send more detailed error information
    res.status(500).json({ 
      error: 'Failed to create review',
      details: error.message,
      code: error.code
    });
  }
});

// Update a review
router.put('/:reviewId', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;
    const imageUrl = req.file ? `/uploads/reviews/${req.file.filename}` : undefined;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Validate comment
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    // Check if review exists and belongs to user
    const existingReview = await db.query(
      'SELECT * FROM reviews WHERE id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    if (existingReview.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Update the review
    const updateQuery = imageUrl
      ? `UPDATE reviews 
         SET rating = $1, comment = $2, image_url = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND user_id = $5
         RETURNING *`
      : `UPDATE reviews 
         SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4
         RETURNING *`;

    const values = imageUrl
      ? [rating, comment, imageUrl, reviewId, userId]
      : [rating, comment, reviewId, userId];

    const result = await db.query(updateQuery, values);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    // Check if review exists and belongs to user
    const existingReview = await db.query(
      'SELECT * FROM reviews WHERE id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    if (existingReview.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Delete the review
    await db.query(
      'DELETE FROM reviews WHERE id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router; 