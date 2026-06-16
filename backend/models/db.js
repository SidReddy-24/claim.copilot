const mongoose = require('mongoose');

let isConnected = false;

// Connect to MongoDB function (serverless-friendly)
const connectDB = async (mongoUri) => {
  if (isConnected) {
    console.log('Mongoose is already connected. Reusing connection.');
    return;
  }
  try {
    const conn = await mongoose.connect(mongoUri || 'mongodb://127.0.0.1:27017/claim-assistant');
    isConnected = !!conn.connections[0].readyState;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};



// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Policy Schema
const PolicySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  policyName: { type: String, required: true },
  insurer: { type: String, required: true },
  policyNumber: { type: String, required: true },
  sumInsured: { type: Number, required: true },
  roomRentLimits: { type: String },
  icuLimits: { type: String },
  waitingPeriods: { type: mongoose.Schema.Types.Mixed }, // Structured object of waiting period clauses
  coveredBenefits: [{ type: String }],
  exclusions: [{ type: String }],
  requiredClaimDocuments: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

// Claim Schema
const ClaimSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
  hospitalName: { type: String },
  admissionDate: { type: Date },
  dischargeDate: { type: Date },
  totalClaimedAmount: { type: Number, default: 0 },
  expenseBreakdown: [{
    description: { type: String },
    category: { type: String },
    amount: { type: Number },
    coverageStatus: { type: String, enum: ['Likely Covered', 'Possibly Covered', 'Coverage Not Found'], default: 'Possibly Covered' },
    reasoning: { type: String }
  }],
  estimatedReimbursement: { type: Number, default: 0 },
  confidenceScore: { type: Number, default: 0 }, // 0 to 100
  missingDocuments: [{ type: String }],
  submissionChecklist: [{ type: String }],
  emailDraft: { type: String },
  status: { type: String, enum: ['Draft', 'Submitted'], default: 'Draft' },
  createdAt: { type: Date, default: Date.now }
});

// Document Schema (to log and keep track of uploaded documents)
const DocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', index: true }, // Can be null if uploaded before claim creation, but usually linked to a claim
  fileName: { type: String, required: true },
  fileType: { type: String, enum: ['Policy', 'Bill', 'Discharge Summary', 'Medicine Bill', 'Investigation Report', 'Claim Form', 'Other'], required: true },
  filePath: { type: String, required: true },
  extractedText: { type: String },
  uploadDate: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Policy = mongoose.model('Policy', PolicySchema);
const Claim = mongoose.model('Claim', ClaimSchema);
const Document = mongoose.model('Document', DocumentSchema);

module.exports = {
  connectDB,
  User,
  Policy,
  Claim,
  Document
};
