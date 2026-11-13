import { defineConfig, type Plugin } from 'vite';
import { logoSvg } from './src/app/logo';

// The logo at the top left (src/app/logo.ts), written into index.html where it says <!-- logo -->,
// so the header draws it with no script. Fails the build if the app's page has no such place;
// other pages the dev server serves (design pages copied into .tmp/) are left as they are.
function logo(): Plugin {
  const MARK = '<!-- logo -->';
  return {
    name: 'torongini-logo',
    transformIndexHtml(html, ctx) {
      const marks = html.split(MARK).length - 1;
      if (marks === 0 && ctx.path !== '/index.html') return html;
      if (marks !== 1) throw new Error('index.html needs exactly one ' + MARK);
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
