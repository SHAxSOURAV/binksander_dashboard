/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#111111",
        primary: "#000000",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      // Tightened corner radii. Overriding the scale here rather than rewriting the
      // utility class on every card keeps existing markup working while pulling the
      // whole dashboard to a squarer, more professional shape.
      // Tailwind defaults: lg 8, xl 12, 2xl 16, 3xl 24.
      borderRadius: {
        lg: "0.375rem",  //  6px
        xl: "0.5rem",    //  8px
        "2xl": "0.625rem", // 10px
        "3xl": "0.75rem",  // 12px
      },
    },
  },
  plugins: [],
}
