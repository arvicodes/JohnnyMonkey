import React from 'react';
import { Box, Switch, Typography } from '@mui/material';

export type BeAHeroFeatureTheme = {
  main: string;
  deep: string;
  tint: string;
  border: string;
  headerBg: string;
  bodyBg: string;
};

export const BE_A_HERO_TABATA_THEME: BeAHeroFeatureTheme = {
  main: '#e65100',
  deep: '#bf360c',
  tint: '#fff8f0',
  border: 'rgba(230, 81, 0, 0.42)',
  headerBg: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
  bodyBg: 'rgba(255, 243, 224, 0.72)',
};

export const BE_A_HERO_RANDOM_THEME: BeAHeroFeatureTheme = {
  main: '#5e35b1',
  deep: '#4527a0',
  tint: '#f8f5ff',
  border: 'rgba(94, 53, 177, 0.4)',
  headerBg: 'linear-gradient(135deg, #ede7f6 0%, #b39ddb 100%)',
  bodyBg: 'rgba(237, 231, 246, 0.72)',
};

type ToggleProps = {
  theme: BeAHeroFeatureTheme;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

export function BeAHeroFeatureToggle({
  theme,
  icon,
  title,
  subtitle,
  enabled,
  onToggle,
}: ToggleProps) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1.5px solid',
        borderColor: enabled ? theme.border : 'rgba(15, 23, 42, 0.1)',
        overflow: 'hidden',
        bgcolor: enabled ? theme.tint : '#f8fafc',
        boxShadow: enabled ? `0 4px 14px ${theme.main}1a` : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => onToggle(!enabled)}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 0.85,
          px: 1,
          py: 0.65,
          border: 0,
          cursor: 'pointer',
          bgcolor: enabled ? theme.headerBg : 'transparent',
          textAlign: 'left',
          transition: 'background 0.2s ease',
          '&:hover': {
            filter: enabled ? 'brightness(0.98)' : 'none',
            bgcolor: enabled ? theme.headerBg : 'rgba(15, 23, 42, 0.03)',
          },
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: enabled ? theme.main : 'rgba(15, 23, 42, 0.08)',
            color: enabled ? '#fff' : theme.deep,
            flexShrink: 0,
            boxShadow: enabled ? `0 2px 8px ${theme.main}44` : 'none',
            '& .MuiSvgIcon-root': { fontSize: 17 },
          }}
        >
          {icon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.76rem',
              letterSpacing: '0.03em',
              color: enabled ? theme.deep : 'text.secondary',
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="caption"
              sx={{
                color: enabled ? theme.main : 'text.disabled',
                fontSize: '0.64rem',
                display: 'block',
                lineHeight: 1.25,
                mt: 0.1,
              }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        <Switch
          size="small"
          checked={enabled}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          sx={{
            m: 0,
            flexShrink: 0,
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: theme.main,
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: theme.main,
              opacity: 0.55,
            },
          }}
        />
      </Box>
    </Box>
  );
}

type BodyProps = {
  theme: BeAHeroFeatureTheme;
  children: React.ReactNode;
};

export function BeAHeroFeatureBody({ theme, children }: BodyProps) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1.5px solid',
        borderColor: theme.border,
        overflow: 'hidden',
        bgcolor: theme.tint,
        boxShadow: `0 4px 14px ${theme.main}1a`,
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.85,
          bgcolor: theme.bodyBg,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
export const beAHeroFeatureSectionLabelSx = (color: string) =>
  ({
    fontWeight: 800,
    color,
    fontSize: '0.64rem',
    letterSpacing: '0.06em',
    display: 'block',
    mb: 0.35,
    mt: 0.15,
  }) as const;
