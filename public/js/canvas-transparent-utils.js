// --- ROTATION STATE & HELPERS ---
// Estado de rotación global para integración con background-removal.js
export const rotationState = {
    rotation: 0,
    processedCanvas: null,
    lastPreviewBlob: null,
};

/**
 * Resets the rotationState to its initial values.
 */
export function resetRotationState() {
    rotationState.rotation = 0;
    rotationState.processedCanvas = null;
    if (rotationState.lastPreviewBlob) {
        URL.revokeObjectURL(rotationState.lastPreviewBlob);
    }
    rotationState.lastPreviewBlob = null;
}
// Ensure rotationState is reset on every page load
resetRotationState();


/**
 * Load an image from a source URL and return the HTMLImageElement.
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Convert a canvas to a WebP Blob.
 * Rejects if the browser cannot encode the canvas as WebP.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [quality=1.0]
 * @returns {Promise<Blob>}
 */
export function canvasToWebPBlob(canvas, quality = 1.0) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to encode canvas as WebP Blob.'));
                return;
            }
            resolve(blob);
        }, 'image/webp', quality);
    });
}

/**
 * Set the hidden nobg input's files from a Blob.
 * @param {HTMLInputElement} nobgInput
 * @param {Blob} blob
 * @param {string} [filename='nobg.webp']
 */
export function setNobgInputFromBlob(nobgInput, blob, filename = 'nobg.webp') {
    const dt = new DataTransfer();
    dt.items.add(new File([blob], filename, { type: blob?.type || 'image/webp' }));
    nobgInput.files = dt.files;
}


/**
 * Returns the processedCanvas if it exists, otherwise creates it from the preview image and stores it.
 * @param {HTMLImageElement} previewImg
 * @returns {Promise<HTMLCanvasElement|null>}
 */
export async function getOrCreateProcessedCanvasFromPreview(previewImg) {
    if (rotationState.processedCanvas) return rotationState.processedCanvas;
    if (!previewImg || !previewImg.src) return null;
    const img = await loadImage(previewImg.src);
    const size = Math.max(img.width, img.height);
    const canvas = createCenteredSquareCanvas(img, size);
    rotationState.processedCanvas = canvas;
    return rotationState.processedCanvas;
}

/**
 * Rota y actualiza la vista previa y el input oculto.
 * @param {HTMLImageElement} previewImg
 * @param {HTMLInputElement} nobgInput
 */
export async function updateRotatedPreview(previewImg, nobgInput) {
    let baseCanvas = await getOrCreateProcessedCanvasFromPreview(previewImg);
    if (!baseCanvas) return;
    const { rotation } = rotationState;
    let rotatedCanvas = drawRotatedImageToCanvas(baseCanvas, rotation);
    let finalBlob = await canvasToWebPBlob(rotatedCanvas, 1.0);
    if (previewImg && finalBlob) {
        if (rotationState.lastPreviewBlob) URL.revokeObjectURL(rotationState.lastPreviewBlob);
        const previewUrl = URL.createObjectURL(finalBlob);
        previewImg.src = previewUrl;
        rotationState.lastPreviewBlob = previewUrl;
        previewImg.style.transform = `rotate(0deg)`;
    }
    setNobgInputFromBlob(nobgInput, finalBlob, 'nobg.webp');
}

/**
 * Inicializa el canvas procesado desde una imagen por defecto.
 * @param {HTMLImageElement} previewImg
 * @returns {Promise<void>}
 */
export async function initDefaultProcessedCanvas(previewImg) {
    await getOrCreateProcessedCanvasFromPreview(previewImg);
}
/**
 * Rota un canvas o imagen cuadrada los grados indicados (múltiplos de 90).
 * @param {HTMLCanvasElement|HTMLImageElement} img - Canvas o imagen a rotar.
 * @param {number} rotationDeg - Grados a rotar (0, 90, 180, 270).
 * @returns {HTMLCanvasElement} Canvas rotado.
 */
export function drawRotatedImageToCanvas(img, rotationDeg) {
    const size = Math.max(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    return canvas;
}
/**
 * Counts consecutive fully transparent pixels from an edge using a pixel index generator.
 * @param {(i:number)=>number} getIdx - Function to get the pixel index.
 * @param {number} max - Number of pixels to check.
 * @param {Uint8ClampedArray} imageData - The image data array.
 * @returns {number} Number of consecutive transparent pixels from the edge.
 */
function countFromEdge(getIdx, max, imageData) {
    let count = 0;
    for (let i = 0; i < max; i++) {
        const idx = getIdx(i);
        const alpha = imageData[idx];
        if (alpha === 0) count++;
        else break;
    }
    return count;
}

/**
 * Calculates the 10th percentile of an array of numbers.
 * @param {number[]} arr
 * @returns {number}
 */
function percentile10(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = 0.1 * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower));
}

/**
 * Creates a square canvas, centers the given image, and returns the canvas.
 * @param {HTMLImageElement} img - The image to pad and center.
 * @param {number} size - The target size for the square canvas.
 * @returns {HTMLCanvasElement}
 */
function createCenteredSquareCanvas(img, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const offsetX = Math.floor((size - img.width) / 2);
    const offsetY = Math.floor((size - img.height) / 2);
    ctx.drawImage(img, offsetX, offsetY, img.width, img.height);
    return canvas;
}
/**
 * Returns the 10th percentile of consecutive fully transparent pixels from each border (left, right, top, bottom)
 * towards the center for every row (left/right) and every column (top/bottom).
 * @param {HTMLCanvasElement} canvas - The canvas to analyze.
 * @returns {{left: number, right: number, top: number, bottom: number}} The p10 value for each border.
 */
export function countConsecutiveTransparentFromAllBorders(canvas) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    // Left: for each row, count from x=0 to right
    const leftCounts = [];
    for (let y = 0; y < height; y++) {
        leftCounts.push(countFromEdge((x) => (y * width + x) * 4 + 3, width, imageData));
    }
    // Right: for each row, count from x=width-1 to left
    const rightCounts = [];
    for (let y = 0; y < height; y++) {
        rightCounts.push(countFromEdge((x) => (y * width + (width - 1 - x)) * 4 + 3, width, imageData));
    }
    // Top: for each column, count from y=0 to bottom
    const topCounts = [];
    for (let x = 0; x < width; x++) {
        topCounts.push(countFromEdge((y) => (y * width + x) * 4 + 3, height, imageData));
    }
    // Bottom: for each column, count from y=height-1 to top
    const bottomCounts = [];
    for (let x = 0; x < width; x++) {
        bottomCounts.push(countFromEdge((y) => ((height - 1 - y) * width + x) * 4 + 3, height, imageData));
    }

    return {
        left: percentile10(leftCounts),
        right: percentile10(rightCounts),
        top: percentile10(topCounts),
        bottom: percentile10(bottomCounts),
    };
}

/**
 * Crops the given canvas by removing the specified number of pixels from each border.
 * @param {HTMLCanvasElement} canvas - The canvas to crop.
 * @param {{left: number, right: number, top: number, bottom: number}} crop - Pixels to remove from each border.
 * @returns {HTMLCanvasElement} The cropped canvas.
 */
export function cropCanvasByBorders(canvas, crop) {
    const { left, right, top, bottom } = crop;
    // Calcular centroide opaco antes de recortar
    const centroide = suggestOpaqueCenter(canvas);
    const width = canvas.width - left - right;
    const height = canvas.height - top - bottom;

    // Coordenadas del centroide relativo al recorte
    const centroideRecorte = {
        x: centroide.x - left,
        y: centroide.y - top
    };

    // Nuevo canvas cuadrado, centrando el centroide
    const size = Math.max(width, height);
    const centered = document.createElement('canvas');
    centered.width = size;
    centered.height = size;
    const ctx = centered.getContext('2d');
    // Offset para que el centroide quede en el centro del canvas
    const offsetX = Math.round(size / 2 - centroideRecorte.x);
    const offsetY = Math.round(size / 2 - centroideRecorte.y);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(
        canvas,
        left, top, width, height, // source rect
        offsetX, offsetY, width, height // destination rect
    );
    return centered;
}

/**
 * Sugerencia de centro de la imagen basado en la concentración de píxeles opacos.
 * Retorna el centroide (x, y) de los píxeles opacos (alpha > threshold).
 * @param {HTMLCanvasElement} canvas
 * @param {number} [alphaThreshold=16] - Umbral mínimo para considerar un píxel opaco (0-255).
 * @returns {{x: number, y: number}} Centroide de opacos, relativo al canvas.
 */
export function suggestOpaqueCenter(canvas, alphaThreshold = 16) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;
    let sumX = 0, sumY = 0, count = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4 + 3;
            const alpha = imageData[idx];
            if (alpha > alphaThreshold) {
                sumX += x;
                sumY += y;
                count++;
            }
        }
    }
    if (count === 0) {
        // Si no hay píxeles opacos, devolver el centro geométrico
        return { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    }
    return {
        x: Math.round(sumX / count),
        y: Math.round(sumY / count)
    };
}

/**
 * Creates a centered square canvas from the image, crops transparent padding,
 * and returns both the resulting WebP blob and cropped canvas.
 * @param {HTMLImageElement} img - The image to process.
 * @returns {Promise<{blob: Blob, canvas: HTMLCanvasElement}>}
 */
export async function createPaddedCanvasBlobAndCounts(img) {
    const largest = Math.max(img.width, img.height);
    const canvas = createCenteredSquareCanvas(img, largest);

    const transparentCounts = countConsecutiveTransparentFromAllBorders(canvas);

    const requestedCropPixels = Math.min(
        transparentCounts.left,
        transparentCounts.right,
        transparentCounts.top,
        transparentCounts.bottom
    ) / 2;
    const maxHorizontalCropPerSide = Math.floor((canvas.width - 1) / 2);
    const maxVerticalCropPerSide = Math.floor((canvas.height - 1) / 2);
    const maxCropPerSide = Math.max(0, Math.min(maxHorizontalCropPerSide, maxVerticalCropPerSide));
    const cropPixels = Math.max(0, Math.min(Math.floor(requestedCropPixels), maxCropPerSide));
    const croppedCanvas = cropPixels > 0
        ? cropCanvasByBorders(canvas, { left: cropPixels, right: cropPixels, top: cropPixels, bottom: cropPixels })
        : canvas;

    const blob = await canvasToWebPBlob(croppedCanvas, 1.0);
    return { blob, canvas: croppedCanvas };
}
/**
 * Creates a square canvas, centers the given image, and returns a WebP blob.
 * @param {HTMLImageElement} img - The image to pad and center.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @param {number} largest - The target size for the square canvas.
 * @returns {Promise<Blob>} The padded image as a WebP blob.
 */
export async function createPaddedCanvasBlob(img, width, height, largest) {
    const canvas = createCenteredSquareCanvas(img, largest);
    return canvasToWebPBlob(canvas, 1.0);
}
/**
 * Counts consecutive fully transparent pixels from each border (left, right, top, bottom) towards the center
 * along the central row and column of the canvas.
 * @param {HTMLCanvasElement} canvas - The canvas to analyze.
 * @returns {{left:number, right:number, top:number, bottom:number}} The count of transparent pixels from each border.
 */
export function countConsecutiveTransparentFromBorders(canvas) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    const cy = Math.floor(height / 2);
    const left = countFromEdge((x) => (cy * width + x) * 4 + 3, width, imageData);
    const right = countFromEdge((x) => (cy * width + (width - 1 - x)) * 4 + 3, width, imageData);
    const cx = Math.floor(width / 2);
    const top = countFromEdge((y) => (y * width + cx) * 4 + 3, height, imageData);
    const bottom = countFromEdge((y) => ((height - 1 - y) * width + cx) * 4 + 3, height, imageData);

    return { left, right, top, bottom };
}
