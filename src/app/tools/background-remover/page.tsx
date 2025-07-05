"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Scissors, Brush, Eraser, RotateCcw } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import ImageComparison from "../../components/ImageComparison";
import { formatFileSize } from "../../components/utils/browserUtils";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { 
  processBackgroundRemovalBatch, 
  shouldDisableIndividualDownload, 
  getOriginalFileForComparison,
  generateRealtimePreview,
  BackgroundRemovalSettings,
  BackgroundRemovalMode
} from "./functions";

export default function BackgroundRemover() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [mode, setMode] = useState<BackgroundRemovalMode>("auto");
  const [tolerance, setTolerance] = useState<number>(30);
  const [edgeSmooth, setEdgeSmooth] = useState<number>(2);
  const [useTransparent, setUseTransparent] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [selectedComparisonIndex, setSelectedComparisonIndex] = useState<number>(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [foregroundCanvas, setForegroundCanvas] = useState<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'foreground' | 'background'>('foreground');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Canvas refs for drawing mode
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const foregroundHintsRef = useRef<HTMLCanvasElement>(null);
  const backgroundHintsRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load image for drawing mode
  useEffect(() => {
    if (mode === 'drawing' && files.length > 0 && !currentFile) {
      setCurrentFile(files[0]);
    }
  }, [mode, files, currentFile]);

  // Setup canvas for drawing mode
  useEffect(() => {
    if (mode === 'drawing' && currentFile && imageCanvasRef.current && foregroundHintsRef.current && backgroundHintsRef.current) {
      const imageCanvas = imageCanvasRef.current;
      const fgHints = foregroundHintsRef.current;
      const bgHints = backgroundHintsRef.current;
      const imageCtx = imageCanvas.getContext('2d');
      const fgCtx = fgHints.getContext('2d');
      const bgCtx = bgHints.getContext('2d');

      if (!imageCtx || !fgCtx || !bgCtx) return;

      const img = new Image();
      img.onload = () => {
        const { naturalWidth, naturalHeight } = img;
        
        // Set all canvases to the same size
        imageCanvas.width = naturalWidth;
        imageCanvas.height = naturalHeight;
        fgHints.width = naturalWidth;
        fgHints.height = naturalHeight;
        bgHints.width = naturalWidth;
        bgHints.height = naturalHeight;

        // Draw original image
        imageCtx.drawImage(img, 0, 0);
        
        // Initialize hint canvases (transparent)
        fgCtx.clearRect(0, 0, naturalWidth, naturalHeight);
        bgCtx.clearRect(0, 0, naturalWidth, naturalHeight);
        
        setForegroundCanvas(fgHints);
        
        // Generate initial preview
        updatePreview();
      };

      img.src = URL.createObjectURL(currentFile);
      return () => URL.revokeObjectURL(img.src);
    }
  }, [mode, currentFile]);

  // Update preview in real-time
  const updatePreview = useCallback(() => {
    if (!imageCanvasRef.current || !foregroundHintsRef.current || !backgroundHintsRef.current) return;
    
    const settings: BackgroundRemovalSettings = {
      mode: 'drawing',
      tolerance,
      edgeSmooth,
      useTransparent,
      backgroundColor
    };

    const preview = generateRealtimePreview(
      imageCanvasRef.current,
      foregroundHintsRef.current,
      backgroundHintsRef.current,
      settings
    );

    if (preview && previewCanvasRef.current) {
      const previewCanvas = previewCanvasRef.current;
      previewCanvas.width = preview.width;
      previewCanvas.height = preview.height;
      const ctx = previewCanvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(preview, 0, 0);
      }
    }
  }, [tolerance, edgeSmooth, useTransparent, backgroundColor]);

  const handleProcessImages = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    
    try {
      const settings: BackgroundRemovalSettings = {
        mode,
        tolerance,
        edgeSmooth,
        useTransparent,
        backgroundColor
      };

      const results = await processBackgroundRemovalBatch(
        files, 
        settings, 
        mode === 'drawing' && foregroundCanvas ? foregroundCanvas : undefined
      );
      setProcessedFiles(results);
    } catch (error) {
      console.error("Error processing images:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) return;

    setIsCreatingZip(true);
    try {
      await createAndDownloadZip(
        processedFiles.map(file => ({ name: file.name, blob: file.blob })),
        `background-removed-${mode}.zip`
      );
    } catch (error) {
      console.error("Error creating zip file:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  // Drawing functions
  const getMousePos = (e: MouseEvent | React.MouseEvent) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const draw = (x: number, y: number) => {
    const targetCanvas = tool === 'foreground' ? foregroundHintsRef.current : backgroundHintsRef.current;
    if (!targetCanvas) return;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = tool === 'foreground' ? 'green' : 'red';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Update preview in real-time
    updatePreview();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getMousePos(e);
    setIsDrawing(true);
    draw(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getMousePos(e);
    draw(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearHints = () => {
    if (foregroundHintsRef.current && backgroundHintsRef.current) {
      const fgCtx = foregroundHintsRef.current.getContext('2d');
      const bgCtx = backgroundHintsRef.current.getContext('2d');
      
      if (fgCtx && bgCtx) {
        fgCtx.clearRect(0, 0, foregroundHintsRef.current.width, foregroundHintsRef.current.height);
        bgCtx.clearRect(0, 0, backgroundHintsRef.current.width, backgroundHintsRef.current.height);
        updatePreview();
      }
    }
  };

  // Control components
  const modeControl = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Removal Mode:
      </label>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as BackgroundRemovalMode)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
      >
        <option value="auto">Auto Detection</option>
        <option value="drawing">Manual Drawing</option>
      </select>
      <p className="text-xs text-gray-500 mt-1">
        {mode === 'auto' ? 'Automatically detects background' : 'Draw areas to remove'}
      </p>
    </div>
  );

  const autoControls = mode === 'auto' && (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tolerance: {tolerance}%
        </label>
        <input
          type="range"
          min="10"
          max="80"
          value={tolerance}
          onChange={(e) => setTolerance(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Less sensitive</span>
          <span>More sensitive</span>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Edge Smoothing: {edgeSmooth}
        </label>
        <input
          type="range"
          min="0"
          max="10"
          value={edgeSmooth}
          onChange={(e) => setEdgeSmooth(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Sharp edges</span>
          <span>Smooth edges</span>
        </div>
      </div>
    </div>
  );

  const outputControls = (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useTransparent}
            onChange={(e) => setUseTransparent(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Transparent background</span>
        </label>
      </div>
      
      {!useTransparent && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Color:
          </label>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
          />
        </div>
      )}
    </div>
  );

  const processButton = (
    <button
      onClick={handleProcessImages}
      disabled={files.length === 0 || isProcessing}
      className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      <Scissors className="h-4 w-4" />
      {isProcessing ? "Processing..." : "Remove Background"}
    </button>
  );

  const originalFileForComparison = getOriginalFileForComparison(
    selectedComparisonIndex, 
    files, 
    processedFiles
  );

  return (
    <ToolPageLayout
      title="Background Remover"
      description="Remove image backgrounds automatically or manually with precision tools"
      showBackButton={true}
    >
      {/* Upload Section */}
      <div className="mb-8">
        <FileUploadZone
          files={files}
          onFilesChange={setFiles}
          disabled={isProcessing}
          actionButton={processButton}
          acceptedFileTypes="image/*"
          supportedFormatsText="Supports JPEG, PNG, and WebP images"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modeControl}
            {autoControls}
            {outputControls}
          </div>
        </FileUploadZone>
      </div>

      {/* Drawing Mode Interface */}
      {mode === 'drawing' && currentFile && (
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Manual Selection Tool
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Paint over the areas you want to remove. Use the brush to mark areas for removal, or the eraser to undo marks.
            </p>
            
            {/* Drawing Tools */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
                           <div className="flex items-center gap-2">
               <button
                 onClick={() => setTool('foreground')}
                 className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                   tool === 'foreground'
                     ? 'bg-green-600 text-white'
                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                 }`}
               >
                 <Brush className="h-4 w-4" />
                 Keep (Subject)
               </button>
               <button
                 onClick={() => setTool('background')}
                 className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                   tool === 'background'
                     ? 'bg-red-600 text-white'
                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                 }`}
               >
                 <Eraser className="h-4 w-4" />
                 Remove (Background)
               </button>
             </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Size:</span>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-700 w-8">{brushSize}</span>
              </div>
              
              <button
                onClick={clearHints}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Clear All
              </button>
            </div>

                         {/* Canvas Interface */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               {/* Drawing Area */}
               <div className="relative bg-gray-50 rounded-lg p-4">
                 <h4 className="text-sm font-medium text-gray-700 mb-2">Drawing Area</h4>
                 <div className="relative inline-block">
                   {/* Original image canvas */}
                   <canvas
                     ref={imageCanvasRef}
                     onMouseDown={handleMouseDown}
                     onMouseMove={handleMouseMove}
                     onMouseUp={handleMouseUp}
                     onMouseLeave={handleMouseUp}
                     className="max-w-full max-h-80 border border-gray-300 rounded cursor-crosshair"
                   />
                   {/* Foreground hints overlay */}
                   <canvas
                     ref={foregroundHintsRef}
                     className="absolute top-0 left-0 max-w-full max-h-80 opacity-60 pointer-events-none"
                     style={{ mixBlendMode: 'multiply' }}
                   />
                   {/* Background hints overlay */}
                   <canvas
                     ref={backgroundHintsRef}
                     className="absolute top-0 left-0 max-w-full max-h-80 opacity-60 pointer-events-none"
                     style={{ mixBlendMode: 'multiply' }}
                   />
                 </div>
               </div>

               {/* Preview Area */}
               <div className="relative bg-gray-50 rounded-lg p-4">
                 <h4 className="text-sm font-medium text-gray-700 mb-2">Live Preview</h4>
                 <div className="relative inline-block">
                   <canvas
                     ref={previewCanvasRef}
                     className="max-w-full max-h-80 border border-gray-300 rounded"
                   />
                 </div>
               </div>
             </div>

             <div className="mt-4 text-sm text-gray-600">
               <p>
                 <strong>Green strokes</strong> mark areas to keep (subject).
                 <strong> Red strokes</strong> mark areas to remove (background).
                 The preview updates in real-time as you draw.
               </p>
             </div>
          </div>
        </div>
      )}

      {/* Processed Images Display */}
      <div className="mb-8">
        <ProcessedFilesDisplay
          title="Processed Images"
          emptyStateMessage="Images with removed backgrounds will appear here"
          files={processedFiles}
          onDownloadAll={downloadAll}
          isCreatingZip={isCreatingZip}
          downloadAllButtonText="Download All"
          showStats={false}
          onFileSelect={setSelectedComparisonIndex}
          selectedIndex={selectedComparisonIndex}
          shouldDisableIndividualDownload={() => shouldDisableIndividualDownload()}
          formatFileSize={formatFileSize}
        />
      </div>

             {/* Before/After Comparison */}
       {processedFiles.length > 0 && originalFileForComparison && (
         <ImageComparison
           originalImageUrl={URL.createObjectURL(originalFileForComparison)}
           processedImageUrl={processedFiles[selectedComparisonIndex]?.url || ''}
           originalSize={processedFiles[selectedComparisonIndex]?.originalSize || 0}
           processedSize={processedFiles[selectedComparisonIndex]?.processedSize || 0}
           fileName={processedFiles[selectedComparisonIndex]?.name || ''}
         />
       )}
    </ToolPageLayout>
  );
}