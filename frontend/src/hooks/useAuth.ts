import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { User } from "@/lib/types";

interface LoginParams {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface RegisterParams {
  email: string;
  password: string;
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (params: LoginParams) => {
      const res = await api.post<LoginResponse>("/api/auth/login", params);
      return res.data;
    },
    onSuccess: (data) => {
      login(data.access_token, data.user);
      navigate("/dashboard");
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (params: RegisterParams) => {
      const res = await api.post("/api/auth/register", params);
      return res.data;
    },
    onSuccess: () => {
      navigate("/login");
    },
  });
}
