import { lateMapArt } from './biomes-late.js';

// Legacy saves may contain isolated late-level wins. Keep all earlier worlds accessible.
export function campaignProgress(stars, count) {
  let last = -1, cleared = 0;
  for (let i = 0; i < count; i++) if (Number(stars[i]) > 0) { last = i; cleared++; }
  return { cleared, unlocked: Math.min(count - 1, last + 1), complete: cleared === count };
}

const hex = n => '#' + n.toString(16).padStart(6, '0');
const mountain = (x, y, color, snow = false) => `<path d="M${x-17} ${y}l17-34 18 34z" fill="${color}"/><path d="M${x} ${y-34}v34h18z" fill="#163044" opacity=".25"/>${snow ? `<path d="M${x-7} ${y-20}l7-14 8 15-8-3z" fill="#e7f7ff"/>` : ''}`;
const tree = (x, y, color) => `<path d="M${x-2} ${y}v-17h4v17" fill="#6c5143"/><path d="M${x-13} ${y-7}l13-26 13 26z" fill="${color}"/><path d="M${x} ${y-33}v26h13z" fill="#102b3b" opacity=".2"/>`;

function scenery(theme, colors) {
  const rock = hex(colors.rail), roof = hex(colors.roof);
  switch (theme) {
    case 'desert': case 'mob': return `<path d="M47 60V28h7v18h7V34h6v18H54v8M106 65V40h6v13h7v-9h5v15h-12v6" fill="#4d9d70"/><path d="M67 65q14-26 29 0" fill="#e4bb78"/>`;
    case 'frost': return mountain(53,64,'#a6dbe8',true)+tree(102,65,'#69afaa')+`<path d="M89 48l13-26 13 26z" fill="#eefaff"/>`;
    case 'jungle': return tree(47,61,'#79bf60')+tree(75,54,'#3b8d5a')+tree(109,66,'#8ad46a');
    case 'lava': case 'volcano': return mountain(80,67,'#715058')+`<path d="M71 40l9-18 10 19-10-4zM79 38l-7 21h8l-3 10h11l-6-31" fill="#ff9560"/>`;
    case 'neon': case 'factory': return `<path d="M43 65V33l17 8 17-8v32M91 63V24h8v39M105 65V37h15v28" fill="${rock}"/><path d="M48 49h7v7h-7m14-7h7v7h-7m45-5h7v8h-7" fill="#e5f9ff"/><path d="M89 20q-9-7-1-12m9 9q8-8 1-13" fill="none" stroke="#a6bac6" stroke-width="4" stroke-linecap="round"/>`;
    case 'candy': return `<path d="M51 63V34m54 31V38" stroke="#e9f7ff" stroke-width="5"/><circle cx="51" cy="31" r="16" fill="#f38bab"/><circle cx="105" cy="35" r="14" fill="#a899ef"/><path d="M44 30q16-14 15 3t-15 0" fill="none" stroke="#ffeff5" stroke-width="4"/><path d="M68 66l12-25 13 25z" fill="#ffe1a8"/>`;
    case 'moon': case 'void': case 'blackhole': return `<circle cx="80" cy="38" r="24" fill="${theme==='moon'?'#cad4e6':'#251941'}"/><ellipse cx="80" cy="40" rx="39" ry="9" fill="none" stroke="${theme==='blackhole'?'#ffb276':'#b3a5f5'}" stroke-width="5" transform="rotate(-20 80 40)"/>${theme==='moon'?'<circle cx="72" cy="30" r="7" fill="#9faec5"/><circle cx="88" cy="45" r="5" fill="#9faec5"/>':'<circle cx="80" cy="38" r="14" fill="#100f23"/>'}`;
    case 'sky': case 'storm': return `<path d="M39 50q-4-15 11-17 2-21 24-16 13-7 20 9 27-1 23 24z" fill="${theme==='sky'?'#edf9ff':'#a8c0d6'}"/>${theme==='storm'?'<path d="M81 39L63 61h13l-3 18 22-29H80z" fill="#fff09b"/>':'<path d="M55 65h49" stroke="#ffe19c" stroke-width="5"/>'}`;
    case 'casino': return `<rect x="55" y="21" width="45" height="43" rx="7" fill="#f8e8d6" transform="rotate(-12 78 42)"/><g fill="#c55b6f"><circle cx="66" cy="33" r="4"/><circle cx="87" cy="53" r="4"/><circle cx="77" cy="43" r="4"/></g>`;
    case 'coral': return `<path d="M55 66V32m0 19L44 40m11 17 13-14m38 24V40m0 13 12-9m-12 15-12-11" fill="none" stroke="#fc9b9d" stroke-width="7" stroke-linecap="round"/><path d="M73 63q-5-20 3-27m6 28q12-17 7-25" fill="none" stroke="#7fd2bd" stroke-width="5"/>`;
    case 'spooky': return tree(45,62,'#698774')+`<path d="M68 67V40q0-23 20-23t20 23v27l-10-6-10 6-10-6z" fill="#e2e4e8"/><ellipse cx="81" cy="39" rx="3" ry="5" fill="#33394b"/><ellipse cx="96" cy="39" rx="3" ry="5" fill="#33394b"/>`;
    case 'arena': return `<ellipse cx="80" cy="49" rx="40" ry="23" fill="#ca9f77"/><ellipse cx="80" cy="42" rx="40" ry="23" fill="#f2d1a2"/><ellipse cx="80" cy="42" rx="24" ry="12" fill="#a77b60"/><path d="M47 45v13m15-8v14m18-13v16m18-17v14m15-19v13" stroke="#906958" stroke-width="5"/>`;
    case 'crystal': return `<path d="M44 65l-6-25 10-14 10 14-8 25M74 65l-9-39 15-17 16 19-10 37M108 65l-4-25 12-13 10 14-10 24" fill="#9ee7ed"/><path d="M80 9v56h6l10-37zM116 27v38l10-24z" fill="#a993e6"/>`;
    case 'tomb': return mountain(60,65,'#e0bd77')+mountain(100,63,'#c3a161')+`<path d="M50 65l10-17 10 17z" fill="${roof}"/>`;
    default: return lateMapArt(theme, colors) ?? mountain(80,65,rock);
  }
}

export function biomeArt(theme, colors) {
  return `<svg viewBox="0 0 160 104" aria-hidden="true"><ellipse cx="80" cy="89" rx="62" ry="9" fill="#0a1e30" opacity=".3"/><path d="M13 65L80 38l67 27-13 20-54 16-54-17z" fill="${hex(colors.rail)}"/><path d="M13 65l67 20v16L26 84z" fill="#122b3f" opacity=".25"/><path d="M13 65L80 39l67 26-67 22z" fill="${hex(colors.ground)}"/><path d="M60 78l19-9 24 7" fill="none" stroke="${hex(colors.road)}" stroke-width="9"/>${scenery(theme,colors)}</svg>`;
}

function trail(count, columns, unlocked) {
  const rows = Math.ceil(count / columns), points = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / columns), col = row % 2 ? columns - 1 - i % columns : i % columns;
    points.push([(col + .5) * 160, (row + .5) * 136]);
  }
  const path = end => points.slice(0, end).map(([x,y], i, all) => {
    if (!i) return `M${x} ${y}`;
    const [px,py] = all[i-1];
    return py===y ? `L${x} ${y}` : `C${px} ${py+68} ${x} ${y-68} ${x} ${y}`;
  }).join(' ');
  return `<svg class="map-trail cols-${columns}" viewBox="0 0 ${columns*160} ${rows*136}" preserveAspectRatio="none" aria-hidden="true"><path d="${path(count)}" class="trail-future"/><path d="${path(unlocked+1)}" class="trail-done"/></svg>`;
}

export function renderCampaignMap(container, levels, themes, progress, start) {
  const status = campaignProgress(progress.stars, levels.length);
  container.innerHTML = trail(levels.length,5,status.unlocked)+trail(levels.length,3,status.unlocked);
  const lock = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 016 0v2M4 7h8v7H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  levels.forEach((level, i) => {
    const button = document.createElement('button'), stars = Number(progress.stars[i]) || 0, locked = i > status.unlocked;
    const row = Math.floor(i/5), mobileRow = Math.floor(i/3);
    button.className = `map-stop${locked?' locked':stars?' cleared':' open'}${i===status.unlocked?' current':''}`;
    button.style.cssText = `--col:${row%2?5-i%5:1+i%5};--row:${row+1};--mcol:${mobileRow%2?3-i%3:1+i%3};--mrow:${mobileRow+1}`;
    button.dataset.level = i;
    button.disabled = locked;
    button.setAttribute('aria-label', `Level ${i+1}: ${level.name}. ${locked?'Locked':stars?`${stars} stars`:'Ready to play'}`);
    if (i===status.unlocked) button.setAttribute('aria-current','step');
    button.innerHTML = `${biomeArt(level.theme,themes[level.theme])}<span class="map-number">${i+1}${locked?lock:''}</span><span class="map-name">${level.name}</span><span class="map-stars" aria-hidden="true">${[0,1,2].map(k=>`<i class="${k<stars?'earned':''}">★</i>`).join('')}</span>`;
    button.addEventListener('click',()=>start(i));
    container.appendChild(button);
  });
  return status;
}
