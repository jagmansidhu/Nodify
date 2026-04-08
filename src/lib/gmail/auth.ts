import { google, Auth } from 'googleapis';
import { cookies } from 'next/headers';

export const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
];

const TOKEN_COOKIE_NAME = 'gmail_tokens';

export function createOAuth2Client(): Auth.OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/email/auth/callback';

    if (!clientId || !clientSecret) {
        throw new Error('Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(oauth2Client: Auth.OAuth2Client): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GMAIL_SCOPES,
        prompt: 'consent',
    });
}

export async function getTokensFromCode(
    oauth2Client: Auth.OAuth2Client,
    code: string
): Promise<Auth.Credentials> {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

export function createGmailClient(oauth2Client: Auth.OAuth2Client) {
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

export interface TokenStorage {
    getTokens(userId: string): Promise<Auth.Credentials | null>;
    saveTokens(userId: string, tokens: Auth.Credentials): Promise<void>;
    deleteTokens(userId: string): Promise<void>;
}

class CookieTokenStorage implements TokenStorage {
    async getTokens(userId: string): Promise<Auth.Credentials | null> {
        try {
            const cookieStore = await cookies();
            const tokenCookie = cookieStore.get(TOKEN_COOKIE_NAME);

            if (!tokenCookie?.value) {
                return null;
            }

            const decoded = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
            const data = JSON.parse(decoded);
            return data[userId] || null;
        } catch (error) {
            console.error('Error reading tokens from cookie:', error);
            return null;
        }
    }

    async saveTokens(userId: string, tokens: Auth.Credentials): Promise<void> {
        try {
            const cookieStore = await cookies();

            let existingData: Record<string, Auth.Credentials> = {};
            const existing = cookieStore.get(TOKEN_COOKIE_NAME);
            if (existing?.value) {
                try {
                    const decoded = Buffer.from(existing.value, 'base64').toString('utf-8');
                    existingData = JSON.parse(decoded);
                } catch {
                    existingData = {};
                }
            }

            existingData[userId] = tokens;
            const encoded = Buffer.from(JSON.stringify(existingData)).toString('base64');

            cookieStore.set(TOKEN_COOKIE_NAME, encoded, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
            });
        } catch (error) {
            console.error('Error saving tokens to cookie:', error);
            throw error;
        }
    }

    async deleteTokens(userId: string): Promise<void> {
        try {
            const cookieStore = await cookies();
            cookieStore.delete(TOKEN_COOKIE_NAME);
        } catch (error) {
            console.error('Error deleting tokens cookie:', error);
        }
    }
}

export const tokenStorage = new CookieTokenStorage();
