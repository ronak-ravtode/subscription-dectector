import { useState } from "react";
import { Link } from "react-router-dom";
import { useLogin } from "@/hooks/useAuth";
import { Mail, Lock } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLogo } from "@/components/auth/AuthLogo";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { SecurityBadge } from "@/components/auth/SecurityBadge";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthLogo title="SubGuard" subtitle="Sign in to detect subscription leaks" />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <AuthInput
              id="email"
              type="email"
              label="Email"
              icon={<Mail className="w-5 h-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loginMutation.isPending}
            />

            <div className="space-y-1.5">
              <div className="flex justify-end mt-1 mb-2">
                <Link to="/forgot-password" className="text-[13px] font-medium text-primary hover:text-foreground transition-colors">
                  Forgot password?
                </Link>
              </div>
              <AuthInput
                id="password"
                type="password"
                label="Password"
                icon={<Lock className="w-5 h-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginMutation.isPending}
              />
            </div>

            {loginMutation.isError && (
              <p className="text-[14px] font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                {(loginMutation.error as any)?.response?.data?.detail || "Login failed. Please check your credentials."}
              </p>
            )}
          </div>

          <AuthButton type="submit" isLoading={loginMutation.isPending}>
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </AuthButton>

          <p className="text-center text-[14px] text-secondary-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-primary hover:text-foreground transition-colors">
              Create one
            </Link>
          </p>
        </form>

        <SecurityBadge />
        <AuthFooter />
      </AuthCard>
    </AuthLayout>
  );
}
