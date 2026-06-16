import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, AlertTriangle, FileText, ChevronRight, 
  ShieldCheck, UploadCloud, Info, History
} from 'lucide-react';

const MissingDocuments = () => {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMissingDocsData();
  }, []);

  const fetchMissingDocsData = async () => {
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
      console.error('Failed to load data:', err);
      setError('Could not fetch data from the server.');
    } finally {
      setLoading(false);
    }
  };

  // Group claims with missing documents by policy
  const policyGroups = policies.map(policy => {
    const policyClaims = claims.filter(c => c.policyId === policy._id && c.missingDocuments?.length > 0);
    return {
      policy,
      claims: policyClaims
    };
  }).filter(group => group.claims.length > 0);

  const totalMissingCount = claims.reduce((sum, c) => sum + (c.missingDocuments?.length || 0), 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-4 min-h-[50vh] bg-[#f4f6fa]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-xs text-slate-500 font-bold">Scanning policies for missing documents...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-[#f4f6fa]">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors duration-200 font-bold text-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-2">
          <AlertTriangle className="text-rose-500" size={24} />
          <span>Required Supporting Documents</span>
        </h1>
        <p className="text-slate-550 text-xs mt-1 font-bold">
          AI flagged missing documents needed to complete audit requirements and maximize claim approval probability.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/5 border border-rose-200/50 text-rose-600 p-4 rounded-2xl flex items-center space-x-3 text-xs font-semibold">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Banner */}
      <div className="neu-card p-5 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Missing Items</p>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {totalMissingCount} Documents Flagged
          </p>
        </div>
        <div className="text-xs text-slate-500 font-bold bg-[#f4f6fa] neu-inset px-4 py-2 rounded-xl">
          Across {policyGroups.length} Active Policies
        </div>
      </div>

      {policyGroups.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-slate-300 rounded-3xl bg-slate-50/10">
          <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-3" />
          <h3 className="text-base font-extrabold text-slate-700">All Set! No Missing Documents</h3>
          <p className="text-xs text-slate-550 mt-1 max-w-sm mx-auto font-bold">
            All your filed claims have the necessary diagnostic sheets, final bills, and proofs uploaded.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {policyGroups.map(({ policy, claims: groupClaims }) => (
            <div key={policy._id} className="neu-flat p-6 rounded-3xl space-y-4">
              {/* Policy Banner Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-800">{policy.policyName}</h2>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    {policy.insurer} • Policy No: {policy.policyNumber}
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/30 px-3 py-1 rounded-full">
                  {groupClaims.reduce((acc, c) => acc + c.missingDocuments.length, 0)} Items Missing
                </span>
              </div>

              {/* Claims details under this policy */}
              <div className="space-y-4">
                {groupClaims.map(claim => (
                  <div key={claim._id} className="neu-card p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <span className="text-[8px] font-black bg-slate-200 text-slate-650 px-2 py-0.5 rounded border uppercase tracking-wider">
                          {claim.status}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-800 mt-2">
                          {claim.hospitalName || 'Reimbursement Claim'}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold">
                          Period: {claim.admissionDate ? new Date(claim.admissionDate).toLocaleDateString('en-IN') : 'N/A'} - {claim.dischargeDate ? new Date(claim.dischargeDate).toLocaleDateString('en-IN') : 'N/A'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:items-end sm:text-right">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Estimated Payout</span>
                        <span className="text-sm font-black text-emerald-600 mt-0.5">
                          ₹{claim.estimatedReimbursement.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Missing documents list */}
                    <div className="bg-[#fdf8e6] border border-amber-200/40 p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center space-x-1.5 text-amber-700 text-xs font-bold">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>Required Files ({claim.missingDocuments.length})</span>
                      </div>
                      <ul className="list-disc pl-5 text-[11px] text-slate-650 font-bold space-y-1.5 leading-relaxed">
                        {claim.missingDocuments.map((doc, i) => (
                          <li key={i}>{doc}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Quick Resolution Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => navigate(`/claim-analysis?claimId=${claim._id}`)}
                        className="px-3.5 py-2 neu-btn rounded-xl text-xs font-bold transition duration-200"
                      >
                        View Analysis
                      </button>
                      <button
                        onClick={() => {
                          if (claim.status === 'Draft') {
                            navigate(`/upload-claim?claimId=${claim._id}&policyId=${claim.policyId}`);
                          } else {
                            navigate(`/claim-package?claimId=${claim._id}`);
                          }
                        }}
                        className="flex items-center space-x-1.5 px-4 py-2 neu-btn-primary rounded-xl text-xs font-bold transition duration-200"
                      >
                        <UploadCloud size={12} />
                        <span>{claim.status === 'Draft' ? 'Upload Files' : 'View Package'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Disclaimer Box */}
      <div className="neu-flat p-4 rounded-2xl text-center relative overflow-hidden">
        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto flex items-center justify-center space-x-2">
          <Info size={14} className="text-blue-500 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> Document requirements are suggested by AI based on diagnostic procedures found in your medical bills. Uploading them increases claim confidence.
          </span>
        </p>
      </div>
    </div>
  );
};

export default MissingDocuments;
