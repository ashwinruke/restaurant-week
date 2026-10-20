/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        sunk: v("sunk"),
        ink: v("ink"),
        muted: v("muted"),
        line: v("line"),
        edge: v("edge"),
        accent: v("accent"),
        star: v("star"),
        gold: v("gold"),
        good: v("good"),
        you: v("you"),
        ekta: v("ekta"),
        uday: v("uday"),
        tara: v("tara"),
      },
      fontFamily: {
        display: ['"Press Start 2P"', "ui-monospace", "monospace"],
        sans: ['"Pixelify Sans"', "ui-monospace", "system-ui", "sans-serif"],
        mono: ['"Press Start 2P"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
