import { IBM_Plex_Mono, Instrument_Serif, Inter_Tight } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import SiteShell from '@/components/SiteShell';

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif' });
const sans = Inter_Tight({ subsets: ['latin'], variable: '--font-sans' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

const SITE_URL = 'https://hollowtide.paolomeccariello.dev';
const DESCRIPTION = 'Hollowtide is a game studio making dreamlike worlds where memory erodes and nothing stays where you left it.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Hollowtide', template: '%s · Hollowtide' },
  description: DESCRIPTION,
  openGraph: {
    title: 'Hollowtide',
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Hollowtide',
    images: ['/images/projects/the-long-hallway/cover.jpg'],
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport = {
  themeColor: '#0b0d0c',
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
        <Script defer src="https://analytics.paolomeccariello.dev/script.js" data-website-id="fd635aa9-cd11-49dd-96dd-a71d82078c9d" />
      </body>
    </html>
  );
}
