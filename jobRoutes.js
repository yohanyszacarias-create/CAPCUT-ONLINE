import express from 'express';
import JobController from '../controllers/jobController.js';

const router = express.Router();

// Crear un nuevo job
router.post('/', JobController.createJob);

// Obtener información de un job
router.get('/:jobId', JobController.getJob);

// Obtener URL firmada para subida
router.post('/:jobId/signed-url', JobController.getSignedUploadUrl);

// Stream de progreso en vivo (SSE)
router.get('/:jobId/stream', JobController.streamJobProgress);

// Descargar video completado
router.get('/:jobId/download', JobController.downloadVideo);

// Obtener jobs recientes
router.get('/', JobController.getRecentJobs);

export default router;

