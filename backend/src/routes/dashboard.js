import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Retrieves core Northwind KPIs.
 */
router.get('/stats', async (req, res) => {
  try {
    const [revenueRes, ordersRes, productsRes, customersRes] = await Promise.all([
      query("SELECT ROUND(SUM(unit_price * quantity * (1 - discount))::numeric, 2) AS value FROM order_details;"),
      query("SELECT COUNT(*) AS value FROM orders;"),
      query("SELECT COUNT(*) AS value FROM products;"),
      query("SELECT COUNT(*) AS value FROM customers;")
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenue: parseFloat(revenueRes.rows[0]?.value || 0),
        orders: parseInt(ordersRes.rows[0]?.value || 0, 10),
        products: parseInt(productsRes.rows[0]?.value || 0, 10),
        customers: parseInt(customersRes.rows[0]?.value || 0, 10)
      }
    });
  } catch (error) {
    console.error('[DashboardRouter] stats error:', error.message);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

/**
 * GET /api/dashboard/charts
 * Retrieves time-series monthly revenue sales and category performance share.
 */
router.get('/charts', async (req, res) => {
  try {
    // Execute both independent queries in parallel
    const [monthlySalesRes, categorySalesRes] = await Promise.all([
      query(`
        SELECT 
          TO_CHAR(o.order_date, 'YYYY-MM') AS month_key, 
          TO_CHAR(o.order_date, 'Mon YY') AS month, 
          ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount))::numeric, 2) AS sales 
        FROM orders o 
        JOIN order_details od ON o.order_id = od.order_id 
        GROUP BY month_key, month 
        ORDER BY month_key 
        LIMIT 12;
      `),
      query(`
        SELECT 
          c.category_name, 
          ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount))::numeric, 2) AS sales
        FROM categories c 
        JOIN products p ON c.category_id = p.category_id 
        JOIN order_details od ON p.product_id = od.product_id 
        GROUP BY c.category_name 
        ORDER BY sales DESC;
      `)
    ]);

    res.status(200).json({
      success: true,
      data: {
        monthlySales: monthlySalesRes.rows.map(row => ({
          month: row.month,
          sales: parseFloat(row.sales || 0)
        })),
        categorySales: categorySalesRes.rows.map(row => ({
          category: row.category_name,
          sales: parseFloat(row.sales || 0)
        }))
      }
    });
  } catch (error) {
    console.error('[DashboardRouter] charts error:', error.message);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

/**
 * GET /api/dashboard/recent-activity
 * Retrieves top inventory levels and latest orders.
 */
router.get('/recent-activity', async (req, res) => {
  try {
    // Execute both independent queries in parallel
    const [ordersRes, productsRes] = await Promise.all([
      query(`
        SELECT 
          o.order_id, 
          c.company_name, 
          TO_CHAR(o.order_date, 'YYYY-MM-DD') AS order_date, 
          o.ship_country, 
          ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount))::numeric, 2) AS total 
        FROM orders o 
        JOIN customers c ON o.customer_id = c.customer_id 
        JOIN order_details od ON o.order_id = od.order_id 
        GROUP BY o.order_id, c.company_name 
        ORDER BY o.order_date DESC 
        LIMIT 5;
      `),
      query(`
        SELECT 
          p.product_name, 
          c.category_name, 
          p.unit_price, 
          p.units_in_stock 
        FROM products p 
        JOIN categories c ON p.category_id = c.category_id 
        ORDER BY p.units_in_stock DESC 
        LIMIT 5;
      `)
    ]);

    res.status(200).json({
      success: true,
      data: {
        recentOrders: ordersRes.rows,
        topProducts: productsRes.rows
      }
    });
  } catch (error) {
    console.error('[DashboardRouter] activity error:', error.message);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

export default router;
