import { api, ApiError } from "../backend/apiClient";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB: un chunk che fallisce si ripete da solo, non l'intero file
const MAX_RETRIES_PER_CHUNK = 3;

/**
 * Carica un file (tipicamente un PDF di grosse dimensioni) a blocchi verso il backend, cosi' un errore
 * di rete a meta' upload richiede di ripetere solo l'ultimo blocco invece dell'intero file.
 * Ritorna il path di storage assegnato dal server, da usare nella creazione dell'ordine.
 */
export async function uploadFileInChunks(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const { sessionId, totalChunks } = await api.post<{ sessionId: string; totalChunks: number }>(
    "/api/files/upload/init",
    { originalFileName: file.name, totalSize: file.size, chunkSize: CHUNK_SIZE }
  );

  for (let index = 0; index < totalChunks; index++) {
    const start = index * CHUNK_SIZE;
    const chunk = file.slice(start, start + CHUNK_SIZE);
    await uploadChunkWithRetry(sessionId, index, chunk);
    onProgress?.(Math.round(((index + 1) / totalChunks) * 100));
  }

  const { storagePath } = await api.post<{ storagePath: string }>(`/api/files/upload/${sessionId}/complete`);
  return storagePath;
}

async function uploadChunkWithRetry(sessionId: string, index: number, chunk: Blob, attempt = 0): Promise<void> {
  try {
    await api.putRaw(`/api/files/upload/${sessionId}/chunk/${index}`, chunk);
  } catch (err) {
    const transient = !(err instanceof ApiError) || err.status >= 500 || err.status === 429;
    if (transient && attempt < MAX_RETRIES_PER_CHUNK) {
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
      await uploadChunkWithRetry(sessionId, index, chunk, attempt + 1);
      return;
    }
    throw err;
  }
}
