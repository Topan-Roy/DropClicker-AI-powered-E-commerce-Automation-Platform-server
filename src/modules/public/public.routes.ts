import express from 'express';
import { getTrendingProducts, getExploreCategories } from './public.controller';

const router = express.Router();

router.get('/trending-products', getTrendingProducts);
router.get('/explore-categories', getExploreCategories);

export const publicRoutes = router;
