const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const uploadDirs = ['uploads/receipts', 'uploads/admissions', 'uploads/profiles', 'uploads/students'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'uploads/';
    if (file.fieldname === 'receipt') dest += 'receipts';
    else if (file.fieldname === 'photo') dest += 'students';
    else if (['transcript', 'idDocument'].includes(file.fieldname)) dest += 'admissions';
    else dest += 'profiles';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  const isImage = ['.jpeg', '.jpg', '.png'].includes(ext) && ['image/jpeg', 'image/jpg', 'image/png'].includes(mime);
  const isPdf = ext === '.pdf' && mime === 'application/pdf';

  if (file.fieldname === 'photo') {
    if (!isImage) return cb(new Error('Passport photo must be JPG or PNG'));
    return cb(null, true);
  }

  if (['transcript', 'idDocument', 'receipt'].includes(file.fieldname)) {
    if (!isImage && !isPdf) return cb(new Error('Only JPG, PNG, and PDF are allowed'));
    return cb(null, true);
  }

  if (!isImage && !isPdf) return cb(new Error('Only JPG, PNG, and PDF are allowed'));
  return cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

module.exports = upload;
