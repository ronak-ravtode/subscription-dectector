import React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 font-sans text-[#0F172A] selection:bg-[#2563EB] selection:text-white">
      {children}
    </div>
  );
}
