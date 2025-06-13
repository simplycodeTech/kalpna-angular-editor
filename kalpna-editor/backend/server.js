const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;


app.use(cors());

// ✅ Static serving for public folder
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/images', express.static(path.join(__dirname, 'public/uploads/images')));
app.use('/pdfs', express.static(path.join(__dirname, 'public/uploads/pdfs')));

// ✅ Image Storage
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'public/uploads/images');
    fs.mkdirSync(dir, { recursive: true }); // Ensure folder exists
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// ✅ PDF Storage
const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'public/uploads/pdfs');
    fs.mkdirSync(dir, { recursive: true }); // Ensure folder exists
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// ✅ Separate upload middleware
const uploadImage = multer({ storage: imageStorage });
const uploadPDF = multer({ storage: pdfStorage });

// ✅ Upload Image Endpoint
app.post('/upload/image', uploadImage.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imageUrl = `/images/${req.file.filename}`;
  res.json({ path: imageUrl });
});

// ✅ Upload PDF Endpoint
app.post('/upload/pdf', uploadPDF.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const pdfUrl = `/pdfs/${req.file.filename}`;
  res.json({ filePath: pdfUrl }); 
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
