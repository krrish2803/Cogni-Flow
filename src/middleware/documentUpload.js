const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

const supportedExtensions = new Set(['.pdf', '.doc', '.docx', '.txt']);
const supportedMimeTypes = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!supportedExtensions.has(extension) || !supportedMimeTypes.has(file.mimetype)) return callback(new AppError('Upload a PDF, DOC, DOCX, or TXT file up to 8 MB.', 415));
    callback(null, true);
  }
});

module.exports = (req, res, next) => upload.single('file')(req, res, error => {
  if (error?.code === 'LIMIT_FILE_SIZE') return next(new AppError('The file is too large. Upload a file up to 8 MB.', 413));
  next(error);
});
