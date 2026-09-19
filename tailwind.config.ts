import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDEAF2",
        paperDeep: "#DFDAE9",
        ink: "#221B3A",
        inkSoft: "#5A5175",
        string: "#E2483D",
        field: "#0F7C7B",
        stamp: "#F2C14E",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
