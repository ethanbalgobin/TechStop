import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Creating the Cart Context
const CartContext = createContext(null);

// Helper function to get initial cart state from localStorage
const getInitialCart = () => {
  try {
    const storedCart = localStorage.getItem('shoppingCart');
    return storedCart ? JSON.parse(storedCart) : [];
  } catch (error) {
    console.error("CartProvider: Error parsing cart from localStorage:", error);
    // If parsing fails, return an empty cart
    localStorage.removeItem('shoppingCart'); // Clear corrupted data
    return [];
  }
};

// 2. Create the Cart Provider Component
export function CartProvider({ children }) {
  // State to hold the array of cart items
  // Each item could look like: { product: { id, name, price, ... }, quantity: N }
  const [cartItems, setCartItems] = useState(getInitialCart);

  // --- Effect to save cart to localStorage whenever it changes ---
  useEffect(() => {
    try {
      // Only save if cartItems is not the initial empty array during setup glitches
      // or if it has actually changed meaningfully.
      if (cartItems !== undefined) {
         console.log("CartProvider: Saving cart to localStorage", cartItems);
         localStorage.setItem('shoppingCart', JSON.stringify(cartItems));
      }
    } catch (error) {
        console.error("CartProvider: Error saving cart to localStorage:", error);
        // Handle potential storage errors (e.g., localStorage full)
    }
  }, [cartItems]); // Run this effect whenever cartItems state changes

  // --- Cart Modification Functions ---

  // Add an item to the cart or increment its quantity
  const addToCart = (productToAdd) => {
    console.log("CartProvider: addToCart called with product:", productToAdd);
    setCartItems(prevItems => {
      // Check if the item already exists in the cart
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === productToAdd.id
      );

      if (existingItemIndex > -1) {
        // Item exists, increment quantity
        console.log("CartProvider: Incrementing quantity for product ID:", productToAdd.id);
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1,
        };
        return updatedItems;
      } else {
        // Item is new, add it with quantity 1
        console.log("CartProvider: Adding new product ID:", productToAdd.id);
        // Ensure we only store necessary product info to avoid large objects
        const productInfo = {
            id: productToAdd.id,
            name: productToAdd.name,
            price: productToAdd.price,
            image_url: productToAdd.image_url 
        };
        return [...prevItems, { product: productInfo, quantity: 1 }];
      }
    });
  };

  // Remove an item completely from the cart
  const removeFromCart = (productIdToRemove) => {
    console.log("CartProvider: removeFromCart called for product ID:", productIdToRemove);
    setCartItems(prevItems =>
      prevItems.filter(item => item.product.id !== productIdToRemove)
    );
  };

  // Update the quantity of a specific item
  const updateQuantity = (productIdToUpdate, newQuantity) => {
    console.log(`CartProvider: updateQuantity called for product ID: ${productIdToUpdate}, new quantity: ${newQuantity}`);
    // Ensure quantity is a positive integer
    const quantity = Math.max(0, parseInt(newQuantity, 10));

    setCartItems(prevItems => {
      if (quantity === 0) {
        // If quantity is 0, remove the item
        return prevItems.filter(item => item.product.id !== productIdToUpdate);
      } else {
        // Otherwise, update the quantity for the specific item
        return prevItems.map(item =>
          item.product.id === productIdToUpdate
            ? { ...item, quantity: quantity }
            : item
        );
      }
    });
  };

  // Clear the entire cart
  const clearCart = () => {
    console.log("CartProvider: clearCart called.");
    setCartItems([]); // Set state to empty array
    // localStorage will be updated by the useEffect hook
  };

  // --- Calculated Values (Optional but useful) ---
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);


  // 3. Value provided by the context
  const value = {
    cartItems,      // The array of items in the cart
    addToCart,      // Function to add an item
    removeFromCart, // Function to remove an item
    updateQuantity, // Function to update quantity
    clearCart,      // Function to clear the cart
    cartCount,      // Total number of items (sum of quantities)
    cartTotal,      // Total price of items in the cart
  };

  // 4. Return the Provider component
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// 5. Creating a custom hook for easy consumption
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
