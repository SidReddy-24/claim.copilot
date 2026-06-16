import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Upload, FileText, AlertCircle, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const UploadPolicy = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressText, setProgressText] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a health policy document to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError('');
    setProgressText('Uploading policy file...');

    try {
      // Simulate step transition for premium UX feel
      setTimeout(() => setProgressText('Parsing policy clauses using pdf-parse...'), 1500);
      setTimeout(() => setProgressText('AI Copilot is extracting coverage limits, waiting periods, and exclusions...'), 3500);

      const res = await api.post('/policy/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setProgressText('Policy registered in database successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (err) {
      console.error(err);
      const backendErr = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(backendErr);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-[#e6eef8]">
      {/* Back to Dashboard */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors duration-200 mb-6 font-bold text-xs"
      >
        <ArrowLeft size={14} />
        <span>Back to Dashboard</span>
      </button>

      <div className="neu-flat p-8 rounded-3xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-blue-400/5 rounded-full blur-3xl"></div>

        <div className="border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Upload Health Insurance Policy</h1>
          <p className="text-slate-500 text-xs mt-1 font-bold">
            Upload your health insurance policy schedule (PDF or TXT) to let our AI copilot extract and store limits, exclusions, and waiting periods.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/5 border border-rose-200/50 text-rose-600 p-4 rounded-2xl flex items-start space-x-3 text-xs font-semibold mb-6">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Extraction Failed:</span>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="mx-auto text-blue-500 animate-spin" size={40} />
            <h3 className="text-base font-extrabold text-slate-800">Analyzing Policy Schedule</h3>
            <p className="text-xs text-slate-500 font-bold animate-pulse-subtle max-w-md mx-auto">
              {progressText}
            </p>
            <div className="max-w-xs mx-auto bg-slate-200 h-1.5 rounded-full overflow-hidden mt-6 neu-inset">
              <div className="bg-blue-500 h-full w-2/3 animate-infinite-loading rounded-full shadow-inner"></div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 bg-[#e6eef8] neu-inset relative group">
              <input
                type="file"
                id="policyFile"
                accept=".pdf,.txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-[#e6eef8] neu-card flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all duration-300">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Click to select file or drag & drop here
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-bold">
                    Accepts Indian health policy PDFs or text files
                  </p>
                </div>
              </div>
            </div>

            {file && (
              <div className="bg-[#e6eef8] neu-card p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <FileText size={20} className="text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              </div>
            )}

            <button
              type="submit"
              disabled={!file}
              className="w-full flex justify-center items-center py-3.5 px-4 neu-btn-primary rounded-2xl font-bold text-xs shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Policy Extraction
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-slate-200/50 pt-6">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">AI Privacy Notice</h4>
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
            Your health insurance policy document is processed locally and securely analyzed by our Gemini AI service. Sensitive data is stored encrypted inside our database workspace.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadPolicy;
