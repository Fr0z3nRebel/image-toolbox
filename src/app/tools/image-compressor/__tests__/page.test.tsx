import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ImageCompressor from "../page";
import React from "react";

// Mock the components used in the image compressor
jest.mock("../../../components/ToolPageLayout", () => ({
  __esModule: true,
  default: ({ children, title, description }: React.PropsWithChildren<{ title?: string; description?: string }>) => (
    <div data-testid="tool-page-layout">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

jest.mock("../../../components/FileUploadZone", () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="file-upload-zone">
      {children}
    </div>
  ),
}));

jest.mock("../../../components/ProcessedFilesDisplay", () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="processed-files-display">
      <h2>{title}</h2>
    </div>
  ),
}));

jest.mock("../../../components/FirefoxWarning", () => ({
  __esModule: true,
  default: () => <div data-testid="firefox-warning" />,
}));

jest.mock("../../../components/ImageComparison", () => ({
  __esModule: true,
  default: () => <div data-testid="image-comparison" />,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Minimize2: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="minimize-icon" />
  ),
}));

describe("ImageCompressor", () => {
  it("renders the tool page layout with correct title and description", () => {
    render(<ImageCompressor />);
    
    expect(screen.getByText("Image Compressor")).toBeInTheDocument();
    expect(screen.getByText("Reduce file sizes while maintaining image quality")).toBeInTheDocument();
  });

  it("renders the file upload zone", () => {
    render(<ImageCompressor />);
    
    expect(screen.getByTestId("file-upload-zone")).toBeInTheDocument();
  });

  it("renders the processed files display", () => {
    render(<ImageCompressor />);
    
    expect(screen.getByTestId("processed-files-display")).toBeInTheDocument();
    expect(screen.getByText("Compressed Images")).toBeInTheDocument();
  });

  it("renders the compression quality control", () => {
    render(<ImageCompressor />);
    
    expect(screen.getByText(/Compression Quality: 80%/)).toBeInTheDocument();
    expect(screen.getByText("Smaller file (10%)")).toBeInTheDocument();
    expect(screen.getByText("Better quality (100%)")).toBeInTheDocument();
  });
}); 