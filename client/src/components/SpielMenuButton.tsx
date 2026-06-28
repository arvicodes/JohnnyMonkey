import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import {
  AutoStories as AutoStoriesIcon,
  DirectionsRun as DirectionsRunIcon,
  Games as GamesIcon,
} from '@mui/icons-material';

export interface SpielMenuActions {
  onAdventCalendar: () => void;
  onRiddleYear: () => void;
  onCarnivalGames: () => void;
  onMinigameTest: () => void;
  onMovementGames?: () => void;
  onSevenMinuteWorkout: () => void;
  onMovementStories: () => void;
  onKiGames: () => void;
}

interface SpielMenuButtonProps {
  actions: SpielMenuActions;
  /** Bewegungsspiele nur in der Lehreransicht */
  showMovementGames?: boolean;
  /** Kompakt wie andere Dashboard-IconButtons (32px) */
  compact?: boolean;
}

const RiddleGiftIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="11" width="16" height="13" fill="#DC143C" rx="1.5" stroke="#8B0000" strokeWidth="2" />
    <rect x="11" y="11" width="2" height="13" fill="#FFD700" />
    <rect x="11" y="2" width="2" height="10" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" rx="1" />
    <rect x="7" y="6" width="10" height="3" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" rx="1.5" />
    <ellipse cx="8.5" cy="6.5" rx="2.5" ry="3.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
    <ellipse cx="15.5" cy="6.5" rx="2.5" ry="3.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
    <path d="M 6.5 7 L 6.5 10 L 6 10.5 L 6.5 11 L 7 10.5 L 7 7 Z" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
    <path d="M 17.5 7 L 17.5 10 L 18 10.5 L 17.5 11 L 17 10.5 L 17 7 Z" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
  </svg>
);

export function SpielMenuButton({ actions, showMovementGames = false, compact = true }: SpielMenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const close = () => setAnchorEl(null);

  const run = (fn: () => void) => {
    close();
    fn();
  };

  const buttonSx = compact
    ? {
        p: 0.5,
        minWidth: 32,
        width: 32,
        height: 32,
        borderRadius: 1.4,
        position: 'relative' as const,
        overflow: 'visible' as const,
        border: '2px solid rgba(156, 39, 176, 0.35)',
        background: 'linear-gradient(135deg, #7b1fa2 0%, #512da8 100%)',
        color: 'white',
        boxShadow: '0 2px 8px rgba(123, 31, 162, 0.35)',
        '&:hover': {
          transform: 'scale(1.05)',
          borderColor: 'rgba(156, 39, 176, 0.6)',
          boxShadow: '0 4px 12px rgba(123, 31, 162, 0.45)',
        },
        transition: 'all 0.2s ease',
      }
    : {
        width: 44,
        height: 44,
        borderRadius: 1.4,
        border: '2px solid rgba(156, 39, 176, 0.35)',
        background: 'linear-gradient(135deg, #7b1fa2 0%, #512da8 100%)',
        color: 'white',
        boxShadow: '0 2px 8px rgba(123, 31, 162, 0.35)',
        '&:hover': {
          transform: 'scale(1.05)',
          borderColor: 'rgba(156, 39, 176, 0.6)',
          boxShadow: '0 4px 12px rgba(123, 31, 162, 0.45)',
        },
        transition: 'all 0.2s ease',
      };

  const menuItems: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    hidden?: boolean;
  }> = [
    {
      key: 'advent',
      label: 'Adventskalender',
      icon: <Typography component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>🎄</Typography>,
      onClick: actions.onAdventCalendar,
    },
    {
      key: 'riddle',
      label: 'Rätseljahr',
      icon: <RiddleGiftIcon size={18} />,
      onClick: actions.onRiddleYear,
    },
    {
      key: 'carnival',
      label: 'Karnevals-Minigames',
      icon: <Typography component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>🎭</Typography>,
      onClick: actions.onCarnivalGames,
    },
    {
      key: 'minigame',
      label: 'Minigame-Test',
      icon: <GamesIcon sx={{ fontSize: 18, color: '#f57c00' }} />,
      onClick: actions.onMinigameTest,
    },
    {
      key: 'movement',
      label: 'Bewegungsspiele',
      icon: <DirectionsRunIcon sx={{ fontSize: 18, color: '#00897b' }} />,
      onClick: actions.onMovementGames ?? (() => {}),
      hidden: !showMovementGames || !actions.onMovementGames,
    },
    {
      key: 'workout',
      label: '7-Minuten-Workout',
      icon: (
        <Typography component="span" sx={{ fontSize: '0.85rem', fontWeight: 800, lineHeight: 1, color: '#ff6b35' }}>
          7
        </Typography>
      ),
      onClick: actions.onSevenMinuteWorkout,
    },
    {
      key: 'stories',
      label: 'Bewegungsgeschichten',
      icon: <AutoStoriesIcon sx={{ fontSize: 18, color: '#3949ab' }} />,
      onClick: actions.onMovementStories,
    },
    {
      key: 'ki',
      label: 'KI-Spiele',
      icon: (
        <Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: '#00acc1' }}>
          KI
        </Typography>
      ),
      onClick: actions.onKiGames,
    },
  ];

  return (
    <>
      {compact ? (
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={buttonSx}
          title="Spiel"
          aria-label="Spiel-Menü öffnen"
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
        >
          <GamesIcon sx={{ fontSize: 18 }} />
        </IconButton>
      ) : (
        <Button
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            ...buttonSx,
            minWidth: 'auto',
            px: 1.25,
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 700,
            gap: 0.5,
          }}
          title="Spiel"
          aria-label="Spiel-Menü öffnen"
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
        >
          <GamesIcon sx={{ fontSize: 18 }} />
          Spiel
        </Button>
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 0.5,
            minWidth: 220,
            borderRadius: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        }}
      >
        {menuItems
          .filter((item) => !item.hidden)
          .map((item) => (
            <MenuItem key={item.key} onClick={() => run(item.onClick)} sx={{ py: 0.85, gap: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32, justifyContent: 'center' }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </MenuItem>
          ))}
      </Menu>
    </>
  );
}

export default SpielMenuButton;
