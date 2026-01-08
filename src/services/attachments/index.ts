/**
 * Attachment Blob Store
 *
 * Provides separate storage for attachment blob data to keep
 * React state and database lightweight.
 */

// Types
export type { AttachmentRef, AttachmentWithData, BlobEntry } from './types';

// Store operations
export {
  saveBlob,
  loadBlob,
  deleteBlob,
  deleteBlobs,
  hasBlob,
  getAllBlobIds,
  clearAllBlobs,
} from './store';
