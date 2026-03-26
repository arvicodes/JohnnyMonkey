import CloseIcon from '@mui/icons-material/Close';
import { IconButton, SxProps, Theme } from '@mui/material';

/** `DialogTitle` braucht `position: 'relative'` und genug `pr`, damit der Titel nicht unter dem X liegt. */
export const dialogCloseTitleSx: SxProps<Theme> = {
  pr: 5,
  position: 'relative',
};

type DialogCloseIconButtonProps = {
  onClose: () => void;
  /** Wird zusätzlich zu den Standard-Styles gesetzt (z. B. Farbe, Hover auf farbigem Header). */
  sx?: SxProps<Theme>;
  iconSx?: SxProps<Theme>;
  disabled?: boolean;
  'aria-label'?: string;
};

/**
 * Kleines X rechts im Dialog-Titel; Icon füllt den Hit-Bereich (28×28).
 * Titelzeile: `sx={{ ...dialogCloseTitleSx, … }}` auf dem `DialogTitle`.
 */
export function DialogCloseIconButton({
  onClose,
  sx,
  iconSx,
  disabled,
  'aria-label': ariaLabel = 'Schließen',
}: DialogCloseIconButtonProps) {
  return (
    <IconButton
      size="small"
      onClick={onClose}
      disabled={disabled}
      aria-label={ariaLabel}
      sx={{
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        p: 0.25,
        minWidth: 28,
        width: 28,
        height: 28,
        ...sx,
      }}
    >
      <CloseIcon sx={{ fontSize: 18, ...iconSx }} />
    </IconButton>
  );
}
