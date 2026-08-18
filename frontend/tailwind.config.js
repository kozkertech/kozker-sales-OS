/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ["IBM Plex Sans", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        quiet: {
          bg: "#F9F8F6",
          surface: "#F2F0EB",
          border: "#E5E2DC",
          text: "#2C2B29",
          muted: "#73706A",
        },
        operational: {
          bg: "#1A1918",
          surface: "#242322",
          border: "#33312F",
          text: "#E6E4DF",
          muted: "#999690",
        },
        coral: {
          DEFAULT: "#F05D48",
          hover: "#D94D3A",
          subtle: "rgba(240, 93, 72, 0.1)",
        },
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
