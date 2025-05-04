import React from 'react'; // Removed useState
// Import routing components
import { Routes, Route } from 'react-router-dom';

// --- Import Page Components ---
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ProductsPage from './pages/ProductsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import RegistrationPage from './pages/RegistrationPage';

// --- Import Utility Components ---
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';

// App component no longer manages auth state directly
function App() {

  // Note: NavBar and ProtectedRoute will be updated later to use useAuth()
  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      {/* NavBar no longer needs props passed from here */}
      <NavBar />

      <div style={{ padding: '20px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route
              path="/login"
              // LoginPage no longer needs onLoginSuccess prop from here
              element={<LoginPage />}
          />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/products" element={<ProductsPage />} />

          {/* Protected Routes */}
          {/* ProtectedRoute no longer needs token prop from here */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
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
