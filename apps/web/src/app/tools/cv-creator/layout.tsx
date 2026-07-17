import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CV Creator',
  description:
    'Backend-owned CV builder: upload your CV, adapt it to a role, and export structured resume artifacts from the Mindris workspace.',
  alternates: {
    canonical: '/tools/cv-creator',
  },
};

export { default } from './page';
