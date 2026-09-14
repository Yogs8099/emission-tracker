import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database';
import emissionRoutes from './routes/emission.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/emissions', emissionRoutes);

const PORT = process.env.PORT || 3000;

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      success: true,
      message: 'Server and database are connected',
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error('Database connection error:', error);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});