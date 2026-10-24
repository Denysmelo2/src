// AuthLinkErrorRedirect: catches an email link Supabase rejected.
//
// When a confirmation (or reset) link is old or already used, Supabase
// sends the browser back to the site with the error in the address, e.g.
//   https://snapgain.uk/#error=access_denied&error_code=otp_expired
//     &error_description=Email+link+is+invalid+or+has+expired
// Nothing read it, so the person landed on the home page with no word
// of what happened (owner, 23/10/2026: signing up twice and clicking the
// first email). This sends them to the login page, which explains it and
// offers to send a new confirmation email.

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function readAuthLinkError(hash, search) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const query = new URLSearchParams(search || '');
  const code = params.get('error_code') || query.get('error_code');
  const error = params.get('error') || query.get('error');
  if (!code && !error) return null;
  return {
    code: code || error,
    description: params.get('error_description') || query.get('error_description') || '',
  };
}

export function AuthLinkErrorRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const found = readAuthLinkError(location.hash, location.search);
    if (!found) return;
    const reason = found.code === 'otp_expired' ? 'expired' : 'invalid';
    navigate(`/auth/login?link=${reason}`, { replace: true });
  }, [location.hash, location.search, navigate]);

  return null;
}

export default AuthLinkErrorRedirect;
