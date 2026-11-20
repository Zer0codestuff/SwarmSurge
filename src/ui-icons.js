// Bespoke geometric SVG iconography shared across HUD, title screen, campaign atlas, and dossiers.
const svg = (cls, body, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" class="ui-ico ${cls}" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  soundOn: svg(
    'ico-sound',
    '<path fill="currentColor" d="M3 9h4.4L13 4.2v15.6L7.4 15H3z"/>'
    + '<path fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" d="M16.4 8.6a4.8 4.8 0 0 1 0 6.8M19.3 5.8a8.8 8.8 0 0 1 0 12.4"/>',
  ),
  soundOff: svg(
    'ico-sound',
    '<path fill="currentColor" d="M3 9h4.4L13 4.2v15.6L7.4 15H3z" opacity=".55"/>'
    + '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" d="M16.2 9.2 21.8 14.8M21.8 9.2l-5.6 5.6"/>',
  ),
  pause: svg(
    'ico-pause',
    '<rect x="6" y="4.5" width="4.2" height="15" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" fill="currentColor"/>',
  ),
  heart: svg(
    'ico-heart',
    '<path fill="currentColor" d="M12 20.6 3.5 12.3 3.5 7.4 7.4 4.2 12 7.5 16.6 4.2 20.5 7.4 20.5 12.3z"/>',
  ),
  hardcore: svg(
    'ico-hardcore',
    '<path fill="currentColor" fill-rule="evenodd" d="M12 2.4 5 5.4v6.3c0 2.5 1.3 4.5 3.6 5.4L9 21h2v-2.2h2V21h2l.4-3.9c2.3-.9 3.6-2.9 3.6-5.4V5.4L12 2.4zm-3.2 7.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zm6.4 0a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zm-3.2 3.9-1.2 2.1h2.4z"/>',
  ),
  boss: svg(
    'ico-boss',
    '<path fill="currentColor" d="M3.5 17.5 2 6.8l5.2 4.1L12 4.2l4.8 6.7L22 6.8l-1.5 10.7zM4.5 19.2h15V21h-15z"/>',
  ),
  star: svg(
    'ico-star',
    '<path fill="currentColor" d="M12 2.2 14.9 8.4 21.8 9.2 16.7 13.8 18.1 20.6 12 17.1 5.9 20.6 7.3 13.8 2.2 9.2 9.1 8.4z"/>',
  ),
  lock: svg(
    'ico-lock',
    '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" d="M8 10V7.2a4 4 0 0 1 8 0V10"/>'
    + '<rect x="5" y="10" width="14" height="10.5" fill="currentColor"/>',
  ),
  armor: svg(
    'ico-armor',
    '<path fill="currentColor" d="M12 2.5 4.2 5.7v6.1c0 4.6 3.2 8.2 7.8 9.7 4.6-1.5 7.8-5.1 7.8-9.7V5.7z"/>',
  ),
};

export function syncMuteButton(muted, button = document.getElementById('mute')) {
  if (!button) return;
  button.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
  button.setAttribute('aria-pressed', String(!!muted));
  button.classList.toggle('muted', !!muted);
}

export function starSpan(earned, cls = '') {
  return `<span class="star-slot${earned ? ' on' : ''}${cls ? ' ' + cls : ''}">${ICONS.star}</span>`;
}
