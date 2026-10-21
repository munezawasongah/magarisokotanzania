import type { Config } from "tailwindcss";

/**
 * Design tokens
 *  ink    — deep tarmac navy used for chrome, headings and the hero
 *  plate  — Tanzanian rear number-plate yellow; reserved for prices & the one signature element
 *  go     — WhatsApp / positive action green
 *  paper  — cool off-white page background
 *  line   — hairlines and input borders
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        ink: { 950: "#0A1426", 900: "#13223D", 800: "#1D3157", 700: "#2E4572", 500: "#5B6B88", 300: "#A9B3C6", 100: "#E6EAF1" },
        plate: { 300: "#FFE27A", 400: "#FFD43B", 500: "#F5BE0B", 700: "#8A6A00" },
        go: { 500: "#1FAF55", 600: "#178F45", 700: "#127238" },
        paper: "#F4F6F9",
        line: "#DCE1EA",
        danger: "#C2361F",
        whatsapp: "#25D366",
      },
      fontFamily: {
        sans: ['"Archivo Variable"', "system-ui", "sans-serif"],
      },
      fontSize: {
        // 1.25 modular scale on a 16px base
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: { plate: "6px" },
      boxShadow: {
        lift: "0 1px 0 rgb(10 20 38 / .04), 0 8px 24px -12px rgb(10 20 38 / .25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
