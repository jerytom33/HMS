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

  // Protect all /student routes EXCEPT /student/login
  if (pathname.startsWith('/student') && pathname !== '/student/login') {
    const token = request.cookies.get('hms-student-token')?.value;

    // In a real app, you would also verify the token signature/validity here or via a backend call.
    // For now, checking existence is sufficient for route protection.
    if (!token) {
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
