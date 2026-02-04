/**
 * Color utility functions for bundle builder
 */

export interface ColorSuggestion {
  color: string;
  label: string;
}

/**
 * Parse a hex color string, supporting both 3-digit and 6-digit formats
 */
export function parseHex(s: string): string | null {
  const t = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(t)) return "#" + t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
  if (/^[0-9a-fA-F]{6}$/.test(t)) return "#" + t.toLowerCase();
  return null;
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s, l];
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Analyze colors from preview images and suggest harmonious colors
 */
export function analyzePreviewColors(previewContainer: HTMLElement): ColorSuggestion[] | null {
  try {
    // Sample colors from images in the preview
    const images = previewContainer.querySelectorAll("img");
    if (images.length === 0) return null;

    // Sample colors from multiple images to get a representative palette
    const sampleSize = Math.min(images.length, 5);
    const colorSamples: Array<{ r: number; g: number; b: number; weight: number }> = [];

    for (let i = 0; i < sampleSize; i++) {
      const img = images[i] as HTMLImageElement;
      try {
        // Check if image is loaded
        if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
          continue;
        }

        const tempCanvas = document.createElement("canvas");
        const maxSize = 200;
        const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
        tempCanvas.width = Math.round(img.naturalWidth * scale);
        tempCanvas.height = Math.round(img.naturalHeight * scale);
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) continue;

        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Sample from center area (where the shape would be)
        const centerX = Math.floor(tempCanvas.width * 0.25);
        const centerY = Math.floor(tempCanvas.height * 0.25);
        const sampleWidth = Math.floor(tempCanvas.width * 0.5);
        const sampleHeight = Math.floor(tempCanvas.height * 0.5);
        
        const imageData = tempCtx.getImageData(centerX, centerY, sampleWidth, sampleHeight);
        const data = imageData.data;

        // Sample pixels
        for (let j = 0; j < data.length; j += 32) {
          const r = data[j];
          const g = data[j + 1];
          const b = data[j + 2];
          const a = data[j + 3];
          // Only consider non-transparent and non-white/black pixels
          if (a > 128 && !(r > 250 && g > 250 && b > 250) && !(r < 5 && g < 5 && b < 5)) {
            // Calculate saturation and brightness for weighting
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            // Prefer colors that are moderately saturated and not too dark/bright
            // This helps us find the actual color palette, not just grays
            const weight = saturation * (brightness > 50 && brightness < 200 ? 1.2 : 0.8);
            
            colorSamples.push({ r, g, b, weight });
          }
        }
      } catch {
        continue;
      }
    }

    if (colorSamples.length === 0) return null;

    // Find dominant hue by grouping similar hues
    const hueBuckets: Array<{ hue: number; weight: number; count: number }> = [];
    
    for (const sample of colorSamples) {
      const [h, s] = rgbToHsl(sample.r, sample.g, sample.b);
      // Only consider colors with some saturation
      if (s < 0.1) continue;
      
      // Find or create bucket for this hue (group similar hues together)
      let found = false;
      for (const bucket of hueBuckets) {
        // Group hues within 30 degrees
        const hueDiff = Math.abs(h - bucket.hue);
        const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
        if (normalizedDiff < 30) {
          bucket.hue = (bucket.hue * bucket.count + h) / (bucket.count + 1);
          bucket.weight += sample.weight;
          bucket.count++;
          found = true;
          break;
        }
      }
      
      if (!found) {
        hueBuckets.push({ hue: h, weight: sample.weight, count: 1 });
      }
    }

    if (hueBuckets.length === 0) return null;

    // Find the dominant hue (highest weighted)
    hueBuckets.sort((a, b) => b.weight - a.weight);
    const dominantHue = hueBuckets[0].hue;

    // Calculate average saturation and lightness from samples
    let totalS = 0;
    let totalL = 0;
    let totalWeight = 0;
    
    for (const sample of colorSamples) {
      const [h, s, l] = rgbToHsl(sample.r, sample.g, sample.b);
      if (s > 0.1) { // Only consider saturated colors
        const hueDiff = Math.abs(h - dominantHue);
        const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
        if (normalizedDiff < 60) { // Within 60 degrees of dominant hue
          totalS += s * sample.weight;
          totalL += l * sample.weight;
          totalWeight += sample.weight;
        }
      }
    }

    if (totalWeight === 0) return null;

    const avgS = totalS / totalWeight;
    const avgL = totalL / totalWeight;

    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    const suggestions: ColorSuggestion[] = [];

    // Method 1: Analogous color harmony (shift hue by 45 degrees)
    const analogousHue = (dominantHue + 45) % 360;
    const analogousS = Math.min(0.4, avgS);
    const analogousL = Math.max(0.85, Math.min(0.95, avgL));
    const [ar, ag, ab] = hslToRgb(analogousHue, analogousS, analogousL);
    suggestions.push({
      color: `#${toHex(ar)}${toHex(ag)}${toHex(ab)}`,
      label: "Harmonious"
    });

    // Method 2: Triadic color harmony (shift hue by 120 degrees)
    const triadicHue = (dominantHue + 120) % 360;
    const triadicS = Math.min(0.35, avgS * 0.8);
    const triadicL = Math.max(0.88, Math.min(0.95, avgL));
    const [tr, tg, tb] = hslToRgb(triadicHue, triadicS, triadicL);
    suggestions.push({
      color: `#${toHex(tr)}${toHex(tg)}${toHex(tb)}`,
      label: "Vibrant"
    });

    // Method 3: Light tint of dominant color (same hue, lighter and less saturated)
    const tintS = Math.min(0.3, avgS * 0.6);
    const tintL = Math.max(0.9, Math.min(0.96, avgL + 0.1));
    const [tintr, tintg, tintb] = hslToRgb(dominantHue, tintS, tintL);
    suggestions.push({
      color: `#${toHex(tintr)}${toHex(tintg)}${toHex(tintb)}`,
      label: "Soft"
    });

    return suggestions;
  } catch {
    return null;
  }
}
