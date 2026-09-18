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
        primary: {
          DEFAULT: "var(--color-primary, #1e40af)",
          hover: "var(--color-primary-hover, #1d4ed8)",
          light: "var(--color-primary-light, #eff6ff)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary, #0284c7)",
          hover: "var(--color-secondary-hover, #0369a1)",
          light: "var(--color-secondary-light, #f0f9ff)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
