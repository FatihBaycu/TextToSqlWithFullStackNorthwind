import express from 'express';
import crypto from 'crypto';
import { generateSqlStream } from '../services/llmService.js';
import { executeDynamicQuery } from '../services/dbExecutor.js';

const router = express.Router();

// Server-side cache mapping short-lived queryId (UUID) -> SQL Query String
const queryCache = new Map();

/**
 * GET /api/chat/models
 * Fetches loaded models from local LM Studio server.
 */
router.get('/models', async (req, res) => {
  try {
    const response = await fetch('http://127.0.0.1:1234/v1/models');
    if (!response.ok) throw new Error('LM Studio response error');
    const data = await response.json();
    const models = (data.data || []).map(m => m.id);
    return res.status(200).json({ success: true, models });
  } catch (error) {
    console.warn('[chatRouter] LM Studio offline, returning empty models registry:', error.message);
    return res.status(200).json({ success: true, models: [] });
  }
});

/**
 * GET /api/chat/stream
 * Server-Sent Events (SSE) endpoint to stream simulated LLM text-to-SQL logic.
 * Query parameter: ?message=your+question&model=auto
 */
router.get('/stream', async (req, res) => {
  const { message, model } = req.query;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required query parameter "message".'
    });
  }

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`[SSE] Opened connection for message: "${message}", model: "${model || 'auto'}"`);

  req.on('close', () => {
    console.log('[SSE] Client disconnected');
    res.end();
  });

  try {
    const stream = generateSqlStream(message, model);
    let finalSql = '';

    let finalExplanation = '';
    
    for await (const chunk of stream) {
      if (chunk.type === 'sql_token') {
        finalSql += chunk.content;
      }
      if (chunk.type === 'explanation_token') {
        finalExplanation += chunk.content;
      }

      // Handle the complete event to generate and insert UUID to cache
      if (chunk.type === 'complete') {
        const queryId = crypto.randomUUID();
        
        // Cache the SQL string with a 10-minute TTL to prevent memory leaks
        queryCache.set(queryId, chunk.content.sql);
        setTimeout(() => {
          queryCache.delete(queryId);
          console.log(`[Cache] Cleaned up expired queryId: ${queryId}`);
        }, 10 * 60 * 1000);

        // Send tokenized metadata payload containing queryId
        const clientPayload = {
          queryId,
          sql: chunk.content.sql, // Sent purely for client side visual formatting
          explanation: chunk.content.explanation
        };
        
        res.write(`event: complete\n`);
        res.write(`data: ${JSON.stringify(clientPayload)}\n\n`);
      } else {
        // Stream other tokens normally
        res.write(`event: ${chunk.type}\n`);
        res.write(`data: ${JSON.stringify(chunk.content)}\n\n`);
      }
    }
    
    res.write('event: done\ndata: {}\n\n');
  } catch (error) {
    console.error('[SSE] Streaming error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

/**
 * POST /api/chat/execute
 * Executes an AI-generated SQL query securely using a server-cached query token.
 * Request Body: { queryId }
 */
router.post('/execute', async (req, res) => {
  const { queryId } = req.body;

  if (!queryId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required body parameter "queryId".'
    });
  }

  // Retrieve cached SQL string
  const cachedSql = queryCache.get(queryId);
  
  if (!cachedSql) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired query token. Please prompt the assistant again.'
    });
  }

  console.log(`[SecureExecutor] Executing stashed SQL for queryId ${queryId}: ${cachedSql}`);

  try {
    const result = await executeDynamicQuery(cachedSql);
    
    // Optional: One-time token policy could delete queryId here,
    // but keeping it for TTL is safer if client needs to re-fetch/re-render data.
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[SecureExecutor] Database execution error:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
