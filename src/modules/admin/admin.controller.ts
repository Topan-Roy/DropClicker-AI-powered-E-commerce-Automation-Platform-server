import { Request, Response } from 'express';

const statsData = [
  { id: 1, label: 'Total Users', value: '85,420', icon: 'Users', color: 'blue' },
  { id: 2, label: 'Total Orders', value: '5,420', icon: 'ShoppingCart', color: 'blue' },
  { id: 3, label: 'Total Revenue', value: '5,420', icon: 'DollarSign', color: 'green' },
  { id: 4, label: 'Stores Generated', value: '5,420', icon: 'Store', color: 'green' },
  { id: 5, label: 'Products', value: '85,420', icon: 'Package', color: 'orange' },
  { id: 6, label: 'Active Suppliers', value: '85,420', icon: 'BarChart2', color: 'orange' },
];

const ordersRevenueData = [
  { month: 'Jan', value: 12000 },
  { month: 'Feb', value: 10000 },
  { month: 'Mar', value: 13000 },
  { month: 'Apr', value: 11000 },
  { month: 'May', value: 17000 },
  { month: 'Jun', value: 19000 },
  { month: 'Jul', value: 22000 },
];

const storeProjectsData = [
  { name: 'Completed', value: 21, color: '#8b8cf8' },
  { name: 'Draft', value: 10, color: '#f4a7a3' },
];

const recentUsersData = [
  { id: 1, name: 'Wade Warren', email: 'sara.cruz@example.com', role: 'User', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wade1' },
  { id: 2, name: 'Wade Warren', email: 'georgia.young@example.com', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wade2' },
  { id: 3, name: 'Wade Warren', email: 'kenzi.lawson@example.com', role: 'User', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wade3' },
  { id: 4, name: 'Wade Warren', email: 'jessica.hanson@example.com', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wade4' },
];

const recentSyncData = [
  { id: 1, time: 'Jan 9, 4:40 PM', status: 'success' },
  { id: 2, time: 'Jan 9, 4:39 PM', status: 'success' },
  { id: 3, time: 'Jan 9, 4:37 PM', status: 'success' },
  { id: 4, time: 'Jan 9, 4:34 PM', status: 'success' },
  { id: 5, time: 'Jan 9, 4:34 PM', status: 'success' },
];

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        statsData,
        ordersRevenueData,
        storeProjectsData,
        recentUsersData,
        recentSyncData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
