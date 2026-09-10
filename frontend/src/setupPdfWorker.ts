// src/setupPdfWorker.ts
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;
