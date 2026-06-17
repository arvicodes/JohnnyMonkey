import React from 'react';
import { Box } from '@mui/material';
import { beAHeroWorkoutIconMeta } from '../lib/beAHeroWorkoutIcon';

type BeAHeroWorkoutIconProps = {
  name: string;
  size?: number;
};

export function BeAHeroWorkoutIcon({ name, size = 36 }: BeAHeroWorkoutIconProps) {
  const { Icon, initials, color } = beAHeroWorkoutIconMeta(name);
  const iconSize = Math.round(size * 0.52);
  const initialsSize = initials.length > 1 ? size * 0.34 : size * 0.4;

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: `${color}40`,
        bgcolor: `${color}14`,
        backgroundImage: `linear-gradient(145deg, #ffffff 0%, ${color}10 100%)`,
        boxShadow: `0 4px 14px ${color}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {Icon ? (
        <Icon sx={{ fontSize: iconSize, color }} />
      ) : (
        <Box
          component="span"
          sx={{
            fontWeight: 800,
            fontSize: initialsSize,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color,
          }}
        >
          {initials}
        </Box>
      )}
    </Box>
  );
}
