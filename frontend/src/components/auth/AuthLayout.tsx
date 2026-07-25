import React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-foreground selection:bg-primary selection:text-white">
      {children}
    </div>
  );
}
