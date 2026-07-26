import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Shield, Mail, ArrowRight, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post("/api/auth/forgot-password", { email });
      return res.data;
    },
    onSuccess: () => {
      setSuccess(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate(email);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-section">
          <div className="inline-flex items-center justify-center rounded-full bg-ink p-4 mb-4">
            <Shield className="h-8 w-8 text-canvas" />
          </div>
          <h1 className="text-3xl font-medium font-heading">Reset Password</h1>
          <p className="text-mute mt-1">Enter your email to receive a reset link</p>
        </div>

        <Card className="border border-hairline">
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              {forgotPasswordMutation.isError && (
                <div className="rounded-none bg-sale/10 p-3 text-sm text-sale">
                  {(forgotPasswordMutation.error as any)?.response?.data?.detail || "Failed to send reset email"}
                </div>
              )}
              {success && (
                <div className="rounded-none bg-success/10 p-3 text-sm text-success">
                  Check your email for the reset link.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pb-6">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send Reset Link
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
