import React, { useCallback, useRef } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddPhotoAlternate as AddPhotoIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type { AnnouncementImage } from '../../lib/announcementTypes';
import { announcementPalette, compactIconBtnSx, compactIconSx, overlayIconBtnSx, overlayIconSx } from './announcementUi';

type Props = {
  images: AnnouncementImage[];
  onChange: (images: AnnouncementImage[]) => void;
  onUpload: (files: File[]) => Promise<void>;
  uploading?: boolean;
};

export function AnnouncementImageManager({ images, onChange, onUpload, uploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length || uploading) return;
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (files.length) void onUpload(files);
    },
    [onUpload, uploading],
  );

  const moveImage = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    pickFiles(e.dataTransfer.files);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', flex: 1, minWidth: 0 }}>
          Bilder ({images.length}) — Reihenfolge = Anordnung in Layouts
        </Typography>
        <Tooltip title="Bilder hinzufügen">
          <span>
            <IconButton
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-label="Bilder hinzufügen"
              sx={{
                ...compactIconBtnSx,
                bgcolor: announcementPalette.primary,
                color: '#fff',
                '&:hover': { bgcolor: announcementPalette.secondary },
                '&.Mui-disabled': { bgcolor: '#bdbdbd', color: '#fff' },
              }}
            >
              {uploading ? (
                <CircularProgress size={18} sx={{ color: '#fff' }} />
              ) : (
                <AddPhotoIcon sx={compactIconSx} />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </Box>

      <Box
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => !uploading && images.length === 0 && inputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: images.length ? 'divider' : 'rgba(0,131,143,0.35)',
          borderRadius: 2,
          bgcolor: images.length ? '#fafafa' : 'rgba(0,131,143,0.04)',
          cursor: images.length === 0 && !uploading ? 'pointer' : 'default',
          '&:hover': images.length === 0 && !uploading ? { borderColor: '#00838f', bgcolor: 'rgba(0,131,143,0.08)' } : {},
        }}
      >
        {images.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <AddPhotoIcon sx={{ fontSize: 28, color: '#00838f', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1 }}>
              Mehrere Fotos auf einmal — klicken, ziehen oder +
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 280, overflowY: 'auto', overflowX: 'hidden', p: 0.75 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                gap: 0.75,
              }}
            >
              {images.map((img, index) => (
                <Box
                  key={`${img.url}-${index}`}
                  sx={{
                    position: 'relative',
                    borderRadius: 1.25,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#eee',
                    aspectRatio: '1',
                  }}
                >
                  <Box
                    component="img"
                    src={img.url}
                    alt={img.caption || `Bild ${index + 1}`}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <Box sx={{ position: 'absolute', top: 2, left: 2, display: 'flex', gap: 0.25 }}>
                    {index > 0 && (
                      <Tooltip title="Nach links">
                        <IconButton
                          aria-label="Bild nach links"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImage(index, -1);
                          }}
                          sx={{ ...overlayIconBtnSx, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', width: 22, height: 22, minWidth: 22 }}
                        >
                          <ChevronLeftIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {index < images.length - 1 && (
                      <Tooltip title="Nach rechts">
                        <IconButton
                          aria-label="Bild nach rechts"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImage(index, 1);
                          }}
                          sx={{ ...overlayIconBtnSx, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', width: 22, height: 22, minWidth: 22 }}
                        >
                          <ChevronRightIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Tooltip title="Entfernen">
                    <IconButton
                      aria-label="Bild entfernen"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(images.filter((_, i) => i !== index));
                      }}
                      sx={{
                        ...overlayIconBtnSx,
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.78)' },
                      }}
                    >
                      <CloseIcon sx={overlayIconSx} />
                    </IconButton>
                  </Tooltip>
                  <Typography
                    component="span"
                    sx={{
                      position: 'absolute',
                      bottom: 2,
                      left: 2,
                      minWidth: 16,
                      height: 16,
                      px: 0.35,
                      borderRadius: 999,
                      bgcolor: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {index + 1}
                  </Typography>
                </Box>
              ))}
              <Tooltip title="Weitere Bilder">
                <Box
                  onClick={() => !uploading && inputRef.current?.click()}
                  sx={{
                    aspectRatio: '1',
                    borderRadius: 1.25,
                    border: '2px dashed',
                    borderColor: 'rgba(0,131,143,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploading ? 'default' : 'pointer',
                    bgcolor: 'rgba(0,131,143,0.06)',
                    '&:hover': uploading ? {} : { borderColor: '#00838f', bgcolor: 'rgba(0,131,143,0.12)' },
                  }}
                >
                  <AddPhotoIcon sx={{ fontSize: 22, color: announcementPalette.primary }} />
                </Box>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
