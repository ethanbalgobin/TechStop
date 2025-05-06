import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'; // Added useCallback

// 1. Create Context
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

  // --- State for 2FA Reminder ---
  // Initialize based on initially loaded user state
  const [show2FAReminder, setShow2FAReminder] = useState(() => {
      const storedUserInfo = localStorage.getItem('userInfo');
      try {
          const initialUser = storedUserInfo ? JSON.parse(storedUserInfo) : null;
          // Show reminder initially if user is loaded and 2FA is not enabled
          return !!initialUser && !initialUser.is_2fa_enabled;
      } catch {
          return false; // Don't show if user info is corrupted
      }
  });

  // --- Logout function ---
  // Defined earlier to be used in useEffect and login
  const logout = useCallback(() => { // Wrap in useCallback
    console.log("AuthProvider: logout function called.");
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
      setToken(null);
      setUser(null);
      // --- Reset reminder state on logout ---
      setShow2FAReminder(false);
      console.log("AuthProvider: State and localStorage cleared for logout.");
    } catch (error) {
        console.error("AuthProvider: Error during logout state update:", error);
    }
  }, []); // Empty dependency array as logout logic doesn't depend on external state


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
             if (!user || user.id !== verifiedUser.id || user.is_2fa_enabled !== verifiedUser.is_2fa_enabled) {
                 console.log("AuthProvider: Updating user state after token verification.");
                 setUser(verifiedUser);
                 localStorage.setItem('userInfo', JSON.stringify(verifiedUser));
                 // --- Update reminder state based on verified user ---
                 setShow2FAReminder(!verifiedUser.is_2fa_enabled);
             } else {
                 // User state is already consistent, ensure reminder state matches
                 setShow2FAReminder(!user.is_2fa_enabled);
             }
          }
        } catch (error) {
          console.error("AuthProvider: Network error during token verification:", error);
        }
      } else {
         console.log("AuthProvider: No token found on initial load.");
         // Ensure reminder is false if no token
         setShow2FAReminder(false);
      }
    };
    verifyToken();
  }, [token, user, logout]); // Rerun if token changes or user state is inconsistent


  // --- Login function ---
  const login = useCallback((newToken, newUser) => {
    console.log("AuthProvider: login function called.");
    try {
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('userInfo', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      // --- Set reminder state based on logged-in user ---
      // Show reminder only if user exists and 2FA is not enabled
      setShow2FAReminder(!!newUser && !newUser.is_2fa_enabled);
      console.log("AuthProvider: State and localStorage updated for login. Show reminder:", !!newUser && !newUser.is_2fa_enabled);
    } catch (error) {
        console.error("AuthProvider: Error during login state update:", error);
    }
  }, []); // Empty dependency array as login logic itself doesn't depend on external state


  // --- Function to dismiss the reminder for the current session ---
  const dismiss2FAReminder = useCallback(() => {
      console.log("AuthProvider: Dismissing 2FA reminder for this session.");
      setShow2FAReminder(false);
  }, []); // Empty dependency array


  // 3. Value provided by the context
  // --- Added show2FAReminder and dismiss2FAReminder ---
  const value = {
    token,
    user,
    login,
    logout,
    show2FAReminder,     // Expose the reminder state
    dismiss2FAReminder, // Expose the dismiss function
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

   if (context === null) {
      console.warn('useAuth returning null, provider might not be ready or value is null.');
   }
  return context;
}
