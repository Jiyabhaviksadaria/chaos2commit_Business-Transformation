import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        popover: {
          DEFAULT: "#FAF8F2",
          foreground: "#18181B",
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
      }
    },
  },
  plugins: [],
};
export default config;
