// client/src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component
export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    try {
      return storedUserInfo ? JSON.parse(storedUserInfo) : null;
    } catch (e) {
      console.error("AuthProvider: Error parsing stored user info on init:", e);
      localStorage.removeItem('userInfo');
      localStorage.removeItem('authToken');
      return null;
    }
  });

  // --- Logout function (defined before useEffect so it can be used as dependency) ---
  // useCallback might be used here in more complex scenarios, but for now this is fine.
  const logout = () => {
    console.log("AuthProvider: logout function called.");
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
      setToken(null);
      setUser(null);
      console.log("AuthProvider: State and localStorage cleared for logout.");
    } catch (error) {
        console.error("AuthProvider: Error during logout state update:", error);
    }
  };

  // --- Effect to verify token validity on initial load ---
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        console.log("AuthProvider: Verifying token found on initial load:", token);
        try {
          const response = await fetch('/api/auth/me', { // Your protected endpoint
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            // If status is 401 or 403, the token is invalid/expired
            if (response.status === 401 || response.status === 403) {
              console.warn(`AuthProvider: Token verification failed (${response.status}). Logging out.`);
              logout(); // Call logout to clear invalid token
            } else {
              // Handle other potential errors (e.g., server error 500)
              console.error(`AuthProvider: Error verifying token, status: ${response.status}`);
              // Decide if logout is appropriate for other errors too, maybe not.
            }
            // Optionally update user state based on successful verification
            // const verifiedUser = await response.json(); // If endpoint returns user data
            // setUser(verifiedUser); // Update user state if needed
          } else {
             console.log("AuthProvider: Token verified successfully.");
             // Optional: Ensure user state is consistent with token if needed
             // (e.g., fetch user data if not already loaded correctly)
             if (!user) {
                const userData = await response.json();
                setUser(userData);
                localStorage.setItem('userInfo', JSON.stringify(userData)); // Re-sync localStorage if needed
             }
          }
        } catch (error) {
          // Handle network errors during verification
          console.error("AuthProvider: Network error during token verification:", error);
        }
      } else {
         console.log("AuthProvider: No token found on initial load.");
      }
    };

    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Rerun effect if token changes (e.g., after login)


  // Login function: Updates state and localStorage
  const login = (newToken, newUser) => {
    console.log("AuthProvider: login function called.");
    try {
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('userInfo', JSON.stringify(newUser));
      setToken(newToken); // This state update will trigger the useEffect above
      setUser(newUser);
      console.log("AuthProvider: State and localStorage updated for login.");
    } catch (error) {
        console.error("AuthProvider: Error during login state update:", error);
    }
  };


  // 3. Value provided by the context
  const value = {
    token,
    user,
    login,
    logout, // Use the logout function defined above
  };

  // 4. Return the Provider component
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 5. Create a custom hook for easy consumption
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error means useAuth was called outside of AuthProvider
    throw new Error('useAuth must be used within an AuthProvider');
  }
   if (context === null) {
     // This means AuthProvider hasn't mounted or provided a value yet.
     // Can happen during initial render cycles.
     console.warn('useAuth returning null, provider might not be ready or value is null.');
     // Depending on usage, components might need to handle this null case gracefully.
   }
  return context;
}
