// Cube coordinate directions for the 6 hex neighbors
const HEX_DIRECTIONS = [
  { q: 1, r: -1, s: 0 },
  { q: 1, r: 0, s: -1 },
  { q: 0, r: 1, s: -1 },
  { q: -1, r: 1, s: 0 },
  { q: -1, r: 0, s: 1 },
  { q: 0, r: -1, s: 1 },
];

const HexMath = {
  // Cube coordinate neighbor
  neighbor(q, r, s, direction) {
    const d = HEX_DIRECTIONS[direction];
    return { q: q + d.q, r: r + d.r, s: s + d.s };
  },

  // Manhattan distance between two cube coords
  distance(a, b) {
    return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
  },

  // Unique string key for a cube coord
  key(q, r, s) {
    return `${q},${r},${s}`;
  },

  // Flat-top hex: pixel center from cube coords
  toPixel(q, r, size) {
    const x = size * (1.5 * q);
    const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return { x, y };
  },

  // Corner points for a flat-top hex
  corners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      pts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
    }
    return pts;
  },

  // Opposite direction index
  opposite(dir) {
    return (dir + 3) % 6;
  },

  // Flat-top hex: pixel coords → nearest cube coordinate (cube rounding)
  fromPixel(x, y, size) {
    const fq = (2 / 3 * x) / size;
    const fr = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / size;
    return HexMath._cubeRound(fq, fr, -fq - fr);
  },

  _cubeRound(fq, fr, fs) {
    let q = Math.round(fq), r = Math.round(fr), s = Math.round(fs);
    const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
    if (dq > dr && dq > ds)      q = -r - s;
    else if (dr > ds)            r = -q - s;
    else                         s = -q - r;
    return { q, r, s };
  },

  directions: HEX_DIRECTIONS,
};
