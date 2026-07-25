import React from "react";
import { Link } from "react-router-dom";

export function AuthFooter() {
  return (
    <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex items-center justify-center gap-2 text-[13px] text-[#64748B]">
      <Link to="/privacy" className="hover:text-[#0F172A] transition-colors">Privacy Policy</Link>
      <span>&bull;</span>
      <Link to="/terms" className="hover:text-[#0F172A] transition-colors">Terms of Service</Link>
    </div>
  );
}
