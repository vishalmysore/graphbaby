// Client-side PDF text extraction via pdf.js — no backend, runs entirely in the
// browser to match GraphBaby's no-cloud design. Vite resolves the `?url` import
// to a same-origin worker asset (safe under the app's COEP: require-corp header).
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfProgress {
  page: number;
  total: number;
}

/**
 * Extract selectable text from a PDF file. Returns the concatenated page text.
 * Throws if the file cannot be parsed. Scanned/image-only PDFs yield little or
 * no text — callers should check for an empty result.
 */
export async function extractPdfText(
  file: File | ArrayBuffer,
  onProgress?: (p: PdfProgress) => void,
): Promise<string> {
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  try {
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      pages.push(line);
      page.cleanup();
      onProgress?.({ page: n, total: pdf.numPages });
    }
    return pages
      .join('\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } finally {
    await pdf.destroy();
  }
}
