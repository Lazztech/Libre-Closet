/**
 * Client-side background removal for garment photo uploads.
 *
 * Runs @imgly/background-removal in a Web Worker (ONNX + WASM) before the
 * form submits, injecting the processed webp into a hidden nobgPhoto field.
 * On any failure the form submits unchanged — the server-side fallback path
 * handles generation lazily on first /file/nobg/ request.
 *
 * Models are served from /bg-removal-models/ (@imgly/background-removal-data
 * installed from the IMG.LY CDN tarball — no runtime CDN required).
 */

let activeProgressHandler = null;

const config = {
  publicPath: location.origin + '/bg-removal-models/',
  debug: true,
  // @imgly/background-removal handles graceful degradation to WASM if navigator.gpu WebGPU is unavailable
  // when set to 'gpu'.
  device: 'gpu',
  proxyToWorker: true,
  // Note when webgpu is used the 'isnet_quint8' 8bit floating point model gets converted at
  // runtime to fp16. Some overhead is incurred in this conversion step.
  model: 'isnet_quint8',
  // Can output to a given format. Notably though webp incurs
  // a compute burden on the client to convert in `imageEncode`.
  // Leave to the default 'image/png' to bypass this.
  // output: { format: 'image/webp', quality: 0.9 },
  // Stable callback required because init() is memoized by config shape.
  progress: (key, current, total) => {
    activeProgressHandler?.(key, current, total);
  },
};

const updateStatusText = (bgStatus, bgStatusText, key) => {
  if (!bgStatus || !bgStatusText) return;

  if (key.startsWith('fetch:') && bgStatus.dataset.textDownloading) {
    bgStatusText.textContent = bgStatus.dataset.textDownloading;
    return;
  }
  if (key === 'compute:decode' && bgStatus.dataset.textDecoding) {
    bgStatusText.textContent = bgStatus.dataset.textDecoding;
    return;
  }
  if (key === 'compute:inference' && bgStatus.dataset.textInference) {
    bgStatusText.textContent = bgStatus.dataset.textInference;
    return;
  }
  if (key === 'compute:mask' && bgStatus.dataset.textMask) {
    bgStatusText.textContent = bgStatus.dataset.textMask;
    return;
  }
  if (key === 'compute:encode' && bgStatus.dataset.textEncoding) {
    bgStatusText.textContent = bgStatus.dataset.textEncoding;
  }
};


import { createPaddedCanvasBlobAndCounts, drawRotatedImageToCanvas, rotationState, updateRotatedPreview } from './canvas-transparent-utils.js';


let mod = await import('/modules/background-removal/index.mjs');
let removeBackground = mod.removeBackground;

export const initBackgroundRemoval = async () => {
  try {
    mod.preload(config).then(() => {
      console.log('Asset preloading succeeded');
    });
  } catch (err) {
    // Package failed to load (old browser, no ES module support, etc.)
    // Leave the form as-is; server fallback will handle it.
    console.warn('[bg-removal] Failed to load background-removal module:', err);
    return;
  }
};

export const wireUpPhotoInput = async () => {
  const photoLoadingOverlay = document.getElementById('photoLoadingOverlay');

  // Helper to show/hide loading overlay
  function setPhotoLoadingOverlay(visible) {
    if (photoLoadingOverlay) photoLoadingOverlay.style.display = visible ? 'flex' : 'none';
  }
  // Helper to enable/disable controls
  function setControlsEnabled(enabled) {
    if (rotateBtn) rotateBtn.disabled = !enabled;
    if (photoInput) photoInput.disabled = !enabled;
    if (submitBtn) submitBtn.disabled = !enabled;
    setPhotoLoadingOverlay(!enabled);
  }
  const photoInput = document.getElementById('photoInput');
  const nobgInput = document.getElementById('nobgPhotoInput');
  const submitBtn = document.getElementById('photoBtn');
  const bgStatus = document.getElementById('bgStatus');
  const bgStatusText = document.getElementById('bgStatusText');
  const bgStatusHint = document.getElementById('bgStatusHint');
  const smartAdjustSwitch = document.getElementById('smartAdjustSwitch');
  const rotateBtn = document.getElementById('rotateBtn');
  const previewImg = document.getElementById('garmentPhotoPreview');

  // Persist and restore smartAdjustSwitch state using localStorage
  if (smartAdjustSwitch) {
    const saved = localStorage.getItem('smartAdjustEnabled');
    smartAdjustSwitch.checked = saved === 'true';
    smartAdjustSwitch.addEventListener('change', () => {
      localStorage.setItem('smartAdjustEnabled', smartAdjustSwitch.checked ? 'true' : 'false');
    });
  }

  // Manejar rotación por botón
  if (rotateBtn && previewImg) {
    rotateBtn.addEventListener('click', async () => {
      if (rotateBtn.disabled) return;
      setControlsEnabled(false);
      rotationState.rotation = (rotationState.rotation + 90) % 360;
      await updateRotatedPreview(previewImg, nobgInput);

      // If user rotates without selecting a new file, backend still expects `photo`.
      if (!photoInput.files?.length && nobgInput.files?.[0]) {
        const rotatedFile = nobgInput.files[0];
        const dt = new DataTransfer();
        dt.items.add(new File([rotatedFile], rotatedFile.name || 'photo.webp', { type: rotatedFile.type || 'image/webp' }));
        photoInput.files = dt.files;
      }

      setControlsEnabled(true);
    });
  }

  if (!photoInput || !nobgInput) return;

  photoInput.addEventListener('change', async function () {
    // Re-enable submit for the "no file" case; it will be gated by html required
    nobgInput.value = '';
    rotationState.rotation = 0;
    if (previewImg) previewImg.style.transform = 'rotate(0deg)';
    if (rotationState.lastPreviewBlob) { URL.revokeObjectURL(rotationState.lastPreviewBlob); rotationState.lastPreviewBlob = null; }
    rotationState.processedCanvas = null;

    setControlsEnabled(false);

    const file = photoInput.files?.[0];
    if (!file) {
      setControlsEnabled(true);
      return;
    }

    if (bgStatus) bgStatus.classList.remove('hidden');

    if (bgStatusText && bgStatus?.dataset.textDefault) {
      bgStatusText.textContent = bgStatus.dataset.textDefault;
    }
    if (bgStatusHint && bgStatus?.dataset.textHintTypical) {
      bgStatusHint.textContent = bgStatus.dataset.textHintTypical;
    }

    const stillWorkingTimer = setTimeout(() => {
      if (bgStatusHint && bgStatus?.dataset.textHintSlow) {
        bgStatusHint.textContent = bgStatus.dataset.textHintSlow;
      }
    }, 5000);

    // Fallback timeline when progress events are sparse.
    const fallbackStages = [
      { delayMs: 700, textKey: 'textDownloading' },
      { delayMs: 1800, textKey: 'textDecoding' },
      { delayMs: 3200, textKey: 'textInference' },
      { delayMs: 5600, textKey: 'textMask' },
      { delayMs: 7600, textKey: 'textEncoding' },
    ];
    let latestProgressEventAt = Date.now();
    const fallbackTimers = fallbackStages.map(({ delayMs, textKey }) =>
      setTimeout(() => {
        if (Date.now() - latestProgressEventAt < 1500) return;
        const stageText = bgStatus?.dataset[textKey];
        if (stageText && bgStatusText) bgStatusText.textContent = stageText;
      }, delayMs),
    );

    activeProgressHandler = (key) => {
      latestProgressEventAt = Date.now();
      updateStatusText(bgStatus, bgStatusText, key);
    };

    try {
      console.log(config);
      const blob = await removeBackground(file, config);

      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'nobg.webp', { type: 'image/webp' }));
      nobgInput.files = dt.files;

      const nobgImg = await new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(blob);
        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(image);
        };
        image.onerror = (event) => {
          URL.revokeObjectURL(objectUrl);
          reject(event);
        };
        image.src = objectUrl;
      });

      if (smartAdjustSwitch && smartAdjustSwitch.checked) {
        // Smart adjust and save the resulting canvas
        const result = await createPaddedCanvasBlobAndCounts(nobgImg);
        rotationState.processedCanvas = result.canvas;
      } else {
        // Save the canvas from background removal
        rotationState.processedCanvas = drawRotatedImageToCanvas(nobgImg, 0);
      }

      await updateRotatedPreview(previewImg, nobgInput);
    } catch (err) {
      // Processing failed — clear any partial result and let server fallback run
      console.warn('[bg-removal] Processing failed, using server fallback:', err);
      nobgInput.value = '';
    } finally {
      clearTimeout(stillWorkingTimer);
      fallbackTimers.forEach(clearTimeout);
      activeProgressHandler = null;
      if (bgStatus) bgStatus.classList.add('hidden');
      setControlsEnabled(true);
    }
  });

  console.log('wired up photo input for background removal');
};

export default {
  initBackgroundRemoval,
  wireUpPhotoInput,
};

// Preload clientside background removal models
(() => initBackgroundRemoval())();
