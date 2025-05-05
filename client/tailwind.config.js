// client/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
      // Reverted to the standard broad pattern
  content: [
    "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}", // Ensure this pattern covers your components/pages
  ],
  theme: {
    extend: {
          // Theme customizations go here
    },
  },
  plugins: [
        // Plugins go here
  ],
}
