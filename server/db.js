const { Pool } = require('pg');
const pg = require('pg');
require('dotenv').config();

// --- Configure Numeric Type Parsing ---

// OID 1700 is for NUMERIC/DECIMAL (most common for prices)
// This tells pg to parse values retrieved from columns of this type as floats
pg.types.setTypeParser(1700, (stringValue) => {
    console.log(`[pg Type Parser] Parsing NUMERIC/DECIMAL OID 1700: "${stringValue}"`); // Optional: Add logging
    return parseFloat(stringValue); // Convert string value to float
  });
  
  // --- Parsers for other float types---

  // OID 700 is for REAL (float4)
  pg.types.setTypeParser(700, (val) => {
      console.log(`[pg Type Parser] Parsing REAL OID 700: "${val}"`); // Optional: Add logging
      return parseFloat(val);
  });
  // OID 701 is for DOUBLE PRECISION (float8)
  pg.types.setTypeParser(701, (val) => {
      console.log(`[pg Type Parser] Parsing DOUBLE PRECISION OID 701: "${val}"`); // Optional: Add logging
      return parseFloat(val);
  });
  // --- End Type Parsing Configuration ---


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