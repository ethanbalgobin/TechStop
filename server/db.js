// Disable SSL certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');
const pg = require('pg');
require('dotenv').config();

// Debug logging
console.log('Environment variables loaded:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    urlLength: process.env.SUPABASE_URL?.length
});

// Configure Numeric Type Parsing
pg.types.setTypeParser(1700, (stringValue) => {
    return parseFloat(stringValue);
});

pg.types.setTypeParser(700, (val) => {
    return parseFloat(val);
});

pg.types.setTypeParser(701, (val) => {
    return parseFloat(val);
});

// Create connection string from Supabase URL
const connectionString = process.env.SUPABASE_URL;

if (!connectionString) {
    console.error('SUPABASE_URL is not defined in environment variables');
    process.exit(1);
}

// Pool configuration
const poolConfig = {
    connectionString,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000, // How long to wait for a connection
    maxUses: 7500, // Maximum number of times a client can be used before being removed from the pool
};

// Pool instance
const pool = new Pool(poolConfig);

// Add event listeners to the pool
pool.on('connect', (client) => {
    console.log('New client connected to the database');
    // Set a timeout to log if the client is idle for too long
    const idleTimeout = setTimeout(() => {
        console.warn('Client has been idle for more than 30 seconds');
    }, 30000);
    
    client.on('end', () => {
        clearTimeout(idleTimeout);
        console.log('Client disconnected from the database');
    });
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit the process, just log the error
    console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
    });
});

// Wrap the query function to add logging and timeout
const originalQuery = pool.query;
pool.query = async (text, params) => {
    const start = Date.now();
    const queryId = Math.random().toString(36).substring(7);
    console.log(`[Query ${queryId}] Executing query:`, text);
    console.log(`[Query ${queryId}] Parameters:`, params);
    
    try {
        const res = await Promise.race([
            originalQuery.call(pool, text, params),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Query timeout')), 5000)
            )
        ]);
        
        const duration = Date.now() - start;
        console.log(`[Query ${queryId}] Executed successfully in ${duration}ms`);
        return res;
    } catch (error) {
        const duration = Date.now() - start;
        console.error(`[Query ${queryId}] Failed after ${duration}ms:`, error);
        throw error;
    }
};

// Test the connection
const testConnection = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log('Successfully connected to Supabase!');
        // Test a simple query
        const result = await client.query('SELECT NOW()');
        console.log('Database time:', result.rows[0].now);
    } catch (err) {
        console.error('Error connecting to Supabase:', err.message);
        console.error('Error details:', {
            code: err.code,
            stack: err.stack
        });
        // Don't exit the process, just log the error
    } finally {
        if (client) {
            client.release();
            console.log('Released test connection client');
        }
    }
};

// Run the connection test
testConnection();

// Export the pool
module.exports = pool;

