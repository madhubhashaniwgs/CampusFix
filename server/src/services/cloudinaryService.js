import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import { Readable } from 'node:stream';

import ApiError from '../utils/ApiError.js';

const FOLDER = 'campusfix/issues';

class CloudinaryService {
  constructor() {
    this.configured = false;
  }

  // Credentials are optional at boot so dev/test environments keep
  // working; the upload path fails safely if they are absent.
  ensureConfigured() {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new ApiError(
        503,
        'Photo storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
      );
    }

    if (!this.configured) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true,
      });
      this.configured = true;
    }
  }

  // Uploads an image buffer/stream to Cloudinary and returns the
  // secure URL plus the public ID needed for later deletion.
  async uploadImage(buffer, { folder = FOLDER } = {}) {
    this.ensureConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          // Sensible defaults: auto format/quality keeps files small.
          fetch_format: 'auto',
          quality: 'auto',
        },
        (error, result) => {
          if (error) {
            return reject(new ApiError(502, 'Failed to upload image to storage'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  // Short-lived token binding an uploaded image's public ID to the
  // uploading user. Returned by the upload endpoint and required at
  // issue creation so clients cannot attach arbitrary public IDs.
  signUploadToken(publicId, userId, url) {
    return jwt.sign({ pid: publicId, uid: userId, url }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });
  }

  verifyUploadToken(token, userId, url) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.uid !== userId || payload.url !== url || typeof payload.pid !== 'string') {
        return null;
      }
      return payload.pid;
    } catch {
      return null;
    }
  }

  async deleteImage(publicId) {
    this.ensureConfigured();

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      throw new ApiError(502, 'Failed to delete image from storage');
    }
  }
}

export default new CloudinaryService();
