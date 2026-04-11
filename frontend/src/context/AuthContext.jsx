import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehydrate session from localStorage on mount
    const storedUser = localStorage.getItem('erp_user');
    const storedToken = localStorage.getItem('erp_token');
    const storedRole = localStorage.getItem('erp_role');

    if (storedUser && storedToken && storedRole) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      setRole(storedRole);
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken, userRole) => {
    setUser(userData);
    setToken(authToken);
    setRole(userRole);
    localStorage.setItem('erp_user', JSON.stringify(userData));
    localStorage.setItem('erp_token', authToken);
    localStorage.setItem('erp_role', userRole);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRole(null);
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_role');
  };

  const value = {
    user,
    token,
    role,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
