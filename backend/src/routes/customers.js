import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

/**
 * GET /api/customers
 * Returns search-filtered, paginated lists of customers.
 * Params: ?page=1&limit=12&search=Alfreds
 */
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '12', 10);
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    const searchPattern = `%${search}%`;

    // Fetch total count and customer list in parallel
    const [countRes, customersRes] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM customers 
         WHERE company_name ILIKE $1 OR contact_name ILIKE $1 OR country ILIKE $1 OR city ILIKE $1 OR customer_id ILIKE $1`,
        [searchPattern]
      ),
      query(
        `SELECT 
          customer_id, 
          company_name, 
          contact_name, 
          contact_title, 
          city, 
          country, 
          phone 
        FROM customers 
        WHERE company_name ILIKE $1 OR contact_name ILIKE $1 OR country ILIKE $1 OR city ILIKE $1 OR customer_id ILIKE $1
        ORDER BY company_name ASC 
        LIMIT $2 OFFSET $3`,
        [searchPattern, limit, offset]
      )
    ]);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    res.status(200).json({
      success: true,
      data: {
        customers: customersRes.rows,
        pagination: {
          totalCount,
          currentPage: page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('[CustomersRouter] fetch error:', error.message);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

export default router;
