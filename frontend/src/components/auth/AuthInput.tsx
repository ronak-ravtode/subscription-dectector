import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, type, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="relative w-full h-[52px]">
        <input
          ref={ref}
          type={inputType}
          placeholder=" "
          className={`peer w-full h-full bg-background border border-border rounded-[12px] px-4 pt-4 pb-1 text-[16px] text-foreground placeholder-transparent transition-all duration-200 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed [&:-webkit-autofill]:shadow-[0_0_0_1000px_hsl(var(--background))_inset] [&:-webkit-autofill]:-webkit-text-fill-color-[hsl(var(--foreground))] ${
            icon ? "pl-11" : ""
          } ${isPassword ? "pr-11" : ""} ${className || ""}`}
          {...props}
        />
        
        {/* Floating Label */}
        <label
          className={`absolute top-1 text-[11px] font-medium text-secondary-foreground/70 transition-all duration-200 pointer-events-none 
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[16px] peer-placeholder-shown:text-secondary-foreground 
          peer-focus:top-1 peer-focus:text-[11px] peer-focus:text-primary
          ${icon ? "left-11" : "left-4"}`}
        >
          {label}
        </label>

        {/* Leading Icon */}
        {icon && (
          <div className="absolute left-4 top-[14px] text-muted-foreground pointer-events-none peer-focus:text-primary transition-colors">
            {icon}
          </div>
        )}

        {/* Trailing Password Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-[14px] text-muted-foreground hover:text-foreground transition-colors focus:outline-none rounded-full p-0.5 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
    );
  }
);
AuthInput.displayName = "AuthInput";
