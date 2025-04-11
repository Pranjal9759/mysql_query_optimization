const mysql = require('mysql2/promise');
require('dotenv').config();

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

// Function to measure query execution time and get EXPLAIN data
async function analyzeQuery(connection, query, params = [], description) {
  console.log(`\n=== ${description} ===`);
  console.log(`Query: ${query}`);
  
  // Get execution plan
  console.log('\nExecution Plan (EXPLAIN):');
  const [explainResults] = await connection.execute(`EXPLAIN ${query}`, params);
  console.table(explainResults);
  
  // Measure execution time
  const start = process.hrtime();
  const [results] = await connection.execute(query, params);
  const [seconds, nanoseconds] = process.hrtime(start);
  const executionTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
  
  console.log(`Results: ${results.length} rows returned`);
  console.log(`Execution time: ${executionTime.toFixed(2)} ms`);
  
  return { executionTime, rowCount: results.length };
}

// Function to compare query performances
async function compareQueries(connection, queries) {
  const results = [];
  
  for (const q of queries) {
    const { executionTime, rowCount } = await analyzeQuery(
      connection, 
      q.query, 
      q.params || [], 
      q.description
    );
    
    results.push({
      description: q.description,
      executionTime,
      rowCount
    });
  }
  
  // Compare results
  console.log('\n=== Performance Comparison ===');
  console.table(results);
  
  // Find the fastest query
  const fastest = results.reduce((prev, current) => 
    (prev.executionTime < current.executionTime) ? prev : current
  );
  
  console.log(`\nThe fastest query was: "${fastest.description}" at ${fastest.executionTime.toFixed(2)} ms`);
}

// Run advanced optimization tests
async function runAdvancedOptimizationTests() {
  let connection;
  
  try {
    connection = await connectToDatabase();
    console.log('Connected to the database for advanced optimization tests.');
    
    // Example 1: Compare different ways to query active tokens
    console.log('\n\n=== COMPARISON 1: Finding Active Tokens ===');
    await compareQueries(connection, [
      { 
        description: 'Using function on date column (inefficient)',
        query: 'SELECT * FROM oauth_tokens WHERE DATE(expires_at) > CURDATE() AND revoked_at IS NULL LIMIT 100'
      },
      { 
        description: 'Direct date comparison (better)',
        query: 'SELECT * FROM oauth_tokens WHERE expires_at > NOW() AND revoked_at IS NULL LIMIT 100'
      },
      { 
        description: 'With additional user_id filter (best)',
        query: 'SELECT * FROM oauth_tokens WHERE expires_at > NOW() AND revoked_at IS NULL AND user_id BETWEEN 1 AND 50 LIMIT 100'
      }
    ]);
    
    // Example 2: Comparing different JOIN strategies (if you had related tables)
    console.log('\n\n=== COMPARISON 2: Aggregate Queries ===');
    await compareQueries(connection, [
      { 
        description: 'Count with GROUP BY',
        query: 'SELECT user_id, COUNT(*) as token_count FROM oauth_tokens GROUP BY user_id ORDER BY token_count DESC LIMIT 10'
      },
      { 
        description: 'Count with specific token type',
        query: 'SELECT user_id, COUNT(*) as token_count FROM oauth_tokens WHERE token_type = "Bearer" GROUP BY user_id ORDER BY token_count DESC LIMIT 10'
      }
    ]);
    
    // Example 3: Impact of LIMIT on performance
    console.log('\n\n=== COMPARISON 3: Impact of LIMIT ===');
    await compareQueries(connection, [
      { 
        description: 'No LIMIT',
        query: 'SELECT * FROM oauth_tokens WHERE user_id = 5 AND token_type = "Bearer"'
      },
      { 
        description: 'With LIMIT 1000',
        query: 'SELECT * FROM oauth_tokens WHERE user_id = 5 AND token_type = "Bearer" LIMIT 1000'
      },
      { 
        description: 'With LIMIT 100',
        query: 'SELECT * FROM oauth_tokens WHERE user_id = 5 AND token_type = "Bearer" LIMIT 100'
      },
      { 
        description: 'With LIMIT 10',
        query: 'SELECT * FROM oauth_tokens WHERE user_id = 5 AND token_type = "Bearer" LIMIT 10'
      }
    ]);
    
    // Example 4: Access pattern optimization
    console.log('\n\n=== COMPARISON 4: Column Selection Impact ===');
    await compareQueries(connection, [
      { 
        description: 'SELECT * (all columns)',
        query: 'SELECT * FROM oauth_tokens WHERE user_id = 10 LIMIT 1000'
      },
      { 
        description: 'SELECT specific columns',
        query: 'SELECT id, user_id, access_token, expires_at FROM oauth_tokens WHERE user_id = 10 LIMIT 1000'
      }
    ]);
    
    console.log('\nAll advanced optimization tests completed.');
    
  } catch (error) {
    console.error('Error during advanced optimization tests:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the tests
runAdvancedOptimizationTests(); 