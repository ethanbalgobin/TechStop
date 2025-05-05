import React from 'react';
import { Link, useParams } from 'react-router-dom';

function OrderSuccessPage() {
    // Get the orderId from the URL params
    const { orderId } = useParams();

    return (
        <div style={{ textAlign: 'center', padding: '40px 20px'}}>
            <h1>Order placed successfully!</h1>
            <p style={{ fontSize: '1.2em', margin: '20px 0'}}>
                Thank you for your purchase.
            </p>
            {orderId && ( // Display order ID from URL (if available)
                <p>
                    Your Order Id is: <strong>{orderId}</strong>
                </p>
            )}
            <p style={{marginTop: '30px'}}>
                You will receive an email confirmation shortly (feature not implemented).
            </p>
            <div style={{ marginTop: '40px' }}>
                <Link
                    to="/products"
                    style={{
                        padding: '10px 20px',
                        marginRight: '10px',
                        textDecoration: 'none',
                        backgroundColor: '#007bff',
                        color: 'white',
                        borderRadius: '4px'
                    }}
                >
                    Continue Shopping
                </Link>
                {/* TODO: Implement order history page and link here*/}
            </div>
        </div>
    );
}

export default OrderSuccessPage;