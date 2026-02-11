"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import dynamic from "next/dynamic";
import { Store, Globe, Facebook, Youtube } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import {
  DEFAULT_THANK_YOU_MESSAGE,
  DEFAULT_CAN_TERMS,
  DEFAULT_CANNOT_TERMS,
} from "./constants";
import type { EtsyDocumentProps } from "./types";
import {
  fileToDataUrl,
  downloadBlob,
  loadEtsyPdfFormFromStorage,
  saveEtsyPdfFormToStorage,
  compressImageDataUrl,
} from "./functions";

const EtsyPdfViewerClientDynamic = dynamic(
  () => import("./EtsyPdfViewerClient"),
  { ssr: false }
);

const PdfPreview = memo(function PdfPreview(props: EtsyDocumentProps) {
  return <EtsyPdfViewerClientDynamic {...props} />;
});

export default function EtsyPdfGeneratorPage() {
  const [shopName, setShopName] = useState("");
  const [showShopName, setShowShopName] = useState(true);
  const [thankYouMessage, setThankYouMessage] = useState(DEFAULT_THANK_YOU_MESSAGE);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [heroImageDataUrl, setHeroImageDataUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [etsyShopUrl, setEtsyShopUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [canTerms, setCanTerms] = useState(DEFAULT_CAN_TERMS);
  const [cannotTerms, setCannotTerms] = useState(DEFAULT_CANNOT_TERMS);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const saved = loadEtsyPdfFormFromStorage();
    if (!saved) return;
    setShopName(saved.shopName);
    setShowShopName(saved.showShopName ?? true);
    setThankYouMessage(saved.thankYouMessage ?? DEFAULT_THANK_YOU_MESSAGE);
    setLogoDataUrl(saved.logoDataUrl ?? null);
    setHeroImageDataUrl(saved.heroImageDataUrl);
    setDownloadUrl(saved.downloadUrl);
    setProductTitle(saved.productTitle);
    setEtsyShopUrl(saved.etsyShopUrl);
    setWebsiteUrl(saved.websiteUrl);
    setFacebookUrl(saved.facebookUrl);
    setYoutubeUrl(saved.youtubeUrl);
    setCanTerms(saved.canTerms || DEFAULT_CAN_TERMS);
    setCannotTerms(saved.cannotTerms || DEFAULT_CANNOT_TERMS);
  }, []);

  const SAVE_DEBOUNCE_MS = 500;
  useEffect(() => {
    const t = setTimeout(() => {
      saveEtsyPdfFormToStorage({
        shopName,
        showShopName,
        thankYouMessage,
        logoDataUrl,
        heroImageDataUrl,
        downloadUrl,
        productTitle,
        etsyShopUrl,
        websiteUrl,
        facebookUrl,
        youtubeUrl,
        canTerms,
        cannotTerms,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [
    shopName,
    showShopName,
    thankYouMessage,
    logoDataUrl,
    heroImageDataUrl,
    downloadUrl,
    productTitle,
    etsyShopUrl,
    websiteUrl,
    facebookUrl,
    youtubeUrl,
    canTerms,
    cannotTerms,
  ]);

  const handleLogoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        setLogoDataUrl(null);
        return;
      }
      fileToDataUrl(file)
        .then((url) => compressImageDataUrl(url, 400, 0.82))
        .then(setLogoDataUrl);
    },
    []
  );

  const handleHeroFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        setHeroImageDataUrl(null);
        return;
      }
      fileToDataUrl(file)
        .then((url) => compressImageDataUrl(url, 1200, 0.82))
        .then(setHeroImageDataUrl);
    },
    []
  );

  const handleDownloadPdf = useCallback(async () => {
    setIsDownloading(true);
    try {
      const [reactPdf, { default: EtsyDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./EtsyDocument"),
      ]);
      const doc = (
        <EtsyDocument
          shopName={shopName}
          showShopName={showShopName}
          thankYouMessage={thankYouMessage}
          logoDataUrl={logoDataUrl}
          heroImageDataUrl={heroImageDataUrl}
          downloadUrl={downloadUrl}
          productTitle={productTitle}
          etsyShopUrl={etsyShopUrl}
          websiteUrl={websiteUrl}
          facebookUrl={facebookUrl}
          youtubeUrl={youtubeUrl}
          canTerms={canTerms}
          cannotTerms={cannotTerms}
        />
      );
      const instance = reactPdf.pdf(doc);
      const blob = await instance.toBlob();
      const filename = shopName
        ? `${shopName.replace(/\s+/g, "-")}-download-instructions.pdf`
        : "etsy-download-instructions.pdf";
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [
    shopName,
    showShopName,
    thankYouMessage,
    logoDataUrl,
    heroImageDataUrl,
    downloadUrl,
    productTitle,
    etsyShopUrl,
    websiteUrl,
    facebookUrl,
    youtubeUrl,
    canTerms,
    cannotTerms,
  ]);

  const [previewProps, setPreviewProps] = useState<EtsyDocumentProps>({
    shopName: "",
    showShopName: true,
    thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
    logoDataUrl: null,
    heroImageDataUrl: null,
    downloadUrl: "",
    productTitle: "",
    etsyShopUrl: "",
    websiteUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    canTerms: DEFAULT_CAN_TERMS,
    cannotTerms: DEFAULT_CANNOT_TERMS,
  });

  const latestPropsRef = useRef<EtsyDocumentProps>(previewProps);
  latestPropsRef.current = {
    shopName,
    showShopName,
    thankYouMessage,
    logoDataUrl,
    heroImageDataUrl,
    downloadUrl,
    productTitle,
    etsyShopUrl,
    websiteUrl,
    facebookUrl,
    youtubeUrl,
    canTerms,
    cannotTerms,
  };

  const PREVIEW_DEBOUNCE_MS = 600;

  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewProps({ ...latestPropsRef.current });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [
    shopName,
    showShopName,
    thankYouMessage,
    logoDataUrl,
    heroImageDataUrl,
    downloadUrl,
    productTitle,
    etsyShopUrl,
    websiteUrl,
    facebookUrl,
    youtubeUrl,
    canTerms,
    cannotTerms,
  ]);

  return (
    <ToolPageLayout
      title="Clipart License Generator"
      description="Create a PDF with download link and license terms for digital products"
    >
      <div className="mb-8 bg-brand-grey rounded-xl border border-brand-charcoal p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Left: Form */}
          <div className="flex flex-col space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm font-medium text-brand-white">
                  Shop Name
                </label>
                <label className="flex items-center gap-1.5 text-sm text-brand-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showShopName}
                    onChange={(e) => setShowShopName(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show in PDF
                </label>
              </div>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="My Etsy Shop"
                className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-white mb-2">
                Logo (above hero image)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="w-full text-sm text-brand-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-charcoal file:text-brand-orange hover:file:bg-brand-grey file:border file:border-brand-grey"
              />
              {logoDataUrl ? (
                <button
                  type="button"
                  onClick={() => setLogoDataUrl(null)}
                  className="mt-2 text-sm text-brand-white/80 hover:text-brand-white underline"
                >
                  Remove logo
                </button>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-white mb-2">
                Thank you message
              </label>
              <input
                type="text"
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                placeholder={DEFAULT_THANK_YOU_MESSAGE}
                className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-white mb-2">
                Hero Image (bundle mockup)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleHeroFileChange}
                className="w-full text-sm text-brand-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-charcoal file:text-brand-orange hover:file:bg-brand-grey file:border file:border-brand-grey"
              />
              {heroImageDataUrl ? (
                <button
                  type="button"
                  onClick={() => setHeroImageDataUrl(null)}
                  className="mt-2 text-sm text-brand-white/80 hover:text-brand-white underline"
                >
                  Remove hero image
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-white mb-2">
                  Product Title (under hero image)
                </label>
                <input
                  type="text"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  placeholder="e.g. 50 PNG Clipart Bundle"
                  className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-white mb-2">
                  Download URL
                </label>
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-white mb-2">
                  <Store className="h-4 w-4 text-brand-white/60" />
                  Etsy Shop URL
                </label>
                <input
                  type="url"
                  value={etsyShopUrl}
                  onChange={(e) => setEtsyShopUrl(e.target.value)}
                  placeholder="https://www.etsy.com/shop/..."
                  className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-white mb-2">
                  <Globe className="h-4 w-4 text-brand-white/60" />
                  Website URL
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-white mb-2">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-white mb-2">
                  <Youtube className="h-4 w-4 text-red-600" />
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/..."
                  className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-white mb-2">
                You Can (editable)
              </label>
              <textarea
                value={canTerms}
                onChange={(e) => setCanTerms(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-white mb-2">
                You Cannot (editable)
              </label>
              <textarea
                value={cannotTerms}
                onChange={(e) => setCannotTerms(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal text-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="w-full bg-brand-orange text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isDownloading ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>

          {/* Right: PDF Preview */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div
              className="relative w-full rounded-xl border border-gray-200 bg-gray-100 overflow-hidden"
              style={{ minHeight: "80vh" }}
            >
              <PdfPreview {...previewProps} />
            </div>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
}
