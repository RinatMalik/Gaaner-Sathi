/** The app's entry point (index.html). */
import './styles.css';
import { NOTEKEYS_CSS } from './notekeys';

// Note by note's keys: their styles are shared with the reports (notekeys.ts).
document.head.append(Object.assign(document.createElement('style'), { textContent: NOTEKEYS_CSS }));
import { init } from './app';

init();
