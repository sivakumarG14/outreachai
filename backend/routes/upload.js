const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const Lead = require('../models/Lead');
const { processReply } = require('./funnel');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  },
  // Add these options for better compatibility
  preservePath: false,
  rename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

// Lead upload endpoint
router.post('/upload-leads', auth, upload.single('file'), async (req, res) => {
  try {
    console.log('🔍 Upload request received');
    console.log('🔍 Auth check - req.user:', req.user ? 'exists' : 'undefined');
    console.log('🔍 File received:', req.file ? req.file.originalname : 'No file');
    
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const leads = [];
    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

    console.log(`📁 Processing file: ${req.file.originalname}`);

    if (fileExtension === 'csv') {
      // Process CSV file
      const results = [];
      const userEmail = req.user.email; // Store user email before async operation
      
      await new Promise((resolve, reject) => {
        require('fs').createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', async () => {
            try {
              await processLeads(results, userEmail, res);
              resolve();
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject);
      });
    } else {
      // Process Excel file
      const userEmail = req.user.email; // Store user email before async operation
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      await processLeads(data, userEmail, res);
    }

  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// Process leads array
async function processLeads(data, uploadedBy, res) {
  try {
    const leads = [];
    const duplicates = [];
    const existingEmails = new Set();

    // Get existing emails to avoid duplicates
    const existingLeads = await Lead.find({}, 'email');
    console.log(`🔍 Found ${existingLeads.length} existing leads`);
    existingLeads.forEach(lead => existingEmails.add(lead.email.toLowerCase()));
    console.log('🔍 Existing emails:', Array.from(existingEmails));

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Map common field names from various sources
      const lead = mapLeadFields(row);
      
      if (!lead.email) {
        console.log(`⚠️  Row ${i + 1}: Missing email, skipping`);
        continue;
      }

      if (existingEmails.has(lead.email.toLowerCase())) {
        duplicates.push(lead.email);
        continue;
      }

      // Set default values
      lead.language = lead.language || 'en';
      lead.status = 'Cold';
      lead.score = 0;
      lead.flow = 1;
      lead.createdAt = new Date();
      lead.updatedAt = new Date();

      leads.push(lead);
      existingEmails.add(lead.email.toLowerCase());
    }

    console.log(`📊 Processing complete: ${leads.length} new leads, ${duplicates.length} duplicates, ${data.length} total rows`);
    
    if (leads.length === 0) {
      return res.status(400).json({ 
        error: 'No valid leads found in file. All leads may be duplicates or missing email addresses.',
        duplicates: duplicates,
        totalProcessed: data.length
      });
    }

    // Insert leads in bulk
    const insertedLeads = await Lead.insertMany(leads);
    
    // Trigger funnel flow for each new lead
    const { flow1_entry } = require('../services/funnel');
    for (const lead of insertedLeads) {
      try {
        await flow1_entry(lead);
        console.log(`✅ Funnel started for: ${lead.email}`);
      } catch (error) {
        console.error(`❌ Funnel error for ${lead.email}:`, error.message);
      }
    }

    // Clean up uploaded file
    try {
      require('fs').unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('Warning: Could not delete uploaded file:', cleanupError.message);
    }

    res.json({
      message: 'Leads uploaded successfully',
      uploaded: leads.length,
      duplicates: duplicates.length,
      duplicateEmails: duplicates,
      leads: insertedLeads.map(lead => ({
        id: lead._id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        status: lead.status
      }))
    });

  } catch (error) {
    console.error('Process leads error:', error.message);
    res.status(500).json({ error: 'Failed to process leads' });
  }
}

// Map fields from various sources (Sales Navigator, HubSpot, etc.)
function mapLeadFields(row) {
  const fieldMappings = {
    // Email field variations
    email: ['email', 'Email', 'EMAIL', 'email_address', 'Email Address', 'contact_email', 'work_email'],
    
    // Name field variations  
    name: ['name', 'Name', 'NAME', 'full_name', 'Full Name', 'first_name', 'firstName', 'FirstName'],
    firstName: ['first_name', 'firstName', 'First Name', 'first', 'First'],
    lastName: ['last_name', 'lastName', 'Last Name', 'last', 'Last'],
    
    // Company field variations
    company: ['company', 'Company', 'COMPANY', 'company_name', 'Company Name', 'organization', 'Organization'],
    
    // Industry field variations
    industry: ['industry', 'Industry', 'INDUSTRY', 'industry_name', 'Industry Name', 'sector', 'Sector'],
    
    // Title/Position variations
    title: ['title', 'Title', 'TITLE', 'job_title', 'Job Title', 'position', 'Position'],
    
    // Phone variations
    phone: ['phone', 'Phone', 'PHONE', 'phone_number', 'Phone Number', 'telephone', 'Telephone'],
    
    // Location variations
    location: ['location', 'Location', 'LOCATION', 'city', 'City', 'state', 'State', 'country', 'Country'],
    
    // LinkedIn variations
    linkedin: ['linkedin', 'LinkedIn', 'LINKEDIN', 'linkedin_url', 'LinkedIn URL', 'profile_url', 'Profile URL']
  };

  const mapped = {};

  // Map each field
  Object.keys(fieldMappings).forEach(targetField => {
    const possibleFields = fieldMappings[targetField];
    
    for (const field of possibleFields) {
      if (row[field] && row[field].toString().trim()) {
        mapped[targetField] = row[field].toString().trim();
        break;
      }
    }
  });

  // Combine first and last name if name is missing
  if (!mapped.name && (mapped.firstName || mapped.lastName)) {
    mapped.name = `${mapped.firstName || ''} ${mapped.lastName || ''}`.trim();
  }

  // Set default industry if missing
  if (!mapped.industry) {
    mapped.industry = 'Technology'; // Default industry
  }

  return mapped;
}

// Get upload template
router.get('/upload-template', (req, res) => {
  const template = [
    {
      'name': 'John Doe',
      'email': 'john.doe@company.com', 
      'company': 'Example Corp',
      'industry': 'Technology',
      'title': 'Software Engineer',
      'phone': '+1-555-0123',
      'location': 'San Francisco, CA',
      'linkedin': 'https://linkedin.com/in/johndoe'
    }
  ];

  // Create CSV template
  const csv = require('csv-writer').createObjectCsvWriter({
    path: 'lead-upload-template.csv',
    header: Object.keys(template[0])
  });

  csv.writeRecords(template)
    .then(() => {
      res.download('lead-upload-template.csv', 'lead-upload-template.csv');
    });
});

module.exports = router;
