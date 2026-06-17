import { useEffect, useState } from 'react';

interface UseIntersectionOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number;
}

export function useIntersection(
  ref: React.RefObject<Element>,
  options: UseIntersectionOptions = {}
): { isIntersecting: boolean } | null {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current?.ownerDocument?.defaultView?.IntersectionObserver) {
      return;
    }

    const IntersectionObserver = ref.current.ownerDocument.defaultView.IntersectionObserver;

    const observerInstance = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        root: options.root ?? null,
        rootMargin: options.rootMargin ?? '0px',
        threshold: options.threshold ?? 0,
      }
    );

    if (ref.current) {
      observerInstance.observe(ref.current);
    }

    return () => {
      observerInstance.disconnect();
    };
  }, [ref, options]);

  return { isIntersecting };
}