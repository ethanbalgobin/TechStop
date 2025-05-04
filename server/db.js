const { Pool } = require('pg');

require('dotenv').config();

// Pool instance
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

// Testing the connection :

pool.connect((err, client, release) => {
    if (err)
        return console.error('Error acquiring client', err.stack);
    console.log('Successfully connected to the database!');
    // Release client back to the pool
    release();
});

// exporting the query method so other files can run queries
module.exports = {
    query: (text, params) => pool.query(text, params),
};

// *** DEBUG LOGGING ADDED HERE ***
// Log what we are about to export
console.log('--- DEBUG: Exporting db module ---');
console.log('Type of pool.query:', typeof pool.query); // Should log 'function'
const exportedObject = {
  query: (text, params) => pool.query(text, params),
};
console.log('Exported object structure:', exportedObject);
console.log('---------------------------------');

// Export the pool's query method
module.exports = exportedObject;

module.exports = pool;