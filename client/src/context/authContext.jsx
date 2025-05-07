import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    try {
      const initialUser = storedUserInfo ? JSON.parse(storedUserInfo) : null;
      return initialUser;
    } catch (e) {
      console.error("AuthProvider: Error", e);
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


  const logout = useCallback(() => {
    console.log("AuthProvider: logout");
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    setToken(null);
    setUser(null);
    setShow2FAReminder(false);
  }, []);


  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        console.log("AuthProvider: Verifying token:", token);
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
             console.log("AuthProvider: Token verified.");
             const verifiedUser = await response.json();
             if (!user || user.id !== verifiedUser.id || user.is_2fa_enabled !== verifiedUser.is_2fa_enabled || user.is_admin !== verifiedUser.is_admin) {
                 console.log("AuthProvider: Updating user state:", verifiedUser);
                 setUser(verifiedUser);
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
         console.log("AuthProvider: No token found.");
         setShow2FAReminder(false);
      }
    };
    verifyToken();
  }, [token, user, logout]);


  const login = useCallback((newToken, newUser) => {
    console.log("AuthProvider: login function called.");
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('userInfo', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setShow2FAReminder(!!newUser && !newUser.is_2fa_enabled);
  }, []);


  const dismiss2FAReminder = useCallback(() => {
      setShow2FAReminder(false);
  }, []);


  const isAdmin = !!user && user.is_admin === true;
  const value = {
    token,
    user,
    isAdmin,
    login,
    logout,
    show2FAReminder,
    dismiss2FAReminder,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
