import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail, MapPin, Sun, Moon } from 'lucide-react';
import logoImg from '../../assets/image/supremogen_logo.jpg';

export default function WebsiteLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme((localStorage.getItem('theme') as 'light' | 'dark') || 'light');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event('theme-changed'));
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Products', path: '/products' },
    { name: 'FAQs', path: '/faqs' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-md transition-all">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src={logoImg}
              alt="Supremogen Logo"
              className="h-9 w-9 object-cover rounded-md shrink-0 border border-slate-100"
            />
            <span className="flex min-w-0 flex-col leading-tight text-left">
              <span className="truncate text-sm font-bold text-slate-900">SUPREMOGEN</span>
              <span className="truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Insurance Services
              </span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`relative py-2 text-sm font-medium transition-colors hover:text-[#4A0E17] ${
                    active ? 'text-[#4A0E17] font-semibold' : 'text-slate-500'
                  } group`}
                >
                  {link.name}
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-[#4A0E17] transition-all duration-300 ${
                      active ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/inquiry"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
            >
              Request a Quote
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            className="grid h-10 w-10 place-items-center rounded-md border border-border md:hidden hover:bg-slate-50"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu panel */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-white shadow-lg absolute w-full left-0 py-4 px-4 space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive(link.path)
                      ? 'bg-slate-50 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="border-t border-border pt-4 flex flex-col gap-2">
              <Link
                to="/inquiry"
                onClick={() => setIsMenuOpen(false)}
                className="block text-center px-4 py-2.5 rounded-md text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 shadow-sm"
              >
                Request a Quote
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-border bg-slate-50">
        <div className="container-page grid gap-10 py-14 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-left">
          {/* Logo & Intro */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src={logoImg}
                alt="Supremogen Logo"
                className="h-9 w-9 object-cover rounded-md shrink-0 border border-slate-100"
              />
              <div className="leading-tight">
                <div className="text-sm font-bold text-slate-900">SUPREMOGEN</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Insurance Services
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A Philippine-based non-life insurance agency partnering with the country's most trusted underwriters to deliver reliable, affordable, and personalized insurance solutions.
            </p>
            <div className="flex gap-2 pt-2">
              <a
                href="https://www.facebook.com/SupremogenInsuranceServices"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/supremogeninsuranceservices/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@supremogeninsurancesrvcs?lang=en"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.16 1.02 1.15 2.45 1.89 3.93 2.14v3.83c-1.89-.04-3.72-.81-5.12-2.11-.1.29-.16.61-.17.92v9.3c.02 1.76-.56 3.49-1.66 4.82-1.25 1.48-3.15 2.37-5.13 2.38-1.92.02-3.8-.76-5.14-2.1-1.42-1.4-2.22-3.37-2.15-5.38C.72 13.91 2.3 11.23 4.8 10.3c1.55-.58 3.26-.61 4.83-.1v3.9c-1-.41-2.13-.39-3.11.1-.96.48-1.63 1.43-1.8 2.49-.24 1.54.58 3.07 1.95 3.75 1.15.57 2.54.51 3.63-.16.73-.45 1.18-1.24 1.2-2.1V0h.025z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Quick Links</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition">Home</Link></li>
              <li><Link to="/about" className="hover:text-primary transition">About Us</Link></li>
              <li><Link to="/products" className="hover:text-primary transition">Products</Link></li>
              <li><Link to="/faqs" className="hover:text-primary transition">FAQs</Link></li>
              <li><Link to="/inquiry" className="hover:text-primary transition">Request a Quote</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition">Contact</Link></li>
            </ul>
          </div>

          {/* Insurance Services */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Insurance Services</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/products?id=motor" className="hover:text-primary transition">Motorcar Insurance</Link></li>
              <li><Link to="/products?id=fire" className="hover:text-primary transition">Fire Insurance</Link></li>
              <li><Link to="/products?id=marine" className="hover:text-primary transition">Marine Insurance</Link></li>
              <li><Link to="/products?id=accident" className="hover:text-primary transition">Personal Accident Insurance</Link></li>
              <li><Link to="/products?id=engineering" className="hover:text-primary transition">Contractor's All Risk Insurance</Link></li>
              <li><Link to="/products?id=liability" className="hover:text-primary transition">General Liability Insurance</Link></li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>VILL STATE CORP BUILDING, 2ND FLR UNIT F&amp;H BRGY, COMMONWEALTH , QUEZON CITY, PHILIPPINES, 1121</span>
              </li>
              <li className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>0994-364-2241 / 027-091-5125</span>
              </li>
              <li className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:sales@supremogen.com" className="hover:text-primary transition">sales@supremogen.com</a>
              </li>
              <li className="text-xs pt-1 border-t border-slate-200">
                Mon – Fri · 9:00 AM – 6:00 PM
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-border bg-slate-100">
          <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground md:flex-row">
            <p>&copy; {new Date().getFullYear()} Supremogen Insurance Services. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary transition">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition">Terms &amp; Conditions</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Dark/Light Mode Toggle (Bottom Right) */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 shadow-xl backdrop-blur-md text-slate-700 dark:text-slate-200 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group"
        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      >
        {theme === 'light' ? (
          <Moon className="h-5.5 w-5.5 transition-transform duration-300 group-hover:rotate-12" />
        ) : (
          <Sun className="h-5.5 w-5.5 transition-transform duration-300 group-hover:rotate-45" />
        )}
      </button>
    </div>
  );
}
