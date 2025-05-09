import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Page Components
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegistrationPage from './pages/RegistrationPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrderSuccessPage from './pages/OrderSuccessPage.jsx';
import OrderHistoryPage from './pages/OrderHistoryPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminProductsPage from './pages/AdminProductsPage.jsx';
import AdminCategoriesPage from './pages/AdminCategoriesPage.jsx';
import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import AdminOrderDetailPage from './pages/AdminOrderDetailPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';

// Utility Components
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';

function App() {
  return (
    <div>
      <NavBar />

      <div style={{ padding: '20px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/products/:productId/reviews" element={<ReviewPage />} />
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

          {/* --- Protected Admin Routes --- */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboardPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminProtectedRoute>
                <AdminProductsPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <AdminProtectedRoute>
                <AdminCategoriesPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminProtectedRoute>
                <AdminOrdersPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="admin/orders/:orderId"
            element={
              <AdminProtectedRoute>
                <AdminOrderDetailPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <AdminProtectedRoute>
                <AdminUsersPage />
              </AdminProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
