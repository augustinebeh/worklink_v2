import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Check } from 'lucide-react';
import { clsx } from 'clsx';
import '../../styles/cropping.css';

/**
 * ProfileImageCrop - Modern image cropping modal with natural gestures
 *
 * Features:
 * - Circular crop preview
 * - Pinch-to-zoom and mouse wheel zoom
 * - Natural drag to reposition
 * - Screen-contained modal with scroll lock
 * - 60fps smooth interactions
 * - Clean, minimal design
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  // Touch/pinch state
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const [touches, setTouches] = useState([]);

  const imageRef = useRef(null);
  const cropAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const modalRef = useRef(null);

  // Enhanced scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store original values
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;

      // Get current scroll position
      const scrollY = window.scrollY;

      // Apply enhanced scroll lock
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';

      // Prevent touch scrolling on iOS
      const preventTouchMove = (e) => {
        // Allow scrolling within the modal content
        if (e.target.closest('.crop-modal-content')) {
          return;
        }
        e.preventDefault();
      };

      // Add touch event listeners
      document.addEventListener('touchmove', preventTouchMove, { passive: false });
      document.addEventListener('wheel', preventTouchMove, { passive: false });

      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.paddingRight = '';

        // Restore scroll position
        window.scrollTo(0, scrollY);

        // Remove event listeners
        document.removeEventListener('touchmove', preventTouchMove);
        document.removeEventListener('wheel', preventTouchMove);
      };
    }
  }, [isOpen]);

  // Calculate distance between two touch points
  const getTouchDistance = (touches) => {
    if (touches.length < 2) return null;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedImage(initialImage);
      setZoom(1.2); // Start with slight zoom for better UX
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setIsDragging(false);
      setInitialPinchDistance(null);
      setTouches([]);
    }
  }, [isOpen, initialImage]);

  // Handle file upload
  const handleFileSelect = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target.result);
      setImageLoaded(false);
      setZoom(1.2);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle image load - auto-fit image to circle
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    if (imageRef.current && cropAreaRef.current) {
      const img = imageRef.current;
      const cropSize = 280; // Circle diameter

      // Calculate minimum zoom to fill the circle
      const imgAspectRatio = img.naturalWidth / img.naturalHeight;
      const minZoomWidth = cropSize / img.offsetWidth;
      const minZoomHeight = cropSize / img.offsetHeight;
      const minZoom = Math.max(minZoomWidth, minZoomHeight, 0.8);

      setZoom(Math.max(minZoom, 1.2));
    }
  }, []);

  // Handle wheel zoom (desktop)
  const handleWheel = useCallback((e) => {
    if (!imageLoaded || isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
  }, [imageLoaded, isDragging]);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (!imageLoaded) return;

    e.preventDefault();
    const touchList = Array.from(e.touches);
    setTouches(touchList);

    if (e.touches.length === 1) {
      // Single touch - start dragging
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      setIsDragging(false);
      const distance = getTouchDistance(touchList);
      setInitialPinchDistance(distance);
      setInitialZoom(zoom);
    }
  }, [imageLoaded, position, zoom]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (!imageLoaded) return;

    e.preventDefault();
    e.stopPropagation();

    const touchList = Array.from(e.touches);

    if (e.touches.length === 1 && isDragging) {
      // Single touch drag
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && initialPinchDistance) {
      // Pinch zoom
      const distance = getTouchDistance(touchList);
      if (distance && initialPinchDistance) {
        const scale = distance / initialPinchDistance;
        const newZoom = initialZoom * scale;
        setZoom(Math.max(0.5, Math.min(4, newZoom)));
      }
    }
  }, [imageLoaded, isDragging, dragStart, initialPinchDistance, initialZoom]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setInitialPinchDistance(null);
      setTouches([]);
    } else if (e.touches.length === 1) {
      // One finger left, switch back to drag mode
      setInitialPinchDistance(null);
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  }, [position]);

  // Handle mouse events (desktop)
  const handleMouseDown = useCallback((e) => {
    if (!imageLoaded || e.touches) return; // Ignore if touch events

    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [imageLoaded, position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || e.touches) return; // Ignore if touch events

    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    const cropArea = cropAreaRef.current;
    if (!cropArea) return;

    // Add wheel listener for zoom
    cropArea.addEventListener('wheel', handleWheel, { passive: false });

    // Add global mouse listeners for dragging
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      cropArea.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, isDragging, handleMouseMove, handleMouseUp]);

  // Generate cropped image
  const getCroppedImage = useCallback(() => {
    if (!imageRef.current || !imageLoaded) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Set output size (high quality)
    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calculate crop area
    const cropSize = 280; // Circle diameter in UI
    const scale = img.naturalWidth / img.offsetWidth;
    const centerX = (-position.x * scale) + (img.naturalWidth / 2);
    const centerY = (-position.y * scale) + (img.naturalHeight / 2);
    const radius = (cropSize / 2 / zoom) * scale;

    // Clear canvas
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Create circular clip path
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    ctx.clip();

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

    return canvas.toDataURL('image/jpeg', 0.95);
  }, [imageLoaded, position, zoom]);

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

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Prevent scroll events on backdrop
  const handleBackdropScroll = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleBackdropTouchMove = useCallback((e) => {
    // Allow scrolling within modal content
    if (e.target.closest('.crop-modal-content')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="crop-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onWheel={handleBackdropScroll}
      onTouchMove={handleBackdropTouchMove}
      style={{ touchAction: 'none' }}
    >
      <div className="crop-modal-content w-full max-w-md bg-dark-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center">
          {!selectedImage ? (
            // Upload Area
            <div className="w-full space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-white/40" />
                <p className="text-white/80 mb-1 font-medium">Choose your photo</p>
                <p className="text-sm text-white/50">PNG, JPG up to 10MB</p>
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
            <div className="w-full space-y-6">
              {/* Instructions */}
              <div className="text-center">
                <p className="text-white/80 text-sm">Position and resize your photo</p>
                <p className="text-white/50 text-xs mt-1">
                  {window.innerWidth < 768 ? 'Pinch to zoom • Drag to move' : 'Scroll to zoom • Drag to move'}
                </p>
              </div>

              {/* Crop container */}
              <div className="flex justify-center">
                <div
                  ref={cropAreaRef}
                  className="crop-container relative bg-dark-900 rounded-full overflow-hidden touch-none select-none"
                  style={{ width: '280px', height: '280px' }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Draggable image */}
                  <img
                    ref={imageRef}
                    src={selectedImage}
                    alt="Crop preview"
                    className={clsx(
                      'crop-image absolute top-1/2 left-1/2 select-none pointer-events-none',
                      isDragging && 'is-dragging'
                    )}
                    style={{
                      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      willChange: 'transform',
                    }}
                    onMouseDown={handleMouseDown}
                    onLoad={handleImageLoad}
                    onDragStart={(e) => e.preventDefault()}
                    draggable={false}
                  />

                  {/* Crop circle overlay */}
                  <div
                    className="crop-overlay absolute inset-0 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at center, transparent 138px, rgba(0,0,0,0.7) 140px)'
                    }}
                  />

                  {/* Circle border */}
                  <div className="crop-border absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedImage && (
          <div className="flex items-center justify-between p-4 border-t border-white/10 flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-white/60 hover:text-white transition-colors text-sm"
            >
              Change Photo
            </button>

            <div className="flex items-center space-x-3">
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
                  'px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200',
                  saving || !imageLoaded
                    ? 'bg-emerald-500/50 text-white/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
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