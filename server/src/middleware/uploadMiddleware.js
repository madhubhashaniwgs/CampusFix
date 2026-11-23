import multer from 'multer';

import ApiError from '../utils/ApiError.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Magic-byte signatures verified after multer parses the file;
// the client-provided MIME type alone is never trusted.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const hasValidSignature = (buffer, mimetype) => {
  if (mimetype === 'image/jpeg') {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimetype === 'image/png') {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
  }

  if (mimetype === 'image/webp') {
    return (
      buffer.length > 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  return false;
};

// Memory storage only — uploaded buffers live for the duration of
// the request and are never written to disk.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG or WebP images are allowed'));
    }
    cb(null, true);
  },
});

// Single-file upload middleware for the 'photo' field. Converts
// multer errors into consistent ApiError responses.
export const uploadPhoto = (req, res, next) => {
  imageUpload.single('photo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(413, 'Image exceeds the 5MB limit'));
        }
        return next(new ApiError(400, 'File upload failed'));
      }
      return next(err);
    }

    const file = req.file;

    if (!file) {
      return next(new ApiError(400, 'No image file provided'));
    }

    if (!hasValidSignature(file.buffer, file.mimetype)) {
      return next(new ApiError(400, 'File content is not a valid image'));
    }

    next();
  });
};
