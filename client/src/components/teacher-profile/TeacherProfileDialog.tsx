import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Popover,
  Button,
} from '@mui/material';
import {
  Edit as EditIcon,
  CalendarMonth as CalendarMonthIcon,
  Palette as PaletteIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import EmojiSelector from '../EmojiSelector';
import { ReisebegleiterAvatarBadge } from '../ReisebegleiterPanel';
import { apiPut } from '../../lib/api';
import {
  fetchTeacherGitBackupStatus,
  pushTeacherGitBackup,
  type TeacherGitBackupStatus,
} from '../../lib/teacherGitBackup';
import {
  DEFAULT_PROFILE_COLOR,
  PROFILE_COLOR_PRESETS,
  profileSoftBg,
  profileTitleGradient,
  profileHeaderGradient,
} from '../../lib/profileColor';

interface TeacherProfileDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  teacherName: string;
  avatarEmoji: string;
  profileColor: string;
  onAvatarChange: (emoji: string) => void;
  onProfileColorChange: (color: string) => void;
  onOpenSchedule: () => void;
}

const DEFAULT_TEACHER_EMOJI = '🧑‍🏫';

export default function TeacherProfileDialog({
  open,
  onClose,
  userId,
  teacherName,
  avatarEmoji,
  profileColor,
  onAvatarChange,
  onProfileColorChange,
  onOpenSchedule,
}: TeacherProfileDialogProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(avatarEmoji || DEFAULT_TEACHER_EMOJI);
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [isUpdatingEmoji, setIsUpdatingEmoji] = useState(false);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [gitStatus, setGitStatus] = useState<TeacherGitBackupStatus | null>(null);
  const [gitBusy, setGitBusy] = useState(false);
  const [gitMessage, setGitMessage] = useState('');

  const accent = profileColor || DEFAULT_PROFILE_COLOR;

  useEffect(() => {
    setSelectedEmoji(avatarEmoji || DEFAULT_TEACHER_EMOJI);
  }, [avatarEmoji, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setGitMessage('');
    void fetchTeacherGitBackupStatus()
      .then((next) => {
        if (!cancelled) setGitStatus(next);
      })
      .catch(() => {
        if (!cancelled) {
          setGitStatus({
            available: false,
            reason: 'error',
            hint: 'GitHub-Knopf gerade nicht erreichbar.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleGitPush = async () => {
    setGitBusy(true);
    setGitMessage('');
    try {
      const result = await pushTeacherGitBackup();
      setGitMessage(result.message);
    } catch {
      setGitMessage('Push fehlgeschlagen. Am Laptop GitHub-Zugang prüfen.');
    } finally {
      setGitBusy(false);
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    setSelectedEmoji(emoji);
    setIsUpdatingEmoji(true);
    setShowEmojiSelector(false);
    try {
      const loginCode = localStorage.getItem('loginCode');
      const response = await fetch(`/api/users/${userId}/avatar-emoji`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode || '',
        },
        body: JSON.stringify({ avatarEmoji: emoji }),
      });
      if (response.ok) {
        onAvatarChange(emoji);
      } else {
        setSelectedEmoji(avatarEmoji || DEFAULT_TEACHER_EMOJI);
      }
    } catch {
      setSelectedEmoji(avatarEmoji || DEFAULT_TEACHER_EMOJI);
    } finally {
      setIsUpdatingEmoji(false);
    }
  };

  const handleColorSelect = async (color: string) => {
    onProfileColorChange(color);
    try {
      const res = await apiPut(`/api/users/${userId}/profile-appearance`, { profileColor: color });
      if (!res.ok) onProfileColorChange(profileColor);
    } catch {
      onProfileColorChange(profileColor);
    }
  };

  const miniActionSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.35,
    px: 0.75,
    py: 0.3,
    borderRadius: 1.1,
    cursor: 'pointer',
    bgcolor: '#f5f7fa',
    border: '1px solid rgba(0,0,0,0.08)',
    transition: 'all 0.15s ease',
    flexShrink: 0,
    '&:hover': { bgcolor: '#e8eef5' },
  } as const;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        scroll="body"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 40px)',
            maxWidth: 800,
          },
        }}
      >
        <Box
          sx={{
            ...dialogCloseTitleSx,
            background: profileTitleGradient(accent),
            color: '#fff',
            py: 1.25,
            px: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
            Mein Profil
          </Typography>
          <DialogCloseIconButton
            onClose={onClose}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } }}
            iconSx={{ color: '#fff' }}
          />
        </Box>

        <DialogContent sx={{ px: 2, py: 2, bgcolor: '#fafbfc' }}>
          <Box
            sx={{
              borderRadius: 2.5,
              bgcolor: '#fff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                background: profileHeaderGradient(accent),
                borderRadius: 2.5,
                p: 2.5,
                mb: 0,
                textAlign: 'center',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                border: `2px solid ${accent}44`,
                '&:hover': {
                  transform: 'scale(1.01)',
                  boxShadow: `0 6px 20px ${accent}30`,
                },
              }}
              onClick={() => setShowEmojiSelector(true)}
            >
              <Typography variant="h1" sx={{ fontSize: '4.5rem', mb: 0.5, lineHeight: 1 }}>
                {isUpdatingEmoji ? '⏳' : selectedEmoji}
              </Typography>
              {open && <ReisebegleiterAvatarBadge />}
              <Tooltip title="Avatar ändern" placement="top">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiSelector(true);
                  }}
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    bgcolor: 'rgba(255,255,255,0.88)',
                    width: 30,
                    height: 30,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    '&:hover': { bgcolor: '#fff', transform: 'scale(1.06)' },
                  }}
                  size="small"
                >
                  <EditIcon sx={{ fontSize: '0.95rem' }} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                py: 1.1,
                px: 1.5,
                borderTop: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: accent,
                    fontSize: '1rem',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {teacherName || 'Lehrkraft'}
                </Typography>
                <Chip
                  label="Lehrkraft"
                  size="small"
                  sx={{
                    bgcolor: profileSoftBg(accent),
                    color: accent,
                    fontWeight: 700,
                    fontSize: '0.58rem',
                    height: 18,
                    flexShrink: 0,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onClose();
                    onOpenSchedule();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onClose();
                      onOpenSchedule();
                    }
                  }}
                  sx={miniActionSx}
                >
                  <CalendarMonthIcon sx={{ fontSize: 13, color: accent }} />
                  <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#37474f', lineHeight: 1 }}>
                    Stundenplan
                  </Typography>
                </Box>

                <Box
                  role="button"
                  tabIndex={0}
                  aria-label="Profilfarbe wählen"
                  onClick={(e) => setColorAnchor(e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setColorAnchor(e.currentTarget as HTMLElement);
                    }
                  }}
                  sx={miniActionSx}
                >
                  <Box
                    sx={{
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      bgcolor: accent,
                      border: '1.5px solid rgba(0,0,0,0.12)',
                      flexShrink: 0,
                    }}
                  />
                  <PaletteIcon sx={{ fontSize: 12, color: '#64748b' }} />
                  <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#37474f', lineHeight: 1 }}>
                    Farbe
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 1.5,
              borderRadius: 2.5,
              bgcolor: '#fff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              px: 1.5,
              py: 1.35,
            }}
          >
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#37474f', mb: 0.35 }}>
              Stand nach GitHub
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', color: '#64748b', lineHeight: 1.35, mb: 1 }}>
              {gitStatus?.hint ||
                'Ganzer Stand: Folien, Notizen, Tickets. Am Laptop auch der Code.'}
            </Typography>
            <Button
              size="small"
              variant="contained"
              disableElevation
              startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
              disabled={gitBusy || gitStatus?.available === false}
              onClick={() => {
                void handleGitPush();
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.72rem',
                bgcolor: accent,
                '&:hover': { bgcolor: accent, filter: 'brightness(0.95)' },
                '&.Mui-disabled': { bgcolor: '#eceff1', color: '#90a4ae' },
              }}
            >
              {gitBusy ? 'Schiebe …' : 'Stand nach GitHub'}
            </Button>
            {gitMessage ? (
              <Typography sx={{ fontSize: '0.62rem', color: '#455a64', mt: 0.85, lineHeight: 1.35 }}>
                {gitMessage}
              </Typography>
            ) : null}
          </Box>

          <Popover
            open={Boolean(colorAnchor)}
            anchorEl={colorAnchor}
            onClose={() => setColorAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  p: 1.25,
                  borderRadius: 2,
                  mt: 0.5,
                  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                },
              },
            }}
          >
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', mb: 0.85 }}>
              Profilfarbe
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.65, maxWidth: 200 }}>
              {PROFILE_COLOR_PRESETS.map((preset) => (
                <Box
                  key={preset}
                  role="button"
                  tabIndex={0}
                  aria-label={`Farbe ${preset}`}
                  aria-pressed={accent === preset}
                  onClick={() => {
                    handleColorSelect(preset);
                    setColorAnchor(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleColorSelect(preset);
                      setColorAnchor(null);
                    }
                  }}
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    bgcolor: preset,
                    cursor: 'pointer',
                    border: accent === preset ? '2.5px solid #212121' : '1.5px solid rgba(0,0,0,0.1)',
                    boxShadow: accent === preset ? '0 0 0 2px #fff inset' : 'none',
                    transition: 'transform 0.15s ease',
                    '&:hover': { transform: 'scale(1.08)' },
                  }}
                />
              ))}
            </Box>
          </Popover>
        </DialogContent>
      </Dialog>

      <EmojiSelector
        open={showEmojiSelector}
        onClose={() => setShowEmojiSelector(false)}
        onSelect={handleEmojiSelect}
        currentEmoji={selectedEmoji}
        title="🎭 Wähle dein Lehrkraft-Avatar"
      />
    </>
  );
}
