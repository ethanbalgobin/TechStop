import React from "react";
import { Link } from "react-router-dom";
import HomePage from "./HomePage";

function NotFoundPage() {
    return (
        <div>
            <h1>404 - Page Not Found</h1>
            <p>Sorry, the page you were looking for does not exist or was removed.</p>
            <Link to="/">Back to Home</Link>
        </div>
    );
}

export default NotFoundPage;