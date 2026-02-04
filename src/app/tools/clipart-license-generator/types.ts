/**
 * Shape of form data persisted to localStorage.
 * heroImageDataUrl may be omitted if too large (quota).
 */
export interface EtsyPdfFormStorage {
  shopName: string;
  showShopName: boolean;
  thankYouMessage: string;
  logoDataUrl: string | null;
  heroImageDataUrl: string | null;
  downloadUrl: string;
  productTitle: string;
  etsyShopUrl: string;
  websiteUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  canTerms: string;
  cannotTerms: string;
}

/**
 * Props passed to the EtsyDocument PDF component.
 * All values come from the form state.
 */
export interface EtsyDocumentProps {
  shopName: string;
  showShopName: boolean;
  thankYouMessage: string;
  logoDataUrl: string | null;
  heroImageDataUrl: string | null;
  downloadUrl: string;
  productTitle: string;
  etsyShopUrl: string;
  websiteUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  canTerms: string;
  cannotTerms: string;
}
