/**
 * Generates fallbacks for merchants without logos.
 */

/**
 * Extracts up to 2 meaningful initials from a merchant name.
 * Ignores punctuation and extra spaces.
 * "Karan Tech Services" -> "KT"
 * "DeepVision AI" -> "DA"
 * "Netflix Refund" -> "NR"
 * "N" -> "N"
 */
export function getInitials(name: string): string {
  if (!name) return "UM"; // Unknown Merchant

  // Strip punctuation and special characters
  const cleanName = name.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  
  if (!cleanName) return "UM";

  const words = cleanName.split(" ");
  
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }

  // If it's a single word but has camel case like "DeepVision"
  const camelCaseMatches = cleanName.match(/[A-Z][a-z]+/g);
  if (camelCaseMatches && camelCaseMatches.length >= 2) {
    return (camelCaseMatches[0].charAt(0) + camelCaseMatches[1].charAt(0)).toUpperCase();
  }

  // Fallback to the first two characters of the single word
  return cleanName.substring(0, 2).toUpperCase();
}

/**
 * Generates a deterministic premium gradient/color class based on a string hash.
 */
export function getAvatarColor(name: string): string {
  // Premium soft gradients with high contrast text colors
  const colorClasses = [
    "bg-gradient-to-br from-blue-100 dark:from-blue-900/40 to-blue-200 dark:to-blue-800/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    "bg-gradient-to-br from-green-100 dark:from-green-900/40 to-green-200 dark:to-green-800/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    "bg-gradient-to-br from-purple-100 dark:from-purple-900/40 to-purple-200 dark:to-purple-800/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    "bg-gradient-to-br from-orange-100 dark:from-orange-900/40 to-orange-200 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    "bg-gradient-to-br from-pink-100 dark:from-pink-900/40 to-pink-200 dark:to-pink-800/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    "bg-gradient-to-br from-cyan-100 dark:from-cyan-900/40 to-cyan-200 dark:to-cyan-800/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    "bg-gradient-to-br from-indigo-100 dark:from-indigo-900/40 to-indigo-200 dark:to-indigo-800/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    "bg-gradient-to-br from-rose-100 dark:from-rose-900/40 to-rose-200 dark:to-rose-800/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colorClasses[Math.abs(hash) % colorClasses.length];
}
