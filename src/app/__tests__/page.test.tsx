import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "../page";

// Mock Next.js Link component
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => {
    return <a href={href} {...props}>{children}</a>;
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => {
  const MockIcon = ({ className }: { className?: string }) => (
    <svg className={className} data-testid="mock-icon" />
  );
  return {
    ImageIcon: MockIcon,
    Ruler: MockIcon,
    LayoutGrid: MockIcon,
    FileText: MockIcon,
    ScanLine: MockIcon,
    Eraser: MockIcon,
    Crop: MockIcon,
    Square: MockIcon,
  };
});

describe("Home", () => {
  it("renders the Professional Image Processing Tools title", () => {
    render(<Home />);
    const title = screen.getByText("Professional Image Processing Tools");
    expect(title).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<Home />);
    const description = screen.getByText(/Professional image tools. Convert formats, compress images, and more. Most tools work client-side for maximum privacy and speed./);
    expect(description).toBeInTheDocument();
  });

  it('renders the Format Converter tool card', () => {
    render(<Home />);
    const formatConverter = screen.getByText("Format Converter");
    expect(formatConverter).toBeInTheDocument();
  });

  it('renders the format converter description', () => {
    render(<Home />);
    const description = screen.getByText(/Convert images between AVIF, JPEG, PNG, and WebP formats/);
    expect(description).toBeInTheDocument();
  });

  it('renders the "More Tools Coming Soon" section', () => {
    render(<Home />);
    const comingSoon = screen.getByText("More Tools Coming Soon");
    expect(comingSoon).toBeInTheDocument();
  });

  it('renders the coming soon description', () => {
    render(<Home />);
    const description = screen.getByText(/We're working on adding more powerful image processing tools/);
    expect(description).toBeInTheDocument();
  });

  it('renders the format converter tool link', () => {
    render(<Home />);
    const link = screen.getByRole('link', { name: /Format Converter/i });
    expect(link).toHaveAttribute('href', '/tools/format-converter');
  });

  it('renders the Image Compressor tool card', () => {
    render(<Home />);
    const imageCompressor = screen.getByText("Image Compressor");
    expect(imageCompressor).toBeInTheDocument();
  });

  it('renders the image compressor description', () => {
    render(<Home />);
    const description = screen.getByText(/Reduce file sizes while maintaining image quality/);
    expect(description).toBeInTheDocument();
  });

  it('renders the image compressor tool link', () => {
    render(<Home />);
    const link = screen.getByRole('link', { name: /Image Compressor/i });
    expect(link).toHaveAttribute('href', '/tools/image-compressor');
  });

  it('does not show "New" badge on format converter tool', () => {
    render(<Home />);
    const formatConverterCard = screen.getByText("Format Converter").closest('div');
    const newBadge = formatConverterCard?.querySelector('[class*="bg-brand-orange"]');
    expect(newBadge).not.toBeInTheDocument();
  });

  it('shows "New" badge on bundle builder and clipart license generator tools', () => {
    render(<Home />);
    const newBadges = screen.getAllByText('New');
    expect(newBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('image compressor tool is not disabled', () => {
    render(<Home />);
    const imageCompressorCard = screen.getByText("Image Compressor").closest('div');
    expect(imageCompressorCard).not.toHaveClass('opacity-60');
    expect(imageCompressorCard).not.toHaveClass('cursor-not-allowed');
  });

  it('format converter tool is not disabled', () => {
    render(<Home />);
    const formatConverterCard = screen.getByText("Format Converter").closest('div');
    expect(formatConverterCard).not.toHaveClass('opacity-60');
    expect(formatConverterCard).not.toHaveClass('cursor-not-allowed');
  });
});
