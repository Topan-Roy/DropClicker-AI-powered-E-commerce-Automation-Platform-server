import { Request, Response } from 'express';

const DEMO_PRODUCTS = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  image: "/landingpagecard.png",
  category: "Furniture",
  rating: 4.4,
  reviews: "22k",
  name: "2 Seater Sofa with USB Ports & Cup Holders",
  price: 99.00,
  profitPerUnit: 19.00,
}));

const DEMO_CATEGORIES = [
  {
    title: "Furniture",
    desc: "Home Nursing services provide various medical help and support",
    image: "/image/35348757cae46117920ebf568d94426ad6e70148.png",
  },
  {
    title: "Outdoor & Garden",
    desc: "Physical therapy sessions at home for rehabilitation.",
    image: "/image/b6fbbebf47948751d56da3bf87674f505e5eccd5.jpg",
  },
  {
    title: "Sports & Fitness",
    desc: "Physical therapy sessions at home for rehabilitation.",
    image: "/image/b6fbbebf47948751d56da3bf87674f505e5eccd5 (1).jpg",
  },
  {
    title: "Home & Kitchen",
    desc: "Physical therapy sessions at home for rehabilitation.",
    image: "/image/b6fbbebf47948751d56da3bf87674f505e5eccd5 (2).jpg",
  },
  {
    title: "Electronics",
    desc: "Physical therapy sessions at home for rehabilitation.",
    image: "/image/b6fbbebf47948751d56da3bf87674f505e5eccd5 (1).jpg",
  },
  {
    title: "Beauty & Health",
    desc: "Physical therapy sessions at home for rehabilitation.",
    image: "/image/35348757cae46117920ebf568d94426ad6e70148.png",
  },
];

export const getTrendingProducts = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: DEMO_PRODUCTS
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getExploreCategories = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: DEMO_CATEGORIES
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
