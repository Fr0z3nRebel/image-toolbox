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

jest.mock("../../../components/FirefoxWarning", () => ({
  __esModule: true,
  default: () => <div data-testid="firefox-warning" />,
}));

jest.mock("../../../components/ImageComparison", () => ({
  __esModule: true,
  default: () => <div data-testid="image-comparison" />,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => {
  const MockIcon = ({ className }: { className?: string }) => (
    <svg className={className} data-testid="mock-icon" />
  );
  return {
    Minimize2: MockIcon,
    Download: MockIcon,
    Upload: MockIcon,
    Trash2: MockIcon,
  };
});

describe("ImageCompressor", () => {
  it("renders the tool page layout with correct title and description", () => {
    render(<ImageCompressor />);
    
    expect(screen.getByText("Image Compressor")).toBeInTheDocument();
    expect(screen.getByText("Reduce file sizes while maintaining image quality")).toBeInTheDocument();
  });

  it("renders the drop zone when empty", () => {
    render(<ImageCompressor />);

    expect(screen.getByText(/Drop .* or click to select/)).toBeInTheDocument();
  });

  it("renders the compression quality control", () => {
    render(<ImageCompressor />);
    
    expect(screen.getByText(/Compression Quality: 80%/)).toBeInTheDocument();
    expect(screen.getByText("Smaller file (10%)")).toBeInTheDocument();
    expect(screen.getByText("Better quality (100%)")).toBeInTheDocument();
  });
}); 