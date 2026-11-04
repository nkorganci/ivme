import { useLayoutEffect, useRef } from 'react';

/** Both exam and practice use the actual space below headers, banners and the dev toolbar. */
export function useQuestionViewport() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const page = ref.current;
    if (!page) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const measure = () => {
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const height = Math.max(160, Math.floor(bottom - page.getBoundingClientRect().top - 4));
      const value = `${height}px`;
      if (page.style.getPropertyValue('--question-viewport-height') !== value)
        page.style.setProperty('--question-viewport-height', value);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page.parentElement);
    document.querySelectorAll('.dev-account-switcher, .mobilebar, .student-account-banner').forEach(el => observer.observe(el));
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer.disconnect();window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);
  return ref;
}
