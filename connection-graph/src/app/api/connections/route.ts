import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeInsert } from '@/lib/snowflake';

// GET - Fetch all connections from Snowflake
export async function GET() {
    try {
        const rows = await executeQuery(`SELECT * FROM CONNECTIONS ORDER BY CREATED_AT DESC`);

        // Transform Snowflake rows to frontend format
        const connections = rows.map(row => ({
            id: row.ID as string,
            name: row.NAME as string,
            title: (row.TITLE as string) || 'Unknown',
            company: (row.COMPANY as string) || 'Unknown',
            industry: (row.INDUSTRY as string) || 'Other',
            email: row.EMAIL || undefined,
            phone: row.PHONE || undefined,
            linkedIn: row.LINKEDIN || undefined,
            lastContactDate: row.LAST_CONTACT_DATE ? new Date(row.LAST_CONTACT_DATE as string).toISOString() : new Date().toISOString(),
            degree: (row.DEGREE as number) || 1,
            connectedThrough: row.CONNECTED_THROUGH || undefined,
            notes: row.NOTES || undefined,
        }));

        return NextResponse.json({ connections });
    } catch (error) {
        console.error('Error fetching connections:', error);
        return NextResponse.json(
            { error: 'Failed to fetch connections', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST - Insert new connection(s) to Snowflake
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const connections = Array.isArray(body) ? body : [body];

        for (const conn of connections) {
            const sql = `
                INSERT INTO CONNECTIONS (ID, NAME, TITLE, COMPANY, INDUSTRY, EMAIL, PHONE, LINKEDIN, LAST_CONTACT_DATE, DEGREE, CONNECTED_THROUGH, NOTES)
                VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12)
            `;

            await executeInsert(sql, {
                '1': conn.id,
                '2': conn.name,
                '3': conn.title || null,
                '4': conn.company || null,
                '5': conn.industry || 'Other',
                '6': conn.email || null,
                '7': conn.phone || null,
                '8': conn.linkedIn || null,
                '9': conn.lastContactDate ? new Date(conn.lastContactDate).toISOString() : null,
                '10': conn.degree || 1,
                '11': conn.connectedThrough || null,
                '12': conn.notes || null,
            });
        }

        return NextResponse.json({ success: true, count: connections.length });
    } catch (error) {
        console.error('Error inserting connection:', error);
        return NextResponse.json(
            { error: 'Failed to save connection', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
