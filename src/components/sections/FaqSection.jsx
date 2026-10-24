// FaqSection: the "Honest questions, straight answers" block. Shown on the
// landing page (#faq) and on its own at /faq (Cowork's 23/10 handover §4:
// /faq was a 404).

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-5 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
        aria-expanded={open}
      >
        <span className="text-lg font-semibold pr-4">{q}</span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="pb-5 text-muted-foreground">{a}</div>}
    </div>
  );
}

export function FaqSection() {
  const faqs = [
    {
      q: 'Do I need to stop using my current cashback app?',
      a: "No. SnapGain works alongside the apps you already use. We show which of the platforms we cover pays more for each store, and combinations of apps that can pay more together.",
    },
    {
      q: 'Is SnapGain itself a cashback app?',
      a: "No. SnapGain doesn't pay cashback. It compares the apps that do. Inside SnapGain you'll see which of the platforms we cover gives the best estimated return for each store, with a link to it (some links are affiliate links).",
    },
    {
      q: 'How is the data kept up to date?',
      a: 'We refresh rates from partner platforms and public sources on a regular schedule, and each rate shows the date it was last checked. Platforms can change offers at any time, so always check the offer on the platform before you buy.',
    },
    {
      q: 'Can I really stack offers?',
      a: "Sometimes. A stack that works: buy a discounted gift card with a card that earns points or cashback, then spend the gift card at the store. What doesn't: Quidco, NX Rewards and the Avios eStore pay nothing when you pay with a gift card, so SnapGain never adds a gift card to them and shows each as its own route instead. Always check the platform's terms before you rely on a stack.",
    },
    {
      q: 'What are minimum-rate offers?',
      a: "Some platforms promise a minimum return for retailers in their network, subject to their own conditions. When one applies to a store, SnapGain shows it alongside the other options.",
    },
    {
      q: 'Can my family use SnapGain?',
      a: "A SnapGain account is for one person, but you can use what you learn for the whole household's shopping. Some airline miles programmes also let people at the same address pool miles in a household miles account; our guide explains how to set one up.",
    },
    {
      q: 'How do you make money?',
      a: "From your subscription, and from commissions: some links on SnapGain are affiliate links, so the platform pays us if you sign up or buy through them. It doesn't change the price you pay. When you compare a store, routes are ordered by estimated value to you, and commission isn't part of that calculation. We don't show ads and we don't sell your data.",
    },
    {
      q: 'I already use a cashback app. What does SnapGain add?',
      a: "Three things: (1) it tells you when a different platform pays more on the same purchase, (2) it shows the gift-card and points stack you'd otherwise miss, (3) it estimates the travel-miles value of each option so you know which route gets you closer to your next flight.",
    },
  ];
  return (
    <section id="faq" className="container mx-auto px-4 py-20 md:py-28 max-w-3xl scroll-mt-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
          Honest questions, straight answers
        </h2>
      </div>

      <div>
        {faqs.map((f) => (
          <FAQItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
    </section>
  );
}

export default FaqSection;
