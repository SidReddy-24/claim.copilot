const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const authMiddleware = require('../middleware/authMiddleware');
const { User, Policy, Claim, Document } = require('../models/db');
const geminiService = require('../services/geminiService');

// Multer memory storage setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Database status checker middleware
router.use((req, res, next) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection is offline. Please make sure MongoDB is running locally (e.g. running "mongod") or configure MONGO_URI in your backend/.env configuration file.'
    });
  }
  next();
});


// Helper to extract text from buffer
async function extractTextFromBuffer(fileBuffer, originalName) {
  const fileExt = path.extname(originalName).toLowerCase();
  
  if (fileExt === '.pdf') {
    const pdfData = await pdfParse(fileBuffer);
    return pdfData.text;
  } else if (fileExt === '.txt' || fileExt === '.json') {
    return fileBuffer.toString('utf-8');
  } else {
    // If image or other format, return metadata or simulated extraction
    return `Uploaded file ${originalName} of size ${fileBuffer.length} bytes.`;
  }
}

// -------------------------------------------------------------
// AUTHENTICATION
// -------------------------------------------------------------

// POST /signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all details' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    await user.save();

    // Sign JWT
    const token = jwt.sign(
      { userId: user._index || user._id },
      process.env.JWT_SECRET || 'super_secret_jwt_key_123_claim_copilot_mvp',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide all details' });
    }

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Sign JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'super_secret_jwt_key_123_claim_copilot_mvp',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------------------------------------------------------------
// POLICY ENDPOINTS
// -------------------------------------------------------------

// POST /policy/upload - Protect this with JWT auth
router.post('/policy/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No policy file uploaded' });
    }

    // 1. Extract text from uploaded document (supports PDF, txt)
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
    
    // 2. Send text to Gemini Service to extract structure
    const extractedData = await geminiService.extractPolicyDetails(text);

    // 3. Save details to MongoDB under the user's ID
    const policy = new Policy({
      userId: req.userId,
      policyName: extractedData.policyName || 'Standard Health Policy',
      insurer: extractedData.insurer || 'Insurer Name',
      policyNumber: extractedData.policyNumber || `POL-${Date.now()}`,
      sumInsured: extractedData.sumInsured || 500000,
      roomRentLimits: extractedData.roomRentLimits || 'No Limit',
      icuLimits: extractedData.icuLimits || 'No Limit',
      waitingPeriods: extractedData.waitingPeriods || {},
      coveredBenefits: extractedData.coveredBenefits || [],
      exclusions: extractedData.exclusions || [],
      requiredClaimDocuments: extractedData.requiredClaimDocuments || []
    });

    await policy.save();

    // Log document entry
    const docLog = new Document({
      userId: req.userId,
      fileName: req.file.originalname,
      fileType: 'Policy',
      filePath: "memory://" + req.file.originalname,
      extractedText: text.substring(0, 1000) // Store snippet for reference
    });
    await docLog.save();

    res.status(201).json(policy);
  } catch (error) {
    console.error('Policy upload error:', error);
    res.status(500).json({ message: 'Failed to process and upload policy', error: error.message });
  }
});

// GET /policy/:id
router.get('/policy/:id', authMiddleware, async (req, res) => {
  try {
    const policy = await Policy.findOne({ _id: req.params.id, userId: req.userId });
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }
    res.json(policy);
  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper GET /policies to fetch all policies of user
router.get('/policies', authMiddleware, async (req, res) => {
  try {
    const policies = await Policy.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(policies);
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------------------------------------------------------------
// CLAIM ENDPOINTS
// -------------------------------------------------------------

// POST /claim/create
router.post('/claim/create', authMiddleware, async (req, res) => {
  try {
    const { policyId } = req.body;
    if (!policyId) {
      return res.status(400).json({ message: 'Policy ID is required' });
    }

    // Ensure policy exists
    const policy = await Policy.findOne({ _id: policyId, userId: req.userId });
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    // Create a new claim draft
    const claim = new Claim({
      userId: req.userId,
      policyId: policy._id,
      status: 'Draft',
      expenseBreakdown: []
    });

    await claim.save();
    res.status(201).json(claim);
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /claim/upload
// Expects: claimId in body, fileType (e.g. 'Bill', 'Discharge Summary'), and file field
router.post('/claim/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { claimId, fileType } = req.body;
    if (!claimId || !fileType) {
      return res.status(400).json({ message: 'Claim ID and File Type are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Ensure claim exists
    const claim = await Claim.findOne({ _id: claimId, userId: req.userId });
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    // Extract text from document
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);

    // Call Gemini to extract medical specifics (hospital name, dates, total amounts, expenses)
    const extractedData = await geminiService.extractMedicalDocumentDetails(text, fileType);

    // Update claim details based on document details
    if (extractedData.hospitalName && extractedData.hospitalName !== 'Not Specified') {
      claim.hospitalName = extractedData.hospitalName;
    }
    if (extractedData.admissionDate) {
      claim.admissionDate = new Date(extractedData.admissionDate);
    }
    if (extractedData.dischargeDate) {
      claim.dischargeDate = new Date(extractedData.dischargeDate);
    }

    // Merge/append expenses
    if (extractedData.expenseBreakdown && extractedData.expenseBreakdown.length > 0) {
      // Append new expenses, or reset them if this is a fresh final bill.
      // Usually, final bills overwrite individual ones, or we can just append.
      // Let's check: if fileType is final bill, let's replace or add them.
      // For this MVP, let's append but filter out duplicates by description, or merge. Let's merge them!
      const existingExpenses = claim.expenseBreakdown || [];
      
      extractedData.expenseBreakdown.forEach(newItem => {
        // Only add non-zero items or items with descriptive fields
        if (newItem.amount > 0) {
          existingExpenses.push({
            description: newItem.description,
            category: newItem.category,
            amount: newItem.amount,
            coverageStatus: 'Possibly Covered', // Default before full audit
            reasoning: 'Extracted from uploaded document. Pending detailed claim audit.'
          });
        }
      });

      claim.expenseBreakdown = existingExpenses;
      // Calculate total claimed sum
      claim.totalClaimedAmount = claim.expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);
    }

    await claim.save();

    // Log document upload metadata
    const newDoc = new Document({
      userId: req.userId,
      claimId: claim._id,
      fileName: req.file.originalname,
      fileType: fileType,
      filePath: "memory://" + req.file.originalname,
      extractedText: text.substring(0, 1000)
    });
    await newDoc.save();

    res.status(200).json({
      message: 'Document uploaded and analyzed successfully',
      claim,
      document: {
        id: newDoc._id,
        fileName: newDoc.fileName,
        fileType: newDoc.fileType
      }
    });
  } catch (error) {
    console.error('Claim upload error:', error);
    res.status(500).json({ message: 'Failed to process document', error: error.message });
  }
});

// GET /claim/:id
router.get('/claim/:id', authMiddleware, async (req, res) => {
  try {
    const claim = await Claim.findOne({ _id: req.params.id, userId: req.userId });
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }
    res.json(claim);
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper GET /claims to fetch all claims for the dashboard
router.get('/claims', authMiddleware, async (req, res) => {
  try {
    const claims = await Claim.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper GET to fetch uploaded documents for a claim
router.get('/claim/:id/documents', authMiddleware, async (req, res) => {
  try {
    const documents = await Document.find({ claimId: req.params.id, userId: req.userId }).select('-extractedText');
    res.json(documents);
  } catch (error) {
    console.error('Get claim documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------------------------------------------------------------
// CLAIM AUDIT & ANALYSIS
// -------------------------------------------------------------

// POST /claim/analyze
// Expects: claimId in body
router.post('/claim/analyze', authMiddleware, async (req, res) => {
  try {
    const { claimId } = req.body;
    if (!claimId) {
      return res.status(400).json({ message: 'Claim ID is required' });
    }

    // 1. Fetch Claim and associated Policy details
    const claim = await Claim.findOne({ _id: claimId, userId: req.userId });
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    const policy = await Policy.findOne({ _id: claim.policyId, userId: req.userId });
    if (!policy) {
      return res.status(404).json({ message: 'Associated policy not found' });
    }

    // 2. Call Gemini service to audit claim against policy constraints
    const analysisResult = await geminiService.analyzeClaimCoverage(policy, claim);

    // 3. Update claim with analysis results
    claim.estimatedReimbursement = analysisResult.estimatedReimbursement || 0;
    claim.confidenceScore = analysisResult.confidenceScore || 0;
    claim.missingDocuments = analysisResult.missingDocuments || [];
    
    // Save the detailed item breakdowns
    if (analysisResult.expenseBreakdown && analysisResult.expenseBreakdown.length > 0) {
      // Map to ensure we match status restrictions: Likely Covered, Possibly Covered, Coverage Not Found
      claim.expenseBreakdown = analysisResult.expenseBreakdown.map(item => ({
        description: item.description,
        category: item.category,
        amount: item.amount,
        coverageStatus: ['Likely Covered', 'Possibly Covered', 'Coverage Not Found'].includes(item.coverageStatus) 
          ? item.coverageStatus 
          : 'Possibly Covered',
        reasoning: item.reasoning || 'No details provided'
      }));
    }

    await claim.save();

    res.json({
      message: 'Claim analyzed successfully',
      analysis: {
        claimId: claim._id,
        totalClaimedAmount: claim.totalClaimedAmount,
        estimatedReimbursement: claim.estimatedReimbursement,
        confidenceScore: claim.confidenceScore,
        expenseBreakdown: claim.expenseBreakdown,
        missingDocuments: claim.missingDocuments
      }
    });
  } catch (error) {
    console.error('Claim analysis error:', error);
    res.status(500).json({ message: 'Failed to analyze claim', error: error.message });
  }
});

// GET /claim/result
// Expects: claimId as a query parameter (GET /claim/result?claimId=xxxx)
router.get('/claim/result', authMiddleware, async (req, res) => {
  try {
    const { claimId } = req.query;
    if (!claimId) {
      return res.status(400).json({ message: 'Claim ID is required in query parameters' });
    }

    const claim = await Claim.findOne({ _id: claimId, userId: req.userId });
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    res.json({
      claimId: claim._id,
      hospitalName: claim.hospitalName,
      admissionDate: claim.admissionDate,
      dischargeDate: claim.dischargeDate,
      totalClaimedAmount: claim.totalClaimedAmount,
      estimatedReimbursement: claim.estimatedReimbursement,
      confidenceScore: claim.confidenceScore,
      expenseBreakdown: claim.expenseBreakdown,
      missingDocuments: claim.missingDocuments,
      status: claim.status
    });
  } catch (error) {
    console.error('Get claim result error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------------------------------------------------------------
// CLAIM PACKAGE GENERATION
// -------------------------------------------------------------

// POST /claim/package
// Expects: claimId in body
router.post('/claim/package', authMiddleware, async (req, res) => {
  try {
    const { claimId } = req.body;
    if (!claimId) {
      return res.status(400).json({ message: 'Claim ID is required' });
    }

    const claim = await Claim.findOne({ _id: claimId, userId: req.userId });
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    const policy = await Policy.findOne({ _id: claim.policyId, userId: req.userId });
    if (!policy) {
      return res.status(404).json({ message: 'Associated policy not found' });
    }

    // Call Gemini to compile the final reimbursement checklist package
    const pack = await geminiService.generateClaimPackage(policy, claim);

    // Save outputs back to claim
    claim.submissionChecklist = pack.submissionChecklist || [];
    claim.emailDraft = pack.emailDraft || '';
    if (pack.missingDocumentChecklist && pack.missingDocumentChecklist.length > 0) {
      // Merge unique missing documents if any new ones are suggested
      const combinedMissing = Array.from(new Set([...claim.missingDocuments, ...pack.missingDocumentChecklist]));
      claim.missingDocuments = combinedMissing;
    }

    // Update status to Submitted (or keep as Draft, but we can set to Submitted once package generated or when user clicks submit.
    // Let's keep status update as a separate optional route, or auto-submit in package generation. Let's make a mock submit endpoint or just let the user change status.
    // For now, let's keep it as draft or let them transition. We'll set claim.status = 'Draft' but package generated. Let's allow users to submit it. We can add a helper endpoint or just toggle status. Let's make an endpoint or let them hit POST and toggle status.
    
    await claim.save();

    res.json({
      message: 'Claim submission package generated successfully',
      package: {
        claimId: claim._id,
        claimSummary: pack.claimSummary,
        missingDocumentChecklist: pack.missingDocumentChecklist || claim.missingDocuments,
        submissionChecklist: claim.submissionChecklist,
        emailDraft: claim.emailDraft
      }
    });
  } catch (error) {
    console.error('Claim package error:', error);
    res.status(500).json({ message: 'Failed to generate claim package', error: error.message });
  }
});

// Helper PUT /claim/:id/status to mark as submitted
router.put('/claim/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Draft', 'Submitted'].includes(status)) {
      return res.status(400).json({ message: 'Valid status required' });
    }

    const claim = await Claim.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status },
      { new: true }
    );

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    res.json({ message: `Claim status updated to ${status}`, claim });
  } catch (error) {
    console.error('Update claim status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
