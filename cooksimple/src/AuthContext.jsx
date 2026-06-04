import { createContext, useContext, useEffect, useState } from "react";
import { loginUser, registerUser, logoutUser, getMe } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem("cs_token");
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem("cs_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const data = await loginUser({ username, password });
    localStorage.setItem("cs_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password, password2) => {
    const data = await registerUser({ username, email, password, password2 });
    localStorage.setItem("cs_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await logoutUser(); } catch (_) {}
    localStorage.removeItem("cs_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
