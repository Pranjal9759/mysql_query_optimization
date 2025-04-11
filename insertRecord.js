const mysql = require('mysql2');
require('dotenv').config();

// Function to generate random data for each record
function generateRandomData() {
    const usersCount = 180; // Number of unique user IDs
    const clientsCount = 18; // Number of unique client IDs

    // Generate a random user and client ID within the specified range
    const userId = Math.floor(Math.random() * usersCount) + 1;
    const clientId = Math.floor(Math.random() * clientsCount) + 1;

    // Generate a random token type (e.g., Bearer, Refresh)
    const tokenTypes = ['Bearer', 'Refresh'];
    const tokenType = tokenTypes[Math.floor(Math.random() * tokenTypes.length)];

    // Generate a random access_token of length between 40 and 80 characters
    const generateRandomString = (length) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };

    const accessTokenLength = Math.floor(Math.random() * 41) + 40; // Length between 40 and 80
    const access_token = generateRandomString(accessTokenLength);

    // Generate a random refresh_token of length between 32 and 64 characters
    const refreshTokenLength = Math.floor(Math.random() * 33) + 32; // Length between 32 and 64
    const refresh_token = generateRandomString(refreshTokenLength);

    // Calculate issued_at, expires_at, and refresh_token_expires_at
    const now = new Date();
    const issuedAt = now.toISOString().slice(0, 19).replace('T', ' ');
    const tokenLifetime = Math.floor(Math.random() * (365 * 24)); // Random lifetime between 0 and 1 year in days
    const expiresAt = new Date(now.getTime() + tokenLifetime * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const refreshTokenLifetime = Math.floor(Math.random() * (365 * 7)); // Random lifetime between 0 and 1 year in weeks
    const refreshTokenExpiresAt = new Date(now.getTime() + refreshTokenLifetime * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    // Optional: Generate revoked_at if the token is expired
    const isExpired = Math.random() > 0.5;
    const revokedAt = isExpired ? new Date(now.getTime() + (tokenLifetime + 30) * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ') : null;

    return {
        user_id: userId,
        client_id: clientId,
        access_token: access_token,
        token_type: tokenType,
        refresh_token: refresh_token,
        issued_at: issuedAt,
        revoked_at: revokedAt,
        expires_at: expiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt
    };
}

// Function to insert records in batches
async function batchInsert(connection, records) {
    const query = `
        INSERT INTO oauth_tokens (
            user_id, client_id, access_token, token_type,
            refresh_token, issued_at, revoked_at, expires_at,
            refresh_token_expires_at
        ) VALUES ?
    `;

    const values = records.map(record => [
        record.user_id,
        record.client_id,
        record.access_token,
        record.token_type,
        record.refresh_token,
        record.issued_at,
        record.revoked_at,
        record.expires_at,
        record.refresh_token_expires_at
    ]);

    await new Promise((resolve, reject) => {
        connection.query(query, [values], (error, results) => {
            if (error) return reject(error);
            resolve(results);
        });
    });
}

// Connect to the MySQL database using environment variables
function connectToDatabase() {
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        insecureAuth: true,
    });

    return new Promise((resolve, reject) => {
        connection.connect(error => {
            if (error) return reject(error);
            console.log('Connected to the database.');
            resolve(connection);
        });
    });
}

// Main function to execute the script
async function main() {
    try {
        const totalRecords = 5000000;
        const batchSize = 10000; // Process 10,000 records at a time
        const totalBatches = Math.ceil(totalRecords / batchSize);
        
        console.log(`Starting to insert ${totalRecords} records in ${totalBatches} batches of ${batchSize} records each.`);

        const connection = await connectToDatabase();
       
        // Disable foreign key checks
        await new Promise((resolve, reject) => {
            connection.query('SET FOREIGN_KEY_CHECKS=0', (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        // Optimize MySQL for bulk inserts
        await new Promise((resolve, reject) => {
            connection.query('SET autocommit=0', (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        // Process in smaller batches to avoid memory issues
        let processedRecords = 0;
        
        for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
            // Calculate how many records to generate in this batch
            const remainingRecords = totalRecords - processedRecords;
            const currentBatchSize = Math.min(batchSize, remainingRecords);
            
            // Generate batch of records
            const batchRecords = [];
            for (let i = 0; i < currentBatchSize; i++) {
                batchRecords.push(generateRandomData());
            }
            
            // Insert the batch
            await batchInsert(connection, batchRecords);
            
            // Update processed count
            processedRecords += currentBatchSize;
            console.log(`Batch ${batchNum + 1}/${totalBatches} completed. Progress: ${processedRecords}/${totalRecords} records (${Math.round(processedRecords/totalRecords*100)}%)`);
            
            // Free memory
            batchRecords.length = 0;
            
            // Commit every 10 batches
            if (batchNum % 10 === 0 || batchNum === totalBatches - 1) {
                await new Promise((resolve, reject) => {
                    connection.query('COMMIT', (error) => {
                        if (error) return reject(error);
                        resolve();
                    });
                });
            }
            
            // Optional: Add a small delay to allow garbage collection
            if (batchNum % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Re-enable autocommit and foreign key checks
        await new Promise((resolve, reject) => {
            connection.query('SET autocommit=1', (error) => {
                if (error) return reject(error);
                resolve();
            });
        });
        
        await new Promise((resolve, reject) => {
            connection.query('SET FOREIGN_KEY_CHECKS=1', (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        console.log(`Inserted ${totalRecords} records successfully.`);
        
        // Close connection
        connection.end();
        
    } catch (error) {
        console.error('An unexpected error occurred:', error.message);
    }
}

main().catch(error => {
    console.error('Script failed:', error);
}); 