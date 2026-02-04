import type { EtsyPdfFormStorage } from "./types";

/**
 * Convert a File to a data URL (base64) for use in react-pdf Image src.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Resize and compress an image data URL for smaller PDF embedding.
 * Uses canvas to scale down and re-encode as JPEG. Keeps aspect ratio; longest side = maxSize.
 * Quality 0–1 (e.g. 0.82). Returns new data URL.
 */
export function compressImageDataUrl(
  dataUrl: string,
  maxSize: number,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = Math.min(1, maxSize / Math.max(w, h));
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(dataUrl);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(dataUrl);
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Trigger a file download in the browser from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CLIPART_LICENSE_STORAGE_KEY = "clipart-license-generator-form";

/** Max size for hero image data URL in storage (~2MB) to avoid quota errors. */
const MAX_HERO_DATA_URL_LENGTH = 2 * 1024 * 1024;

/**
 * Load persisted form data from localStorage.
 * Returns null if missing, invalid, or not in browser.
 */
export function loadEtsyPdfFormFromStorage(): EtsyPdfFormStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLIPART_LICENSE_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as EtsyPdfFormStorage;
    if (!data || typeof data !== "object") return null;
    return {
      shopName: typeof data.shopName === "string" ? data.shopName : "",
      showShopName:
        typeof data.showShopName === "boolean" ? data.showShopName : true,
      thankYouMessage:
        typeof data.thankYouMessage === "string"
          ? data.thankYouMessage
          : "Thank You for Your Order!",
      logoDataUrl:
        data.logoDataUrl && typeof data.logoDataUrl === "string"
          ? data.logoDataUrl
          : null,
      heroImageDataUrl:
        data.heroImageDataUrl && typeof data.heroImageDataUrl === "string"
          ? data.heroImageDataUrl
          : null,
      downloadUrl: typeof data.downloadUrl === "string" ? data.downloadUrl : "",
      productTitle: typeof data.productTitle === "string" ? data.productTitle : "",
      etsyShopUrl: typeof data.etsyShopUrl === "string" ? data.etsyShopUrl : "",
      websiteUrl: typeof data.websiteUrl === "string" ? data.websiteUrl : "",
      facebookUrl: typeof data.facebookUrl === "string" ? data.facebookUrl : "",
      youtubeUrl: typeof data.youtubeUrl === "string" ? data.youtubeUrl : "",
      canTerms: typeof data.canTerms === "string" ? data.canTerms : "",
      cannotTerms:
        typeof data.cannotTerms === "string" ? data.cannotTerms : "",
    };
  } catch {
    return null;
  }
}

/**
 * Save form data to localStorage.
 * Skips hero image if it would exceed size limit.
 */
export function saveEtsyPdfFormToStorage(data: EtsyPdfFormStorage): void {
  if (typeof window === "undefined") return;
  try {
    const toStore = { ...data };
    if (
      toStore.heroImageDataUrl &&
      toStore.heroImageDataUrl.length > MAX_HERO_DATA_URL_LENGTH
    ) {
      toStore.heroImageDataUrl = null;
    }
    if (
      toStore.logoDataUrl &&
      toStore.logoDataUrl.length > MAX_HERO_DATA_URL_LENGTH
    ) {
      toStore.logoDataUrl = null;
    }
    window.localStorage.setItem(CLIPART_LICENSE_STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // QuotaExceededError or other
  }
}
