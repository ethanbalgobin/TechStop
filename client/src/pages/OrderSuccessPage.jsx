import React from 'react';
import { Link, useParams } from 'react-router-dom';

function OrderSuccessPage() {
  const { orderId } = useParams();

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 text-center">
      <h1 className="text-3xl md:text-4xl font-bold text-green-600 mb-4">
        Order Placed Successfully!
      </h1>
      <p className="text-lg text-gray-700 mb-3">
        Thank you for your purchase.
      </p>
      {orderId && (
        <p className="text-base text-gray-600 mb-6">
          Your Order ID is: <strong className="font-semibold text-gray-800">{orderId}</strong>
        </p>
      )}
      <p className="text-sm text-gray-500 mb-8">
        You will receive an email confirmation shortly (feature not implemented).
      </p>
      <div className="space-x-4">
        <Link
          to="/products"
          className="inline-block px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Continue Shopping
        </Link>
        <Link
            to="/orders"
            className="inline-block px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            View Orders
        </Link>
      </div>
    </div>
  );
}

export default OrderSuccessPage;
