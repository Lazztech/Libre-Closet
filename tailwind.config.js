/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.hbs'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
};
