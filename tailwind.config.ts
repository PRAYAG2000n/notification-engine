import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#bcdfff",
          300: "#8eccff",
          400: "#59b0ff",
          500: "#338dff",
          600: "#1a6df5",
          700: "#1357e1",
          800: "#1646b6",
          900: "#183d8f",
          950: "#132757",
        },
        surface: {
          0: "#ffffff",
          50: "#f8f9fb",
          100: "#f1f3f5",
          200: "#e5e8ec",
          300: "#d1d6dd",
          400: "#9ba4b0",
          500: "#6b7685",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#0a0f1a",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
