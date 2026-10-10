import { defineConfig } from 'vite';

// Relative asset paths, so the built app works from any folder of the site
// (it is published at /Gaaner-Sathi/new/ while the prototype stays at /Gaaner-Sathi/).
export default defineConfig({
  base: './',
});
