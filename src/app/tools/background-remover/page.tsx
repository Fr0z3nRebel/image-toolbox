"use client";

import { useState, useEffect, useRef } from "react";
import { Scissors, Wand2, Brush, Eraser, RotateCcw } from "lucide-react";
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
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Canvas refs for drawing mode
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load image for drawing mode
  useEffect(() => {
    if (mode === 'drawing' && files.length > 0 && !currentFile) {
      setCurrentFile(files[0]);
    }
  }, [mode, files, currentFile]);

  // Setup canvas for drawing mode
  useEffect(() => {
    if (mode === 'drawing' && currentFile && canvasRef.current && maskCanvasRef.current) {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');

      if (!ctx || !maskCtx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        maskCanvas.width = img.naturalWidth;
        maskCanvas.height = img.naturalHeight;

        ctx.drawImage(img, 0, 0);
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        setMaskCanvas(maskCanvas);
      };

      img.src = URL.createObjectURL(currentFile);
      return () => URL.revokeObjectURL(img.src);
    }
  }, [mode, currentFile]);

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
        mode === 'drawing' ? maskCanvas : undefined
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
  const getMousePos = (e: any) => {
    const canvas = canvasRef.current;
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
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
    ctx.fillStyle = tool === 'brush' ? 'black' : 'white';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleMouseDown = (e: any) => {
    e.preventDefault();
    const pos = getMousePos(e);
    setIsDrawing(true);
    draw(pos.x, pos.y);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getMousePos(e);
    draw(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
                  onClick={() => setTool('brush')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    tool === 'brush'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Brush className="h-4 w-4" />
                  Remove
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    tool === 'eraser'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Eraser className="h-4 w-4" />
                  Keep
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
                onClick={clearMask}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </button>
            </div>

            {/* Canvas */}
            <div className="relative bg-gray-50 rounded-lg p-4">
              <div className="relative inline-block">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="max-w-full max-h-96 border border-gray-300 rounded cursor-crosshair"
                />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 max-w-full max-h-96 opacity-30 pointer-events-none"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Red areas</strong> will be removed from the background.
                <strong> Blue areas</strong> will be preserved.
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
          originalImageUrl={originalFileForComparison.preview || ''}
          processedImageUrl={processedFiles[selectedComparisonIndex]?.url || ''}
          originalSize={processedFiles[selectedComparisonIndex]?.originalSize || 0}
          processedSize={processedFiles[selectedComparisonIndex]?.processedSize || 0}
          fileName={processedFiles[selectedComparisonIndex]?.name || ''}
        />
      )}
    </ToolPageLayout>
  );
}