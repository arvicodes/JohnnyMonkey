import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  WOCHENAUFGABEN_BG,
  WOCHENAUFGABEN_BORDER,
  WOCHENAUFGABEN_TEXT_COLOR,
} from '../../lib/wochenaufgabenFolder';
import {
  WA_PHASE1_DAYS,
  WA_PHASE2_DAYS,
  WA_PHASE3_DAYS,
  WA_SLOT_BUTTONS,
} from '../../lib/wochenaufgabenWorkflow';

/** Kleines Demo-Widget — gleiches Layout wie die echten Buttons. */
function DemoChip({
  variant,
  label = '1',
}: {
  variant: 'draft' | 'active';
  label?: string;
}) {
  const border = variant === 'draft' ? '#d0d0d0' : WOCHENAUFGABEN_TEXT_COLOR;
  const bg = variant === 'draft' ? '#eceff1' : '#fff8e1';
  const color = variant === 'draft' ? '#78909c' : WOCHENAUFGABEN_TEXT_COLOR;

  return (
    <Box sx={{ width: 68, flexShrink: 0 }}>
      <Box sx={{ border: `1px solid ${border}`, borderRadius: '6px', overflow: 'hidden', bgcolor: bg }}>
        <Box sx={{ display: 'flex', height: 24, borderBottom: `1px solid ${border}` }}>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.75rem',
              color,
              borderRight: `1px solid ${border}`,
            }}
          >
            {label}
          </Box>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.58rem',
              color,
            }}
          >
            V
          </Box>
        </Box>
        <Box sx={{ display: 'flex', height: 16 }}>
          {WA_SLOT_BUTTONS.map((slot) => (
            <Box
              key={slot}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.48rem',
                fontWeight: 500,
                color,
                borderRight: slot < 5 ? `1px solid ${border}` : 'none',
              }}
            >
              {slot}
            </Box>
          ))}
        </Box>
      </Box>
      {variant === 'active' ? (
        <Typography sx={{ fontSize: '0.48rem', color, textAlign: 'center', mt: 0.15, fontWeight: 600 }}>
          3d 12h
        </Typography>
      ) : null}
    </Box>
  );
}

function PhaseStep({
  days,
  title,
  color,
  children,
}: {
  days: string;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        py: 0.75,
        borderBottom: '1px solid #eee',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box
        sx={{
          minWidth: 52,
          px: 0.75,
          py: 0.35,
          borderRadius: 1,
          bgcolor: color,
          color: '#fff',
          fontSize: '0.62rem',
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {days}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: WOCHENAUFGABEN_TEXT_COLOR, mb: 0.25 }}>
          {title}
        </Typography>
        <Typography component="div" sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.45 }}>
          {children}
        </Typography>
      </Box>
    </Box>
  );
}

type DialogProps = {
  open: boolean;
  onClose: () => void;
};

export function WochenaufgabenInfoDialog({ open, onClose }: DialogProps) {
  const totalDays = WA_PHASE1_DAYS + WA_PHASE2_DAYS + WA_PHASE3_DAYS;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: WOCHENAUFGABEN_BG, color: WOCHENAUFGABEN_TEXT_COLOR }}>
        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
          📅 So funktionieren Wochenaufgaben
        </Typography>
        <DialogCloseIconButton onClose={onClose} />
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1.5, lineHeight: 1.5 }}>
          Jede Wochenaufgabe läuft in drei Phasen ({totalDays} Tage insgesamt). Unten siehst du, was die Buttons
          bedeuten — genau so sehen sie im Dashboard aus.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1.5,
            flexWrap: 'wrap',
            p: 1.25,
            borderRadius: 1.25,
            bgcolor: '#fafbfd',
            border: `1px solid ${WOCHENAUFGABEN_BORDER}`,
            mb: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '0.62rem', color: '#78909c', mb: 0.35, fontWeight: 600 }}>
              Noch nicht freigegeben
            </Typography>
            <DemoChip variant="draft" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.62rem', color: WOCHENAUFGABEN_TEXT_COLOR, mb: 0.35, fontWeight: 600 }}>
              Aktiv (mit Timer)
            </Typography>
            <DemoChip variant="active" />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1.5, fontSize: '0.68rem' }}>
          <Typography sx={{ fontSize: 'inherit' }}>
            <strong>Nummer</strong> — Aufgabe als PDF öffnen
          </Typography>
          <Typography sx={{ fontSize: 'inherit' }}>
            <strong>V</strong> — Erklärvideo (nur ein SuS)
          </Typography>
          <Typography sx={{ fontSize: 'inherit' }}>
            <strong>1</strong> — Eigene Lösung (PDF hochladen)
          </Typography>
          <Typography sx={{ fontSize: 'inherit' }}>
            <strong>2</strong> — Lösung eines anderen SuS
          </Typography>
          <Typography sx={{ fontSize: 'inherit' }}>
            <strong>3</strong> — Audio-Rückmeldung hochladen
          </Typography>
          <Typography sx={{ fontSize: 'inherit' }}>
            <strong>4</strong> — Erhaltene Rückmeldung anhören
          </Typography>
          <Typography sx={{ fontSize: 'inherit', gridColumn: '1 / -1' }}>
            <strong>5</strong> — Korrigierte Lösung (PDF hochladen)
          </Typography>
        </Box>

        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: WOCHENAUFGABEN_TEXT_COLOR, mb: 0.5 }}>
          Ablauf
        </Typography>

        <PhaseStep days={`${WA_PHASE1_DAYS} Tage`} title="Phase 1 — Aufgabe lösen" color="#ef6c00">
          Die Wochenaufgabe ist <strong>gelb</strong> und der Timer läuft. Lade unter <strong>1</strong> deine
          Lösung als PDF hoch. Wer zuerst auf <strong>V</strong> klickt, darf das Erklärvideo hochladen — nur
          eine Person pro Aufgabe. Nach {WA_PHASE1_DAYS} Tagen kann jeder das Video ansehen (wenn hochgeladen).
        </PhaseStep>

        <PhaseStep days={`${WA_PHASE2_DAYS} Tage`} title="Phase 2 — Partner-Feedback" color="#f57c00">
          Du bekommst unter <strong>2</strong> die Lösung eines anderen SuS aus der Lerngruppe (zufällig
          zugeteilt). Höre dir die Lösung an und lade unter <strong>3</strong> eine Audio-Rückmeldung hoch.
        </PhaseStep>

        <PhaseStep days={`${WA_PHASE2_DAYS} Tage`} title="Phase 3 — Korrektur" color="#e65100">
          Unter <strong>4</strong> hörst du die Rückmeldung, die ein anderer SuS zu deiner Lösung aufgenommen hat.
          Lade unter <strong>5</strong> eine verbesserte Lösung als PDF hoch. Danach ist die Wochenaufgabe
          abgeschlossen — die nächste kann starten.
        </PhaseStep>

        <Box
          sx={{
            mt: 1.25,
            p: 1,
            borderRadius: 1,
            bgcolor: '#fff8e1',
            border: `1px solid ${WOCHENAUFGABEN_BORDER}`,
          }}
        >
          <Typography sx={{ fontSize: '0.68rem', color: WOCHENAUFGABEN_TEXT_COLOR, lineHeight: 1.45 }}>
            <strong>Tipp:</strong> Grau = noch nicht freigegeben. Gelb = du musst etwas tun. Der Timer unter dem
            Button zeigt, wie viel Zeit in der aktuellen Phase noch bleibt. Erledigte Schritte sind orange
            hervorgehoben.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/** Info-Button neben „Wochenaufgaben“. */
export default function WochenaufgabenInfoButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <IconButton
        size="small"
        aria-label="Info zu Wochenaufgaben"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        sx={{
          width: 20,
          height: 20,
          p: 0,
          ml: 0.35,
          color: WOCHENAUFGABEN_TEXT_COLOR,
          '&:hover': { bgcolor: 'rgba(239, 108, 0, 0.12)' },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 15 }} />
      </IconButton>
      <WochenaufgabenInfoDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
