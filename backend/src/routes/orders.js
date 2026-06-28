import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

/**
 * GET /api/orders
 * Returns a search-filtered and paginated list of orders.
 * Params: ?page=1&limit=15&search=Germany
 */
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '15', 10);
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    const searchPattern = `%${search}%`;

    // Fetch total count and order list in parallel
    const [countRes, ordersRes] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM orders 
         WHERE ship_country ILIKE $1 OR customer_id ILIKE $1 OR ship_city ILIKE $1`,
        [searchPattern]
      ),
      query(
        `SELECT 
          order_id, 
          customer_id, 
          TO_CHAR(order_date, 'YYYY-MM-DD') AS order_date, 
          TO_CHAR(required_date, 'YYYY-MM-DD') AS required_date,
          TO_CHAR(shipped_date, 'YYYY-MM-DD') AS shipped_date,
          ship_city, 
          ship_country, 
          ROUND(freight::numeric, 2) AS freight 
        FROM orders 
        WHERE ship_country ILIKE $1 OR customer_id ILIKE $1 OR ship_city ILIKE $1
        ORDER BY order_date DESC 
        LIMIT $2 OFFSET $3`,
        [searchPattern, limit, offset]
      )
    ]);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const now = new Date();

    // Map order records with a calculated status tag
    const mappedOrders = ordersRes.rows.map(order => {
      let status = 'Shipped';
      if (!order.shipped_date) {
        const required = new Date(order.required_date);
        status = required < now ? 'Overdue' : 'Pending';
      }

      return {
        ...order,
        status,
        freight: parseFloat(order.freight || 0)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        orders: mappedOrders,
        pagination: {
          totalCount,
          currentPage: page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('[OrdersRouter] fetch error:', error.message);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

export default router;
