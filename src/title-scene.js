import { buildTitleBattle } from './title-battle.js';
import { drawTitleLogo } from './title-logo.js';
import { prefs } from './settings.js';
import { syncMuteButton } from './ui-icons.js';

export function createTitleScreen(sound, draw) {
  const root = document.getElementById('welcome'), settings = document.getElementById('settings');
  const motion = document.getElementById('setting-motion'), audio = document.getElementById('setting-audio'), glow = document.getElementById('setting-glow'), music = document.getElementById('setting-music');
  let battle, visible = false, painted = false, time = 0, elapsed = 0, dirty = true, focused = document.hasFocus();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let animated = !preference.matches;
  try { const stored = localStorage.getItem('swarm-menu-motion'); if (stored !== null) animated = stored === '1'; } catch {}
  glow.onchange = () => { prefs.set('glow', glow.checked); dirty = true; };
  music.onchange = () => prefs.set('music', music.checked);
  function sync() { motion.checked = animated; audio.checked = !sound.muted; glow.checked = prefs.get('glow'); music.checked = prefs.get('music'); root.classList.toggle('still', !animated || preference.matches); document.body.classList.toggle('menu-still', !animated); }
  document.getElementById('welcome-settings').onclick = () => { sync(); settings.showModal(); };
  document.getElementById('settings-close').onclick = () => settings.close();
  audio.onchange = () => { if (audio.checked === sound.muted) sound.toggle(); syncMuteButton(sound.muted); };
  motion.onchange = () => { animated = motion.checked; try { localStorage.setItem('swarm-menu-motion', animated ? '1' : '0'); } catch {} sync(); dirty = true; };
  preference.addEventListener('change', () => { sync(); dirty = true; });
  addEventListener('resize', () => { dirty = true; });
  addEventListener('blur', () => { focused = false; root.classList.add('unfocused'); });
  addEventListener('focus', () => { focused = true; dirty = true; root.classList.remove('unfocused'); });
  drawTitleLogo(document.getElementById('title-mark'));
  sync();
  return {
    get visible() { return visible; },
    get painted() { return painted; },
    show() { visible = true; dirty = true; root.classList.remove('hidden'); document.getElementById('menu').classList.add('hidden'); sync(); document.getElementById('welcome-play').focus({ preventScroll: true }); },
    hide() { visible = false; root.classList.add('hidden'); if (settings.open) settings.close(); },
    render(dt, force = false) {
      if (!visible || document.hidden) return;
      if (!force && painted && !focused) return;
      const moving = animated && !preference.matches;
      if (moving && !force) {
        time += Math.min(dt, .1);
        elapsed += dt;
      }
      if (!force && !dirty && (!moving || elapsed < 1 / 62)) return;
      battle ||= buildTitleBattle();
      elapsed = moving && !force ? elapsed % (1 / 62) : 0;
      dirty = false;
      painted = true;
      battle.render(draw, moving ? time : 0);
    },
  };
}
