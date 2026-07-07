import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../components/ui/Toast';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await axios.post('/api/v1/auth/forgot-password', { email });
      if (response.data.success) {
        setSuccess(true);
        showToast('Reset link sent successfully.', 'success');
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to send reset link. Please check the email and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative backdrop */}
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-slate-200/30 to-transparent pointer-events-none"></div>

      <div className="max-w-4xl w-full mx-auto bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 grid grid-cols-1 md:grid-cols-10">

        {/* Left Branding Panel */}
        <div className="md:col-span-4 bg-gradient-to-br from-[#4A0E17] via-[#5D121D] to-[#250408] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden min-h-[320px] md:min-h-auto">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl"></div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Supremogen Logo" className="h-12 w-12 object-cover rounded-xl border border-white/10 shadow-md" />
              <div>
                <h1 className="text-lg font-bold tracking-tight">SUPREMOGEN</h1>
                <p className="text-[9px] text-slate-300 uppercase tracking-widest font-semibold">Insurance Services</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4 mt-8 md:mt-0">
            <h2 className="text-2xl font-extrabold leading-tight text-white">
              Reset Password
            </h2>
            <p className="text-sm text-slate-200 font-medium">
              Recover your account credentials securely.
            </p>
            <div className="w-12 h-1 bg-yellow-500 rounded-full"></div>
          </div>

          <div className="relative z-10 pt-8 text-[11px] text-slate-400">
            © {new Date().getFullYear()} Supremogen. All rights reserved.
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-6 p-8 sm:p-10 flex flex-col justify-center bg-white text-left">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#4A0E17]">Forgot Password?</h3>
            <p className="text-xs text-slate-500 mt-1">Enter your email and we'll send you a link to reset your password.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm leading-relaxed">
                We have emailed your password reset link! Please check your inbox (or the local server log at <code className="bg-emerald-100/65 px-1 py-0.5 rounded font-mono text-xs text-emerald-800">backend/storage/logs/laravel.log</code>) to retrieve the link.
              </div>
              <Link
                to="/agentportal"
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-xl text-sm font-bold text-white bg-[#4A0E17] hover:bg-[#3D0B12] transition shadow-lg shadow-[#4A0E17]/20 cursor-pointer"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all"
                    placeholder="Enter your email address..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-xl text-sm font-bold text-white bg-[#4A0E17] hover:bg-[#3D0B12] disabled:bg-[#4A0E17]/60 transition shadow-lg shadow-[#4A0E17]/20 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Sending Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <Link to="/agentportal" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
