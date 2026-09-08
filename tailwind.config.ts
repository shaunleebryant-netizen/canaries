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
        canary: {
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          ink: "#0f172a",
          mist: "#f8fafc",
          gold: "#eab308",
        },
      },
    },
  },
  plugins: [],
};

export default config;
