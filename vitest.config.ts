import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Vitest blanks CSS files unless asked; the logo's test reads styles.css (as ?raw) to check the
    // tagline starts under the logo's র.
    css: { include: [/src\/app\/styles\.css/] },
  },
});
