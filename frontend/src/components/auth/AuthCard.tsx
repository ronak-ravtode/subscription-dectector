import React from "react";
import { motion } from "framer-motion";

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-[480px] bg-card rounded-[20px] p-10 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border mx-auto relative z-10"
    >
      {children}
    </motion.div>
  );
}
