/**
 * Chat Attachments API Routes
 *
 * Endpoints for uploading, retrieving, and managing chat attachments.
 */

const express = require('express');
const router = express.Router();

// Lazy load service
let attachmentService = null;
function getAttachmentService() {
  if (!attachmentService) {
    attachmentService = require('../../../services/chat-attachments');
  }
  return attachmentService;
}

/**
 * POST /api/v1/chat/attachments
 * Upload a chat attachment
 */
router.post('/', (req, res) => {
  const service = getAttachmentService();

  service.uploadMiddleware(req, res, async (err) => {
    if (err) {
      return service.handleUploadError(err, req, res, () => {});
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { candidateId, messageId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'candidateId is required' });
    }

    try {
      const attachment = await service.uploadAttachment(req.file, candidateId, messageId);

      res.json({
        success: true,
        data: attachment,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

/**
 * GET /api/v1/chat/attachments/:id
 * Get attachment info
 */
router.get('/:id', (req, res) => {
  try {
    const service = getAttachmentService();
    const attachment = service.getAttachment(req.params.id);

    if (!attachment) {
      return res.status(404).json({ success: false, error: 'Attachment not found' });
    }

    res.json({ success: true, data: attachment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/chat/attachments/candidate/:candidateId
 * Get all attachments for a candidate
 */
router.get('/candidate/:candidateId', (req, res) => {
  try {
    const service = getAttachmentService();
    const attachments = service.getAttachmentsByCandidate(req.params.candidateId);

    res.json({ success: true, data: attachments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/chat/attachments/message/:messageId
 * Get attachments for a specific message
 */
router.get('/message/:messageId', (req, res) => {
  try {
    const service = getAttachmentService();
    const attachments = service.getAttachmentsByMessage(req.params.messageId);

    res.json({ success: true, data: attachments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/chat/attachments/:id/link
 * Link attachment to a message
 */
router.put('/:id/link', (req, res) => {
  try {
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ success: false, error: 'messageId is required' });
    }

    const service = getAttachmentService();
    service.linkAttachmentToMessage(req.params.id, messageId);

    res.json({ success: true, message: 'Attachment linked to message' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/chat/attachments/:id
 * Delete an attachment
 */
router.delete('/:id', (req, res) => {
  try {
    const service = getAttachmentService();
    const deleted = service.deleteAttachment(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Attachment not found' });
    }

    res.json({ success: true, message: 'Attachment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
