const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper to check if API key exists
const isGeminiEnabled = () => {
  return !!process.env.GEMINI_API_KEY;
};

// Initialize Gemini client if key is present
let genAI = null;
if (isGeminiEnabled()) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Common helper to query Gemini
 * @param {string} prompt 
 * @param {boolean} expectJson 
 * @returns {Promise<string|object>}
 */
async function queryGemini(prompt, expectJson = true) {
  if (!isGeminiEnabled()) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: expectJson ? { responseMimeType: 'application/json' } : undefined
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (expectJson) {
      try {
        return JSON.parse(responseText);
      } catch (err) {
        console.error('Failed to parse Gemini response as JSON. Raw text:', responseText);
        // Attempt clean-up or throw
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      }
    }

    return responseText;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

/**
 * 1. Extract Health Insurance Policy details
 */
async function extractPolicyDetails(policyText) {
  if (!isGeminiEnabled()) {
    console.warn('GEMINI_API_KEY missing. Using fallback mock policy extraction.');
    return getMockPolicyExtraction();
  }

  const prompt = `
  You are an expert insurance policy analyzer specializing in Indian health insurance.
  Analyze the following raw text extracted from a health insurance policy PDF and extract the key terms.
  
  You MUST return a JSON object matches this format:
  {
    "policyName": "string",
    "insurer": "string",
    "policyNumber": "string",
    "sumInsured": number,
    "roomRentLimits": "string (details of limit, e.g. Single Private Room, or 1% of Sum Insured, or No Limit)",
    "icuLimits": "string (details of limit, e.g. 2% of Sum Insured or Actuals)",
    "waitingPeriods": {
      "preExistingDiseases": "string",
      "initialWaitingPeriod": "string",
      "specificIllnesses": "string"
    },
    "coveredBenefits": ["string", "string", ...],
    "exclusions": ["string", "string", ...],
    "requiredClaimDocuments": ["string", "string", ...]
  }
  
  Do NOT include any other text outside the JSON object.
  If a detail cannot be found in the text, provide a sensible default or "Not Specified".
  
  Here is the policy text:
  ---
  ${policyText}
  ---
  `;

  return await queryGemini(prompt, true);
}

/**
 * 2. Extract Hospital Document details (Bills, Discharge Summary, etc.)
 */
async function extractMedicalDocumentDetails(documentText, fileType) {
  if (!isGeminiEnabled()) {
    console.warn('GEMINI_API_KEY missing. Using fallback mock medical document extraction.');
    return getMockMedicalDocumentExtraction(fileType);
  }

  const prompt = `
  You are an expert medical billing assistant specializing in Indian hospital bill and discharge document parsing.
  Analyze the following raw text extracted from a medical document (${fileType}) and parse the key values.
  
  You MUST return a JSON object matching this format:
  {
    "hospitalName": "string",
    "admissionDate": "YYYY-MM-DD or null",
    "dischargeDate": "YYYY-MM-DD or null",
    "expenseBreakdown": [
      {
        "description": "string (item description from bill, e.g., Room Rent 3 Days, Pharmacy, Consultation)",
        "category": "string (choose from: Room Rent, ICU, Doctor Fees, OT Charges, Pharmacy, Diagnostics, Consumables, Miscellaneous)",
        "amount": number
      }
    ],
    "totalAmount": number
  }

  Ensure all expenses in the breakdown sum up to approximately the totalAmount. If this document is a discharge summary rather than a bill, list key procedures under expenseBreakdown with amount 0 (or estimate where appropriate) and set totalAmount to 0.

  Do NOT include any other text outside the JSON.
  
  Here is the medical document text:
  ---
  ${documentText}
  ---
  `;

  return await queryGemini(prompt, true);
}

/**
 * 3. Analyze Claim Coverage using Policy details and Claim Document details
 */
async function analyzeClaimCoverage(policyData, claimData) {
  if (!isGeminiEnabled()) {
    console.warn('GEMINI_API_KEY missing. Using fallback mock claim analysis.');
    return getMockClaimAnalysis(policyData, claimData);
  }

  // Convert objects to strings for Gemini prompt
  const policyStr = JSON.stringify(policyData, null, 2);
  const claimStr = JSON.stringify(claimData, null, 2);

  const prompt = `
  You are a health insurance claim auditor copilot for Indian health insurance reimbursement claims.
  Your task is to analyze the user's hospitalization expenses (claim details) against their policy details and determine the estimated reimbursement.
  
  CRITICAL RULES:
  1. You are an AI Claim Copilot and MUST NOT make final insurance decisions.
  2. For EACH expense item in the claim's expenseBreakdown, you must assess its coverage and categorize it using ONLY these terms:
     - "Likely Covered" (if it explicitly matches standard covered benefits and fits under limits)
     - "Possibly Covered" (if coverage is subject to documentation, waiting periods, or partial limits)
     - "Coverage Not Found" (if it falls under exclusions like non-medical consumables, cosmetic treatments, or outside room rent caps)
  3. NEVER use terms like "Claim Approved", "Guaranteed", or "100% Covered".
  4. Perform detailed calculations for estimated reimbursement:
     - Check Room Rent limit. If room rent exceeded the limit, apply proportional deduction if standard in Indian policies (e.g. deduct excess room rent and apply same percentage deduction to associate doctor fees/OT charges if applicable).
     - Exclude non-medical consumables (e.g., gloves, diapers, food, admission fees) which are generally not covered.
     - Provide an overall "estimatedReimbursement" sum.
     - Provide a "confidenceScore" between 0 and 100 representing the certainty of your analysis.
  5. Identify "missingDocuments" that are typically required to support these expenses (e.g., if diagnostics bills are uploaded but lab reports are missing, or pharmacy bills are uploaded but physician prescriptions are missing).
  
  Return a JSON object in this format:
  {
    "hospitalName": "string",
    "admissionDate": "YYYY-MM-DD or null",
    "dischargeDate": "YYYY-MM-DD or null",
    "totalClaimedAmount": number,
    "estimatedReimbursement": number,
    "confidenceScore": number,
    "expenseBreakdown": [
      {
        "description": "string",
        "category": "string",
        "amount": number,
        "coverageStatus": "Likely Covered" | "Possibly Covered" | "Coverage Not Found",
        "reasoning": "string explaining why and any limits applied"
      }
    ],
    "missingDocuments": ["string", "string", ...]
  }
  
  Do NOT include any extra text outside the JSON.
  
  Here are the policy details:
  ---
  ${policyStr}
  ---
  
  Here are the claim details (extracted from hospital files):
  ---
  ${claimStr}
  ---
  `;

  return await queryGemini(prompt, true);
}

/**
 * 4. Generate Claim Submission Package
 */
async function generateClaimPackage(policyData, claimData) {
  if (!isGeminiEnabled()) {
    console.warn('GEMINI_API_KEY missing. Using fallback mock package generator.');
    return getMockClaimPackage(policyData, claimData);
  }

  const policyStr = JSON.stringify(policyData, null, 2);
  const claimStr = JSON.stringify(claimData, null, 2);

  const prompt = `
  You are an expert insurance advisor assisting a user with filing their Indian health insurance reimbursement claim.
  Generate a professional claim submission package based on their policy details and analyzed claim.
  
  You MUST return a JSON object with the following fields:
  {
    "claimSummary": "string summarizing the hospitalization, diagnosis, hospital name, dates, total claimed amount, and estimated eligible reimbursement.",
    "missingDocumentChecklist": ["string listing missing files that must be attached, e.g. prescription for medicines, lab reports, cancelled cheque"],
    "submissionChecklist": ["string list of steps to submit, e.g. print Claim Form A, sign section C, attach bills sequentially, mail to TPA address"],
    "emailDraft": "string containing a polite, professionally formatted email to the insurer/TPA claims department requesting reimbursement, containing policy details, patient name, hospitalization details, claim summary, and a list of attached documents. Leave placeholder for user contact info."
  }
  
  CRITICAL RULES:
  1. DO NOT use terms like "Claim Approved" or "Guaranteed" or "100% Covered".
  2. Maintain a professional tone.
  3. Include a standard disclaimer at the end of the email draft or summary stating: "Please note this is an AI-assisted package preparation. Final claim verification and approval rests solely with the Insurer/TPA."

  Return ONLY JSON. Do not write anything outside the JSON object.
  
  Here are the policy details:
  ---
  ${policyStr}
  ---
  
  Here are the analyzed claim details:
  ---
  ${claimStr}
  ---
  `;

  return await queryGemini(prompt, true);
}

// ==========================================
// MOCK FALLBACK IMPLEMENTATIONS FOR TESTING
// ==========================================

function getMockPolicyExtraction() {
  return {
    policyName: "Care Supreme Health Plan",
    insurer: "Care Health Insurance Ltd",
    policyNumber: "POL-CHI-9988223",
    sumInsured: 700000,
    roomRentLimits: "Single Private A/C Room up to actuals, no sub-limit",
    icuLimits: "No sub-limits, actual expenses covered",
    waitingPeriods: {
      preExistingDiseases: "36 months waiting period for pre-existing illnesses",
      initialWaitingPeriod: "30 days waiting period (except accidents)",
      specificIllnesses: "24 months waiting period for specific ailments like cataract, hernia, sinusitis"
    },
    coveredBenefits: [
      "In-patient Hospitalization expenses",
      "Day Care treatments",
      "Pre-hospitalization medical expenses up to 60 days",
      "Post-hospitalization medical expenses up to 90 days",
      "Alternative Treatments (AYUSH) covered up to sum insured",
      "Organ Donor Expenses"
    ],
    exclusions: [
      "Cosmetic, aesthetic or plastic surgery unless following an accident",
      "Treatment for substance abuse, alcoholism or drug addiction",
      "Dietary supplements and non-medical consumables (e.g. gloves, sanitizers, gowns) unless part of treatment",
      "Self-inflicted injuries or suicide attempts"
    ],
    requiredClaimDocuments: [
      "Duly completed Claim Form A (and B if applicable)",
      "Original Discharge Summary with detail of diagnosis",
      "Original Hospital Final Bill with itemized breakup",
      "Payment Receipt from hospital with stamp and signature",
      "Pharmacy bills and corresponding doctor prescriptions",
      "Diagnostic test bills and original lab reports",
      "Cancelled cheque of the primary policyholder for bank details"
    ]
  };
}

function getMockMedicalDocumentExtraction(fileType) {
  if (fileType === 'Discharge Summary') {
    return {
      hospitalName: "Fortis Hospital, Mumbai",
      admissionDate: "2026-05-12",
      dischargeDate: "2026-05-15",
      expenseBreakdown: [
        { description: "Patient admitted with acute abdominal pain. Diagnosis: Acute Calculous Cholecystitis. Procedure: Laparoscopic Cholecystectomy.", category: "OT Charges", amount: 0 }
      ],
      totalAmount: 0
    };
  }

  // Default is a Bill
  return {
    hospitalName: "Fortis Hospital, Mumbai",
    admissionDate: "2026-05-12",
    dischargeDate: "2026-05-15",
    expenseBreakdown: [
      { description: "Room Rent - Single Private AC (3 nights @ 8,000/night)", category: "Room Rent", amount: 24000 },
      { description: "Surgeon Consultation Fees (Dr. A. Mehta)", category: "Doctor Fees", amount: 15000 },
      { description: "OT Charges and Surgical Consumables", category: "OT Charges", amount: 45000 },
      { description: "Pharmacy Medicines (Intravenous Antibiotics, pain relief)", category: "Pharmacy", amount: 18000 },
      { description: "Diagnostics (Ultrasound Abdomen, Blood counts, ECG)", category: "Diagnostics", amount: 9500 },
      { description: "Admission kit, diapers, and food charges", category: "Consumables", amount: 3500 },
      { description: "Administrative charges & registration fee", category: "Miscellaneous", amount: 2000 }
    ],
    totalAmount: 117000
  };
}

function getMockClaimAnalysis(policy, claim) {
  const totalClaimed = claim.totalClaimedAmount || 117000;
  
  // Calculate mock reimbursement
  // Exclude consumables (3500) and miscellaneous admin fees (2000)
  // Let's assume Room Rent is fully covered since no limit.
  const estimatedReimbursement = totalClaimed - 5500; 

  const breakdown = (claim.expenseBreakdown && claim.expenseBreakdown.length > 0) 
    ? claim.expenseBreakdown.map(item => {
        let status = "Likely Covered";
        let reasoning = "Fully covered under policy benefits.";
        
        if (item.category === "Consumables") {
          status = "Coverage Not Found";
          reasoning = "Non-medical consumables like admission kits and food are standard policy exclusions in IRDAI guidelines.";
        } else if (item.category === "Miscellaneous") {
          status = "Coverage Not Found";
          reasoning = "Administrative and registration fees are general administrative overheads and not payable.";
        } else if (item.category === "Pharmacy") {
          status = "Possibly Covered";
          reasoning = "Pharmacy expenses are claimable subject to submitting original bills and matching doctor prescriptions.";
        } else if (item.category === "Room Rent") {
          status = "Likely Covered";
          reasoning = `Room Rent is fully covered. Actual rent is INR ${item.amount / 3}/day, which is within the policy's Single Private Room allowance.`;
        }

        return {
          description: item.description,
          category: item.category,
          amount: item.amount,
          coverageStatus: status,
          reasoning: reasoning
        };
      })
    : [];

  return {
    hospitalName: claim.hospitalName || "Fortis Hospital, Mumbai",
    admissionDate: claim.admissionDate || "2026-05-12",
    dischargeDate: claim.dischargeDate || "2026-05-15",
    totalClaimedAmount: totalClaimed,
    estimatedReimbursement: estimatedReimbursement,
    confidenceScore: 92,
    expenseBreakdown: breakdown,
    missingDocuments: [
      "Original medical prescription signed by Dr. A. Mehta detailing the pharmacy items",
      "Ultrasound abdomen scan print report matching the diagnostic charges of INR 9,500"
    ]
  };
}

function getMockClaimPackage(policy, claim) {
  const policyNum = policy.policyNumber || "POL-CHI-9988223";
  const insurer = policy.insurer || "Care Health Insurance Ltd";
  const hospital = claim.hospitalName || "Fortis Hospital, Mumbai";
  const claimed = claim.totalClaimedAmount || 117000;
  const estimated = claim.estimatedReimbursement || 111500;
  
  return {
    claimSummary: `Reimbursement request for patient hospitalization at ${hospital} from ${claim.admissionDate || "2026-05-12"} to ${claim.dischargeDate || "2026-05-15"}. The admission was for Acute Calculous Cholecystitis, and the patient underwent a Laparoscopic Cholecystectomy. The total billed expense is INR ${claimed}, with an AI-estimated eligible reimbursement of INR ${estimated} after accounting for standard exclusions.`,
    missingDocumentChecklist: [
      "Official ultrasound report copy (currently only the bill is attached)",
      "Prescription from the attending doctor (Dr. A. Mehta) for pharmacy charges worth INR 18,000"
    ],
    submissionChecklist: [
      "Download, fill, and sign Claim Form Part-A (Policyholder details) and Part-B (Hospital details).",
      "Compile the original Discharge Summary signed by Dr. Mehta.",
      "Arrange the final detailed hospital bill in chronological order followed by payment receipt with official seal.",
      "Attach all pharmacy bills with their respective physician prescriptions.",
      "Attach diagnostic reports (Ultrasound scan copy, ECG reports, Blood report).",
      "Provide a cancelled cheque of the primary policyholder's bank account with IFSC code.",
      "Send all documents via Speed Post or Courier to the nearest Care Health Insurance TPA processing center."
    ],
    emailDraft: `Subject: Reimbursement Claim Submission - Policy No: ${policyNum} - Patient: [Patient Name]

Dear Claims Department,

I am writing to submit a health insurance reimbursement claim for the hospitalization of [Patient Name] at ${hospital}.

Hospitalization Period: ${claim.admissionDate || "2026-05-12"} to ${claim.dischargeDate || "2026-05-15"}
Diagnosis: Acute Calculous Cholecystitis (Laparoscopic Cholecystectomy)
Total Claimed Amount: INR ${claimed}
Policy Number: ${policyNum}
Insurer: ${insurer}

I have compiled all the required documentation as per my policy details. Please find attached the digital copies of the following documents:
1. Duly filled and signed Claim Form A & B
2. Original Hospital Bill & Payment Receipt
3. Original Discharge Summary
4. Prescriptions & Pharmacy Invoices
5. Lab & Diagnostic Reports
6. Cancelled Cheque (for NEFT reimbursement)

Please review the claim and initiate the settlement process. I will also be sending the physical originals to your TPA office via speed post.

Sincerely,
[Policyholder Name]
Contact: [Mobile Number]
Email: [Email Address]

---
Please note this is an AI-assisted package preparation. Final claim verification and approval rests solely with the Insurer/TPA.`
  };
}

module.exports = {
  extractPolicyDetails,
  extractMedicalDocumentDetails,
  analyzeClaimCoverage,
  generateClaimPackage
};
