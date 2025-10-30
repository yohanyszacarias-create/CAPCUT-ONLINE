import axios from 'axios';


const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const createJob = async (jobData) => {
  const response = await apiClient.post('/jobs', jobData);
  return response.data;
};

export const getJob = async (jobId) => {
  const response = await apiClient.get(`/jobs/${jobId}`);
  return response.data;
};

export const getJobStream = (jobId, onProgress) => {
  const eventSource = new EventSource(`${API_BASE_URL}/jobs/${jobId}/stream`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onProgress(data);
  };
  
  eventSource.onerror = () => {
    eventSource.close();
  };
  
  return eventSource;
};

export const getSignedUploadUrl = async (jobId, fileType, fileName) => {
  const response = await apiClient.post(`/jobs/${jobId}/signed-url`, {
    fileType,
    fileName
  });
  return response.data;
};

export default apiClient;

