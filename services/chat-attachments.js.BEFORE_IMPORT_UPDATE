/**
 * Chat Attachments Service
 * Handles file uploads for chat messages including images and documents
 *
 * Required dependencies (install with npm):
 *   npm install multer uuid sharp
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { db } = require('../db/database');

// Configuration
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'chat');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed MIME types
const ALLOWED_TYPES = {
  // Images
  'image/jpeg': { ext: '.jpg', isImage: true },
  'image/png': { ext: '.png', isImage: true },
  'image/gif': { ext: '.gif', isImage: true },
  'image/webp': { ext: '.webp', isImage: true },
  // Documents
  'application/pdf': { ext: '.pdf', isImage: false },
  'application/msword': { ext: '.doc', isImage: false },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', isImage: false },
};

// Ensure upload directories exist
function ensureDirectories() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
  }
}

// Initialize directories on module load
ensureDirectories();

// Ensure chat_attachments table exists
function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_attachments (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      message_id TEXT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      thumbnail_url TEXT,
      is_image INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    )
  `);
}

// Initialize table on module load
ensureTable();

// Multer configuration with memory storage
const storage = multer.memoryStorage();

// File filter to validate uploads
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: jpg, png, gif, webp, pdf, doc, docx`), false);
  }
};

// Multer instance for single file uploads
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Create a thumbnail for an image file
 * @param {Buffer} buffer - Image file buffer
 * @param {string} thumbnailPath - Path to save thumbnail
 * @returns {Promise<boolean>} - Success status
 */
async function createThumbnail(buffer, thumbnailPath) {
  try {
    await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    return true;
  } catch (error) {
    console.error('Failed to create thumbnail:', error.message);
    return false;
  }
}

/**
 * Upload an attachment file
 * @param {object} file - Multer file object with buffer
 * @param {string} candidateId - ID of the candidate uploading
 * @param {string} messageId - Optional message ID to associate with
 * @returns {Promise<object>} - Attachment record with URLs
 */
async function uploadAttachment(file, candidateId, messageId = null) {
  ensureDirectories();
  ensureTable();

  if (!file || !file.buffer) {
    throw new Error('No file provided');
  }

  const typeInfo = ALLOWED_TYPES[file.mimetype];
  if (!typeInfo) {
    throw new Error(`Invalid file type: ${file.mimetype}`);
  }

  // Generate unique filename
  const attachmentId = uuidv4();
  const storedName = `${attachmentId}${typeInfo.ext}`;
  const filePath = path.join(UPLOAD_DIR, storedName);

  // Save file to disk
  try {
    fs.writeFileSync(filePath, file.buffer);
  } catch (error) {
    throw new Error(`Failed to save file: ${error.message}`);
  }

  // Generate thumbnail for images
  let thumbnailUrl = null;
  if (typeInfo.isImage) {
    const thumbnailName = `${attachmentId}_thumb.jpg`;
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailName);
    const thumbnailCreated = await createThumbnail(file.buffer, thumbnailPath);
    if (thumbnailCreated) {
      thumbnailUrl = `/uploads/chat/thumbnails/${thumbnailName}`;
    }
  }

  const fileUrl = `/uploads/chat/${storedName}`;

  // Store record in database
  try {
    db.prepare(`
      INSERT INTO chat_attachments (id, candidate_id, message_id, original_name, stored_name, mime_type, file_size, file_url, thumbnail_url, is_image, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      attachmentId,
      candidateId,
      messageId,
      file.originalname || 'unnamed',
      storedName,
      file.mimetype,
      file.size || file.buffer.length,
      fileUrl,
      thumbnailUrl,
      typeInfo.isImage ? 1 : 0
    );
  } catch (error) {
    // Clean up files if database insert fails
    try {
      fs.unlinkSync(filePath);
      if (thumbnailUrl) {
        const thumbnailPath = path.join(THUMBNAIL_DIR, `${attachmentId}_thumb.jpg`);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup files after DB error:', cleanupError.message);
    }
    throw new Error(`Failed to store attachment record: ${error.message}`);
  }

  // Return attachment info
  const attachment = db.prepare('SELECT * FROM chat_attachments WHERE id = ?').get(attachmentId);

  return {
    id: attachment.id,
    candidateId: attachment.candidate_id,
    messageId: attachment.message_id,
    originalName: attachment.original_name,
    mimeType: attachment.mime_type,
    fileSize: attachment.file_size,
    fileUrl: attachment.file_url,
    thumbnailUrl: attachment.thumbnail_url,
    isImage: !!attachment.is_image,
    createdAt: attachment.created_at,
  };
}

/**
 * Get attachment information by ID
 * @param {string} attachmentId - Attachment UUID
 * @returns {object|null} - Attachment record or null if not found
 */
function getAttachment(attachmentId) {
  ensureTable();

  const attachment = db.prepare('SELECT * FROM chat_attachments WHERE id = ?').get(attachmentId);

  if (!attachment) {
    return null;
  }

  return {
    id: attachment.id,
    candidateId: attachment.candidate_id,
    messageId: attachment.message_id,
    originalName: attachment.original_name,
    storedName: attachment.stored_name,
    mimeType: attachment.mime_type,
    fileSize: attachment.file_size,
    fileUrl: attachment.file_url,
    thumbnailUrl: attachment.thumbnail_url,
    isImage: !!attachment.is_image,
    createdAt: attachment.created_at,
  };
}

/**
 * Get all attachments for a candidate
 * @param {string} candidateId - Candidate ID
 * @returns {Array} - List of attachments
 */
function getAttachmentsByCandidate(candidateId) {
  ensureTable();

  const attachments = db.prepare(`
    SELECT * FROM chat_attachments
    WHERE candidate_id = ?
    ORDER BY created_at DESC
  `).all(candidateId);

  return attachments.map(attachment => ({
    id: attachment.id,
    candidateId: attachment.candidate_id,
    messageId: attachment.message_id,
    originalName: attachment.original_name,
    mimeType: attachment.mime_type,
    fileSize: attachment.file_size,
    fileUrl: attachment.file_url,
    thumbnailUrl: attachment.thumbnail_url,
    isImage: !!attachment.is_image,
    createdAt: attachment.created_at,
  }));
}

/**
 * Get attachments for a specific message
 * @param {string} messageId - Message ID
 * @returns {Array} - List of attachments
 */
function getAttachmentsByMessage(messageId) {
  ensureTable();

  const attachments = db.prepare(`
    SELECT * FROM chat_attachments
    WHERE message_id = ?
    ORDER BY created_at ASC
  `).all(messageId);

  return attachments.map(attachment => ({
    id: attachment.id,
    candidateId: attachment.candidate_id,
    messageId: attachment.message_id,
    originalName: attachment.original_name,
    mimeType: attachment.mime_type,
    fileSize: attachment.file_size,
    fileUrl: attachment.file_url,
    thumbnailUrl: attachment.thumbnail_url,
    isImage: !!attachment.is_image,
    createdAt: attachment.created_at,
  }));
}

/**
 * Delete an attachment by ID
 * @param {string} attachmentId - Attachment UUID
 * @returns {boolean} - True if deleted, false if not found
 */
function deleteAttachment(attachmentId) {
  ensureTable();

  const attachment = db.prepare('SELECT * FROM chat_attachments WHERE id = ?').get(attachmentId);

  if (!attachment) {
    return false;
  }

  // Delete files from disk
  const filePath = path.join(UPLOAD_DIR, attachment.stored_name);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error.message);
    }
  }

  // Delete thumbnail if exists
  if (attachment.thumbnail_url) {
    const thumbnailPath = path.join(THUMBNAIL_DIR, `${attachmentId}_thumb.jpg`);
    if (fs.existsSync(thumbnailPath)) {
      try {
        fs.unlinkSync(thumbnailPath);
      } catch (error) {
        console.error(`Failed to delete thumbnail ${thumbnailPath}:`, error.message);
      }
    }
  }

  // Delete database record
  db.prepare('DELETE FROM chat_attachments WHERE id = ?').run(attachmentId);

  return true;
}

/**
 * Associate an attachment with a message
 * @param {string} attachmentId - Attachment UUID
 * @param {string} messageId - Message ID
 * @returns {boolean} - True if updated, false if attachment not found
 */
function linkAttachmentToMessage(attachmentId, messageId) {
  ensureTable();

  const result = db.prepare(`
    UPDATE chat_attachments SET message_id = ? WHERE id = ?
  `).run(messageId, attachmentId);

  return result.changes > 0;
}

/**
 * Get multer middleware for handling single file upload
 * Use as: router.post('/upload', chatAttachments.uploadMiddleware, handler)
 */
const uploadMiddleware = upload.single('file');

/**
 * Express error handler for multer errors
 */
function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${error.message}`,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  next();
}

module.exports = {
  uploadAttachment,
  getAttachment,
  getAttachmentsByCandidate,
  getAttachmentsByMessage,
  deleteAttachment,
  linkAttachmentToMessage,
  uploadMiddleware,
  handleUploadError,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
};
