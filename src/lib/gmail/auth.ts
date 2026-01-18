// Gmail API configuration and OAuth setup
import { google, Auth } from 'googleapis';

// OAuth2 scopes required for Gmail API
export const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
];

// Create OAuth2 client
export function createOAuth2Client(): Auth.OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/email/auth/callback';

    if (!clientId || !clientSecret) {
        throw new Error('Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Generate OAuth authorization URL
export function getAuthUrl(oauth2Client: Auth.OAuth2Client): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GMAIL_SCOPES,
        prompt: 'consent', // Force consent to get refresh token
    });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(
    oauth2Client: Auth.OAuth2Client,
    code: string
): Promise<Auth.Credentials> {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

// Create authenticated Gmail client
export function createGmailClient(oauth2Client: Auth.OAuth2Client) {
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Token storage interface (you can implement different backends)
export interface TokenStorage {
    getTokens(userId: string): Promise<Auth.Credentials | null>;
    saveTokens(userId: string, tokens: Auth.Credentials): Promise<void>;
    deleteTokens(userId: string): Promise<void>;
}

// Simple in-memory token storage (replace with database in production)
/*
class InMemoryTokenStorage implements TokenStorage {
    private tokens: Map<string, Auth.Credentials> = new Map();

    async getTokens(userId: string): Promise<Auth.Credentials | null> {
        return this.tokens.get(userId) || null;
    }

    async saveTokens(userId: string, tokens: Auth.Credentials): Promise<void> {
        this.tokens.set(userId, tokens);
    }

    async deleteTokens(userId: string): Promise<void> {
        this.tokens.delete(userId);
    }
}
*/

import fs from 'fs/promises';
import path from 'path';

// File-based token storage for development persistence
class FileTokenStorage implements TokenStorage {
    private filePath = path.join(process.cwd(), '.tokens.json');

    private async readTokens(): Promise<Map<string, Auth.Credentials>> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8');
            return new Map(JSON.parse(data));
        } catch {
            return new Map();
        }
    }

    private async writeTokens(tokens: Map<string, Auth.Credentials>): Promise<void> {
        await fs.writeFile(
            this.filePath,
            JSON.stringify(Array.from(tokens.entries()), null, 2)
        );
    }

    async getTokens(userId: string): Promise<Auth.Credentials | null> {
        const tokens = await this.readTokens();
        return tokens.get(userId) || null;
    }

    async saveTokens(userId: string, tokens: Auth.Credentials): Promise<void> {
        const allTokens = await this.readTokens();
        allTokens.set(userId, tokens);
        await this.writeTokens(allTokens);
    }

    async deleteTokens(userId: string): Promise<void> {
        const tokens = await this.readTokens();
        tokens.delete(userId);
        await this.writeTokens(tokens);
    }
}

// Export singleton storage instance
export const tokenStorage = new FileTokenStorage();
