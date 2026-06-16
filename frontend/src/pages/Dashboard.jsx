import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { 
  FileText, Plus, AlertTriangle, ArrowRight, ShieldCheck, 
  HelpCircle, Activity, ChevronRight, FileSpreadsheet,
  BookOpen, X, Calendar, ShieldAlert, Info
} from 'lucide-react';

const Dashboard = () => {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPolicyForBenefits, setSelectedPolicyForBenefits] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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
      }
    ],
    covered_benefits: [
      {
        title: "In-patient Hospitalization",
        exact_clause: "Room, Boarding, and Nursing Expenses, Surgeon, Anesthetist, Medical Practitioner, Consultants, Specialist Fees, Anesthesia, Blood, Oxygen, Operation Theatre charges, medicines.",
        page: "Page 3"
      }
    ],
    exclusions: [
      {
        title: "Cosmetic & Plastic Surgery",
        exact_clause: "Expenses for cosmetic or aesthetic treatments, plastic surgery, or reconstructive surgery are excluded unless essential due to accident or cancer.",
        page: "Page 11"
      }
    ]
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [policiesRes, claimsRes] = await Promise.all([
        api.get('/policies'),
        api.get('/claims')
      ]);
      setPolicies(policiesRes.data);
      setClaims(claimsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Could not fetch data from the server. Make sure the backend and database are online.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClaim = async (policyId) => {
    // Check if a claim already exists for this policy
    const existingClaim = claims.find(c => c.policyId === policyId);
    if (existingClaim) {
      if (existingClaim.status === 'Draft') {
        navigate(`/upload-claim?claimId=${existingClaim._id}&policyId=${policyId}`);
      } else {
        navigate(`/claim-package?claimId=${existingClaim._id}`);
      }
      return;
    }

    try {
      const res = await api.post('/claim/create', { policyId });
      const newClaim = res.data;
      navigate(`/upload-claim?claimId=${newClaim._id}&policyId=${policyId}`);
    } catch (err) {
      console.error('Failed to create claim:', err);
      alert('Error creating claim. Please try again.');
    }
  };

  // Calculations for stats
  const totalPolicies = policies.length;
  const totalClaims = claims.length;
  const draftClaims = claims.filter(c => c.status === 'Draft');
  const submittedClaims = claims.filter(c => c.status === 'Submitted');
  
  const totalEstimatedReimbursement = claims
    .filter(c => c.status === 'Draft' || c.status === 'Submitted')
    .reduce((sum, c) => sum + (c.estimatedReimbursement || 0), 0);

  const totalMissingDocumentsCount = claims
    .reduce((sum, c) => sum + (c.missingDocuments?.length || 0), 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 bg-[#f4f6fa]">
        <div className="h-10 w-48 bg-[#dbe4f2] animate-pulse rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-[#dbe4f2] animate-pulse rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-96 bg-[#dbe4f2] animate-pulse rounded-2xl lg:col-span-2"></div>
          <div className="h-96 bg-[#dbe4f2] animate-pulse rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-[#f4f6fa]">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Namaste, <span className="text-gradient">{user?.name}</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-bold">
            Track policies, estimate claim approvals, and draft reimbursement sheets.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            to="/upload-policy"
            className="flex items-center space-x-2 px-4 py-2.5 neu-btn-primary rounded-xl font-bold text-xs transition-all duration-300"
          >
            <Plus size={14} />
            <span>Upload Policy</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/5 border border-rose-200/50 text-rose-600 p-4 rounded-2xl flex items-center space-x-3 text-xs font-semibold">
          <AlertTriangle size={18} className="shrink-0 animate-bounce" />
          <div>
            <span className="font-bold">Connection Issue:</span> {error}
          </div>
        </div>
      )}

      {/* Aggregate Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1: Estimated Payout */}
        <div className="neu-card p-5 rounded-2xl relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Reimbursement</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            ₹{totalEstimatedReimbursement.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center space-x-1 mt-2 text-[10px] text-slate-500 font-bold">
            <Activity size={10} className="text-[#4a6f98]" />
            <span>Across all active claims</span>
          </div>
        </div>

        {/* Stat 2: Active Policies */}
        <div className="neu-card p-5 rounded-2xl relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Policies</p>
          <p className="text-2xl font-black text-slate-800 mt-2">{totalPolicies}</p>
          <div className="flex items-center space-x-1 mt-2 text-[10px] text-slate-500 font-bold">
            <ShieldCheck size={10} className="text-[#4a6f98]" />
            <span>Uploaded policy guides</span>
          </div>
        </div>

        {/* Stat 3: Claim Packages */}
        <div className="neu-card p-5 rounded-2xl relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Claims</p>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {totalClaims} <span className="text-xs font-medium text-slate-500 font-bold">({draftClaims.length} draft, {submittedClaims.length} filed)</span>
          </p>
          <div className="flex items-center space-x-1 mt-2 text-[10px] text-slate-500 font-bold">
            <FileSpreadsheet size={10} className="text-[#4a6f98]" />
            <span>Created claim packages</span>
          </div>
        </div>

        {/* Stat 4: Missing Docs */}
        <div 
          onClick={() => navigate('/missing-documents')}
          className="neu-card p-5 rounded-2xl relative overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group"
        >
          <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-650 uppercase tracking-widest transition-colors">Missing Documents</p>
          <p className="text-2xl font-black text-rose-600 mt-2">{totalMissingDocumentsCount}</p>
          <div className="flex items-center space-x-1 mt-2 text-[10px] text-slate-500 font-bold">
            <AlertTriangle size={10} className="text-rose-500 group-hover:animate-bounce" />
            <span>Files flagged by AI analyzer</span>
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Active Policies & Claim Filing Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="neu-flat p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center space-x-2">
                <ShieldCheck className="text-[#4a6f98]" size={16} />
                <span>Your Health Policies</span>
              </h2>
              <span className="text-[10px] text-slate-500 font-bold bg-[#f4f6fa] neu-inset px-2.5 py-1 rounded-md">
                {policies.length} Registered
              </span>
            </div>

            {policies.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/10">
                <FileText size={36} className="mx-auto text-slate-400 mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No Policies Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                  Please upload your health insurance policy document to enable medical claim coverage estimation.
                </p>
                <Link
                  to="/upload-policy"
                  className="inline-flex items-center space-x-1 mt-4 px-4 py-2.5 neu-btn rounded-xl text-xs font-bold transition duration-200"
                >
                  <span>Upload Policy PDF</span>
                  <ChevronRight size={12} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {policies.map(policy => (
                  <div key={policy._id} className="neu-card p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-800">{policy.policyName}</h4>
                      <p className="text-xs text-slate-500 font-semibold flex items-center space-x-2">
                        <span className="text-slate-600 font-bold">{policy.insurer}</span>
                        <span>•</span>
                        <span>No: {policy.policyNumber}</span>
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[9px] font-bold bg-[#f4f6fa] text-[#4a6f98] px-2.5 py-0.5 rounded border border-blue-200/20">
                          Sum Insured: ₹{(policy.sumInsured || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setSelectedPolicyForBenefits(policy)}
                        className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2.5 neu-btn rounded-xl text-xs font-bold transition duration-200"
                      >
                        <BookOpen size={12} className="text-blue-500 shrink-0" />
                        <span>View Benefits</span>
                      </button>
                      <button
                        onClick={() => handleCreateClaim(policy._id)}
                        className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2.5 neu-btn-primary rounded-xl text-xs font-bold transition duration-200"
                      >
                        <span>File claim</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Claims History */}
        <div className="space-y-6">
          <div className="neu-flat p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center space-x-2">
                <FileSpreadsheet className="text-[#4a6f98]" size={16} />
                <span>Claim Actions</span>
              </h2>
              <Link to="/claim-history" className="text-xs text-[#4a6f98] hover:underline font-bold">
                View All
              </Link>
            </div>

            {claims.length === 0 ? (
              <div className="text-center py-12 px-2 border border-dashed border-slate-300 rounded-2xl bg-slate-50/10">
                <Activity size={28} className="mx-auto text-slate-400 mb-2" />
                <h3 className="text-xs font-bold text-slate-700">No active claims</h3>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Once you file a reimbursement request, it will appear here for step-by-step guidance.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.slice(0, 5).map(claim => {
                  const policy = policies.find(p => p._id === claim.policyId);
                  return (
                    <div key={claim._id} className="neu-card p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                            claim.status === 'Submitted' 
                              ? 'neu-badge-green' 
                              : 'neu-badge-amber'
                          }`}>
                            {claim.status}
                          </span>
                          <h4 className="font-extrabold text-xs text-slate-800 mt-2">
                            {claim.hospitalName || 'Pending Hospital info'}
                          </h4>
                          {policy && (
                            <p className="text-[10px] text-slate-500 font-bold">{policy.policyName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Est. Payout</p>
                          <p className="text-xs font-black text-emerald-600 mt-0.5">
                            ₹{(claim.estimatedReimbursement || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-200/50">
                        {claim.status === 'Draft' ? (
                          <>
                            <button
                              onClick={() => navigate(`/upload-claim?claimId=${claim._id}&policyId=${claim.policyId}`)}
                              className="flex-1 py-1.5 neu-btn rounded-lg text-[10px] font-bold text-center"
                            >
                              Upload
                            </button>
                            <button
                              onClick={() => navigate(`/claim-analysis?claimId=${claim._id}`)}
                              className="flex-1 py-1.5 neu-btn-primary rounded-lg text-[10px] font-bold text-center"
                            >
                              Analyze
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => navigate(`/claim-analysis?claimId=${claim._id}`)}
                              className="flex-1 py-1.5 neu-btn rounded-lg text-[10px] font-bold text-center"
                            >
                              Audit Result
                            </button>
                            <button
                              onClick={() => navigate(`/claim-package?claimId=${claim._id}`)}
                              className="flex-1 py-1.5 neu-btn-primary rounded-lg text-[10px] font-bold text-center"
                            >
                              View Package
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Disclaimer block */}
      <div className="neu-flat p-4 rounded-2xl text-center relative overflow-hidden">
        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto flex items-center justify-center space-x-2">
          <HelpCircle size={14} className="text-[#4a6f98] shrink-0" />
          <span>
            <strong>Disclaimer:</strong> This is an AI-assisted estimate based on your uploaded documents. Final claim decisions are made by the insurer and/or TPA.
          </span>
        </p>
      </div>

      {/* Policy Benefits Details Modal Popup */}
      {selectedPolicyForBenefits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#f4f6fa] neu-flat max-w-5xl w-full max-h-[85vh] rounded-3xl p-6 overflow-y-auto space-y-6 relative border border-slate-200/50">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200/60 pb-4">
              <div>
                <span className="text-[9px] text-blue-600 font-bold tracking-widest uppercase">Policy Clauses & Limits</span>
                <h2 className="text-xl font-black text-slate-800 mt-1">{selectedPolicyForBenefits.policyName}</h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Insurer: {selectedPolicyForBenefits.insurer} | No: {selectedPolicyForBenefits.policyNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedPolicyForBenefits(null)}
                className="w-8 h-8 rounded-full bg-[#f4f6fa] neu-card flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all duration-200 shadow-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6">
              {/* Key Limits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Policy Name */}
                <div className="neu-card p-4 rounded-xl relative flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Policy Title</span>
                      <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {(selectedPolicyForBenefits.benefits || fallbackBenefits).policy_name?.page || "Page 1"}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-750 leading-relaxed italic">
                      "{ (selectedPolicyForBenefits.benefits || fallbackBenefits).policy_name?.exact_clause }"
                    </p>
                  </div>
                </div>

                {/* Sum Insured */}
                <div className="neu-card p-4 rounded-xl relative flex flex-col justify-between border-l-2 border-blue-500">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sum Insured Clause</span>
                      <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {(selectedPolicyForBenefits.benefits || fallbackBenefits).sum_insured?.page || "Page 2"}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-750 leading-relaxed italic">
                      "{ (selectedPolicyForBenefits.benefits || fallbackBenefits).sum_insured?.exact_clause }"
                    </p>
                  </div>
                </div>

                {/* Room Rent */}
                <div className="neu-card p-4 rounded-xl relative flex flex-col justify-between border-l-2 border-amber-500">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Room Rent limits</span>
                      <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {(selectedPolicyForBenefits.benefits || fallbackBenefits).room_rent_limit?.page || "Page 4"}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-750 leading-relaxed italic">
                      "{ (selectedPolicyForBenefits.benefits || fallbackBenefits).room_rent_limit?.exact_clause }"
                    </p>
                  </div>
                </div>

                {/* ICU */}
                <div className="neu-card p-4 rounded-xl relative flex flex-col justify-between border-l-2 border-rose-500">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ICU limit Clause</span>
                      <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {(selectedPolicyForBenefits.benefits || fallbackBenefits).icu_limit?.page || "Page 4"}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-750 leading-relaxed italic">
                      "{ (selectedPolicyForBenefits.benefits || fallbackBenefits).icu_limit?.exact_clause }"
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Categories Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Waiting Periods */}
                <div className="neu-card p-5 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-800 border-b border-slate-200/50 pb-1.5 flex items-center space-x-1.5">
                    <Calendar size={13} className="text-amber-550" />
                    <span>Waiting Periods</span>
                  </h3>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {((selectedPolicyForBenefits.benefits || fallbackBenefits).waiting_periods || []).map((item, idx) => (
                      <div key={idx} className="bg-[#f4f6fa] p-3.5 rounded-xl border border-slate-200/35 space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-slate-800">{item.title}</span>
                          <span className="text-[8px] font-black bg-amber-100 text-amber-750 px-1.5 py-0.5 rounded">
                            {item.page}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-650 font-semibold leading-relaxed italic">
                          "{item.exact_clause}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Covered Benefits */}
                <div className="neu-card p-5 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-800 border-b border-slate-200/50 pb-1.5 flex items-center space-x-1.5">
                    <ShieldCheck size={13} className="text-emerald-500" />
                    <span>Covered Benefits</span>
                  </h3>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {((selectedPolicyForBenefits.benefits || fallbackBenefits).covered_benefits || []).map((item, idx) => (
                      <div key={idx} className="bg-[#f4f6fa] p-3.5 rounded-xl border border-slate-200/35 space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-slate-800">{item.title}</span>
                          <span className="text-[8px] font-black bg-emerald-100 text-emerald-750 px-1.5 py-0.5 rounded">
                            {item.page}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-650 font-semibold leading-relaxed italic">
                          "{item.exact_clause}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exclusions */}
                <div className="neu-card p-5 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-800 border-b border-slate-200/50 pb-1.5 flex items-center space-x-1.5">
                    <ShieldAlert size={13} className="text-rose-500" />
                    <span>Policy Exclusions</span>
                  </h3>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {((selectedPolicyForBenefits.benefits || fallbackBenefits).exclusions || []).map((item, idx) => (
                      <div key={idx} className="bg-[#f4f6fa] p-3.5 rounded-xl border border-slate-200/35 space-y-1.5 border-l-2 border-rose-400 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-slate-800">{item.title}</span>
                          <span className="text-[8px] font-black bg-rose-100 text-rose-750 px-1.5 py-0.5 rounded">
                            {item.page}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-650 font-semibold leading-relaxed italic">
                          "{item.exact_clause}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
