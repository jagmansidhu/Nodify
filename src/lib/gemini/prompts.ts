// Enhanced prompt templates for email analysis with Gemini
import { ParsedEmail } from '../gmail/service';

// Important sender domains that often require attention
const IMPORTANT_DOMAINS = [
  'google.com', 'github.com', 'linkedin.com', 'stripe.com', 'aws.amazon.com',
  'slack.com', 'zoom.us', 'microsoft.com', 'apple.com', 'notion.so',
  'figma.com', 'dropbox.com', 'atlassian.com', 'salesforce.com'
];

export const EMAIL_ANALYSIS_PROMPT = `You are an expert email triage assistant. Analyze this email with precision and provide actionable insights.

## PRIORITY SCORING CRITERIA

**HIGH Priority** (urgencyScore 8-10):
- Explicit "urgent", "ASAP", "immediately" in subject/body
- Deadlines within 24-48 hours
- Direct questions requiring your response
- From VIP senders (executives, clients, recruiters)
- Calendar invites for today/tomorrow
- Security alerts, password resets
- Payment/invoice issues

**MEDIUM Priority** (urgencyScore 4-7):
- Deadlines within 1 week
- Meeting requests/scheduling
- Project updates requiring review
- Questions that can wait 1-2 days
- Follow-ups on previous conversations

**LOW Priority** (urgencyScore 1-3):
- Newsletters, marketing emails
- FYI/informational content
- Social media notifications
- Automated reports
- No response needed

## OUTPUT FORMAT (JSON only)
{
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "urgencyScore": 1-10,
  "action": "RESPONSE_NEEDED" | "FOLLOW_UP" | "WAITING" | "FYI" | "DEADLINE",
  "summary": "1-2 sentence summary",
  "suggestedResponseTime": "ASAP" | "This week" | "When convenient" | "No response needed",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "deadline": "YYYY-MM-DD or null",
  "senderImportance": "VIP" | "KNOWN" | "UNKNOWN",
  "reasoning": "Why this priority/action was assigned"
}

## EMAIL TO ANALYZE
---
From: {from} <{fromEmail}>
Subject: {subject}
Date: {date}
Starred: {isStarred}
Days Old: {daysOld}
Is Important Sender: {isImportant}

{body}
---`;

export const BATCH_ANALYSIS_PROMPT = `You are an expert email triage assistant. Analyze ALL emails below and rank them by importance.

## PRIORITY SCORING CRITERIA

**HIGH Priority** (urgencyScore 8-10):
- Explicit urgency words, deadlines within 48 hours
- Direct questions requiring response, VIP senders
- Security alerts, payment issues, calendar invites today

**MEDIUM Priority** (urgencyScore 4-7):
- Deadlines within 1 week, meeting requests
- Project updates, questions that can wait 1-2 days

**LOW Priority** (urgencyScore 1-3):
- Newsletters, FYI content, no response needed

## RESPONSE FORMAT
Return a JSON array with ALL emails analyzed:
[
  {
    "id": "email_id_here",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "urgencyScore": 1-10,
    "action": "RESPONSE_NEEDED" | "FOLLOW_UP" | "WAITING" | "FYI" | "DEADLINE",
    "summary": "Brief 1-sentence summary",
    "suggestedResponseTime": "ASAP" | "This week" | "When convenient" | "No response needed",
    "keyPoints": ["point 1", "point 2"],
    "deadline": "YYYY-MM-DD or null"
  }
]

**IMPORTANT**: You MUST return an analysis for EVERY email listed. The "id" field must match exactly.

## EMAILS TO ANALYZE
---
{emails}
---`;

// Check if sender is from an important domain
function isImportantSender(fromEmail: string): boolean {
  const domain = fromEmail.split('@')[1]?.toLowerCase();
  return IMPORTANT_DOMAINS.some(d => domain?.endsWith(d));
}

// Format a single email for the prompt
export function formatEmailForPrompt(email: ParsedEmail): string {
  const daysOld = Math.floor((Date.now() - email.date.getTime()) / (1000 * 60 * 60 * 24));
  const isImportant = isImportantSender(email.fromEmail);

  // Use more content for better analysis
  const maxBodyLength = 800;
  const truncatedBody = email.snippet && email.snippet.length > 50
    ? email.snippet
    : (email.body.length > maxBodyLength
      ? email.body.substring(0, maxBodyLength) + '...[truncated]'
      : email.body);

  return EMAIL_ANALYSIS_PROMPT
    .replace('{from}', email.from)
    .replace('{fromEmail}', email.fromEmail)
    .replace('{subject}', email.subject)
    .replace('{date}', email.date.toLocaleString())
    .replace('{isStarred}', email.isStarred ? 'Yes' : 'No')
    .replace('{daysOld}', daysOld.toString())
    .replace('{isImportant}', isImportant ? 'Yes (known service)' : 'No')
    .replace('{body}', truncatedBody);
}

// Format multiple emails for batch analysis (enhanced)
export function formatEmailsForBatchPrompt(emails: ParsedEmail[]): string {
  const emailSummaries = emails.map((email, index) => {
    const daysOld = Math.floor((Date.now() - email.date.getTime()) / (1000 * 60 * 60 * 24));
    const isImportant = isImportantSender(email.fromEmail);

    // Include more content for better batch analysis
    const truncatedBody = email.snippet && email.snippet.length > 30
      ? email.snippet.substring(0, 300)
      : (email.body.length > 250
        ? email.body.substring(0, 250) + '...'
        : email.body);

    return `
[Email ${index + 1}]
ID: ${email.id}
From: ${email.from} <${email.fromEmail}>
Subject: ${email.subject}
Date: ${email.date.toLocaleString()} (${daysOld} days ago)
Starred: ${email.isStarred ? 'Yes' : 'No'}
Important Sender: ${isImportant ? 'Yes' : 'No'}
Preview: ${truncatedBody}
`;
  }).join('\n---\n');

  return BATCH_ANALYSIS_PROMPT.replace('{emails}', emailSummaries);
}
