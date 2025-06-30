import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const targetFormat = formData.get("targetFormat") as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (!targetFormat || !["jpg", "png", "webp"].includes(targetFormat)) {
      return NextResponse.json(
        { error: "Invalid target format" },
        { status: 400 }
      );
    }

    const convertedFiles: { name: string; url: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Convert file to buffer
        let buffer: Buffer | undefined;
        let fileName: string;
        
        // First, let's try the simplest approach for Next.js File objects
        if (file && typeof file.arrayBuffer === 'function') {
          buffer = Buffer.from(await file.arrayBuffer());
          fileName = (file.name || `file_${i}`).replace(/\.[^/.]+$/, "");
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
          fileName = (file.name || `file_${i}`).replace(/\.[^/.]+$/, "");
        } else {
          // Last resort - try to convert directly
          try {
            buffer = Buffer.from(file as any);
            fileName = `file_${i}`;
          } catch (e) {
            console.error("Failed to convert file to buffer:", e);
            continue;
          }
        }
        
        if (!buffer || buffer.length === 0) {
          console.error('No valid buffer created from file');
          continue;
        }
        
        // Process image with Sharp
        let processedImage = sharp(buffer);
        
        // Apply format-specific settings
        switch (targetFormat) {
          case "jpg":
            processedImage = processedImage.jpeg({ quality: 85 });
            break;
          case "png":
            processedImage = processedImage.png({ quality: 85 });
            break;
          case "webp":
            processedImage = processedImage.webp({ quality: 85 });
            break;
        }
        
        // Convert to buffer
        const convertedBuffer = await processedImage.toBuffer();
        
        // For server-side conversion, we'll return the data as base64
        const base64Data = convertedBuffer.toString('base64');
        const dataUrl = `data:image/${targetFormat};base64,${base64Data}`;
        
        convertedFiles.push({
          name: `${fileName}.${targetFormat}`,
          url: dataUrl,
        });
      } catch (error) {
        console.error(`Error converting file ${i + 1}:`, error);
        // Continue with other files even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      files: convertedFiles,
    });
  } catch (error) {
    console.error("Error in conversion API:", error);
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