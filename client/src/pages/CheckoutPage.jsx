// client/src/pages/CheckoutPage.jsx

import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext'; // Adjust path if needed
import { useAuth } from '../context/AuthContext'; // Adjust path if needed
import { countryList } from '../constants/countries'; // Adjust path if needed

// --- Stripe Imports ---
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement, // Handles multiple payment methods
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// --- Load Stripe outside component to avoid recreating on render ---
// Replace with your actual Stripe Publishable Key (use environment variable ideally)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);


// ---  Checkout Form Component ---
// Extracting the form into a separate component because useStripe/useElements
function CheckoutForm({ shippingDetails }) {
  const stripe = useStripe(); // Hook to get the Stripe instance
  const elements = useElements(); // Hook to get Element instances (like PaymentElement)
  const { cartItems, cartTotal, clearCart } = useCart(); // Get cart details and clear function
  const { token } = useAuth(); // Get auth token for API calls
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null); // For displaying payment status/errors

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null); // Clear previous messages

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      console.error("Stripe.js has not loaded yet.");
      setMessage("Payment system is not ready. Please wait a moment.");
      return;
    }

    setIsProcessing(true);

    // --- 1. Confirm Payment with Stripe ---
    // This uses the PaymentElement to securely handle payment details
    // and confirms the PaymentIntent using the clientSecret fetched earlier.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Handle the result first
      confirmParams: {
      },
      redirect: 'if_required' // Only redirect for off-session payments (like 3D Secure)
    });

    if (stripeError) {
      // Show error to user (e.g., insufficient funds, card declined).
      console.error("Stripe payment confirmation error:", stripeError);
      setMessage(`Payment failed: ${stripeError.message}`);
      setIsProcessing(false);
      return;
    }

    // --- 2. Handle Payment Intent Status ---
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        console.log("PaymentIntent status:", paymentIntent.status);
        // Payment succeeded or is processing (e.g., bank transfer)

        // --- 3. Create Order on Your Backend ---
        // Prepare order data
        const orderPayload = {
            shippingDetails: shippingDetails, // Passed down as prop
            items: cartItems,
            total: cartTotal,
            // Optionally include paymentIntent ID for reconciliation
            paymentIntentId: paymentIntent.id
        };

        try {
            console.log("CheckoutForm: Sending order data to backend:", orderPayload);
            const orderResponse = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(orderPayload)
            });

            const orderData = await orderResponse.json();

            if (!orderResponse.ok) {
                // If order creation fails AFTER payment
                // This will log this error extensively for manual intervention and
                // inform the user, but won't fail the whole process here
                // as payment was likely successful.
                console.error("CRITICAL: Payment succeeded but order creation failed!", orderData.error);
                setMessage(`Payment completed, but there was an issue saving your order. Please contact support with Payment Intent ID: ${paymentIntent.id}`);
                // Proceeding to success page for now, but logging is crucial.
                clearCart(); // Still clear cart as payment was made
                navigate(`/order-success/${orderData.order?.id || 'error'}`); // Navigate, maybe indicate error in ID

            } else {
                // Order created successfully!
                console.log("Order created successfully:", orderData);
                setMessage(`Payment ${paymentIntent.status}! Order placed.`);
                clearCart(); // Clear the cart via context
                // Redirect to order success page
                navigate(`/order-success/${orderData.order?.id}`);
            }

        } catch (orderError) {
            console.error("CRITICAL: Payment succeeded but order API call failed!", orderError);
            setMessage(`Payment completed, but a network error occurred saving your order. Please contact support with Payment Intent ID: ${paymentIntent.id}`);
            clearCart();
            navigate(`/order-success/error`); // Indicate error state
        }

    } else if (paymentIntent) {
      // Handle other PaymentIntent statuses if needed (e.g., requires_action)
      console.warn("PaymentIntent status:", paymentIntent.status);
      setMessage(`Payment status: ${paymentIntent.status}. Please follow any additional instructions.`);
    } else {
        // Handle cases where paymentIntent is unexpectedly null after confirmPayment
         setMessage("Payment confirmation failed. Please try again.");
    }

    setIsProcessing(false); // Re-enable form
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Information</h2>
      {/* Stripe Payment Element */}
      <PaymentElement id="payment-element" options={{ layout: "tabs" }} />

      {/* Display processing indicator or payment messages */}
      {message && <div id="payment-message" className={`mt-4 text-sm ${message.startsWith('Payment failed') || message.startsWith('CRITICAL') ? 'text-red-600' : 'text-green-600'}`}>{message}</div>}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements} // Disable if processing or Stripe not loaded
        // Consistent button styling
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
      >
        {isProcessing ? 'Processing Payment...' : `Pay $${(cartTotal).toFixed(2)}`}
      </button>
    </form>
  );
}


// --- Main Checkout Page Component ---
function CheckoutPage() {
  const { cartItems, isLoading: isCartLoading } = useCart();
  const { token } = useAuth();
  const location = useLocation();

  // State for Shipping Form Inputs
  const [fullName, setFullName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('');
  const [formError, setFormError] = useState(''); // For shipping form validation errors

  // --- State for Stripe Elements ---
  const [clientSecret, setClientSecret] = useState(''); // Store the client secret for Payment Intent

  // --- Effect to create Payment Intent when component mounts (or cart total changes) ---
  // We need cartTotal from useCart() to be stable if used in deps, or fetch inside effect
  const { cartTotal } = useCart(); // Get cartTotal here

  useEffect(() => {
    // Only create intent if logged in and cart is loaded and not empty
    if (token && !isCartLoading && cartItems.length > 0) {
      console.log("CheckoutPage: Attempting to create PaymentIntent...");
      setFormError(''); // Clear previous errors
      fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // Backend calculates amount, no need to send it from client
        // body: JSON.stringify({ amount: Math.round(cartTotal * 100) }) // Example if sending amount
      })
      .then(async res => {
          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Failed to create payment intent: ${res.status}`);
          }
          return res.json();
      })
      .then(data => {
          console.log("CheckoutPage: PaymentIntent created, clientSecret received.");
          setClientSecret(data.clientSecret); // Save the client secret
      })
      .catch(error => {
          console.error("CheckoutPage: Error creating PaymentIntent:", error);
          setFormError(`Could not initialize payment: ${error.message}`);
          setClientSecret(''); // Clear secret on error
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isCartLoading, cartItems.length /* Consider adding cartTotal if amount sent from client */]); // Rerun if auth or cart status changes


  // --- Styling Classes ---
  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const containerStyle = { display: 'grid', gridTemplateColumns: '1fr', lg: 'lg:grid-cols-3', gap: '30px', maxWidth: '1000px', margin: '20px auto' }; // Adjusted grid for mobile first
  const sectionStyle = { bg: 'bg-white', shadow: 'shadow-md', rounded: 'rounded-lg', p: 'p-6', border: 'border border-gray-200' };
  const summaryItemStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9em' };
  const summaryTotalStyle = { ...summaryItemStyle, fontWeight: 'bold', fontSize: '1.1em', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #ccc' };
 // const inputGroupStyle = { marginBottom: '15px' };
  // --- End Styles ---


  // --- Render Checks ---
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (isCartLoading) return <div className="text-center text-gray-500 py-10">Loading cart...</div>;
  if (!isCartLoading && cartItems.length === 0) return ( <div className="text-center py-10"> <h1>Checkout</h1> <p>Your cart is empty...</p> <Link to="/products">Go Shopping</Link> </div> );
  // --- End Checks ---

  // Options for Stripe Elements provider
  const appearance = { theme: 'stripe' };
  const options = { clientSecret, appearance };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Checkout</h1>
      <div className={containerStyle}>

        {/* Column 1 & 2: Shipping & Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Section */}
          {/* No form tag here, handled by Stripe Elements form */}
          <div className={`${sectionStyle.bg} ${sectionStyle.shadow} ${sectionStyle.rounded} ${sectionStyle.p} ${sectionStyle.border}`}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Shipping Information</h2>
            {/* Basic validation message area */}
             {formError && !clientSecret && <p className="text-sm text-red-600 mb-4">{formError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
              {/* Name */}
              <div className="sm:col-span-2">
                <label htmlFor="name" className={labelClasses}>Full Name</label>
                <input type="text" id="name" name="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClasses} />
              </div>
              {/* Address Line 1 */}
              <div className="sm:col-span-2">
                <label htmlFor="address1" className={labelClasses}>Address Line 1</label>
                <input type="text" id="address1" name="address1" value={address1} onChange={(e) => setAddress1(e.target.value)} required className={inputClasses} />
              </div>
              {/* Address Line 2 */}
              <div className="sm:col-span-2">
                <label htmlFor="address2" className={labelClasses}>Address Line 2 <span className="text-gray-500">(Optional)</span></label>
                <input type="text" id="address2" name="address2" value={address2} onChange={(e) => setAddress2(e.target.value)} className={inputClasses} />
              </div>
              {/* City */}
              <div>
                <label htmlFor="city" className={labelClasses}>City</label>
                <input type="text" id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} required className={inputClasses} />
              </div>
              {/* Postcode */}
              <div>
                <label htmlFor="postcode" className={labelClasses}>Postcode</label>
                <input type="text" id="postcode" name="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} required className={inputClasses} />
              </div>
              {/* Country */}
              <div className="sm:col-span-2">
                <label htmlFor="country" className={labelClasses}>Country</label>
                <input type="text" id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} required className={inputClasses} list="country-list" autoComplete="off" />
                <datalist id="country-list">
                  {countryList.map((countryName) => (<option key={countryName} value={countryName} />))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Payment Section - Render Stripe Elements only when clientSecret is available */}
          <div className={`${sectionStyle.bg} ${sectionStyle.shadow} ${sectionStyle.rounded} ${sectionStyle.p} ${sectionStyle.border}`}>
            {clientSecret ? (
              <Elements stripe={stripePromise} options={options}>
                {/* Pass shipping details to the form component */}
                <CheckoutForm shippingDetails={{ fullName, address1, address2, city, postcode, country }} />
              </Elements>
            ) : (
              // Show loading or error message while clientSecret is being fetched
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Information</h2>
                {formError ?
                    <p className="text-red-600">{formError}</p> :
                    <p className="text-gray-500">Loading payment options...</p>
                }
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Order Summary */}
        <div className="lg:col-span-1">
          <div className={`${sectionStyle.bg} ${sectionStyle.shadow} ${sectionStyle.rounded} ${sectionStyle.p} ${sectionStyle.border} sticky top-8`}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {cartItems.map(item => (
                <div key={item.product.id} className={summaryItemStyle}>
                  <span>{item.product.name} (x{item.quantity})</span>
                  <span className="font-medium">${(Number(item.product.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className={summaryTotalStyle}>
                <span>Total:</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <Link to="/cart" className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-4 block text-center">
              Edit Cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
