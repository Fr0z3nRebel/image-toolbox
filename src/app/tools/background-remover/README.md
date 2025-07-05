# Background Remover Tool

A powerful client-side background removal tool with both automatic and manual modes for precise control.

## Features

### 🎯 Intelligent Auto Mode
- **Saliency Detection**: AI identifies main subjects using advanced computer vision
- **Edge-Based Segmentation**: Preserves fine details and complex boundaries
- **Multi-Factor Analysis**: Combines center bias, contrast, and color uniqueness
- **Region Growing**: Intelligently expands from high-confidence areas
- **Morphological Processing**: Professional cleanup with erosion/dilation

### 🎨 Interactive Drawing Mode with Real-Time Preview
- **Dual Brush System**: Green brush (keep subject) and Red brush (remove background)
- **Live Preview**: See results instantly as you draw - no waiting!
- **Smart Guidance**: Your hints guide the AI algorithm for perfect precision
- **Adjustable brush size**: Control precision with brush size from 5-50 pixels
- **Visual feedback**: Real-time preview shows exactly what will be kept vs removed
- **Clear function**: Reset all hints to start over

### Output Options
- **Transparent background**: Create PNG files with transparent backgrounds
- **Colored background**: Replace background with any solid color
- **Before/after comparison**: Interactive slider to compare original vs processed

## How to Use

### Auto Mode
1. Upload your image(s)
2. Select "Auto Detection" mode
3. Adjust tolerance (10-80%) - higher values remove more similar colors
4. Set edge smoothing (0-10) for cleaner edges
5. Choose transparent background or select a replacement color
6. Click "Remove Background" to process

### Drawing Mode
1. Upload your image(s)
2. Select "Manual Drawing" mode
3. Use the brush tool to paint areas you want to remove (shown in red)
4. Use the eraser tool to mark areas to keep (shown in blue)
5. Adjust brush size as needed for precision
6. Choose output options (transparent or colored background)
7. Click "Remove Background" to process

## Tips for Best Results

### Auto Mode
- Works best with solid or gradient backgrounds
- Adjust tolerance based on background complexity:
  - Lower tolerance (10-30%) for simple, solid backgrounds
  - Higher tolerance (40-80%) for complex or varied backgrounds
- Use edge smoothing for more natural-looking results

### Drawing Mode
- Use smaller brush sizes for detailed work around edges
- Take your time with complex subjects like hair or fur
- Use the eraser tool to correct over-painting
- The red overlay shows what will be removed, blue shows what will be kept

## Technical Details

### Processing
- **Client-side**: All processing happens in your browser - images never leave your device
- **Canvas-based**: Uses HTML5 Canvas API for image manipulation
- **Color algorithms**: Implements Euclidean distance color matching for auto mode
- **Edge smoothing**: Applies convolution filtering for smoother edges

### Output
- **Format**: PNG with alpha channel support
- **Quality**: Lossless processing preserves image quality
- **File size**: Optimized for transparency while maintaining quality

### Browser Support
- Modern browsers with Canvas API support
- Works on desktop and mobile devices
- Touch support for mobile drawing

## Limitations

- Auto mode works best with contrasting backgrounds
- Very complex backgrounds may require manual drawing mode
- Processing time increases with image size and complexity
- Large images may require more memory

## Privacy & Security

- **No uploads**: All processing happens locally in your browser
- **No data collection**: Images are never sent to any server
- **Secure**: No risk of image theft or privacy breaches
- **Offline capable**: Works without internet connection after initial load