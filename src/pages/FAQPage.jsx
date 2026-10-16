import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Header } from '@/components/layout/Header';   // ✅ ADICIONAR
import { Footer } from '@/components/layout/Footer';   // ✅ ADICIONAR
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const faqs = [
  {
    question: "How does the free trial work?",
    answer: "Get full access to SnapGain for 3 days completely free. No credit card required. Compare unlimited rewards and test all features."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes! Cancel your subscription at any time. No long-term commitments or cancellation fees."
  },
  {
    question: "How accurate are the rates?",
    answer: "We update rates in real-time from official sources. Rates are typically accurate within minutes of changes."
  },
  {
    question: "Do you earn from affiliate links?",
    answer: "Yes, we earn small commissions when you use our affiliate links. This helps keep SnapGain running while costing you nothing extra."
  },
  {
    question: "Which UK platforms do you support?",
    answer: "We compare UK cashback platforms such as Quidco and Picodi, discounted gift card apps such as JamDoughnut, EverUp and Cheddar, and British Airways Avios shopping."
  },
  {
    question: "Is my personal data secure?",
    answer: "Absolutely. We use industry-standard encryption and never store your banking details. We only access publicly available cashback rates."
  },
  {
    question: "How much can I really save?",
    answer: "Most users save between £200-£500 per year by optimizing their cashback strategy. Heavy shoppers can save even more."
  }
];

function FAQPage() {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <>
      <Helmet>
        <title>FAQ - SnapGain</title>
        <meta name="description" content="Frequently asked questions about SnapGain's cashback comparison service." />
      </Helmet>
      
       <Header />  {/* ✅ ADICIONAR HEADER */}

      <div className="container mx-auto px-4 py-12 pt-32">
        <motion.div 
          className="max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about SnapGain and how it helps you maximize your cashback rewards.
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleItem(index)}
                      className="w-full text-left p-6 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between"
                    >
                      <span className="text-lg font-semibold pr-4">{faq.question}</span>
                      {openItems.has(index) ? (
                        <ChevronUp className="h-5 w-5 text-[#7D4DFB] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[#7D4DFB] flex-shrink-0" />
                      )}
                    </button>
                    {openItems.has(index) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200"
                      >
                        <div className="p-6 pt-4">
                          <p className="text-muted-foreground">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Savings Banner */}
          <motion.div 
            className="mt-16 bg-gradient-to-r from-[#99FF33] to-[#BFFFB4] rounded-2xl p-8 text-center"
            variants={itemVariants}
          >
            <div className="flex justify-center mb-4">
              <TrendingUp className="h-12 w-12 text-gray-800" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Typical SnapGain user saves £200+ per year
            </h2>
            <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
              With smarter reward strategies and real-time optimization, most users recover their subscription cost within the first month.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="bg-white text-gray-800 px-6 py-3 rounded-full font-semibold">
                Average Savings: £200/year
              </div>
              <div className="bg-gray-800 text-white px-6 py-3 rounded-full font-semibold">
                ROI: 2000%+
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <Footer />  {/* ✅ ADICIONAR FOOTER */}
    </>
  );
}

export default FAQPage;