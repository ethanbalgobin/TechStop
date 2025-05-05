// client/src/context/CartContext.jsx

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const getInitialCartFromLocalStorage = () => {
  console.log("[getInitialCartFromLocalStorage] Attempting to load cart...");
  try {
    const storedCart = localStorage.getItem('shoppingCart');
    console.log("[getInitialCartFromLocalStorage] Raw value from localStorage:", storedCart);
    const parsedCart = storedCart ? JSON.parse(storedCart) : [];
    console.log("[getInitialCartFromLocalStorage] Parsed cart:", parsedCart);
    return parsedCart;
  } catch (error) {
    console.error("CartProvider: Error parsing cart from localStorage:", error);
    localStorage.removeItem('shoppingCart');
    return [];
  }
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  // ---  Initialize isLoading to true ---
  const [isLoading, setIsLoading] = useState(true); // Start in loading state
  const [error, setError] = useState(null);
  const { token } = useAuth();

  console.log("CartProvider rendering. isLoading:", isLoading, "Current cartItems state:", JSON.stringify(cartItems));

  const fetchCart = useCallback(async () => {
    // ---  Set loading true at the start of fetch attempt ---
    // Note: setIsLoading(true) was already present for the logged-in case, ensure it covers logged-out too implicitly or add it.
    // Let's ensure it's explicitly set true when the process starts based on token change.
    // setIsLoading(true); // Moved this to the calling effect for clarity

    if (!token) {
      console.log("CartProvider: No token, loading cart from localStorage.");
      setError(null); // Clear error before loading
      const initialCart = getInitialCartFromLocalStorage();
      setCartItems(initialCart);
      // ---   Set loading false AFTER setting state ---
      setIsLoading(false);
      return;
    }

    console.log("CartProvider: Token found, fetching cart from backend.");
    // setIsLoading(true); // Already set true in the calling effect
    setError(null);
    try {
      const response = await fetch('/api/cart', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
         const errData = await response.json().catch(() => ({}));
         throw new Error(errData.error || `Failed to fetch cart: ${response.status}`);
      }
      const data = await response.json();
      console.log("CartProvider: Cart fetched from backend:", data);
      setCartItems(data);
      localStorage.removeItem('shoppingCart');
    } catch (err) {
      console.error("CartProvider: Error fetching cart from backend:", err);
      setError('Could not load cart from server.');
      setCartItems([]);
    } finally {
      // ---   Set loading false in finally block ---
      setIsLoading(false);
    }
  }, [token]); // Dependency: token

  useEffect(() => {
    console.log("CartProvider: Mount/Token Change Effect running.");
    // ---   Set loading true before calling fetchCart ---
    setIsLoading(true);
    fetchCart();
  }, [fetchCart]); // fetchCart dependency includes token

  useEffect(() => {
    console.log(`CartProvider: localStorage save effect running. isLoading: ${isLoading}, Token: ${token}, CartItems Length: ${cartItems?.length}`);
    // ---   Only save if NOT loading AND NOT logged in ---
    if (!isLoading && !token && cartItems !== undefined) {
      try {
        const cartToSave = JSON.stringify(cartItems);
        console.log("CartProvider: Saving to localStorage (logged out, not loading):", cartToSave);
        localStorage.setItem('shoppingCart', cartToSave);
      } catch (error) {
        console.error("CartProvider: Error saving cart to localStorage:", error);
      }
    }
  // ---   Added isLoading to dependency array ---
  }, [cartItems, token, isLoading]);

  // --- Cart Modification Functions (addToCart, etc.) remain the same ---
  // They update cartItems state, which triggers the save effect above correctly
  // after the state update and re-render (when isLoading is false).

  const addToCart = async (productToAdd) => {
    console.log("CartProvider: addToCart called with product:", productToAdd.id);
    setError(null);

    if (token) {
       // ... (backend logic remains the same) ...
      setIsLoading(true);
      try {
        const response = await fetch('/api/cart/items', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: productToAdd.id, quantity: 1 }),
        });
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData.error || `Failed to add item: ${response.status}`);
        }
        const updatedCart = await response.json();
        setCartItems(updatedCart); // Update state from server response
        console.log("CartProvider: Item added/updated via API. New cart:", updatedCart);
      } catch (err) {
        console.error("CartProvider: Error adding item via API:", err);
        setError('Could not add item to cart.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Logged out: Update local state
      console.log("CartProvider: Updating state locally for addToCart (logged out).");
      setCartItems(prevItems => {
        console.log("CartProvider: addToCart updater running. PrevItems:", JSON.stringify(prevItems));
        const existingItemIndex = prevItems.findIndex(item => item.product.id === productToAdd.id);
        let nextItems;
        if (existingItemIndex > -1) {
          const updatedItems = [...prevItems];
          updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], quantity: updatedItems[existingItemIndex].quantity + 1 };
          nextItems = updatedItems;
        } else {
          const productInfo = { id: productToAdd.id, name: productToAdd.name, price: productToAdd.price, image_url: productToAdd.image_url };
          nextItems = [...prevItems, { product: productInfo, quantity: 1 }];
        }
        console.log("CartProvider: addToCart updater calculated nextItems:", JSON.stringify(nextItems));
        return nextItems;
      });
      console.log("CartProvider: setCartItems called in addToCart (logged out). Effect should run next render.");
    }
  };

  const removeFromCart = async (productIdToRemove) => {
    console.log("CartProvider: removeFromCart called for product ID:", productIdToRemove);
    setError(null);
    if (token) {
      // ... backend logic ...
      setIsLoading(true);
      try {
        const response = await fetch(`/api/cart/items/${productIdToRemove}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData.error || `Failed to remove item: ${response.status}`);
        }
        const updatedCart = await response.json();
        setCartItems(updatedCart); // Update state from server response
        console.log("CartProvider: Item removed via API. New cart:", updatedCart);
      } catch (err) {
        console.error("CartProvider: Error removing item via API:", err);
        setError('Could not remove item from cart.');
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log("CartProvider: Updating state locally for removeFromCart (logged out).");
      setCartItems(prevItems => prevItems.filter(item => item.product.id !== productIdToRemove));
      console.log("CartProvider: setCartItems called in removeFromCart (logged out).");
    }
  };

  const updateQuantity = async (productIdToUpdate, newQuantity) => {
    console.log(`CartProvider: updateQuantity called for product ID: ${productIdToUpdate}, new quantity: ${newQuantity}`);
    setError(null);
    const quantity = Math.max(0, parseInt(newQuantity, 10) || 0);
    if (token) {
      // ... backend logic ...
       setIsLoading(true);
      try {
        let response;
        if (quantity === 0) {
          response = await fetch(`/api/cart/items/${productIdToUpdate}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
        } else {
          response = await fetch(`/api/cart/items/${productIdToUpdate}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quantity: quantity }),
          });
        }
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData.error || `Failed to update quantity: ${response.status}`);
        }
        const updatedCart = await response.json();
        setCartItems(updatedCart); // Update state from server response
        console.log("CartProvider: Quantity updated via API. New cart:", updatedCart);
      } catch (err) {
        console.error("CartProvider: Error updating quantity via API:", err);
        setError('Could not update cart quantity.');
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log("CartProvider: Updating state locally for updateQuantity (logged out).");
      setCartItems(prevItems => {
        if (quantity === 0) {
          return prevItems.filter(item => item.product.id !== productIdToUpdate);
        } else {
          return prevItems.map(item =>
            item.product.id === productIdToUpdate ? { ...item, quantity: quantity } : item
          );
        }
      });
       console.log("CartProvider: setCartItems called in updateQuantity (logged out).");
    }
  };

  const clearCart = async () => {
    console.log("CartProvider: clearCart called.");
    setError(null);
    if (token) {
      // ... backend logic ...
       setIsLoading(true);
      try {
        const response = await fetch('/api/cart', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
         if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData.error || `Failed to clear cart: ${response.status}`);
        }
        const updatedCart = await response.json(); // Should be []
        setCartItems(updatedCart); // Update state from server response
        console.log("CartProvider: Cart cleared via API.");
      } catch (err) {
        console.error("CartProvider: Error clearing cart via API:", err);
        setError('Could not clear cart.');
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log("CartProvider: Clearing state locally for clearCart (logged out).");
      setCartItems([]);
       console.log("CartProvider: setCartItems called in clearCart (logged out).");
    }
  };


  // --- Calculated Values ---
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => {
      const price = Number(item.product.price);
      return total + (isNaN(price) ? 0 : price * item.quantity);
  }, 0);

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
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  if (context === null) {
     console.warn('useCart returning null, provider might not be ready or value is null.');
  }
  return context;
}
