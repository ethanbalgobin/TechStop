import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20 text-center">
      {/* TODO: Add a 404 graphic or icon here later */}
      <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
      <h2 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-4">
        Page Not Found
      </h2>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        Sorry, the page you are looking for does not exist or may have been moved.
      </p>
      <Link
        to="/"
        className="inline-block px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Back to Home
      </Link>
    </div>
  );
}

export default NotFoundPage;
