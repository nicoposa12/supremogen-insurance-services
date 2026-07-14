import { Link } from 'react-router-dom';

// Custom SVGs for About Page matching screenshots
const CompassIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const EyeIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const UsersIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const RibbonIconBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M12 15a6 6 0 1 0-6-6 6.002 6.002 0 0 0 6 9.002v.008" />
    <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
  </svg>
);

const ShieldCheckGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const HeartGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const MedalGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M12 15a6 6 0 1 0-6-6 6.002 6.002 0 0 0 6 9.002v.008" />
    <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
  </svg>
);

const HandshakeGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="m11 17 2 2a1 1 0 1 0 3-3" />
    <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
    <path d="m21 3 1 11h-2" />
    <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
    <path d="M3 4h8" />
  </svg>
);

export default function AboutPage() {
  const overviewCards = [
    {
      icon: <CompassIconBlue />,
      title: 'Our Mission',
      desc: (
        <ul className="list-disc pl-4 space-y-1.5 text-left text-slate-500">
          <li>At Supremogen Insurance Services, our primary focus is to provide our clients with a problem-solving approach that frees them from worries in the frustrating world of insurance services. One of our key priorities is providing efficient claims services.</li>
          <li>By continuously expanding our capacity, we ensure that we are well-equipped to handle the dynamics of the business environment.</li>
        </ul>
      )
    },
    {
      icon: <EyeIconBlue />,
      title: 'Our Vision',
      desc: (
        <ul className="list-disc pl-4 space-y-1.5 text-left text-slate-500">
          <li>We are committed to providing reliable insurance services, known for our exceptional service and unwavering commitment to our customers' needs.</li>
          <li>We aim to be the go-to choice for clients seeking trusted and affordable insurance, delivering peace of mind and financial protection.</li>
        </ul>
      )
    },
    {
      icon: <UsersIconBlue />,
      title: 'Goal',
      desc: (
        <ul className="list-disc pl-4 space-y-1.5 text-left text-slate-500">
          <li>Our goal is to provide outstanding insurance services that meet the diverse needs of our clients. We aim to build lasting relationships through exceptional service, continuous innovation, and a genuine commitment to helping our clients safeguard what matters most.</li>
        </ul>
      )
    },
    {
      icon: <RibbonIconBlue />,
      title: 'Core Values',
      desc: (
        <div className="space-y-1 text-left text-slate-500 font-semibold text-xs pl-2">
          <div><strong className="text-slate-800 font-extrabold text-sm">T</strong> &ndash; TRUST</div>
          <div><strong className="text-slate-800 font-extrabold text-sm">I</strong> &ndash; INNOVATION &amp; GROWTH</div>
          <div><strong className="text-slate-800 font-extrabold text-sm">P</strong> &ndash; PROTECTION &amp; PROFESSIONALISM</div>
          <div><strong className="text-slate-800 font-extrabold text-sm">S</strong> &ndash; SERVICE EXCELLENCE</div>
        </div>
      )
    }
  ];

  const coreValues = [
    {
      icon: <ShieldCheckGold />,
      title: 'Integrity',
      desc: 'We do what\'s right for our clients — every policy, every claim, every time.'
    },
    {
      icon: <HeartGold />,
      title: 'Client First',
      desc: 'Every recommendation is shaped around your needs, not our commissions.'
    },
    {
      icon: <MedalGold />,
      title: 'Excellence',
      desc: 'We hold ourselves to the highest standards of service and professionalism.'
    },
    {
      icon: <HandshakeGold />,
      title: 'Partnership',
      desc: 'We work with reputable underwriters to deliver dependable, long-term protection.'
    }
  ];

  return (
    <div className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="bg-hero-maroon text-white py-12 sm:py-16 lg:py-20 relative overflow-hidden">
        <div className="container-page relative z-10 text-left">
          <div className="max-w-3xl space-y-3.5">
            {/* Small Label */}
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">
              About Us
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Built on Trust. Driven by Service.
            </h1>
            
            <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
              Supremogen Insurance Services is a Philippine-based non-life insurance agency, dedicated to helping individuals and businesses safeguard what they've built.
            </p>
          </div>
        </div>
      </section>

      {/* Company Overview Section */}
      <section className="section-y bg-white">
        <div className="container-page grid gap-12 lg:grid-cols-12 text-left items-start">
          
          {/* Left Description Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">
              Company Overview
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 leading-snug sm:text-4xl">
              Insurance, simplified for Filipinos
            </h2>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed pt-2">
              Supremogen Insurance Services is the new non-life insurance agency with a team of highly experienced individuals in the non-life insurance field, and a total experience exceeding 6 years in the business industry.
            </p>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
              Our main area of expertise is in the field of Non-life Insurance. Offering different types of insurance coverage that provide financial security and protection during unforeseen events such as accidents, emergencies, and calamities and ensuring peace of mind of our clients.
            </p>
          </div>
          
          {/* Right 2x2 Grid Column */}
          <div className="lg:col-span-6 grid gap-5 sm:grid-cols-2">
            {overviewCards.map((card, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow space-y-3 flex flex-col justify-start"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-50">
                  {card.icon}
                </div>
                <h3 className="font-bold text-slate-950 text-base">{card.title}</h3>
                <div className="text-xs text-slate-500 leading-relaxed">{card.desc}</div>
              </div>
            ))}
          </div>
          
        </div>
      </section>

      {/* Core Values Section */}
      <section className="bg-slate-50 section-y border-y border-slate-100">
        <div className="container-page text-center space-y-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">
            Core Values
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            What we stand for
          </h2>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-8 text-left">
            {coreValues.map((val, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col space-y-3"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-50">
                  {val.icon}
                </div>
                <h3 className="font-bold text-slate-950 text-base">{val.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Call To Action Section */}
      <section className="py-20 bg-white">
        <div className="container-page">
          <div className="rounded-3xl bg-slate-50/50 border border-slate-100 p-10 md:p-14 text-center max-w-5xl mx-auto space-y-6">
            <h2 className="text-3xl font-extrabold text-[#4A0E17]">
              Let's protect what matters to you
            </h2>
            <p className="mx-auto max-w-xl text-slate-500 text-sm sm:text-base leading-relaxed">
              Speak with one of our advisors and get a tailored proposal — no obligation, no jargon.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link
                to="/inquiry"
                className="inline-flex items-center rounded-lg bg-[#4A0E17] hover:bg-[#32090F] px-6 py-3.5 text-sm font-bold text-white transition shadow-sm"
              >
                Request a Quote
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-700 transition"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
