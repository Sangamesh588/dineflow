import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: "#171A19",
          dark: "#111312",
          card: "#1F2322",
          surface: "#242A28",
          border: "#2F3634",
          muted: "#8A9490",
        },
        cream: {
          DEFAULT: "#F7F5EF",
          muted: "#EFECE3",
          card: "#FFFFFF",
          border: "#E5E1D5",
          darkText: "#1A1D1C",
        },
        emerald: {
          DEFAULT: "#16865A",
          hover: "#126E4A",
          dark: "#0E563A",
          light: "#EAF5EF",
          subtle: "#1B3B2F",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
