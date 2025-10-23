import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import ProgressBar from '../components/ProgressBar';
import { createJob, getSignedUploadUrl, getJobStream, getJob } from '../services/api';

export const UploadJob = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [bgmFile, setBgmFile] = useState(null);
  const [introFile, setIntroFile] = useState(null);
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [zoomMax, setZoomMax] = useState(1.08);
  const [fadeTime, setFadeTime] = useState(0.6);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [recentJobs, setRecentJobs] = useState([]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    
    if (!audioFile || imageFiles.length === 0) {
      alert('Por favor, selecciona audio e imágenes');
      return;
    }

    setLoading(true);
    try {
      // Crear job
      const job = await createJob({
        resolution,
        fps,
        zoomMax,
        fadeTime
      });

      setJobId(job.id);
      setJobStatus('queued');
      setProgress(0);

      // Subir archivos
      await uploadFiles(job.id);

      // Escuchar progreso
      const eventSource = getJobStream(job.id, (data) => {
        setProgress(data.progress || 0);
        setJobStatus(data.status || 'processing');
      });

      // Guardar job en lista reciente
      setRecentJobs([job, ...recentJobs.slice(0, 4)]);
    } catch (error) {
      console.error('Error al crear job:', error);
      alert('Error al crear el video');
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (jobId) => {
    const files = [
      { file: audioFile, type: 'audio' },
      ...imageFiles.map(f => ({ file: f, type: 'image' })),
      bgmFile && { file: bgmFile, type: 'bgm' },
      introFile && { file: introFile, type: 'intro' }
    ].filter(Boolean);

    for (const { file, type } of files) {
      try {
        const { signedUrl } = await getSignedUploadUrl(jobId, type, file.name);
        
        // Subir a S3
        await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });
      } catch (error) {
        console.error(`Error al subir ${type}:`, error);
      }
    }
  };

  const downloadVideo = () => {
    if (jobId) {
      window.open(`/api/jobs/${jobId}/download`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">VideoMakerOnline</h1>
          <p className="text-gray-600">Crea videos profesionales a partir de audio, imágenes y música</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <form onSubmit={handleCreateJob} className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Crear Nuevo Video</h2>

              {/* Archivos requeridos */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Archivos Requeridos</h3>
                <FileUpload
                  label="Audio Principal (MP3, WAV, M4A)"
                  accept="audio/*"
                  onChange={(files) => setAudioFile(files[0])}
                  disabled={loading}
                />
                <FileUpload
                  label="Imágenes (JPG, PNG)"
                  accept="image/*"
                  multiple
                  onChange={setImageFiles}
                  disabled={loading}
                />
              </div>

              {/* Archivos opcionales */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Archivos Opcionales</h3>
                <FileUpload
                  label="Música de Fondo (MP3, M4A)"
                  accept="audio/*"
                  onChange={(files) => setBgmFile(files[0])}
                  disabled={loading}
                />
                <FileUpload
                  label="Intro (MP4, WebM)"
                  accept="video/*"
                  onChange={(files) => setIntroFile(files[0])}
                  disabled={loading}
                />
              </div>

              {/* Configuración */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuración</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolución
                    </label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="1080p">1080p (Full HD)</option>
                      <option value="720p">720p (HD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FPS
                    </label>
                    <select
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value={25}>25 FPS</option>
                      <option value={30}>30 FPS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zoom Máximo: {zoomMax.toFixed(2)}x
                    </label>
                    <input
                      type="range"
                      min="1.06"
                      max="1.12"
                      step="0.01"
                      value={zoomMax}
                      onChange={(e) => setZoomMax(Number(e.target.value))}
                      className="w-full"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duración Transición: {fadeTime.toFixed(1)}s
                    </label>
                    <input
                      type="range"
                      min="0.4"
                      max="0.8"
                      step="0.1"
                      value={fadeTime}
                      onChange={(e) => setFadeTime(Number(e.target.value))}
                      className="w-full"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !audioFile || imageFiles.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
              >
                {loading ? 'Creando video...' : 'Crear Video'}
              </button>
            </form>
          </div>

          {/* Panel de estado */}
          <div className="lg:col-span-1">
            {jobId ? (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Estado del Video</h3>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">ID del Job:</p>
                  <p className="text-xs font-mono text-gray-500 break-all">{jobId}</p>
                </div>

                <ProgressBar
                  progress={progress}
                  status={jobStatus}
                  message={`${progress}% completado`}
                />

                {jobStatus === 'done' && (
                  <button
                    onClick={downloadVideo}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition"
                  >
                    Descargar Video
                  </button>
                )}

                {jobStatus === 'error' && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    Error al procesar el video
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Videos Recientes</h3>
                {recentJobs.length === 0 ? (
                  <p className="text-gray-600">No hay videos recientes</p>
                ) : (
                  <div className="space-y-3">
                    {recentJobs.map((job) => (
                      <div key={job.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-500 truncate">{job.id}</p>
                        <p className="text-sm text-gray-700 mt-1">{job.status}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadJob;

