import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// Load environment variables FIRST
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Enhanced Middleware
// ======================

// CORS with more options
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || 'https://final-project-coffeeshop-api-1haa.onrender.com'
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Morgan logging with more detail
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req, res) => req.path === '/health' // Skip health checks from logs
}));

// Body parsing with size limits
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// Request Logging Middleware
// ======================

app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method !== 'GET') {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  }
  
  // Capture response
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    
    // Log error responses
    if (res.statusCode >= 400) {
      console.log('Error Response:', body);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});

// ======================
// Database Connection Test Route
// ======================

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    import('../db.js').then(async ({ default: prisma }) => {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    }).catch(err => {
      console.error('Database connection error:', err);
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: err.message
      });
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

// ======================
// Routes
// ======================

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import menuItemRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/orders.routes.js';

// Apply routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);

// ======================
// Database Test Endpoint (for debugging)
// ======================

app.get('/api/test-db', async (req, res) => {
  try {
    // Dynamic import to avoid circular dependencies
    const { default: prisma } = await import('./db.js');
    
    // Test multiple queries
    const [menuItems, categories, users] = await Promise.all([
      prisma.menuItem.findMany({ take: 3, where: { is_available: true } }),
      prisma.category.findMany({ take: 3 }),
      prisma.user.findMany({ take: 2, select: { id: true, username: true } })
    ]);
    
    res.json({
      success: true,
      database: 'connected',
      counts: {
        menuItems: menuItems.length,
        categories: categories.length,
        users: users.length
      },
      sampleData: {
        menuItems: menuItems.map(m => ({ id: m.id, name: m.name, price: m.price })),
        categories: categories.map(c => ({ id: c.id, name: c.name })),
        users: users
      }
    });
  } catch (err) {
    console.error('Database test error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      details: 'Check DATABASE_URL in .env file and ensure database is running'
    });
  }
});

// ======================
// Swagger Documentation
// ======================

try {
  const swaggerDocument = YAML.load('./src/swagger/swaggerapi.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BrewHaven API Documentation'
  }));
  console.log('Swagger documentation available at /api-docs');
} catch (err) {
  console.warn('Failed to load Swagger documentation:', err.message);
}

// ======================
// Enhanced 404 Handler
// ======================

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.method} ${req.url}`);
  error.status = 404;
  error.timestamp = new Date().toISOString();
  error.path = req.url;
  error.method = req.method;
  
  console.warn(`404 Error: ${req.method} ${req.url}`);
  next(error);
});

// ======================
// Global Error Handler (Enhanced)
// ======================

app.use((err, req, res, next) => {
  // Log detailed error information
  console.error('=== ERROR DETAILS ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Method:', req.method);
  console.error('URL:', req.url);
  console.error('Headers:', req.headers);
  console.error('Body:', req.body);
  console.error('Error Status:', err.status || 500);
  console.error('Error Message:', err.message);
  console.error('Error Stack:', err.stack);
  
  // Prisma specific errors
  if (err.code) {
    console.error('Error Code:', err.code);
    
    // Handle common Prisma errors
    switch (err.code) {
      case 'P1000':
        console.error('Authentication failed against database server');
        break;
      case 'P1001':
        console.error('Database server can\'t be reached');
        break;
      case 'P1002':
        console.error('Database server timed out');
        break;
      case 'P2002':
        console.error('Unique constraint violation');
        break;
      case 'P2003':
        console.error('Foreign key constraint violation');
        break;
      case 'P2025':
        console.error('Record not found');
        break;
    }
  }
  console.error('=== END ERROR ===');
  
  // Determine status code
  const statusCode = err.status || 500;
  
  // Prepare error response based on environment
  const errorResponse = {
    error: {
      message: statusCode === 500 ? 'Internal Server Error' : err.message,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.message;
  }
  
  // Add validation error details
  if (err.name === 'ValidationError') {
    errorResponse.error.type = 'ValidationError';
    errorResponse.error.details = err.details || err.errors;
  }
  
  // Add Prisma error details
  if (err.code && err.code.startsWith('P')) {
    errorResponse.error.type = 'DatabaseError';
    errorResponse.error.code = err.code;
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.meta = err.meta;
    }
  }
  
  res.status(statusCode).json(errorResponse);
});

// ======================
// Graceful Shutdown
// ======================

const gracefulShutdown = async () => {
  console.log('\nStarting graceful shutdown...');
  
  try {
    const { default: prisma } = await import('./db.js');
    await prisma.$disconnect();
    console.log('Database disconnected');
  } catch (err) {
    console.error('Error during database disconnection:', err);
  }
  
  console.log('Shutdown complete');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  
  // Attempt graceful shutdown
  setTimeout(() => {
    process.exit(1);
  }, 1000).unref();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  
  // Attempt graceful shutdown
  setTimeout(() => {
    process.exit(1);
  }, 1000).unref();
});

// ======================
// Start Server
// ======================

const startServer = async () => {
  try {
    // Test database connection before starting server
    const { default: prisma } = await import('./db.js');
    
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Verify we have some data
    const menuCount = await prisma.menuItem.count();
    const userCount = await prisma.user.count();
    console.log(`📊 Database stats: ${menuCount} menu items, ${userCount} users`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔍 Database test: http://localhost:${PORT}/api/test-db`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('💡 Make sure:');
    console.error('   1. Your database is running');
    console.error('   2. DATABASE_URL is correct in .env file');
    console.error('   3. You have run migrations: npx prisma migrate deploy');
    console.error('   4. You have seeded the database: npx prisma db seed');
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;