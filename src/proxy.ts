import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Staff area needs a Payload login session; the API itself enforces access on every request
  if (pathname.startsWith('/staff') && !request.cookies.get('payload-token')?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Student pages need a portal session, except the login page and the bot's personal link
  // (/student/start). A browse session from that link only opens the room list.
  if (pathname.startsWith('/student') && pathname !== '/student/login' && pathname !== '/student/start') {
    // Signed cookies; every /api/student route checks the signature and what the session allows
    const session = request.cookies.get('hms-student-session')?.value;
    const browsing = pathname === '/student/rooms' && request.cookies.get('hms-student-browse')?.value;
    if (!session && !browsing) {
      const loginUrl = new URL('/student/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/student/:path*', '/staff/:path*'],
};
