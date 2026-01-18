import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GmailService, tokenStorage } from '@/lib/gmail';
import { getGeminiService, AnalyzedEmail } from '@/lib/gemini';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('gmail_session')?.value;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Not authenticated', code: 'NO_SESSION' },
                { status: 401 }
            );
        }

        const tokens = await tokenStorage.getTokens(sessionId);
        if (!tokens) {
            return NextResponse.json(
                { error: 'Session expired', code: 'EXPIRED_SESSION' },
                { status: 401 }
            );
        }

        const gmailService = new GmailService(tokens);
        const starredEmails = await gmailService.getStarredEmails(50);

        const geminiService = getGeminiService();
        const analyzedEmails = await geminiService.analyzeAndEnrich(starredEmails);

        const sortedEmails = geminiService.sortByPriority(analyzedEmails);

        const stats = {
            total: sortedEmails.length,
            high: sortedEmails.filter(e => e.analysis.priority === 'HIGH').length,
            medium: sortedEmails.filter(e => e.analysis.priority === 'MEDIUM').length,
            low: sortedEmails.filter(e => e.analysis.priority === 'LOW').length,
            needsResponse: sortedEmails.filter(e => e.analysis.action === 'RESPONSE_NEEDED').length,
        };

        return NextResponse.json({
            emails: sortedEmails,
            stats,
        });
    } catch (error) {
        console.error('Error fetching starred emails:', error);
        return NextResponse.json(
            { error: 'Failed to fetch emails' },
            { status: 500 }
        );
    }
}
