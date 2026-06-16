import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, Copy, Check, FileCheck, CheckSquare, Square, 
  Mail, AlertCircle, Send, HelpCircle 
} from 'lucide-react';

const ClaimPackage = () => {
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claimId');
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [checklistState, setChecklistState] = useState({});
  const [submittingStatus, setSubmittingStatus] = useState(false);

  useEffect(() => {
    if (claimId) {
      loadPackage();
    } else {
      navigate('/dashboard');
    }
  }, [claimId]);

  const loadPackage = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/claim/${claimId}`);
      setClaim(res.data);
      
      // Initialize checklist state
      const initialChecklist = {};
      if (res.data.submissionChecklist) {
        res.data.submissionChecklist.forEach((_, idx) => {
          initialChecklist[idx] = false;
        });
      }
      setChecklistState(initialChecklist);
    } catch (err) {
      console.error(err);
      setError('Could not load claims package data. Verify endpoint connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (claim && claim.emailDraft) {
      navigator.clipboard.writeText(claim.emailDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleChecklistItem = (idx) => {
    setChecklistState(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleMarkAsSubmitted = async () => {
    setSubmittingStatus(true);
    try {
      await api.put(`/claim/${claimId}/status`, { status: 'Submitted' });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to update claim status. Try again later.');
      setSubmittingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-4 min-h-[50vh] bg-[#e6eef8]">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-xs text-slate-500 font-bold">Compiling submission package parameters...</span>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4 bg-[#e6eef8]">
        <AlertCircle size={40} className="mx-auto text-rose-500" />
        <h3 className="text-base font-extrabold text-slate-800">Package Unavailable</h3>
        <p className="text-xs text-slate-500 font-bold">{error || 'Reimbursement package data could not be parsed.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2.5 neu-btn rounded-xl text-xs font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-[#e6eef8]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => navigate(`/claim-analysis?claimId=${claimId}`)}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors duration-200 font-bold text-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Claim Analysis</span>
        </button>

        <span className="text-xs text-slate-650 bg-[#e6eef8] neu-inset px-3 py-1.5 rounded-xl font-extrabold">
          Claim Value: ₹{claim.totalClaimedAmount.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Claim Submission Package</h1>
        <p className="text-slate-550 text-xs mt-1 font-bold">
          Review step-by-step submission steps, checklist requirements, and copy the formal insurer email block.
        </p>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Checklists */}
        <div className="space-y-6">
          {/* Submission Checklist */}
          <div className="neu-flat p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center space-x-2 border-b border-slate-200/50 pb-3">
              <CheckSquare className="text-blue-600" size={16} />
              <span>Submission Checklist</span>
            </h3>
            
            <div className="space-y-3">
              {claim.submissionChecklist && claim.submissionChecklist.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => toggleChecklistItem(idx)}
                  className={`flex items-start space-x-3 p-3 rounded-2xl cursor-pointer border transition-all duration-200 ${
                    checklistState[idx] 
                      ? 'bg-[#dce6f2] border-blue-200/30 text-slate-500 shadow-inner' 
                      : 'neu-card border-transparent text-slate-700'
                  }`}
                >
                  <button className="shrink-0 mt-0.5 text-blue-600">
                    {checklistState[idx] ? (
                      <CheckSquare size={16} className="text-emerald-500" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                  <span className={`text-xs leading-relaxed font-bold ${checklistState[idx] ? 'line-through' : ''}`}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Missing docs warning checklist if any */}
          {claim.missingDocuments && claim.missingDocuments.length > 0 && (
            <div className="bg-[#fdf8e6] border border-amber-200/50 p-6 rounded-3xl space-y-4 shadow-sm">
              <h3 className="text-base font-extrabold text-amber-700 flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>Verify Missing Documents Prior to Posting</span>
              </h3>
              <p className="text-xs text-slate-650 font-bold leading-relaxed">
                Ensure you obtain physical signatures/stamps for these items to minimize queries and delay in settlement:
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-650 font-bold space-y-2 leading-relaxed">
                {claim.missingDocuments.map((doc, idx) => (
                  <li key={idx} className="font-extrabold">{doc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Email Draft */}
        <div className="space-y-6">
          <div className="neu-flat p-6 rounded-3xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center space-x-2">
                <Mail className="text-blue-600" size={16} />
                <span>Insurer Email Cover Letter</span>
              </h3>
              
              <button
                onClick={handleCopyEmail}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  copied 
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-300/30' 
                    : 'neu-btn px-3 py-1.5'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={12} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Letter</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#e6eef8] neu-inset rounded-2xl p-4 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto border border-white/20">
              {claim.emailDraft || 'Email draft generation pending.'}
            </div>
          </div>
        </div>

      </div>

      {/* TPA Final Decision Disclaimer */}
      <div className="neu-flat p-4 rounded-2xl text-center relative overflow-hidden">
        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto flex items-center justify-center space-x-2">
          <HelpCircle size={14} className="text-blue-500 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> This is an AI-assisted estimate based on your uploaded documents. Final claim decisions are made by the insurer and/or TPA.
          </span>
        </p>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#e6eef8] neu-flat p-6 rounded-3xl">
        <div className="space-y-0.5 text-center sm:text-left">
          <h4 className="font-extrabold text-sm text-slate-800">Reimbursement Package Ready?</h4>
          <p className="text-xs text-slate-550 font-bold">
            Submit copies to your insurance provider and change status to 'Submitted'.
          </p>
        </div>

        <button
          onClick={handleMarkAsSubmitted}
          disabled={submittingStatus}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 neu-btn-primary rounded-2xl font-bold text-xs shadow-lg transition-all duration-300"
        >
          {submittingStatus ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Send size={14} />
              <span>Mark Claim as Submitted</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ClaimPackage;
