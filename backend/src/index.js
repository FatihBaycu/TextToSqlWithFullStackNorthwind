import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDbConnection } from './config/db.js';
import dashboardRouter from './routes/dashboard.js';
import ordersRouter from './routes/orders.js';
import customersRouter from './routes/customers.js';
import chatRouter from './routes/chat.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins in local dev; restrict for production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic HTTP logger
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// Mount secure routers
app.use('/api/dashboard', dashboardRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/chat', chatRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    service: 'text-to-sql-backend'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

// Connect to Database and start server
const startServer = async () => {
  const dbConnected = await testDbConnection();
  if (!dbConnected) {
    console.warn('[Database] Warning: Starting server without a verified database connection.');
  }

  app.listen(PORT, () => {
    console.log(`[Server] Secure AI Text-to-SQL Assistant backend running on port ${PORT}`);
  });
};

startServer();
