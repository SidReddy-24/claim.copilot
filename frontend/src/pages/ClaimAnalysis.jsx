import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Info, 
  ArrowRight, ShieldCheck, Calendar, AlertCircle, BookOpen,
  Coins, BedDouble, ShieldAlert
} from 'lucide-react';

const ClaimAnalysis = () => {
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claimId');
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [packaging, setPackaging] = useState(false);
  const [activeTab, setActiveTab] = useState('audit');

  const fallbackBenefits = {
    policy_name: {
      exact_clause: "Star Comprehensive Health Insurance Policy (Individual & Floater)",
      page: "Page 1"
    },
    sum_insured: {
      exact_clause: "The Maximum Limit of Indemnity under this policy shall be the Sum Insured of INR 5,00,000 per policy year.",
      page: "Page 2"
    },
    room_rent_limit: {
      exact_clause: "Room Rent, boarding, nursing expenses as provided by the Hospital / Nursing Home up to Single Private A/C Room.",
      page: "Page 4"
    },
    icu_limit: {
      exact_clause: "Intensive Care Unit (ICU) / Intensive Cardiac Care Unit (ICCU) charges are covered up to actuals.",
      page: "Page 4"
    },
    waiting_periods: [
      {
        title: "Pre-Existing Diseases",
        exact_clause: "Expenses related to the treatment of a Pre-Existing Disease (PED) and its direct complications shall be excluded until the expiry of 36 months of continuous coverage.",
        page: "Page 7"
      },
      {
        title: "Initial Waiting Period",
        exact_clause: "Expenses related to the treatment of any illness within 30 days from the first policy commencement date shall be excluded except for accidental injuries.",
        page: "Page 7"
      },
      {
        title: "Specific Ailments",
        exact_clause: "A waiting period of 24 months shall apply to specific illnesses like Cataract, Hernia, Hysterectomy, and joint replacement surgeries.",
        page: "Page 8"
      }
    ],
    covered_benefits: [
      {
        title: "In-patient Hospitalization",
        exact_clause: "Room, Boarding, and Nursing Expenses, Surgeon, Anesthetist, Medical Practitioner, Consultants, Specialist Fees, Anesthesia, Blood, Oxygen, Operation Theatre charges, medicines.",
        page: "Page 3"
      },
      {
        title: "Road Ambulance",
        exact_clause: "Emergency road ambulance expenses are covered up to INR 2,000 per hospitalization.",
        page: "Page 5"
      },
      {
        title: "Cataract Treatment",
        exact_clause: "Cataract treatment expenses are covered up to INR 30,000 per eye or actuals, whichever is lower.",
        page: "Page 5"
      }
    ],
    exclusions: [
      {
        title: "Cosmetic & Plastic Surgery",
        exact_clause: "Expenses for cosmetic or aesthetic treatments, plastic surgery, or reconstructive surgery are excluded unless essential due to accident or cancer.",
        page: "Page 11"
      },
      {
        title: "Substance Abuse",
        exact_clause: "Treatment costs resulting from or related to abuse of alcohol, drugs, or other addictive substances are excluded.",
        page: "Page 12"
      },
      {
        title: "Non-Prescription Consumables",
        exact_clause: "Non-medical item expenses, toiletries, cosmetics, and other personal convenience items are excluded from claim eligibility.",
        page: "Page 14"
      }
    ]
  };

  useEffect(() => {
    if (claimId) {
      fetchAnalysis();
    } else {
      navigate('/dashboard');
    }
  }, [claimId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/claim/result?claimId=${claimId}`);
      setClaim(res.data);
    } catch (err) {
      console.error(err);
      const backendErr = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(backendErr);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePackage = async () => {
    setPackaging(true);
    try {
      await api.post('/claim/package', { claimId });
      navigate(`/claim-package?claimId=${claimId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to compile submission checklist. Verify server connectivity.');
    } finally {
      setPackaging(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Likely Covered':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold neu-badge-green">
            <CheckCircle2 size={12} />
            <span>Likely Covered</span>
          </span>
        );
      case 'Possibly Covered':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold neu-badge-amber">
            <AlertTriangle size={12} />
            <span>Possibly Covered</span>
          </span>
        );
      case 'Coverage Not Found':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold neu-badge-rose">
            <XCircle size={12} />
            <span>Coverage Not Found</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-500">
            Pending Audit
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-4 min-h-[50vh] bg-[#e6eef8]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="text-xs text-slate-500 font-bold">Loading AI Claim Audit results...</span>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4 bg-[#e6eef8]">
        <AlertCircle size={40} className="mx-auto text-rose-500" />
        <h3 className="text-base font-extrabold text-slate-800">Analysis Data Unavailable</h3>
        <p className="text-xs text-slate-500 font-bold">{error || 'Claim data could not be parsed.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2.5 neu-btn rounded-xl text-xs font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const potentialDeductions = claim.totalClaimedAmount - claim.estimatedReimbursement;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-[#e6eef8]">
      {/* Navigation */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors duration-200 font-bold text-xs"
      >
        <ArrowLeft size={14} />
        <span>Back to Dashboard</span>
      </button>

      {/* Hospitalization Overview header */}
      <div className="neu-flat p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase">Claims Copilot Analysis</span>
            <h1 className="text-2xl font-black text-slate-800">{claim.hospitalName || 'Hospitalization Claim'}</h1>
            <div className="flex items-center space-x-4 text-xs text-slate-550 mt-2 font-bold">
              <span className="flex items-center space-x-1 text-slate-600">
                <Calendar size={13} className="text-slate-400" />
                <span>
                  {claim.admissionDate ? new Date(claim.admissionDate).toLocaleDateString('en-IN') : 'N/A'} to{' '}
                  {claim.dischargeDate ? new Date(claim.dischargeDate).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </span>
              <span>•</span>
              <span className="bg-[#dbe4f2] text-slate-600 px-2.5 py-0.5 rounded text-[10px] border border-slate-200/50">
                ID: {claim.claimId.substring(claim.claimId.length - 8).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Claims Status</span>
            <span className="text-[10px] font-bold bg-[#e6eef8] text-blue-700 border border-blue-200/50 px-2.5 py-1 rounded-full mt-1.5 neu-card">
              Copilot Audited
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Est payout */}
        <div className="neu-card p-5 rounded-2xl relative border-t-4 border-emerald-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Eligible Reimbursement</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            ₹{claim.estimatedReimbursement.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 font-bold mt-2">
            Estimated payout from Sum Insured (₹{claim.totalClaimedAmount.toLocaleString('en-IN')} billed)
          </p>
        </div>

        {/* Deductions */}
        <div className="neu-card p-5 rounded-2xl relative border-t-4 border-rose-400">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Excluded / Deductible</p>
          <p className="text-3xl font-black text-rose-500 mt-2">
            ₹{potentialDeductions.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 font-bold mt-2">
            Non-medical consumables, registration caps, and room margins
          </p>
        </div>

        {/* Confidence score */}
        <div className="neu-card p-5 rounded-2xl relative border-t-4 border-blue-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Copilot Confidence Score</p>
          <div className="flex items-center space-x-3 mt-2">
            <p className="text-3xl font-black text-slate-800">{claim.confidenceScore}%</p>
            <div className="flex-1 bg-[#e6eef8] h-2 rounded-full overflow-hidden neu-inset">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${claim.confidenceScore}%` }}
              ></div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-2">
            Confidence based on clause match and data clarity
          </p>
        </div>

      </div>

      {/* Missing documents warnings */}
      {claim.missingDocuments && claim.missingDocuments.length > 0 && (
        <div className="bg-[#fdf8e6] border border-amber-200/60 p-5 rounded-3xl space-y-3 shadow-sm">
          <h4 className="text-sm font-bold text-amber-700 flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>Missing Supporting Documents Detected</span>
          </h4>
          <ul className="list-disc pl-5 text-xs text-slate-650 font-bold space-y-1.5 leading-relaxed">
            {claim.missingDocuments.map((doc, idx) => (
              <li key={idx}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex space-x-4 border-b border-slate-200/60 pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2 text-xs font-extrabold transition-all duration-200 border-b-2 px-1 ${
            activeTab === 'audit'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Line-Item Claim Audit
        </button>
        <button
          onClick={() => setActiveTab('benefits')}
          className={`pb-2 text-xs font-extrabold transition-all duration-200 border-b-2 px-1 ${
            activeTab === 'benefits'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Policy Benefits & Clauses
        </button>
      </div>

      {activeTab === 'audit' ? (
        /* Main Expense Breakdown List */
        <div className="neu-flat p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-200/55 pb-2">Line-Item Expense Audit</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-450 border-b border-slate-200 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Billed Amount</th>
                  <th className="py-3 px-4">Coverage Status</th>
                  <th className="py-3 px-4">AI Audit Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-slate-700 font-semibold">
                {claim.expenseBreakdown && claim.expenseBreakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">{item.description}</td>
                    <td className="py-4 px-4">
                      <span className="bg-[#e6eef8] text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-slate-800">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(item.coverageStatus)}</td>
                    <td className="py-4 px-4 text-slate-550 leading-relaxed text-[11px] max-w-xs font-medium">
                      {item.reasoning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 2: Policy Benefits & Clauses */
        <div className="space-y-6">
          {/* Main Key Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Policy Name card */}
            <div className="neu-card p-5 rounded-2xl relative flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Policy Name</span>
                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200/40">
                    {(claim.policyBenefits || fallbackBenefits).policy_name?.page || "Page 1"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                  "{ (claim.policyBenefits || fallbackBenefits).policy_name?.exact_clause }"
                </p>
              </div>
            </div>

            {/* Sum Insured card */}
            <div className="neu-card p-5 rounded-2xl relative flex flex-col justify-between border-l-4 border-blue-500">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sum Insured Clause</span>
                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200/40">
                    {(claim.policyBenefits || fallbackBenefits).sum_insured?.page || "Page 2"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                  "{ (claim.policyBenefits || fallbackBenefits).sum_insured?.exact_clause }"
                </p>
              </div>
            </div>

            {/* Room Rent card */}
            <div className="neu-card p-5 rounded-2xl relative flex flex-col justify-between border-l-4 border-amber-500">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Room Rent Limits</span>
                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200/40">
                    {(claim.policyBenefits || fallbackBenefits).room_rent_limit?.page || "Page 4"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                  "{ (claim.policyBenefits || fallbackBenefits).room_rent_limit?.exact_clause }"
                </p>
              </div>
            </div>

            {/* ICU limits card */}
            <div className="neu-card p-5 rounded-2xl relative flex flex-col justify-between border-l-4 border-rose-500">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ICU Limits Clause</span>
                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200/40">
                    {(claim.policyBenefits || fallbackBenefits).icu_limit?.page || "Page 4"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                  "{ (claim.policyBenefits || fallbackBenefits).icu_limit?.exact_clause }"
                </p>
              </div>
            </div>
          </div>

          {/* Subsections: Waiting Periods, Covered Benefits, Exclusions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Waiting Periods section */}
            <div className="neu-flat p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-extrabold text-slate-800 border-b border-slate-200/55 pb-2 flex items-center space-x-1.5">
                <Calendar size={14} className="text-amber-500" />
                <span>Waiting Periods</span>
              </h3>
              <div className="space-y-3">
                {((claim.policyBenefits || fallbackBenefits).waiting_periods || []).map((item, idx) => (
                  <div key={idx} className="bg-[#e6eef8] neu-card p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">{item.title}</span>
                      <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                        {item.page}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-650 font-bold leading-relaxed italic">
                      "{item.exact_clause}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Covered Benefits section */}
            <div className="neu-flat p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-extrabold text-slate-800 border-b border-slate-200/55 pb-2 flex items-center space-x-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Covered Benefits</span>
              </h3>
              <div className="space-y-3">
                {((claim.policyBenefits || fallbackBenefits).covered_benefits || []).map((item, idx) => (
                  <div key={idx} className="bg-[#e6eef8] neu-card p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">{item.title}</span>
                      <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                        {item.page}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-650 font-bold leading-relaxed italic">
                      "{item.exact_clause}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusions section */}
            <div className="neu-flat p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-extrabold text-slate-800 border-b border-slate-200/55 pb-2 flex items-center space-x-1.5">
                <ShieldAlert size={14} className="text-rose-500" />
                <span>Policy Exclusions</span>
              </h3>
              <div className="space-y-3">
                {((claim.policyBenefits || fallbackBenefits).exclusions || []).map((item, idx) => (
                  <div key={idx} className="bg-[#e6eef8] neu-card p-4 rounded-xl space-y-2 border-l-2 border-rose-400">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">{item.title}</span>
                      <span className="text-[8px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
                        {item.page}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-650 font-bold leading-relaxed italic">
                      "{item.exact_clause}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Disclaimer Box */}
      <div className="neu-flat p-4 rounded-2xl text-center relative overflow-hidden">
        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto flex items-center justify-center space-x-2">
          <Info size={14} className="text-blue-500 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> This is an AI-assisted estimate based on your uploaded documents. Final claim decisions are made by the insurer and/or TPA.
          </span>
        </p>
      </div>

      {/* Action Block */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#e6eef8] neu-flat p-6 rounded-3xl">
        <div className="space-y-0.5 text-center sm:text-left">
          <h4 className="font-extrabold text-sm text-slate-850">Generate Submission Package</h4>
          <p className="text-xs text-slate-550 font-bold">
            Compile checklist, fill details, and compose draft letter for reimbursement filing.
          </p>
        </div>

        <button
          onClick={handleGeneratePackage}
          disabled={packaging}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 neu-btn-primary rounded-2xl font-bold text-xs shadow-lg transition-all duration-300"
        >
          {packaging ? (
            <>
              <Loader2 className="animate-spin mr-2" size={16} />
              <span>Generating Submission Guides...</span>
            </>
          ) : (
            <>
              <span>Generate Reimbursement Package</span>
              <ArrowRight size={14} className="ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Loader element placeholder for dynamic pages
const Loader2 = ({ className, size }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
  </div>
);

export default ClaimAnalysis;
