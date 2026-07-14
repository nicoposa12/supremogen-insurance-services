import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = [
    { id: 'general', label: 'General' },
    { id: 'insurance-products', label: 'Insurance Products' },
    { id: 'claims', label: 'Claims' },
    { id: 'policies', label: 'Policies' },
    { id: 'payments', label: 'Payments' },
    { id: 'renewals', label: 'Renewals' }
  ];

  const faqItems = {
    general: [
      {
        id: 'gen-1',
        q: 'Who is Supremogen Insurance Services?',
        a: 'Supremogen Insurance Services is a Philippine-based non-life insurance agency offering motor, fire, marine, personal accident, liability, engineering, and surety bond products from reputable underwriters. We focus on a problem-solving approach to simplify insurance and provide efficient services for our clients.'
      },
      {
        id: 'gen-2',
        q: 'Where is your office located?',
        a: 'Our office is located at Vill State Corp Building, 2nd Flr Unit F&H Brgy. Commonwealth, Quezon City, Philippines, 1121.'
      },
      {
        id: 'gen-3',
        q: 'What are your business hours?',
        a: 'Monday to Friday, 9:00 AM – 6:00 PM.'
      }
    ],
    'insurance-products': [
      {
        id: 'prod-1',
        q: 'What types of insurance do you offer?',
        a: 'We offer motorcar, fire, marine, personal accident, contractor\'s all risk, general liability insurance, and surety bonds.'
      },
      {
        id: 'prod-2',
        q: 'Can I bundle multiple policies?',
        a: 'Yes. Bundled policies often qualify for preferential premium rates — request a quote and our advisor will tailor a package for you.'
      },
      {
        id: 'prod-3',
        q: 'Is Comprehensive Insurance required?',
        a: 'While not always legally required, it\'s highly recommended to protect your vehicle from unexpected financial losses.'
      },
      {
        id: 'prod-4',
        q: 'Does it cover floods?',
        a: 'Yes, when your policy includes Acts of Nature coverage.'
      }
    ],
    claims: [
      {
        id: 'claim-1',
        q: 'How do I file a claim?',
        a: 'Notify us within 24 hours via our claims hotline or email. Our claims officer will guide you through documentation and assessment.'
      },
      {
        id: 'claim-2',
        q: 'How long does claim settlement take?',
        a: 'Once complete documents are submitted, most claims are resolved within 15 working days, subject to the underwriter\'s assessment.'
      }
    ],
    policies: [
      {
        id: 'policy-1',
        q: 'Can I cancel my policy?',
        a: 'Yes. Policies may be cancelled subject to the short-period scale applied by the underwriter. Unused premium is refunded where applicable.'
      },
      {
        id: 'policy-2',
        q: 'Can I make changes to my policy mid-term?',
        a: 'Yes, through an endorsement. Common changes include change of address, additional vehicles, or increase in sum insured.'
      },
      {
        id: 'policy-3',
        q: 'How long does processing take?',
        a: 'Most quotations are prepared quickly, and policy issuance is completed as soon as requirements are complete.'
      }
    ],
    payments: [
      {
        id: 'pay-1',
        q: 'What payment methods do you accept?',
        a: 'We accept bank transfer, online banking, credit card, GCash, and Maya. Cheque payments are accepted at our office.'
      },
      {
        id: 'pay-2',
        q: 'Can I pay in installments?',
        a: 'Yes! We offer flexible payment options, including eligible 0% interest installment plans.'
      }
    ],
    renewals: [
      {
        id: 'ren-1',
        q: 'When should I renew my policy?',
        a: 'We recommend renewing at least 7 days before expiry to avoid any lapse in coverage. We send renewal reminders 30 days in advance.'
      },
      {
        id: 'ren-2',
        q: 'Are there discounts for renewal?',
        a: 'Yes — qualified clients enjoy a no-claims discount and loyalty preferential rates on renewal.'
      }
    ]
  };

  const toggleAccordion = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col bg-background">
      {/* Header */}
      <section className="bg-hero-maroon text-white py-20 relative overflow-hidden">
        <div className="container-page relative z-10 text-left">
          <div className="max-w-3xl space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5A623]">
              FAQs
            </div>
            <h1 className="text-4xl font-extrabold sm:text-5xl text-white tracking-tight leading-tight">
              Questions, answered.
            </h1>
            <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl">
              Quick answers to the things our clients ask most. Can't find what you're looking for?{' '}
              <Link to="/contact" className="text-[#F5A623] hover:underline font-semibold">
                Get in touch
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* FAQs Main Content */}
      <section className="section-y bg-white">
        <div className="container-page grid gap-10 lg:grid-cols-[260px_1fr] text-left">
          {/* Categories Sticky Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </div>
            <ul className="space-y-1.5 text-sm">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`#${cat.id}`}
                    onClick={(e) => handleScrollToSection(e, cat.id)}
                    className="block rounded-md px-3 py-2 text-slate-600 font-semibold hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    {cat.label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          {/* FAQ Sections */}
          <div className="space-y-10">
            {categories.map((cat) => (
              <div key={cat.id} id={cat.id} className="scroll-mt-24 space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900 border-b border-border pb-2">
                  {cat.label}
                </h2>
                
                <div className="rounded-xl border border-border bg-card px-4">
                  {faqItems[cat.id as keyof typeof faqItems]?.map((item, index) => {
                    const isLast = index === faqItems[cat.id as keyof typeof faqItems].length - 1;
                    const isOpen = openId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`${!isLast ? 'border-b border-border' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleAccordion(item.id)}
                          className="flex w-full items-center justify-between py-4 cursor-pointer hover:underline text-left text-sm sm:text-base font-semibold text-slate-900"
                        >
                          <span className="flex items-center gap-3 pr-4">
                            <HelpCircle className="h-4.5 w-4.5 text-primary shrink-0" />
                            {item.q}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="pb-4 pt-1 text-sm text-slate-600 leading-relaxed pr-8">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
