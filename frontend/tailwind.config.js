/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "rgb(var(--hairline) / <alpha-value>)",
        input: "rgb(var(--hairline) / <alpha-value>)",
        ring: "rgb(var(--ink) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          foreground: "rgb(var(--canvas) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--soft-cloud) / <alpha-value>)",
          foreground: "rgb(var(--ink) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--sale) / <alpha-value>)",
          foreground: "rgb(var(--canvas) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--soft-cloud) / <alpha-value>)",
          foreground: "rgb(var(--mute) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--soft-cloud) / <alpha-value>)",
          foreground: "rgb(var(--ink) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--canvas) / <alpha-value>)",
          foreground: "rgb(var(--foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--canvas) / <alpha-value>)",
          foreground: "rgb(var(--foreground) / <alpha-value>)",
        },
        /* Nike semantic colors */
        ink: "rgb(var(--ink) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        "soft-cloud": "rgb(var(--soft-cloud) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        "hairline-soft": "rgb(var(--hairline-soft) / <alpha-value>)",
        charcoal: "rgb(var(--charcoal) / <alpha-value>)",
        ash: "rgb(var(--ash) / <alpha-value>)",
        mute: "rgb(var(--mute) / <alpha-value>)",
        stone: "rgb(var(--stone) / <alpha-value>)",
        sale: "rgb(var(--sale) / <alpha-value>)",
        "sale-deep": "rgb(var(--sale-deep) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        "success-bright": "rgb(var(--success-bright) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        "info-deep": "rgb(var(--info-deep) / <alpha-value>)",
        /* Category accents */
        "accent-pink": "rgb(var(--accent-pink) / <alpha-value>)",
        "accent-pink-soft": "rgb(var(--accent-pink-soft) / <alpha-value>)",
        "accent-purple-soft": "rgb(var(--accent-purple-soft) / <alpha-value>)",
        "accent-purple-pale": "rgb(var(--accent-purple-pale) / <alpha-value>)",
        "accent-teal": "rgb(var(--accent-teal) / <alpha-value>)",
        "accent-pink-deep": "rgb(var(--accent-pink-deep) / <alpha-value>)",
      },
      fontFamily: {
        display: ["'Bebas Neue'", "'Anton'", "sans-serif"],
        heading: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "18px",
        md: "24px",
        lg: "30px",
        full: "9999px",
      },
      spacing: {
        "xxs": "2px",
        "xs": "4px",
        "sm": "8px",
        "md": "12px",
        "lg": "18px",
        "xl": "24px",
        "xxl": "30px",
        "section": "48px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "tap-collapse": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(0.5)", opacity: "0.5" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "slide-in-left": "slide-in-left 0.4s ease-out forwards",
        "tap-collapse": "tap-collapse 0.2s ease-out",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
