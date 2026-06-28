import pool from '../config/db.js';

/**
 * Service to execute raw dynamic SQL queries safely on the PostgreSQL database.
 * Enforces security checks and read-only transaction blocks.
 */
export const executeDynamicQuery = async (sqlQuery) => {
  if (!sqlQuery || typeof sqlQuery !== 'string') {
    throw new Error('Invalid query format. Query must be a non-empty string.');
  }

  let trimmedQuery = sqlQuery.trim();

  // Strip leading/trailing markdown code blocks if present
  trimmedQuery = trimmedQuery.replace(/^```sql\b/i, '')
                             .replace(/^```/i, '')
                             .replace(/```$/i, '')
                             .trim();

  // Strip leading 'sql' keyword if it leaked from tokenized headers
  if (trimmedQuery.toLowerCase().startsWith('sql')) {
    const match = trimmedQuery.match(/^sql\s+/i);
    if (match) {
      trimmedQuery = trimmedQuery.substring(match[0].length).trim();
    }
  }

  // Basic regex check: Allow only SELECT or WITH (CTE) queries for dynamic analysis
  const allowedPattern = /^(SELECT|WITH)\b/i;
  if (!allowedPattern.test(trimmedQuery)) {
    throw new Error('Security Error: Only SELECT and WITH (CTE) queries are allowed for execution.');
  }


  // Preemptively block commands that can mutate schema/data, just in case
  const forbiddenKeywords = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE)\b/i;
  if (forbiddenKeywords.test(trimmedQuery)) {
    throw new Error('Security Error: Data definition or modification commands are strictly prohibited.');
  }

  // Execute within a Read-Only transaction for absolute safety at the DB level
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION READ ONLY');
    
    const startTime = process.hrtime();
    const result = await client.query(trimmedQuery);
    const endTime = process.hrtime(startTime);
    
    // Calculate execution duration in milliseconds
    const durationMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);

    await client.query('COMMIT');

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
      executionTimeMs: parseFloat(durationMs)
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[dbExecutor] Rollback failed:', rollbackError);
    }
    // Propagate a clean database error
    throw new Error(`Database execution failed: ${error.message}`);
  } finally {
    client.release();
  }
};
