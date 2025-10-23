import { v4 as uuidv4 } from 'uuid';
import S3Service from '../services/s3Service.js';
import RedisService from '../services/redisService.js';

export class JobController {
  static async createJob(req, res) {
    try {
      const { resolution, fps, zoomMax, fadeTime } = req.body;
      const jobId = uuidv4();

      const jobData = {
        id: jobId,
        resolution: resolution || '1080p',
        fps: fps || 30,
        zoomMax: zoomMax || 1.08,
        fadeTime: fadeTime || 0.6,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await RedisService.enqueueJob(jobId, jobData);

      res.status(201).json({
        id: jobId,
        status: 'queued',
        message: 'Job creado exitosamente'
      });
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({ error: 'Error al crear el job' });
    }
  }

  static async getJob(req, res) {
    try {
      const { jobId } = req.params;
      const job = await RedisService.getJob(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job no encontrado' });
      }

      // Obtener URL de descarga si está completado
      let downloadUrl = null;
      if (job.status === 'done') {
        downloadUrl = await S3Service.getSignedDownloadUrl(jobId);
      }

      res.json({
        ...job,
        downloadUrl
      });
    } catch (error) {
      console.error('Error getting job:', error);
      res.status(500).json({ error: 'Error al obtener el job' });
    }
  }

  static async getSignedUploadUrl(req, res) {
    try {
      const { jobId } = req.params;
      const { fileType, fileName } = req.body;

      if (!fileType || !fileName) {
        return res.status(400).json({ error: 'fileType y fileName son requeridos' });
      }

      const { signedUrl, key } = await S3Service.getSignedUploadUrl(jobId, fileType, fileName);

      res.json({
        signedUrl,
        key,
        jobId
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      res.status(500).json({ error: 'Error al generar URL firmada' });
    }
  }

  static async streamJobProgress(req, res) {
    try {
      const { jobId } = req.params;

      // Configurar SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Enviar progreso inicial
      const initialJob = await RedisService.getJob(jobId);
      if (initialJob) {
        res.write(`data: ${JSON.stringify({
          status: initialJob.status,
          progress: initialJob.progress,
          message: initialJob.message
        })}\n\n`);
      }

      // Enviar actualizaciones cada segundo
      const interval = setInterval(async () => {
        const job = await RedisService.getJob(jobId);
        if (job) {
          res.write(`data: ${JSON.stringify({
            status: job.status,
            progress: job.progress,
            message: job.message
          })}\n\n`);

          // Cerrar conexión si está completado o en error
          if (job.status === 'done' || job.status === 'error') {
            clearInterval(interval);
            res.end();
          }
        }
      }, 1000);

      // Limpiar si el cliente se desconecta
      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
    } catch (error) {
      console.error('Error streaming progress:', error);
      res.status(500).json({ error: 'Error al transmitir progreso' });
    }
  }

  static async downloadVideo(req, res) {
    try {
      const { jobId } = req.params;
      const job = await RedisService.getJob(jobId);

      if (!job || job.status !== 'done') {
        return res.status(404).json({ error: 'Video no disponible' });
      }

      const downloadUrl = await S3Service.getSignedDownloadUrl(jobId);
      res.redirect(downloadUrl);
    } catch (error) {
      console.error('Error downloading video:', error);
      res.status(500).json({ error: 'Error al descargar el video' });
    }
  }

  static async getRecentJobs(req, res) {
    try {
      const jobs = await RedisService.getAllJobs();
      const recentJobs = jobs
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);

      res.json(recentJobs);
    } catch (error) {
      console.error('Error getting recent jobs:', error);
      res.status(500).json({ error: 'Error al obtener jobs recientes' });
    }
  }
}

export default JobController;

