// Mulberry32 PRNG — fast, seedable, good distribution
class Random {
  constructor(seed = 'default') {
    this.seed = this._hashSeed(seed);
    this._state = this.seed;
  }

  // FNV-1a string hash to uint32
  _hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h || 1;
  }

  // Next float [0, 1)
  next() {
    this._state |= 0;
    this._state = (this._state + 0x6D2B79F5) | 0;
    let z = Math.imul(this._state ^ (this._state >>> 15), 1 | this._state);
    z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  // Integer in [min, max]
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Shuffle array in-place
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Reset to initial seed state
  reset() {
    this._state = this.seed;
  }
}
