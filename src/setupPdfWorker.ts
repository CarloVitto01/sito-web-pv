// src/setupPdfWorker.ts
import { pdfjs } from 'react-pdf';

// Usa il worker ESM incluso in pdfjs-dist v4 (niente CDN → niente CORS)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
