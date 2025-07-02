import JSZip from "jszip";

export interface ZipFile {
  name: string;
  blob: Blob;
}

export const createAndDownloadZip = async (
  files: ZipFile[],
  zipFileName: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const zip = new JSZip();
  
  // Add each file to the zip using the blob directly
  files.forEach((file) => {
    zip.file(file.name, file.blob);
  });
  
  // Generate the zip file
  const zipBlob = await zip.generateAsync({ 
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  }, onProgress ? (metadata) => {
    // Convert JSZip metadata to simple progress percentage
    const progress = metadata.percent || 0;
    onProgress(progress);
  } : undefined);
  
  // Create download link for the zip
  const zipUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = zipUrl;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(zipUrl);
}; 