const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
// 1. Import ALL routes at the top
const authRoutes = require('./src/routes/auth.routes');
const academicRoutes = require('./src/routes/academic.routes');
const registrarRoutes = require('./src/routes/registrar.routes');
const gradeRoutes = require('./src/routes/grade.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const studentRoutes = require('./src/routes/student.routes');
const announcementRoutes = require('./src/routes/announcement.routes');
const courseRoutes = require('./src/routes/course.routes');
const assignmentRoutes = require('./src/routes/assignment.routes');
const departmentHeadRoutes = require('./src/routes/departmentHead.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const userRoutes = require('./src/routes/user.routes');
const registrationRoutes = require('./src/routes/registration.routes');
const adminRoutes = require('./src/routes/admin.routes');
const sectionRoutes = require('./src/routes/section.routes');
const { getPrograms } = require('./src/controllers/academic.controller');


// 2. Middleware
const configuredOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = new Set([
  configuredOrigin,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
]);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // Recommended for Auth/JWT cookies
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    console.log(`⬅️ ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// 3. Consolidated API Routes
app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/registrar', registrarRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/department-head', departmentHeadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/pay', paymentRoutes);
app.use('/api/webhooks', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sections', sectionRoutes);
// Alias endpoint for clients expecting /api/programs
app.get('/api/programs', getPrograms);
// 4. Utility Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Atlas Portal API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Atlas Health College Portal API' });
});

// 5. 404 handler (Must be AFTER routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// 6. Global error handler (Must be the LAST middleware)
app.use((err, req, res, next) => {
  console.error('Global error stack:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server',
    // Only show error details in development mode
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
});

// Handle server startup errors (like EADDRINUSE)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please kill the process or use a different port.`);
  } else {
    console.error('❌ SERVER ERROR:', err);
  }
  process.exit(1);
});
