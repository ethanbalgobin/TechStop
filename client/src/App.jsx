// client/src/App.jsx

import React from 'react';
// Import routing components
import { Routes, Route } from 'react-router-dom';

// --- Import Page Components ---
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ProductsPage from './pages/ProductsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import RegistrationPage from './pages/RegistrationPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';

// --- Import Utility Components ---
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {

  // --- Render Logic: Define Routes ---
  // NavBar, LoginPage, ProtectedRoute now use useAuth() hook internally
  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <NavBar />

      <div style={{ padding: '20px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />

          {/* Protected Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute> <ProfilePage /> </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute> <CheckoutPage /> </ProtectedRoute>
            }
          />
          <Route
            path="/order-success/:orderId"
            element={
               <ProtectedRoute> <OrderSuccessPage /> </ProtectedRoute>
            }
           />
          {/* Add other protected routes (e.g., /orders) here later */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute> <OrderHistoryPage /> </ProtectedRoute>
            }
          />
          <Route 
            path="orders/:orderId"
            element={ <ProtectedRoute> <OrderDetailPage /> </ProtectedRoute>}
          />
          {/* Catch-all route for 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
