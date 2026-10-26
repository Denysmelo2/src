
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { PasswordInput, isPasswordValid } from '@/components/auth/PasswordInput';
import { useAuthCaptcha } from '@/components/auth/AuthCaptcha';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { staggerChildren: 0.1 } 
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

function AuthForm({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const captcha = useAuthCaptcha();
  const isLogin = mode === 'login';
  const redirectTo = location.state?.from?.pathname || '/home';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!captcha.ready) {
      toast({
        title: 'Please confirm you are human',
        description: 'Tick the box above the button, then try again.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    let sent = false;
    try {
      if (isLogin) {
        sent = true;
        const { error } = await signIn(email, password, captcha.token);
        if (!error) {
          navigate(redirectTo, { replace: true });
        }
      } else {
        // Phone is OPTIONAL (2026-10-17, legal package C: the Privacy
        // Policy says optional and nothing depends on it; the signup
        // trigger handle_new_user() stores NULL when it is blank).
        // When given, keep the basic UK format check: +44 or 0 prefix,
        // 10-11 digits.
        const phoneClean = phone.replace(/\s|-/g, '');
        if (phoneClean && !/^(\+44|0)\d{9,10}$/.test(phoneClean)) {
          toast({
            title: 'Invalid phone',
            description: 'Use a valid UK number (e.g. 07123456789 or +447123456789), or leave it blank.',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
        // Password policy: 8+ chars, upper, lower, special
        if (!isPasswordValid(password)) {
          toast({
            title: 'Password too weak',
            description: 'Your password must meet all 4 requirements shown.',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          toast({
            title: 'Passwords do not match',
            description: 'Re-type both fields so they match exactly.',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
        sent = true;
        const { error } = await signUp(email, password, {
          data: phoneClean ? { name, phone: phoneClean } : { name },
          captchaToken: captcha.token,
        });
        if (!error) {
          toast({
            title: 'Account created — 7-day trial started',
            description: 'Check your email to confirm, then sign in.',
          });
          navigate('/auth/login', { replace: true });
        }
      }
    } finally {
      // A captcha token is spent by the request, used or not.
      if (sent) captcha.reset();
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold mb-2 text-center">{isLogin ? "Welcome back" : "Start your 7-day trial"}</h1>
        <p className="text-muted-foreground text-center mb-6">
          {isLogin
            ? "Sign in to access your dashboard."
            : "Free for 7 days. No card required. Nothing to cancel: the trial simply ends."}
        </p>
      </motion.div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <motion.div variants={itemVariants} className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          </motion.div>
        )}
        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </motion.div>
        {!isLogin && (
          <motion.div variants={itemVariants} className="space-y-2">
            <Label htmlFor="phone">
              UK phone number <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="07123 456 789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-2.5">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>
                If you add it, we use your number only to help identify your
                account and prevent duplicate or abusive sign-ups. We
                won&rsquo;t sell it or use it for marketing.
              </span>
            </div>
          </motion.div>
        )}
        <motion.div variants={itemVariants}>
          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            showValidation={!isLogin}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          {isLogin && (
            <div className="mt-2 text-right">
              <Link
                to="/auth/request-reset"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}
        </motion.div>
        {!isLogin && (
          <motion.div variants={itemVariants}>
            <PasswordInput
              id="confirm-password"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              matchAgainst={password}
              autoComplete="new-password"
            />
          </motion.div>
        )}
        {!isLogin && (
          <motion.p variants={itemVariants} className="text-xs text-muted-foreground leading-relaxed">
            By creating an account you agree to our{' '}
            <Link to="/terms-of-service" target="_blank" className="font-medium text-primary underline">
              Terms of Service
            </Link>{' '}
            and confirm you&rsquo;ve read our{' '}
            <Link to="/privacy-policy" target="_blank" className="font-medium text-primary underline">
              Privacy Policy
            </Link>
            . The 7-day free trial needs no card and ends automatically; it
            never turns into a paid plan unless you choose to subscribe.
            We&rsquo;ll only email you about your account unless you switch
            on optional emails in Settings.
          </motion.p>
        )}
        {captcha.widget && <motion.div variants={itemVariants}>{captcha.widget}</motion.div>}
        <motion.div variants={itemVariants}>
          <Button
            type="submit"
            disabled={submitting || !captcha.ready}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            {submitting
              ? (isLogin ? 'Signing in…' : 'Creating account…')
              : (isLogin ? 'Sign In' : 'Sign Up')}
          </Button>
        </motion.div>
      </form>

      <motion.div variants={itemVariants} className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        <span>or</span>
        <div className="flex-1 h-px bg-border" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <OAuthButtons disabled={submitting} />
        {isLogin && (
          <p className="text-xs text-muted-foreground text-center mt-3 leading-relaxed">
            New to SnapGain? Continuing with Google creates an account, which
            means you agree to our{' '}
            <Link to="/terms-of-service" target="_blank" className="text-primary underline">
              Terms
            </Link>{' '}
            and confirm you&rsquo;ve read our{' '}
            <Link to="/privacy-policy" target="_blank" className="text-primary underline">
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </motion.div>
      
      <motion.p variants={itemVariants} className="text-sm text-center text-muted-foreground mt-6">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={() => navigate(isLogin ? '/auth/signup' : '/auth/login')} className="font-semibold text-primary hover:underline">
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </motion.p>
    </motion.div>
  );
}

export default AuthForm;
