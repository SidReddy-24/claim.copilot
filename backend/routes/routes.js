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
router.use(async (req, res, next) => {
  const mongoose = require('mongoose');
  const { connectDB } = require('../models/db');
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/claim-assistant';

  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB(MONGO_URI);
    } catch (err) {
      console.error('Database connection failed in middleware:', err.message);
      return res.status(503).json({
        message: `Database connection is offline. Connection error: ${err.message}. Please configure MONGO_URI in your environment variables.`,
        error: err.message
      });
    }
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
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
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
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
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
      requiredClaimDocuments: extractedData.requiredClaimDocuments || [],
      benefits: extractedData.benefits || null
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

    // Check if a claim already exists for this policy and user
    const existingClaim = await Claim.findOne({ policyId: policy._id, userId: req.userId });
    if (existingClaim) {
      return res.status(200).json(existingClaim);
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

    const policy = await Policy.findById(claim.policyId);
    const policyBenefits = policy ? policy.benefits : null;

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
      status: claim.status,
      policyBenefits: policyBenefits
    });
  } catch (error) {
    console.error('Get claim result error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper GET /claims to fetch all claims for the dashboard
router.get('/claims', authMiddleware, async (req, res) => {
  try {
    let claims = await Claim.find({ userId: req.userId }).sort({ createdAt: -1 });

    // Deduplicate empty draft claims for the same policy on the fly to clean up database
    const policyClaimsMap = {};
    claims.forEach(c => {
      const pid = c.policyId.toString();
      if (!policyClaimsMap[pid]) {
        policyClaimsMap[pid] = [];
      }
      policyClaimsMap[pid].push(c);
    });

    const claimsToDeleteIds = [];
    for (const pid in policyClaimsMap) {
      const pClaims = policyClaimsMap[pid];
      if (pClaims.length > 1) {
        // Sort: Submitted/analyzed ones first, then drafts with actual content, newest drafts next
        pClaims.sort((a, b) => {
          if (a.status === 'Submitted' && b.status !== 'Submitted') return -1;
          if (b.status === 'Submitted' && a.status !== 'Submitted') return 1;
          const aLen = a.expenseBreakdown?.length || 0;
          const bLen = b.expenseBreakdown?.length || 0;
          if (aLen !== bLen) return bLen - aLen;
          return b.createdAt - a.createdAt;
        });

        // Keep the best/newest one, mark other empty draft ones for deletion
        for (let i = 1; i < pClaims.length; i++) {
          const c = pClaims[i];
          if (c.status === 'Draft' && (!c.expenseBreakdown || c.expenseBreakdown.length === 0)) {
            claimsToDeleteIds.push(c._id);
          }
        }
      }
    }

    if (claimsToDeleteIds.length > 0) {
      await Claim.deleteMany({ _id: { $in: claimsToDeleteIds } });
      claims = await Claim.find({ userId: req.userId }).sort({ createdAt: -1 });
    }

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

// GET /seed - Endpoint to seed 5 mock policies & claims for the registered user
router.get('/seed', async (req, res) => {
  try {
    const { User, Policy, Claim } = require('../models/db');
    
    // Find the first user or create a default demo user
    let user = await User.findOne().sort({ createdAt: 1 });
    if (!user) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = new User({
        name: "Demo User",
        email: "demo@claimcopilot.com",
        password: hashedPassword
      });
      await user.save();
    }

    // Check if Niva Bupa seed policy already exists
    const existingSeed = await Policy.findOne({ userId: user._id, policyName: "Niva Bupa ReAssure 2.0" });
    if (existingSeed) {
      return res.json({ message: `Database is already seeded for user: ${user.email}!` });
    }

    // Seed 1: Niva Bupa
    const policy1 = new Policy({
      userId: user._id,
      policyName: "Niva Bupa ReAssure 2.0",
      insurer: "Niva Bupa Health Insurance Co.",
      policyNumber: "POL-NB-44889922",
      sumInsured: 1000000,
      roomRentLimits: "Single Private A/C Room, up to actuals",
      icuLimits: "No limit, covered up to actual expenses",
      waitingPeriods: {
        preExistingDiseases: "36 months waiting period",
        initialWaitingPeriod: "30 days waiting period",
        specificIllnesses: "24 months waiting period"
      },
      coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization (60/180 days)", "Organ Donor Expenses", "Alternative Treatment (AYUSH)"],
      exclusions: ["Cosmetic Surgery", "Substance abuse treatment", "Non-medical accessories"],
      requiredClaimDocuments: ["Claim Form A & B", "Original Discharge Summary", "Itemized Final Bill", "Payment Receipt", "Lab Reports", "Cancelled Cheque"],
      benefits: {
        policy_name: { exact_clause: "Niva Bupa ReAssure 2.0 Individual Health Plan.", page: "Page 1" },
        sum_insured: { exact_clause: "Maximum liability under the policy year shall not exceed INR 10,00,000.", page: "Page 2" },
        room_rent_limit: { exact_clause: "No capping on room rent. Insured eligible for Single Private AC Room.", page: "Page 3" },
        icu_limit: { exact_clause: "ICU charges covered up to actuals with no sub-limits.", page: "Page 3" },
        waiting_periods: [
          { title: "Pre-existing Diseases", exact_clause: "PED covered after 36 months of continuous coverage.", page: "Page 5" },
          { title: "Specific Illnesses", exact_clause: "24-month waiting period applies for cataracts, joint replacements, and hernia.", page: "Page 6" }
        ],
        covered_benefits: [
          { title: "In-patient Care", exact_clause: "In-patient care expenses including boarding, medical practitioner fees, surgery charges covered.", page: "Page 3" }
        ],
        exclusions: [
          { title: "Cosmetic Surgery", exact_clause: "Cosmetic surgery or reconstructive surgery excluded unless due to accident.", page: "Page 9" }
        ]
      }
    });
    await policy1.save();

    const claim1 = new Claim({
      userId: user._id,
      policyId: policy1._id,
      hospitalName: "Max Super Speciality Hospital, Delhi",
      admissionDate: new Date("2026-05-10"),
      dischargeDate: new Date("2026-05-13"),
      totalClaimedAmount: 280000,
      estimatedReimbursement: 265000,
      confidenceScore: 95,
      status: "Submitted",
      expenseBreakdown: [
        { description: "Room Rent - Single Private AC (3 nights @ 9,000/night)", category: "Room Rent", amount: 27000, coverageStatus: "Likely Covered", reasoning: "Room charges match policy allowance for Single Private AC Room." },
        { description: "Coronary Angioplasty Surgical Procedure & Consumables", category: "OT Charges", amount: 180000, coverageStatus: "Likely Covered", reasoning: "Surgical intervention is standard covered benefit." },
        { description: "Consultant Cardiologist Fees (Dr. S. Sharma)", category: "Doctor Fees", amount: 35000, coverageStatus: "Likely Covered", reasoning: "Doctor fees are fully claimable under surgical care." },
        { description: "Hospitalization Medicines & Pharmacy charges", category: "Pharmacy", amount: 23000, coverageStatus: "Possibly Covered", reasoning: "Covered subject to original pharmacy bills and doctor prescription." },
        { description: "Surgical Angioplasty Stent & Accessories", category: "Consumables", amount: 10000, coverageStatus: "Likely Covered", reasoning: "Implants and active surgery accessories are payable." },
        { description: "Admission Kit, Patient toiletries and food charges", category: "Consumables", amount: 5000, coverageStatus: "Coverage Not Found", reasoning: "Non-medical consumables like toiletries are general exclusions." }
      ],
      missingDocuments: [
        "Original ECG and Cardiac stress report matching the diagnostic records",
        "Cancelled Cheque of the primary policyholder for NEFT transfer"
      ],
      submissionChecklist: [
        "Fill and sign Claim Form Part-A.",
        "Get hospital desk to sign and stamp Claim Form Part-B.",
        "Attach original discharge summary signed by Dr. Sharma.",
        "Mail compiled set to Niva Bupa TPA claims department."
      ],
      emailDraft: "Subject: Claim Reimbursement Request - Niva Bupa - Pol: POL-NB-44889922\n\nDear Claims Team,\n\nPlease find attached the reimbursement claim files for the Coronary Angioplasty of patient at Max Hospital, Delhi.\n\nSincerely,\nPolicyholder"
    });
    await claim1.save();

    // Seed 2: HDFC Ergo
    const policy2 = new Policy({
      userId: user._id,
      policyName: "HDFC Ergo Optima Secure",
      insurer: "HDFC Ergo General Insurance Co.",
      policyNumber: "POL-HE-11223344",
      sumInsured: 500000,
      roomRentLimits: "Single Private A/C Room, up to actuals",
      icuLimits: "Actual expenses, no sub-limit",
      waitingPeriods: {
        preExistingDiseases: "36 months waiting period",
        initialWaitingPeriod: "30 days waiting period",
        specificIllnesses: "24 months waiting period"
      },
      coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization (60/180 days)", "Domiciliary Hospitalization", "Air Ambulance"],
      exclusions: ["Cosmetic treatments", "Self-inflicted injury", "Unproven treatments"],
      requiredClaimDocuments: ["Claim Form A & B", "Original Discharge Summary", "Final Bill with breakups", "Payment Receipt", "Lab Reports", "Cancelled Cheque"],
      benefits: {
        policy_name: { exact_clause: "HDFC Ergo Optima Secure Individual / Family Floater Policy.", page: "Page 1" },
        sum_insured: { exact_clause: "Sum Insured limit is capped at INR 5,00,000 per policy term.", page: "Page 2" },
        room_rent_limit: { exact_clause: "Eligible for Single Private A/C Room. Proportionate deductions apply if higher room is selected.", page: "Page 4" },
        icu_limit: { exact_clause: "ICU charges covered up to actual expenses with no sub-limits.", page: "Page 4" },
        waiting_periods: [
          { title: "PED Waiting Period", exact_clause: "Coverage for Pre-existing illnesses starts after 36 months of continuous renewals.", page: "Page 8" }
        ],
        covered_benefits: [
          { title: "Joint replacement", exact_clause: "Surgical replacement of knee joints is covered under major surgeries list.", page: "Page 6" }
        ],
        exclusions: [
          { title: "Administrative charges", exact_clause: "General administration, registration, and file handling fees are excluded.", page: "Page 12" }
        ]
      }
    });
    await policy2.save();

    const claim2 = new Claim({
      userId: user._id,
      policyId: policy2._id,
      hospitalName: "Apollo Hospitals, Bangalore",
      admissionDate: new Date("2026-04-15"),
      dischargeDate: new Date("2026-04-18"),
      totalClaimedAmount: 350000,
      estimatedReimbursement: 342000,
      confidenceScore: 96,
      status: "Submitted",
      expenseBreakdown: [
        { description: "Knee Replacement Major Surgery charges", category: "OT Charges", amount: 220000, coverageStatus: "Likely Covered", reasoning: "Surgical operation charges are fully covered under major procedures list." },
        { description: "Implant charges (Knee Prosthetics)", category: "Consumables", amount: 80000, coverageStatus: "Likely Covered", reasoning: "Joint implants and surgical devices are covered." },
        { description: "Consultant Orthopedic Surgeon Fee (Dr. P. Hegde)", category: "Doctor Fees", amount: 30000, coverageStatus: "Likely Covered", reasoning: "Physician and surgeon fee fully claimable." },
        { description: "Room Rent - Single Private AC (3 nights @ 4,000/night)", category: "Room Rent", amount: 12000, coverageStatus: "Likely Covered", reasoning: "Room charges match Single Private AC room allowance." },
        { description: "Administrative charges & registration fee", category: "Miscellaneous", amount: 8000, coverageStatus: "Coverage Not Found", reasoning: "Registration and file maintenance charges are standard exclusions." }
      ],
      missingDocuments: [
        "Original X-Ray reports and knee implant barcode sticker invoice",
        "Cancelled Cheque of the primary policyholder"
      ],
      submissionChecklist: [
        "Compile Claim Form A & B.",
        "Get doctor signature on Part-B.",
        "Attach knee implant barcode stickers.",
        "Submit to HDFC Ergo TPA desk."
      ],
      emailDraft: "Subject: Claim Submission - HDFC Ergo - Knee Replacement\n\nDear Claims team,\n\nSubmission details for knee replacement at Apollo Hospital, Bangalore.\n\nSincerely,\nPolicyholder"
    });
    await claim2.save();

    // Seed 3: Star Health
    const policy3 = new Policy({
      userId: user._id,
      policyName: "Star Comprehensive Health Insurance",
      insurer: "Star Health & Allied Insurance Co. Ltd.",
      policyNumber: "POL-STAR-77665544",
      sumInsured: 500000,
      roomRentLimits: "Single Private A/C Room up to actuals, no sub-limit",
      icuLimits: "No sub-limits, actual expenses covered",
      waitingPeriods: {
        preExistingDiseases: "36 months waiting period",
        initialWaitingPeriod: "30 days waiting period",
        specificIllnesses: "24 months waiting period"
      },
      coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization", "Road Ambulance", "AYUSH Treatments"],
      exclusions: ["Cosmetic surgeries", "Substance abuse treatment", "Non-medical consumables"],
      requiredClaimDocuments: ["Claim Form A & B", "Original Discharge Summary", "Hospital Bills", "Receipt", "Cancelled Cheque"],
      benefits: {
        policy_name: { exact_clause: "Star Comprehensive Health Insurance Policy (Individual & Floater).", page: "Page 1" },
        sum_insured: { exact_clause: "The Maximum Limit of Indemnity under this policy shall be the Sum Insured of INR 5,00,000.", page: "Page 2" },
        room_rent_limit: { exact_clause: "Room Rent up to Single Private A/C Room. No sub-limit caps apply.", page: "Page 4" },
        icu_limit: { exact_clause: "ICU charges covered up to actual expenses.", page: "Page 4" },
        waiting_periods: [
          { title: "PED wait time", exact_clause: "36 months waiting period for pre-existing conditions.", page: "Page 7" }
        ],
        covered_benefits: [
          { title: "Appendectomy", exact_clause: "Laparoscopic procedures for appendicitis covered under emergency surgical list.", page: "Page 3" }
        ],
        exclusions: [
          { title: "Non-medical consumables", exact_clause: "Consumables like surgical gloves, gowns, sanitizers are excluded.", page: "Page 11" }
        ]
      }
    });
    await policy3.save();

    const claim3 = new Claim({
      userId: user._id,
      policyId: policy3._id,
      hospitalName: "Fortis Hospital, Chennai",
      admissionDate: new Date("2026-03-12"),
      dischargeDate: new Date("2026-03-14"),
      totalClaimedAmount: 120000,
      estimatedReimbursement: 112000,
      confidenceScore: 94,
      status: "Submitted",
      expenseBreakdown: [
        { description: "Laparoscopic Appendectomy surgery charges", category: "OT Charges", amount: 75000, coverageStatus: "Likely Covered", reasoning: "Emergency appendectomy surgical charges fully covered." },
        { description: "Surgeon Consultation Fees (Dr. R. Kannan)", category: "Doctor Fees", amount: 18000, coverageStatus: "Likely Covered", reasoning: "Consulting fees are fully claimable." },
        { description: "Room Rent - Single Private AC (2 nights @ 5,000/night)", category: "Room Rent", amount: 10000, coverageStatus: "Likely Covered", reasoning: "Matches Single Private AC room limits." },
        { description: "Pharmacy / Injection charges during surgery", category: "Pharmacy", amount: 9000, coverageStatus: "Likely Covered", reasoning: "In-patient pharmacy expenses are payable." },
        { description: "Surgical consumables, gloves, gowns & sanitizers", category: "Consumables", amount: 8000, coverageStatus: "Coverage Not Found", reasoning: "Surgical gloves and disposable items are non-payable consumables under Star Health rules." }
      ],
      missingDocuments: [
        "Original diagnostic ultrasound report confirming Acute Appendicitis",
        "Cancelled Cheque of the primary policyholder"
      ],
      submissionChecklist: [
        "Complete Claim Form A.",
        "Get hospital stamp on Claim Form B.",
        "Attach original bills and receipts.",
        "Courier to Star Health Claims office."
      ],
      emailDraft: "Subject: Appendectomy Claim Submission - Star Health - POL-STAR-77665544\n\nDear claims, details for Appendectomy reimbursement claim at Fortis, Chennai.\n\nSincerely,\nPolicyholder"
    });
    await claim3.save();

    // Seed 4: ICICI Lombard
    const policy4 = new Policy({
      userId: user._id,
      policyName: "ICICI Lombard Complete Health",
      insurer: "ICICI Lombard General Insurance Co.",
      policyNumber: "POL-IL-88776655",
      sumInsured: 300000,
      roomRentLimits: "Single Private A/C Room up to actuals",
      icuLimits: "No sub-limits, actual expenses covered",
      waitingPeriods: {
        preExistingDiseases: "36 months waiting period",
        initialWaitingPeriod: "30 days waiting period",
        specificIllnesses: "24 months waiting period"
      },
      coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization", "Donor Expenses", "Wellness rewards"],
      exclusions: ["Cosmetic treatment", "Alternative therapies unless specified", "Standard consumables"],
      requiredClaimDocuments: ["Claim Form A & B", "Discharge summary", "Bills & breakups", "Lab report", "Cheque copy"],
      benefits: {
        policy_name: { exact_clause: "ICICI Lombard Complete Health Individual Plan.", page: "Page 1" },
        sum_insured: { exact_clause: "Maximum Sum Insured limit is INR 3,00,000 per policy year.", page: "Page 2" },
        room_rent_limit: { exact_clause: "Room charges eligible up to Single Private AC Room. No sub-limit caps apply.", page: "Page 4" },
        icu_limit: { exact_clause: "ICU charges covered up to actual expenses.", page: "Page 4" },
        waiting_periods: [
          { title: "PED wait", exact_clause: "Pre-existing diseases covered after 36 months of continuous cover.", page: "Page 7" }
        ],
        covered_benefits: [
          { title: "Lithotripsy", exact_clause: "Lithotripsy treatment for kidney stone removal is covered under day care/hospitalization benefits.", page: "Page 3" }
        ],
        exclusions: [
          { title: "Toiletries and convenience items", exact_clause: "Toiletries, hand sanitizers, masks, and convenience kits are excluded.", page: "Page 11" }
        ]
      }
    });
    await policy4.save();

    const claim4 = new Claim({
      userId: user._id,
      policyId: policy4._id,
      hospitalName: "Kokilaben Dhirubhai Ambani Hospital, Mumbai",
      admissionDate: new Date("2026-02-20"),
      dischargeDate: new Date("2026-02-21"),
      totalClaimedAmount: 95000,
      estimatedReimbursement: 91500,
      confidenceScore: 93,
      status: "Submitted",
      expenseBreakdown: [
        { description: "Lithotripsy kidney stone surgical procedures", category: "OT Charges", amount: 62000, coverageStatus: "Likely Covered", reasoning: "Lithotripsy surgical treatment covered under day care procedures." },
        { description: "Consultant urologist fees (Dr. V. Patel)", category: "Doctor Fees", amount: 15000, coverageStatus: "Likely Covered", reasoning: "Doctor fee fully claimable." },
        { description: "Room Rent - Single Private AC (1 night @ 6,500/night)", category: "Room Rent", amount: 6500, coverageStatus: "Likely Covered", reasoning: "Room charges match policy guidelines." },
        { description: "Diagnostics (Ultrasound, Renal panel, Urinalysis)", category: "Diagnostics", amount: 8000, coverageStatus: "Likely Covered", reasoning: "Required pre-surgery diagnostics are payable." },
        { description: "Registration kit, masks, and admission toiletries", category: "Consumables", amount: 3500, coverageStatus: "Coverage Not Found", reasoning: "Non-medical kits and toiletries are general exclusions." }
      ],
      missingDocuments: [
        "Original CT KUB print report confirming stone removal",
        "Cancelled Cheque of the primary policyholder"
      ],
      submissionChecklist: [
        "Complete Claim Form A.",
        "Request hospital billing desk to complete Claim Form B.",
        "Attach CT KUB report and billing invoices.",
        "Send to ICICI Lombard Claims Desk."
      ],
      emailDraft: "Subject: Lithotripsy Claim Submission - ICICI Lombard - POL-IL-88776655\n\nDear claims department, files for Kidney Stone Lithotripsy claim at Kokilaben, Mumbai.\n\nSincerely,\nPolicyholder"
    });
    await claim4.save();

    // Seed 5: Care Health
    const policy5 = new Policy({
      userId: user._id,
      policyName: "Care Health Insurance Plan",
      insurer: "Care Health Insurance Ltd.",
      policyNumber: "POL-CARE-55443322",
      sumInsured: 300000,
      roomRentLimits: "Single Private Room cap up to 1% of Sum Insured per day",
      icuLimits: "ICU charges cap up to 2% of Sum Insured per day",
      waitingPeriods: {
        preExistingDiseases: "48 months waiting period",
        initialWaitingPeriod: "30 days waiting period",
        specificIllnesses: "24 months waiting period"
      },
      coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization", "Alternative Treatment (AYUSH)"],
      exclusions: ["Cosmetic surgery", "Self-inflicted injury", "Non-medical consumables"],
      requiredClaimDocuments: ["Claim Form A & B", "Original Discharge summary", "Bills & Receipt", "Cancelled Cheque"],
      benefits: {
        policy_name: { exact_clause: "Care Health Insurance Policy (Individual & Floater).", page: "Page 1" },
        sum_insured: { exact_clause: "Sum Insured maximum cap is INR 3,00,000 per policy year.", page: "Page 2" },
        room_rent_limit: { exact_clause: "Room Rent limit is capped at 1% of Sum Insured per day (INR 3,00,000/day). Excess room charges are subject to proportionate deduction.", page: "Page 4" },
        icu_limit: { exact_clause: "ICU charges capped at 2% of Sum Insured per day (INR 6,000/day).", page: "Page 4" },
        waiting_periods: [
          { title: "PED Wait", exact_clause: "48 months waiting period for pre-existing medical conditions.", page: "Page 8" }
        ],
        covered_benefits: [
          { title: "In-patient care", exact_clause: "Covered for medical treatments requiring hospitalization for more than 24 hours.", page: "Page 3" }
        ],
        exclusions: [
          { title: "Non-medical consumables", exact_clause: "Gloves, patient gowns, masks, and admission kits are excluded.", page: "Page 11" }
        ]
      }
    });
    await policy5.save();

    const claim5 = new Claim({
      userId: user._id,
      policyId: policy5._id,
      hospitalName: "Medanta The Medicity, Gurgaon",
      admissionDate: new Date("2026-01-05"),
      dischargeDate: new Date("2026-01-08"),
      totalClaimedAmount: 65000,
      estimatedReimbursement: 58000,
      confidenceScore: 92,
      status: "Submitted",
      expenseBreakdown: [
        { description: "Room Rent - Deluxe Suite (3 nights @ 6,000/night)", category: "Room Rent", amount: 18000, coverageStatus: "Possibly Covered", reasoning: "Policy limit for Room Rent is capped at 1% of Sum Insured (INR 3,000/day). Deluxe Room exceeds limit, resulting in INR 9,000 deduction." },
        { description: "Intravenous fluids, medical nursing, and ward care", category: "Doctor Fees", amount: 15000, coverageStatus: "Likely Covered", reasoning: "Nursing fees are covered under in-patient services." },
        { description: "Diagnostics (Platelet counts, Dengue Serology, Liver panel)", category: "Diagnostics", amount: 12000, coverageStatus: "Likely Covered", reasoning: "Required lab tests are fully payable." },
        { description: "Consulting Physician Fees (Dr. A. Verma)", category: "Doctor Fees", amount: 9000, coverageStatus: "Likely Covered", reasoning: "Doctor fees are fully claimable." },
        { description: "Hospital pharmacy medicines & saline sets", category: "Pharmacy", amount: 7000, coverageStatus: "Likely Covered", reasoning: "Pharmacy items are payable." },
        { description: "Gloves, masks, sanitizers, and admission kit", category: "Consumables", amount: 4000, coverageStatus: "Coverage Not Found", reasoning: "Non-medical disposable items are general exclusions." }
      ],
      missingDocuments: [
        "Original blood report showing platelet count trajectory during dengue",
        "Cancelled Cheque of the primary policyholder"
      ],
      submissionChecklist: [
        "Complete Claim Form A.",
        "Get hospital to sign Part-B.",
        "Attach platelet trajectory lab reports.",
        "Mail to Care Health Claims office."
      ],
      emailDraft: "Subject: Dengue Hospitalization Claim - Care Health - POL-CARE-55443322\n\nDear claims team, details for Dengue Fever claim at Medanta, Gurgaon.\n\nSincerely,\nPolicyholder"
    });
    await claim5.save();

    res.status(201).json({ message: 'Success! Seeded 5 policies and 5 claims successfully.', user: user.email });
  } catch (error) {
    console.error('Seeding route error:', error);
    res.status(500).json({ message: 'Server error seeding database', error: error.message });
  }
});

module.exports = router;
