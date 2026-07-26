import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Shield, Lock, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const res = await api.post("/api/auth/reset-password", { token, password });
      return res.data;
    },
  });

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

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    resetPasswordMutation.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md">
          <Card className="border border-hairline">
            <CardContent className="py-12 text-center text-mute">
              <div className="rounded-full bg-sale/10 p-4 w-fit mx-auto mb-4">
                <Shield className="h-8 w-8 text-sale" />
              </div>
              <p className="font-medium mb-1">Invalid Reset Link</p>
              <p className="text-sm mb-4">This password reset link is invalid or has expired.</p>
              <Link to="/forgot-password" className="text-ink hover:underline">
                Request a new reset link
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-section">
          <div className="inline-flex items-center justify-center rounded-full bg-ink p-4 mb-4">
            <Shield className="h-8 w-8 text-canvas" />
          </div>
          <h1 className="text-3xl font-medium font-heading">Set New Password</h1>
          <p className="text-mute mt-1">Choose a strong password for your account</p>
        </div>

        <Card className="border border-hairline">
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
                  <Input
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              {(error || resetPasswordMutation.isError) && (
                <div className="rounded-none bg-sale/10 p-3 text-sm text-sale">
                  {error || (resetPasswordMutation.error as any)?.response?.data?.detail || "Failed to reset password"}
                </div>
              )}
              {resetPasswordMutation.isSuccess && (
                <div className="rounded-none bg-success/10 p-3 text-sm text-success">
                  Password reset successfully! <Link to="/login" className="underline">Sign in</Link>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pb-6">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Reset Password
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
              <Link
                to="/login"
                className="flex items-center gap-1 text-sm text-mute hover:text-ink transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
