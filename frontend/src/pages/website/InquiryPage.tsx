import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Check, ShieldAlert } from 'lucide-react';
import axios from 'axios';

export default function InquiryPage() {
  const [searchParams] = useSearchParams();
  const initialProduct = searchParams.get('product') || '';

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    product_type: initialProduct,
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const product = searchParams.get('product');
    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_type: product
      }));
    }
  }, [searchParams]);

  function getProductLabel(val: string) {
    switch (val) {
      case 'motor':
        return 'Motorcar Insurance';
      case 'fire':
        return 'Fire Insurance';
      case 'marine':
        return 'Marine Cargo & Hull Insurance';
      case 'accident':
        return 'Personal Accident Insurance';
      case 'engineering':
        return "Contractor's All Risk Insurance";
      case 'liability':
        return 'General Liability Insurance';
      case 'surety':
        return 'Surety Bonds';
      default:
        return 'Insurance Product';
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Map fields for backend API
    const apiData = {
      name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      subject: `Quote Request for ${getProductLabel(formData.product_type)}`,
      message: formData.message
    };

    try {
      const response = await axios.post('/api/v1/inquiries', apiData);
      if (response.data.success) {
        setSuccess(true);
        setFormData({
          full_name: '',
          email: '',
          phone: '',
          product_type: '',
          message: ''
        });
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errorMsgs = Object.values(err.response.data.errors).flat().join(' ');
        setError(errorMsgs || 'Validation failed. Please check inputs.');
      } else {
        setError('Failed to submit quote request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-background">
      {/* Header */}
      <section className="bg-hero-maroon text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="container-page relative z-10 text-left">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7bf48]">Request Quote</div>
            <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl text-white">
              Request a quote
            </h1>
            <p className="mt-5 text-lg text-white/80">
              Tell us a bit about what you'd like to insure. We'll get back to you with a tailored proposal within 1 business day.
            </p>
          </div>
        </div>
      </section>

      <section className="section-y bg-slate-50/50">
        <div className="container-page flex justify-center">
          <div className="w-full max-w-[620px]">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg md:p-8 space-y-6"
            >
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-xl text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="h-5 w-5 bg-green-500 text-white rounded-full p-1 shrink-0" />
                    <span>Quote Request Submitted!</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    We have received your quotation request details. One of our licensed insurance advisors will review the parameters and email you a competitive custom quote package.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex gap-2 items-center">
                  <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-left space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Full Name *</span>
                  <input
                    required
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-[#4A0E17] focus:ring-2 focus:ring-[#4A0E17]/20"
                    placeholder=""
                  />
                </label>

                <label className="block text-left space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Email *</span>
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-[#4A0E17] focus:ring-2 focus:ring-[#4A0E17]/20"
                    placeholder=""
                  />
                </label>

                <label className="block text-left space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Phone Number *</span>
                  <input
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-[#4A0E17] focus:ring-2 focus:ring-[#4A0E17]/20"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </label>

                <label className="block text-left space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Preferred Insurance Type *</span>
                  <select
                    required
                    name="product_type"
                    value={formData.product_type}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:outline-none focus:border-[#4A0E17] focus:ring-2 focus:ring-[#4A0E17]/20"
                  >
                    <option value="" disabled>Select a product</option>
                    <option value="motor">Comprehensive Motorcar Insurance</option>
                    <option value="fire">Fire Insurance</option>
                    <option value="marine">Marine Insurance</option>
                    <option value="accident">Personal Accident Insurance</option>
                    <option value="engineering">Contractor's All Risk Insurance</option>
                    <option value="liability">General Liability Insurance</option>
                    <option value="surety">Surety Bonds</option>
                    <option value="other">Other / Not sure</option>
                  </select>
                </label>

                <label className="block text-left sm:col-span-2 space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Message *</span>
                  <textarea
                    required
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-[#4A0E17] focus:ring-2 focus:ring-[#4A0E17]/20"
                    placeholder="Tell us about what you'd like to insure and any specific requirements."
                  ></textarea>
                </label>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-500 leading-normal text-left">
                  By submitting this form, you agree to be contacted by a Supremogen advisor regarding your inquiry.
                </p>

                <div className="text-left">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#4A0E17] hover:bg-[#32090F] px-5 py-3 text-sm font-bold text-white transition disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                    {loading ? 'Submitting...' : 'Submit Inquiry'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
