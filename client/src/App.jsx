// client/src/App.jsx

import React, { useState } from 'react';
// Import routing components
import { Routes, Route } from 'react-router-dom';

// --- Import Page Components ---
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ProductsPage from './pages/ProductsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import RegistrationPage from './pages/RegistrationPage';
import ProductDetailPage from './pages/ProductDetailPage'; // Import the new ProductDetailPage

// --- Import Utility Components ---
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // --- Authentication State ---
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    try {
      return storedUserInfo ? JSON.parse(storedUserInfo) : null;
    } catch (e) {
      console.error("Error parsing stored user info:", e);
      localStorage.removeItem('userInfo');
      localStorage.removeItem('authToken');
      return null;
    }
  });

  // --- Authentication Handlers ---
  const handleLoginSuccess = (newToken, newUser) => {
    console.log("App: handleLoginSuccess called.");
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('userInfo', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    // Navigation is handled within LoginPage
  };

  const handleLogout = () => {
    console.log('App: handleLogout called...');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    setToken(null);
    setUser(null);
    // Navigation after logout is handled within NavBar
  };

  // --- Render Logic: Define Routes ---
  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <NavBar token={token} handleLogout={handleLogout} />

      <div style={{ padding: '20px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route
              path="/login"
              element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
          />
          <Route path="/register" element={<RegistrationPage />} />
          {/* Route for the main products list */}
          <Route path="/products" element={<ProductsPage />} />
          {/* ADDED: Dynamic route for individual product details */}
          {/* The ':productId' part is a URL parameter */}
          <Route path="/products/:productId" element={<ProductDetailPage />} />

          {/* Protected Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute token={token}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {/* Add other protected routes here using the same pattern */}

          {/* Catch-all route for 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
