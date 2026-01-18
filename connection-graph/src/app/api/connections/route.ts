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
            lastContactDate: (() => {
                try {
                    const rawDate = row.LAST_CONTACT_DATE;

                    if (rawDate) {
                        // Snowflake returns epoch seconds as a string like "1768513732.630000000"
                        const epochSeconds = parseFloat(String(rawDate));
                        if (!isNaN(epochSeconds)) {
                            const d = new Date(epochSeconds * 1000); // Convert seconds to milliseconds
                            return d.toISOString();
                        }
                    }
                    return new Date().toISOString();
                } catch (e) {
                    console.error('Date parse error:', e);
                    return new Date().toISOString();
                }
            })(),
            degree: (Number(row.DEGREE) || 1) as 1 | 2 | 3,
            connectedThrough: row.CONNECTED_THROUGH ? String(row.CONNECTED_THROUGH) : undefined,
            notes: row.NOTES ? String(row.NOTES) : undefined,
        }));

        console.log('Fetched connections from Snowflake:', connections.length, connections);

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
            // Escape single quotes in strings
            const escape = (val: unknown) => val ? String(val).replace(/'/g, "''") : null;

            const sql = `
                INSERT INTO CONNECTIONS (ID, NAME, TITLE, COMPANY, INDUSTRY, EMAIL, PHONE, LINKEDIN, LAST_CONTACT_DATE, DEGREE, CONNECTED_THROUGH, NOTES)
                VALUES (
                    '${escape(conn.id)}',
                    '${escape(conn.name)}',
                    ${conn.title ? `'${escape(conn.title)}'` : 'NULL'},
                    ${conn.company ? `'${escape(conn.company)}'` : 'NULL'},
                    '${escape(conn.industry) || 'Other'}',
                    ${conn.email ? `'${escape(conn.email)}'` : 'NULL'},
                    ${conn.phone ? `'${escape(conn.phone)}'` : 'NULL'},
                    ${conn.linkedIn ? `'${escape(conn.linkedIn)}'` : 'NULL'},
                    ${conn.lastContactDate ? `'${new Date(conn.lastContactDate).toISOString()}'` : 'NULL'},
                    ${conn.degree || 1},
                    ${conn.connectedThrough ? `'${escape(conn.connectedThrough)}'` : 'NULL'},
                    ${conn.notes ? `'${escape(conn.notes)}'` : 'NULL'}
                )
            `;

            await executeInsert(sql);
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

// DELETE - Remove a connection from Snowflake
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Missing connection ID' },
                { status: 400 }
            );
        }

        // Escape single quotes
        const escapedId = id.replace(/'/g, "''");
        const sql = `DELETE FROM CONNECTIONS WHERE ID = '${escapedId}'`;

        await executeInsert(sql); // executeInsert works for any SQL that doesn't return rows

        return NextResponse.json({ success: true, deletedId: id });
    } catch (error) {
        console.error('Error deleting connection:', error);
        return NextResponse.json(
            { error: 'Failed to delete connection', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
