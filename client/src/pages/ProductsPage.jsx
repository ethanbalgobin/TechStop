import React, {useState, useEffect} from 'react';

function ProductsPage() {
    // --- State for products, loading and errors ---
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Effect to fetch products once the components mount ---
    useEffect(() => {
        console.log("ProductsPage: Fetching Products...");
        setLoading(true);
        setError(null); // clearing any previous errors
        fetch('/api/products') // using proxy in vite.config.js
            .then(response => {
                if (!response.ok){
                    throw new Error(`HTTP error fetching products! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("ProductsPage: Products fetched successfully!", data);
                setProducts(data);
            })
            .catch(err => {
                console.error("ProductsPage: Error fetching products:", err);
                setError(err.message); // Set error state to display to user
                setProducts([]); // Clear products on error
            })
            .finally(() => {
                setLoading(false); // stops loading
            });
    }, []); //dependancy array means that this runs once the components mounts.

    // --- Render logic based on state ---
    return (
        <div>
            <h1>TechStop Products</h1>
            {loading ? (
                <div>Loading products...</div>
            ) : error ? (
                <div style={{color: 'red'}}>Error loading products: {error}</div>
            ) : products.length > 0 ? (
                <ul>
                    {products.map(product => (
                        <li key={product.id}>
                            {product.name} - ${product.price}
                            <img src={product.image_url} alt={product.name} width="50" />
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No products found.</p>
            )}
        </div>
    );
}

export default ProductsPage;