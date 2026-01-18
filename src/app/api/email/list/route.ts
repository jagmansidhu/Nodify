// API route to fetch and analyze emails (starred or all)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GmailService, ParsedEmail } from '@/lib/gmail/service';
import { tokenStorage } from '@/lib/gmail/auth';
import { getGeminiService } from '@/lib/gemini/service';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const filter = searchParams.get('filter') || 'starred'; // 'starred' or 'all'

        // Get session from cookie
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('gmail_session')?.value;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Not authenticated', code: 'NO_SESSION' },
                { status: 401 }
            );
        }

        // Get tokens for this session
        const tokens = await tokenStorage.getTokens(sessionId);
        if (!tokens) {
            return NextResponse.json(
                { error: 'Session expired', code: 'EXPIRED_SESSION' },
                { status: 401 }
            );
        }

        // Create Gmail service
        console.log(`API: Connecting to Gmail (filter: ${filter})...`);
        const gmailService = new GmailService(tokens);

        let emails: ParsedEmail[] = [];
        if (filter === 'starred') {
            emails = await gmailService.getStarredEmails(8);
        } else {
            // "all" recent emails
            emails = await gmailService.getRecentEmails(8);
        }

        console.log(`API: Fetched ${emails.length} emails`);

        if (emails.length === 0) {
            return NextResponse.json({
                emails: [],
                stats: { total: 0, high: 0, medium: 0, low: 0, needsResponse: 0 },
                message: filter === 'starred' ? 'No starred emails found' : 'No emails found'
            });
        }

        // Analyze emails with Gemini
        console.log('API: Analyzing with Gemini...');
        const geminiService = getGeminiService();
        const analyzedEmails = await geminiService.analyzeAndEnrich(emails);
        console.log('API: Analysis complete');

        // Sort by priority
        const sortedEmails = geminiService.sortByPriority(analyzedEmails);

        // Get stats
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
        console.error('Error fetching emails:', error);
        return NextResponse.json(
            { error: 'Failed to fetch emails' },
            { status: 500 }
        );
    }
}
