import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Upload, Crop, Check } from 'lucide-react';
import { clsx } from 'clsx';
import '../../styles/cropping.css';

/**
 * ProfileImageCrop - Advanced image cropping modal with circular preview
 *
 * Features:
 * - Circular crop preview
 * - Zoom in/out functionality
 * - Drag to reposition
 * - Image rotation
 * - Modern UI with smooth animations
 */

const ProfileImageCrop = ({
  isOpen,
  onClose,
  onSave,
  initialImage = null,
  title = "Crop Profile Picture"
}) => {
  const [selectedImage, setSelectedImage] = useState(initialImage);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const imageRef = useRef(null);
  const cropAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedImage(initialImage);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setImageLoaded(false);
    }
  }, [isOpen, initialImage]);

  // Handle file upload
  const handleFileSelect = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target.result);
      setImageLoaded(false);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    // Auto-center and fit image
    if (imageRef.current && cropAreaRef.current) {
      const img = imageRef.current;
      const cropArea = cropAreaRef.current;
      const cropSize = 300; // Fixed crop circle size

      const imgAspectRatio = img.naturalWidth / img.naturalHeight;
      const minZoom = Math.max(
        cropSize / (img.naturalWidth * imgAspectRatio),
        cropSize / img.naturalHeight
      );

      setZoom(Math.max(1, minZoom));
    }
  }, []);

  // Handle zoom
  const handleZoom = useCallback((delta) => {
    setZoom(prev => {
      const newZoom = prev + delta;
      return Math.max(0.5, Math.min(3, newZoom));
    });
  }, []);

  // Handle mouse/touch events for dragging
  const handleMouseDown = useCallback((e) => {
    if (!imageLoaded) return;

    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  }, [imageLoaded, position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Generate cropped image
  const getCroppedImage = useCallback(() => {
    if (!imageRef.current || !imageLoaded) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Set output size
    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calculate crop area
    const cropSize = 300;
    const scale = img.naturalWidth / (img.offsetWidth || 300);
    const centerX = position.x * scale + img.naturalWidth / 2;
    const centerY = position.y * scale + img.naturalHeight / 2;
    const radius = (cropSize / 2 / zoom) * scale;

    // Create circular clip path
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    ctx.clip();

    // Apply rotation if any
    if (rotation !== 0) {
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-outputSize / 2, -outputSize / 2);
    }

    // Draw cropped image
    ctx.drawImage(
      img,
      centerX - radius,
      centerY - radius,
      radius * 2,
      radius * 2,
      0,
      0,
      outputSize,
      outputSize
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  }, [imageLoaded, position, zoom, rotation]);

  // Handle save
  const handleSave = async () => {
    const croppedImage = getCroppedImage();
    if (!croppedImage || !onSave) return;

    setSaving(true);
    try {
      await onSave(croppedImage);
      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="modal-content w-full max-w-lg bg-dark-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!selectedImage ? (
            // Upload Area
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-white/40" />
                <p className="text-white/60 mb-2">Click to upload an image</p>
                <p className="text-sm text-white/40">PNG, JPG up to 10MB</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            // Crop Area
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative">
                {/* Crop container */}
                <div
                  ref={cropAreaRef}
                  className="relative w-80 h-80 mx-auto bg-dark-900 rounded-full overflow-hidden"
                  style={{ width: '300px', height: '300px' }}
                >
                  {/* Background overlay */}
                  <div className="absolute inset-0 bg-black/60 z-10 pointer-events-none">
                    {/* Circular hole for crop preview */}
                    <div
                      className="crop-preview-ring absolute top-1/2 left-1/2 border-4 border-emerald-400 rounded-full bg-transparent"
                      style={{
                        width: '280px',
                        height: '280px',
                        marginLeft: '-140px',
                        marginTop: '-140px',
                      }}
                    />
                  </div>

                  {/* Draggable image */}
                  <img
                    ref={imageRef}
                    src={selectedImage}
                    alt="Crop preview"
                    className={clsx(
                      'crop-image absolute top-1/2 left-1/2 select-none',
                      isDragging && 'dragging'
                    )}
                    style={{
                      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                    onLoad={handleImageLoad}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </div>

                {/* Crop guide text */}
                <p className="text-center text-sm text-white/40 mt-2">
                  Drag to reposition • Scroll to zoom
                </p>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                {/* Zoom Controls */}
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => handleZoom(-0.1)}
                    disabled={zoom <= 0.5}
                    className="crop-control-button p-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 rounded-lg transition-colors"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>

                  <div className="flex-1 px-4">
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="zoom-slider w-full"
                    />
                  </div>

                  <button
                    onClick={() => handleZoom(0.1)}
                    disabled={zoom >= 3}
                    className="crop-control-button p-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 rounded-lg transition-colors"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>

                {/* Additional Controls */}
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setRotation(prev => prev - 90)}
                    className="crop-control-button px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm flex items-center space-x-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Rotate</span>
                  </button>

                  <button
                    onClick={() => {
                      setZoom(1);
                      setPosition({ x: 0, y: 0 });
                      setRotation(0);
                    }}
                    className="crop-control-button px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                  >
                    Reset
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="crop-control-button px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm flex items-center space-x-1"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Change</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedImage && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={!imageLoaded || saving}
              className={clsx(
                'px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all active:scale-95',
                saving || !imageLoaded
                  ? 'bg-emerald-500/50 text-white/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl'
              )}
            >
              {saving ? (
                <>
                  <div className="crop-loading-spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Hidden canvas for generating cropped image */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ProfileImageCrop;