/**
 * Opens the mask editor dialog for manual background cleanup.
 * @param {File} originalFile - The original (un-processed) image file.
 * @param {Blob} nobgBlob - The background-removed blob from @imgly/background-removal.
 * @returns {Promise<Blob>} Resolves with the final (possibly edited) blob.
 */

export function openMaskEditor(originalFile, nobgBlob) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('maskEditorDialog');
    const canvas = document.getElementById('maskEditorCanvas');
    const ctx = canvas.getContext('2d');

    // Off-screen canvas holding the original image pixels for the restore brush.
    const originalCanvas = new OffscreenCanvas(1, 1);
    const origCtx = originalCanvas.getContext('2d');

    let brushMode = 'erase'; // 'erase' | 'restore'
    let brushRadius = 20;
    let painting = false;

    // --- Load both images ---
    const nobgUrl = URL.createObjectURL(nobgBlob);
    const origUrl = URL.createObjectURL(originalFile);

    const nobgImg = new Image();
    const origImg = new Image();

    let nobgReady = false;
    let origReady = false;

    const onBothReady = () => {
      if (!nobgReady || !origReady) return;

      canvas.width = nobgImg.naturalWidth;
      canvas.height = nobgImg.naturalHeight;
      originalCanvas.width = nobgImg.naturalWidth;
      originalCanvas.height = nobgImg.naturalHeight;

      // Draw original into off-screen canvas (for restore sampling).
      origCtx.drawImage(origImg, 0, 0, originalCanvas.width, originalCanvas.height);

      // Draw no-bg result onto the visible canvas.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(nobgImg, 0, 0);

      URL.revokeObjectURL(nobgUrl);
      URL.revokeObjectURL(origUrl);
    };

    nobgImg.onload = () => { nobgReady = true; onBothReady(); };
    origImg.onload = () => { origReady = true; onBothReady(); };
    nobgImg.src = nobgUrl;
    origImg.src = origUrl;

    // --- Brush helpers ---

    /** Convert a MouseEvent or Touch to canvas-space coordinates. */
    const toCanvasPos = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
        r: brushRadius * scaleX,
      };
    };

    const paint = (clientX, clientY) => {
      const { x, y, r } = toCanvasPos(clientX, clientY);

      if (brushMode === 'erase') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Restore: copy a circular region from the original off-screen canvas.
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(originalCanvas, 0, 0);
        ctx.restore();
      }
    };

    // --- Mouse events ---
    const onMouseDown = (e) => { painting = true; paint(e.clientX, e.clientY); };
    const onMouseMove = (e) => { if (painting) paint(e.clientX, e.clientY); };
    const onMouseUp = () => { painting = false; };

    // --- Touch events ---
    const onTouchStart = (e) => {
      e.preventDefault();
      painting = true;
      paint(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (painting) paint(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => { painting = false; };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    // --- Brush mode toggle ---
    const eraseBtn = document.getElementById('maskBrushErase');
    const restoreBtn = document.getElementById('maskBrushRestore');
    const sizeInput = document.getElementById('maskBrushSize');

    const onEraseClick = () => {
      brushMode = 'erase';
      eraseBtn.classList.add('btn-active');
      restoreBtn.classList.remove('btn-active');
    };
    const onRestoreClick = () => {
      brushMode = 'restore';
      restoreBtn.classList.add('btn-active');
      eraseBtn.classList.remove('btn-active');
    };
    const onSizeChange = () => {
      brushRadius = Number(sizeInput.value);
    };

    eraseBtn.addEventListener('click', onEraseClick);
    restoreBtn.addEventListener('click', onRestoreClick);
    sizeInput.addEventListener('input', onSizeChange);

    // Set initial UI state.
    brushRadius = Number(sizeInput.value);
    eraseBtn.classList.add('btn-active');
    restoreBtn.classList.remove('btn-active');

    // --- Accept / Skip ---
    const acceptBtn = document.getElementById('maskEditorAccept');
    const skipBtn = document.getElementById('maskEditorSkip');

    const cleanup = () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      eraseBtn.removeEventListener('click', onEraseClick);
      restoreBtn.removeEventListener('click', onRestoreClick);
      sizeInput.removeEventListener('input', onSizeChange);
      acceptBtn.removeEventListener('click', onAccept);
      skipBtn.removeEventListener('click', onSkip);
      dialog.close();
    };

    const onAccept = () => {
      cleanup();
      canvas.toBlob((blob) => resolve(blob ?? nobgBlob), 'image/webp', 0.92);
    };

    const onSkip = () => {
      cleanup();
      resolve(nobgBlob);
    };

    acceptBtn.addEventListener('click', onAccept);
    skipBtn.addEventListener('click', onSkip);

    dialog.showModal();
  });
}
