export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif:  ['"Playfair Display"', 'Georgia', '"Times New Roman"', 'serif'],
        sans:   ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:   ['"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      colors: {
        paper:  '#FAF7F2',
        ink:    '#111111',
        accent: '#C2410C',
      },
      maxWidth: {
        reading: '720px',
        content: '1200px',
      },
      typography: {
        DEFAULT: { css: { maxWidth: '72ch' } }
      }
    }
  },
  plugins: []
}
