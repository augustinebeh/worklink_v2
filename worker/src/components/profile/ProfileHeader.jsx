import {
  StarIcon,
  ZapIcon,
  SunIcon,
  MoonIcon,
  CameraIcon,
  FlameIcon,
  CircleIcon,
} from 'lucide-react';
import ProfileAvatar from '../ui/ProfileAvatar';
import XPBar from '../gamification/XPBar';
import { calculateLevel, LEVEL_TITLES as levelTitles } from '../../../../shared/utils/gamification-browser';

// Profile Picture/Border Dropdown Menu
function ProfileActionDropdown({ isOpen, onClose, onSelectPhoto, onSelectBorder }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop to close dropdown */}
      <div className="fixed inset-0 z-[60]" onClick={onClose} />

      {/* Dropdown Menu */}
      <div
        className="absolute left-0 top-full mt-2 z-[70] w-56 rounded-xl bg-theme-card border border-white/10 shadow-xl shadow-black/50 overflow-hidden animate-dropdown"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onSelectPhoto}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
        >
          <CameraIcon className="h-5 w-5 text-emerald-400" />
          <span className="text-white text-sm">Change Picture</span>
        </button>

        <button
          onClick={onSelectBorder}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <CircleIcon className="h-5 w-5 text-violet-400" />
          <span className="text-white text-sm">Change Border</span>
        </button>
      </div>
    </>
  );
}

export default function ProfileHeader({
  user,
  userLevel,
  userXP,
  userRating,
  streakDays,
  uploadingPhoto,
  selectedBorderId,
  showProfileActionModal,
  onToggleProfileAction,
  onCloseProfileAction,
  onSelectPhoto,
  onSelectBorder,
  isDark,
  onToggleTheme,
}) {
  const userName = user.name || 'User';

  return (
    <div className="px-4 pt-4">
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Clickable Avatar with Dropdown */}
              <div className="relative">
                <button
                  onClick={onToggleProfileAction}
                  className="relative group"
                  disabled={uploadingPhoto}
                >
                  <ProfileAvatar
                    name={userName}
                    photoUrl={user.profile_photo}
                    level={userLevel}
                    size="xl"
                    showLevel={false}
                    selectedBorderId={selectedBorderId}
                  />
                  {uploadingPhoto ? (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-full flex items-center justify-center transition-all">
                      <CameraIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#0a1628] flex items-center justify-center">
                    <CameraIcon className="h-4 w-4 text-white" />
                  </div>
                </button>

                {/* Dropdown Menu */}
                <ProfileActionDropdown
                  isOpen={showProfileActionModal}
                  onClose={onCloseProfileAction}
                  onSelectPhoto={onSelectPhoto}
                  onSelectBorder={onSelectBorder}
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-white">
                  {userName}
                  {user.profile_flair && <span className="ml-1">{user.profile_flair}</span>}
                </h1>
                <p className="text-emerald-400 text-sm">{levelTitles[userLevel] || 'Newcomer'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StarIcon className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span className="text-white font-medium">{userRating.toFixed(1)}</span>
                  <span className="text-white/40 text-sm">rating</span>
                </div>
              </div>
            </div>

            <button
              onClick={onToggleTheme}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              {isDark ? <SunIcon className="h-5 w-5 text-amber-400" /> : <MoonIcon className="h-5 w-5 text-slate-400" />}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
              <ZapIcon className="h-4 w-4 text-violet-400" />
              <span className="text-violet-400 font-bold">Level {userLevel}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <FlameIcon className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 font-medium">{streakDays} day streak</span>
            </div>
          </div>

          <XPBar currentXP={userXP} level={userLevel} />
        </div>
      </div>
    </div>
  );
}
