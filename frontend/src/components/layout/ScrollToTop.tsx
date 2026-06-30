import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Scroll to top smoothly on page navigation or query parameter update
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, search]);

  return null;
}
