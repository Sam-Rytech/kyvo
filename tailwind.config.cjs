/** @type {import('tailwindcss').Config} */
// The Tatum design system is documented in the `tatum-design` skill, and its
// semantic classes (bg-secondary, text-primary, p-xl, rounded-md,
// text-heading-xs, shadow-xs …) exist only if the skill's generated
// theme.extend is merged in — which is what this file does. Shipping Tailwind
// alone is not enough: an unregistered class used via @apply is a hard PostCSS
// build error. design-tokens/tokens.css holds the CSS variables these entries
// resolve to and is imported from src/index.css.
//
// .cjs, not .js: package.json is "type": "module" and the generated tokens file
// is CommonJS, so a .js config here could not require() it.
const tokens = require('./design-tokens/tailwind.tokens.cjs')

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    // Colour and font values are overridden in app/globals.css, so the Tatum class names still apply.
    extend: {
      ...tokens.theme.extend,
      fontFamily: { ...tokens.theme.extend.fontFamily, mono: ['var(--font-mono)', 'ui-monospace', 'Cascadia Mono', 'monospace'] },
    },
  },
  plugins: [],
}
