import React, { useEffect, useState } from 'react';
import { Box, TextField } from '@mui/material';
import {
  formatIsoDateDe,
  formatStoryPageDateWithWeekday,
  toDateInputIso,
} from '../../lib/storyPageDate';

export type StoryDatePickerValueFormat = 'iso' | 'de' | 'de-weekday';

function formatOutput(iso: string, format: StoryDatePickerValueFormat): string {
  if (!iso) return '';
  if (format === 'iso') return iso;
  if (format === 'de-weekday') return formatStoryPageDateWithWeekday(iso);
  return formatIsoDateDe(iso);
}

function stopBubble(e: React.SyntheticEvent) {
  e.stopPropagation();
}

type StoryDatePickerFieldProps = {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  size?: 'small' | 'medium';
  variant?: 'field' | 'inline';
  valueFormat?: StoryDatePickerValueFormat;
  disabled?: boolean;
  fullWidth?: boolean;
  stopPropagation?: boolean;
  sx?: object;
};

export function StoryDatePickerField({
  label = 'Datum',
  value = '',
  onChange,
  size = 'small',
  variant = 'field',
  valueFormat = 'iso',
  disabled,
  fullWidth,
  stopPropagation,
  sx,
}: StoryDatePickerFieldProps) {
  const isoFromProps = toDateInputIso(value);
  const [draftIso, setDraftIso] = useState(isoFromProps);

  useEffect(() => {
    setDraftIso(isoFromProps);
  }, [isoFromProps]);

  const commit = (nextIso: string) => {
    setDraftIso(nextIso);
    onChange(formatOutput(nextIso, valueFormat));
  };

  const field = (
    <TextField
      label={variant === 'inline' ? undefined : label}
      type="date"
      size={size}
      fullWidth={variant === 'inline' ? true : fullWidth}
      value={draftIso}
      disabled={disabled}
      onChange={(e) => commit(e.target.value)}
      onClick={stopPropagation ? stopBubble : undefined}
      InputLabelProps={{ shrink: true }}
      inputProps={{ 'aria-label': label }}
      sx={
        variant === 'inline'
          ? {
              width: '100%',
              '& input': {
                fontSize: '0.58rem',
                py: 0.35,
                px: 0.5,
              },
              '& .MuiOutlinedInput-root': {
                height: 26,
              },
              ...sx,
            }
          : sx
      }
    />
  );

  if (!stopPropagation) return field;

  return (
    <Box onClick={stopBubble} sx={{ width: variant === 'inline' ? '100%' : undefined }}>
      {field}
    </Box>
  );
}
