import { useState } from "react";
import { Link } from "react-router-dom";
import { useRegister } from "@/hooks/useAuth";
import { Mail, Lock, ShieldCheck } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLogo } from "@/components/auth/AuthLogo";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { SecurityBadge } from "@/components/auth/SecurityBadge";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    registerMutation.mutate({ email, password });
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthLogo title="Create Account" subtitle="Start detecting subscription leaks today" />

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
              disabled={registerMutation.isPending}
            />

            <AuthInput
              id="password"
              type="password"
              label="Password (min 8 characters)"
              icon={<Lock className="w-5 h-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={registerMutation.isPending}
            />

            <AuthInput
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              icon={<ShieldCheck className="w-5 h-5" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={registerMutation.isPending}
            />

            {(error || registerMutation.isError) && (
              <p className="text-[14px] font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                {error || (registerMutation.error as any)?.response?.data?.detail || "Registration failed. Please try again."}
              </p>
            )}
          </div>

          <AuthButton type="submit" isLoading={registerMutation.isPending}>
            {registerMutation.isPending ? "Creating account..." : "Create Account"}
          </AuthButton>

          <p className="text-center text-[14px] text-secondary-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:text-foreground transition-colors">
              Sign in
            </Link>
          </p>
        </form>

        <SecurityBadge />
        <AuthFooter />
      </AuthCard>
    </AuthLayout>
  );
}
