import { Check } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * CropControls - Footer controls for the image crop modal
 *
 * Displays:
 * - Change Photo button
 * - Cancel button
 * - Save button with loading state
 */
const CropControls = ({
  imageLoaded,
  saving,
  onSave,
  onClose,
  onChangePhoto,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-t border-white/10 flex-shrink-0">
      <button
        onClick={onChangePhoto}
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
          onClick={onSave}
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
  );
};

export default CropControls;
