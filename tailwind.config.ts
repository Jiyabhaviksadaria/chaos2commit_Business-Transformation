import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        popover: {
          DEFAULT: "#FAF8F2",
          foreground: "#18181B",
        },
        card: {
          DEFAULT: "#FAF8F2",
          foreground: "#18181B",
        },
        muted: {
          DEFAULT: "#EFEAE0",
          foreground: "#71717A",
        },
        cream: "#F7F4EB",
        sidebarDark: "#19191D",
        pastelYellow: "#FEE895",
        pastelPink: "#F8B4D9",
        pastelGreen: "#B8DF9E",
        pastelBlue: "#A3C0E4",
        brandPink: "#F472B6",
        brandDark: "#141417",
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [animate],
};
export default config;
