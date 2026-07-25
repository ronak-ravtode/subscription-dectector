/**
 * Maps normalized brand names to their exact logo paths in the public directory.
 * If a brand is not in this map, the system will fall back to generating an initials avatar.
 */

export const merchantLogoMap: Record<string, string> = {
  "Netflix": "/logos/netflix.svg",
  "Spotify": "/logos/spotify.svg",
  "Google One": "/logos/google.svg",
  "Google": "/logos/google.svg",
  "Adobe": "/logos/adobe.svg",
  "Amazon": "/logos/amazon.svg",
  "Apple": "/logos/apple.svg",
  "YouTube": "/logos/youtube.svg",
  "Microsoft 365": "/logos/microsoft.svg",
  "Microsoft": "/logos/microsoft.svg",
  "Disney": "/logos/disney.svg",
  "Dropbox": "/logos/dropbox.svg",
  "Canva": "/logos/canva.svg",
  "Slack": "/logos/slack.svg",
  "Zoom": "/logos/zoom.svg",
  "GitHub": "/logos/github.svg",
  "Notion": "/logos/notion.svg",
  "Figma": "/logos/figma.svg",
  "ChatGPT": "/logos/openai.svg",
  "OpenAI": "/logos/openai.svg",
  "LinkedIn": "/logos/linkedin.svg",
  "Grammarly": "/logos/grammarly.svg",
  "Stripe": "/logos/stripe.svg",
  "Ramp": "/logos/ramp.svg",
  "Rocket Money": "/logos/rocketmoney.svg",
};

/**
 * Returns the logo path for a normalized merchant name, or null if none exists.
 */
export function getLogoPath(normalizedName: string): string | null {
  return merchantLogoMap[normalizedName] || null;
}
