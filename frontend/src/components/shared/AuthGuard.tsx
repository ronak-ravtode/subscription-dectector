import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && isAuthenticated) {
      api
        .get("/api/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          logout();
          navigate("/login");
        });
    }
  }, [token, isAuthenticated, setUser, logout, navigate]);

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}