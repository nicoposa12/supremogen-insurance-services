import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please verify your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative backdrop - clean geometric grid mimicking the inspiration image */}
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-slate-200/30 to-transparent pointer-events-none"></div>

      {/* Decorative geometric accent on the right */}
      <div className="absolute right-[-10%] top-[10%] w-[40%] h-[80%] opacity-20 pointer-events-none hidden lg:block">
        <div className="grid grid-cols-3 gap-6 rotate-[15deg]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-300 rounded-3xl shadow-md border border-slate-200"></div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 grid grid-cols-1 md:grid-cols-10">

        {/* Left Branding Panel (Brand Maroon & Warm Gold Gradient) */}
        <div className="md:col-span-4 bg-gradient-to-br from-[#4A0E17] via-[#5D121D] to-[#250408] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden min-h-[320px] md:min-h-auto">
          {/* Subtle gold ambient glow in the background */}
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
              User Login
            </h2>
            <p className="text-sm text-slate-200 font-medium">
              Get the best care from us.
            </p>
            <div className="w-12 h-1 bg-yellow-500 rounded-full"></div>
          </div>

          <div className="relative z-10 pt-8 text-[11px] text-slate-400">
            © {new Date().getFullYear()} Supremogen. All rights reserved.
          </div>
        </div>

        {/* Right Login Form Panel (Clean White / Light Slate) */}
        <div className="md:col-span-6 p-8 sm:p-10 flex flex-col justify-center bg-white text-left">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#4A0E17]">Welcome back!</h3>
            <p className="text-xs text-slate-500 mt-1">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Email or Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all"
                  placeholder="Email address or full name..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <a href="#" className="text-xs text-[#4A0E17] hover:underline font-semibold">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-xl text-sm font-bold text-white bg-[#4A0E17] hover:bg-[#3D0B12] disabled:bg-[#4A0E17]/60 transition shadow-lg shadow-[#4A0E17]/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Authenticating...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="text-center mt-6 relative z-10">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Corporate Site
        </a>
      </div>
    </div>
  );
}
