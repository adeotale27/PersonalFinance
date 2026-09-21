/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: "#F4F7FF",
        surface: "#FFFFFF",
        muted: "#EEF3FF",
        line: "#DFE6F5",
        ink: "#18223A",
        subink: "#64708A",
        faint: "#94A0B8",
        brand: {
          DEFAULT: "#4B5BE5",
          hover: "#3948C7",
          light: "#E8EBFF",
          dark: "#303FAF",
        },
        amber: { DEFAULT: "#D97706", light: "#FEF3C7" },
        income: "#059669",
        expense: "#E11D48",
        info: "#0284C7",
      },
      fontFamily: {
        sans: ["Manrope", "-apple-system", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        xs: "0 2px 5px rgba(55,74,130,0.08)",
        card: "0 1px 1px rgba(28,43,83,0.04), 0 12px 28px rgba(61,81,148,0.07)",
        pop: "0 18px 45px -16px rgba(52,70,139,0.26)",
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
