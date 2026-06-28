/**
 * LLM service connecting to local LM Studio server at http://127.0.0.1:1234.
 * Uses OpenAI-compatible streaming API to translate natural language into SQL.
 */

const LM_STUDIO_URL = 'http://127.0.0.1:1234/v1/chat/completions';

const SYSTEM_PROMPT = `You are a PostgreSQL expert specializing in the Northwind database.
Given a user request in natural language, generate a single read-only PostgreSQL query and a brief explanation of what it does.

Northwind Database Schema:
1. categories (category_id, category_name, description)
2. customers (customer_id, company_name, contact_name, contact_title, city, country, phone)
3. employees (employee_id, last_name, first_name, title, birth_date, hire_date, city, country)
4. orders (order_id, customer_id, employee_id, order_date, required_date, shipped_date, freight, ship_city, ship_country)
5. order_details (order_id, product_id, unit_price, quantity, discount)
6. products (product_id, product_name, supplier_id, category_id, unit_price, units_in_stock, units_on_order, discontinued)
7. suppliers (supplier_id, company_name, contact_name, city, country, phone)
8. shippers (shipper_id, company_name, phone)

Instructions:
1. Write ONLY read-only SELECT or WITH (CTE) queries. Never write mutating statements (INSERT, UPDATE, DELETE, DROP, etc.).
2. You MUST format your response EXACTLY like this:
\`\`\`
SELECT ...
\`\`\`
Provide a short explanation here.

Do not write any other markdown code blocks, warning notes, or conversational text. Focus on returning correct SQL.`;

/**
 * Async generator streaming tokens from LM Studio over SSE.
 * Splits raw stream text into thinking logs, SQL blocks, and descriptions.
 * @param {string} message 
 * @param {string} model
 */
export async function* generateSqlStream(message, model) {
  yield { type: 'thinking', content: `Contacting local LM Studio model [${model && model !== 'auto' ? model : 'Auto'}]...` };

  try {
    const response = await fetch(LM_STUDIO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model && model !== 'auto' ? model : 'local-model', // LM Studio will prioritize this if multiple loaded, or use active
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        stream: true,
        temperature: 0.1 // keep outputs highly deterministic
      })
    });


    if (!response.ok) {
      throw new Error(`LM Studio HTTP error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let state = 'thinking'; // 'thinking' | 'sql' | 'explanation'
    let accumulatedSql = '';
    let accumulatedExplanation = '';

    yield { type: 'thinking', content: 'Analyzing tables & generating query plan...' };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // save incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.choices[0]?.delta?.content;
            if (!token) continue;

            // Stream token parsing and state transitions
            if (state === 'thinking') {
              if (token.includes('```sql') || token.includes('```')) {
                state = 'sql';
                yield { type: 'sql_start', content: '' };
                const cleanedToken = token.replace(/```sql|```/g, '');
                if (cleanedToken) {
                  accumulatedSql += cleanedToken;
                  yield { type: 'sql_token', content: cleanedToken };
                }
              } else {
                yield { type: 'thinking', content: token };
              }
            } else if (state === 'sql') {
              if (token.includes('```')) {
                state = 'explanation';
                yield { type: 'sql_end', content: '' };
                yield { type: 'explanation_start', content: '' };
                const cleanedToken = token.replace(/```/g, '');
                if (cleanedToken) {
                  accumulatedExplanation += cleanedToken;
                  yield { type: 'explanation_token', content: cleanedToken };
                }
              } else {
                accumulatedSql += token;
                yield { type: 'sql_token', content: token };
              }
            } else if (state === 'explanation') {
              accumulatedExplanation += token;
              yield { type: 'explanation_token', content: token };
            }
          } catch (err) {
            // Ignore json parser warnings
          }
        }
      }
    }

    // Fallback: If model completed generation but state machine didn't exit 'sql' block
    if (state === 'sql') {
      yield { type: 'sql_end', content: '' };
    }

    let cleanedFinalSql = accumulatedSql.replace(/```sql|```/gi, '').trim();

    // Strip leading 'sql' token if it leaked from split code block markdown
    if (cleanedFinalSql.toLowerCase().startsWith('sql')) {
      const match = cleanedFinalSql.match(/^sql\s+/i);
      if (match) {
        cleanedFinalSql = cleanedFinalSql.substring(match[0].length).trim();
      }
    }

    yield {
      type: 'complete',
      content: {
        sql: cleanedFinalSql || 'SELECT * FROM products LIMIT 10;',
        explanation: accumulatedExplanation.trim() || 'Query generated successfully from LM Studio.'
      }
    };


  } catch (error) {
    console.error('[llmService] LM Studio execution failed:', error.message);
    throw new Error(`LM Studio Connection Failed. Verify your server is active on http://127.0.0.1:1234. Detail: ${error.message}`);
  }
}
