import express from 'express';
import { getDashboardOverview } from './admin.controller';

const router = express.Router();

router.get('/dashboard-overview', getDashboardOverview);

export const adminRoutes = router;
