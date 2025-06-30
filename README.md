# Image Toolbox

A modern web application built with Next.js that provides a collection of powerful image processing tools. The app features a clean, responsive interface with a grid layout of tool cards.

## Features

### 🎨 Image Format Converter
- Convert images between JPG, PNG, and WebP formats
- Support for single and bulk image conversion
- Drag-and-drop file upload interface
- High-quality conversion with configurable settings
- Instant download of converted files

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Image Processing**: Sharp
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd image-toolbox
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── convert/
│   │       └── route.ts          # Image conversion API
│   │   └── tools/
│   │       └── format-converter/
│   │           └── page.tsx          # Format converter tool page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page with tool grid
├── components/                   # Reusable components (future)
└── lib/                         # Utility functions (future)
```

## API Endpoints

### POST /api/convert
Converts uploaded images to the specified format.

**Request:**
- `files`: Array of image files (multipart/form-data)
- `targetFormat`: Target format ("jpg", "png", or "webp")

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "name": "converted-image.webp",
      "url": "blob:..."
    }
  ]
}
```

## Deployment

This application is optimized for deployment on Vercel:

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Deploy automatically

The app includes:
- Optimized image processing with Sharp
- Proper API route configuration
- Responsive design for all devices

## Future Features

- Image resizing and cropping
- Image compression and optimization
- Batch processing capabilities
- Advanced filters and effects
- Background removal
- Color correction tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out
[the Next.js GitHub repository](https://github.com/vercel/next.js) - your
feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the
[Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
from the creators of Next.js.

Check out our
[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)
for more details.

## Running & Adding Tests

This project uses [Jest](https://jestjs.io/) and
[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
for unit and integration testing.

### Running Tests

To run all tests:

```bash
npm test
```

To run tests in watch mode (re-runs tests on file changes):

```bash
npm run test:watch
```

### Adding a Test

1. **Create a test file:**
   - Place your test files in a `__tests__` directory within the relevant
     feature/component directory. For example, for app-specific tests, use
     `src/app/__tests__`.
   - Name your test files with the `.test.tsx` or `.test.ts` extension (e.g.,
     `component.test.tsx`).

2. **Write a test:**
   - Import the component you want to test.
   - Use `@testing-library/react` to render the component and make assertions.

Example:

```tsx
import { render, screen } from "@testing-library/react";
import MyComponent from "../MyComponent";

describe("MyComponent", () => {
  it("renders the correct text", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
```

3. **Run your tests** to verify they pass.

---
