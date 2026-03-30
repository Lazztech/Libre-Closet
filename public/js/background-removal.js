/**
 * Client-side background removal for garment photo uploads.
 *
 * Runs @imgly/background-removal in a Web Worker (ONNX + WASM) before the
 * form submits, injecting the processed webp into a hidden nobgPhoto field.
 * On any failure the form submits unchanged — the server-side fallback path
 * handles generation lazily on first /file/nobg/ request.
 *
 * Models are served from /bg-removal-models/ (the already-installed
 * @imgly/background-removal-node dist directory — no CDN required).
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
      const blob = await removeBackground(file, {
        // publicPath must be an absolute URL — new URL(asset, base) requires an
        // absolute base, so prepend the current origin.
        publicPath: window.location.origin + '/bg-removal-models/',
        model: 'small',
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
