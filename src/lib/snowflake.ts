// Snowflake SQL REST API helper
// Uses Programmatic Access Token (PAT) for authentication

interface SnowflakeConfig {
    account: string;
    warehouse: string;
    database: string;
    accessToken: string;
}

function getConfig(): SnowflakeConfig {
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH';
    const database = process.env.SNOWFLAKE_DATABASE || 'CONNECTION_GRAPH';
    const accessToken = process.env.SNOWFLAKE_ACCESS_TOKEN;

    if (!account || !accessToken) {
        throw new Error('Missing Snowflake credentials. Set SNOWFLAKE_ACCOUNT and SNOWFLAKE_ACCESS_TOKEN in .env.local');
    }

    return { account, warehouse, database, accessToken };
}

interface QueryResult {
    data: unknown[][];
    resultSetMetaData: {
        rowType: { name: string; type: string }[];
    };
    message?: string;
    code?: string;
}

export async function executeQuery(sql: string): Promise<Record<string, unknown>[]> {
    const config = getConfig();

    const account = config.account.split('.')[0];
    const queryUrl = `https://${account}.snowflakecomputing.com/api/v2/statements`;
    console.log('Snowflake request to:', queryUrl);

    const body = {
        statement: sql,
        timeout: 60,
        database: config.database,
        schema: 'PUBLIC',
        warehouse: config.warehouse,
    };

    const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${config.accessToken}`,
            'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Snowflake API error:', errorText);
        throw new Error(`Snowflake query failed: ${errorText}`);
    }

    const result: QueryResult = await response.json();

    // Handle async query - poll for results if needed
    if (result.code === '333334') {
        // Statement is still executing, would need to poll - for now throw
        throw new Error('Query is still executing. Consider using async polling.');
    }

    // Convert array data to objects with column names
    const columns = result.resultSetMetaData?.rowType?.map(col => col.name) || [];
    const rows = result.data || [];

    return rows.map(row => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj;
    });
}

// Helper to run INSERT statements
export async function executeInsert(sql: string): Promise<void> {
    const config = getConfig();

    const queryUrl = `https://${config.account}.snowflakecomputing.com/api/v2/statements`;

    const body = {
        statement: sql,
        timeout: 60,
        database: config.database,
        schema: 'PUBLIC',
        warehouse: config.warehouse,
    };

    const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${config.accessToken}`,
            'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Snowflake INSERT error:', errorText);
        throw new Error(`Snowflake insert failed: ${errorText}`);
    }
}
