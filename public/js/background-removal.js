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
(async function () {
  const photoInput = document.getElementById('photoInput');
  const nobgInput = document.getElementById('nobgPhotoInput');
  const submitBtn = document.getElementById('photoBtn');
  const bgStatus = document.getElementById('bgStatus');

  if (!photoInput || !nobgInput) return;

  let removeBackground;
  try {
    const mod = await import('/modules/background-removal/index.mjs');
    removeBackground = mod.removeBackground;
  } catch (err) {
    // Package failed to load (old browser, no ES module support, etc.)
    // Leave the form as-is; server fallback will handle it.
    console.warn('[bg-removal] Failed to load background-removal module:', err);
    return;
  }

  photoInput.addEventListener('change', async function () {
    // Re-enable submit for the "no file" case; it will be gated by html required
    nobgInput.value = '';

    const file = photoInput.files?.[0];
    if (!file) return;

    if (submitBtn) submitBtn.disabled = true;
    if (bgStatus) bgStatus.classList.remove('hidden');

    try {
      const useGpu = !!navigator.gpu;
      console.log(
        `[bg-removal] Using ${useGpu ? 'WebGPU (isnet_fp16)' : 'WASM (isnet_quint8)'}`,
      );
      const blob = await removeBackground(file, {
        publicPath: location.origin + '/bg-removal-models/',
        device: useGpu ? 'gpu' : 'cpu',
        model: useGpu ? 'isnet_fp16' : 'isnet_quint8',
        output: { format: 'image/webp', quality: 0.9 },
      });

      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'nobg.webp', { type: 'image/webp' }));
      nobgInput.files = dt.files;
    } catch (err) {
      // Processing failed — clear any partial result and let server fallback run
      console.warn(
        '[bg-removal] Processing failed, using server fallback:',
        err,
      );
      nobgInput.value = '';
    } finally {
      if (bgStatus) bgStatus.classList.add('hidden');
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
