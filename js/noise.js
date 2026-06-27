'use strict';

const SimplexNoise = (() => {
  const BASE_PERM = new Uint8Array([151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]);

  const GRAD3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);

  class Simplex {
    constructor(seed) {
      this.perm = new Uint8Array(512);
      this.setSeed(seed !== undefined ? seed : (Math.random() * 65536) | 0);
    }

    setSeed(seed) {
      seed = Math.floor(seed) & 0xFFFF;
      for (let i = 0; i < 256; i++) {
        const v = BASE_PERM[(i + seed) & 255];
        this.perm[i] = this.perm[i + 256] = v;
      }
    }

    // 2D Perlin noise [-1, 1]
    noise2(x, y) {
      const p = this.perm;
      const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const u = fade(xf), v = fade(yf);
      const dot = (g, dx, dy) => g[0] * dx + g[1] * dy;
      const g = (ix, iy) => GRAD3[p[p[ix & 255] + (iy & 255)] % 12];
      return lerp(
        lerp(dot(g(xi, yi), xf, yf), dot(g(xi+1, yi), xf-1, yf), u),
        lerp(dot(g(xi, yi+1), xf, yf-1), dot(g(xi+1, yi+1), xf-1, yf-1), u),
        v
      );
    }

    // 3D Perlin noise [-1, 1]
    noise3(x, y, z) {
      const p = this.perm;
      const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, zi = Math.floor(z) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y), zf = z - Math.floor(z);
      const u = fade(xf), v = fade(yf), w = fade(zf);
      const dot = (g, dx, dy, dz) => g[0]*dx + g[1]*dy + g[2]*dz;
      const g = (ix, iy, iz) => GRAD3[p[p[p[ix & 255] + (iy & 255)] + (iz & 255)] % 12];
      return lerp(
        lerp(
          lerp(dot(g(xi,yi,zi), xf,yf,zf), dot(g(xi+1,yi,zi), xf-1,yf,zf), u),
          lerp(dot(g(xi,yi+1,zi), xf,yf-1,zf), dot(g(xi+1,yi+1,zi), xf-1,yf-1,zf), u), v),
        lerp(
          lerp(dot(g(xi,yi,zi+1), xf,yf,zf-1), dot(g(xi+1,yi,zi+1), xf-1,yf,zf-1), u),
          lerp(dot(g(xi,yi+1,zi+1), xf,yf-1,zf-1), dot(g(xi+1,yi+1,zi+1), xf-1,yf-1,zf-1), u), v),
        w
      );
    }

    // Fractal Brownian Motion - layered octaves of noise
    fbm2(x, y, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
      let val = 0, amp = 1, freq = 1, max = 0;
      for (let i = 0; i < octaves; i++) {
        val += this.noise2(x * freq, y * freq) * amp;
        max += amp; amp *= persistence; freq *= lacunarity;
      }
      return val / max;
    }

    fbm3(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
      let val = 0, amp = 1, freq = 1, max = 0;
      for (let i = 0; i < octaves; i++) {
        val += this.noise3(x * freq, y * freq, z * freq) * amp;
        max += amp; amp *= persistence; freq *= lacunarity;
      }
      return val / max;
    }
  }

  return Simplex;
})();
