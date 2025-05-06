// client/src/pages/AdminDashboardPage.jsx

import React from 'react';
import { Link } from 'react-router-dom'; // Import Link

function AdminDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <p className="text-gray-700 mb-6">
        Welcome to the Admin Dashboard. This area is restricted to approved administrators only.
      </p>

      {/* Links to Admin Sections */}
      <div className="space-y-4">
        <div>
          {/* --- Link to Admin Products Page --- */}
          <Link
            to="/admin/products"
            className="inline-block px-6 py-3 text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Manage Products
          </Link>
        </div>
        {/* --- NEW: Link to Admin Categories Page --- */}
        <div>
          <Link
            to="/admin/categories"
            className="inline-block px-6 py-3 text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Manage Categories
          </Link>
        </div>
        {/* Placeholders */}
        {/*
        <div>
          <Link
            to="/admin/orders" // Example for a future admin orders page
            className="inline-block px-6 py-3 text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View All Orders
          </Link>
        </div>
        */}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
