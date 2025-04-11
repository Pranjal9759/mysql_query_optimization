# SQL Query Optimization Project

This project demonstrates SQL query optimization techniques using a large dataset of 5 million OAuth token records.

## Setup

1. Start the MySQL Docker container:
```bash
docker run --name some-mysql -e MYSQL_ROOT_PASSWORD=my-secret-pw -d -p 3306:3306 mysql:latest
```

2. Install dependencies:
```bash
npm install
```

3. Setup the database and table (without indexes initially):
```bash
node setupDatabase.js
```

## Data Generation and Insertion

To generate and insert 5 million records:
```bash
node insertRecord.js
```

⚠️ **Warning**: This will generate and insert 5 million records which requires significant memory and may take a long time to complete.

## Query Optimization Tests

### Performance Testing Before Indexing

1. First, test basic queries without indexes:
```bash
node basicQueryOptimization.js
```

This tests fundamental query patterns including:
- Basic equality (WHERE user_id = x)
- IN clauses (WHERE user_id IN (1,2,3))
- BETWEEN clauses
- Multiple conditions with AND/OR
- LIKE operators
- Functions on columns
- LIMIT, ORDER BY, and GROUP BY

2. Test standard query patterns without indexes:
```bash
node queryOptimization.js
```

3. For more detailed analysis without indexes:
```bash
node queryOptimizationAdvanced.js
```

### Adding Indexes for Optimization

After testing performance without indexes, add indexes to optimize queries:
```bash
node addIndexes.js
```

This will add several single-column indexes and one compound index to the table.

### Performance Testing After Indexing

Run the same tests again to compare performance:
```bash
node basicQueryOptimization.js
node queryOptimization.js
node queryOptimizationAdvanced.js
```

Compare the execution times before and after adding indexes.

## Query Performance Logging

All query execution details are automatically logged to files in the `logs` directory. Each test run creates a new timestamped log file containing:

- Query statements and parameters
- Execution time in milliseconds
- Number of rows returned
- Full EXPLAIN analysis for each query
- Whether indexes were enabled during the test run

Log files are stored in the format: `query-performance-YYYY-MM-DDTHH-MM-SS.SSZ.log`

This makes it easy to compare performance before and after adding indexes without having to manually track results.

## Project Structure

- `.env` - Database configuration
- `setupDatabase.js` - Creates the database and table without indexes
- `insertRecord.js` - Generates and inserts 5 million random OAuth token records
- `basicQueryOptimization.js` - Tests basic SQL query patterns and their performance
- `queryOptimization.js` - Tests standard query performance with different approaches
- `queryOptimizationAdvanced.js` - Advanced performance testing with EXPLAIN analysis
- `addIndexes.js` - Adds various indexes to the table for optimization comparison
- `logs/` - Directory containing query performance log files

## Performance Considerations

For large datasets like this, consider:

1. Creating appropriate indexes for frequently queried columns
2. Using `EXPLAIN` to analyze query execution plans
3. Limiting result sets with `LIMIT`
4. Using appropriate data types for columns
5. Using prepared statements to prevent SQL injection
6. Optimizing `WHERE` clauses by avoiding functions on indexed columns
7. Select only necessary columns instead of using `SELECT *`
8. Consider adding compound indexes for common query patterns

## Common Query Optimization Techniques

1. **Avoid Using Functions on Indexed Columns**:
   - Bad: `WHERE DATE(expires_at) > CURDATE()`
   - Good: `WHERE expires_at > NOW()`

2. **Use Covering Indexes**:
   - Create indexes that include all columns used in your query

3. **Add Filters on Indexed Columns First**:
   - Prioritize filter conditions that use indexed columns

4. **Use LIMIT to Reduce Result Set Size**:
   - Always add LIMIT when you don't need all matching rows

5. **Consider Column Selectivity**:
   - Indexes work best on columns with high cardinality (many distinct values)
   
6. **Understand How Different Clauses Affect Indexes**:
   - Equality (=) can use indexes effectively
   - IN clauses can use indexes but less efficiently with many values
   - LIKE with a wildcard at the start ('*%pattern') cannot use indexes effectively
   - OR conditions may prevent index usage unless each condition has its own index 