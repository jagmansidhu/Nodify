// Prompt templates for email analysis with Gemini
import { ParsedEmail } from '../gmail/service';

export const EMAIL_ANALYSIS_PROMPT = `You are an email assistant helping a user manage their inbox. Analyze the following email and provide:

1. **Priority Level**: HIGH, MEDIUM, or LOW
   - HIGH: Urgent deadlines, important people, time-sensitive requests
   - MEDIUM: Needs response but not urgent, questions directed at user
   - LOW: FYI, newsletters, can wait

2. **Action Required**: One of:
   - RESPONSE_NEEDED: User needs to reply
   - FOLLOW_UP: User needs to take an action outside of email
   - WAITING: User is waiting for a response from others
   - FYI: No action needed, informational only
   - DEADLINE: Has a specific deadline/date

3. **Summary**: A 1-2 sentence summary of what this email is about

4. **Suggested Response Time**: 
   - ASAP (today)
   - This week
   - When convenient
   - No response needed

5. **Key Points**: 2-3 bullet points of what's important

6. **Deadline** (if any): Extract any mentioned deadlines or dates

Respond in JSON format only:
{
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "action": "RESPONSE_NEEDED" | "FOLLOW_UP" | "WAITING" | "FYI" | "DEADLINE",
  "summary": "string",
  "suggestedResponseTime": "ASAP" | "This week" | "When convenient" | "No response needed",
  "keyPoints": ["string", "string"],
  "deadline": "string or null",
  "reasoning": "Brief explanation of the analysis"
}

EMAIL TO ANALYZE:
---
From: {from} <{fromEmail}>
Subject: {subject}
Date: {date}
Starred: {isStarred}
Days Old: {daysOld}

{body}
---`;

export const BATCH_ANALYSIS_PROMPT = `You are an email assistant. Analyze the following batch of emails and prioritize them for the user.

For EACH email, provide:
- id: The email ID (provided)
- priority: HIGH, MEDIUM, or LOW
- action: RESPONSE_NEEDED, FOLLOW_UP, WAITING, FYI, or DEADLINE
- summary: 1 sentence summary
- suggestedResponseTime: ASAP, This week, When convenient, or No response needed

Respond with a JSON array of analyses:
[
  {
    "id": "email_id",
    "priority": "HIGH",
    "action": "RESPONSE_NEEDED",
    "summary": "Brief summary",
    "suggestedResponseTime": "ASAP"
  }
]

EMAILS TO ANALYZE:
---
{emails}
---`;

// Format a single email for the prompt
export function formatEmailForPrompt(email: ParsedEmail): string {
  const daysOld = Math.floor((Date.now() - email.date.getTime()) / (1000 * 60 * 60 * 24));

  // Truncate body to avoid token limits (aggressive for free tier)
  const maxBodyLength = 500;
  const truncatedBody = email.snippet // Prefer snippet if available as it's cleaner
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
    .replace('{body}', truncatedBody);
}

// Format multiple emails for batch analysis
export function formatEmailsForBatchPrompt(emails: ParsedEmail[]): string {
  const emailSummaries = emails.map((email, index) => {
    const daysOld = Math.floor((Date.now() - email.date.getTime()) / (1000 * 60 * 60 * 24));
    // Use snippet mostly for batch to be very light
    const truncatedBody = email.snippet && email.snippet.length > 10
      ? email.snippet.substring(0, 200)
      : (email.body.length > 150
        ? email.body.substring(0, 150) + '...'
        : email.body);

    return `
[Email ${index + 1}]
ID: ${email.id}
From: ${email.from} <${email.fromEmail}>
Subject: ${email.subject}
Date: ${email.date.toLocaleString()} (${daysOld} days ago)
Starred: ${email.isStarred ? 'Yes' : 'No'}
Preview: ${truncatedBody}
`;
  }).join('\n---\n');

  return BATCH_ANALYSIS_PROMPT.replace('{emails}', emailSummaries);
}
