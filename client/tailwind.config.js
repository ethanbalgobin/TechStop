// client/tailwind.config.js
// Minimal configuration for testing

/** @type {import('tailwindcss').Config} */
export default {
    // Ensure content scanning path is still correct
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    // Removed theme and plugins sections completely for this test
  }
  