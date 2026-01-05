/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        metal: {
          base: "#9CA3AF",
          light: "#E5E7EB",
          dark: "#4B5563",
          blue: "#60A5FA",
        }
      },
      animation: {
        liquid: "liquid 6s ease infinite",
      },
      keyframes: {
        liquid: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
}