import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Typography,
  Avatar,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CropIcon from '@mui/icons-material/Crop';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';
import { getCroppedImageBlob, PixelCrop } from '../lib/cropImage';
import { resolveAvatarUrl } from '../lib/avatarUrl';

type Step = 'manage' | 'crop';

type AvatarPhotoDialogProps = {
  open: boolean;
  onClose: () => void;
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  isUploading?: boolean;
};

/** react-easy-crop Area shape (types package exports are type-only) */
type CropArea = PixelCrop;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ImageCropper = Cropper as any;

const AvatarPhotoDialog: React.FC<AvatarPhotoDialogProps> = ({
  open,
  onClose,
  currentImageUrl = null,
  onUpload,
  onRemove,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('manage');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetCropState = useCallback(() => {
    setStep('manage');
    setImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    setSaving(false);
  }, []);

  useEffect(() => {
    if (!open) resetCropState();
  }, [open, resetCropState]);

  const handleClose = () => {
    if (saving || isUploading) return;
    onClose();
  };

  const startCropWithFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      setError('Bitte eine Bilddatei wählen.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Bild darf maximal 8 MB groß sein.');
      return;
    }

    // HEIC: try heic2any if available in project
    let blob: Blob = file;
    if (/\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif') {
      try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        blob = Array.isArray(converted) ? converted[0] : converted;
      } catch {
        setError('HEIC konnte nicht gelesen werden. Bitte als JPEG/PNG speichern.');
        return;
      }
    }

    setImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setStep('crop');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void startCropWithFile(file);
  };

  const onCropComplete = useCallback((_area: CropArea, pixels: CropArea) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, 512);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await onUpload(file);
      resetCropState();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setError(null);
    try {
      await onRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen');
    }
  };

  const previewUrl = resolveAvatarUrl(currentImageUrl);
  const busy = saving || isUploading;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        },
      }}
    >
      <DialogTitle
        sx={{
          ...dialogCloseTitleSx,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '8px 8px 0 0',
          py: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {step === 'crop' ? 'Ausschnitt anpassen' : 'Eigenes Bild'}
        </Typography>
        <DialogCloseIconButton
          onClose={handleClose}
          disabled={busy}
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          iconSx={{ color: '#fff' }}
        />
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {step === 'crop' && imageSrc ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 320,
                bgcolor: '#111',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <ImageCropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
              <ZoomInIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.05}
                onChange={(_e, v) => setZoom(v as number)}
                aria-label="Zoom"
                sx={{ color: '#667eea' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              Ziehe das Bild und zoome, bis der Ausschnitt passt.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
            <Avatar
              src={previewUrl}
              sx={{
                width: 120,
                height: 120,
                bgcolor: previewUrl ? 'transparent' : '#e0e7ff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontSize: '2.5rem',
                color: '#667eea',
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 340 }}>
              Dein Foto erscheint neben dem Avatar-Emoji. Du kannst den Ausschnitt nach dem Hochladen anpassen.
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              hidden
              onChange={handleFileChange}
            />
            <Button
              variant="contained"
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <CropIcon />}
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                borderRadius: 1.5,
                px: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {previewUrl ? 'Neues Bild wählen & zuschneiden' : 'Bild wählen & zuschneiden'}
            </Button>
            {previewUrl && onRemove && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteOutlineIcon />}
                disabled={busy}
                onClick={handleRemove}
                sx={{ textTransform: 'none', borderRadius: 1.5 }}
              >
                Bild entfernen
              </Button>
            )}
          </Box>
        )}
        {error && (
          <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 1 }}>
        {step === 'crop' ? (
          <>
            <Button
              onClick={() => {
                setImageSrc((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
                setStep('manage');
                setError(null);
              }}
              disabled={busy}
              variant="outlined"
              sx={{ textTransform: 'none', borderRadius: 1.5 }}
            >
              Zurück
            </Button>
            <Button
              onClick={handleSaveCrop}
              disabled={busy || !croppedAreaPixels}
              variant="contained"
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PhotoCameraIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontWeight: 600,
              }}
            >
              {busy ? 'Speichern…' : 'Ausschnitt speichern'}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleClose}
            disabled={busy}
            variant="outlined"
            sx={{
              borderRadius: 1.5,
              px: 3,
              fontWeight: 600,
              borderColor: '#1976d2',
              color: '#1976d2',
              textTransform: 'none',
            }}
          >
            Schließen
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AvatarPhotoDialog;
