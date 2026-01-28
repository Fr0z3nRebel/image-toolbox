/**
 * Curated list of free-for-commercial-use Google Fonts (OFL, Apache 2.0, etc.)
 * for bundle-builder center title/subtitle.
 */
export const CENTER_TEXT_FONTS: { id: string; label: string }[] = [
  { id: "Open Sans", label: "Open Sans" },
  { id: "Roboto", label: "Roboto" },
  { id: "Lato", label: "Lato" },
  { id: "Montserrat", label: "Montserrat" },
  { id: "Poppins", label: "Poppins" },
  { id: "Inter", label: "Inter" },
  { id: "Nunito", label: "Nunito" },
  { id: "Work Sans", label: "Work Sans" },
  { id: "DM Sans", label: "DM Sans" },
  { id: "Pacifico", label: "Pacifico" },
  { id: "Caveat", label: "Caveat" },
  { id: "Playfair Display", label: "Playfair Display" }
];

const loadedFamilies = new Set<string>();

function fontIdToQuery(family: string): string {
  return family.replace(/ /g, "+");
}

/**
 * Load a Google Font by family name. Injects a link tag if not already loaded.
 * Safe to call multiple times for the same family.
 */
export function loadFont(family: string): Promise<void> {
  if (loadedFamilies.has(family)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontIdToQuery(family)}:wght@400;600;700&display=swap`;
    link.onload = () => {
      loadedFamilies.add(family);
      resolve();
    };
    link.onerror = () => reject(new Error(`Failed to load font: ${family}`));
    document.head.appendChild(link);
  });
}

/**
 * Preload multiple font families. Resolves when all are loaded or failed.
 */
export function loadFonts(families: string[]): Promise<void[]> {
  return Promise.all(families.map((f) => loadFont(f).catch(() => {})));
}
