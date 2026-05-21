/**
 * SHA-256 hash of a File object
 * Returns lowercase hex string
 */
export async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Perceptual hash (dHash) of an image File
 * Resize to 9×8, grayscale, compare adjacent pixels → 64-bit hex string
 */
export function pHashFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const W = 9, H = 8;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);
        const { data } = ctx.getImageData(0, 0, W, H);

        // Convert to grayscale values
        const gray = [];
        for (let i = 0; i < W * H; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          gray.push(0.299 * r + 0.587 * g + 0.114 * b);
        }

        // dHash: compare each pixel to the one to its right (8 cols × 8 rows = 64 bits)
        let bits = '';
        for (let row = 0; row < H; row++) {
          for (let col = 0; col < W - 1; col++) {
            bits += gray[row * W + col] < gray[row * W + col + 1] ? '1' : '0';
          }
        }

        // Convert 64 bits to 16-char hex
        let hex = '';
        for (let i = 0; i < 64; i += 4) {
          hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
        }
        resolve(hex);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패'));
    };

    img.src = url;
  });
}

/**
 * Hamming distance between two hex hash strings
 */
export function hammingDistance(a, b) {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += xor.toString(2).split('1').length - 1;
  }
  return dist;
}

/**
 * Generate a random verification word (e.g. "K7-X2-PQ")
 */
export function generateVerificationWord() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(2)}-${part(2)}-${part(2)}`;
}
