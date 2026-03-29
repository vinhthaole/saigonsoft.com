
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import type { Metadata } from 'next'
import { getSiteConfig } from '@/lib/data';

const fontInter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getSiteConfig();
  const faviconUrl = siteConfig.header.faviconUrl || '/favicon.ico';
  
  return {
    title: {
      default: "Saigonsoft.com",
      template: `%s | Saigonsoft.com`
    },
    description: 'Saigonsoft.com - Cung cấp phần mềm bản quyền chính hãng.',
    icons: {
      icon: faviconUrl,
    },
  }
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={cn(fontInter.variable)} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
