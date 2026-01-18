// Snowflake SQL REST API helper
// Uses fetch instead of SDK for Turbopack compatibility

interface SnowflakeConfig {
    account: string;
    username: string;
    password: string;
    warehouse: string;
    database: string;
}

function getConfig(): SnowflakeConfig {
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const username = process.env.SNOWFLAKE_USERNAME;
    const password = process.env.SNOWFLAKE_PASSWORD;
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
    const database = process.env.SNOWFLAKE_DATABASE || 'CONNECTION_GRAPH';

    if (!account || !username || !password || !warehouse) {
        throw new Error('Missing Snowflake credentials. Set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD, SNOWFLAKE_WAREHOUSE in .env.local');
    }

    return { account, username, password, warehouse, database };
}

// Get JWT token for Snowflake SQL REST API (using key-pair or password auth)
async function getAuthToken(): Promise<string> {
    const config = getConfig();

    // For simplicity, use the login-request endpoint to get a session token
    // In production, you'd use key-pair authentication
    const loginUrl = `https://${config.account}.snowflakecomputing.com/session/v1/login-request`;

    const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            data: {
                LOGIN_NAME: config.username,
                PASSWORD: config.password,
                ACCOUNT_NAME: config.account,
            }
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Snowflake auth failed: ${error}`);
    }

    const data = await response.json();
    return data.data.token;
}

interface QueryResult {
    data: unknown[][];
    resultSetMetaData: {
        rowType: { name: string; type: string }[];
    };
}

export async function executeQuery(sql: string, bindings?: Record<string, string | number | null>): Promise<Record<string, unknown>[]> {
    const config = getConfig();
    const token = await getAuthToken();

    const queryUrl = `https://${config.account}.snowflakecomputing.com/api/v2/statements`;

    const body: Record<string, unknown> = {
        statement: sql,
        timeout: 60,
        database: config.database,
        warehouse: config.warehouse,
        role: 'PUBLIC',
    };

    if (bindings) {
        body.bindings = bindings;
    }

    const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Snowflake Token="${token}"`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Snowflake query failed: ${error}`);
    }

    const result: QueryResult = await response.json();

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
export async function executeInsert(sql: string, bindings?: Record<string, string | number | null>): Promise<void> {
    const config = getConfig();
    const token = await getAuthToken();

    const queryUrl = `https://${config.account}.snowflakecomputing.com/api/v2/statements`;

    const body: Record<string, unknown> = {
        statement: sql,
        timeout: 60,
        database: config.database,
        warehouse: config.warehouse,
        role: 'PUBLIC',
    };

    if (bindings) {
        body.bindings = bindings;
    }

    const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Snowflake Token="${token}"`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Snowflake insert failed: ${error}`);
    }
}
