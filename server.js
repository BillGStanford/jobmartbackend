require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'DiskCart5@',
  database: process.env.DB_NAME || 'job_search_db'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

// Routes
// Post a new job
app.post('/api/jobs', upload.array('images', 8), (req, res) => {
  const {
    title,
    description,
    publisherPosition,
    businessName,
    businessSector,
    jobType,
    salary,
    benefits,
    publisherName,
    contactInfo
  } = req.body;

  const thumbnailImage = req.files[0].filename;
  const additionalImages = req.files.slice(1).map(file => file.filename).join(',');

  const query = `
    INSERT INTO jobs (
      title, description, publisher_position, business_name, 
      business_sector, job_type, salary, benefits, 
      publisher_name, contact_info, thumbnail_image, additional_images
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      title, description, publisherPosition, businessName,
      businessSector, jobType, salary, benefits,
      publisherName, contactInfo, thumbnailImage, additionalImages
    ],
    (err, results) => {
      if (err) {
        console.error('Error creating job:', err);
        res.status(500).json({ error: 'Error creating job' });
        return;
      }
      res.status(201).json({ id: results.insertId, message: 'Job created successfully' });
    }
  );
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
  const { search, jobType } = req.query;
  
  let query = 'SELECT * FROM jobs';
  const params = [];

  if (search || jobType) {
    query += ' WHERE';
    const conditions = [];
    
    if (search) {
      conditions.push(' (title LIKE ? OR description LIKE ? OR publisher_position LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (jobType) {
      conditions.push(' job_type = ?');
      params.push(jobType);
    }
    
    query += conditions.join(' AND');
  }

  query += ' ORDER BY created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching jobs:', err);
      res.status(500).json({ error: 'Error fetching jobs' });
      return;
    }
    res.json(results);
  });
});

// Get single job
app.get('/api/jobs/:id', (req, res) => {
  const query = 'SELECT * FROM jobs WHERE id = ?';
  
  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error('Error fetching job:', err);
      res.status(500).json({ error: 'Error fetching job' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(results[0]);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});