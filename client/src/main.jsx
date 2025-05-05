// client/src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom';
// Import the Providers
import { AuthProvider } from './context/authContext.jsx'; // Adjust path if needed
import { CartProvider } from './context/CartContext'; // Import CartProvider

// Import global styles if you have them
// import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </CartProvider>
  </React.StrictMode>,
)
