import { mkdir, open } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import multer from 'multer';

export const UPLOAD_DIRECTORY = fileURLToPath(new URL('../uploads/', import.meta.url));
export const MAX_UPLOAD_FILES = 5;

const allowedTypes: Record<string, { mimeType: string; category: 'document' | 'video' }> = {
  '.pdf': { mimeType: 'application/pdf', category: 'document' },
  '.doc': { mimeType: 'application/msword', category: 'document' },
  '.docx': { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document' },
  '.ppt': { mimeType: 'application/vnd.ms-powerpoint', category: 'document' },
  '.pptx': { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'document' },
  '.xls': { mimeType: 'application/vnd.ms-excel', category: 'document' },
  '.xlsx': { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'document' },
  '.txt': { mimeType: 'text/plain', category: 'document' },
  '.rtf': { mimeType: 'application/rtf', category: 'document' },
  '.mp4': { mimeType: 'video/mp4', category: 'video' },
  '.webm': { mimeType: 'video/webm', category: 'video' }
};

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

const avatarMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

// Profile photos are kept in the database, so keep them small and well-formed.
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!avatarMimeTypes.has(file.mimetype)) {
      callback(new UploadValidationError('Use a PNG, JPEG, WebP, or GIF image for your profile photo.'));
      return;
    }
    callback(null, true);
  }
});

export const contentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      void mkdir(UPLOAD_DIRECTORY, { recursive: true })
        .then(() => callback(null, UPLOAD_DIRECTORY))
        .catch((error: unknown) => callback(
          error instanceof Error ? error : new Error('Unable to prepare upload storage.'),
          ''
        ));
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    }
  }),
  limits: {
    files: MAX_UPLOAD_FILES,
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = allowedTypes[extension];
    if (!allowed || allowed.mimeType !== file.mimetype) {
      callback(new UploadValidationError('Unsupported file type. Use PDF, Office documents, TXT, RTF, MP4, or WebM.'));
      return;
    }
    callback(null, true);
  }
});

export function getUploadType(fileName: string): { mimeType: string; category: 'document' | 'video' } | undefined {
  return allowedTypes[path.extname(fileName).toLowerCase()];
}

export function hasValidFileSignature(fileName: string, header: Buffer): boolean {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.pdf') return header.subarray(0, 5).toString('ascii') === '%PDF-';
  if (['.doc', '.ppt', '.xls'].includes(extension)) {
    return header.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  if (['.docx', '.pptx', '.xlsx'].includes(extension)) {
    return header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
  }
  if (extension === '.rtf') return header.subarray(0, 5).toString('ascii') === '{\\rtf';
  if (extension === '.mp4') return header.subarray(4, 8).toString('ascii') === 'ftyp';
  if (extension === '.webm') return header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (extension === '.txt') {
    return !header.subarray(0, 8192).includes(0);
  }
  return false;
}

export function hasValidImageSignature(mimeType: string, header: Buffer): boolean {
  if (mimeType === 'image/png') {
    return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/jpeg') return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (mimeType === 'image/webp') {
    return header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mimeType === 'image/gif') {
    const magic = header.subarray(0, 6).toString('ascii');
    return magic === 'GIF87a' || magic === 'GIF89a';
  }
  return false;
}

export async function uploadedFileHasValidSignature(filePath: string, fileName: string): Promise<boolean> {
  const file = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(8192);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    return hasValidFileSignature(fileName, header.subarray(0, bytesRead));
  } finally {
    await file.close();
  }
}
