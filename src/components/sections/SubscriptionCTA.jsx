
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { MONTHLY, YEARLY, YEARLY_SAVING } from '@/config/pricing';

const PlanCard = ({ title, price, description, features, bestValue, onSelect }) => (
    <motion.div 
        variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
        className={`rounded-xl p-8 border-2 ${bestValue ? 'border-primary shadow-2xl' : 'border-border'} relative card-hover bg-card`}
    >
        {bestValue && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                Best Value
            </div>
        )}
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>
        <div className="text-4xl font-bold mb-6">{price}</div>
        
        <ul className="space-y-3 text-left mb-8">
            {features.map((feature, i) => (
                <li key={i} className="flex items-center">
                    <Check className="w-5 h-5 mr-3 text-green-500" />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
        
        <Button
            onClick={onSelect}
            className={`w-full ${bestValue ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
        >
            Get Started
        </Button>
    </motion.div>
);

export function SubscriptionCTA({ onSubscribe }) {
  const plans = {
      monthly: {
          title: 'Monthly',
          price: MONTHLY,
          description: 'Per month, billed monthly.',
          features: ['Unlimited comparisons', 'Real-time data', 'Personalized alerts'],
          bestValue: false
      },
      annual: {
          title: 'Annual',
          price: YEARLY,
          description: 'Per year, billed annually.',
          features: ['Unlimited comparisons', 'Real-time data', 'Personalized alerts', `Save ${YEARLY_SAVING} a year`],
          bestValue: true
      }
  };

  return (
    <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.2 }}
        className="text-center"
      >
        <motion.h2 
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
          className="text-4xl font-bold tracking-tight mb-4"
        >
          Unlock the Full Power of SnapGain
        </motion.h2>
        <motion.p 
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } } }}
          className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
        >
          Join thousands of smart shoppers. Start your 7-day free trial, then choose your plan.
        </motion.p>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PlanCard {...plans.monthly} onSelect={onSubscribe} />
          <PlanCard {...plans.annual} onSelect={onSubscribe} />
        </div>
      </motion.div>
  );
}
