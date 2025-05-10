const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const fetchApi = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API call failed: ${response.status}`);
    }
    
    return response.json();
};

export default fetchApi; 