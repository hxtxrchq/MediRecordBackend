const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/user.routes');
const documentRoutes = require('./routes/document.routes');
const permissionRoutes = require('./routes/permission.routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://medirecord.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Register api route handlers
app.use('/api/v1/auth', userRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/permissions', permissionRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
