import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createDatabase } from './models/database';
import { initializeWorkspaceData } from './services/autoImport';
import slackRoutes from './routes/slack';
import apiRoutes from './routes/api';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/slack', slackRoutes);
app.use('/api', apiRoutes);

async function startServer() {
  try {
    await createDatabase();
    console.log('Database initialized');
    
    // Initialize pre-configured workspace
    await initializeWorkspaceData();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();