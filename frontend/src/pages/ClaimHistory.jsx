import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, Search, Calendar, ChevronRight, FileSpreadsheet, 
  HelpCircle, ShieldCheck, AlertCircle, History 
} from 'lucide-react';

const ClaimHistory = () => {
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const [claimsRes, policiesRes] = await Promise.all([
        api.get('/claims'),
        api.get('/policies')
      ]);
      setClaims(claimsRes.data);
      setPolicies(policiesRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load claims history from server.');
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = claims.filter(claim => {
    const hospitalMatches = claim.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (!claim.hospitalName && 'pending'.includes(searchTerm.toLowerCase()));
    
    const statusMatches = statusFilter === 'All' || claim.status === statusFilter;
    
    return hospitalMatches && statusMatches;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-4 min-h-[50vh] bg-[#f4f6fa]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-xs text-slate-500 font-bold">Loading claims historical audits...</span>
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
          <History className="text-blue-600" size={24} />
          <span>Claims & Packages History</span>
        </h1>
        <p className="text-slate-550 text-xs mt-1 font-bold">
          Review, update, or view previous hospitalization audits and copilot analysis files.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/5 border border-rose-200/50 text-rose-600 p-4 rounded-2xl flex items-center space-x-3 text-xs font-semibold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#f4f6fa] neu-flat p-4 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="Search by Hospital Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-4 py-2.5 bg-[#f4f6fa] neu-input rounded-xl text-slate-800 placeholder-slate-400 text-xs font-semibold"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-500 font-bold">Filter Status:</span>
          {['All', 'Draft', 'Submitted'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                statusFilter === status 
                  ? 'neu-btn-primary text-white shadow shadow-blue-500/10' 
                  : 'neu-btn text-slate-650'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Claims List Table */}
      <div className="neu-flat p-6 rounded-3xl space-y-4">
        {filteredClaims.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50/10">
            <FileSpreadsheet size={36} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No claims match criteria</h3>
            <p className="text-xs text-slate-500 mt-1 font-bold">
              Upload bills or adjust filters to view historical packages.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-450 border-b border-slate-200 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Hospital Details</th>
                  <th className="py-3 px-4">Policy Info</th>
                  <th className="py-3 px-4">Hospitalization Period</th>
                  <th className="py-3 px-4 text-right">Billed Amt</th>
                  <th className="py-3 px-4 text-right">Est. Reimbursement</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-slate-700 font-semibold">
                {filteredClaims.map((claim) => {
                  const policy = policies.find(p => p._id === claim.policyId);
                  return (
                    <tr key={claim._id} className="hover:bg-slate-100/40 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {claim.hospitalName || 'Pending Document upload'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{policy?.policyName || 'Unknown Policy'}</span>
                          <span className="text-[10px] text-slate-500 font-bold mt-0.5">No: {policy?.policyNumber}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-500 font-semibold">
                          <Calendar size={13} className="text-slate-400" />
                          <span>
                            {claim.admissionDate ? new Date(claim.admissionDate).toLocaleDateString('en-IN') : 'N/A'} -{' '}
                            {claim.dischargeDate ? new Date(claim.dischargeDate).toLocaleDateString('en-IN') : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-extrabold text-slate-800">
                        ₹{(claim.totalClaimedAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-right font-extrabold text-emerald-600">
                        ₹{(claim.estimatedReimbursement || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                          claim.status === 'Submitted'
                            ? 'neu-badge-green'
                            : 'neu-badge-amber'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          {claim.status === 'Draft' ? (
                            <>
                              <button
                                onClick={() => navigate(`/upload-claim?claimId=${claim._id}&policyId=${claim.policyId}`)}
                                className="px-2 py-1 neu-btn rounded text-[10px] font-bold"
                              >
                                Edit Files
                              </button>
                              <button
                                onClick={() => navigate(`/claim-analysis?claimId=${claim._id}`)}
                                className="px-2 py-1 neu-btn-primary rounded text-[10px] font-bold"
                              >
                                Audit
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => navigate(`/claim-analysis?claimId=${claim._id}`)}
                                className="px-2 py-1 neu-btn rounded text-[10px] font-bold"
                              >
                                Audit Result
                              </button>
                              <button
                                onClick={() => navigate(`/claim-package?claimId=${claim._id}`)}
                                className="px-2 py-1 neu-btn-primary rounded text-[10px] font-bold border"
                              >
                                View Package
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disclaimer Box */}
      <div className="neu-flat p-4 rounded-2xl text-center relative overflow-hidden">
        <p className="text-xs text-slate-650 font-medium leading-relaxed max-w-3xl mx-auto flex items-center justify-center space-x-2">
          <HelpCircle size={14} className="text-blue-500 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> This is an AI-assisted estimate based on your uploaded documents. Final claim decisions are made by the insurer and/or TPA.
          </span>
        </p>
      </div>
    </div>
  );
};

export default ClaimHistory;
