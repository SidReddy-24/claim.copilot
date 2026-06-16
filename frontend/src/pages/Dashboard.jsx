import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { 
  FileText, Plus, AlertTriangle, ArrowRight, ShieldCheck, 
  HelpCircle, Activity, ChevronRight, FileSpreadsheet,
  BookOpen, X, Calendar, ShieldAlert, Info, TrendingUp,
  IndianRupee, Target, Zap
} from 'lucide-react';

// ── SVG Odometer / Gauge ────────────────────────────────────────────
const OdometerGauge = ({ value = 0, max = 100, label, color = '#2563eb', size = 140 }) => {
  const r = 52;
  const cx = 70;
  const cy = 70;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const pct = Math.min(1, Math.max(0, value / max));
  const angle = startAngle + pct * totalAngle;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPath = (startDeg, endDeg, radius) => {
    const x1 = cx + radius * Math.cos(toRad(startDeg));
    const y1 = cy + radius * Math.sin(toRad(startDeg));
    const x2 = cx + radius * Math.cos(toRad(endDeg));
    const y2 = cy + radius * Math.sin(toRad(endDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const needleX = cx + (r - 14) * Math.cos(toRad(angle));
  const needleY = cy + (r - 14) * Math.sin(toRad(angle));

  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 140 115">
      {/* Track */}
      <path d={arcPath(-210, 30, r)} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
      {/* Fill */}
      <path d={arcPath(-210, angle, r)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}55)`, transition: 'all 0.8s ease' }} />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke="#334155" strokeWidth="2.5" strokeLinecap="round"
        style={{ transition: 'all 0.8s ease' }} />
      <circle cx={cx} cy={cy} r="5" fill="#334155" />
      <circle cx={cx} cy={cy} r="2.5" fill="white" />
      {/* Value */}
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="13" fontWeight="800" fill="#1e293b">
        {typeof value === 'number' && value > 999
          ? `₹${(value / 100000).toFixed(1)}L`
          : `${value}%`}
      </text>
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize="6.5" fontWeight="600" fill="#94a3b8" letterSpacing="0.05em">
        {label?.toUpperCase()}
      </text>
    </svg>
  );
};

// ── Donut Chart ─────────────────────────────────────────────────────
const DonutChart = ({ segments, size = 120, thickness = 18 }) => {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = total > 0 ? (seg.value / total) * circumference : 0;
    const gap = circumference - dash;
    const arc = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: `drop-shadow(0 0 4px ${arc.color}44)` }}
        />
      ))}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="15" fontWeight="800" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">CLAIMS</text>
    </svg>
  );
};

// ── Horizontal Bar ──────────────────────────────────────────────────
const HBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[140px]">{label}</span>
        <span className="text-[10px] font-black text-slate-700">₹{(value / 100000).toFixed(1)}L</span>
      </div>
      <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
    </div>
  );
};

// ── Main Dashboard ──────────────────────────────────────────────────
const Dashboard = () => {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPolicyForBenefits, setSelectedPolicyForBenefits] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const fallbackBenefits = {
    policy_name: { exact_clause: "Star Comprehensive Health Insurance Policy (Individual & Floater)", page: "Page 1" },
    sum_insured: { exact_clause: "The Maximum Limit of Indemnity under this policy shall be the Sum Insured of INR 5,00,000 per policy year.", page: "Page 2" },
    room_rent_limit: { exact_clause: "Room Rent, boarding, nursing expenses as provided by the Hospital / Nursing Home up to Single Private A/C Room.", page: "Page 4" },
    icu_limit: { exact_clause: "Intensive Care Unit (ICU) / Intensive Cardiac Care Unit (ICCU) charges are covered up to actuals.", page: "Page 4" },
    waiting_periods: [
      { title: "Pre-Existing Diseases", exact_clause: "Expenses related to the treatment of a Pre-Existing Disease (PED) and its direct complications shall be excluded until the expiry of 36 months of continuous coverage.", page: "Page 7" },
      { title: "Initial Waiting Period", exact_clause: "Expenses related to the treatment of any illness within 30 days from the first policy commencement date shall be excluded except for accidental injuries.", page: "Page 7" }
    ],
    covered_benefits: [{ title: "In-patient Hospitalization", exact_clause: "Room, Boarding, and Nursing Expenses, Surgeon, Anesthetist, Medical Practitioner, Consultants, Specialist Fees, Anesthesia, Blood, Oxygen, Operation Theatre charges, medicines.", page: "Page 3" }],
    exclusions: [{ title: "Cosmetic & Plastic Surgery", exact_clause: "Expenses for cosmetic or aesthetic treatments, plastic surgery, or reconstructive surgery are excluded unless essential due to accident or cancer.", page: "Page 11" }]
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true); setError('');
    try {
      const [policiesRes, claimsRes] = await Promise.all([api.get('/policies'), api.get('/claims')]);
      setPolicies(policiesRes.data);
      setClaims(claimsRes.data);
    } catch (err) {
      setError('Could not fetch data from the server. Make sure the backend and database are online.');
    } finally { setLoading(false); }
  };

  const handleCreateClaim = async (policyId) => {
    const existingClaim = claims.find(c => c.policyId === policyId);
    if (existingClaim) {
      if (existingClaim.status === 'Draft') navigate(`/upload-claim?claimId=${existingClaim._id}&policyId=${policyId}`);
      else navigate(`/claim-package?claimId=${existingClaim._id}`);
      return;
    }
    try {
      const res = await api.post('/claim/create', { policyId });
      navigate(`/upload-claim?claimId=${res.data._id}&policyId=${policyId}`);
    } catch { alert('Error creating claim. Please try again.'); }
  };

  // ── Derived Stats ───────────────────────────────────────────────
  const totalPolicies = policies.length;
  const totalClaims = claims.length;
  const draftClaims = claims.filter(c => c.status === 'Draft');
  const submittedClaims = claims.filter(c => c.status === 'Submitted');
  const totalEstimatedReimbursement = claims.reduce((s, c) => s + (c.estimatedReimbursement || 0), 0);
  const totalClaimedAmount = claims.reduce((s, c) => s + (c.totalClaimedAmount || 0), 0);
  const totalMissingDocumentsCount = claims.reduce((s, c) => s + (c.missingDocuments?.length || 0), 0);
  const avgConfidence = claims.length > 0
    ? Math.round(claims.reduce((s, c) => s + (c.confidenceScore || 0), 0) / claims.length)
    : 0;
  const approvalRate = totalClaimedAmount > 0
    ? Math.round((totalEstimatedReimbursement / totalClaimedAmount) * 100)
    : 0;
  const totalSumInsured = policies.reduce((s, p) => s + (p.sumInsured || 0), 0);

  // Bar chart: top 5 policies by sum insured
  const topPolicies = [...policies].sort((a, b) => (b.sumInsured || 0) - (a.sumInsured || 0)).slice(0, 5);
  const maxSumInsured = topPolicies[0]?.sumInsured || 1;
  const barColors = ['#2563eb', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 bg-[#f4f6fa]">
        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(n => <div key={n} className="h-28 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-96 bg-slate-200 animate-pulse rounded-2xl lg:col-span-2" />
          <div className="h-96 bg-slate-200 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-[#f4f6fa]">

      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Namaste, <span className="text-gradient">{user?.name}</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-bold">
            Your health insurance command center — track, audit and file claims intelligently.
          </p>
        </div>
        <Link to="/upload-policy"
          className="flex items-center space-x-2 px-4 py-2.5 neu-btn-primary rounded-xl font-bold text-xs transition-all duration-300">
          <Plus size={14} /><span>Upload Policy</span>
        </Link>
      </div>

      {error && (
        <div className="bg-rose-500/5 border border-rose-200/50 text-rose-600 p-4 rounded-2xl flex items-center space-x-3 text-xs font-semibold">
          <AlertTriangle size={18} className="shrink-0 animate-bounce" />
          <div><span className="font-bold">Connection Issue:</span> {error}</div>
        </div>
      )}

      {/* ── Top KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Est Reimbursement */}
        <div className="neu-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Est. Reimbursement</p>
          <p className="text-xl font-black text-emerald-600 mt-1.5">
            ₹{totalEstimatedReimbursement.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center space-x-1 mt-1.5 text-[9px] text-slate-400 font-bold">
            <TrendingUp size={9} className="text-emerald-500" />
            <span>Across all active claims</span>
          </div>
        </div>

        {/* Active Policies */}
        <div className="neu-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Coverage</p>
          <p className="text-xl font-black text-blue-600 mt-1.5">
            ₹{(totalSumInsured / 100000).toFixed(1)}L
          </p>
          <div className="flex items-center space-x-1 mt-1.5 text-[9px] text-slate-400 font-bold">
            <ShieldCheck size={9} className="text-blue-500" />
            <span>{totalPolicies} policies registered</span>
          </div>
        </div>

        {/* Claims */}
        <div className="neu-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent" />
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Claims</p>
          <p className="text-xl font-black text-slate-800 mt-1.5">
            {totalClaims} <span className="text-xs font-medium text-slate-400">filed</span>
          </p>
          <div className="flex items-center space-x-1 mt-1.5 text-[9px] text-slate-400 font-bold">
            <FileSpreadsheet size={9} className="text-violet-500" />
            <span>{submittedClaims.length} submitted · {draftClaims.length} draft</span>
          </div>
        </div>

        {/* Missing Docs */}
        <div
          onClick={() => navigate('/missing-documents')}
          className="neu-card p-4 rounded-2xl relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300 group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent" />
          <p className="text-[9px] font-bold text-slate-400 group-hover:text-slate-600 uppercase tracking-widest transition-colors">Missing Documents</p>
          <p className="text-xl font-black text-rose-600 mt-1.5">{totalMissingDocumentsCount}</p>
          <div className="flex items-center space-x-1 mt-1.5 text-[9px] text-slate-400 font-bold">
            <AlertTriangle size={9} className="text-rose-500 group-hover:animate-bounce" />
            <span>Flagged by AI · tap to review</span>
          </div>
        </div>
      </div>

      {/* ── Visual Analytics Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Odometer 1: Approval Rate */}
        <div className="neu-flat p-5 rounded-3xl flex flex-col items-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest self-start">Claim Approval Rate</p>
          <OdometerGauge value={approvalRate} max={100} label="approval rate" color="#10b981" size={150} />
          <div className="w-full grid grid-cols-2 gap-2 mt-1">
            <div className="neu-inset p-2 rounded-xl text-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase">Claimed</p>
              <p className="text-xs font-black text-slate-700">₹{(totalClaimedAmount/100000).toFixed(1)}L</p>
            </div>
            <div className="neu-inset p-2 rounded-xl text-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase">Estimated</p>
              <p className="text-xs font-black text-emerald-600">₹{(totalEstimatedReimbursement/100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>

        {/* Odometer 2: AI Confidence */}
        <div className="neu-flat p-5 rounded-3xl flex flex-col items-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest self-start">AI Confidence Score</p>
          <OdometerGauge value={avgConfidence} max={100} label="avg confidence" color="#2563eb" size={150} />
          <div className="w-full grid grid-cols-2 gap-2 mt-1">
            <div className="neu-inset p-2 rounded-xl text-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase">Submitted</p>
              <p className="text-xs font-black text-slate-700">{submittedClaims.length}</p>
            </div>
            <div className="neu-inset p-2 rounded-xl text-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase">Pending</p>
              <p className="text-xs font-black text-amber-500">{draftClaims.length}</p>
            </div>
          </div>
        </div>

        {/* Donut: Claims Breakdown */}
        <div className="neu-flat p-5 rounded-3xl space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Claims Breakdown</p>
          <div className="flex items-center justify-center gap-6">
            <DonutChart
              size={120}
              thickness={18}
              segments={[
                { value: submittedClaims.length, color: '#10b981' },
                { value: draftClaims.length, color: '#f59e0b' },
                { value: Math.max(0, totalPolicies - totalClaims), color: '#e2e8f0' },
              ]}
            />
            <div className="space-y-3">
              {[
                { label: 'Submitted', val: submittedClaims.length, color: '#10b981' },
                { label: 'Draft', val: draftClaims.length, color: '#f59e0b' },
                { label: 'No Claim', val: Math.max(0, totalPolicies - totalClaims), color: '#cbd5e1' },
              ].map(item => (
                <div key={item.label} className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-[10px] font-bold text-slate-600">{item.label}</span>
                  <span className="text-[10px] font-black text-slate-800 ml-auto">{item.val}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-slate-200/50">
                <p className="text-[8px] text-slate-400 font-bold uppercase">Missing Docs</p>
                <p className="text-sm font-black text-rose-500">{totalMissingDocumentsCount} items</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Policy Bar Chart + Policy List + Claims ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Bar Chart + Policy Cards */}
        <div className="lg:col-span-2 space-y-6">

          {/* Coverage Bar Chart */}
          {topPolicies.length > 0 && (
            <div className="neu-flat p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                <h2 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                  <Target className="text-blue-600" size={15} />
                  <span>Coverage by Policy</span>
                </h2>
                <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">Sum Insured</span>
              </div>
              <div className="space-y-3">
                {topPolicies.map((p, i) => (
                  <HBar
                    key={p._id}
                    label={p.policyName}
                    value={p.sumInsured}
                    max={maxSumInsured}
                    color={barColors[i % barColors.length]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Policy Cards */}
          <div className="neu-flat p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                <ShieldCheck className="text-blue-600" size={15} />
                <span>Your Health Policies</span>
              </h2>
              <span className="text-[9px] text-slate-400 font-bold neu-inset px-2.5 py-1 rounded-md">
                {policies.length} Registered
              </span>
            </div>

            {policies.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300">
                <FileText size={36} className="mx-auto text-slate-400 mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No Policies Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                  Upload your health insurance policy document to enable claim coverage estimation.
                </p>
                <Link to="/upload-policy"
                  className="inline-flex items-center space-x-1 mt-4 px-4 py-2.5 neu-btn rounded-xl text-xs font-bold transition duration-200">
                  <span>Upload Policy PDF</span><ChevronRight size={12} />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {policies.map((policy, idx) => {
                  const policyClaim = claims.find(c => c.policyId === policy._id);
                  return (
                    <div key={policy._id} className="neu-card p-4 rounded-2xl">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                            style={{ background: barColors[idx % barColors.length] }}>
                            {policy.insurer?.charAt(0) || 'I'}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 truncate">{policy.policyName}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold">{policy.policyNumber}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-200/30 px-2 py-0.5 rounded">
                                ₹{(policy.sumInsured||0).toLocaleString('en-IN')} insured
                              </span>
                              {policyClaim && (
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                                  policyClaim.status === 'Submitted' ? 'neu-badge-green' : 'neu-badge-amber'
                                }`}>
                                  {policyClaim.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => setSelectedPolicyForBenefits(policy)}
                            className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 py-2 neu-btn rounded-xl text-[10px] font-bold transition duration-200">
                            <BookOpen size={11} className="text-blue-500" /><span>Benefits</span>
                          </button>
                          <button onClick={() => handleCreateClaim(policy._id)}
                            className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 py-2 neu-btn-primary rounded-xl text-[10px] font-bold transition duration-200">
                            <span>{policyClaim ? (policyClaim.status === 'Draft' ? 'Continue' : 'View Claim') : 'File Claim'}</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Claim Actions */}
        <div className="space-y-6">
          <div className="neu-flat p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                <Zap className="text-amber-500" size={15} />
                <span>Claim Actions</span>
              </h2>
              <Link to="/claim-history" className="text-[10px] text-blue-600 hover:underline font-bold">
                View All
              </Link>
            </div>

            {claims.length === 0 ? (
              <div className="text-center py-10 px-2 border border-dashed border-slate-300 rounded-2xl">
                <Activity size={28} className="mx-auto text-slate-400 mb-2" />
                <h3 className="text-xs font-bold text-slate-700">No active claims</h3>
                <p className="text-[10px] text-slate-500 mt-1">File a reimbursement request to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.slice(0, 5).map(claim => {
                  const policy = policies.find(p => p._id === claim.policyId);
                  const pct = claim.totalClaimedAmount > 0
                    ? Math.round((claim.estimatedReimbursement / claim.totalClaimedAmount) * 100)
                    : 0;
                  return (
                    <div key={claim._id} className="neu-card p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            claim.status === 'Submitted' ? 'neu-badge-green' : 'neu-badge-amber'
                          }`}>{claim.status}</span>
                          <h4 className="font-extrabold text-[11px] text-slate-800 mt-1.5 leading-tight">
                            {claim.hospitalName || 'Pending Hospital info'}
                          </h4>
                          {policy && <p className="text-[9px] text-slate-500 font-bold">{policy.policyName}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[8px] text-slate-400 font-bold uppercase">Payout</p>
                          <p className="text-xs font-black text-emerald-600">
                            ₹{(claim.estimatedReimbursement || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Mini progress bar */}
                      {claim.totalClaimedAmount > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-400 font-bold">
                            <span>Coverage match</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1 border-t border-slate-200/40">
                        {claim.status === 'Draft' ? (
                          <>
                            <button onClick={() => navigate(`/upload-claim?claimId=${claim._id}&policyId=${claim.policyId}`)}
                              className="flex-1 py-1.5 neu-btn rounded-lg text-[9px] font-bold text-center">
                              Upload
                            </button>
                            <button onClick={() => navigate(`/claim-analysis?claimId=${claim._id}`)}
                              className="flex-1 py-1.5 neu-btn-primary rounded-lg text-[9px] font-bold text-center">
                              Analyze
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => navigate(`/claim-analysis?claimId=${claim._id}`)}
                              className="flex-1 py-1.5 neu-btn rounded-lg text-[9px] font-bold text-center">
                              Audit
                            </button>
                            <button onClick={() => navigate(`/claim-package?claimId=${claim._id}`)}
                              className="flex-1 py-1.5 neu-btn-primary rounded-lg text-[9px] font-bold text-center">
                              Package
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

      {/* ── Disclaimer ── */}
      <div className="neu-flat p-4 rounded-2xl text-center">
        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto flex items-center justify-center space-x-2">
          <HelpCircle size={13} className="text-blue-600 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> This is an AI-assisted estimate based on your uploaded documents. Final claim decisions are made by the insurer and/or TPA.
          </span>
        </p>
      </div>

      {/* ── Policy Benefits Modal ── */}
      {selectedPolicyForBenefits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-[#f4f6fa] neu-flat max-w-5xl w-full max-h-[85vh] rounded-3xl p-6 overflow-y-auto space-y-6 relative border border-slate-200/50">
            <div className="flex justify-between items-start border-b border-slate-200/60 pb-4">
              <div>
                <span className="text-[9px] text-blue-600 font-bold tracking-widest uppercase">Policy Clauses & Limits</span>
                <h2 className="text-xl font-black text-slate-800 mt-1">{selectedPolicyForBenefits.policyName}</h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Insurer: {selectedPolicyForBenefits.insurer} | No: {selectedPolicyForBenefits.policyNumber}
                </p>
              </div>
              <button onClick={() => setSelectedPolicyForBenefits(null)}
                className="w-8 h-8 rounded-full bg-[#f4f6fa] neu-card flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all duration-200">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Policy Title', key: 'policy_name', border: '' },
                  { label: 'Sum Insured Clause', key: 'sum_insured', border: 'border-l-2 border-blue-500' },
                  { label: 'Room Rent limits', key: 'room_rent_limit', border: 'border-l-2 border-amber-500' },
                  { label: 'ICU limit Clause', key: 'icu_limit', border: 'border-l-2 border-rose-500' },
                ].map(({ label, key, border }) => {
                  const b = selectedPolicyForBenefits.benefits || fallbackBenefits;
                  return (
                    <div key={key} className={`neu-card p-4 rounded-xl relative flex flex-col justify-between ${border}`}>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                          <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {b[key]?.page || 'Page 1'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic">"{b[key]?.exact_clause}"</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[
                  { title: 'Waiting Periods', key: 'waiting_periods', icon: <Calendar size={13} className="text-amber-500" />, badgeClass: 'bg-amber-100 text-amber-700' },
                  { title: 'Covered Benefits', key: 'covered_benefits', icon: <ShieldCheck size={13} className="text-emerald-500" />, badgeClass: 'bg-emerald-100 text-emerald-700' },
                  { title: 'Policy Exclusions', key: 'exclusions', icon: <ShieldAlert size={13} className="text-rose-500" />, badgeClass: 'bg-rose-100 text-rose-700', leftBorder: true },
                ].map(({ title, key, icon, badgeClass, leftBorder }) => {
                  const b = selectedPolicyForBenefits.benefits || fallbackBenefits;
                  return (
                    <div key={key} className="neu-card p-5 rounded-2xl space-y-3">
                      <h3 className="text-xs font-black text-slate-800 border-b border-slate-200/50 pb-1.5 flex items-center space-x-1.5">
                        {icon}<span>{title}</span>
                      </h3>
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                        {(b[key] || []).map((item, idx) => (
                          <div key={idx} className={`bg-[#f4f6fa] p-3.5 rounded-xl border border-slate-200/35 space-y-1.5 shadow-sm ${leftBorder ? 'border-l-2 border-rose-400' : ''}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-slate-800">{item.title}</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${badgeClass}`}>{item.page}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 font-semibold leading-relaxed italic">"{item.exact_clause}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
