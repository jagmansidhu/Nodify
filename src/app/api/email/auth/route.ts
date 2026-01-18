// Gmail OAuth authentication route
import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client, getAuthUrl } from '@/lib/gmail/auth';

export async function GET(request: NextRequest) {
    try {
        const oauth2Client = createOAuth2Client();
        const authUrl = getAuthUrl(oauth2Client);

        // Redirect to Google OAuth
        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('Error initiating OAuth:', error);
        return NextResponse.json(
            { error: 'Failed to initiate OAuth flow' },
            { status: 500 }
        );
    }
}
