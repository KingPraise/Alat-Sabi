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
        wema: {
          purple: "#5B144B",
          darkPurple: "#3d0b32",
          lightPurple: "#8a2472",
          red: "#D71921",
          crimson: "#A61218",
          pink: "#E83A89",
          gray: "#F8F9FA",
          cardBg: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
export default config;
