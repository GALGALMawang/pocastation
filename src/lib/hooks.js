import { useState, useEffect } from 'react';

/**
 * 뷰포트 너비가 breakpoint(기본 768px) 미만이면 true.
 * window.innerWidth를 한 번 읽고 마는 대신 resize 이벤트에 반응한다.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}
