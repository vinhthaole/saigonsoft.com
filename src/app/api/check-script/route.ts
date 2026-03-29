import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/data';
import { JSDOM } from 'jsdom';

export async function GET() {
  try {
    const config = await getSiteConfig();
    const siteUrl = config.companyInfo?.websiteUrl;

    if (!siteUrl) {
      return NextResponse.json({ installed: false, error: 'Site URL not configured' });
    }

    const response = await fetch(siteUrl);
    const html = await response.text();
    const dom = new JSDOM(html);
    const scriptElement = dom.window.document.querySelector('script[data-app-id="pixel-script"]');
    
    if (scriptElement) {
      return NextResponse.json({ installed: true });
    } else {
      return NextResponse.json({ installed: false });
    }
  } catch (error) {
    console.error('Error checking script:', error);
    return NextResponse.json({ installed: false, error: 'Failed to check script installation' }, { status: 500 });
  }
}
