// Gemini AI service for email analysis
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ParsedEmail } from '../gmail/service';
import { formatEmailForPrompt, formatEmailsForBatchPrompt } from './prompts';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ActionType = 'RESPONSE_NEEDED' | 'FOLLOW_UP' | 'WAITING' | 'FYI' | 'DEADLINE';
export type ResponseTime = 'ASAP' | 'This week' | 'When convenient' | 'No response needed';

export interface EmailAnalysis {
    id: string;
    priority: Priority;
    urgencyScore?: number; // 1-10 for fine-grained sorting within priority tiers
    action: ActionType;
    summary: string;
    suggestedResponseTime: ResponseTime;
    keyPoints?: string[];
    deadline?: string | null;
    senderImportance?: 'VIP' | 'KNOWN' | 'UNKNOWN';
    reasoning?: string;
}

export interface AnalyzedEmail extends ParsedEmail {
    analysis: EmailAnalysis;
}

export class GeminiService {
    private model: GenerativeModel;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GEMINI_API_KEY environment variable');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-lite-preview-02-05',
            generationConfig: {
                temperature: 0.3,
                topP: 0.8,
                maxOutputTokens: 2048, // Increased for batch responses
            },
        });
    }

    // Generate intelligent mock analysis based on email metadata (for demo/rate-limit scenarios)
    private generateSmartMockAnalysis(email: ParsedEmail): EmailAnalysis {
        const subject = email.subject.toLowerCase();
        const snippet = (email.snippet || '').toLowerCase();
        const daysOld = Math.floor((Date.now() - email.date.getTime()) / (1000 * 60 * 60 * 24));

        let priority: Priority = 'MEDIUM';
        let action: ActionType = 'FYI';
        let responseTime: ResponseTime = 'When convenient';

        if (subject.includes('urgent') || subject.includes('asap') || subject.includes('important') ||
            subject.includes('deadline') || subject.includes('action required') || email.isStarred) {
            priority = 'HIGH';
            action = 'RESPONSE_NEEDED';
            responseTime = 'ASAP';
        } else if (subject.includes('meeting') || subject.includes('invite') || subject.includes('calendar')) {
            priority = 'MEDIUM';
            action = 'DEADLINE';
            responseTime = 'This week';
        } else if (subject.includes('question') || subject.includes('help') || snippet.includes('?')) {
            priority = 'MEDIUM';
            action = 'RESPONSE_NEEDED';
            responseTime = 'This week';
        } else if (subject.includes('newsletter') || subject.includes('update') || subject.includes('digest')) {
            priority = 'LOW';
            action = 'FYI';
            responseTime = 'No response needed';
        }

        if (daysOld > 7 && priority !== 'HIGH') {
            priority = 'LOW';
        }

        // Calculate urgency score based on metadata
        let urgencyScore = 5;
        if (priority === 'HIGH') urgencyScore = email.isStarred ? 10 : 8;
        else if (priority === 'MEDIUM') urgencyScore = 5;
        else urgencyScore = daysOld > 7 ? 1 : 2;

        return {
            id: email.id,
            priority,
            urgencyScore,
            action,
            summary: email.snippet?.substring(0, 100) || `Email from ${email.from}`,
            suggestedResponseTime: responseTime,
            keyPoints: [`From: ${email.from}`, `Subject: ${email.subject.substring(0, 50)}`],
            senderImportance: 'UNKNOWN',
            reasoning: 'Smart analysis based on email metadata (fallback mode)',
        };
    }

    // Analyze a single email - uses API if available, falls back to smart mock
    async analyzeEmail(email: ParsedEmail): Promise<EmailAnalysis> {
        const prompt = formatEmailForPrompt(email);

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                response.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('Could not parse Gemini response as JSON');
            }

            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const analysis = JSON.parse(jsonStr) as EmailAnalysis;
            analysis.id = email.id;

            return analysis;
        } catch (error: any) {
            if (error?.status === 429 || error?.message?.includes('429')) {
                console.log('API rate limited, using smart mock analysis for:', email.subject);
            } else {
                console.error('Error analyzing email:', error);
            }
            return this.generateSmartMockAnalysis(email);
        }
    }

    // OPTIMIZED: Batch analyze using single API call
    async batchAnalyze(emails: ParsedEmail[]): Promise<EmailAnalysis[]> {
        if (emails.length === 0) return [];

        console.log(`Gemini: Batch analyzing ${emails.length} emails in single call...`);

        try {
            // Use batch prompt for all emails at once
            const batchPrompt = formatEmailsForBatchPrompt(emails);
            const result = await this.model.generateContent(batchPrompt);
            const response = result.response.text();

            // Extract JSON array from response
            const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                response.match(/\[[\s\S]*\]/);

            if (!jsonMatch) {
                console.error('Could not parse batch response, falling back to individual analysis');
                return this.fallbackSequentialAnalysis(emails);
            }

            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const analyses = JSON.parse(jsonStr) as EmailAnalysis[];

            console.log(`Gemini: Batch analysis complete, got ${analyses.length} results`);

            // Ensure all emails have analyses (fill in missing with smart mock)
            const analysisMap = new Map(analyses.map(a => [a.id, a]));
            return emails.map(email =>
                analysisMap.get(email.id) || this.generateSmartMockAnalysis(email)
            );
        } catch (error: any) {
            console.error('Batch analysis failed:', error.message);
            return this.fallbackSequentialAnalysis(emails);
        }
    }

    // Fallback: Parallel analysis with concurrency limit (if batch fails)
    private async fallbackSequentialAnalysis(emails: ParsedEmail[]): Promise<EmailAnalysis[]> {
        console.log('Gemini: Falling back to parallel analysis with concurrency...');

        const concurrency = 3; // 3 concurrent requests
        const results: EmailAnalysis[] = [];

        for (let i = 0; i < emails.length; i += concurrency) {
            const batch = emails.slice(i, i + concurrency);
            const batchResults = await Promise.all(
                batch.map(async email => {
                    try {
                        return await this.analyzeEmail(email);
                    } catch {
                        return this.generateSmartMockAnalysis(email);
                    }
                })
            );
            results.push(...batchResults);

            // Small delay between batches (200ms instead of 1s per email)
            if (i + concurrency < emails.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        return results;
    }

    // Combine emails with their analyses
    async analyzeAndEnrich(emails: ParsedEmail[]): Promise<AnalyzedEmail[]> {
        const analyses = await this.batchAnalyze(emails);

        const analysisMap = new Map(analyses.map(a => [a.id, a]));

        return emails.map(email => ({
            ...email,
            analysis: analysisMap.get(email.id) || {
                id: email.id,
                priority: 'MEDIUM' as Priority,
                action: 'FYI' as ActionType,
                summary: email.snippet,
                suggestedResponseTime: 'When convenient' as ResponseTime,
            },
        }));
    }

    // Sort analyzed emails by priority and urgencyScore
    sortByPriority(emails: AnalyzedEmail[]): AnalyzedEmail[] {
        const priorityOrder: Record<Priority, number> = {
            HIGH: 0,
            MEDIUM: 1,
            LOW: 2,
        };

        return [...emails].sort((a, b) => {
            // First sort by priority tier
            const priorityDiff = priorityOrder[a.analysis.priority] - priorityOrder[b.analysis.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Within same priority, sort by urgencyScore (higher first)
            const urgencyA = a.analysis.urgencyScore ?? 5;
            const urgencyB = b.analysis.urgencyScore ?? 5;
            const urgencyDiff = urgencyB - urgencyA; // Descending
            if (urgencyDiff !== 0) return urgencyDiff;

            // Finally, sort by date (newer first for same urgency)
            return b.date.getTime() - a.date.getTime();
        });
    }

    // Get actionable emails (filter out FYI)
    filterActionable(emails: AnalyzedEmail[]): AnalyzedEmail[] {
        return emails.filter(email => email.analysis.action !== 'FYI');
    }
}

// Singleton instance
let geminiService: GeminiService | null = null;

export function getGeminiService(): GeminiService {
    if (!geminiService) {
        geminiService = new GeminiService();
    }
    return geminiService;
}
