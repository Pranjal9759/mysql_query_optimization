const mysql = require('mysql2');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let connection;
  
  try {
    // First connect without database to create it
    connection = mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    // Create database if it doesn't exist
    await new Promise((resolve, reject) => {
      connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_DATABASE}`, (error) => {
        if (error) return reject(error);
        console.log(`Database ${process.env.DB_DATABASE} created or already exists.`);
        resolve();
      });
    });
    
    // Close connection
    connection.end();
    
    // Connect to the specific database
    connection = mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });
    
    // Create oauth_tokens table WITHOUT indexes initially
    await new Promise((resolve, reject) => {
      const createTable = `
        CREATE TABLE IF NOT EXISTS oauth_tokens (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNSIGNED NOT NULL,
          client_id INT UNSIGNED NOT NULL,
          access_token VARCHAR(255) NOT NULL,
          token_type VARCHAR(20) NOT NULL,
          refresh_token VARCHAR(255) NOT NULL,
          issued_at DATETIME NOT NULL,
          revoked_at DATETIME NULL,
          expires_at DATETIME NOT NULL,
          refresh_token_expires_at DATETIME NOT NULL
        ) ENGINE=InnoDB;
      `;
      
      connection.query(createTable, (error) => {
        if (error) return reject(error);
        console.log('Table oauth_tokens created or already exists (without indexes).');
        resolve();
      });
    });
    
    // Remove any existing index flags if they exist
    const flagFile = path.join(__dirname, '.indexes_added');
    if (fs.existsSync(flagFile)) {
      fs.unlinkSync(flagFile);
      console.log('Removed existing indexes flag file.');
    }
    
    // Update .env file to set INDEXES_ADDED=false
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('INDEXES_ADDED=')) {
        // Replace existing setting
        envContent = envContent.replace(/INDEXES_ADDED=.*/g, 'INDEXES_ADDED=false');
      } else {
        // Add new setting
        envContent += '\nINDEXES_ADDED=false\n';
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('.env file updated with INDEXES_ADDED=false');
    } else {
      fs.writeFileSync(envPath, 'INDEXES_ADDED=false\n', { flag: 'a' });
      console.log('Added INDEXES_ADDED=false to .env file');
    }
    
    // Also set the environment variable for this process
    process.env.INDEXES_ADDED = 'false';
    
    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Database setup failed:', error.message);
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

setupDatabase(); 