import { useEffect, useRef } from 'react';

export default function GoogleLoginButton({ onAuth, clientId }) {
  const buttonRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!clientId || initializedRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onAuth(response.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'icon',
          theme: 'filled_blue',
          size: 'large',
          shape: 'circle',
        });
        initializedRef.current = true;
      }
    };
    document.head.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [clientId, onAuth]);

  if (!clientId) return null;
  return <div ref={buttonRef} className="flex justify-center" style={{ minHeight: '48px' }} />;
}
