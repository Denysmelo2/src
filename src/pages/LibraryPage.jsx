import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EBOOKS, bookPath } from '@/lib/ebook';

function LibraryPage() {
  return (
    <>
      <Helmet>
        <title>Library — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Link
          to="/home"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Home
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            Library
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Read the SnapGain ebook here, then apply each strategy in the
            comparison app. The Introduction is free; the rest is for
            subscribers.
          </p>
        </motion.section>

        {EBOOKS.map((book) => (
          <Card key={book.slug} className="bg-gradient-to-br from-light-pink/40 to-light-green/40">
            <CardHeader>
              <CardTitle className="text-2xl">{book.title}</CardTitle>
              <CardDescription>{book.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={bookPath(book)}>
                  Read the ebook <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export default LibraryPage;
