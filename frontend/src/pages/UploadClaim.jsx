import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, Upload, FileText, CheckCircle, Plus, 
  Loader2, AlertCircle, ArrowRight, ShieldCheck 
} from 'lucide-react';

const UploadClaim = () => {
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claimId');
  const policyId = searchParams.get('policyId');
  const navigate = useNavigate();

  const [policy, setPolicy] = useState(null);
  const [claim, setClaim] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('Bill');
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const fileTypeOptions = [
    { value: 'Bill', label: 'Hospital Bill' },
    { value: 'Discharge Summary', label: 'Discharge Summary' },
    { value: 'Medicine Bill', label: 'Medicine Bill' },
    { value: 'Investigation Report', label: 'Investigation Report / Lab Report' },
    { value: 'Claim Form', label: 'Claim Form A / B' },
    { value: 'Other', label: 'Other supporting documents' }
  ];

  useEffect(() => {
    if (claimId && policyId) {
      loadDetails();
    } else {
      navigate('/dashboard');
    }
  }, [claimId, policyId]);

  const loadDetails = async () => {
    setLoadingPolicy(true);
    setError('');
    try {
      const [policyRes, claimRes, docsRes] = await Promise.all([
        api.get(`/policy/${policyId}`),
        api.get(`/claim/${claimId}`),
        api.get(`/claim/${claimId}/documents`)
      ]);
      setPolicy(policyRes.data);
      setClaim(claimRes.data);
      setUploadedDocs(docsRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch claim or policy records. Ensure the backend server is running.');
    } finally {
      setLoadingPolicy(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('claimId', claimId);
    formData.append('fileType', fileType);

    setUploading(true);
    setError('');

    try {
      await api.post('/claim/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setFile(null);
      // Reload details to get updated expenses and document lists
      await loadDetails();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload document. Please verify parameters.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (uploadedDocs.length === 0) {
      setError('You must upload at least one hospital bill or discharge summary before running analysis.');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      await api.post('/claim/analyze', { claimId });
      navigate(`/claim-analysis?claimId=${claimId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'AI claims audit failed. Verify backend Gemini credentials.');
      setAnalyzing(false);
    }
  };

  if (loadingPolicy) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-4 min-h-[50vh] bg-[#e6eef8]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="text-xs text-slate-500 font-bold">Loading claim metadata and files...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-[#e6eef8]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors duration-200 font-bold text-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </button>

        {policy && (
          <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-bold bg-[#e6eef8] neu-inset px-3 py-1.5 rounded-xl">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span className="font-bold">Active Policy:</span>
            <span className="text-slate-700">{policy.policyName} ({policy.policyNumber})</span>
          </div>
        )}
      </div>

      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Upload Hospitalization Documents</h1>
        <p className="text-slate-550 text-xs mt-1 font-bold">
          Upload hospital bills, medicine receipts, and diagnostic sheets. Our AI copilot will merge and prepare coverage claims.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/5 border border-rose-200/50 text-rose-600 p-4 rounded-2xl flex items-center space-x-3 text-xs font-semibold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form: File upload */}
        <div className="lg:col-span-2 space-y-6">
          <div className="neu-flat p-6 rounded-3xl space-y-5">
            <h3 className="text-base font-extrabold text-slate-850 border-b border-slate-200/80 pb-2">Attach Document</h3>

            {analyzing ? (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="mx-auto text-blue-500 animate-spin" size={36} />
                <h4 className="font-bold text-slate-800">Auditing Expenses Against Policy</h4>
                <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
                  Gemini AI is examining billing categories, room caps, consumable exclusions, and waiting periods.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Document Type
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="block w-full px-4 py-3 bg-[#e6eef8] neu-input rounded-2xl text-slate-800 text-xs"
                  >
                    {fileTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="border-2 border-dashed border-slate-350 hover:border-blue-400 rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 bg-[#e6eef8] neu-inset relative group">
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-2xl bg-[#e6eef8] neu-card flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all duration-300">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        {file ? file.name : 'Select bill / summary file'}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5 font-bold">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Accepts PDF, TXT'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full flex justify-center items-center py-3 px-4 neu-btn rounded-xl text-xs transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={14} />
                      <span>Extracting fields via Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} className="mr-1.5" />
                      <span>Upload & Extract Details</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Aggregated Bills preview if expenses exist */}
          {claim && claim.expenseBreakdown && claim.expenseBreakdown.length > 0 && (
            <div className="neu-flat p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                <h3 className="text-sm font-extrabold text-slate-800">Extracted Charges ({claim.expenseBreakdown.length})</h3>
                <span className="text-xs font-black text-slate-850">Total Billed: ₹{claim.totalClaimedAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="divide-y divide-slate-200/50 max-h-60 overflow-y-auto pr-1">
                {claim.expenseBreakdown.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-700">{item.description}</p>
                      <span className="text-[9px] font-bold bg-[#e6eef8] text-slate-500 px-2 py-0.5 rounded border border-slate-200/60 mt-1.5 inline-block">
                        {item.category}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-750">₹{item.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Uploaded documents list */}
        <div className="space-y-6">
          <div className="neu-flat p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-850 border-b border-slate-200/80 pb-2">Uploaded Files</h3>

            {uploadedDocs.length === 0 ? (
              <div className="text-center py-12 px-2 border border-dashed border-slate-300 rounded-2xl bg-slate-50/10">
                <FileText size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 font-bold">No documents uploaded yet.</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-semibold">
                  Please upload your medical bills or discharge summary on the left to start claims processing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedDocs.map((doc) => (
                  <div key={doc._id} className="neu-card p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <FileText size={16} className="text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{doc.fileName}</p>
                        <p className="text-[8px] font-black bg-[#e6eef8] text-slate-500 px-1.5 py-0.5 rounded border border-slate-200/60 w-fit mt-1.5 uppercase">
                          {doc.fileType}
                        </p>
                      </div>
                    </div>
                    <CheckCircle size={16} className="text-emerald-500 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}

            {uploadedDocs.length > 0 && !analyzing && (
              <button
                onClick={handleAnalyze}
                className="w-full flex justify-center items-center py-3.5 px-4 neu-btn-primary rounded-2xl font-bold text-xs shadow-lg transition-all duration-300 mt-6"
              >
                <span>Run AI Claim Audit</span>
                <ArrowRight size={14} className="ml-1.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UploadClaim;
