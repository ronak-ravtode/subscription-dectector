import React from "react";
import { ShieldCheck } from "lucide-react";

export function SecurityBadge() {
  return (
    <div className="flex items-center justify-center gap-2 mt-8 text-[#64748B]">
      <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
      <span className="text-[13px] font-medium">Your data is encrypted with industry-standard security.</span>
    </div>
  );
}
