const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadDocument, getMyDocuments, getDocumentDetails, downloadDocumentFile } = require('../controllers/document.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { UPLOAD_DIR } = require('../config/environment');

const router = express.Router();

// Ensure upload directory exists
const uploadPath = path.join(__dirname, '../../', UPLOAD_DIR);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

router.post('/upload', authenticateToken, upload.single('file'), uploadDocument);
router.get('/', authenticateToken, getMyDocuments);
router.get('/:documentId', authenticateToken, getDocumentDetails);
router.get('/:documentId/file', authenticateToken, downloadDocumentFile);

module.exports = router;
