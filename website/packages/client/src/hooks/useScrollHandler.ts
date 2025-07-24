import { useEffect, useState } from 'react';

export function useScrollHandler(
  containerRef: React.RefObject<HTMLDivElement>,
  deps: unknown[] = []
) {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowScrollButton(el.scrollHeight > el.clientHeight);
      setAtBottom(Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 5);
    };

    handleScroll();
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...deps]); // ← serialize the dependency array

  return { showScrollButton, atBottom };
}
