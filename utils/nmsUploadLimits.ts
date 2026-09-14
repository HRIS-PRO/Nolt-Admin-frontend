/** NMS admin document upload limit (must match backend /api/upload). */
export const NMS_MAX_UPLOAD_BYTES = 1024 * 1024;

export const NMS_MAX_UPLOAD_LABEL = '1 MB';

export function isWithinNmsUploadLimit(file: File): boolean {
    return file.size <= NMS_MAX_UPLOAD_BYTES;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
