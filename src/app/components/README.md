# Reusable Components

This directory contains reusable components that can be shared across different image processing tools.

## Components

### 1. FileUploadZone
A reusable file upload component with drag-and-drop functionality.

**Features:**
- Drag and drop file upload
- File selection via click
- File list display with remove functionality
- Support for custom controls (format selection, quality slider, etc.)
- File size display and total size calculation
- Customizable file type acceptance
- Disabled state support

**Usage:**
```tsx
import FileUploadZone, { FileWithPreview } from './components/FileUploadZone';

<FileUploadZone
  files={files}
  onFilesChange={setFiles}
  disabled={isProcessing}
>
  {/* Custom controls like format selection */}
  <div>
    <label>Format:</label>
    <select value={format} onChange={handleFormatChange}>
      <option value="jpeg">JPEG</option>
      <option value="png">PNG</option>
    </select>
  </div>
</FileUploadZone>
```

### 2. ProcessedFilesDisplay
A component for displaying processed files with download functionality.

**Features:**
- File list with download links
- Overall statistics display (for compression tools)
- ZIP download for all files
- File selection for comparison
- Browser-specific download restrictions
- Empty state display

**Usage:**
```tsx
import ProcessedFilesDisplay, { ProcessedFile } from './components/ProcessedFilesDisplay';

<ProcessedFilesDisplay
  title="Compressed Images"
  emptyStateMessage="Compressed images will appear here"
  files={processedFiles}
  onDownloadAll={downloadAll}
  isCreatingZip={isCreatingZip}
  downloadAllButtonText="Download All"
  showStats={true}
  onFileSelect={setSelectedIndex}
  selectedIndex={selectedIndex}
  shouldDisableIndividualDownload={shouldDisableDownload}
/>
```

### 3. FirefoxWarning
A component for displaying Firefox AVIF compatibility warnings.

**Features:**
- Predefined variants for different contexts
- Customizable styling
- Icon with warning message

**Usage:**
```tsx
import FirefoxWarning from './components/FirefoxWarning';

{userIsFirefox && targetFormat === 'avif' && (
  <FirefoxWarning variant="avif-conversion" />
)}
```

### 4. ToolPageLayout
A layout component for tool pages with consistent header and navigation.

**Features:**
- Consistent page layout
- Optional back button
- Centered title and description
- Gradient background

**Usage:**
```tsx
import ToolPageLayout from './components/ToolPageLayout';

<ToolPageLayout
  title="Image Compressor"
  description="Reduce file sizes while maintaining image quality"
  showBackButton={true}
>
  {/* Tool content */}
</ToolPageLayout>
```

### 5. ImageComparison
A component for side-by-side image comparison with interactive slider.

**Features:**
- Interactive slider for before/after comparison
- File size labels
- Responsive design
- Mouse and touch support

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

## Utilities

### browserUtils.ts
- `isFirefox()`: Detects Firefox browser
- `formatFileSize()`: Formats bytes to human-readable file sizes

### zipUtils.ts
- `createAndDownloadZip()`: Creates and downloads ZIP files with progress support

## Benefits of Refactoring

1. **Code Reusability**: Common functionality is extracted into reusable components
2. **Consistency**: All tools will have the same UI patterns and behavior
3. **Maintainability**: Bug fixes and improvements can be made in one place
4. **Development Speed**: New tools can be built faster using existing components
5. **Testing**: Components can be tested independently
6. **TypeScript Support**: Strong typing for better development experience

## Migration Guide

To migrate existing tools to use these components:

1. Replace the file upload section with `FileUploadZone`
2. Replace the processed files display with `ProcessedFilesDisplay`
3. Replace Firefox warnings with `FirefoxWarning`
4. Wrap the page content with `ToolPageLayout`
5. Use utility functions from `browserUtils` and `zipUtils`
6. For tools with comparison features, use `ImageComparison`

The format-converter tool (`src/app/tools/format-converter/page.tsx`) has been refactored to use these components as a reference implementation. 