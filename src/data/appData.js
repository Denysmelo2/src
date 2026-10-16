// UK-focused data for SnapGain UK
import { TrendingUp, Filter, Clock } from 'lucide-react';
import React from 'react';
import { ukBanks, ukRetailers, ukCashbackPlatforms, formatGBP } from './ukData.js';

export const stores = ukRetailers.map(retailer => ({
  id: retailer.id,
  name: retailer.name,
  logo: retailer.icon,
  isFavourite: retailer.popular,
  cashbackRate: retailer.cashbackRate,
  category: retailer.category
}));

export const rewardOptions = [
  {
    id: 'jamdoughnut',
    name: 'JamDoughnut',
    type: 'cashback',
    rate: '4-20%',
    amount: 8.50,
    icon: '🍩',
    description: 'Student & young professional cashback',
    clickCollect: true,
    affiliateLink: 'https://jamdoughnut.com/refer/snapgainuk',
    targetAudience: 'Students & Young Professionals'
  },
  {
    id: 'quidco',
    name: 'Quidco',
    type: 'cashback',
    rate: '2-6%',
    amount: 4.20,
    icon: '💳',
    description: 'UK\'s original cashback site',
    clickCollect: true,
    affiliateLink: 'https://www.quidco.com/raf/snapgainuk/'
  },
  {
    id: 'avios',
    name: 'British Airways eStore',
    type: 'points',
    rate: '1-6 Avios per £1',
    amount: 450,
    icon: '✈️',
    description: 'BA Avios points',
    clickCollect: false,
    affiliateLink: 'https://www.shopping.ba.com/'
  },
  {
    id: 'amex-gold',
    name: 'Amex Gold Card',
    type: 'points',
    rate: '1-2 pts/£',
    amount: 150,
    icon: '💎',
    description: 'Membership Rewards points',
    clickCollect: true,
    affiliateLink: '#'
  }
];

export const filterOptions = [
  { id: 'cashback', label: 'Cashback', icon: '💰' },
  { id: 'points', label: 'Points & Miles', icon: '✈️' },
  { id: 'student', label: 'Student Offers', icon: '🎓' },
  { id: 'gift-cards', label: 'Gift Cards', icon: '🎁' }
];

export const features = [
  {
    icon: <TrendingUp />,
    title: "Real-Time UK Comparison",
    description: "Compare Quidco, Picodi, JamDoughnut, EverUp and Cheddar offers side by side, with GBP calculations."
  },
  {
    icon: <Filter />,
    title: "UK-Focused Strategy",
    description: "Optimized for UK banks, retailers, and cashback platforms including student-specific offers."
  },
  {
    icon: <Clock />,
    title: "Maximize Every Pound",
    description: "Smart GBP calculations ensuring you get the best cashback rates across UK platforms."
  }
];

export const registrationOptions = {
  banks: ukBanks.map(bank => ({
    value: bank.id,
    label: bank.name,
    popular: bank.popular
  })),
  cards: [
    { value: 'amex-gold', label: 'Amex Gold' },
    { value: 'amex-platinum', label: 'Amex Platinum' },
    { value: 'barclays-avios', label: 'Barclays Avios Plus' },
    { value: 'chase-rewards', label: 'Chase Sapphire' },
    { value: 'virgin-atlantic-reward', label: 'Virgin Atlantic Reward' },
    { value: 'ba-premium', label: 'BA Premium Plus' }
  ],
  programmes: [
    { value: 'avios', label: 'British Airways Avios' },
    { value: 'nectar', label: 'Sainsbury\'s Nectar' },
    { value: 'clubcard', label: 'Tesco Clubcard' },
    { value: 'virgin-red', label: 'Virgin Red' },
    { value: 'mymarks', label: 'M&S Sparks' },
    { value: 'currys-rewards', label: 'Currys Smart Tech Rewards' }
  ],
  favourites: ukRetailers.filter(retailer => retailer.popular).map(retailer => ({
    value: retailer.id,
    label: retailer.name
  }))
};

export const cashbackPlatforms = ukCashbackPlatforms.map(platform => ({
  value: platform.id,
  label: platform.name,
  rate: platform.rate,
  specialFeature: platform.specialFeature
}));

// UK-specific currency formatting
export const formatCurrency = formatGBP;

// UK market metadata
export const marketConfig = {
  country: 'UK',
  currency: 'GBP',
  symbol: '£',
  locale: 'en-GB',
  primaryCashback: 'Quidco',
  studentCashback: 'JamDoughnut',
  marketplace: 'Amazon UK'
};

export default {
  stores,
  rewardOptions,
  filterOptions,
  features,
  registrationOptions,
  cashbackPlatforms,
  formatCurrency,
  marketConfig
};