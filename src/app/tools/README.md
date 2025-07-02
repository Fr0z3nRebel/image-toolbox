# Tool Architecture Documentation

This directory contains the image processing tools for the Image Toolbox application. Each tool follows a consistent architecture pattern for better maintainability and separation of concerns.

## Architecture Pattern

Each tool is organized with the following structure:

```
tool-name/
├── page.tsx           # UI components and React state management
├── functions.ts       # Business logic and processing functions
```

### Separation of Concerns

#### `page.tsx` - UI Layer
- React component rendering
- State management (useState, useEffect)
- User interactions and event handlers
- Component composition and layout
- UI controls (buttons, sliders, selectors)

#### `functions.ts` - Business Logic Layer
- Core processing functions (compression, conversion, etc.)
- File processing algorithms
- Data transformation logic
- Browser-specific logic and utilities
- Utility functions for calculations

## Current Tools

### Format Converter (`format-converter/`)

**Files:**
- `page.tsx` (117 lines) - UI components and state management
- `functions.ts` (89 lines) - Image conversion logic

**Key Functions:**
- `convertImageToFormat()` - Convert single file to target format
- `convertImages()` - Process multiple files with progress tracking
- `shouldDisableIndividualDownload()` - Firefox AVIF compatibility check

### Image Compressor (`image-compressor/`)

**Files:**
- `page.tsx` (156 lines) - UI components and state management  
- `functions.ts` (117 lines) - Image compression logic

**Key Functions:**
- `compressImage()` - Compress single file with quality control
- `compressImages()` - Process multiple files with progress tracking
- `shouldDisableIndividualDownload()` - Firefox AVIF compatibility check
- `getOriginalFileForComparison()` - Helper for before/after comparisons

## Benefits of This Architecture

### 1. Maintainability
- Business logic is isolated and easier to test
- UI changes don't affect processing logic
- Processing improvements don't require UI modifications

### 2. Reusability
- Logic functions can be shared between tools
- Common patterns emerge more clearly
- Easier to extract shared utilities

### 3. Testing
- Business logic can be unit tested independently
- UI components can be tested separately
- More focused and reliable test coverage

### 4. Code Clarity
- Clear separation of what handles UI vs. what processes data
- Easier to understand the flow of data
- Reduced cognitive load when working on specific concerns

## Development Guidelines

### Adding New Tools

When creating a new tool, follow this pattern:

1. **Create the logic file first** (`functions.ts`)
   - Define core processing functions
   - Include proper TypeScript types
   - Add error handling and edge cases
   - Export functions that take data and return processed results

2. **Create the UI file** (`page.tsx`)
   - Import logic functions from the adjacent file
   - Focus on React component structure
   - Handle user interactions and state management
   - Use the shared reusable components from `../../components/`

### Function Naming Conventions

- **Processing functions**: Use verb-noun pattern (`compressImage`, `convertFormat`)
- **Utility functions**: Use descriptive names (`shouldDisableIndividualDownload`)
- **Event handlers**: Use `handle` prefix (`handleCompressImages`)

### Type Safety

- All processing functions should use proper TypeScript types
- Import shared types from `../../components/ProcessedFilesDisplay`
- Use generic types where appropriate for flexibility

## Migration Notes

This architecture was implemented to refactor existing monolithic tool files. The previous single-file approach mixed UI and business logic, making maintenance difficult.

**Previous structure:**
- `page.tsx` (165-217 lines) - Everything mixed together

**New structure:**  
- `page.tsx` (117-156 lines) - UI focused
- `functions.ts` (89-117 lines) - Logic focused
- **Total reduction**: Cleaner, more maintainable code with better separation

This pattern should be followed for all future tools to maintain consistency and code quality. 