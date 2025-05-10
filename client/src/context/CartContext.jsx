import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import fetchApi from '../utils/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const [cartTotal, setCartTotal] = useState(0);

  const fetchCart = useCallback(async () => {
    if (!token) {
      setCartItems([]);
      setCartTotal(0);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching cart...');
      const data = await fetchApi('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Cart data received:', data);
      
      if (data && Array.isArray(data.items)) {
        setCartItems(data.items);
        setCartTotal(data.total || 0);
      } else {
        console.error('Invalid cart data received:', data);
        setCartItems([]);
        setCartTotal(0);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError(error.message || 'Failed to fetch cart');
      setCartItems([]);
      setCartTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    console.log('CartProvider: Token changed, fetching cart...');
    setIsLoading(true);
    fetchCart();
  }, [token, fetchCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!token) {
      console.error('No token available for cart operation');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Adding to cart:', { productId, quantity });
      const response = await fetchApi('/api/cart/items', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId, quantity })
      });
      
      if (response && Array.isArray(response.items)) {
        setCartItems(response.items);
        setCartTotal(response.total || 0);
      } else {
        await fetchCart();
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error.message || 'Failed to add item to cart');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchCart]);

  const removeFromCart = useCallback(async (productIdToRemove) => {
    if (!token) {
      console.error('No token available for cart operation');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Removing from cart:', productIdToRemove);
      const response = await fetchApi(`/api/cart/items/${productIdToRemove}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response && Array.isArray(response.items)) {
        setCartItems(response.items);
        setCartTotal(response.total || 0);
      } else {
        await fetchCart();
      }
    } catch (err) {
      console.error("Error removing item from cart:", err);
      setError('Could not remove item from cart.');
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchCart]);

  const updateQuantity = useCallback(async (productIdToUpdate, newQuantity) => {
    if (!token) {
      console.error('No token available for cart operation');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const quantity = Math.max(0, parseInt(newQuantity, 10) || 0);
    try {
      console.log('Updating cart quantity:', { productIdToUpdate, quantity });
      
      let response;
      if (quantity === 0) {
        response = await fetchApi(`/api/cart/items/${productIdToUpdate}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        response = await fetchApi(`/api/cart/items/${productIdToUpdate}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ quantity })
        });
      }
      
      if (response && Array.isArray(response.items)) {
        setCartItems(response.items);
        setCartTotal(response.total || 0);
      } else {
        await fetchCart();
      }
    } catch (err) {
      console.error("Error updating cart quantity:", err);
      setError('Could not update cart quantity.');
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchCart]);

  const clearCart = useCallback(async () => {
    if (!token) {
      console.error('No token available for cart operation');
      setCartItems([]);
      setCartTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Clearing cart...');
      await fetchApi('/api/cart', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setCartItems([]);
      setCartTotal(0);
      
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError(error.message || 'Failed to clear cart');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const cartCount = cartItems.reduce((total, item) => total + (item.quantity || 0), 0);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
    isLoading,
    error,
    refetchCart: fetchCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
