import { useRef, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * CropPreview - Image crop area with drag/zoom/pinch interactions
 *
 * Handles:
 * - Circular crop container with overlay
 * - Mouse drag to reposition
 * - Mouse wheel zoom (desktop)
 * - Touch drag and pinch-to-zoom (mobile)
 * - 60fps smooth interactions
 */
const CropPreview = ({
  selectedImage,
  imageLoaded,
  zoom,
  position,
  isDragging,
  onImageLoad,
  onPositionChange,
  onZoomChange,
  onDragStart,
  onDragEnd,
  imageRef,
  onSelectFile,
}) => {
  const cropAreaRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef(null);
  const initialZoomRef = useRef(1);

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

  // Handle wheel zoom (desktop)
  const handleWheel = useCallback((e) => {
    if (!imageLoaded || isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    onZoomChange(prev => Math.max(0.5, Math.min(4, prev + delta)));
  }, [imageLoaded, isDragging, onZoomChange]);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (!imageLoaded) return;

    e.preventDefault();
    const touchList = Array.from(e.touches);

    if (e.touches.length === 1) {
      onDragStart();
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      };
    } else if (e.touches.length === 2) {
      onDragEnd();
      const distance = getTouchDistance(touchList);
      initialPinchDistanceRef.current = distance;
      initialZoomRef.current = zoom;
    }
  }, [imageLoaded, position, zoom, onDragStart, onDragEnd]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (!imageLoaded) return;

    e.preventDefault();
    e.stopPropagation();

    const touchList = Array.from(e.touches);

    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      onPositionChange({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y
      });
    } else if (e.touches.length === 2 && initialPinchDistanceRef.current) {
      const distance = getTouchDistance(touchList);
      if (distance && initialPinchDistanceRef.current) {
        const scale = distance / initialPinchDistanceRef.current;
        const newZoom = initialZoomRef.current * scale;
        onZoomChange(() => Math.max(0.5, Math.min(4, newZoom)));
      }
    }
  }, [imageLoaded, isDragging, onPositionChange, onZoomChange]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      onDragEnd();
      initialPinchDistanceRef.current = null;
    } else if (e.touches.length === 1) {
      initialPinchDistanceRef.current = null;
      onDragStart();
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      };
    }
  }, [position, onDragStart, onDragEnd]);

  // Handle mouse events (desktop)
  const handleMouseDown = useCallback((e) => {
    if (!imageLoaded || e.touches) return;

    e.preventDefault();
    onDragStart();
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  }, [imageLoaded, position, onDragStart]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || e.touches) return;

    e.preventDefault();
    onPositionChange({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  }, [isDragging, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  // Add/remove event listeners
  useEffect(() => {
    const cropArea = cropAreaRef.current;
    if (!cropArea) return;

    cropArea.addEventListener('wheel', handleWheel, { passive: false });

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

  if (!selectedImage) {
    return (
      <div className="w-full space-y-4">
        <div
          onClick={onSelectFile}
          className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-white/40" />
          <p className="text-white/80 mb-1 font-medium">Choose your photo</p>
          <p className="text-sm text-white/50">PNG, JPG up to 10MB</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <p className="text-white/80 text-sm">Position and resize your photo</p>
        <p className="text-white/50 text-xs mt-1">
          {window.innerWidth < 768 ? 'Pinch to zoom \u2022 Drag to move' : 'Scroll to zoom \u2022 Drag to move'}
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
            onLoad={onImageLoad}
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
  );
};

export default CropPreview;
