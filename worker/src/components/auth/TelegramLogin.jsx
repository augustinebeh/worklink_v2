export default function TelegramLoginButton({ onAuth, botUsername }) {
  const handleTelegramLogin = () => {
    if (!botUsername) return;

    // Open Telegram login in popup
    const width = 550;
    const height = 650;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const authUrl = `https://oauth.telegram.org/auth?bot_id=${botUsername.replace('@', '')}&origin=${encodeURIComponent(window.location.origin)}&request_access=write&return_to=${encodeURIComponent(window.location.href)}`;

    const popup = window.open(
      authUrl,
      'telegram_oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    // Listen for auth callback
    const handleMessage = (event) => {
      if (event.origin === 'https://oauth.telegram.org') {
        if (event.data && event.data.auth_date) {
          popup?.close();
          onAuth(event.data);
          window.removeEventListener('message', handleMessage);
        }
      }
    };
    window.addEventListener('message', handleMessage);
  };

  if (!botUsername) return null;

  return (
    <button
      onClick={handleTelegramLogin}
      className="w-14 h-14 rounded-full bg-[#0088cc] hover:bg-[#0077b3] active:scale-95 transition-all flex items-center justify-center shadow-lg"
      title="Sign in with Telegram"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-7 h-7 text-white"
        fill="currentColor"
      >
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
      </svg>
    </button>
  );
}
