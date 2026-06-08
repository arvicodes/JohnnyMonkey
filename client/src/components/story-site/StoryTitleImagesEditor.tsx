import React, { useRef, useState } from 'react';
import { Box, Typography, IconButton, Button, Stack, CircularProgress } from '@mui/material';
import {
  Image as ImageIcon,
  DeleteOutline as DeleteOutlineIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { StoryPreviewImage } from './StoryPreviewImage';
import { STORY_BEIGE } from '../../lib/storyPageLayout';
import { isLikelyStoryMediaFile } from '../../lib/storyMediaUtils';

type Side = 'left' | 'right';

type Props = {
  titleImageLeft: string;
  titleImageRight: string;
  onChange: (patch: { titleImageLeft?: string; titleImageRight?: string }) => void;
  onImportFile: (file: File) => Promise<string | null>;
  busy?: boolean;
};

function TitleImageSlot({
  label,
  src,
  onPick,
  onClear,
  busy,
}: {
  label: string;
  src: string;
  onPick: () => void;
  onClear: () => void;
  busy?: boolean;
}) {
  const trimmed = src?.trim();

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        sx={{
          border: '1px dashed rgba(141, 110, 99, 0.45)',
          borderRadius: 1,
          bgcolor: STORY_BEIGE.panel,
          p: 1,
          minHeight: 88,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
        }}
      >
        {trimmed ? (
          <Box sx={{ position: 'relative', width: 64, flexShrink: 0 }}>
            <StoryPreviewImage
              src={trimmed}
              variant="gallery"
              sx={{
                width: 64,
                height: 52,
                objectFit: 'cover',
                borderRadius: 0.5,
                boxShadow: '0 2px 6px rgba(93, 64, 55, 0.15)',
              }}
            />
            <IconButton
              size="small"
              aria-label={`${label} entfernen`}
              onClick={onClear}
              disabled={busy}
              sx={{
                position: 'absolute',
                top: -6,
                right: -6,
                bgcolor: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(141, 110, 99, 0.35)',
                width: 22,
                height: 22,
                '&:hover': { bgcolor: '#ffebee' },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ) : (
          <ImageIcon sx={{ fontSize: 28, color: 'rgba(141, 110, 99, 0.35)' }} />
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={busy ? <CircularProgress size={14} /> : <CloudUploadIcon sx={{ fontSize: 16 }} />}
          onClick={onPick}
          disabled={busy}
          sx={{
            textTransform: 'none',
            fontSize: '0.72rem',
            py: 0.25,
            borderColor: 'rgba(141, 110, 99, 0.4)',
            color: '#5d4037',
          }}
        >
          {trimmed ? 'Ersetzen' : 'Bild wählen'}
        </Button>
      </Box>
    </Box>
  );
}

export function StoryTitleImagesEditor({
  titleImageLeft,
  titleImageRight,
  onChange,
  onImportFile,
  busy = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickSide, setPickSide] = useState<Side | null>(null);
  const [slotBusy, setSlotBusy] = useState(false);

  const startPick = (side: Side) => {
    setPickSide(side);
    inputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const side = pickSide;
    const file = e.target.files?.[0];
    e.target.value = '';
    setPickSide(null);
    if (!side || !file || !isLikelyStoryMediaFile(file)) return;
    void (async () => {
      setSlotBusy(true);
      try {
        const url = await onImportFile(file);
        if (url) {
          onChange(side === 'left' ? { titleImageLeft: url } : { titleImageRight: url });
        }
      } finally {
        setSlotBusy(false);
      }
    })();
  };

  const loading = busy || slotBusy;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        Kleine Bilder links und rechts neben dem Titel (Vorschau)
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="stretch">
        <TitleImageSlot
          label="Links vom Titel"
          src={titleImageLeft}
          onPick={() => startPick('left')}
          onClear={() => onChange({ titleImageLeft: '' })}
          busy={loading}
        />
        <TitleImageSlot
          label="Rechts vom Titel"
          src={titleImageRight}
          onPick={() => startPick('right')}
          onClear={() => onChange({ titleImageRight: '' })}
          busy={loading}
        />
      </Stack>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={onFileChange}
      />
    </Box>
  );
}
