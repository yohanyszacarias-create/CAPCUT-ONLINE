import AWS from 'aws-sdk';
import { config } from '../config.js';

const s3Client = new AWS.S3({
  endpoint: config.s3.endpoint,
  accessKeyId: config.s3.accessKeyId,
  secretAccessKey: config.s3.secretAccessKey,
  region: config.s3.region,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

export class S3Service {
  static async getSignedUploadUrl(jobId, fileType, fileName) {
    const key = `jobs/${jobId}/input/${fileType}/${fileName}`;
    
    const params = {
      Bucket: config.s3.bucket,
      Key: key,
      Expires: 3600, // 1 hora
      ContentType: 'application/octet-stream'
    };

    try {
      const signedUrl = s3Client.getSignedUrl('putObject', params);
      return { signedUrl, key };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  static async getSignedDownloadUrl(jobId) {
    const key = `jobs/${jobId}/output/final.mp4`;
    
    const params = {
      Bucket: config.s3.bucket,
      Key: key,
      Expires: 3600 // 1 hora
    };

    try {
      const signedUrl = s3Client.getSignedUrl('getObject', params);
      return signedUrl;
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw error;
    }
  }

  static async uploadLog(jobId, phase, logContent) {
    const key = `jobs/${jobId}/work/${phase}.log`;
    
    const params = {
      Bucket: config.s3.bucket,
      Key: key,
      Body: logContent,
      ContentType: 'text/plain'
    };

    try {
      await s3Client.putObject(params).promise();
      return key;
    } catch (error) {
      console.error('Error uploading log:', error);
      throw error;
    }
  }

  static async listJobFiles(jobId, prefix) {
    const params = {
      Bucket: config.s3.bucket,
      Prefix: `jobs/${jobId}/${prefix}`
    };

    try {
      const result = await s3Client.listObjects(params).promise();
      return result.Contents || [];
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  static async deleteJobFiles(jobId) {
    const params = {
      Bucket: config.s3.bucket,
      Prefix: `jobs/${jobId}/`
    };

    try {
      const result = await s3Client.listObjects(params).promise();
      if (result.Contents && result.Contents.length > 0) {
        const deleteParams = {
          Bucket: config.s3.bucket,
          Delete: {
            Objects: result.Contents.map(obj => ({ Key: obj.Key }))
          }
        };
        await s3Client.deleteObjects(deleteParams).promise();
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      throw error;
    }
  }
}

export default S3Service;

