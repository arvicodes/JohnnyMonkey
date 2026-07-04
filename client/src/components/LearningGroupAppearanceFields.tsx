import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  TextFieldProps,
} from '@mui/material';
import EmojiSelector from './EmojiSelector';
import {
  DEFAULT_LEARNING_GROUP_COLOR,
  DEFAULT_LEARNING_GROUP_ICON,
  LEARNING_GROUP_COLOR_PRESETS,
  LEARNING_GROUP_ICON_OPTIONS,
} from '../lib/learningGroupAppearance';

interface LearningGroupAppearanceFieldsProps {
  name: string;
  onNameChange: (value: string) => void;
  iconEmoji: string;
  onIconEmojiChange: (value: string) => void;
  color: string;
  onColorChange: (value: string) => void;
  nameFieldProps?: Partial<TextFieldProps>;
}

const LearningGroupAppearanceFields: React.FC<LearningGroupAppearanceFieldsProps> = ({
  name,
  onNameChange,
  iconEmoji,
  onIconEmojiChange,
  color,
  onColorChange,
  nameFieldProps,
}) => {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
      <TextField
        autoFocus
        margin="dense"
        label="Name der Lerngruppe"
        type="text"
        fullWidth
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        {...nameFieldProps}
      />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Farbe
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {LEARNING_GROUP_COLOR_PRESETS.map((preset) => (
            <Box
              key={preset}
              role="button"
              tabIndex={0}
              aria-label={`Farbe ${preset}`}
              onClick={() => onColorChange(preset)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onColorChange(preset);
              }}
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                bgcolor: preset,
                cursor: 'pointer',
                border: color === preset ? '3px solid #212121' : '2px solid rgba(0,0,0,0.12)',
                boxShadow: color === preset ? '0 0 0 2px #fff inset' : 'none',
                transition: 'transform 0.15s ease',
                '&:hover': { transform: 'scale(1.08)' },
              }}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Icon
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
          {LEARNING_GROUP_ICON_OPTIONS.map((emoji) => (
            <Box
              key={emoji}
              role="button"
              tabIndex={0}
              aria-label={`Icon ${emoji}`}
              onClick={() => onIconEmojiChange(emoji)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onIconEmojiChange(emoji);
              }}
              sx={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                borderRadius: 1,
                cursor: 'pointer',
                border: iconEmoji === emoji ? '2px solid #1976d2' : '1px solid #e0e0e0',
                bgcolor: iconEmoji === emoji ? '#e3f2fd' : '#fff',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: '#f5f5f5', transform: 'scale(1.05)' },
              }}
            >
              {emoji}
            </Box>
          ))}
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setEmojiPickerOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Weitere Emojis… ({iconEmoji || DEFAULT_LEARNING_GROUP_ICON})
        </Button>
      </Box>

      <Box
        sx={{
          p: 1.2,
          borderRadius: 1.5,
          border: '1px solid #e0e0e0',
          bgcolor: `${color || DEFAULT_LEARNING_GROUP_COLOR}18`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>
          {iconEmoji || DEFAULT_LEARNING_GROUP_ICON}
        </Typography>
        <Typography sx={{ fontWeight: 700, color: color || DEFAULT_LEARNING_GROUP_COLOR, fontSize: '0.85rem' }}>
          {name.trim() || 'Vorschau'}
        </Typography>
      </Box>

      <EmojiSelector
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onSelect={onIconEmojiChange}
        currentEmoji={iconEmoji || DEFAULT_LEARNING_GROUP_ICON}
        title="Icon für Lerngruppe wählen"
      />
    </Box>
  );
};

export default LearningGroupAppearanceFields;
