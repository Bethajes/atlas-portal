const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const uploadDirs = ['receipts', 'admissions', 'profiles', 'students'].map(d => path.join(UPLOADS_ROOT, d));
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const PROOF_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const PROOF_MAX_SIZE = 2 * 1024 * 1024; // 2 MB

/** Pure helper — returns true if the MIME type is allowed for proof uploads */
const isProofMimeAllowed = (mime) => PROOF_ALLOWED_MIMES.includes(String(mime || '').toLowerCase());

/** Pure helper — returns true if the file size is within the proof upload limit */
const isProofSizeAllowed = (sizeBytes) => sizeBytes <= PROOF_MAX_SIZE;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = UPLOADS_ROOT;
    if (file.fieldname === 'proof') dest = path.join(dest, 'receipts');
    else if (file.fieldname === 'receipt') dest = path.join(dest, 'receipts');
    else if (file.fieldname === 'photo') dest = path.join(dest, 'students');
    else if (['transcript', 'idDocument'].includes(file.fieldname)) dest = path.join(dest, 'admissions');
    else dest = path.join(dest, 'profiles');
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

  if (file.fieldname === 'proof') {
    if (!PROOF_ALLOWED_MIMES.includes(mime)) {
      return cb(new Error('Only JPEG, PNG, and WEBP images are allowed'));
    }
    return cb(null, true);
  }

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

// Multer instance for proof uploads — 2 MB limit, images only
const proofLimits = { fileSize: PROOF_MAX_SIZE };

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB default limit
  fileFilter,
});

// Dedicated upload instance for payment proofs with 2 MB limit
upload.proof = multer({
  storage,
  limits: proofLimits,
  fileFilter,
});

module.exports = upload;
module.exports.PROOF_ALLOWED_MIMES = PROOF_ALLOWED_MIMES;
module.exports.PROOF_MAX_SIZE = PROOF_MAX_SIZE;
module.exports.isProofMimeAllowed = isProofMimeAllowed;
module.exports.isProofSizeAllowed = isProofSizeAllowed;
