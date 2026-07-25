import React from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

interface AuthLogoProps {
  title: string;
  subtitle: string;
}

export function AuthLogo({ title, subtitle }: AuthLogoProps) {
  return (
    <div className="flex flex-col items-center mb-10">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6 shadow-sm"
      >
        <Shield className="w-6 h-6 text-primary-foreground" />
      </motion.div>
      <h1 className="text-[32px] md:text-[40px] font-semibold text-foreground tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-[16px] text-secondary-foreground font-medium text-center max-w-[280px]">
        {subtitle}
      </p>
    </div>
  );
}
