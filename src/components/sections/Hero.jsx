
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function Hero({ user, onSubscribe }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center"
    >
      <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter">
        Smarter Spending,
        <span className="block gradient-text">Maximum Rewards.</span>
      </h1>
      <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
        SnapGain compares cashback, points, and gift cards, with rates checked daily, so you can pick the best return on every purchase.
      </p>
      
      {!user && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button 
            onClick={onSubscribe}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 text-lg"
          >
            Get Started for Free
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
