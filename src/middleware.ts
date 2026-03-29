import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const currentHost = request.headers.get('host') || '';

  // Skip middleware for API routes, Next.js assets, and static files
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Exempt development and cloud platform default domains from being redirected.
  // We only want to enforce the redirect on the actual custom domain.
  const devDomains = [
    'localhost', 
    '127.0.0.1', 
    'ngrok', 
    'loca.lt', 
    'run.app', 
    'vercel.app', 
    'web.app', 
    'firebaseapp.com'
  ];
  const isDevDomain = devDomains.some(domain => currentHost.includes(domain));
  if (isDevDomain) {
    return NextResponse.next();
  }

  try {
    // Fetch SiteConfig from Firestore REST API.
    // We use REST API because Firebase Admin/Client SDKs have limitations in the Edge Runtime.
    // We cache this heavily (60 seconds) so it doesn't slow down global requests.
    const projectId = 'saigonsoftcom-xrkmx';
    const configUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/site_config/main`;
    
    // next: { revalidate: 60 } caches the response at the Edge so we don't spam Firestore
    const res = await fetch(configUrl, {
      next: { revalidate: 60 }
    });

    if (res.ok) {
      const data = await res.json();
      const websiteUrl = data.fields?.companyInfo?.mapValue?.fields?.websiteUrl?.stringValue;
      
      if (websiteUrl) {
        const targetUrl = new URL(websiteUrl);
        const targetHost = targetUrl.host;

        // If the current host doesn't match the configured Website URL host, we redirect.
        // E.g. saigonsoft.com -> www.saigonsoft.com
        if (currentHost !== targetHost) {
          const newUrl = new URL(url.href);
          newUrl.protocol = targetUrl.protocol;
          newUrl.hostname = targetUrl.hostname;
          newUrl.port = targetUrl.port || ''; // Explicitly clear Cloud Run's internal 8080 port if target has no port
          
          return NextResponse.redirect(newUrl, { status: 308 }); // 308 Permanent Redirect for SEO
        }
      }
    }
  } catch (error) {
    // Fail silently so the site doesn't crash if Firebase is unreachable
    console.error("Middleware fetch error:", error);
  }

  return NextResponse.next();
}

// Only match HTML/page requests, exclude static files entirely from going through middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
