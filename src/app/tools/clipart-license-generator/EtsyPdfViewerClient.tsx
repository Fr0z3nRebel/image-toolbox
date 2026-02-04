"use client";

import { PDFViewer } from "@react-pdf/renderer";
import EtsyDocument from "./EtsyDocument";
import type { EtsyDocumentProps } from "./types";

export default function EtsyPdfViewerClient(props: EtsyDocumentProps) {
  return (
    <PDFViewer
      width="100%"
      height="100%"
      style={{ minHeight: "80vh" }}
    >
      <EtsyDocument {...props} />
    </PDFViewer>
  );
}
