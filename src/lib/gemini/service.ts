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
    action: ActionType;
    summary: string;
    suggestedResponseTime: ResponseTime;
    keyPoints?: string[];
    deadline?: string | null;
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
                temperature: 0.3, // Lower temperature for more consistent analysis
                topP: 0.8,
                maxOutputTokens: 1024,
            },
        });
    }

    // Generate intelligent mock analysis based on email metadata (for demo/rate-limit scenarios)
    private generateSmartMockAnalysis(email: ParsedEmail): EmailAnalysis {
        const subject = email.subject.toLowerCase();
        const snippet = (email.snippet || '').toLowerCase();
        const daysOld = Math.floor((Date.now() - email.date.getTime()) / (1000 * 60 * 60 * 24));

        // Determine priority based on keywords
        let priority: Priority = 'MEDIUM';
        let action: ActionType = 'FYI';
        let responseTime: ResponseTime = 'When convenient';

        // High priority signals
        if (subject.includes('urgent') || subject.includes('asap') || subject.includes('important') ||
            subject.includes('deadline') || subject.includes('action required') || email.isStarred) {
            priority = 'HIGH';
            action = 'RESPONSE_NEEDED';
            responseTime = 'ASAP';
        }
        // Meeting/calendar signals
        else if (subject.includes('meeting') || subject.includes('invite') || subject.includes('calendar')) {
            priority = 'MEDIUM';
            action = 'DEADLINE';
            responseTime = 'This week';
        }
        // Question signals
        else if (subject.includes('question') || subject.includes('help') || snippet.includes('?')) {
            priority = 'MEDIUM';
            action = 'RESPONSE_NEEDED';
            responseTime = 'This week';
        }
        // Newsletter/FYI signals
        else if (subject.includes('newsletter') || subject.includes('update') || subject.includes('digest')) {
            priority = 'LOW';
            action = 'FYI';
            responseTime = 'No response needed';
        }

        // Older emails get slightly lower priority if not already HIGH
        if (daysOld > 7 && priority !== 'HIGH') {
            priority = 'LOW';
        }

        return {
            id: email.id,
            priority,
            action,
            summary: email.snippet?.substring(0, 100) || `Email from ${email.from}`,
            suggestedResponseTime: responseTime,
            keyPoints: [`From: ${email.from}`, `Subject: ${email.subject.substring(0, 50)}`],
            reasoning: 'Smart analysis based on email metadata (demo mode)',
        };
    }

    // Analyze a single email - uses API if available, falls back to smart mock
    async analyzeEmail(email: ParsedEmail): Promise<EmailAnalysis> {
        const prompt = formatEmailForPrompt(email);

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            // Extract JSON from response (handle markdown code blocks)
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
            // Use smart mock for rate limits or any other errors
            if (error?.status === 429 || error?.message?.includes('429')) {
                console.log('API rate limited, using smart mock analysis for:', email.subject);
            } else {
                console.error('Error analyzing email:', error);
            }
            return this.generateSmartMockAnalysis(email);
        }
    }

    // Batch analyze multiple emails (more efficient)
    async batchAnalyze(emails: ParsedEmail[]): Promise<EmailAnalysis[]> {
        if (emails.length === 0) return [];

        // Process sequentially with modest delay for paid tier
        const analyses: EmailAnalysis[] = [];

        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];

            // Add 1 second delay between requests (sufficient for paid tier)
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            try {
                const analysis = await this.analyzeEmail(email);
                analyses.push(analysis);
            } catch (error) {
                console.error('Analysis failed for item, creating default:', error);
                analyses.push({
                    id: email.id,
                    priority: 'MEDIUM',
                    action: 'FYI',
                    summary: email.snippet || 'Failed to analyze',
                    suggestedResponseTime: 'When convenient',
                });
            }
        }

        return analyses;
    }

    // Combine emails with their analyses
    async analyzeAndEnrich(emails: ParsedEmail[]): Promise<AnalyzedEmail[]> {
        const analyses = await this.batchAnalyze(emails);

        // Create a map for quick lookup
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

    // Sort analyzed emails by priority
    sortByPriority(emails: AnalyzedEmail[]): AnalyzedEmail[] {
        const priorityOrder: Record<Priority, number> = {
            HIGH: 0,
            MEDIUM: 1,
            LOW: 2,
        };

        return [...emails].sort((a, b) => {
            const priorityDiff = priorityOrder[a.analysis.priority] - priorityOrder[b.analysis.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Secondary sort by date (older first for same priority)
            return a.date.getTime() - b.date.getTime();
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
