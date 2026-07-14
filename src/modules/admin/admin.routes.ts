import express from 'express';
import { getDashboardOverview, getAllUsers, deleteUser } from './admin.controller';

const router = express.Router();

router.get('/dashboard-overview', getDashboardOverview);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

export const adminRoutes = router;
