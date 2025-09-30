import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import env from '@/config/env';
import { logger } from '@/config/logger';

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.access(env.UPLOAD_DIR);
  } catch {
    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
    logger.info(`Upload directory created: ${env.UPLOAD_DIR}`);
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = env.ALLOWED_FILE_TYPES.split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 5, // Maximum 5 files
  },
});

// Error handler for multer
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size: ${env.MAX_FILE_SIZE / 1024 / 1024}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum: 5 files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name';
        break;
      default:
        message = error.message;
    }
    
    return res.status(400).json({
      success: false,
      message,
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  
  next(error);
};
