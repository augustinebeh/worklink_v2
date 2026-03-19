import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import '../../styles/cropping.css';
import CropPreview from './CropPreview';
import CropControls from './CropControls';

/**
 * ProfileImageCrop - Modal orchestrator for image cropping
 *
 * Visual sections split into:
 * - CropPreview.jsx (crop area with drag/zoom/pinch interactions)
 * - CropControls.jsx (footer buttons: change photo, cancel, save)
 *
 * This parent manages:
 * - Modal open/close and scroll lock
 * - Image selection and file handling
 * - Crop state (zoom, position, dragging)
 * - Generating the cropped output via canvas
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
  const [saving, setSaving] = useState(false);

  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Enhanced scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const scrollY = window.scrollY;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';

      const preventTouchMove = (e) => {
        if (e.target.closest('.crop-modal-content')) return;
        e.preventDefault();
      };

      document.addEventListener('touchmove', preventTouchMove, { passive: false });
      document.addEventListener('wheel', preventTouchMove, { passive: false });

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.paddingRight = '';
        window.scrollTo(0, scrollY);
        document.removeEventListener('touchmove', preventTouchMove);
        document.removeEventListener('wheel', preventTouchMove);
      };
    }
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedImage(initialImage);
      setZoom(1.2);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setIsDragging(false);
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
    if (imageRef.current) {
      const img = imageRef.current;
      const cropSize = 280;
      const minZoomWidth = cropSize / img.offsetWidth;
      const minZoomHeight = cropSize / img.offsetHeight;
      const minZoom = Math.max(minZoomWidth, minZoomHeight, 0.8);
      setZoom(Math.max(minZoom, 1.2));
    }
  }, []);

  // Generate cropped image
  const getCroppedImage = useCallback(() => {
    if (!imageRef.current || !imageLoaded) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const cropSize = 280;
    const scale = img.naturalWidth / img.offsetWidth;
    const centerX = (-position.x * scale) + (img.naturalWidth / 2);
    const centerY = (-position.y * scale) + (img.naturalHeight / 2);
    const radius = (cropSize / 2 / zoom) * scale;

    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    ctx.clip();
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
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleBackdropScroll = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleBackdropTouchMove = useCallback((e) => {
    if (e.target.closest('.crop-modal-content')) return;
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

        {/* Content - Crop Preview */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center">
          <CropPreview
            selectedImage={selectedImage}
            imageLoaded={imageLoaded}
            zoom={zoom}
            position={position}
            isDragging={isDragging}
            onImageLoad={handleImageLoad}
            onPositionChange={setPosition}
            onZoomChange={setZoom}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            imageRef={imageRef}
            onSelectFile={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Footer - Crop Controls */}
        {selectedImage && (
          <CropControls
            imageLoaded={imageLoaded}
            saving={saving}
            onSave={handleSave}
            onClose={onClose}
            onChangePhoto={() => fileInputRef.current?.click()}
          />
        )}

        {/* Hidden canvas for generating cropped image */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

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
