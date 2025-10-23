import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // S3 Configuration
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'videomaker',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin'
  },
  
  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  // FFmpeg Configuration
  ffmpeg: {
    draftMode: process.env.DRAFT_MODE === '1',
    useNvenc: process.env.USE_NVENC === '1',
    bgmVolume: parseFloat(process.env.BGM_VOL || '0.25')
  },
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

export default config;

