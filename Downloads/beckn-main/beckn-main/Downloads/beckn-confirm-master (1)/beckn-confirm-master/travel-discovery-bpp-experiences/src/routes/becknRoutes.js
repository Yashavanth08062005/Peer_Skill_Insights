const express = require('express');
const router = express.Router();
const becknController = require('../controllers/becknController');

/**
 * Beckn Protocol Routes for Hotels BPP
 */

// Discovery Phase
router.post('/search', becknController.search);

// Transaction Phase
router.post('/select', becknController.select);
router.post('/init', becknController.init);
router.post('/confirm', becknController.confirm);

// Post-Transaction Phase  
router.post('/status', becknController.status);
router.post('/track', becknController.track);
router.post('/cancel', becknController.cancel);
router.post('/update', becknController.update);

module.exports = router;