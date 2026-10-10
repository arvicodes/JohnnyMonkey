import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import ExamCorrectionLiveReview from './ExamCorrectionLiveReview';

type Props = React.ComponentProps<typeof ExamCorrectionLiveReview>;

/** Lädt die schwere Korrektur-iframe erst bei Sichtbarkeit (oder per Klick). */
export default function LazyExamCorrectionLiveReview(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return;
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setActive(true);
      },
      { root: null, rootMargin: '280px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active]);

  return (
    <Box ref={hostRef} sx={{ minHeight: active ? undefined : 56 }}>
      {active ? (
        <ExamCorrectionLiveReview {...props} />
      ) : (
        <Box
          role="button"
          tabIndex={0}
          onClick={() => setActive(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActive(true);
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 56,
            bgcolor: '#fafafa',
            cursor: 'pointer',
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}
        >
          <CircularProgress size={18} sx={{ mr: 1 }} />
          Vorschau laden …
        </Box>
      )}
    </Box>
  );
}
