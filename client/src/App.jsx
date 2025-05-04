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

// --- Import Utility Components ---
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute

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
      {/* Render NavBar, passing token and logout handler */}
      <NavBar token={token} handleLogout={handleLogout} />

      <div style={{ padding: '20px' }}>
        {/* Define application routes */}
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route
              path="/login"
              // Pass the handleLoginSuccess function as a prop to LoginPage
              element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
          />
          <Route path="/products" element={<ProductsPage />} />

          {/* Protected Routes */}
          {/* Wrap the ProfilePage element with ProtectedRoute, passing the token */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute token={token}>
                {/* This is the child component rendered if token exists */}
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {/* Add other protected routes here using the same pattern */}
          {/* Example:
          <Route
            path="/orders"
            element={
              <ProtectedRoute token={token}>
                <OrdersPage /> // Assuming an OrdersPage component exists
              </ProtectedRoute>
            }
          />
          */}

          {/* Catch-all route for 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
