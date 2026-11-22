import React from 'react';
import { motion } from 'framer-motion';

/**
 * SplashScreen — branded loading state shown while auth/profile are
 * resolving. Replaces the bare spinner that ProtectedRoute used to show.
 */
export function SplashScreen({ message = 'Loading SnapGain…' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-light-pink/40 via-background to-light-green/30 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-6"
      >
        <motion.img
          src="/snapgain-logo.png"
          alt="SnapGain"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-44 md:w-56 mx-auto object-contain"
        />
        <p className="text-sm text-muted-foreground -mt-2">
          Save time. Save money. Every time.
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse [animation-delay:300ms]" />
        </div>
        <p className="text-xs text-muted-foreground sr-only">{message}</p>
      </motion.div>
    </div>
  );
}

export default SplashScreen;
