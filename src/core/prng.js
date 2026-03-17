/**
 * Creates a seeded pseudo-random number generator
 * Uses mulberry32 algorithm - fast, good distribution, deterministic
 * @param {number} seed - Initial seed value
 * @returns {Function} - Function that returns random number 0-1
 */
export function createRNG(seed) {
  // Ensure seed is a 32-bit integer
  let state = seed | 0;
  
  return function() {
    // Mulberry32 algorithm
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create RNG with current timestamp as seed (non-deterministic)
 */
export function createRandomRNG() {
  return createRNG(Date.now() ^ (Math.random() * 0x7FFFFFFF));
}
