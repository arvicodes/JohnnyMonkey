import React from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentPaste as PasteIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import {
  MAX_SLIDE_CLIPBOARD_ITEMS,
  type PresentationSlideClipboardItem,
} from '../../lib/presentationSlideClipboard';

interface PresentationSlideClipboardPanelProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  items: PresentationSlideClipboardItem[];
  onClose: () => void;
  onPaste: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const PresentationSlideClipboardPanel: React.FC<PresentationSlideClipboardPanelProps> = ({
  anchorEl,
  open,
  items,
  onClose,
  onPaste,
  onRemove,
  onClear,
}) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: 300,
            maxHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: PRES_EDITOR_UI.accentSoft,
          borderBottom: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRES_EDITOR_UI.accent }}>
          Folien-Ablage
          <Typography component="span" sx={{ fontSize: 10, fontWeight: 600, color: PRES_EDITOR_UI.textMuted, ml: 0.5 }}>
            ({items.length}/{MAX_SLIDE_CLIPBOARD_ITEMS})
          </Typography>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {items.length > 0 && (
            <Button
              size="small"
              onClick={onClear}
              sx={{ fontSize: 10, textTransform: 'none', minWidth: 0, px: 0.75 }}
            >
              Leeren
            </Button>
          )}
          <IconButton size="small" onClick={onClose} sx={{ width: 24, height: 24 }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {items.length === 0 ? (
          <Typography sx={{ fontSize: 11, color: PRES_EDITOR_UI.textMuted, px: 0.5, py: 1 }}>
            Noch leer. Aktuelle Folie mit „In Ablage“ ablegen — in jeder Präsentation verfügbar.
          </Typography>
        ) : (
          items.map((item, index) => (
            <Box key={item.id}>
              {index > 0 && <Divider sx={{ my: 0.75 }} />}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, mt: 0.2 }}>
                    {item.sourceLesson ? `${item.sourceLesson} · ` : ''}
                    {formatWhen(item.addedAt)}
                  </Typography>
                </Box>
                <Tooltip title="Hier einfügen">
                  <IconButton
                    size="small"
                    onClick={() => onPaste(item.id)}
                    sx={{ width: 28, height: 28, color: PRES_EDITOR_UI.accent }}
                  >
                    <PasteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Aus Ablage entfernen">
                  <IconButton
                    size="small"
                    onClick={() => onRemove(item.id)}
                    sx={{ width: 28, height: 28 }}
                  >
                    <DeleteIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Popover>
  );
};

export default PresentationSlideClipboardPanel;
