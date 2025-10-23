import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class FFmpegUtils {
  /**
   * Genera un segmento con efecto Ken Burns (zoom)
   */
  static async generateKenBurnsSegment(
    imagePath,
    outputPath,
    duration,
    width,
    height,
    fps,
    zoomMax,
    preset = 'veryfast',
    crf = 24
  ) {
    const zoomStep = (zoomMax - 1) / (duration * fps);
    const frames = Math.ceil(duration * fps);

    const vfFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,zoompan=z='1+on*${zoomStep}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${width}x${height},fps=${fps}`;

    const cmd = `ffmpeg -y -loop 1 -t ${duration} -i "${imagePath}" -vf "${vfFilter}" -r ${fps} -c:v libx264 -preset ${preset} -crf ${crf} -pix_fmt yuv420p -movflags +faststart "${outputPath}"`;

    console.log('Executing Ken Burns command:', cmd);
    const { stdout, stderr } = await execAsync(cmd);
    console.log('Ken Burns output:', stdout);
    if (stderr) console.error('Ken Burns stderr:', stderr);

    return outputPath;
  }

  /**
   * Crea transiciones suave entre segmentos usando xfade
   */
  static async createTransitionedVideo(
    segmentPaths,
    outputPath,
    fps,
    fadeTime = 0.6
  ) {
    if (segmentPaths.length === 0) {
      throw new Error('No segments provided');
    }

    if (segmentPaths.length === 1) {
      // Si hay solo un segmento, copiar directamente
      const cmd = `ffmpeg -y -i "${segmentPaths[0]}" -c copy "${outputPath}"`;
      const { stdout, stderr } = await execAsync(cmd);
      return outputPath;
    }

    // Construir filtro xfade para múltiples segmentos
    let filterComplex = '';
    let inputStr = '';

    for (let i = 0; i < segmentPaths.length; i++) {
      inputStr += ` -i "${segmentPaths[i]}"`;
    }

    // Calcular offsets para las transiciones
    const fadeFrames = Math.ceil(fadeTime * fps);
    let filterChain = '[0]';

    for (let i = 1; i < segmentPaths.length; i++) {
      filterChain += `[${i}]xfade=transition=fade:duration=${fadeTime}:offset=${(i - 1) * (fadeTime)}[out${i}];[out${i}]`;
    }

    filterComplex = `${filterChain.slice(0, -1)}`;

    const cmd = `ffmpeg -y ${inputStr} -filter_complex "${filterComplex}" -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p -movflags +faststart "${outputPath}"`;

    console.log('Executing transition command:', cmd);
    const { stdout, stderr } = await execAsync(cmd);
    console.log('Transition output:', stdout);
    if (stderr) console.error('Transition stderr:', stderr);

    return outputPath;
  }

  /**
   * Prepara la música de fondo (BGM) con looping exacto
   */
  static async prepareBGM(
    bgmPath,
    outputPath,
    duration,
    volume = 0.25
  ) {
    // Calcular cuántas veces necesitamos hacer loop
    const cmd = `ffmpeg -y -stream_loop 10 -i "${bgmPath}" -t ${duration} -af "volume=${volume},aresample=async=1,atrim=0:${duration},asetpts=PTS-STARTPTS" -c:a aac -b:a 128k "${outputPath}"`;

    console.log('Executing BGM preparation command:', cmd);
    const { stdout, stderr } = await execAsync(cmd);
    console.log('BGM preparation output:', stdout);
    if (stderr) console.error('BGM preparation stderr:', stderr);

    return outputPath;
  }

  /**
   * Mezcla video con audio principal y BGM
   */
  static async mixAudio(
    videoPath,
    audioPath,
    bgmPath,
    outputPath,
    duration,
    preset = 'veryfast',
    crf = 24
  ) {
    let cmd;

    if (bgmPath) {
      // Mezclar audio principal + BGM
      cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -i "${bgmPath}" -filter_complex "[1][2]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]" -t ${duration} -c:v libx264 -preset ${preset} -crf ${crf} -c:a aac -b:a 192k -pix_fmt yuv420p -movflags +faststart -shortest "${outputPath}"`;
    } else {
      // Solo audio principal
      cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -t ${duration} -c:v libx264 -preset ${preset} -crf ${crf} -c:a aac -b:a 192k -pix_fmt yuv420p -movflags +faststart -shortest "${outputPath}"`;
    }

    console.log('Executing audio mix command:', cmd);
    const { stdout, stderr } = await execAsync(cmd);
    console.log('Audio mix output:', stdout);
    if (stderr) console.error('Audio mix stderr:', stderr);

    return outputPath;
  }

  /**
   * Obtiene la duración de un archivo de audio
   */
  static async getAudioDuration(audioPath) {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${audioPath}"`;
    const { stdout } = await execAsync(cmd);
    return parseFloat(stdout.trim());
  }

  /**
   * Recorta un video a una duración específica
   */
  static async trimVideo(
    inputPath,
    outputPath,
    duration,
    preset = 'veryfast',
    crf = 24
  ) {
    const cmd = `ffmpeg -y -i "${inputPath}" -t ${duration} -c:v libx264 -preset ${preset} -crf ${crf} -pix_fmt yuv420p -movflags +faststart "${outputPath}"`;

    console.log('Executing trim command:', cmd);
    const { stdout, stderr } = await execAsync(cmd);
    console.log('Trim output:', stdout);
    if (stderr) console.error('Trim stderr:', stderr);

    return outputPath;
  }
}

export default FFmpegUtils;

