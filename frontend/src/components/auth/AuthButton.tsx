import React from "react";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

export const AuthButton = React.forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ className, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={`w-full h-[52px] bg-[#0F172A] text-white rounded-[12px] text-[16px] font-medium 
        transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgb(15,23,42,0.15)] 
        active:translate-y-[1px] active:shadow-none focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2
        disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none relative overflow-hidden ${className || ""}`}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 pointer-events-none opacity-0 hover:opacity-100 transition-opacity" />
        <span className="flex items-center justify-center relative z-10">
          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {children}
        </span>
      </button>
    );
  }
);
AuthButton.displayName = "AuthButton";
