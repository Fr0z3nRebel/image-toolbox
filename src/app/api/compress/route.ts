import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const quality = parseInt(formData.get("quality") as string) || 80;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (quality < 10 || quality > 100) {
      return NextResponse.json(
        { error: "Quality must be between 10 and 100" },
        { status: 400 }
      );
    }

    const compressedFiles: {
      name: string;
      url: string;
      originalSize: number;
      compressedSize: number;
      compressionRatio: number;
    }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Convert file to buffer
        let buffer: Buffer | undefined;
        let fileName: string;
        let originalSize: number;
        
        // Handle Next.js File objects
        if (file && typeof file.arrayBuffer === 'function') {
          buffer = Buffer.from(await file.arrayBuffer());
          fileName = file.name || `file_${i}`;
          originalSize = file.size;
        } else if (file && typeof file.stream === 'function') {
          const stream = file.stream();
          const reader = stream.getReader();
          const chunks: Uint8Array[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          
          buffer = Buffer.from(combined);
          fileName = file.name || `file_${i}`;
          originalSize = totalLength;
        } else {
          // Last resort - try to convert directly
          try {
            buffer = Buffer.from(file as unknown as ArrayBufferLike);
            fileName = `file_${i}`;
            originalSize = buffer.length;
          } catch (e) {
            console.error("Failed to convert file to buffer:", e);
            continue;
          }
        }
        
        if (!buffer || buffer.length === 0) {
          console.error('No valid buffer created from file');
          continue;
        }
        
        // Get image metadata to determine original format
        const metadata = await sharp(buffer).metadata();
        const originalFormat = metadata.format;
        
        // Process image with Sharp for compression
        let processedImage = sharp(buffer);
        
        // Apply compression based on original format
        // Remove file extension and add compressed suffix
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        let outputFileName: string;
        
                 switch (originalFormat) {
           case "jpeg":
           case "jpg":
             processedImage = processedImage.jpeg({ 
               quality: quality,
               progressive: quality < 80, // Only use progressive for lower quality
               mozjpeg: true 
             });
             outputFileName = `${baseName}_compressed.jpg`;
             break;
           case "png":
             // For PNG, higher compression level = better compression (0-9)
             // Map quality percentage to compression level (higher quality = less aggressive compression)
             const compressionLevel = Math.round(9 - (quality / 100) * 8); // 100% quality = level 1, 10% quality = level 9
             processedImage = processedImage.png({ 
               compressionLevel: Math.max(1, Math.min(9, compressionLevel)),
               progressive: false, // Progressive can increase PNG size
               palette: true, // Try to use palette when possible for smaller files
               colors: quality < 50 ? 128 : 256 // Reduce colors for aggressive compression
             });
             outputFileName = `${baseName}_compressed.png`;
             break;
           case "webp":
             processedImage = processedImage.webp({ 
               quality: quality,
               effort: 6,
               lossless: false // Ensure lossy compression for size reduction
             });
             outputFileName = `${baseName}_compressed.webp`;
             break;
           case "gif":
             // Convert GIF to WebP for better compression
             processedImage = processedImage.webp({ 
               quality: quality,
               effort: 6 
             });
             outputFileName = `${baseName}_compressed.webp`;
             break;
           case "tiff":
           case "tif":
             // Convert TIFF to JPEG for better compression
             processedImage = processedImage.jpeg({ 
               quality: quality,
               progressive: quality < 80,
               mozjpeg: true 
             });
             outputFileName = `${baseName}_compressed.jpg`;
             break;
           default:
             // For other formats, convert to JPEG
             processedImage = processedImage.jpeg({ 
               quality: quality,
               progressive: quality < 80,
               mozjpeg: true 
             });
             outputFileName = `${baseName}_compressed.jpg`;
         }
         
         // Apply minimal optimizations to avoid increasing file size
         if (quality < 70) {
           // Only apply additional processing for aggressive compression
           processedImage = processedImage.withMetadata(); // Strip metadata for smaller files
         }
        
        // Convert to buffer
        const compressedBuffer = await processedImage.toBuffer();
        const compressedSize = compressedBuffer.length;
        
        // Calculate compression ratio
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
        
        // Convert to base64 for client-side download
        const base64Data = compressedBuffer.toString('base64');
        const mimeType = originalFormat === 'png' ? 'image/png' : 
                        originalFormat === 'webp' ? 'image/webp' : 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        
        compressedFiles.push({
          name: outputFileName,
          url: dataUrl,
          originalSize: originalSize,
          compressedSize: compressedSize,
          compressionRatio: Math.max(0, compressionRatio), // Ensure non-negative
        });
      } catch (error) {
        console.error(`Error compressing file ${i + 1}:`, error);
        // Continue with other files even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      files: compressedFiles,
    });
  } catch (error) {
    console.error("Error in compression API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Increase payload size limit for image uploads
export const config = {
  api: {
    bodyParser: false,
  },
}; 