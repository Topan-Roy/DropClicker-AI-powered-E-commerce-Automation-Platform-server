import express from 'express';
import { getDashboardOverview, getAllUsers, deleteUser, updateUserRole } from './admin.controller';

const router = express.Router();

router.get('/dashboard-overview', getDashboardOverview);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);

export const adminRoutes = router;
