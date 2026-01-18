// API route to check Gmail connection status
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GmailService, tokenStorage } from '@/lib/gmail';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('gmail_session')?.value;

        if (!sessionId) {
            return NextResponse.json({ connected: false });
        }

        const tokens = await tokenStorage.getTokens(sessionId);
        if (!tokens) {
            return NextResponse.json({ connected: false });
        }

        const gmailService = new GmailService(tokens);
        const profile = await gmailService.getProfile();

        return NextResponse.json({
            connected: true,
            email: profile.email,
        });
    } catch (error) {
        console.error('Error checking connection:', error);
        return NextResponse.json({ connected: false });
    }
}

export async function DELETE() {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('gmail_session')?.value;

        if (sessionId) {
            await tokenStorage.deleteTokens(sessionId);
            cookieStore.delete('gmail_session');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect' },
            { status: 500 }
        );
    }
}
