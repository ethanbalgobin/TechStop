import React from 'react';
import { Link } from 'react-router-dom';
// Import the useCart hook to access cart state and functions
import { useCart } from '../context/CartContext'; // Adjust path if needed

function CartPage() {
  // Get cart data and functions from the context
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();

  // Helper function to safely format price
  const formatPrice = (price) => {
    const numPrice = Number(price); // Attempt to convert to number
    if (!isNaN(numPrice)) {
      return numPrice.toFixed(2); // Format if it's a valid number
    }
    console.warn(`CartPage: Invalid price value encountered: ${price}`);
    return 'N/A'; // Return placeholder if not a valid number
  };

  // Helper function to calculate subtotal safely
  const calculateSubtotal = (price, quantity) => {
      const numPrice = Number(price);
      const numQuantity = Number(quantity);
      if (!isNaN(numPrice) && !isNaN(numQuantity)) {
          return (numPrice * numQuantity).toFixed(2);
      }
      return 'N/A';
  };


  // Basic styles for layout (replace with CSS later)
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  };
  const thTdStyle = {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'left',
  };
  const thStyle = {
    ...thTdStyle,
    backgroundColor: '#f2f2f2',
  };
  const quantityInputStyle = {
    width: '50px',
    padding: '5px',
    textAlign: 'center',
  };
   const totalStyle = {
      marginTop: '20px',
      textAlign: 'right',
      fontSize: '1.2em',
      fontWeight: 'bold',
  };
   const buttonStyle = {
       padding: '5px 10px',
       cursor: 'pointer',
       backgroundColor: '#dc3545', // Red color for remove
       color: 'white',
       border: 'none',
       borderRadius: '4px',
       marginLeft: '10px'
   };
 /*  const updateButtonStyle = {
       ...buttonStyle,
       backgroundColor: '#007bff', // Blue for update actions if needed
       marginLeft: '0px', // Adjust spacing if needed
       marginRight: '5px'
   };
*/
   const clearCartButtonStyle = {
       ...buttonStyle,
       backgroundColor: '#6c757d', // Gray for clear cart
       marginTop: '20px',
       display: 'block', // Make it block to appear below table
       marginLeft: 'auto' // Align right if needed, or remove for default left
   };

   const checkoutLinkStyle = {
    display: 'inline-block', // Make it behave like a button
    padding: '10px 15px',
    backgroundColor: '#28a745', // Green color
    color: 'white',
    textDecoration: 'none', // Remove underline from link
    borderRadius: '4px',
    marginLeft: '10px', // Space from Clear Cart button
    marginTop: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    border: 'none', // Make it look like a button
    fontSize: '1em' // Match button font size perhaps
};
// --- End Styles ---
  return (
    <div>
      <h1>Your Shopping Cart</h1>
      {cartItems.length === 0 ? (
        // Display message if cart is empty
        <div>
          <p>Your cart is currently empty.</p>
          <Link to="/products">Continue Shopping</Link>
        </div>
      ) : (
        // Display cart contents if not empty
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Quantity</th>
                <th style={thStyle}>Subtotal</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map(item => (
                <tr key={item.product.id}>
                  <td style={thTdStyle}>{item.product.name}</td>
                  {/* Use helper function to format price */}
                  <td style={thTdStyle}>${formatPrice(item.product.price)}</td>
                  <td style={thTdStyle}>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      // Ensure value passed to updateQuantity is a number
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value, 10) || 0)}
                      style={quantityInputStyle}
                      aria-label={`Quantity for ${item.product.name}`}
                    />
                  </td>
                  {/* Use helper function to calculate subtotal */}
                  <td style={thTdStyle}>${calculateSubtotal(item.product.price, item.quantity)}</td>
                  <td style={thTdStyle}>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      style={buttonStyle}
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Display Total - Use cartTotal from context */}
          <div style={totalStyle}>
            Total ({cartCount} items): ${cartTotal.toFixed(2)}
          </div>
          {/* Clear Cart Button */}
          <button onClick={clearCart} style={clearCartButtonStyle}>Clear Cart</button>
          {/* Checkout Link (Styled as Button)*/}
          <Link to="/checkout" style={checkoutLinkStyle}>
              Proceed to Checkout
          </Link>
        </>
      )}
    </div>
  );
}

export default CartPage;
