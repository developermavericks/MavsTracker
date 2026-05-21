// Production Deploy Trigger - e7f6b48
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import allocationRoutes from './routes/allocationRoutes';
import calendarRoutes from './routes/calendarRoutes';
import reportRoutes from './routes/reportRoutes';
import importRoutes from './routes/importRoutes';
import clientRoutes from './routes/clientRoutes';
import teamRoutes from './routes/teamRoutes';
import financeRoutes from './routes/financeRoutes';
import notificationRoutes from './routes/notificationRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/api/allocations', allocationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('MavsTracker API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
