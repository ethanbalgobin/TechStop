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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  console.log("CartProvider rendering. isLoading:", isLoading, "Current cartItems state:", JSON.stringify(cartItems));

  const fetchCart = useCallback(async () => {

    if (!token) {
      console.log("CartProvider: No token, loading cart from localStorage.");
      setError(null);
      const initialCart = getInitialCartFromLocalStorage();
      setCartItems(initialCart);
      setIsLoading(false);
      return;
    }

    console.log("CartProvider: Token found, fetching cart from backend.");
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
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    console.log("CartProvider: Mount/Token Change Effect running.");
    setIsLoading(true);
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    console.log(`CartProvider: localStorage save effect running. isLoading: ${isLoading}, Token: ${token}, CartItems Length: ${cartItems?.length}`);
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

  const addToCart = async (productToAdd) => {
    console.log("CartProvider: addToCart called with product:", productToAdd.id);
    setError(null);

    if (token) {
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
        setCartItems(updatedCart);
        console.log("CartProvider: Item added/updated New cart:", updatedCart);
      } catch (err) {
        console.error("CartProvider: Error adding item:", err);
        setError('Could not add item to cart.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Logged out: Update local state
      console.log("CartProvider: Updating local state.");
      setCartItems(prevItems => {
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
        return nextItems;
      });
    }
  };

  const removeFromCart = async (productIdToRemove) => {
    console.log("CartProvider: removeFromCart called for product ID:", productIdToRemove);
    setError(null);
    if (token) {
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
        setCartItems(updatedCart);
      } catch (err) {
        console.error("CartProvider: Error removing item:", err);
        setError('Could not remove item from cart.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems(prevItems => prevItems.filter(item => item.product.id !== productIdToRemove));
    }
  };

  const updateQuantity = async (productIdToUpdate, newQuantity) => {
    console.log(`CartProvider: updateQuantity called for product ID: ${productIdToUpdate}, new quantity: ${newQuantity}`);
    setError(null);
    const quantity = Math.max(0, parseInt(newQuantity, 10) || 0);
    if (token) {
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
        setCartItems(updatedCart);
      } catch (err) {
        console.error("CartProvider: Error updating quantity", err);
        setError('Could not update cart quantity.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems(prevItems => {
        if (quantity === 0) {
          return prevItems.filter(item => item.product.id !== productIdToUpdate);
        } else {
          return prevItems.map(item =>
            item.product.id === productIdToUpdate ? { ...item, quantity: quantity } : item
          );
        }
      });
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
        console.log("CartProvider: Cart cleared.");
      } catch (err) {
        console.error("CartProvider: Error clearing cart via API:", err);
        setError('Could not clear cart.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems([]);
    }
  };


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
