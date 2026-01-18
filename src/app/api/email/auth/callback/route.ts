// Gmail OAuth callback handler
import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client, getTokensFromCode, tokenStorage } from '@/lib/gmail/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        console.error('OAuth error:', error);
        return NextResponse.redirect(new URL('/emails?error=auth_failed', request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/emails?error=no_code', request.url));
    }

    try {
        const oauth2Client = createOAuth2Client();
        const tokens = await getTokensFromCode(oauth2Client, code);

        // For demo purposes, use a simple session ID
        // In production, this should be tied to your app's auth system
        const sessionId = crypto.randomUUID();

        // Store tokens
        await tokenStorage.saveTokens(sessionId, tokens);

        // Set session cookie
        const cookieStore = await cookies();
        cookieStore.set('gmail_session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        // Redirect back to emails page
        return NextResponse.redirect(new URL('/emails?success=connected', request.url));
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        return NextResponse.redirect(new URL('/emails?error=token_exchange', request.url));
    }
}
