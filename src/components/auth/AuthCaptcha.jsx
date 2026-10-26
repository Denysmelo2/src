// hCaptcha for the auth forms: sign up, sign in, forgot password and
// resend confirmation (handover 25/10/2026, task 5).
//
// Supabase checks the token itself once captcha protection is on
// (Dashboard → Authentication → Attack Protection → hCaptcha, with the
// hCaptcha SECRET key there). The browser only needs the SITE key, in
// the Vercel variable VITE_HCAPTCHA_SITE_KEY.
//
// Order: set VITE_HCAPTCHA_SITE_KEY and redeploy, check the widget shows,
// then turn protection on in Supabase. Until the variable holds a real
// site key (hCaptcha site keys are UUIDs) no widget is shown and the
// forms work as before, so this can ship before the Supabase switch.
// A key in any other shape (such as a secret key, which starts with
// "ES_") is ignored on purpose.
//
// A token is good for one request, so every form calls reset() after
// each attempt, whether it worked or not.

import React, { useCallback, useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const SITE_KEY = (import.meta.env.VITE_HCAPTCHA_SITE_KEY || '').trim();

export const captchaEnabled =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(SITE_KEY);

export function useAuthCaptcha({ size = 'normal' } = {}) {
  const ref = useRef(null);
  const [token, setToken] = useState(null);

  const reset = useCallback(() => {
    setToken(null);
    ref.current?.resetCaptcha();
  }, []);

  const widget = captchaEnabled ? (
    <div className="flex justify-center">
      <HCaptcha
        ref={ref}
        sitekey={SITE_KEY}
        size={size}
        onVerify={setToken}
        onExpire={() => setToken(null)}
        onError={() => setToken(null)}
      />
    </div>
  ) : null;

  return {
    widget,
    // Pass straight into the Supabase call; undefined when off.
    token: token || undefined,
    // The form may be sent: always when captcha is off.
    ready: !captchaEnabled || !!token,
    reset,
  };
}
