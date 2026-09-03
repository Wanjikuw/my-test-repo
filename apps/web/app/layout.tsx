import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Cosmetic Ingredient Allergy Checker',
  description: 'Check skincare ingredients against your skin profile.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
