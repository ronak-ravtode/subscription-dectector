import React from "react";
import { Link } from "react-router-dom";

export function AuthFooter() {
  return (
    <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
      <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
      <span>&bull;</span>
      <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
    </div>
  );
}
