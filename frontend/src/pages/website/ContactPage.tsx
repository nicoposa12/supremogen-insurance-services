import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, Check } from 'lucide-react';
import axios from 'axios';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
      subject: formData.subject || 'General Contact',
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
          subject: '',
          message: ''
        });
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errorMsgs = Object.values(err.response.data.errors).flat().join(' ');
        setError(errorMsgs || 'Validation failed. Please check inputs.');
      } else {
        setError('Failed to send message. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white">
      {/* Header */}
      <section className="bg-hero-maroon text-white py-20 relative overflow-hidden">
        <div className="container-page relative z-10 text-left">
          <div className="max-w-3xl space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">
              Contact
            </div>
            <h1 className="text-4xl font-extrabold sm:text-5xl text-white tracking-tight leading-tight">
              We're here to help.
            </h1>
            <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl">
              Whether you need a quote, a renewal, or claims assistance, our team is one message away.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-y bg-white">
        <div className="container-page grid gap-10 lg:grid-cols-[40%_60%] text-left items-start">
          
          {/* Left panel: Info & Map */}
          <div className="space-y-5">
            {/* Address */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50/50 text-[#4A0E17]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Office Address
                  </div>
                  <div className="text-sm text-slate-800 leading-relaxed">
                    VILL STATE CORP BUILDING, 2ND FLR UNIT F&H BRGY, COMMONWEALTH , QUEZON CITY, PHILIPPINES, 1121
                  </div>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50/50 text-[#4A0E17]">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Phone
                  </div>
                  <div className="text-sm text-slate-800 leading-normal space-y-0.5">
                    <div>0994-364-2241 / 027-091-5125</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50/50 text-[#4A0E17]">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </div>
                  <div className="text-sm">
                    <a href="mailto:sales@supremogen.com" className="text-[#4A0E17] font-semibold hover:underline">
                      sales@supremogen.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50/50 text-[#4A0E17]">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Business Hours
                  </div>
                  <div className="text-sm text-slate-800">
                    Mon - Fri 9:00 AM - 6:00 PM
                  </div>
                </div>
              </div>
            </div>

            {/* Follow Us */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Follow Us
              </div>
              <div className="flex gap-2">
                <a
                  href="https://www.facebook.com/SupremogenInsuranceServices"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50/50 hover:text-[#4A0E17] transition-colors"
                >
                  <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/supremogeninsurance/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50/50 hover:text-[#4A0E17] transition-colors"
                >
                  <svg className="h-4.5 w-4.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@supremogeninsurancesrvcs"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50/50 hover:text-[#4A0E17] transition-colors"
                >
                  <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.16 1.02 1.15 2.45 1.89 3.93 2.14v3.83c-1.89-.04-3.72-.81-5.12-2.11-.1.29-.16.61-.17.92v9.3c.02 1.76-.56 3.49-1.66 4.82-1.25 1.48-3.15 2.37-5.13 2.38-1.92.02-3.8-.76-5.14-2.1-1.42-1.4-2.22-3.37-2.15-5.38C.72 13.91 2.3 11.23 4.8 10.3c1.55-.58 3.26-.61 4.83-.1v3.9c-1-.41-2.13-.39-3.11.1-.96.48-1.63 1.43-1.8 2.49-.24 1.54.58 3.07 1.95 3.75 1.15.57 2.54.51 3.63-.16.73-.45 1.18-1.24 1.2-2.1V0h.025z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Map Frame Card */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 shadow-sm h-60">
              <iframe
                title="Office Location"
                src="https://maps.google.com/maps?q=14.7053042,121.0799858&t=&z=17&ie=UTF8&iwloc=&output=embed"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              <a
                href="https://www.google.com/maps/place/SUPREMOGEN+INSURANCE+SERVICES/@14.7046518,121.0775247,16.55z/data=!4m6!3m5!1s0x3397bb84fe59fd6f:0xefe4038c37eadb97!8m2!3d14.7053042!4d121.0799858!16s%2Fg%2F11kj8pjh0y"
                target="_blank"
                rel="noreferrer"
                className="absolute top-3 left-3 bg-white/95 border border-slate-100 hover:bg-white text-[#4A0E17] font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition"
              >
                Open in Maps
                <span className="text-[10px] shrink-0">↗</span>
              </a>
            </div>
          </div>

          {/* Right panel: Contact Form */}
          <div className="rounded-2xl border border-slate-100 bg-white p-8 md:p-10 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-slate-900">Send us a message</h2>
              <p className="text-sm text-slate-500">We typically respond within 1 business day.</p>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm flex items-center gap-3">
                <Check className="h-5 w-5 bg-green-500 text-white rounded-full p-1 shrink-0" />
                <span>Thank you! Your message was sent successfully. We will get back to you soon.</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-left space-y-1.5 sm:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Full Name</span>
                  <input
                    required
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder=""
                  />
                </label>

                <label className="block text-left space-y-1.5 sm:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder=""
                  />
                </label>

                <label className="block text-left space-y-1.5 sm:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Phone Number</span>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder=""
                  />
                </label>

                <label className="block text-left space-y-1.5 sm:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Subject</span>
                  <input
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder=""
                  />
                </label>

                <label className="block text-left sm:col-span-2 space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Message</span>
                  <textarea
                    required
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder=""
                  ></textarea>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#4A0E17] hover:bg-[#32090F] px-6 py-3 text-sm font-bold text-white transition disabled:opacity-60 cursor-pointer shadow-sm mt-2"
              >
                <Send className="h-4.5 w-4.5" />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
          
        </div>
      </section>
    </div>
  );
}
