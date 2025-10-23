import { createClient } from 'redis';
import { config } from '../config.js';

const redisClient = createClient({
  url: config.redis.url
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

await redisClient.connect();

export class RedisService {
  static async setJob(jobId, jobData) {
    const key = `job:${jobId}`;
    await redisClient.setEx(
      key,
      86400, // 24 horas
      JSON.stringify(jobData)
    );
  }

  static async getJob(jobId) {
    const key = `job:${jobId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  static async updateJobStatus(jobId, status, progress = 0, message = '') {
    const job = await this.getJob(jobId) || { id: jobId };
    job.status = status;
    job.progress = progress;
    job.message = message;
    job.updatedAt = new Date().toISOString();
    await this.setJob(jobId, job);
    return job;
  }

  static async getJobProgress(jobId) {
    const job = await this.getJob(jobId);
    return job ? { status: job.status, progress: job.progress, message: job.message } : null;
  }

  static async deleteJob(jobId) {
    const key = `job:${jobId}`;
    await redisClient.del(key);
  }

  static async getAllJobs() {
    const keys = await redisClient.keys('job:*');
    const jobs = [];
    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        jobs.push(JSON.parse(data));
      }
    }
    return jobs;
  }

  static async enqueueJob(jobId, jobData) {
    await redisClient.lPush('jobs:queue', jobId);
    await this.setJob(jobId, { ...jobData, status: 'queued', progress: 0 });
  }

  static async dequeueJob() {
    const jobId = await redisClient.rPop('jobs:queue');
    return jobId;
  }

  static async getQueueLength() {
    return await redisClient.lLen('jobs:queue');
  }
}

export default RedisService;

