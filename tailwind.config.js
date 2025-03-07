/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#eccb34",
        secondary: "#fafafa",
        dark: "#333333",
      },
    },
  },
  plugins: [],
};
