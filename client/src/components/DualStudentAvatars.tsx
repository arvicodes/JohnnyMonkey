import React, { useEffect, useState } from 'react';
import { Avatar, Box, Dialog, DialogContent, DialogTitle, SxProps, Theme, Tooltip } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import { resolveAvatarUrl } from '../lib/avatarUrl';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';

type DualStudentAvatarsProps = {
  name?: string;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  fallbackEmoji?: string;
  emojiLoading?: boolean;
  photoLoading?: boolean;
  size?: number;
  /** Photo circle; defaults to `size`. */
  photoSize?: number;
  /** Larger profile card layout */
  large?: boolean;
  /** Always show photo circle even without image (default true) */
  alwaysShowPhotoSlot?: boolean;
  onEmojiClick?: () => void;
  onPhotoClick?: () => void;
  sx?: SxProps<Theme>;
};

/**
 * Emoji-Avatar und eigenes Foto als zwei Kreise nebeneinander.
 */
export function DualStudentAvatars({
  name,
  avatarEmoji,
  avatarUrl,
  fallbackEmoji = '🧙‍♂️',
  emojiLoading = false,
  photoLoading = false,
  size = 32,
  photoSize,
  large = false,
  alwaysShowPhotoSlot = true,
  onEmojiClick,
  onPhotoClick,
  sx,
}: DualStudentAvatarsProps) {
  const emojiSize = large ? 88 : size;
  const photoPx = large ? 88 : photoSize ?? size;
  const emoji = avatarEmoji?.trim() || fallbackEmoji;
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const [imgFailed, setImgFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [resolvedUrl]);
  const hasPhoto = Boolean(resolvedUrl) && !imgFailed;
  const showPhoto = alwaysShowPhotoSlot || hasPhoto;
  const emojiEditable = Boolean(onEmojiClick);
  const photoEditable = Boolean(onPhotoClick);
  const photoPreviewable = hasPhoto && !photoEditable;
  const compact = !large && Math.min(size, photoPx) <= 18;
  const borderWidth = large ? 3 : compact ? 1 : 2;
  const defaultGap = large ? 1.5 : compact ? 0.25 : 0.6;

  const emojiTooltip = emojiEditable ? 'Avatar-Emoji ändern' : 'Avatar';
  const photoTooltip = photoEditable
    ? hasPhoto
      ? 'Eigenes Bild ändern'
      : 'Eigenes Bild hochladen'
    : photoPreviewable
      ? 'Foto vergrößern'
      : hasPhoto
        ? 'Eigenes Bild'
        : 'Kein eigenes Bild';

  const emojiAvatar = (
    <Avatar
      onClick={onEmojiClick}
      sx={{
        width: emojiSize,
        height: emojiSize,
        flexShrink: 0,
        bgcolor: '#87CEEB',
        fontSize: large ? '2.75rem' : size > 36 ? '1.5rem' : size >= 28 ? '1rem' : size <= 16 ? '0.55rem' : '0.9rem',
        boxShadow: large
          ? '0 4px 12px rgba(0,0,0,0.2)'
          : compact
            ? 'none'
            : '0 1.4px 2.8px rgba(0,0,0,0.12)',
        border: `${borderWidth}px solid rgba(255,255,255,0.9)`,
        cursor: emojiEditable ? 'pointer' : 'default',
        transition: 'transform 0.2s ease',
        '&:hover': emojiEditable ? { transform: 'scale(1.05)' } : undefined,
      }}
    >
      {emojiLoading ? '⏳' : emoji}
    </Avatar>
  );

  const photoCircleSx = {
    width: photoPx,
    height: photoPx,
    flexShrink: 0,
    borderRadius: '50%',
    overflow: 'hidden' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: hasPhoto && !photoLoading ? 'transparent' : '#e8eaf6',
    color: '#5c6bc0',
    boxShadow: large
      ? '0 4px 12px rgba(0,0,0,0.2)'
      : compact
        ? 'none'
        : '0 1.4px 2.8px rgba(0,0,0,0.12)',
    border: hasPhoto
      ? `${borderWidth}px solid rgba(255,255,255,0.9)`
      : `${borderWidth}px dashed rgba(92, 107, 192, 0.45)`,
    cursor: photoEditable || photoPreviewable ? 'pointer' : 'default',
    transition: 'transform 0.2s ease',
    '&:hover': photoEditable || photoPreviewable ? { transform: 'scale(1.05)' } : undefined,
    p: 0,
  };

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoEditable) {
      onPhotoClick?.();
      return;
    }
    if (photoPreviewable) setPreviewOpen(true);
  };

  const photoClickable = photoEditable || photoPreviewable;
  const photoAvatar = (
    <Box
      component={photoClickable ? 'button' : 'div'}
      type={photoClickable ? 'button' : undefined}
      onClick={photoClickable ? handlePhotoClick : undefined}
      aria-label={photoTooltip}
      sx={{
        ...photoCircleSx,
        borderStyle: hasPhoto ? 'solid' : 'dashed',
        ...(photoClickable
          ? { appearance: 'none', WebkitAppearance: 'none', m: 0, font: 'inherit' }
          : {}),
      }}
    >
      {photoLoading ? (
        <Box component="span" sx={{ fontSize: compact ? '0.55rem' : '0.85rem' }}>⏳</Box>
      ) : hasPhoto && resolvedUrl ? (
        <Box
          component="img"
          src={resolvedUrl}
          alt={name ? `${name} Foto` : 'Eigenes Bild'}
          onError={() => setImgFailed(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : large ? (
        <AddAPhotoIcon sx={{ fontSize: 36 }} />
      ) : (
        <PhotoCameraIcon sx={{ fontSize: Math.max(8, photoPx * 0.45) }} />
      )}
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: defaultGap,
          ...((typeof sx === 'object' && sx !== null && !Array.isArray(sx) ? sx : {}) as object),
        }}
      >
        {compact ? (
          emojiAvatar
        ) : (
          <Tooltip title={emojiTooltip} placement="bottom">
            {emojiAvatar}
          </Tooltip>
        )}

        {showPhoto &&
          (compact ? (
            photoAvatar
          ) : (
            <Tooltip title={photoTooltip} placement="bottom">
              <span style={{ display: 'inline-flex', lineHeight: 0 }}>{photoAvatar}</span>
            </Tooltip>
          ))}
      </Box>

      {photoPreviewable && resolvedUrl && (
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
          onClick={(e) => e.stopPropagation()}
          sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
          PaperProps={{
            sx: {
              bgcolor: '#111',
              backgroundImage: 'none',
              borderRadius: 2,
              overflow: 'hidden',
            },
          }}
        >
          <DialogTitle
            sx={{
              ...dialogCloseTitleSx,
              color: '#fff',
              bgcolor: '#1a1a1a',
              py: 1.25,
            }}
          >
            {name || 'Foto'}
            <DialogCloseIconButton
              onClose={() => setPreviewOpen(false)}
              sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
              iconSx={{ color: '#fff' }}
            />
          </DialogTitle>
          <DialogContent sx={{ p: 0, bgcolor: '#000', display: 'flex', justifyContent: 'center' }}>
            <Box
              component="img"
              src={resolvedUrl}
              alt={name ? `${name} Foto` : 'Foto'}
              sx={{
                width: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default DualStudentAvatars;
