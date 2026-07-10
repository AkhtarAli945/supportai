/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12131A",
        surface: "#F7F7FB",
        accent: {
          DEFAULT: "#5B4FE9",
          dark: "#4438C4",
          light: "#EEECFC",
        },
        slate: {
          850: "#1A1B23",
        },
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
