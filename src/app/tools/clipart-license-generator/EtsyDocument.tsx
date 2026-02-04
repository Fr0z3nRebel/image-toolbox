"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
  Svg,
  Path,
  Line,
} from "@react-pdf/renderer";
import type { EtsyDocumentProps } from "./types";

/**
 * Split terms text into list items (by newline or comma).
 */
function parseTermsLines(terms: string): string[] {
  const trimmed = terms.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\n")) {
    return trimmed.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  thankYou: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000000",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  logoImage: {
    maxHeight: 72,
    width: "auto",
    objectFit: "contain",
  },
  heroWrap: {
    alignItems: "center",
    marginBottom: 24,
    minHeight: 120,
  },
  heroImage: {
    maxHeight: 259,
    width: "auto",
    objectFit: "contain",
  },
  heroPlaceholder: {
    fontSize: 10,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  productTitle: {
    fontSize: 12,
    color: "#374151",
    marginTop: 8,
    textAlign: "center",
  },
  ctaWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  ctaButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  licenseSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingLeft: 50,
  },
  licenseSectionRow: {
    flexDirection: "row",
    gap: 24,
    width: "100%",
  },
  licenseColumn: {
    flex: 1,
  },
  licenseTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
  },
  licenseTitleCan: {
    color: "#15803d",
  },
  licenseTitleCannot: {
    color: "#b91c1c",
  },
  licenseItem: {
    flexDirection: "row",
    marginBottom: 4,
    gap: 6,
  },
  licenseBulletPoint: {
    fontSize: 10,
    width: 14,
  },
  licenseText: {
    flex: 1,
    fontSize: 10,
    color: "#374151",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    alignItems: "center",
  },
  footerMessageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  footerText: {
    fontSize: 10,
    color: "#6b7280",
  },
  footerLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 8,
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerIcon: {
    width: 12,
    height: 12,
  },
  footerLinkText: {
    fontSize: 10,
    color: "#2563eb",
  },
});

const WEBSITE_ICON =
  "https://www.google.com/s2/favicons?domain=example.com&sz=32";
const FACEBOOK_ICON =
  "https://www.google.com/s2/favicons?domain=facebook.com&sz=32";
const YOUTUBE_ICON =
  "https://www.google.com/s2/favicons?domain=youtube.com&sz=32";

export default function EtsyDocument({
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
}: EtsyDocumentProps) {
  const canLines = parseTermsLines(canTerms);
  const cannotLines = parseTermsLines(cannotTerms);
  const hasDownloadUrl = Boolean(downloadUrl?.trim());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {showShopName ? (
            <Text style={styles.shopName}>{shopName || "Your Shop Name"}</Text>
          ) : null}
          {logoDataUrl ? (
            <View style={styles.logoWrap}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
              <Image style={styles.logoImage} src={logoDataUrl} />
            </View>
          ) : null}
          <Text style={styles.thankYou}>
            {thankYouMessage?.trim() || "Thank You for Your Order!"}
          </Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroWrap}>
          {heroImageDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop; PDF is not HTML
            <Image style={styles.heroImage} src={heroImageDataUrl} />
          ) : (
            <Text style={styles.heroPlaceholder}>
              Add a hero image in the form to preview it here.
            </Text>
          )}
          {productTitle?.trim() ? (
            <Text style={styles.productTitle}>{productTitle.trim()}</Text>
          ) : null}
        </View>

        {/* Call to Action */}
        <View style={styles.ctaWrap}>
          {hasDownloadUrl ? (
            <Link src={downloadUrl}>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaText}>CLICK HERE TO DOWNLOAD</Text>
              </View>
            </Link>
          ) : (
            <View style={[styles.ctaButton, styles.ctaButtonDisabled]}>
              <Text style={styles.ctaText}>Set download URL above</Text>
            </View>
          )}
        </View>

        {/* License Section: two columns */}
        <View style={styles.licenseSection}>
          <View style={styles.licenseSectionRow}>
            <View style={styles.licenseColumn}>
              <Text style={[styles.licenseTitle, styles.licenseTitleCan]}>
                YOU CAN
              </Text>
            {canLines.length > 0 ? (
              canLines.map((line, i) => (
                <View key={`can-${i}`} style={styles.licenseItem}>
                  <Svg
                    viewBox="0 0 24 24"
                    width={12}
                    height={12}
                  >
                    <Path
                      d="M20 6L9 17l-5-5"
                      stroke="#15803d"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                  <Text style={styles.licenseText}>{line}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.licenseText}>—</Text>
            )}
            </View>
            <View style={styles.licenseColumn}>
              <Text style={[styles.licenseTitle, styles.licenseTitleCannot]}>
                YOU CANNOT
              </Text>
            {cannotLines.length > 0 ? (
              cannotLines.map((line, i) => (
                <View key={`cannot-${i}`} style={styles.licenseItem}>
                  <Svg
                    viewBox="0 0 24 24"
                    width={12}
                    height={12}
                  >
                    <Line
                      x1={18}
                      y1={6}
                      x2={6}
                      y2={18}
                      stroke="#b91c1c"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <Line
                      x1={6}
                      y1={6}
                      x2={18}
                      y2={18}
                      stroke="#b91c1c"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <Text style={styles.licenseText}>{line}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.licenseText}>—</Text>
            )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerMessageRow}>
            <Text style={styles.footerText}>Need Help? Message us on </Text>
            {etsyShopUrl?.trim() ? (
              <Link src={etsyShopUrl.trim()}>
                <Text style={styles.footerLinkText}>Etsy</Text>
              </Link>
            ) : (
              <Text style={styles.footerText}>Etsy</Text>
            )}
            <Text style={styles.footerText}>.</Text>
          </View>
          <View style={styles.footerLinks}>
            {websiteUrl?.trim() ? (
              <Link src={websiteUrl.trim()} style={styles.footerLink}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
                <Image style={styles.footerIcon} src={WEBSITE_ICON} />
                <Text style={styles.footerLinkText}>Lefty Studios</Text>
              </Link>
            ) : null}
            {facebookUrl?.trim() ? (
              <Link src={facebookUrl.trim()} style={styles.footerLink}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
                <Image style={styles.footerIcon} src={FACEBOOK_ICON} />
                <Text style={styles.footerLinkText}>Facebook</Text>
              </Link>
            ) : null}
            {youtubeUrl?.trim() ? (
              <Link src={youtubeUrl.trim()} style={styles.footerLink}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
                <Image style={styles.footerIcon} src={YOUTUBE_ICON} />
                <Text style={styles.footerLinkText}>YouTube</Text>
              </Link>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
