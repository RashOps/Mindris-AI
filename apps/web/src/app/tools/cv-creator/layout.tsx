import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CV Creator',
  description:
    'AI-powered CV builder: upload your CV, paste a job URL, and let Mindris AI tailor every bullet point for maximum ATS compatibility.',
  alternates: {
    canonical: '/tools/cv-creator',
  },
};

export { default } from './page';
