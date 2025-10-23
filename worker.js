import { config } from './config.js';
import RedisService from './services/redisService.js';
import VideoProcessor from './processors/videoProcessor.js';

class VideoWorker {
  constructor() {
    this.isRunning = false;
    this.activeJobs = new Map();
  }

  async start() {
    console.log('VideoMaker Worker starting...');
    console.log(`Configuration:`, {
      s3Endpoint: config.s3.endpoint,
      redisUrl: config.redis.url,
      workDir: config.worker.workDir,
      maxConcurrent: config.worker.maxConcurrent,
      draftMode: config.ffmpeg.draftMode,
      useNvenc: config.ffmpeg.useNvenc
    });

    this.isRunning = true;

    // Iniciar loop de procesamiento
    this.processLoop();
  }

  async processLoop() {
    while (this.isRunning) {
      try {
        // Verificar si hay capacidad para procesar más jobs
        if (this.activeJobs.size < config.worker.maxConcurrent) {
          const jobId = await RedisService.dequeueJob();

          if (jobId) {
            console.log(`Processing job: ${jobId}`);
            this.activeJobs.set(jobId, true);

            // Procesar job en background
            VideoProcessor.processJob(jobId)
              .then(() => {
                console.log(`Job ${jobId} completed`);
                this.activeJobs.delete(jobId);
              })
              .catch((error) => {
                console.error(`Job ${jobId} failed:`, error);
                this.activeJobs.delete(jobId);
              });
          } else {
            // No hay jobs en cola, esperar un poco
            await this.sleep(config.worker.pollInterval);
          }
        } else {
          // Esperar a que se libere capacidad
          await this.sleep(config.worker.pollInterval);
        }
      } catch (error) {
        console.error('Error in process loop:', error);
        await this.sleep(config.worker.pollInterval);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    console.log('Stopping VideoMaker Worker...');
    this.isRunning = false;
  }
}

// Crear e iniciar worker
const worker = new VideoWorker();

// Manejo de señales
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  worker.stop();
  setTimeout(() => process.exit(0), 30000); // Esperar 30s antes de forzar
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  worker.stop();
  setTimeout(() => process.exit(0), 30000);
});

// Iniciar worker
worker.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export default worker;

