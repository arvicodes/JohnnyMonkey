import React, { useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
} from '@mui/material';
import {
  Image as ImageIcon,
  DeleteOutline as DeleteOutlineIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { displayStoryImageSrc } from '../../lib/storyPageLayout';
import {
  collectImageFilesFromDataTransfer,
  isLikelyImageFile,
} from '../../lib/storyImageUtils';

type Props = {
  images: string[];
  onAddFiles: (files: File[]) => void;
  onReject?: (reason: string) => void;
  onRemoveAt: (index: number) => void;
  onClear?: () => void;
  processing?: boolean;
};

export type StoryPageGalleryPanelHandle = { pickFiles: () => void };

function collectFilesFromInput(fileList: FileList | File[]): File[] {
  return Array.from(fileList).filter(isLikelyImageFile);
}

export const StoryPageGalleryPanel = forwardRef<StoryPageGalleryPanelHandle, Props>(
  function StoryPageGalleryPanel(
    { images, onAddFiles, onReject, onRemoveAt, onClear, processing = false },
    ref,
  ) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFiles = () => inputRef.current?.click();
  useImperativeHandle(ref, () => ({ pickFiles }), []);

  const deliverFiles = useCallback(
    (raw: FileList | File[] | DataTransfer | null, hadAttempt: boolean) => {
      let files: File[] = [];
      if (raw && typeof (raw as DataTransfer).files !== 'undefined' && 'items' in (raw as DataTransfer)) {
        files = collectImageFilesFromDataTransfer(raw as DataTransfer);
      } else {
        files = collectFilesFromInput(raw as FileList | File[]);
      }
      if (files.length) {
        onAddFiles(files);
        return;
      }
      if (hadAttempt) {
        onReject?.(
          'Keine Bilddatei erkannt — JPG/PNG per Drag & Drop oder „Bilder wählen“. HEIC ggf. vorher als JPG speichern.',
        );
      }
    },
    [onAddFiles, onReject],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    deliverFiles(e.dataTransfer, true);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = collectImageFilesFromDataTransfer(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    onAddFiles(files);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: { xs: 200, md: 360 },
      }}
      onPaste={onPaste}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) deliverFiles(list, true);
          e.target.value = '';
        }}
      />

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#6d4c41' }}>
          Galerie
        </Typography>
        {images.length > 0 && onClear ? (
          <Button size="small" onClick={onClear} sx={{ minWidth: 0, p: 0.25, fontSize: '0.7rem', textTransform: 'none' }}>
            Alle löschen
          </Button>
        ) : null}
      </Stack>

      <Box
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={onDrop}
        tabIndex={0}
        sx={{
          flex: 1,
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'rgba(141, 110, 99, 0.4)',
          borderRadius: 1.5,
          bgcolor: dragOver ? 'rgba(25, 118, 210, 0.06)' : '#faf6ee',
          p: 1.25,
          transition: 'border-color 0.15s, background 0.15s',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minHeight: 0,
          outline: 'none',
          '&:focus-visible': { borderColor: 'primary.main' },
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
          onClick={pickFiles}
          disabled={processing}
          fullWidth
          sx={{ textTransform: 'none', flexShrink: 0, py: 0.5, fontSize: '0.75rem' }}
        >
          {processing ? 'Wird verarbeitet …' : 'Bilder wählen'}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.3 }}>
          Dateien hierher ziehen oder Strg+V (Bild aus Zwischenablage)
        </Typography>

        {images.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              opacity: 0.7,
              py: 2,
            }}
          >
            <ImageIcon sx={{ fontSize: 40 }} />
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1,
              alignContent: 'start',
              minHeight: 0,
            }}
          >
            {images.map((src, i) => (
              <Box key={`${i}-${src.slice(0, 24)}`} sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={displayStoryImageSrc(src)}
                  alt=""
                  sx={{
                    width: '100%',
                    aspectRatio: '4/3',
                    objectFit: 'cover',
                    borderRadius: 0.5,
                    border: '4px solid white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'block',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => onRemoveAt(i)}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 22,
                    height: 22,
                    bgcolor: 'white',
                    '&:hover': { bgcolor: '#ffebee' },
                  }}
                  aria-label="Bild entfernen"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
        {images.length} Bild{images.length === 1 ? '' : 'er'} → Vorschau rechts
      </Typography>
    </Box>
  );
},
);
