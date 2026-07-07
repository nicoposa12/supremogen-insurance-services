import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../components/ui/Toast';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Password strength requirements check
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isStrongPassword = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!isStrongPassword) {
      setError('Please ensure your password meets all strength requirements.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/v1/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      if (response.data.success) {
        setSuccess(true);
        showToast('Password reset successfully. You can now login.', 'success');
        setTimeout(() => {
          navigate('/agentportal');
        }, 3000);
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0] as string[];
        setError(firstError[0] || 'Validation failed.');
      } else {
        setError('Failed to reset password. The link may have expired.');
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
              Choose New Password
            </h2>
            <p className="text-sm text-slate-200 font-medium">
              Create a strong password to protect your account.
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
            <h3 className="text-2xl font-bold text-[#4A0E17]">Reset Password</h3>
            <p className="text-xs text-slate-500 mt-1">Please enter and confirm your new password below.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-6 text-center py-6">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm leading-relaxed">
                Your password has been reset successfully! Redirecting you to the login page...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Focus Triggered Password Requirements Checklist */}
                {isPasswordFocused && (
                  <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs animate-scale-in">
                    <p className="font-bold text-slate-700 mb-1.5">Password requirements:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>At least 8 characters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${hasUppercase ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={hasUppercase ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>One uppercase letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${hasLowercase ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={hasLowercase ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>One lowercase letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${hasNumber ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>One number</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:col-span-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${hasSpecialChar ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={hasSpecialChar ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>One special character (e.g. @, #, $, %)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
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
