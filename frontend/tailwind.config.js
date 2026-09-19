/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: "#F6F7F9",
        surface: "#FFFFFF",
        muted: "#F1F5F9",
        line: "#E7EAEE",
        ink: "#0F172A",
        subink: "#51607A",
        faint: "#94A3B8",
        brand: {
          DEFAULT: "#0F766E",
          hover: "#115E59",
          light: "#CCFBF1",
          dark: "#042F2E",
        },
        amber: { DEFAULT: "#D97706", light: "#FEF3C7" },
        income: "#059669",
        expense: "#E11D48",
        info: "#0284C7",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "-apple-system", "system-ui", "sans-serif"],
        display: ["Outfit", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(15,23,42,0.05)",
        card: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        pop: "0 10px 30px -10px rgba(15,23,42,0.25)",
      },
      borderRadius: { xl: "0.9rem", "2xl": "1.1rem" },
      keyframes: {
        "fade-up": { "0%": { opacity: 0, transform: "translateY(8px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.3s ease both",
      },
    },
  },
  plugins: [],
};
