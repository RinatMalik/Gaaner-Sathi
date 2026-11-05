/**
 * The practice settings' Microphone (Rinat, 2026-11-05: the Scarlett's gain at its lowest and the
 * voice still too loud): which of the computer's microphones to sing into, and which one is being
 * heard. A computer can have a dozen inputs, a webcam's among them; until now nothing said which
 * one the page was hearing. The one picked is used from the next time the microphone comes on.
 */
import { chooseMic, listMics, micHeard, onMicHeard } from '../audio/mic';
import { esc } from './view';

/** A microphone's name as the browser gives it, without the USB ids Chrome adds ("(1235:8016)"). */
export const micName = (label: string): string => label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '').trim();

/** What the picker says under it: which microphone is being heard, and whether it is the one
 * picked. `picked`: the one picked ('' the computer's own), with its name. */
export function heardText(picked: { id: string; label: string } | null, heard: { id: string; label: string } | null): string {
  if (!heard) return picked ? '' : 'Which microphone is heard shows once it has been on.';
  const h = heard.label ? micName(heard.label) : 'the computer’s own';
  if (picked && heard.id !== picked.id) return (picked.label ? micName(picked.label) : 'The one picked') + ' is not plugged in: hearing ' + h + '.';
  return 'Hearing ' + h + '.';
}

export function initMicPick(pref: { get(): { id: string; label: string } | undefined; set(m: { id: string; label: string } | undefined): void }): void {
  const sel = document.querySelector('#pMic') as HTMLSelectElement;
  const say = document.querySelector('#pMicNow') as HTMLElement;
  chooseMic(pref.get()?.id ?? '');
  const show = (t: string) => {
    if (say.textContent !== t) say.textContent = t;
  };
  async function fill(): Promise<void> {
    const ms = (await listMics()).filter((m) => m.label);
    const want = pref.get();
    let html = '<option value="">The computer’s own</option>';
    for (const m of ms) html += '<option value="' + esc(m.id) + '">' + esc(micName(m.label)) + '</option>';
    if (want && !ms.some((m) => m.id === want.id)) html += '<option value="' + esc(want.id) + '">' + esc(want.label ? micName(want.label) : 'The one picked before') + ' (not found)</option>';
    if (sel.innerHTML !== html) sel.innerHTML = html;
    sel.value = want?.id ?? '';
    show(heardText(want ?? null, micHeard()));
  }
  sel.addEventListener('change', () => {
    const id = sel.value;
    const was = pref.get();
    const label = was && was.id === id ? was.label : (sel.selectedOptions[0]?.textContent ?? '');
    pref.set(id ? { id, label } : undefined);
    chooseMic(id);
    show('Used from the next time the microphone comes on.');
  });
  onMicHeard(() => void fill());
  navigator.mediaDevices?.addEventListener?.('devicechange', () => void fill());
  void fill();
}
