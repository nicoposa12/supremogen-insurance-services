import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, ChevronUp } from 'lucide-react';

// Standalone SVG Icons (Blue versions for Cards)
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

const ShieldCheckBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const FileEditBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

// Standalone SVG Icons (Gold versions for Details Page Hero)
const CarIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

const FlameIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const ShipIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
    <path d="M2 21h20" />
    <path d="M19.3 14.8C21.1 13.5 22 11.7 22 9.5a5.5 5.5 0 0 0-4.4-5.4l-1.2-.2-1.7 4.2-2.2-2.3L10 8.5 7.8 6.2 6.1 10.4 4.9 10.2A5.5 5.5 0 0 0 0 15.6c0 2.2.9 4 2.7 5.2" />
    <path d="M19 14.8v3.7c0 .8-.7 1.5-1.5 1.5h-11C5.7 20 5 19.3 5 18.5v-3.7" />
    <path d="M12 5v3" />
    <path d="M10 6h4" />
  </svg>
);

const HeartPulseIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12h3.22l1.61-3.22L11.27 16l2.42-7.24 1.61 4.02h3.22" />
  </svg>
);

const HardHatIconGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
    <path d="M2 12a10 10 0 0 1 20 0v2H2Z" />
    <path d="M5 12V8a7 7 0 0 1 14 0v4" />
    <path d="M12 3v5" />
    <path d="M9 8h6" />
  </svg>
);

const ShieldCheckGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const FileEditGold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A0E17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

interface FAQItem {
  q: string;
  a: string;
}

interface Product {
  id: string;
  goldIcon: React.ReactNode;
  blueIcon: React.ReactNode;
  title: string;
  longTitle: string;
  desc: string;
  detailDesc: string;
  coverages: string[];
  benefits: string[];
  eligibility: string[];
  faqs: FAQItem[];
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProductId = searchParams.get('id');

  const [faqStates, setFaqStates] = useState<Record<number, boolean>>({});

  const productsList: Product[] = [
    {
      id: 'motor',
      goldIcon: <CarIconGold />,
      blueIcon: <CarIconBlue />,
      title: 'Comprehensive Motorcar Insurance',
      longTitle: 'Comprehensive Motorcar Insurance',
      desc: 'Full protection for your vehicle against loss, damage, and third-party liability.',
      detailDesc: 'Comprehensive coverage for private and commercial vehicles, protecting you from accidents, theft, natural perils, and third-party claims on Philippine roads.',
      coverages: [
        'Own damage and theft',
        'Third-party bodily injury and property damage',
        'Acts of nature (typhoon, flood, earthquake)',
        'Auto passenger personal accident',
        '24/7 emergency roadside assistance'
      ],
      benefits: [
        'Wide network of accredited repair shops nationwide',
        'Fast and transparent claims processing',
        'Flexible payment terms',
        'No-claims discount on renewal'
      ],
      eligibility: [
        'Privately or commercially registered vehicles',
        'Vehicles up to 15 years old (case-to-case basis for older units)',
        'Valid LTO Certificate of Registration and OR'
      ],
      faqs: [
        {
          q: 'How soon can I file a claim after an accident?',
          a: 'You should notify us immediately or within 24 hours of the incident. Our emergency claims support is active 24/7 to guide you through towing and documentation.'
        },
        {
          q: 'Is Acts of Nature coverage included?',
          a: 'Yes. Our comprehensive package includes full coverage for Acts of Nature such as typhoon, flood, earthquake, and volcanic eruption.'
        }
      ]
    },
    {
      id: 'fire',
      goldIcon: <FlameIconGold />,
      blueIcon: <FlameIconBlue />,
      title: 'Fire Insurance',
      longTitle: 'Fire & Property Insurance',
      desc: 'Safeguard your home, office, or warehouse from fire and allied perils.',
      detailDesc: 'Secure your residential, commercial, or industrial properties against fire, earthquakes, typhoons, and other structural hazards.',
      coverages: [
        'Fire and lightning',
        'Earthquake, typhoon, and flood (optional)',
        'Explosion and impact damage',
        'Smoke damage',
        'Loss of rent (optional)'
      ],
      benefits: [
        'Tailored sum insured based on property valuation',
        'Coverage for both structure and contents',
        'Optional business interruption add-on'
      ],
      eligibility: [
        'Residential, commercial, and industrial properties',
        'Property within the Philippines',
        'Valid proof of ownership or lease'
      ],
      faqs: [
        {
          q: 'Does this cover earthquake damage?',
          a: 'Yes, earthquake shock and earthquake fire can be covered by adding the optional earthquake peril rider to your standard fire insurance policy.'
        },
        {
          q: 'Is Acts of Nature coverage included?',
          a: 'Yes, you can opt to include Acts of Nature coverages (typhoon, flood, hurricane) as add-ons to safeguard your property against natural disasters.'
        }
      ]
    },
    {
      id: 'marine',
      goldIcon: <ShipIconGold />,
      blueIcon: <ShipIconBlue />,
      title: 'Marine Insurance',
      longTitle: 'Marine Insurance',
      desc: 'Protect cargo and shipments across local and international transit.',
      detailDesc: 'Covers physical loss or damage to cargo shipped by sea, air, or land — for importers, exporters, and domestic shippers.',
      coverages: [
        'Marine cargo (Institute Cargo Clauses A, B, C)',
        'Air freight and inland transit',
        'War and strikes risks (optional)',
        'Container handling and warehousing'
      ],
      benefits: [
        'Annual open policies for frequent shippers',
        'Single-shipment policies available',
        'Worldwide claims support'
      ],
      eligibility: [
        'Importers, exporters, and domestic shippers',
        'Valid bill of lading or commercial invoice'
      ],
      faqs: [
        {
          q: 'Can I insure a single shipment?',
          a: 'Yes, we offer single-shipment policies for one-off transport needs, as well as annual open covers for regular importers and exporters.'
        }
      ]
    },
    {
      id: 'accident',
      goldIcon: <HeartPulseIconGold />,
      blueIcon: <HeartPulseIconBlue />,
      title: 'Personal Accident Insurance',
      longTitle: 'Personal Accident Insurance',
      desc: '24/7 protection against accidental injury, disability, and death.',
      detailDesc: 'Financial protection for you and your family against accidental death, permanent disability, and medical expenses arising from accidents.',
      coverages: [
        'Accidental death',
        'Permanent total or partial disability',
        'Medical reimbursement',
        'Daily hospital income (optional)',
        'Burial benefit'
      ],
      benefits: [
        'Worldwide 24/7 coverage',
        'Affordable annual premiums',
        'Family and group packages available'
      ],
      eligibility: [
        'Individuals aged 18 to 65 (renewable up to 70)',
        'Group plans available for employers and organizations'
      ],
      faqs: [
        {
          q: 'Does this replace health insurance?',
          a: 'No. While health insurance covers illnesses, a Personal Accident policy specifically covers injuries and accidental death or disablement.'
        }
      ]
    },
    {
      id: 'engineering',
      goldIcon: <HardHatIconGold />,
      blueIcon: <HardHatIconBlue />,
      title: "Contractor's All Risk Insurance",
      longTitle: "Contractor's All Risk Insurance",
      desc: 'Comprehensive protection for construction and engineering projects.',
      detailDesc: 'Covers physical damage to construction works and third-party liability throughout the project period — required by most developers and lenders.',
      coverages: [
        'Material damage to permanent and temporary works',
        'Construction plant, equipment, and machinery',
        'Third-party liability',
        'Removal of debris'
      ],
      benefits: [
        'Single policy covering all parties on site',
        'Project-duration based pricing',
        'Optional maintenance period extension'
      ],
      eligibility: [
        'Contractors, sub-contractors, and project owners',
        'Civil, structural, and mechanical projects'
      ],
      faqs: [
        {
          q: 'Who should be named as the insured?',
          a: 'The policy typically names the principal developer/owner, the main contractor, and all sub-contractors as joint insureds to cover all liabilities on site.'
        }
      ]
    },
    {
      id: 'liability',
      goldIcon: <ShieldCheckGold />,
      blueIcon: <ShieldCheckBlue />,
      title: 'General Liability Insurance',
      longTitle: 'General Liability Insurance',
      desc: 'Defends your business against third-party injury and property claims.',
      detailDesc: 'Protects businesses from legal liability for bodily injury or property damage to third parties arising from business operations or premises.',
      coverages: [
        'Premises liability',
        'Operations liability',
        'Products and completed operations (optional)',
        'Legal defense costs'
      ],
      benefits: [
        'Customizable limits based on industry risk',
        'Defense costs in addition to indemnity',
        'Worldwide jurisdiction options'
      ],
      eligibility: [
        'Registered Philippine businesses',
        'Retail, hospitality, manufacturing, and services'
      ],
      faqs: [
        {
          q: 'Does this cover employee injuries?',
          a: 'No. Employee injuries are typically covered by separate Workmen\'s Compensation or employer liability insurances, not by general third-party liability policies.'
        }
      ]
    },
    {
      id: 'surety',
      goldIcon: <FileEditGold />,
      blueIcon: <FileEditBlue />,
      title: 'Surety Bonds',
      longTitle: 'Surety Bonds',
      desc: 'Guarantee performance, payment, and compliance for projects and permits.',
      detailDesc: 'A range of surety bonds for contractors, suppliers, and businesses needing to guarantee performance or compliance with contractual or legal obligations.',
      coverages: [
        'Bid bonds',
        'Performance bonds',
        'Payment bonds',
        'Warranty / surety retention bonds',
        'Customs and court bonds'
      ],
      benefits: [
        'Same-day issuance for qualified accounts',
        'Competitive premium rates',
        'Accepted by major government and private principals'
      ],
      eligibility: [
        'Registered contractors and suppliers',
        'Valid business permits and financial documents'
      ],
      faqs: [
        {
          q: 'How quickly can a bond be issued?',
          a: 'For pre-qualified clients with standard document sets, simple bid or performance bonds can be printed and issued within a single business day.'
        }
      ]
    }
  ];

  // Helper to toggle faq accordions in details view
  const toggleFaq = (index: number) => {
    setFaqStates((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Find active product
  const activeProduct = productsList.find((p) => p.id === activeProductId);

  // If a product is selected, render the dedicated Detail view!
  if (activeProduct) {
    const otherProducts = productsList.filter((p) => p.id !== activeProduct.id);

    return (
      <div className="flex flex-col bg-white">
        {/* Detail Hero Section */}
        <section className="bg-hero-maroon text-white py-16 relative overflow-hidden">
          <div className="container-page relative z-10 text-left space-y-6">
            {/* Back link */}
            <Link
              to="/products"
              className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white transition gap-1.5"
            >
              ← ALL PRODUCTS
            </Link>

            {/* Title with icon box */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#F5A623] shrink-0">
                {activeProduct.goldIcon}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                {activeProduct.longTitle}
              </h1>
            </div>

            {/* Long description */}
            <p className="text-base sm:text-lg text-white/80 max-w-3xl leading-relaxed">
              {activeProduct.detailDesc}
            </p>
          </div>
        </section>

        {/* Detail Body Section */}
        <section className="section-y bg-white">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_320px] text-left items-start">
            
            {/* Left Column: Coverages, Benefits, Eligibility, FAQs */}
            <div className="space-y-12">
              {/* Coverage Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-[#4A0E17]">Coverage</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeProduct.coverages.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-[#F5A623] text-[#F5A623]">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="text-sm text-slate-700 leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-[#4A0E17]">Benefits</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeProduct.benefits.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-[#F5A623] text-[#F5A623]">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="text-sm text-slate-700 leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligibility Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold text-[#4A0E17]">Eligibility</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeProduct.eligibility.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-[#F5A623] text-[#F5A623]">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="text-sm text-slate-700 leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs Section */}
              {activeProduct.faqs.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-extrabold text-[#4A0E17]">Frequently Asked Questions</h2>
                  <div className="border border-slate-100 rounded-xl bg-white px-4 divide-y divide-slate-100">
                    {activeProduct.faqs.map((faq, index) => {
                      const isOpen = !!faqStates[index];
                      return (
                        <div key={index} className="py-4">
                          <button
                            type="button"
                            onClick={() => toggleFaq(index)}
                            className="flex w-full items-center justify-between font-semibold text-slate-900 text-sm sm:text-base hover:underline cursor-pointer text-left"
                          >
                            <span>{faq.q}</span>
                            {isOpen ? (
                              <ChevronUp className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <p className="mt-3 text-sm text-slate-500 leading-relaxed pr-8">
                              {faq.a}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky actions & Navigation list */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              
              {/* GET STARTED Card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#F5A623]">
                  Get Started
                </div>
                <h3 className="font-extrabold text-slate-900 text-xl leading-tight">
                  Request a quote
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Tell us a bit about your needs and we'll send a tailored proposal within 24 hours.
                </p>
                <div className="space-y-2 pt-2">
                  <Link
                    to={`/inquiry?product=${activeProduct.id}`}
                    className="w-full py-3 px-4 bg-[#4A0E17] hover:bg-[#32090F] text-white font-bold rounded-lg text-sm transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    Request a Quote
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/contact"
                    className="w-full py-3 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-sm transition-all text-center block"
                  >
                    Talk to an Advisor
                  </Link>
                </div>
              </div>

              {/* OTHER PRODUCTS Card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-6 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Other Products
                </div>
                <ul className="space-y-3 text-sm font-semibold">
                  {otherProducts.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setSearchParams({ id: p.id });
                          setFaqStates({});
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-[#4A0E17] hover:text-[#32090F] hover:underline transition text-left cursor-pointer"
                      >
                        {p.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

            </aside>

          </div>
        </section>
      </div>
    );
  }

  // Listing View (by default when no activeProductId is selected)
  return (
    <div className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="bg-hero-maroon text-white py-20 relative overflow-hidden">
        <div className="container-page relative z-10 text-left">
          <div className="max-w-3xl space-y-4">
            {/* Small Label */}
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">
              Products &amp; Services
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Insurance built for Philippine realities
            </h1>
            
            <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl">
              A complete portfolio of non-life insurance products from the country's most trusted underwriters.
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid Section */}
      <section className="section-y bg-white">
        <div className="container-page text-left">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {productsList.map((prod) => (
              <div
                key={prod.id}
                className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-50/50">
                    {prod.blueIcon}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900 leading-snug">
                    {prod.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {prod.desc}
                  </p>
                </div>
                <div className="mt-6 pt-2">
                  <button
                    onClick={() => {
                      setSearchParams({ id: prod.id });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center text-sm font-semibold text-[#4A0E17] hover:text-[#32090F] gap-1 group cursor-pointer"
                  >
                    Learn more
                    <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
