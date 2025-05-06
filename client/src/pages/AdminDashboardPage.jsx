import React from 'react';

function AdminDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <p className="text-gray-700">
        Welcome to the Admin Dashboard. This area is restricted to approved administrators only.
      </p>
      {/* Admin-specific content and links will go here later */}
      {/* Placeholder:
      <ul className="mt-4 list-disc list-inside">
        <li>Manage Products</li>
        <li>View All Orders</li>
        <li>Manage Users</li>
      </ul>
      */}
    </div>
  );
}

export default AdminDashboardPage;
