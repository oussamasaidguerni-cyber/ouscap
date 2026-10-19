/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        pos: "rgb(var(--pos) / <alpha-value>)",
        neg: "rgb(var(--neg) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["InterVariable", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "mark-draw": {
          from: { "stroke-dashoffset": "var(--mark-len)" },
          to: { "stroke-dashoffset": "0" },
        },
        "mark-rise": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "word-reveal": {
          from: { opacity: "0", "letter-spacing": "0.6em" },
          to: { opacity: "1", "letter-spacing": "0.34em" },
        },
        "intro-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "slide-up": "slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        "mark-draw": "mark-draw 1200ms cubic-bezier(0.65, 0, 0.35, 1) forwards",
        "mark-rise": "mark-rise 700ms 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "word-reveal": "word-reveal 900ms 1200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "intro-out": "intro-out 400ms 2600ms ease-in forwards",
      },
    },
  },
  plugins: [],
};
