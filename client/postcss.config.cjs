// client/postcss.config.cjs
// Using CommonJS syntax and .cjs extension
// Reverted: Only include the dedicated plugin and autoprefixer

module.exports = {
  plugins: [
    // Use require for the dedicated Tailwind PostCSS plugin package
    require('@tailwindcss/postcss'),
    require('autoprefixer'),
  ],
};
