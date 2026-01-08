/**
 * Attachment types for blob storage separation.
 *
 * AttachmentRef: Lightweight reference stored in React state and database
 * AttachmentWithData: Full attachment with blob data for API calls
 */

/**
 * Lightweight attachment reference (no blob data).
 * This is what gets stored in React state and the database.
 */
export interface AttachmentRef {
  id: string;
  name: string;
  type: 'image' | 'document';
  mimeType: string;
  size: number;
  // Note: no `data` field - blob is stored separately
}

/**
 * Full attachment with blob data.
 * Used when sending to LLM providers.
 */
export interface AttachmentWithData extends AttachmentRef {
  data: string; // base64 encoded blob data
}

/**
 * Blob storage entry as stored in IndexedDB/filesystem.
 */
export interface BlobEntry {
  id: string;
  data: string; // base64 encoded
  createdAt: number; // timestamp
}
