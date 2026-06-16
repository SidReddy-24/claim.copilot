const { connectDB, User, Policy, Claim } = require('../backend/models/db');
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

let MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI && MONGO_URI.includes('claim-assistant')) {
  MONGO_URI = MONGO_URI.replace('claim-assistant', 'test');
}

async function reseed() {
  await connectDB(MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  // List all users
  const users = await User.find({});
  console.log('\nAll users in DB:');
  users.forEach((u, i) => console.log(`  ${i + 1}. ${u.name} <${u.email}> (${u._id})`));

  // Target the real user (not the demo one we created by accident)
  const targetUser = users.find(u => u.email !== 'demo@claimcopilot.com');
  if (!targetUser) {
    console.error('No non-demo user found. Please sign up on the app first.');
    process.exit(1);
  }
  console.log(`\nSeeding for: ${targetUser.name} <${targetUser.email}> (${targetUser._id})`);

  // Check existing seeds to avoid duplicates
  const existingSeed = await Policy.findOne({ userId: targetUser._id, policyName: "Niva Bupa ReAssure 2.0" });
  if (existingSeed) {
    console.log('Already seeded for this user! Checking count...');
    const count = await Policy.countDocuments({ userId: targetUser._id });
    console.log(`Total policies for ${targetUser.email}: ${count}`);
    await mongoose.connection.close();
    return;
  }

  // ── SEED 1: Niva Bupa ──────────────────────────────────────────────
  const policy1 = new Policy({
    userId: targetUser._id,
    policyName: "Niva Bupa ReAssure 2.0",
    insurer: "Niva Bupa Health Insurance Co.",
    policyNumber: "POL-NB-44889922",
    sumInsured: 1000000,
    roomRentLimits: "Single Private A/C Room, up to actuals",
    icuLimits: "No limit, covered up to actual expenses",
    waitingPeriods: { preExistingDiseases: "36 months", initialWaitingPeriod: "30 days", specificIllnesses: "24 months" },
    coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization (60/180 days)", "Organ Donor Expenses", "AYUSH"],
    exclusions: ["Cosmetic Surgery", "Substance abuse", "Non-medical accessories"],
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
      covered_benefits: [{ title: "In-patient Care", exact_clause: "In-patient care expenses including boarding, medical practitioner fees, surgery charges covered.", page: "Page 3" }],
      exclusions: [{ title: "Cosmetic Surgery", exact_clause: "Cosmetic surgery or reconstructive surgery excluded unless due to accident.", page: "Page 9" }]
    }
  });
  await policy1.save();

  const claim1 = new Claim({
    userId: targetUser._id,
    policyId: policy1._id,
    hospitalName: "Max Super Speciality Hospital, Delhi",
    admissionDate: new Date("2026-05-10"),
    dischargeDate: new Date("2026-05-13"),
    totalClaimedAmount: 280000,
    estimatedReimbursement: 265000,
    confidenceScore: 95,
    status: "Submitted",
    expenseBreakdown: [
      { description: "Room Rent - Single Private AC (3 nights @ ₹9,000/night)", category: "Room Rent", amount: 27000, coverageStatus: "Likely Covered", reasoning: "Room charges match policy allowance for Single Private AC Room." },
      { description: "Coronary Angioplasty Surgical Procedure & Consumables", category: "OT Charges", amount: 180000, coverageStatus: "Likely Covered", reasoning: "Surgical intervention is standard covered benefit." },
      { description: "Consultant Cardiologist Fees (Dr. S. Sharma)", category: "Doctor Fees", amount: 35000, coverageStatus: "Likely Covered", reasoning: "Doctor fees are fully claimable under surgical care." },
      { description: "Hospitalization Medicines & Pharmacy", category: "Pharmacy", amount: 23000, coverageStatus: "Possibly Covered", reasoning: "Covered subject to original pharmacy bills and doctor prescription." },
      { description: "Surgical Angioplasty Stent & Accessories", category: "Consumables", amount: 10000, coverageStatus: "Likely Covered", reasoning: "Implants and active surgery accessories are payable." },
      { description: "Admission Kit, Patient toiletries and food charges", category: "Consumables", amount: 5000, coverageStatus: "Coverage Not Found", reasoning: "Non-medical consumables like toiletries are general exclusions." }
    ],
    missingDocuments: ["Original ECG and Cardiac stress report matching diagnostic records", "Cancelled Cheque of the primary policyholder for NEFT transfer"],
    submissionChecklist: ["Fill and sign Claim Form Part-A.", "Get hospital desk to sign and stamp Claim Form Part-B.", "Attach original discharge summary signed by Dr. Sharma.", "Mail compiled set to Niva Bupa TPA claims department."],
    emailDraft: "Subject: Claim Reimbursement Request - Niva Bupa - Pol: POL-NB-44889922\n\nDear Claims Team,\n\nI am writing to submit my reimbursement claim for Coronary Angioplasty treatment at Max Super Speciality Hospital, Delhi (Admission: 10-May-2026 to 13-May-2026).\n\nKindly find all supporting documents enclosed including the discharge summary, itemized bill, and diagnostic reports.\n\nTotal Claimed Amount: ₹2,80,000\nEstimated Eligible Reimbursement: ₹2,65,000\n\nSincerely,\n${targetUser.name}\nPolicy No: POL-NB-44889922"
  });
  await claim1.save();
  console.log('✅ Seeded: Niva Bupa (Coronary Angioplasty)');

  // ── SEED 2: HDFC Ergo ──────────────────────────────────────────────
  const policy2 = new Policy({
    userId: targetUser._id,
    policyName: "HDFC Ergo Optima Secure",
    insurer: "HDFC Ergo General Insurance Co.",
    policyNumber: "POL-HE-11223344",
    sumInsured: 500000,
    roomRentLimits: "Single Private A/C Room, up to actuals",
    icuLimits: "Actual expenses, no sub-limit",
    waitingPeriods: { preExistingDiseases: "36 months", initialWaitingPeriod: "30 days", specificIllnesses: "24 months" },
    coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization (60/180 days)", "Domiciliary Hospitalization", "Air Ambulance"],
    exclusions: ["Cosmetic treatments", "Self-inflicted injury", "Unproven treatments"],
    requiredClaimDocuments: ["Claim Form A & B", "Original Discharge Summary", "Final Bill with breakups", "Payment Receipt", "Lab Reports", "Cancelled Cheque"],
    benefits: {
      policy_name: { exact_clause: "HDFC Ergo Optima Secure Individual / Family Floater Policy.", page: "Page 1" },
      sum_insured: { exact_clause: "Sum Insured limit is capped at INR 5,00,000 per policy term.", page: "Page 2" },
      room_rent_limit: { exact_clause: "Eligible for Single Private A/C Room. Proportionate deductions apply if higher room is selected.", page: "Page 4" },
      icu_limit: { exact_clause: "ICU charges covered up to actual expenses with no sub-limits.", page: "Page 4" },
      waiting_periods: [{ title: "PED Waiting Period", exact_clause: "Coverage for Pre-existing illnesses starts after 36 months of continuous renewals.", page: "Page 8" }],
      covered_benefits: [{ title: "Joint Replacement", exact_clause: "Surgical replacement of knee joints is covered under major surgeries list.", page: "Page 6" }],
      exclusions: [{ title: "Administrative Charges", exact_clause: "General administration, registration, and file handling fees are excluded.", page: "Page 12" }]
    }
  });
  await policy2.save();

  const claim2 = new Claim({
    userId: targetUser._id,
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
      { description: "Room Rent - Single Private AC (3 nights @ ₹4,000/night)", category: "Room Rent", amount: 12000, coverageStatus: "Likely Covered", reasoning: "Room charges match Single Private AC room allowance." },
      { description: "Administrative charges & registration fee", category: "Miscellaneous", amount: 8000, coverageStatus: "Coverage Not Found", reasoning: "Registration and file maintenance charges are standard exclusions." }
    ],
    missingDocuments: ["Original X-Ray reports and knee implant barcode sticker invoice", "Cancelled Cheque of the primary policyholder"],
    submissionChecklist: ["Compile Claim Form A & B.", "Get doctor signature on Part-B.", "Attach knee implant barcode stickers.", "Submit to HDFC Ergo TPA desk."],
    emailDraft: "Subject: Claim Submission - HDFC Ergo Optima Secure - Pol: POL-HE-11223344\n\nDear Claims Team,\n\nPlease find attached the documents for my Knee Replacement Surgery at Apollo Hospitals, Bangalore (15-Apr-2026 to 18-Apr-2026).\n\nTotal Claimed Amount: ₹3,50,000\nEstimated Eligible Reimbursement: ₹3,42,000\n\nSincerely,\n${targetUser.name}\nPolicy No: POL-HE-11223344"
  });
  await claim2.save();
  console.log('✅ Seeded: HDFC Ergo (Knee Replacement)');

  // ── SEED 3: Star Health ────────────────────────────────────────────
  const policy3 = new Policy({
    userId: targetUser._id,
    policyName: "Star Comprehensive Health Insurance",
    insurer: "Star Health & Allied Insurance Co. Ltd.",
    policyNumber: "POL-STAR-77665544",
    sumInsured: 500000,
    roomRentLimits: "Single Private A/C Room up to actuals, no sub-limit",
    icuLimits: "No sub-limits, actual expenses covered",
    waitingPeriods: { preExistingDiseases: "36 months", initialWaitingPeriod: "30 days", specificIllnesses: "24 months" },
    coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization", "Road Ambulance", "AYUSH Treatments"],
    exclusions: ["Cosmetic surgeries", "Substance abuse treatment", "Non-medical consumables"],
    requiredClaimDocuments: ["Claim Form A & B", "Original Discharge Summary", "Hospital Bills", "Receipt", "Cancelled Cheque"],
    benefits: {
      policy_name: { exact_clause: "Star Comprehensive Health Insurance Policy (Individual & Floater).", page: "Page 1" },
      sum_insured: { exact_clause: "The Maximum Limit of Indemnity under this policy shall be the Sum Insured of INR 5,00,000.", page: "Page 2" },
      room_rent_limit: { exact_clause: "Room Rent up to Single Private A/C Room. No sub-limit caps apply.", page: "Page 4" },
      icu_limit: { exact_clause: "ICU charges covered up to actual expenses.", page: "Page 4" },
      waiting_periods: [{ title: "PED Wait Time", exact_clause: "36 months waiting period for pre-existing conditions.", page: "Page 7" }],
      covered_benefits: [{ title: "Appendectomy", exact_clause: "Laparoscopic procedures for appendicitis covered under emergency surgical list.", page: "Page 3" }],
      exclusions: [{ title: "Non-medical Consumables", exact_clause: "Consumables like surgical gloves, gowns, sanitizers are excluded.", page: "Page 11" }]
    }
  });
  await policy3.save();

  const claim3 = new Claim({
    userId: targetUser._id,
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
      { description: "Room Rent - Single Private AC (2 nights @ ₹5,000/night)", category: "Room Rent", amount: 10000, coverageStatus: "Likely Covered", reasoning: "Matches Single Private AC room limits." },
      { description: "Pharmacy / Injection charges during surgery", category: "Pharmacy", amount: 9000, coverageStatus: "Likely Covered", reasoning: "In-patient pharmacy expenses are payable." },
      { description: "Surgical consumables, gloves, gowns & sanitizers", category: "Consumables", amount: 8000, coverageStatus: "Coverage Not Found", reasoning: "Surgical gloves and disposable items are non-payable consumables under Star Health rules." }
    ],
    missingDocuments: ["Original diagnostic ultrasound report confirming Acute Appendicitis", "Cancelled Cheque of the primary policyholder"],
    submissionChecklist: ["Complete Claim Form A.", "Get hospital stamp on Claim Form B.", "Attach original bills and receipts.", "Courier to Star Health Claims office."],
    emailDraft: "Subject: Appendectomy Claim Submission - Star Health - Pol: POL-STAR-77665544\n\nDear Claims Team,\n\nI am submitting my reimbursement claim for emergency Laparoscopic Appendectomy at Fortis Hospital, Chennai (12-Mar-2026 to 14-Mar-2026).\n\nTotal Claimed Amount: ₹1,20,000\nEstimated Eligible Reimbursement: ₹1,12,000\n\nSincerely,\n${targetUser.name}\nPolicy No: POL-STAR-77665544"
  });
  await claim3.save();
  console.log('✅ Seeded: Star Health (Acute Appendicitis)');

  // ── SEED 4: ICICI Lombard ──────────────────────────────────────────
  const policy4 = new Policy({
    userId: targetUser._id,
    policyName: "ICICI Lombard Complete Health",
    insurer: "ICICI Lombard General Insurance Co.",
    policyNumber: "POL-IL-88776655",
    sumInsured: 300000,
    roomRentLimits: "Single Private A/C Room up to actuals",
    icuLimits: "No sub-limits, actual expenses covered",
    waitingPeriods: { preExistingDiseases: "36 months", initialWaitingPeriod: "30 days", specificIllnesses: "24 months" },
    coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization", "Donor Expenses", "Wellness rewards"],
    exclusions: ["Cosmetic treatment", "Alternative therapies unless specified", "Standard consumables"],
    requiredClaimDocuments: ["Claim Form A & B", "Discharge summary", "Bills & breakups", "Lab report", "Cheque copy"],
    benefits: {
      policy_name: { exact_clause: "ICICI Lombard Complete Health Individual Plan.", page: "Page 1" },
      sum_insured: { exact_clause: "Maximum Sum Insured limit is INR 3,00,000 per policy year.", page: "Page 2" },
      room_rent_limit: { exact_clause: "Room charges eligible up to Single Private AC Room. No sub-limit caps apply.", page: "Page 4" },
      icu_limit: { exact_clause: "ICU charges covered up to actual expenses.", page: "Page 4" },
      waiting_periods: [{ title: "PED Wait", exact_clause: "Pre-existing diseases covered after 36 months of continuous cover.", page: "Page 7" }],
      covered_benefits: [{ title: "Lithotripsy", exact_clause: "Lithotripsy treatment for kidney stone removal is covered under day care/hospitalization benefits.", page: "Page 3" }],
      exclusions: [{ title: "Toiletries and Convenience Items", exact_clause: "Toiletries, hand sanitizers, masks, and convenience kits are excluded.", page: "Page 11" }]
    }
  });
  await policy4.save();

  const claim4 = new Claim({
    userId: targetUser._id,
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
      { description: "Consultant Urologist fees (Dr. V. Patel)", category: "Doctor Fees", amount: 15000, coverageStatus: "Likely Covered", reasoning: "Doctor fee fully claimable." },
      { description: "Room Rent - Single Private AC (1 night @ ₹6,500/night)", category: "Room Rent", amount: 6500, coverageStatus: "Likely Covered", reasoning: "Room charges match policy guidelines." },
      { description: "Diagnostics (Ultrasound, Renal panel, Urinalysis)", category: "Diagnostics", amount: 8000, coverageStatus: "Likely Covered", reasoning: "Required pre-surgery diagnostics are payable." },
      { description: "Registration kit, masks, and admission toiletries", category: "Consumables", amount: 3500, coverageStatus: "Coverage Not Found", reasoning: "Non-medical kits and toiletries are general exclusions." }
    ],
    missingDocuments: ["Original CT KUB print report confirming stone removal", "Cancelled Cheque of the primary policyholder"],
    submissionChecklist: ["Complete Claim Form A.", "Request hospital billing desk to complete Claim Form B.", "Attach CT KUB report and billing invoices.", "Send to ICICI Lombard Claims Desk."],
    emailDraft: "Subject: Lithotripsy Claim Submission - ICICI Lombard - Pol: POL-IL-88776655\n\nDear Claims Team,\n\nI am submitting a reimbursement claim for Kidney Stone Lithotripsy at Kokilaben Hospital, Mumbai (20-Feb-2026 to 21-Feb-2026).\n\nTotal Claimed Amount: ₹95,000\nEstimated Eligible Reimbursement: ₹91,500\n\nSincerely,\n${targetUser.name}\nPolicy No: POL-IL-88776655"
  });
  await claim4.save();
  console.log('✅ Seeded: ICICI Lombard (Kidney Stones / Lithotripsy)');

  // ── SEED 5: Care Health ────────────────────────────────────────────
  const policy5 = new Policy({
    userId: targetUser._id,
    policyName: "Care Health Insurance Plan",
    insurer: "Care Health Insurance Ltd.",
    policyNumber: "POL-CARE-55443322",
    sumInsured: 300000,
    roomRentLimits: "Single Private Room capped at 1% of Sum Insured per day (₹3,000/day)",
    icuLimits: "ICU charges capped at 2% of Sum Insured per day (₹6,000/day)",
    waitingPeriods: { preExistingDiseases: "48 months", initialWaitingPeriod: "30 days", specificIllnesses: "24 months" },
    coveredBenefits: ["In-patient Hospitalization", "Pre-post Hospitalization", "Alternative Treatment (AYUSH)"],
    exclusions: ["Cosmetic surgery", "Self-inflicted injury", "Non-medical consumables"],
    requiredClaimDocuments: ["Claim Form A & B", "Original Discharge summary", "Bills & Receipt", "Cancelled Cheque"],
    benefits: {
      policy_name: { exact_clause: "Care Health Insurance Policy (Individual & Floater).", page: "Page 1" },
      sum_insured: { exact_clause: "Sum Insured maximum cap is INR 3,00,000 per policy year.", page: "Page 2" },
      room_rent_limit: { exact_clause: "Room Rent limit is capped at 1% of Sum Insured per day (INR 3,000/day). Excess room charges are subject to proportionate deduction.", page: "Page 4" },
      icu_limit: { exact_clause: "ICU charges capped at 2% of Sum Insured per day (INR 6,000/day).", page: "Page 4" },
      waiting_periods: [{ title: "PED Wait", exact_clause: "48 months waiting period for pre-existing medical conditions.", page: "Page 8" }],
      covered_benefits: [{ title: "In-patient Care", exact_clause: "Covered for medical treatments requiring hospitalization for more than 24 hours.", page: "Page 3" }],
      exclusions: [{ title: "Non-medical Consumables", exact_clause: "Gloves, patient gowns, masks, and admission kits are excluded.", page: "Page 11" }]
    }
  });
  await policy5.save();

  const claim5 = new Claim({
    userId: targetUser._id,
    policyId: policy5._id,
    hospitalName: "Medanta The Medicity, Gurgaon",
    admissionDate: new Date("2026-01-05"),
    dischargeDate: new Date("2026-01-08"),
    totalClaimedAmount: 65000,
    estimatedReimbursement: 58000,
    confidenceScore: 92,
    status: "Submitted",
    expenseBreakdown: [
      { description: "Room Rent - Deluxe Suite (3 nights @ ₹6,000/night)", category: "Room Rent", amount: 18000, coverageStatus: "Possibly Covered", reasoning: "Policy caps room rent at ₹3,000/day. Deluxe room exceeds limit — ₹9,000 deduction applied proportionately." },
      { description: "Intravenous fluids, nursing and ward care", category: "Doctor Fees", amount: 15000, coverageStatus: "Likely Covered", reasoning: "Nursing fees are covered under in-patient services." },
      { description: "Diagnostics (Platelet counts, Dengue Serology, Liver panel)", category: "Diagnostics", amount: 12000, coverageStatus: "Likely Covered", reasoning: "Required lab tests are fully payable." },
      { description: "Consulting Physician Fees (Dr. A. Verma)", category: "Doctor Fees", amount: 9000, coverageStatus: "Likely Covered", reasoning: "Doctor fees are fully claimable." },
      { description: "Hospital pharmacy medicines & saline sets", category: "Pharmacy", amount: 7000, coverageStatus: "Likely Covered", reasoning: "Pharmacy items are payable." },
      { description: "Gloves, masks, sanitizers, and admission kit", category: "Consumables", amount: 4000, coverageStatus: "Coverage Not Found", reasoning: "Non-medical disposable items are general exclusions." }
    ],
    missingDocuments: ["Original blood report showing platelet count trajectory during dengue", "Cancelled Cheque of the primary policyholder"],
    submissionChecklist: ["Complete Claim Form A.", "Get hospital to sign Part-B.", "Attach platelet trajectory lab reports.", "Mail to Care Health Claims office."],
    emailDraft: "Subject: Dengue Hospitalization Claim - Care Health - Pol: POL-CARE-55443322\n\nDear Claims Team,\n\nI am submitting my reimbursement claim for Dengue Fever hospitalization at Medanta The Medicity, Gurgaon (05-Jan-2026 to 08-Jan-2026).\n\nTotal Claimed Amount: ₹65,000\nEstimated Eligible Reimbursement: ₹58,000\nNote: Room deduction applied as Deluxe Room exceeds ₹3,000/day policy cap.\n\nSincerely,\n${targetUser.name}\nPolicy No: POL-CARE-55443322"
  });
  await claim5.save();
  console.log('✅ Seeded: Care Health (Dengue Fever)');

  console.log(`\n🎉 Done! Seeded 5 policies and 5 fully audited claims for: ${targetUser.name} <${targetUser.email}>`);

  // Final counts
  const finalPolicies = await Policy.countDocuments({ userId: targetUser._id });
  const finalClaims = await Claim.countDocuments({ userId: targetUser._id });
  console.log(`📊 Total policies for user: ${finalPolicies}`);
  console.log(`📊 Total claims for user: ${finalClaims}`);

  await mongoose.connection.close();
  console.log('Connection closed.');
}

reseed().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
