/**
 * Image Quality Checker
 * Detects blurry and overexposed (flash) images before upload.
 * Auto-attaches to all file inputs that accept images.
 */
(function () {
  const BLUR_THRESHOLD = 100;
  const OVEREXPOSE_BRIGHTNESS = 240;
  const OVEREXPOSE_PERCENT = 0.30;
  const MAX_ANALYZE_SIZE = 512;

  function analyzeImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const issues = [];
        const scale = Math.min(1, MAX_ANALYZE_SIZE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        URL.revokeObjectURL(url);

        // Convert to grayscale
        const gray = new Float32Array(w * h);
        let brightCount = 0;
        for (let i = 0; i < w * h; i++) {
          const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
          gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
          if (gray[i] > OVEREXPOSE_BRIGHTNESS) brightCount++;
        }

        // Overall overexposure check
        if (brightCount / (w * h) > OVEREXPOSE_PERCENT) {
          issues.push('overexposed');
        }

        // Local glare detection — check grid cells for concentrated bright spots
        const GRID = 10;
        const cellW = Math.floor(w / GRID);
        const cellH = Math.floor(h / GRID);
        const GLARE_CELL_THRESHOLD = 0.40; // 40% of cell pixels bright
        const GLARE_BRIGHTNESS = 230;
        let hasGlare = false;
        for (let gy = 0; gy < GRID && !hasGlare; gy++) {
          for (let gx = 0; gx < GRID && !hasGlare; gx++) {
            let cellBright = 0, cellTotal = 0;
            for (let y = gy * cellH; y < (gy + 1) * cellH; y++) {
              for (let x = gx * cellW; x < (gx + 1) * cellW; x++) {
                cellTotal++;
                if (gray[y * w + x] > GLARE_BRIGHTNESS) cellBright++;
              }
            }
            if (cellTotal > 0 && (cellBright / cellTotal) > GLARE_CELL_THRESHOLD) {
              hasGlare = true;
            }
          }
        }
        if (hasGlare && !issues.includes('overexposed')) {
          issues.push('glare');
        }

        // Laplacian variance (blur detection)
        let sum = 0, sumSq = 0, count = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const lap = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w];
            sum += lap;
            sumSq += lap * lap;
            count++;
          }
        }
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        if (variance < BLUR_THRESHOLD) {
          issues.push('blurry');
        }

        resolve(issues);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve([]);
      };
      img.src = url;
    });
  }

  function createWarning(input, issues) {
    // Remove existing warning
    removeWarning(input);

    const msgs = [];
    if (issues.includes('blurry')) msgs.push('kabur (blurry)');
    if (issues.includes('overexposed')) msgs.push('terlalu terang (overexposed/flash)');
    if (issues.includes('glare')) msgs.push('ada pantulan cahaya (glare/flash)');

    const wrap = document.createElement('div');
    wrap.className = 'iq-warning mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800';
    wrap.dataset.iqWarning = '1';

    wrap.innerHTML = `
      <p class="text-xs text-amber-700 dark:text-amber-300 mb-2">
        ⚠️ Gambar ini mungkin <strong>${msgs.join(' dan ')}</strong>. Sila pastikan gambar jelas.
      </p>
      <div class="flex gap-2">
        <button type="button" class="iq-change px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors">Tukar Gambar</button>
        <button type="button" class="iq-keep px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors">Teruskan</button>
      </div>
    `;

    input.parentElement.appendChild(wrap);

    wrap.querySelector('.iq-change').addEventListener('click', () => {
      input.value = '';
      removeWarning(input);
    });

    wrap.querySelector('.iq-keep').addEventListener('click', () => {
      removeWarning(input);
    });
  }

  function removeWarning(input) {
    const existing = input.parentElement.querySelector('[data-iq-warning]');
    if (existing) existing.remove();
  }

  function init() {
    const inputs = document.querySelectorAll('input[type="file"][accept*="jpg"], input[type="file"][accept*="png"], input[type="file"][accept*="jpeg"]');
    inputs.forEach((input) => {
      input.addEventListener('change', async (e) => {
        removeWarning(input);
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const issues = await analyzeImage(file);
        if (issues.length > 0) {
          createWarning(input, issues);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
