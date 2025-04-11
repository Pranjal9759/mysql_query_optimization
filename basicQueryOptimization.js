const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Setup logging
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFile = path.join(logsDir, `query-performance-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Function to log to file
function logToFile(message) {
  logStream.write(message + '\n');
  console.log(message); // Also log to console
}

// Function to measure query execution time and print results
async function measureQuery(connection, query, params = [], description) {
  logToFile(`\n=== ${description} ===`);
  logToFile(`Query: ${query}`);
  logToFile(`Parameters: ${JSON.stringify(params)}`);
  
  // Measure execution time
  const start = process.hrtime();
  const [results] = await connection.execute(query, params);
  const [seconds, nanoseconds] = process.hrtime(start);
  const executionTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
  
  logToFile(`Results: ${results.length} rows returned`);
  logToFile(`Execution time: ${executionTime.toFixed(2)} ms`);
  
  // Get execution plan
  logToFile('Execution Plan (EXPLAIN):');
  const [explainResults] = await connection.execute(`EXPLAIN ${query}`, params);
  
  // Format EXPLAIN results for the log file
  const explainColumns = Object.keys(explainResults[0]);
  const headerRow = explainColumns.join(' | ');
  const separatorRow = explainColumns.map(() => '----------').join(' | ');
  
  logToFile(headerRow);
  logToFile(separatorRow);
  
  explainResults.forEach(row => {
    const rowValues = explainColumns.map(col => String(row[col] || '')).join(' | ');
    logToFile(rowValues);
  });
  
  return { executionTime, rowCount: results.length };
}

// Connect to the database
async function connectToDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  return connection;
}

// Basic query tests
async function runBasicQueryTests() {
  let connection;
  
  try {
    connection = await connectToDatabase();
    logToFile('Connected to the database for basic query tests.');
    logToFile(`Test started at: ${new Date().toISOString()}`);
    
    // Check if indexes should be used based on .env setting
    const useIndexes = process.env.INDEXES_ADDED === 'true';
    logToFile(`Index status: ${useIndexes ? 'WITH indexes' : 'WITHOUT indexes'}`);
    
    // Sample user IDs for testing
    const userId = 10; // Test with a single user ID
    const userIds = [10, 20, 30, 40, 50]; // Test with multiple user IDs
    
    // 1. Basic equality query
    await measureQuery(
      connection,
      useIndexes 
        ? 'SELECT user_id, token_type, client_id FROM oauth_tokens WHERE user_id = ?' 
        : 'SELECT * FROM oauth_tokens WHERE user_id = ?',
      [userId],
      '1. Basic equality query (simple WHERE clause)'
    );
    
    // 2. Query with IN clause
    await measureQuery(
      connection,
      useIndexes 
        ? 'SELECT user_id, token_type, client_id FROM oauth_tokens WHERE user_id IN (?, ?, ?, ?, ?)' 
        : 'SELECT * FROM oauth_tokens WHERE user_id IN (?, ?, ?, ?, ?)',
      userIds,
      '2. Query with IN clause (multiple specific values)'
    );
    
    // 3. Query with BETWEEN
    await measureQuery(
      connection,
      useIndexes 
        ? 'SELECT user_id, token_type, client_id FROM oauth_tokens WHERE user_id BETWEEN ? AND ?' 
        : 'SELECT * FROM oauth_tokens WHERE user_id BETWEEN ? AND ?',
      [5, 15],
      '3. Query with BETWEEN (range of values)'
    );
    
    // 4. Query with multi-column conditions (AND)
    await measureQuery(
      connection,
      useIndexes 
        ? 'SELECT user_id, token_type, client_id FROM oauth_tokens WHERE user_id = ? AND token_type = ?' 
        : 'SELECT * FROM oauth_tokens WHERE user_id = ? AND token_type = ?',
      [userId, 'Bearer'],
      '4. Query with multiple conditions (AND)'
    );
    
    logToFile('\nAll basic query tests completed.');
    logToFile(`Test ended at: ${new Date().toISOString()}`);
  } catch (error) {
    logToFile(`Error during basic query tests: ${error.message}`);
    console.error('Error during basic query tests:', error);
  } finally {
    if (connection) {
      await connection.end();
      logToFile('Database connection closed.');
    }
    // Close log file
    logStream.end();
    console.log(`Log file saved to: ${logFile}`);
  }
}

// Run the tests
runBasicQueryTests(); 