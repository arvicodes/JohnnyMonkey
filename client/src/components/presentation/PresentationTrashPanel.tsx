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
  DeleteForever as DeleteForeverIcon,
  RestoreFromTrash as RestoreIcon,
} from '@mui/icons-material';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import type { PresentationTrashItem } from '../../lib/presentationTrash';

interface PresentationTrashPanelProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  items: PresentationTrashItem[];
  onClose: () => void;
  onRestore: (itemId: string) => void;
  onDeleteForever: (itemId: string) => void;
  onEmptyTrash: () => void;
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

const PresentationTrashPanel: React.FC<PresentationTrashPanelProps> = ({
  anchorEl,
  open,
  items,
  onClose,
  onRestore,
  onDeleteForever,
  onEmptyTrash,
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
            width: 320,
            maxHeight: 420,
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
          Papierkorb
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {items.length > 0 && (
            <Button
              size="small"
              onClick={onEmptyTrash}
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
            Gelöschte Folien und Notizen erscheinen hier. Du kannst sie wiederherstellen oder
            endgültig entfernen.
          </Typography>
        ) : (
          items.map((item, index) => (
            <Box key={item.id}>
              {index > 0 && <Divider sx={{ my: 0.75 }} />}
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: PRES_EDITOR_UI.textMuted, mt: 0.25 }}>
                    {item.type === 'slide' ? 'Folie' : 'Notizen'} · {formatWhen(item.deletedAt)}
                  </Typography>
                </Box>
                <Tooltip title="Wiederherstellen">
                  <IconButton
                    size="small"
                    onClick={() => onRestore(item.id)}
                    sx={{ width: 26, height: 26, color: PRES_EDITOR_UI.accent }}
                  >
                    <RestoreIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Endgültig löschen">
                  <IconButton
                    size="small"
                    onClick={() => onDeleteForever(item.id)}
                    sx={{ width: 26, height: 26, color: '#c62828' }}
                  >
                    <DeleteForeverIcon sx={{ fontSize: 15 }} />
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

export default PresentationTrashPanel;
