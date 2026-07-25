import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { normalizeMerchantName } from "@/lib/merchantNormalizer";
import { getLogoPath } from "@/lib/merchantLogoMap";
import { getInitials, getAvatarColor } from "@/lib/avatarGenerator";
import { motion } from "framer-motion";

interface MerchantAvatarProps {
  name: string;
  className?: string;
}

export function MerchantAvatar({ name, className }: MerchantAvatarProps) {
  // Normalize the raw backend name
  const normalizedName = useMemo(() => normalizeMerchantName(name), [name]);
  
  // Look up the logo path
  const logoPath = useMemo(() => getLogoPath(normalizedName), [normalizedName]);

  // State to track if the logo failed to load
  const [imgError, setImgError] = useState(false);

  // If a logo exists and hasn't failed to load, render the logo
  if (logoPath && !imgError) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card border border-border/50 shadow-sm overflow-hidden",
          className
        )}
      >
        <img
          src={logoPath}
          alt={`${normalizedName} Logo`}
          className="h-full w-full object-contain p-2"
          onError={() => setImgError(true)}
        />
      </motion.div>
    );
  }

  // Fallback: Generate a premium initials avatar
  const initials = getInitials(normalizedName);
  const colorClass = getAvatarColor(normalizedName);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-extrabold text-[15px] border shadow-sm",
        colorClass,
        className
      )}
      aria-label={`${normalizedName} Avatar`}
    >
      {initials}
    </motion.div>
  );
}
