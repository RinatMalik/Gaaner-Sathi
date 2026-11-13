import { defineConfig, type Plugin } from 'vite';
import { logoSvg } from './src/app/logo';

// The logo at the top left (src/app/logo.ts), written into index.html where it says <!-- logo -->,
// so the header draws it with no script. Fails the build if the place is missing.
function logo(): Plugin {
  const MARK = '<!-- logo -->';
  return {
    name: 'torongini-logo',
    transformIndexHtml(html) {
      if (html.split(MARK).length !== 2) throw new Error('index.html needs exactly one ' + MARK);
      return html.replace(MARK, logoSvg());
    },
  };
}

// Relative asset paths, so the built app works from any folder of the site
// (GitHub Pages serves it from /Gaaner-Sathi/).
export default defineConfig({
  base: './',
  plugins: [logo()],
});
