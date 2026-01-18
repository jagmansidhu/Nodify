// Gmail API service for fetching and parsing emails
import { gmail_v1, Auth } from 'googleapis';
import { createOAuth2Client, createGmailClient, tokenStorage } from './auth';

export interface ParsedEmail {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    fromEmail: string;
    to: string;
    date: Date;
    snippet: string;
    body: string;
    isStarred: boolean;
    isUnread: boolean;
    labels: string[];
}

export interface EmailThread {
    id: string;
    messages: ParsedEmail[];
    subject: string;
    participantCount: number;
    lastMessageDate: Date;
}

// Parse email headers to extract key fields
function parseHeaders(headers: gmail_v1.Schema$MessagePartHeader[] = []): Record<string, string> {
    const result: Record<string, string> = {};
    for (const header of headers) {
        if (header.name && header.value) {
            result[header.name.toLowerCase()] = header.value;
        }
    }
    return result;
}

// Extract sender name and email
function parseSender(from: string): { name: string; email: string } {
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
        return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2] };
    }
    return { name: from, email: from };
}

// Decode base64 email body
function decodeBody(data: string): string {
    if (!data) return '';
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

// Extract text body from message parts
function extractBody(payload: gmail_v1.Schema$MessagePart): string {
    // Direct body
    if (payload.body?.data) {
        return decodeBody(payload.body.data);
    }

    // Multipart message
    if (payload.parts) {
        // Prefer text/plain, fallback to text/html
        const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
            return decodeBody(textPart.body.data);
        }

        const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
        if (htmlPart?.body?.data) {
            // Strip HTML tags for plain text
            return decodeBody(htmlPart.body.data).replace(/<[^>]*>/g, '');
        }

        // Recursively check nested parts
        for (const part of payload.parts) {
            const body = extractBody(part);
            if (body) return body;
        }
    }

    return '';
}

// Parse a Gmail message into our format
function parseMessage(message: gmail_v1.Schema$Message): ParsedEmail {
    const headers = parseHeaders(message.payload?.headers);
    const sender = parseSender(headers['from'] || 'Unknown');
    const labelIds = message.labelIds || [];

    return {
        id: message.id || '',
        threadId: message.threadId || '',
        subject: headers['subject'] || '(no subject)',
        from: sender.name,
        fromEmail: sender.email,
        to: headers['to'] || '',
        date: new Date(parseInt(message.internalDate || '0')),
        snippet: message.snippet || '',
        body: extractBody(message.payload || {}),
        isStarred: labelIds.includes('STARRED'),
        isUnread: labelIds.includes('UNREAD'),
        labels: labelIds,
    };
}

export class GmailService {
    private gmail: gmail_v1.Gmail;
    private oauth2Client: Auth.OAuth2Client;

    constructor(tokens: Auth.Credentials) {
        this.oauth2Client = createOAuth2Client();
        this.oauth2Client.setCredentials(tokens);
        this.gmail = createGmailClient(this.oauth2Client);

        // Handle token refresh
        this.oauth2Client.on('tokens', async (newTokens) => {
            console.log('Tokens refreshed');
            // In production, save refreshed tokens
        });
    }

    // Get starred emails
    async getStarredEmails(maxResults: number = 50): Promise<ParsedEmail[]> {
        console.log('GmailService: Fetching starred emails...');
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: 'is:starred',
                maxResults,
            });

            const messages = response.data.messages || [];
            console.log(`GmailService: Found ${messages.length} starred message IDs`);

            if (messages.length === 0) return [];

            return this.fetchMessages(messages);
        } catch (error) {
            console.error('GmailService: Error fetching starred emails:', error);
            throw error;
        }
    }

    // Get recent emails (primary inbox)
    async getRecentEmails(maxResults: number = 50): Promise<ParsedEmail[]> {
        console.log('GmailService: Fetching recent emails...');
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: 'category:primary', // Focus on primary inbox to avoid noise
                maxResults,
            });

            const messages = response.data.messages || [];
            console.log(`GmailService: Found ${messages.length} recent message IDs`);

            if (messages.length === 0) return [];

            return this.fetchMessages(messages);
        } catch (error) {
            console.error('GmailService: Error fetching recent emails:', error);
            throw error;
        }
    }

    // Get emails by label
    async getEmailsByLabel(labelId: string, maxResults: number = 50): Promise<ParsedEmail[]> {
        const response = await this.gmail.users.messages.list({
            userId: 'me',
            labelIds: [labelId],
            maxResults,
        });

        return this.fetchMessages(response.data.messages || []);
    }

    // Get unread emails
    async getUnreadEmails(maxResults: number = 50): Promise<ParsedEmail[]> {
        const response = await this.gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread',
            maxResults,
        });

        return this.fetchMessages(response.data.messages || []);
    }

    // Search emails with custom query
    async searchEmails(query: string, maxResults: number = 50): Promise<ParsedEmail[]> {
        const response = await this.gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults,
        });

        return this.fetchMessages(response.data.messages || []);
    }

    // Get full email thread
    async getThread(threadId: string): Promise<EmailThread> {
        const response = await this.gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'full',
        });

        const messages = (response.data.messages || []).map(parseMessage);
        const participants = new Set(messages.map(m => m.fromEmail));

        return {
            id: threadId,
            messages,
            subject: messages[0]?.subject || '',
            participantCount: participants.size,
            lastMessageDate: messages[messages.length - 1]?.date || new Date(),
        };
    }

    // Get emails needing attention (starred + older than specified days)
    async getEmailsNeedingAttention(daysOld: number = 3): Promise<ParsedEmail[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const allStarred = await this.getStarredEmails(100);
        return allStarred.filter(email => email.date < cutoffDate);
    }

    // Fetch full message details for a list of message references
    private async fetchMessages(refs: gmail_v1.Schema$Message[]): Promise<ParsedEmail[]> {
        const messages: ParsedEmail[] = [];

        // Batch fetch in parallel (limit concurrency)
        const batchSize = 10;
        for (let i = 0; i < refs.length; i += batchSize) {
            const batch = refs.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map(async (ref) => {
                    if (!ref.id) return null;
                    const response = await this.gmail.users.messages.get({
                        userId: 'me',
                        id: ref.id,
                        format: 'full',
                    });
                    return parseMessage(response.data);
                })
            );
            messages.push(...results.filter((m): m is ParsedEmail => m !== null));
        }

        return messages;
    }

    // Get user's Gmail profile
    async getProfile(): Promise<{ email: string; messagesTotal: number }> {
        const response = await this.gmail.users.getProfile({ userId: 'me' });
        return {
            email: response.data.emailAddress || '',
            messagesTotal: response.data.messagesTotal || 0,
        };
    }
}

// Factory function to create GmailService from stored tokens
export async function createGmailServiceForUser(userId: string): Promise<GmailService | null> {
    const tokens = await tokenStorage.getTokens(userId);
    if (!tokens) return null;
    return new GmailService(tokens);
}
