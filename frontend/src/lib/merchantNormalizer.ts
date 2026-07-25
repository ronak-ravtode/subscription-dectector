/**
 * Normalizes raw, messy bank statement merchant names into clean brand names.
 */

// A simple dictionary for mapping raw strings to clean brand names.
// Keys should be lowercase for easy matching.
const normalizationMap: Record<string, string> = {
  "netflix": "Netflix",
  "spotify": "Spotify",
  "google storage": "Google One",
  "google*cloud": "Google One",
  "google cloud": "Google One",
  "microsoft*office": "Microsoft 365",
  "microsoft office": "Microsoft 365",
  "adobe systems": "Adobe",
  "amzn mktplace": "Amazon",
  "amazon prime": "Amazon",
  "apple.com/bill": "Apple",
  "youtube premium": "YouTube",
};

/**
 * Normalizes a merchant name string.
 * @param rawName The raw merchant string from the backend.
 * @returns A clean, normalized merchant name.
 */
export function normalizeMerchantName(rawName: string): string {
  if (!rawName) return "Unknown Merchant";
  
  let clean = rawName.trim();
  const lowerClean = clean.toLowerCase();
  
  // 1. Check exact matches in the dictionary
  for (const [key, value] of Object.entries(normalizationMap)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'i');
    if (regex.test(clean)) {
      return value;
    }
  }

  // 2. Fallback normalization: clean up common bank statement cruft
  // Remove common suffixes like .COM, LLC, INC
  clean = clean.replace(/\.com/i, "");
  clean = clean.replace(/\b(llc|inc|corp)\b/i, "");
  
  // Remove asterisks and trailing digits (e.g., NETFLIX*123 -> NETFLIX)
  clean = clean.replace(/\*.*$/, "");
  
  // Remove random geographic/online tags (e.g., NETFLIX INDIA -> NETFLIX)
  clean = clean.replace(/\b(india|online|usa|uk)\b/i, "");

  clean = clean.trim();

  // 3. Title case the fallback string but preserve specific compound brands
  const compoundBrands: Record<string, string> = {
    "youtube": "YouTube",
    "github": "GitHub",
    "chatgpt": "ChatGPT",
    "openai": "OpenAI",
    "linkedin": "LinkedIn"
  };

  return clean.split(' ').map(word => {
    const lowerWord = word.toLowerCase();
    return compoundBrands[lowerWord] || (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }).join(' ') || "Unknown Merchant";
}
