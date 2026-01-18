import { EmailDashboard } from '@/components/EmailDashboard';

export const metadata = {
    title: 'Email Intelligence | Subly',
    description: 'AI-powered email management to help you stay on top of messages that need attention',
};

export default function EmailsPage() {
    return <EmailDashboard />;
}
