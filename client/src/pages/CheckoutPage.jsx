import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/authContext'; 
import { countryList } from '../constants/countries'; 
import { loadStripe } from '@stripe/stripe-js';
import fetchApi from '../utils/api';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);


// ---  Checkout Form Component ---
function CheckoutForm({ shippingDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!stripe || !elements) {
      console.error("Stripe.js has not loaded yet.");
      setMessage("Payment system is not ready. Please wait a moment.");
      return;
    }

    setIsProcessing(true);

    // --- Confirm Payment ---
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
      },
      redirect: 'if_required' // off-session payments (3D Secure etc)
    });

    if (stripeError) {
      console.error("Stripe payment confirmation error:", stripeError);
      setMessage(`Payment failed: ${stripeError.message}`);
      setIsProcessing(false);
      return;
    }

    // --- Payment Intent Status ---
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        console.log("PaymentIntent status:", paymentIntent.status);

        // --- Order on Backend ---
        const orderPayload = {
            shippingDetails: shippingDetails,
            items: cartItems,
            total: cartTotal,
            paymentIntentId: paymentIntent.id
        };

        try {
            console.log("CheckoutForm: Sending order data to backend:", orderPayload);
            const orderData = await fetchApi('/api/orders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(orderPayload)
            });

            if (!orderData.ok) {
                console.error("CRITICAL: Payment succeeded but order creation failed!", orderData.error);
                setMessage(`Payment completed, but there was an issue saving your order. Please contact support with Payment Intent ID: ${paymentIntent.id}`);
                clearCart();
                navigate(`/order-success/${orderData.order?.id || 'error'}`); 

            } else {
                // Order created successfully!
                console.log("Order created successfully:", orderData);
                setMessage(`Payment ${paymentIntent.status}! Order placed.`);
                clearCart();
                navigate(`/order-success/${orderData.order?.id}`);
            }

        } catch (orderError) {
            console.error("CRITICAL: Payment succeeded but order API call failed!", orderError);
            setMessage(`Payment completed, but a network error occurred saving your order. Please contact support with Payment Intent ID: ${paymentIntent.id}`);
            clearCart();
            navigate(`/order-success/error`);
        }

    } else if (paymentIntent) {
      console.warn("PaymentIntent status:", paymentIntent.status);
      setMessage(`Payment status: ${paymentIntent.status}. Please follow any additional instructions.`);
    } else {
         setMessage("Payment confirmation failed. Please try again.");
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Information</h2>
      <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
      {message && <div id="payment-message" className={`mt-4 text-sm ${message.startsWith('Payment failed') || message.startsWith('CRITICAL') ? 'text-red-600' : 'text-green-600'}`}>{message}</div>}
      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
      >
        {isProcessing ? 'Processing Payment...' : `Pay $${(cartTotal).toFixed(2)}`}
      </button>
    </form>
  );
}


function CheckoutPage() {
  const { cartItems, isLoading: isCartLoading } = useCart();
  const { token } = useAuth();
  const location = useLocation();
  const [fullName, setFullName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('');
  const [formError, setFormError] = useState(''); 
  const [clientSecret, setClientSecret] = useState('');
  const { cartTotal } = useCart(); // Get cartTotal here

  useEffect(() => {
    if (token && !isCartLoading && cartItems.length > 0) {
      console.log("CheckoutPage: Attempting to create PaymentIntent...");
      setFormError(''); // Clear previous errors
      fetchApi('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      })
      .then(data => {
          console.log("CheckoutPage: PaymentIntent created, clientSecret received.");
          setClientSecret(data.clientSecret);
      })
      .catch(error => {
          console.error("CheckoutPage: Error creating PaymentIntent:", error);
          setFormError(`Could not initialize payment: ${error.message}`);
          setClientSecret('');
      });
    }
  }, [token, isCartLoading, cartItems.length]);


  // --- Styling Classes ---
  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const containerStyle = { display: 'grid', gridTemplateColumns: '1fr', lg: 'lg:grid-cols-3', gap: '30px', maxWidth: '1000px', margin: '20px auto' };
  const sectionStyle = { bg: 'bg-white', shadow: 'shadow-md', rounded: 'rounded-lg', p: 'p-6', border: 'border border-gray-200' };
  const summaryItemStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9em' };
  const summaryTotalStyle = { ...summaryItemStyle, fontWeight: 'bold', fontSize: '1.1em', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #ccc' };


  // --- Render Checks ---
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (isCartLoading) return <div className="text-center text-gray-500 py-10">Loading cart...</div>;
  if (!isCartLoading && cartItems.length === 0) return ( <div className="text-center py-10"> <h1>Checkout</h1> <p>Your cart is empty...</p> <Link to="/products">Go Shopping</Link> </div> );
  // --- End Checks ---

  const appearance = { theme: 'stripe' };
  const options = { clientSecret, appearance };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Checkout</h1>
      <div className={containerStyle}>

        {/* Column 1 & 2: Shipping & Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Section */}
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

          {/* Payment Section */}
          <div className={`${sectionStyle.bg} ${sectionStyle.shadow} ${sectionStyle.rounded} ${sectionStyle.p} ${sectionStyle.border}`}>
            {clientSecret ? (
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm shippingDetails={{ fullName, address1, address2, city, postcode, country }} />
              </Elements>
            ) : (
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
                  <span className="font-medium"> ${(Number(item.product.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className={summaryTotalStyle}>
                <span>Total: </span>
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
