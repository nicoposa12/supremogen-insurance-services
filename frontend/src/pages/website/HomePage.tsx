import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

// Custom standalone SVGs for exact UI/UX matching
const CarIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

const FlameIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const ShipIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M2 21h20" />
    <path d="M19.3 14.8C21.1 13.5 22 11.7 22 9.5a5.5 5.5 0 0 0-4.4-5.4l-1.2-.2-1.7 4.2-2.2-2.3L10 8.5 7.8 6.2 6.1 10.4 4.9 10.2A5.5 5.5 0 0 0 0 15.6c0 2.2.9 4 2.7 5.2" />
    <path d="M19 14.8v3.7c0 .8-.7 1.5-1.5 1.5h-11C5.7 20 5 19.3 5 18.5v-3.7" />
    <path d="M12 5v3" />
    <path d="M10 6h4" />
  </svg>
);

const HeartPulseIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12h3.22l1.61-3.22L11.27 16l2.42-7.24 1.61 4.02h3.22" />
  </svg>
);

const CarIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

const FlameIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const ShipIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M2 21h20" />
    <path d="M19.3 14.8C21.1 13.5 22 11.7 22 9.5a5.5 5.5 0 0 0-4.4-5.4l-1.2-.2-1.7 4.2-2.2-2.3L10 8.5 7.8 6.2 6.1 10.4 4.9 10.2A5.5 5.5 0 0 0 0 15.6c0 2.2.9 4 2.7 5.2" />
    <path d="M19 14.8v3.7c0 .8-.7 1.5-1.5 1.5h-11C5.7 20 5 19.3 5 18.5v-3.7" />
    <path d="M12 5v3" />
    <path d="M10 6h4" />
  </svg>
);

const HeartPulseIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12h3.22l1.61-3.22L11.27 16l2.42-7.24 1.61 4.02h3.22" />
  </svg>
);

const HardHatIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M2 12a10 10 0 0 1 20 0v2H2Z" />
    <path d="M5 12V8a7 7 0 0 1 14 0v4" />
    <path d="M12 3v5" />
    <path d="M9 8h6" />
  </svg>
);

const ShieldCheckGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ClockGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const HeadphonesGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

const PesoIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M6 12h10" />
    <path d="M6 8h8" />
    <path d="M6 4h6a4 4 0 0 1 0 8H6v8" />
  </svg>
);

export default function HomePage() {
  const products = [
    {
      icon: <CarIconBlue />,
      title: 'Motorcar Insurance',
      desc: 'Full protection for your vehicle against loss, damage, and third-party liability.',
      link: '/products?id=motor'
    },
    {
      icon: <FlameIconBlue />,
      title: 'Fire Insurance',
      desc: 'Safeguard your home, office, or warehouse from fire and allied perils.',
      link: '/products?id=fire'
    },
    {
      icon: <ShipIconBlue />,
      title: 'Marine Insurance',
      desc: 'Protect cargo and shipments across local and international transit.',
      link: '/products?id=marine'
    },
    {
      icon: <HeartPulseIconBlue />,
      title: 'Personal Accident Insurance',
      desc: '24/7 protection against accidental injury, disability, and death.',
      link: '/products?id=accident'
    },
    {
      icon: <HardHatIconBlue />,
      title: "Contractor's All Risk Insurance",
      desc: 'Comprehensive protection for construction and engineering projects.',
      link: '/products?id=engineering'
    }
  ];

  const features = [
    {
      icon: <ShieldCheckGold />,
      title: 'Trusted Insurance Partner',
      desc: 'Decades of combined experience working with the country\'s most reputable underwriters.'
    },
    {
      icon: <ClockGold />,
      title: 'Fast Processing',
      desc: 'Same-day quotations and policy issuance for qualified accounts, with minimal paperwork.'
    },
    {
      icon: <HeadphonesGold />,
      title: 'Reliable Customer Support',
      desc: 'Dedicated account officers and a 24/7 emergency claims hotline.'
    },
    {
      icon: <PesoIconGold />,
      title: 'Affordable Solutions',
      desc: 'Competitive premiums, flexible payment terms, and bundled packages.'
    }
  ];

  const steps = [
    {
      number: 'STEP 01',
      title: 'Request a Quote',
      desc: 'Submit your details online or speak with an advisor.'
    },
    {
      number: 'STEP 02',
      title: 'Receive a Proposal',
      desc: 'Get a tailored insurance proposal within 24 hours.'
    },
    {
      number: 'STEP 03',
      title: 'Confirm Coverage',
      desc: 'Review terms, finalize cover, and settle payment.'
    },
    {
      number: 'STEP 04',
      title: 'Policy Issued',
      desc: 'Your policy documents are issued and emailed to you.'
    }
  ];

  const testimonials = [
    {
      quote: '"Supremogen handled our fire insurance renewal seamlessly. Their advisor explained every detail clearly and saved us 12% on premium."',
      author: 'Maria Santos',
      title: 'Small Business Owner, Pasig'
    },
    {
      quote: '"We\'ve used their contractor\'s all risk and surety bonds across three projects. Fast issuance and professional all the way."',
      author: 'Engr. Paolo Reyes',
      title: 'Project Manager, Quezon City'
    },
    {
      quote: '"Filed a claim after a minor accident and the process was painless. I had my car back in less than two weeks."',
      author: 'Carmen Dela Cruz',
      title: 'Private Motorist, Makati'
    }
  ];

  const news = [
    {
      date: 'MAY 2026',
      title: 'Supremogen partners with leading non-life insurer for SME packages',
      desc: 'Bundled fire, liability, and personal accident packages now available for small and medium enterprises nationwide.'
    },
    {
      date: 'MAR 2026',
      title: '24/7 claims hotline now live across the Philippines',
      desc: 'Policyholders can now reach our claims team any time of day for emergency assistance and roadside support.'
    },
    {
      date: 'JAN 2026',
      title: 'Online quotation portal launched',
      desc: 'Get an indicative quote for motorcar and personal accident insurance in under two minutes.'
    }
  ];

  return (
    <div className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="bg-hero-home text-white py-16 lg:py-24 relative overflow-hidden bg-dot-pattern">
        <div className="container-page relative z-10 grid lg:grid-cols-12 gap-12 items-center text-left">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 text-white rounded-full text-xs font-semibold uppercase tracking-wider">
              <span className="text-[#F5A623] font-bold">✦</span>
              Non-life Insurance · Philippines
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-none">
              Protection you can trust.
            </h1>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#F5A623] tracking-tight leading-none">
              Service you can count on.
            </h2>
            
            <p className="text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
              From motorcar and fire insurance to surety bonds and engineering cover, Supremogen helps Filipinos and Philippine businesses protect what matters most.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/inquiry"
                className="inline-flex items-center justify-center rounded-lg bg-[#F5A623] hover:bg-[#E2951B] text-[#4A0E17] px-6 py-3.5 text-sm font-bold transition shadow-sm gap-2"
              >
                Request a Quote
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-lg border border-white/25 hover:bg-white/10 text-white px-6 py-3.5 text-sm font-bold transition"
              >
                Contact Us
              </Link>
            </div>
            
            {/* Checked items row */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-6 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#F5A623] text-[#4A0E17]">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                <span>Accredited underwriters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#F5A623] text-[#4A0E17]">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                <span>24/7 claims hotline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#F5A623] text-[#4A0E17]">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                <span>Nationwide service</span>
              </div>
            </div>
          </div>

          {/* Hero Right Column: Floating 2x2 grid card */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/15 rounded-2xl p-6 shadow-2xl space-y-6">
              
              {/* Grid 2x2 */}
              <div className="grid grid-cols-2 gap-4">
                {/* Item 1 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 hover:bg-white/8 transition duration-200">
                  <CarIconGold />
                  <h4 className="font-bold text-white text-sm">Motorcar Insurance</h4>
                  <p className="text-[11px] text-white/60 leading-normal">
                    Full protection for your vehicle against loss, damage, and third-party liability.
                  </p>
                </div>
                {/* Item 2 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 hover:bg-white/8 transition duration-200">
                  <FlameIconGold />
                  <h4 className="font-bold text-white text-sm">Fire Insurance</h4>
                  <p className="text-[11px] text-white/60 leading-normal">
                    Safeguard your home, office, or warehouse from fire and allied perils.
                  </p>
                </div>
                {/* Item 3 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 hover:bg-white/8 transition duration-200">
                  <ShipIconGold />
                  <h4 className="font-bold text-white text-sm">Marine Insurance</h4>
                  <p className="text-[11px] text-white/60 leading-normal">
                    Protect cargo and shipments across local and international transit.
                  </p>
                </div>
                {/* Item 4 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 hover:bg-white/8 transition duration-200">
                  <HeartPulseIconGold />
                  <h4 className="font-bold text-white text-sm">Personal Accident</h4>
                  <p className="text-[11px] text-white/60 leading-normal">
                    24/7 protection against accidental injury, disability, and death.
                  </p>
                </div>
              </div>

              {/* Yellow full-width button */}
              <Link
                to="/inquiry"
                className="w-full py-3 px-4 bg-[#F5A623] hover:bg-[#E2951B] text-[#4A0E17] font-bold rounded-lg text-sm transition-all text-center block"
              >
                Get an indicative quote in under 2 minutes
              </Link>
            </div>
          </div>
          
        </div>
      </section>

      {/* Our Products Section */}
      <section className="section-y bg-slate-50 border-b border-slate-100">
        <div className="container-page text-center space-y-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">Our Products</div>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Insurance solutions for every Filipino need
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            From personal protection to enterprise-grade cover, we partner with the country's most trusted underwriters.
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-8 text-left">
            {products.map((prod, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-100 bg-white p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-50/50">
                    {prod.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{prod.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {prod.desc}
                  </p>
                </div>
                <div className="mt-4">
                  <Link
                    to={prod.link}
                    className="inline-flex items-center text-sm font-semibold text-[#4A0E17] hover:text-[#32090F] gap-1 group"
                  >
                    Learn more
                    <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}

            {/* View All Products Custom Card */}
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-center items-center text-center">
              <h3 className="text-lg font-bold text-[#4A0E17] hover:underline">
                <Link to="/products">View all products</Link>
              </h3>
              <p className="mt-2 text-xs text-slate-500 max-w-[200px] leading-relaxed">
                Surety bonds, liability, engineering &amp; more
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="section-y bg-white">
        <div className="container-page text-center space-y-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">Why Choose Us</div>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            A partner that puts policyholders first
          </h2>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-8 text-left">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-50">
                    {feat.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{feat.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-y bg-slate-50 border-y border-slate-100">
        <div className="container-page text-center space-y-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">How It Works</div>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            A simple, four-step process
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Get covered without the back-and-forth — from quote to policy in days, not weeks.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-8 text-left">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col space-y-3"
              >
                <span className="text-xs font-bold text-[#F5A623]">{step.number}</span>
                <h3 className="font-bold text-slate-900 text-base">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (Client Stories) Section */}
      <section className="section-y bg-white">
        <div className="container-page text-center space-y-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">Client Stories</div>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Trusted by individuals and businesses
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3 pt-8 text-left">
            {testimonials.map((test, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6"
              >
                <p className="text-sm text-slate-600 leading-relaxed italic">{test.quote}</p>
                <div className="pt-2">
                  <h4 className="font-bold text-slate-950 text-sm">{test.author}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{test.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News Section */}
      <section className="section-y bg-slate-50 border-t border-slate-100">
        <div className="container-page text-center space-y-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">Latest News</div>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Company updates
          </h2>

          <div className="grid gap-6 md:grid-cols-3 pt-8 text-left">
            {news.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#F5A623]">
                    {item.date}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Call To Action Section */}
      <section className="py-16 bg-white">
        <div className="container-page">
          <div className="rounded-3xl bg-[#3A0B12] p-10 md:p-14 text-center max-w-6xl mx-auto text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Ready to get protected?
              </h2>
              <p className="mx-auto max-w-xl text-white/80 text-sm sm:text-base leading-relaxed">
                Request a free, no-obligation quote today and let our advisors design the right cover for you.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <Link
                  to="/inquiry"
                  className="inline-flex items-center rounded-lg bg-[#F5A623] hover:bg-[#E2951B] px-6 py-3.5 text-sm font-bold text-[#4A0E17] transition shadow-sm gap-2"
                >
                  Request a Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition"
                >
                  Contact an Advisor
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
