import React from 'react';
import { Box, Typography } from '@mui/material';
import { beAHeroDraftSectionStyle, type BeAHeroDraftSectionKey } from '../lib/beAHeroUi';

type Props = {
  sectionKey: BeAHeroDraftSectionKey;
  title: string;
  hint?: string;
  badge?: string;
  children: React.ReactNode;
};

export function BeAHeroDraftSection({ sectionKey, title, hint, badge, children }: Props) {
  const style = beAHeroDraftSectionStyle(sectionKey);

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: style.borderColor,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      }}
    >
      <Box
        sx={{
          px: 1.15,
          py: 0.65,
          display: 'flex',
          alignItems: 'center',
          gap: 0.85,
          background: style.headerBg,
          borderBottom: '1px solid',
          borderColor: style.borderColor,
        }}
      >
        <Box
          sx={{
            width: 4,
            height: 20,
            borderRadius: 99,
            bgcolor: style.accentMain,
            flexShrink: 0,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', color: style.labelColor, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.25, mt: 0.1 }}>
              {hint}
            </Typography>
          ) : null}
        </Box>
        {badge ? (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              color: style.labelColor,
              bgcolor: 'rgba(255,255,255,0.72)',
              px: 0.75,
              py: 0.2,
              borderRadius: 99,
              border: '1px solid',
              borderColor: style.borderColor,
              flexShrink: 0,
            }}
          >
            {badge}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ p: 1.1, bgcolor: style.bodyBg }}>{children}</Box>
    </Box>
  );
}
