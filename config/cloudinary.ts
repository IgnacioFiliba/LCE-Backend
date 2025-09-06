import { v2 as cloudinary } from 'cloudinary';
import { config as dotenvconfig } from 'dotenv';
dotenvconfig();

export const cloudinaryConfig = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.API_KEY,
      api_secret: process.env.API_SECRET,
    });
    return cloudinary;
  },
};
