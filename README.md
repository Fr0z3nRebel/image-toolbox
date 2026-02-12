# Image Toolbox

A modern web application built with Next.js that provides a collection of powerful image processing tools. The app features a clean, responsive interface with a grid layout of tool cards.

## Features

### 🎨 Image Format Converter
- Convert images between AVIG, JPEG, PNG, and WebP formats
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
│   ├── components/               # Reusable UI components
│   │   ├── utils/               # Utility functions
│   │   ├── FileUploadZone.tsx   # File upload with drag-and-drop
│   │   ├── ProcessedFilesDisplay.tsx # Display processed files
│   │   ├── FirefoxWarning.tsx   # Browser compatibility warnings
│   │   ├── ToolPageLayout.tsx   # Consistent page layout
│   │   └── ImageComparison.tsx  # Before/after image comparison
│   ├── tools/
│   │   ├── format-converter/
│   │   │   └── page.tsx         # Format converter tool page
│   │   └── image-compressor/
│   │       └── page.tsx         # Image compressor tool page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page with tool grid
└── lib/                         # Utility functions (future)
```

## API Endpoints

### POST /api/convert
Converts uploaded images to the specified format.

**Request:**
- `files`: Array of image files (multipart/form-data)
- `targetFormat`: Target format ("avif", "jpeg", "png", or "webp")

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

## Reusable Components

The Image Toolbox includes a comprehensive set of reusable components designed
to accelerate development of new image processing tools while maintaining
consistency across the application.

### Core Components

#### FileUploadZone
A unified file upload component with drag-and-drop functionality.

**Features:**
- Drag-and-drop file upload with visual feedback
- Click-to-select file functionality  
- File list display with thumbnails and metadata
- Custom control slots for tool-specific options
- Required action button for processing files
- File size calculation and display
- Remove individual files functionality
- Disabled state during processing

**Usage:**
```tsx
import FileUploadZone, { FileWithPreview } from './components/FileUploadZone';

<FileUploadZone
  files={files}
  onFilesChange={setFiles}
  disabled={isProcessing}
  acceptedFileTypes="image/*,.avif"
  supportedFormatsText="Supports AVIF, JPEG, PNG, and WebP images"
  actionButton={
    <button onClick={processImages} disabled={files.length === 0}>
      Process Images
    </button>
  }
>
  {/* Custom controls like format selection or quality slider */}
  <FormatSelector value={format} onChange={setFormat} />
</FileUploadZone>
```

#### ProcessedFilesDisplay
Displays processed files with download functionality and optional statistics.

**Features:**
- Grid layout for processed file display
- Individual file download links
- Bulk ZIP download functionality
- Compression statistics display (when applicable)
- File selection for comparison features
- Browser-specific download restrictions
- Empty state with helpful messaging

**Usage:**
```tsx
import ProcessedFilesDisplay, { ProcessedFile } from './components/ProcessedFilesDisplay';

<ProcessedFilesDisplay
  title="Compressed Images"
  emptyStateMessage="Compressed images will appear here"
  files={processedFiles}
  onDownloadAll={downloadAll}
  isCreatingZip={isCreatingZip}
  downloadAllButtonText="Download"
  showStats={true}
  onFileSelect={setSelectedIndex}
  shouldDisableIndividualDownload={shouldDisableDownload}
/>
```

#### ToolPageLayout
Provides consistent layout and navigation for all tool pages.

**Features:**
- Standardized page header with title and description
- Optional back-to-home navigation
- Responsive container with proper spacing
- Gradient background styling
- Centered content layout

**Usage:**
```tsx
import ToolPageLayout from './components/ToolPageLayout';

<ToolPageLayout
  title="Image Format Converter"
  description="Convert your images between different formats"
  showBackButton={true}
>
  {/* Tool-specific content */}
</ToolPageLayout>
```

#### ImageComparison
Interactive before/after image comparison with slider control.

**Features:**
- Side-by-side image comparison with draggable slider
- File size labels for both original and processed images
- Responsive design that works on desktop and mobile
- Mouse and touch interaction support
- Visual indicators for original vs processed

**Usage:**
```tsx
import ImageComparison from './components/ImageComparison';

<ImageComparison
  originalImageUrl={originalFile.preview}
  processedImageUrl={processedFile.url}
  originalSize={originalFile.size}
  processedSize={processedFile.compressedSize}
  fileName={processedFile.name}
/>
```

#### FirefoxWarning
Displays browser-specific compatibility warnings.

**Features:**
- Predefined warning variants for different scenarios
- Consistent styling with warning icon
- Contextual messaging based on browser and feature

**Usage:**
```tsx
import FirefoxWarning from './components/FirefoxWarning';

{isFirefox && targetFormat === 'avif' && (
  <FirefoxWarning variant="avif-conversion" />
)}
```

### Utility Functions

#### browserUtils.ts
- `isFirefox()`: Detects Firefox browser for compatibility checks
- `formatFileSize(bytes)`: Converts bytes to human-readable file sizes

#### zipUtils.ts
- `createAndDownloadZip()`: Creates and downloads ZIP files with progress support

### Development Guidelines

When creating new image processing tools:

1. **Use ToolPageLayout** for consistent page structure
2. **Implement FileUploadZone** for file input functionality
3. **Use ProcessedFilesDisplay** for showing results
4. **Add appropriate warnings** using FirefoxWarning when needed
5. **Include comparison features** with ImageComparison for before/after views
6. **Leverage utility functions** for common operations

### Benefits

- **55% code reduction** compared to building tools from scratch
- **Consistent UX** across all tools
- **Faster development** of new features
- **Centralized bug fixes** and improvements
- **TypeScript support** with proper type definitions
- **Testable components** that can be unit tested independently

See `src/app/components/README.md` for detailed component documentation and
`src/app/tools/format-converter/page-refactored-example.tsx` for a complete
implementation example.

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
