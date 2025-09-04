import { useState, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useOnScreen = (ref: any) => {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    });

    if (ref.current) observer.observe(ref.current);

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref]);

  return isIntersecting;
};
