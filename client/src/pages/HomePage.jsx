import React from 'react';
import { Link } from 'react-router-dom'; 

function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20 text-center">
      {/* Styled heading */}
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
        Welcome to TechStop!
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        Your one-stop shop for the latest tech gadgets and accessories. Browse our products or log in to manage your account.
      </p>
      <Link
        to="/products"
        className="inline-block px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Shop Now
      </Link>
    </div>
  );
}

export default HomePage;
