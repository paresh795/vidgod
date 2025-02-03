/**
 * Calculates audio duration based on buffer size and bitrate
 * Using a constant bitrate of 128kbps for MP3 files from ElevenLabs
 * @param audioBuffer The raw audio data from ElevenLabs API
 * @returns Duration in seconds
 */
export function calculateAudioDuration(audioBuffer: Buffer | ArrayBuffer): number {
  // ElevenLabs uses 128kbps MP3 format
  const BITRATE = 128 * 1024; // 128kbps in bits per second
  
  // Get buffer length, handling both Buffer and ArrayBuffer
  const bufferLength = audioBuffer instanceof Buffer 
    ? audioBuffer.length 
    : audioBuffer.byteLength;
  
  // Calculate duration: (buffer size in bits) / (bits per second)
  const durationInSeconds = (bufferLength * 8) / BITRATE;
  
  // Round to 2 decimal places for precision
  return Math.round(durationInSeconds * 100) / 100;
} 