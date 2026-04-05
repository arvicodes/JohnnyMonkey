import React from 'react';
import { Box } from '@mui/material';
import { EXIT_TICKET_CARD_IMAGE_SRC, type ExitTicketTemplateType } from './ExitTicketStudentForm';

export function exitTicketImageSrcForId(id: string | null | undefined): string {
  if (!id) return EXIT_TICKET_CARD_IMAGE_SRC.feedback;
  const k = id as ExitTicketTemplateType;
  return EXIT_TICKET_CARD_IMAGE_SRC[k] ?? EXIT_TICKET_CARD_IMAGE_SRC.feedback;
}

/**
 * Karten-Motiv der Exit-Ticket-Vorlage für Dialog-Header (wie auf der Kartenübersicht).
 */
export function ExitTicketCardHeaderImage(props: {
  templateId: string | null | undefined;
  size?: number;
}) {
  const { templateId, size = 76 } = props;
  const src = exitTicketImageSrcForId(templateId);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.1)',
      }}
    >
      <Box
        component="img"
        src={src}
        alt=""
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </Box>
  );
}
