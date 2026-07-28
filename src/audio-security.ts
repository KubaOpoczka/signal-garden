export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

const AUDIO_MIME_TYPES = new Set([
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

const AUDIO_FILE_EXTENSION = /\.(aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/i;

type AudioFileMetadata = Pick<File, "name" | "size" | "type">;

export const audioFileValidationError = (file: AudioFileMetadata) => {
  if (file.size <= 0) return "That audio file is empty.";
  if (file.size > MAX_AUDIO_BYTES) {
    return "That track is over 50 MB. Choose a smaller audio file.";
  }

  const mime = file.type.trim().toLowerCase();
  const supported = AUDIO_MIME_TYPES.has(mime) || (mime === "" && AUDIO_FILE_EXTENSION.test(file.name));
  return supported ? null : "That file is not a supported audio format.";
};
