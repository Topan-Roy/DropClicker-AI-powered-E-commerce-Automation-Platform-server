import { v2 as cloudinary } from "cloudinary";
import { env } from "@config/env.config";
import logger from "@config/logger.config";

/**
 * Configures the Cloudinary SDK with credentials from validated env variables.
 *
 * Usage elsewhere:
 *   import cloudinary from '@config/cloudinary.config'
 *   await cloudinary.uploader.upload(filePath, { folder: 'dropclicker/avatars' })
 *
 * The `v2` import is used because Cloudinary v2 has a cleaner promise-based API.
 */
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS URLs
});

logger.info("☁️  Cloudinary configured successfully");

export default cloudinary;
