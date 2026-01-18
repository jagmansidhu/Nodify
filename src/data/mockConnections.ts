import { Connection } from '@/types';

// Helper to create a date X days ago
const daysAgo = (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
};

export const mockConnections: Connection[] = [
    // ========================================
    // 1ST DEGREE CONNECTIONS (Direct contacts)
    // ========================================

    // Hot 1st-degree connections
    {
        id: '1',
        name: 'Sarah Chen',
        title: 'VP of Engineering',
        company: 'TechStart Inc.',
        industry: 'Technology',
        email: 'sarah.chen@techstart.com',
        linkedIn: 'linkedin.com/in/sarahchen',
        lastContactDate: daysAgo(2),
        notes: 'Discussed potential partnership on AI project',
        degree: 1,
    },
    {
        id: '2',
        name: 'Marcus Johnson',
        title: 'Sales Director',
        company: 'CloudSoft',
        industry: 'Sales',
        email: 'mjohnson@cloudsoft.io',
        phone: '+1 (555) 123-4567',
        lastContactDate: daysAgo(5),
        notes: 'Follow up on Q1 deal',
        degree: 1,
    },
    {
        id: '3',
        name: 'Emily Rodriguez',
        title: 'Product Manager',
        company: 'InnovateCo',
        industry: 'Technology',
        email: 'emily.r@innovate.co',
        lastContactDate: daysAgo(1),
        notes: 'Met at TechCrunch event',
        degree: 1,
    },
    {
        id: '4',
        name: 'David Kim',
        title: 'Investment Analyst',
        company: 'Vertex Capital',
        industry: 'Finance',
        email: 'dkim@vertexcap.com',
        phone: '+1 (555) 987-6543',
        lastContactDate: daysAgo(10),
        notes: 'Interested in Series B discussion',
        degree: 1,
    },

    // Warm 1st-degree connections
    {
        id: '5',
        name: 'Jennifer Walsh',
        title: 'Marketing Director',
        company: 'BrandForge',
        industry: 'Marketing',
        email: 'jwalsh@brandforge.com',
        lastContactDate: daysAgo(21),
        notes: 'Potential marketing collaboration',
        degree: 1,
    },
    {
        id: '6',
        name: 'Michael Torres',
        title: 'Senior Architect',
        company: 'BuildRight',
        industry: 'Engineering',
        email: 'mtorres@buildright.com',
        lastContactDate: daysAgo(35),
        degree: 1,
    },
    {
        id: '7',
        name: 'Amanda Foster',
        title: 'UX Lead',
        company: 'DesignPro',
        industry: 'Design',
        email: 'amanda@designpro.io',
        linkedIn: 'linkedin.com/in/amandafoster',
        lastContactDate: daysAgo(45),
        notes: 'Interested in freelance opportunities',
        degree: 1,
    },

    // Cold 1st-degree connections
    {
        id: '8',
        name: 'Robert Chang',
        title: 'CFO',
        company: 'FinanceFirst',
        industry: 'Finance',
        email: 'rchang@financefirst.com',
        lastContactDate: daysAgo(120),
        degree: 1,
    },
    {
        id: '9',
        name: 'Lisa Patel',
        title: 'Healthcare Consultant',
        company: 'MedAdvisors',
        industry: 'Healthcare',
        email: 'lisa@medadvisors.com',
        phone: '+1 (555) 222-3333',
        lastContactDate: daysAgo(150),
        notes: 'Introduced by Sarah Chen',
        degree: 1,
    },
    {
        id: '10',
        name: 'James Wilson',
        title: 'Legal Counsel',
        company: 'Wilson & Associates',
        industry: 'Legal',
        email: 'jwilson@wilsonlaw.com',
        lastContactDate: daysAgo(180),
        degree: 1,
    },

    // ========================================
    // 2ND DEGREE CONNECTIONS (Friend of friend)
    // ========================================

    // Connected through Sarah Chen (id: 1)
    {
        id: '11',
        name: 'Alex Turner',
        title: 'CTO',
        company: 'DataDrive',
        industry: 'Technology',
        email: 'alex@datadrive.io',
        lastContactDate: daysAgo(60),
        notes: 'Sarah\'s former colleague',
        degree: 2,
        connectedThrough: '1',
    },
    {
        id: '12',
        name: 'Priya Sharma',
        title: 'ML Engineer',
        company: 'AI Labs',
        industry: 'Technology',
        email: 'priya@ailabs.com',
        lastContactDate: daysAgo(90),
        degree: 2,
        connectedThrough: '1',
    },

    // Connected through Marcus Johnson (id: 2)
    {
        id: '13',
        name: 'Chris Anderson',
        title: 'Account Executive',
        company: 'SalesForce Pro',
        industry: 'Sales',
        email: 'canderson@sfpro.com',
        lastContactDate: daysAgo(30),
        notes: 'Marcus\' top sales partner',
        degree: 2,
        connectedThrough: '2',
    },
    {
        id: '14',
        name: 'Diana Ross',
        title: 'Business Development',
        company: 'GrowthCo',
        industry: 'Sales',
        email: 'dross@growthco.com',
        lastContactDate: daysAgo(45),
        degree: 2,
        connectedThrough: '2',
    },

    // Connected through David Kim (id: 4)
    {
        id: '15',
        name: 'Thomas Lee',
        title: 'Portfolio Manager',
        company: 'Alpha Investments',
        industry: 'Finance',
        email: 'tlee@alphainv.com',
        lastContactDate: daysAgo(20),
        notes: 'David\'s investment contact',
        degree: 2,
        connectedThrough: '4',
    },
    {
        id: '16',
        name: 'Rachel Green',
        title: 'VC Partner',
        company: 'Seed Ventures',
        industry: 'Finance',
        email: 'rgreen@seedvc.com',
        lastContactDate: daysAgo(80),
        degree: 2,
        connectedThrough: '4',
    },

    // Connected through Jennifer Walsh (id: 5)
    {
        id: '17',
        name: 'Kevin Hart',
        title: 'Creative Director',
        company: 'AdVenture Agency',
        industry: 'Marketing',
        email: 'khart@adventure.com',
        lastContactDate: daysAgo(55),
        degree: 2,
        connectedThrough: '5',
    },

    // Connected through Amanda Foster (id: 7)
    {
        id: '18',
        name: 'Sophia Martinez',
        title: 'Product Designer',
        company: 'DesignHub',
        industry: 'Design',
        email: 'sophia@designhub.io',
        lastContactDate: daysAgo(40),
        notes: 'Amanda\'s design colleague',
        degree: 2,
        connectedThrough: '7',
    },

    // ========================================
    // 3RD DEGREE CONNECTIONS
    // ========================================

    // Connected through Alex Turner (id: 11, who connects through Sarah)
    {
        id: '19',
        name: 'Ryan Miller',
        title: 'Software Engineer',
        company: 'CodeCraft',
        industry: 'Engineering',
        email: 'rmiller@codecraft.dev',
        linkedIn: 'linkedin.com/in/ryanmiller',
        lastContactDate: daysAgo(100),
        notes: 'Alex\'s engineering contact',
        degree: 3,
        connectedThrough: '11',
    },
    {
        id: '20',
        name: 'Emma Watson',
        title: 'DevOps Lead',
        company: 'CloudOps',
        industry: 'Technology',
        email: 'ewatson@cloudops.io',
        lastContactDate: daysAgo(120),
        degree: 3,
        connectedThrough: '11',
    },

    // Connected through Thomas Lee (id: 15, who connects through David)
    {
        id: '21',
        name: 'Michael Brown',
        title: 'Hedge Fund Manager',
        company: 'Capital Peak',
        industry: 'Finance',
        email: 'mbrown@capitalpeak.com',
        lastContactDate: daysAgo(200),
        degree: 3,
        connectedThrough: '15',
    },

    // Connected through Chris Anderson (id: 13, who connects through Marcus)
    {
        id: '22',
        name: 'Jessica Taylor',
        title: 'Enterprise Sales',
        company: 'BigDeal Inc',
        industry: 'Sales',
        email: 'jtaylor@bigdeal.com',
        lastContactDate: daysAgo(70),
        degree: 3,
        connectedThrough: '13',
    },
    {
        id: '23',
        name: 'Brandon Smith',
        title: 'Sales Engineer',
        company: 'TechSales',
        industry: 'Sales',
        email: 'bsmith@techsales.com',
        lastContactDate: daysAgo(85),
        degree: 3,
        connectedThrough: '13',
    },

    // Connected through Sophia Martinez (id: 18, who connects through Amanda)
    {
        id: '24',
        name: 'Olivia White',
        title: 'UI Designer',
        company: 'PixelPerfect',
        industry: 'Design',
        email: 'owhite@pixelperfect.io',
        lastContactDate: daysAgo(85),
        degree: 3,
        connectedThrough: '18',
    },
];
