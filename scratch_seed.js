const mongoose = require('mongoose');
const { connectDB, User, Policy, Claim } = require('./backend/models/db');
require('dotenv').config({ path: './backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://2024siddharthr_db_user:QvWVgqM03h9A7Esk@cluster0.1btrly0.mongodb.net/claim-assistant?retryWrites=true&w=majority';

async function seed() {
  console.log('Connecting to database...');
  await connectDB(MONGO_URI);
  console.log('Connected to MongoDB.');

  // Find the first user in the database or create a default demo user
  let user = await User.findOne().sort({ createdAt: 1 });
  if (!user) {
    console.log('No user found in the database. Creating a default demo user (demo@claimcopilot.com / password123)...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = new User({
      name: "Demo User",
      email: "demo@claimcopilot.com",
      password: hashedPassword
    });
    await user.save();
    console.log(`Created default demo user: ${user.name} (${user.email}) - ID: ${user._id}`);
  } else {
    console.log(`Using existing user: ${user.name} (${user.email}) - ID: ${user._id}`);
  }

  // 1. Policy & Claim 1: Niva Bupa ReAssure 2.0 (Coronary Angioplasty)
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

  // 2. Policy & Claim 2: HDFC Ergo Optima Secure (Knee Replacement)
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

  // 3. Policy & Claim 3: Star Comprehensive Health Insurance (Acute Appendicitis)
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

  // 4. Policy & Claim 4: ICICI Lombard Complete Health (Kidney Stones)
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

  // 5. Policy & Claim 5: Care Health Insurance Plan (Dengue Fever)
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
      room_rent_limit: { exact_clause: "Room Rent limit is capped at 1% of Sum Insured per day (INR 3,000/day). Excess room charges are subject to proportionate deduction.", page: "Page 4" },
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

  console.log('Successfully seeded 5 policies and 5 claims!');
  mongoose.connection.close();
  console.log('Connection closed.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
