const app = require('./app');
const { PORT } = require('./config/environment');
const { sequelize } = require('./models');

const startServer = async () => {
  try {
    // Authenticate and sync the database models
    await sequelize.authenticate();
    console.log('[Database] Connection has been established successfully.');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('[Database] All models synchronized.');

    app.listen(PORT, () => {
      console.log(`[Server] MediRecord Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Startup Error] Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
