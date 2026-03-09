import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        panel: "var(--panel)",
        line: "var(--line)",
        brand: "var(--brand)",
        warning: "var(--warning)",
        success: "var(--success)"
      },
      boxShadow: {
        panel: "0 20px 60px rgba(7, 18, 34, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

