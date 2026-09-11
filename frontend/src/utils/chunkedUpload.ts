import { api, ApiError, uploadRawWithProgress } from "../backend/apiClient";

const CHUNK_SIZE = 80 * 1024 * 1024; // 80MB: un chunk che fallisce si ripete da solo, non l'intero file
const MAX_RETRIES_PER_CHUNK = 3;

/**
 * Carica un file (tipicamente un PDF di grosse dimensioni) a blocchi verso il backend, cosi' un errore
 * di rete a meta' upload richiede di ripetere solo l'ultimo blocco invece dell'intero file.
 * Ritorna il path di storage assegnato dal server, da usare nella creazione dell'ordine.
 *
 * onProgress riceve i byte realmente trasmessi (xhr.upload.onprogress), non una stima a blocco
 * completato: cosi' chi chiama puo' mostrare MB caricati e tempo residuo reali.
 */
export async function uploadFileInChunks(
  file: File,
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<string> {
  const { sessionId, totalChunks } = await api.post<{ sessionId: string; totalChunks: number }>(
    "/api/files/upload/init",
    { originalFileName: file.name, totalSize: file.size, chunkSize: CHUNK_SIZE }
  );

  let uploadedBeforeChunk = 0;
  for (let index = 0; index < totalChunks; index++) {
    const start = index * CHUNK_SIZE;
    const chunk = file.slice(start, start + CHUNK_SIZE);
    await uploadChunkWithRetry(sessionId, index, chunk, (loadedInChunk) => {
      onProgress?.(uploadedBeforeChunk + loadedInChunk, file.size);
    });
    uploadedBeforeChunk += chunk.size;
    onProgress?.(uploadedBeforeChunk, file.size);
  }

  const { storagePath } = await api.post<{ storagePath: string }>(`/api/files/upload/${sessionId}/complete`);
  return storagePath;
}

async function uploadChunkWithRetry(
  sessionId: string,
  index: number,
  chunk: Blob,
  onChunkProgress: (loadedBytes: number) => void,
  attempt = 0
): Promise<void> {
  try {
    await uploadRawWithProgress(`/api/files/upload/${sessionId}/chunk/${index}`, chunk, onChunkProgress);
  } catch (err) {
    const transient = !(err instanceof ApiError) || err.status >= 500 || err.status === 429;
    if (transient && attempt < MAX_RETRIES_PER_CHUNK) {
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
      await uploadChunkWithRetry(sessionId, index, chunk, onChunkProgress, attempt + 1);
      return;
    }
    throw err;
  }
}
