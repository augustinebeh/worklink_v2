import {
  MailIcon,
  PhoneIcon,
  ShareIcon,
  CopyIcon,
  CheckIcon,
  AwardIcon,
  TrophyIcon,
  LogOutIcon,
  MessageCircleIcon,
  ExternalLinkIcon,
  BellIcon,
  XIcon,
} from 'lucide-react';
import { SectionHeader } from '../common';
import { MenuLink } from '../profile';
import { DEFAULTS } from '../../utils/constants';

export function ContactInfo({ user, onEdit }) {
  return (
    <div className="px-4 mt-6">
      <SectionHeader
        title="Contact Info"
        icon={MailIcon}
        actionLabel="Edit"
        onAction={onEdit}
        actionVariant="button"
      />
      <div className="space-y-3">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-theme-card/80 border border-white/[0.05]">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <MailIcon className="h-5 w-5 text-white/50" />
          </div>
          <span className="text-white">{user.email}</span>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-theme-card/80 border border-white/[0.05]">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <PhoneIcon className="h-5 w-5 text-white/50" />
          </div>
          <span className="text-white">{user.phone || DEFAULTS.userPhone}</span>
        </div>
      </div>
    </div>
  );
}

export function ReferralCard({ referralCode, referralBonus, copied, onCopy, onShare }) {
  return (
    <div className="px-4 mt-6">
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20" />
        <div className="absolute inset-0 border border-emerald-500/30 rounded-2xl" />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShareIcon className="h-5 w-5 text-emerald-400" />
              <span className="text-white font-semibold">Referral Code</span>
            </div>
            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">Earn ${referralBonus}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-3 rounded-xl bg-theme-card border border-white/[0.05]">
              <p className="font-mono text-xl text-white tracking-widest text-center">{referralCode}</p>
            </div>
            <button onClick={onCopy} className="p-3 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
              {copied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
            </button>
            <button
              onClick={onShare}
              className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileMenuItems({
  referralBonus,
  user,
  pushNotifications,
  onNavigate,
  onConnectTelegram,
  onTogglePush,
  onLogout,
}) {
  return (
    <div className="px-4 mt-6 space-y-2">
      <MenuLink icon={ShareIcon} label="Refer & Earn" sublabel={`Invite friends, get $${referralBonus}`} onClick={() => onNavigate('/referrals')} />
      <MenuLink icon={AwardIcon} label="Achievements" onClick={() => onNavigate('/achievements')} />
      <MenuLink icon={TrophyIcon} label="Leaderboard" onClick={() => onNavigate('/leaderboard')} />
      <MenuLink
        icon={MessageCircleIcon}
        label="Connect Telegram"
        sublabel={user.telegram_chat_id ? 'Connected' : 'Get notifications'}
        onClick={onConnectTelegram}
        badge={user.telegram_chat_id ? '✓ Connected' : null}
      />
      {pushNotifications.isSupported && (
        <MenuLink
          icon={BellIcon}
          label="Push Notifications"
          sublabel={
            pushNotifications.permission === 'denied'
              ? 'Blocked in browser settings'
              : pushNotifications.isSubscribed ? 'Receive instant alerts' : 'Enable job alerts'
          }
          onClick={onTogglePush}
          badge={pushNotifications.isLoading ? '...' : pushNotifications.isSubscribed ? '✓ Enabled' : null}
        />
      )}
      <MenuLink icon={LogOutIcon} label="Log Out" onClick={onLogout} danger />
    </div>
  );
}

export function TelegramModal({ isOpen, onClose, loading, telegramCode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-theme-card border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Connect Telegram</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5">
            <XIcon className="h-5 w-5 text-white/50" />
          </button>
        </div>
        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-white/50">Generating code...</p>
          </div>
        ) : telegramCode ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-white/5 text-sm text-white/60">
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Telegram</li>
                <li>Search for <span className="text-blue-400">@WorkLinkAdminBot</span></li>
                <li>Send the code below</li>
              </ol>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border-2 border-dashed border-white/20 text-center">
              <span className="text-3xl font-mono font-bold text-white tracking-widest">{telegramCode.code}</span>
            </div>
            <a
              href={telegramCode.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500 text-white font-medium"
            >
              <ExternalLinkIcon className="h-5 w-5" />
              Open Telegram
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
