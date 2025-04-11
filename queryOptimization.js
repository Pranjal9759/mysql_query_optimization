const mysql = require('mysql2/promise');
require('dotenv').config();

// Function to measure query execution time
async function measureQueryTime(connection, query, params = []) {
  const start = process.hrtime();
  await connection.execute(query, params);
  const [seconds, nanoseconds] = process.hrtime(start);
  return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
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

// Run optimization tests
async function runOptimizationTests() {
  let connection;
  
  try {
    connection = await connectToDatabase();
    console.log('Connected to the database for optimization tests.');
    
    // Test different queries and measure their performance
    
    // 1. Basic query with WHERE clause on indexed column
    console.log('\n1. Query with WHERE on user_id (indexed):');
    const userId = 42; // Example user ID
    const query1 = 'SELECT * FROM oauth_tokens WHERE user_id = ?';
    const time1 = await measureQueryTime(connection, query1, [userId]);
    console.log(`Execution time: ${time1.toFixed(2)} ms`);
    
    // 2. Query with multiple conditions
    console.log('\n2. Query with multiple conditions:');
    const query2 = 'SELECT * FROM oauth_tokens WHERE user_id = ? AND token_type = ?';
    const time2 = await measureQueryTime(connection, query2, [userId, 'Bearer']);
    console.log(`Execution time: ${time2.toFixed(2)} ms`);
    
    // 3. Query with ORDER BY
    console.log('\n3. Query with ORDER BY:');
    const query3 = 'SELECT * FROM oauth_tokens WHERE user_id = ? ORDER BY issued_at DESC LIMIT 100';
    const time3 = await measureQueryTime(connection, query3, [userId]);
    console.log(`Execution time: ${time3.toFixed(2)} ms`);
    
    // 4. Query counting tokens per user
    console.log('\n4. Query counting tokens per user:');
    const query4 = 'SELECT user_id, COUNT(*) as token_count FROM oauth_tokens GROUP BY user_id ORDER BY token_count DESC LIMIT 10';
    const time4 = await measureQueryTime(connection, query4);
    console.log(`Execution time: ${time4.toFixed(2)} ms`);
    
    // 5. Query with JOIN (if you had related tables)
    console.log('\n5. Complex query example - finding active tokens:');
    const query5 = `
      SELECT * FROM oauth_tokens 
      WHERE expires_at > NOW() 
      AND revoked_at IS NULL 
      AND user_id BETWEEN 1 AND 50
      LIMIT 100
    `;
    const time5 = await measureQueryTime(connection, query5);
    console.log(`Execution time: ${time5.toFixed(2)} ms`);
    
    // 6. Query on non-indexed column (for comparison)
    console.log('\n6. Query on token expiration (potentially not indexed optimally):');
    const query6 = `
      SELECT * FROM oauth_tokens 
      WHERE DATE(expires_at) = CURDATE() 
      LIMIT 100
    `;
    const time6 = await measureQueryTime(connection, query6);
    console.log(`Execution time: ${time6.toFixed(2)} ms`);
    
    console.log('\nAll optimization tests completed.');
    
  } catch (error) {
    console.error('Error during optimization tests:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the tests
runOptimizationTests(); 