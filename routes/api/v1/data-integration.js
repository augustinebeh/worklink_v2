/**
 * Data Integration API Routes - Legacy Compatibility Layer
 *
 * This file serves as a compatibility layer for the refactored data-integration module.
 * All routes are now handled by the modular structure in ./data-integration/
 */

const express = require('express');
const router = express.Router();

// Import the new modular data integration router
const dataIntegrationRouter = require('./data-integration');

// Mount the new modular router
router.use('/', dataIntegrationRouter);

module.exports = router;