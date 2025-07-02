import { render, screen } from "@testing-library/react";
import Home from "../page";

// Mock Next.js Link component
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => {
    return <a href={href} {...props}>{children}</a>;
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  ImageIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="image-icon" />
  ),
  Download: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="download-icon" />
  ),
  Upload: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="upload-icon" />
  ),
}));

describe("Home", () => {
  it("renders the Image Toolbox title", () => {
    render(<Home />);
    const title = screen.getByText("Image Toolbox");
    expect(title).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<Home />);
    const description = screen.getByText(/A collection of powerful tools to help you work with images/);
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
});
