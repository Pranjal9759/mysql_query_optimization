const mysql = require('mysql2');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function addIndexes() {
  let connection;
  
  try {
    // Connect to the database
    connection = mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });
    
    console.log('Connected to database. Adding indexes...');
    
    // Add single-column indexes
    const indexes = [
      { name: 'idx_user_id', column: 'user_id' },
      { name: 'idx_client_id', column: 'client_id' },
      { name: 'idx_token_type', column: 'token_type' },
      { name: 'idx_access_token', column: 'access_token' },
      { name: 'idx_refresh_token', column: 'refresh_token' },
      { name: 'idx_expires_at', column: 'expires_at' }
    ];
    
    for (const index of indexes) {
      await new Promise((resolve, reject) => {
        const query = `ALTER TABLE oauth_tokens ADD INDEX ${index.name} (${index.column})`;
        connection.query(query, (error) => {
          if (error) {
            console.log(`Warning: Could not add index ${index.name}. It may already exist or there was an error: ${error.message}`);
          } else {
            console.log(`Added index ${index.name} on column ${index.column}`);
          }
          resolve();
        });
      });
    }
    
    // Add a compound index for common query patterns
    await new Promise((resolve, reject) => {
      const query = `ALTER TABLE oauth_tokens ADD INDEX idx_user_token_type (user_id, token_type)`;
      connection.query(query, (error) => {
        if (error) {
          console.log(`Warning: Could not add compound index idx_user_token_type. It may already exist or there was an error: ${error.message}`);
        } else {
          console.log(`Added compound index idx_user_token_type on columns user_id, token_type`);
        }
        resolve();
      });
    });
    
    console.log('All requested indexes have been processed.');
    
    // Create a flag file to indicate indexes have been added
    const flagFile = path.join(__dirname, '.indexes_added');
    fs.writeFileSync(flagFile, new Date().toISOString());
    console.log(`Created flag file at ${flagFile}`);
    
    // Update .env file to include INDEXES_ADDED=true
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('INDEXES_ADDED=')) {
        // Replace existing setting
        envContent = envContent.replace(/INDEXES_ADDED=.*/g, 'INDEXES_ADDED=true');
      } else {
        // Add new setting
        envContent += '\nINDEXES_ADDED=true\n';
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('.env file updated with INDEXES_ADDED=true');
    } else {
      fs.writeFileSync(envPath, 'INDEXES_ADDED=true\n', { flag: 'a' });
      console.log('Added INDEXES_ADDED=true to .env file');
    }
    
    // Also set the environment variable for this process
    process.env.INDEXES_ADDED = 'true';
    
  } catch (error) {
    console.error('Error adding indexes:', error.message);
  } finally {
    if (connection) {
      connection.end();
      console.log('Database connection closed.');
    }
  }
}

addIndexes(); 