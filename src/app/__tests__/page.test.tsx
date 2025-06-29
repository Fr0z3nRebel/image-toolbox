import { render, screen } from "@testing-library/react";
import Home from "../app/page";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: React.ComponentProps<'img'>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

describe("Home", () => {
  it("renders the Next.js logo", () => {
    render(<Home />);
    const logo = screen.getByAltText("Next.js logo");
    expect(logo).toBeInTheDocument();
  });

  it('renders the "Get started by editing" text', () => {
    render(<Home />);
    const text = screen.getByText(/Get started by editing/i);
    expect(text).toBeInTheDocument();
  });

  it('renders the "Deploy now" button', () => {
    render(<Home />);
    const deployButton = screen.getByText("Deploy now");
    expect(deployButton).toBeInTheDocument();
  });

  it('renders the "Read our docs" button', () => {
    render(<Home />);
    const docsButton = screen.getByText("Read our docs");
    expect(docsButton).toBeInTheDocument();
  });

  it("renders footer links", () => {
    render(<Home />);
    const learnLink = screen.getByText("Learn");
    const examplesLink = screen.getByText("Examples");
    const nextjsLink = screen.getByText(/Go to nextjs\.org/i);

    expect(learnLink).toBeInTheDocument();
    expect(examplesLink).toBeInTheDocument();
    expect(nextjsLink).toBeInTheDocument();
  });
});
