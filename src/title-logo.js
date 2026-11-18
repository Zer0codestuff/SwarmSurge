// Hand-lettered on a common cap height. Counters stay open even at phone sizes.
const glyphs = {
  T: 'M0 0H46V14H31V60H15V14H0Z',
  H: 'M0 0H16V22H32V0H48V60H32V37H16V60H0Z',
  A: 'M0 60L14 0H39L51 60H34L32 48H19L16 60ZM22 34H30L27 14H26Z',
  D: 'M0 0H33L47 13V47L33 60H0ZM16 15V45H26L31 40V20L26 15Z',
  G: 'M12 0H49V14H20L15 19V41L20 46H34V36H24V24H50V60H12L0 48V13Z',
  M: 'M0 60V0H17L29 25L41 0H58V60H42V28L31 48H26L16 28V60Z',
  E: 'M0 0H46V14H16V23H40V36H16V46H47V60H0Z',
};
const advances = { T: 49, H: 51, A: 53, D: 50, G: 53, M: 61, E: 49 };

export function drawTitleLogo(canvas) {
  const ctx = canvas.getContext('2d');
  // A fixed-resolution asset is sufficient for the largest CSS size at 3x.
  const scale = canvas.width / 360;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, 360, 185);
  const letters = [];
  function line(word, x, y, sx, sy, colors) {
    for (const [i, ch] of [...word].entries()) {
      const p = new Path2D();
      p.addPath(new Path2D(glyphs[ch]), new DOMMatrix([sx, 0, -.15 * sy, sy, x, y]));
      letters.push({ p, y, h: 60 * sy, colors: colors[i] });
      x += advances[ch] * sx;
    }
  }
  const ivory = ['#fffde8', '#ffdfa7'], coral = ['#ffb363', '#fa6a51'];
  const blue = ['#9bfff0', '#42c8df'];
  line('THATAD', 31, 10, 1.01, 1, [ivory, ivory, ivory, ivory, coral, coral]);
  line('GAME', 21, 78, 1.52, 1.46, [blue, blue, blue, blue]);
  ctx.lineJoin = 'round';
  // Draw the common outer silhouette first, so adjacent letters interlock cleanly.
  for (const [dy, width, ink] of [[8, 12, '#0c2436'], [3, 9, '#173749'], [0, 7, '#183246']]) {
    ctx.save();
    ctx.translate(0, dy);
    ctx.strokeStyle = ctx.fillStyle = ink;
    ctx.lineWidth = width;
    for (const { p } of letters) {
      ctx.stroke(p);
      ctx.fill(p, 'evenodd');
    }
    ctx.restore();
  }
  for (const { p, y, h, colors } of letters) {
    const paint = ctx.createLinearGradient(0, y, 0, y + h);
    paint.addColorStop(0, colors[0]);
    paint.addColorStop(.50, colors[0]);
    paint.addColorStop(.51, colors[1]);
    paint.addColorStop(1, colors[1]);
    ctx.fillStyle = paint;
    ctx.fill(p, 'evenodd');
    ctx.save();
    ctx.clip(p, 'evenodd');
    ctx.strokeStyle = '#ffffff68';
    ctx.lineWidth = 2;
    ctx.stroke(p);
    ctx.restore();
  }
}
