export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"Bricolage Grotesque"', "system-ui", "sans-serif"] },
      colors: { leaf: { DEFAULT: "#1f6f4a", dark: "#154d34", soft: "#e4f1e9" }, mango: "#f2a516", ink: "#17231d", paper: "#f7f8f5" },
    },
  },
  plugins: [],
};
