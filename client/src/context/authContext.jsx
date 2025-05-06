import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component
export function AuthProvider({ children }) {
  // --- Existing State ---
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    try {
      const initialUser = storedUserInfo ? JSON.parse(storedUserInfo) : null;
      // Ensure is_admin is part of the initial user object if it exists
      return initialUser;
    } catch (e) {
      console.error("AuthProvider: Error parsing stored user info on init:", e);
      localStorage.removeItem('userInfo');
      localStorage.removeItem('authToken');
      return null;
    }
  });

  const [show2FAReminder, setShow2FAReminder] = useState(() => {
      const storedUserInfo = localStorage.getItem('userInfo');
      try {
          const initialUser = storedUserInfo ? JSON.parse(storedUserInfo) : null;
          return !!initialUser && !initialUser.is_2fa_enabled;
      } catch {
          return false;
      }
  });

  // --- Logout function ---
  const logout = useCallback(() => {
    console.log("AuthProvider: logout function called.");
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    setToken(null);
    setUser(null);
    setShow2FAReminder(false);
    console.log("AuthProvider: State and localStorage cleared for logout.");
  }, []);


  // --- Effect to verify token validity on initial load ---
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        console.log("AuthProvider: Verifying token found on initial load:", token);
        try {
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', },
          });
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              console.warn(`AuthProvider: Token verification failed (${response.status}). Logging out.`);
              logout();
            } else {
              console.error(`AuthProvider: Error verifying token, status: ${response.status}`);
            }
          } else {
             console.log("AuthProvider: Token verified successfully.");
             const verifiedUser = await response.json();
             // Ensuring user object from API includes is_admin
             if (!user || user.id !== verifiedUser.id || user.is_2fa_enabled !== verifiedUser.is_2fa_enabled || user.is_admin !== verifiedUser.is_admin) {
                 console.log("AuthProvider: Updating user state after token verification.", verifiedUser);
                 setUser(verifiedUser); // This user object should have is_admin
                 localStorage.setItem('userInfo', JSON.stringify(verifiedUser));
                 setShow2FAReminder(!!verifiedUser && !verifiedUser.is_2fa_enabled);
             } else {
                 setShow2FAReminder(!!user && !user.is_2fa_enabled);
             }
          }
        } catch (error) {
          console.error("AuthProvider: Network error during token verification:", error);
        }
      } else {
         console.log("AuthProvider: No token found on initial load.");
         setShow2FAReminder(false);
      }
    };
    verifyToken();
  }, [token, user, logout]); // Added user to dependencies to re-check if user object changes externally


  // --- Login function ---
  const login = useCallback((newToken, newUser) => {
    console.log("AuthProvider: login function called.");
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('userInfo', JSON.stringify(newUser)); // newUser should include is_admin from login API
    setToken(newToken);
    setUser(newUser);
    setShow2FAReminder(!!newUser && !newUser.is_2fa_enabled);
    console.log("AuthProvider: State and localStorage updated for login. User:", newUser, "Show reminder:", !!newUser && !newUser.is_2fa_enabled);
  }, []);


  // --- Dismiss 2FA Reminder function ---
  const dismiss2FAReminder = useCallback(() => {
      console.log("AuthProvider: Dismissing 2FA reminder for this session.");
      setShow2FAReminder(false);
  }, []);


  // --- Add isAdmin derived state ---
  const isAdmin = !!user && user.is_admin === true;

  // 3. Value provided by the context
  const value = {
    token,
    user,       // Contains full user object including is_admin
    isAdmin,    // --- Convenient boolean flag ---
    login,
    logout,
    show2FAReminder,
    dismiss2FAReminder,
  };

  // 4. Return the Provider component
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 5. Create a custom hook for easy consumption
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
