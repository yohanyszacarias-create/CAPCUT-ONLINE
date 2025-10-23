import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';
import S3Service from '../services/s3Service.js';
import RedisService from '../services/redisService.js';
import FFmpegUtils from '../utils/ffmpegUtils.js';

export class VideoProcessor {
  static async processJob(jobId) {
    const workDir = path.join(config.worker.workDir, jobId);
    const inputDir = path.join(workDir, 'input');
    const outputDir = path.join(workDir, 'output');

    try {
      // Crear directorios de trabajo
      await fs.mkdir(inputDir, { recursive: true });
      await fs.mkdir(outputDir, { recursive: true });

      // Obtener información del job
      const job = await RedisService.getJob(jobId);
      if (!job) {
        throw new Error('Job no encontrado');
      }

      // Actualizar estado a procesando
      await RedisService.updateJobStatus(jobId, 'processing', 5, 'Descargando archivos...');

      // Descargar archivos de S3
      const files = await this.downloadJobFiles(jobId, inputDir);
      console.log('Downloaded files:', files);

      // Obtener duración del audio principal
      const audioDuration = await FFmpegUtils.getAudioDuration(files.audio);
      console.log(`Audio duration: ${audioDuration}s`);

      // FASE 1: Generar segmentos con Ken Burns
      await RedisService.updateJobStatus(jobId, 'processing', 15, 'Fase 1: Generando segmentos...');
      const segmentPaths = await this.phase1KenBurns(
        files.images,
        outputDir,
        audioDuration,
        job,
        jobId
      );

      // FASE 2: Crear transiciones
      await RedisService.updateJobStatus(jobId, 'processing', 45, 'Fase 2: Aplicando transiciones...');
      const slidesPath = await this.phase2Transitions(
        segmentPaths,
        outputDir,
        job,
        jobId
      );

      // FASE 3: Mezcla final
      await RedisService.updateJobStatus(jobId, 'processing', 70, 'Fase 3: Mezclando audio y video...');
      const finalPath = await this.phase3FinalMix(
        slidesPath,
        files,
        outputDir,
        audioDuration,
        job,
        jobId
      );

      // Subir video final a S3
      await RedisService.updateJobStatus(jobId, 'processing', 85, 'Subiendo video final...');
      await S3Service.uploadFile(finalPath, jobId, 'output', 'final.mp4');

      // Limpiar archivos temporales
      await this.cleanup(workDir);

      // Marcar como completado
      await RedisService.updateJobStatus(jobId, 'done', 100, 'Video completado exitosamente');
      console.log(`Job ${jobId} completed successfully`);

    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      await RedisService.updateJobStatus(jobId, 'error', 0, error.message);
      
      // Subir log de error
      try {
        await S3Service.uploadLog(jobId, 'error', error.stack || error.message);
      } catch (logError) {
        console.error('Error uploading error log:', logError);
      }
    }
  }

  static async downloadJobFiles(jobId, inputDir) {
    const files = {
      images: [],
      audio: null,
      bgm: null,
      intro: null
    };

    const s3Files = await S3Service.listInputFiles(jobId);

    for (const file of s3Files) {
      const key = file.Key;
      const fileName = path.basename(key);

      if (key.includes('/audio/')) {
        files.audio = await S3Service.downloadFile(jobId, 'audio', fileName, path.join(inputDir, 'audio.m4a'));
      } else if (key.includes('/image/')) {
        const imagePath = path.join(inputDir, `image_${files.images.length}.jpg`);
        await S3Service.downloadFile(jobId, 'image', fileName, imagePath);
        files.images.push(imagePath);
      } else if (key.includes('/bgm/')) {
        files.bgm = await S3Service.downloadFile(jobId, 'bgm', fileName, path.join(inputDir, 'bgm.m4a'));
      } else if (key.includes('/intro/')) {
        files.intro = await S3Service.downloadFile(jobId, 'intro', fileName, path.join(inputDir, 'intro.mp4'));
      }
    }

    if (!files.audio || files.images.length === 0) {
      throw new Error('Audio o imágenes no encontrados');
    }

    // Ordenar imágenes
    files.images.sort();

    return files;
  }

  static async phase1KenBurns(imagePaths, outputDir, duration, job, jobId) {
    const segmentPaths = [];
    const segmentDuration = duration / imagePaths.length;

    const width = job.resolution === '1080p' ? 1920 : 1280;
    const height = job.resolution === '1080p' ? 1080 : 720;
    const preset = config.ffmpeg.draftMode ? 'ultrafast' : 'veryfast';
    const crf = config.ffmpeg.draftMode ? 28 : 24;

    for (let i = 0; i < imagePaths.length; i++) {
      const segmentPath = path.join(outputDir, `segment_${String(i).padStart(3, '0')}.mp4`);
      
      await FFmpegUtils.generateKenBurnsSegment(
        imagePaths[i],
        segmentPath,
        segmentDuration,
        width,
        height,
        job.fps,
        job.zoomMax,
        preset,
        crf
      );

      segmentPaths.push(segmentPath);
      
      // Actualizar progreso
      const progress = 15 + Math.floor((i / imagePaths.length) * 30);
      await RedisService.updateJobStatus(jobId, 'processing', progress, `Segmento ${i + 1}/${imagePaths.length}`);
    }

    return segmentPaths;
  }

  static async phase2Transitions(segmentPaths, outputDir, job, jobId) {
    const slidesPath = path.join(outputDir, 'slides.mp4');
    const preset = config.ffmpeg.draftMode ? 'ultrafast' : 'veryfast';
    const crf = config.ffmpeg.draftMode ? 28 : 24;

    await FFmpegUtils.createTransitionedVideo(
      segmentPaths,
      slidesPath,
      job.fps,
      job.fadeTime
    );

    await RedisService.updateJobStatus(jobId, 'processing', 50, 'Transiciones aplicadas');
    return slidesPath;
  }

  static async phase3FinalMix(slidesPath, files, outputDir, duration, job, jobId) {
    const finalPath = path.join(outputDir, 'final.mp4');
    const preset = config.ffmpeg.draftMode ? 'ultrafast' : 'veryfast';
    const crf = config.ffmpeg.draftMode ? 28 : 24;

    let bgmPath = null;
    if (files.bgm) {
      bgmPath = path.join(outputDir, 'bgm_ready.m4a');
      await FFmpegUtils.prepareBGM(files.bgm, bgmPath, duration, config.ffmpeg.bgmVolume);
      await RedisService.updateJobStatus(jobId, 'processing', 60, 'BGM preparada');
    }

    // Mezclar audio
    const videoWithAudioPath = path.join(outputDir, 'with_audio.mp4');
    await FFmpegUtils.mixAudio(
      slidesPath,
      files.audio,
      bgmPath,
      videoWithAudioPath,
      duration,
      preset,
      crf
    );

    await RedisService.updateJobStatus(jobId, 'processing', 75, 'Audio mezclado');

    // Si hay intro, concatenar
    if (files.intro) {
      // Implementar concatenación con intro
      // Por ahora, simplemente usar el video con audio
      await fs.copyFile(videoWithAudioPath, finalPath);
    } else {
      await fs.copyFile(videoWithAudioPath, finalPath);
    }

    return finalPath;
  }

  static async cleanup(workDir) {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
      console.log(`Cleaned up work directory: ${workDir}`);
    } catch (error) {
      console.error(`Error cleaning up ${workDir}:`, error);
    }
  }
}

export default VideoProcessor;

