import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import ApiError from "@utils/ApiError";

// ─── Allowed MIME Types ────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ─── Storage Engine ────────────────────────────────────────────────────────────
/**
 * Memory storage — files are stored in RAM as Buffer objects.
 *
 * Why not disk storage?
 *  - We upload directly to Cloudinary, so we don't need to write to disk
 *  - Disk writes require cleanup logic; memory is automatically freed
 *  - Serverless/container environments often have read-only filesystems
 *
 * Trade-off: large files will consume RAM. We mitigate this with size limits.
 */
const memoryStorage = multer.memoryStorage();

// ─── File Filter Factories ─────────────────────────────────────────────────────

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP, GIF`
      ) as unknown as null,
      false
    );
  }
};

const documentFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type. Allowed types: Images, PDF, Word documents`
      ) as unknown as null,
      false
    );
  }
};

// ─── Multer Instances ──────────────────────────────────────────────────────────

/**
 * For single avatar / profile picture uploads.
 * Max size: 5MB
 */
export const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB
    files: 1,                    // Only 1 file at a time
  },
});

/**
 * For product images (multiple allowed).
 * Max size: 5MB per file, up to 10 files.
 */
export const uploadProductImages = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
});

/**
 * For document uploads (PDF, Word, Images).
 * Max size: 10MB
 */
export const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

/**
 * Usage in routes:
 *
 * Single file:
 *   router.patch('/avatar', authenticate, uploadAvatar.single('avatar'), handler)
 *
 * Multiple files:
 *   router.post('/products', authenticate, uploadProductImages.array('images', 10), handler)
 */
