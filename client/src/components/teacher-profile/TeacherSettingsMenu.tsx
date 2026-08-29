import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  CalendarMonth as CalendarMonthIcon,
  Home as HomeIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import TeacherGitStandModal from './TeacherGitStandModal';

import {
  DEFAULT_PROFILE_COLOR,
  profileHeaderGradient,
  profileSoftBg,
} from '../../lib/profileColor';
import { markTeacherWantsDashboard } from '../../lib/teacherLiveLesson';

interface TeacherSettingsMenuProps {
  teacherName: string;
  userId: string;
  avatarColor: string;
  avatarEmoji?: string | null;
  profileColor?: string | null;
  onOpenProfile: () => void;
  onOpenSchedule: () => void;
  /** Zusätzlich zum Navigieren: Stunde schließen, State zurücksetzen. */
  onGoToDashboard?: () => void;
}

export default function TeacherSettingsMenu({
  teacherName,
  userId,
  avatarColor,
  avatarEmoji,
  profileColor,
  onOpenProfile,
  onOpenSchedule,
  onGoToDashboard,
}: TeacherSettingsMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [standOpen, setStandOpen] = useState(false);
  const open = Boolean(anchorEl);
  const isOnDashboard = location.pathname === '/dashboard';

  const accent = profileColor || avatarColor || DEFAULT_PROFILE_COLOR;

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const displayEmoji = avatarEmoji?.trim() || null;

  const close = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        sx={{ p: 0 }}
        aria-label="Profil und Einstellungen"
        title="Profil"
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: displayEmoji ? profileSoftBg(accent) : accent,
            boxShadow: `0 2px 8px ${accent}40`,
            fontSize: displayEmoji ? '1.25rem' : '0.85rem',
            fontWeight: displayEmoji ? 400 : 700,
            lineHeight: 1,
            fontFamily: displayEmoji
              ? '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
              : 'inherit',
            color: displayEmoji ? 'inherit' : 'white',
            cursor: 'pointer',
            border: `2px solid ${accent}`,
            transition: 'transform 0.15s ease',
            '&:hover': { transform: 'scale(1.06)' },
          }}
        >
          {displayEmoji || getInitials(teacherName) || userId.substring(0, 2).toUpperCase()}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              minWidth: 240,
              borderRadius: 2.5,
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            background: profileHeaderGradient(accent),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: profileSoftBg(accent),
                fontSize: displayEmoji ? '1.7rem' : '1.05rem',
                fontWeight: displayEmoji ? 400 : 700,
                lineHeight: 1,
                fontFamily: displayEmoji
                  ? '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
                  : 'inherit',
                border: `2px solid ${accent}`,
                boxShadow: `0 2px 8px ${accent}35`,
              }}
            >
              {displayEmoji || getInitials(teacherName)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: accent,
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {teacherName || 'Lehrkraft'}
              </Typography>
              <Chip
                label="Lehrkraft"
                size="small"
                sx={{
                  mt: 0.4,
                  height: 18,
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  bgcolor: profileSoftBg(accent),
                  color: accent,
                }}
              />
            </Box>
          </Box>
        </Box>

        <Divider />

        {!isOnDashboard && (
          <MenuItem
            onClick={() => {
              close();
              markTeacherWantsDashboard();
              if (onGoToDashboard) onGoToDashboard();
              else navigate('/dashboard');
            }}
            sx={{ py: 1.1, px: 2 }}
          >
            <ListItemIcon>
              <HomeIcon fontSize="small" sx={{ color: '#1976d2' }} />
            </ListItemIcon>
            <ListItemText
              primary="Dashboard"
              secondary="Zurück zur Übersicht"
              primaryTypographyProps={{ fontWeight: 700, fontSize: '0.82rem' }}
              secondaryTypographyProps={{ fontSize: '0.68rem' }}
            />
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            close();
            onOpenProfile();
          }}
          sx={{ py: 1.1, px: 2 }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" sx={{ color: '#1976d2' }} />
          </ListItemIcon>
          <ListItemText
            primary="Mein Profil"
            secondary="Avatar & Reisebegleiter"
            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.82rem' }}
            secondaryTypographyProps={{ fontSize: '0.68rem' }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            close();
            setStandOpen(true);
          }}
          sx={{ py: 1.1, px: 2 }}
        >
          <ListItemIcon>
            <CloudUploadIcon fontSize="small" sx={{ color: '#1976d2' }} />
          </ListItemIcon>
          <ListItemText
            primary="Stand nach GitHub"
            secondary="Folien, Notizen, Tickets"
            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.82rem' }}
            secondaryTypographyProps={{ fontSize: '0.68rem' }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            close();
            onOpenSchedule();
          }}
          sx={{ py: 1.1, px: 2 }}
        >
          <ListItemIcon>
            <CalendarMonthIcon fontSize="small" sx={{ color: '#1976d2' }} />
          </ListItemIcon>
          <ListItemText
            primary="Stundenplan"
            secondary="Zeiten & Lerngruppen"
            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.82rem' }}
            secondaryTypographyProps={{ fontSize: '0.68rem' }}
          />
        </MenuItem>
      </Menu>
      <TeacherGitStandModal open={standOpen} onClose={() => setStandOpen(false)} />
    </>
  );
}
