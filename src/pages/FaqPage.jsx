// FaqPage: /faq on its own (it was a 404; Cowork's 23/10 handover §4).
// The questions live in FaqSection, shared with the landing page.

import React from 'react';
import { Helmet } from 'react-helmet';
import { FaqSection } from '@/components/sections/FaqSection';

function FaqPage() {
  return (
    <>
      <Helmet>
        <title>FAQ — SnapGain</title>
        <meta
          name="description"
          content="Straight answers about SnapGain: what it compares, how rates are kept up to date, stacking offers and how we make money."
        />
      </Helmet>
      <FaqSection />
    </>
  );
}

export default FaqPage;
