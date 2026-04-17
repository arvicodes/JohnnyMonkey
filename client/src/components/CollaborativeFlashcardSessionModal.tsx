import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StyleIcon from '@mui/icons-material/Style';
import { RichTextEditor } from './ui/rich-text-editor';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';

/** Gleiche Palette wie im TeacherDashboard (Karteikarten-Modal). */
const colors = {
  primary: '#2E7D32',
  secondary: '#F57C00',
  accent1: '#1976D2',
  accent2: '#C2185B',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  border: '#E0E0E0',
};

function fetchHeaders(): Record<string, string> {
  const loginCode = localStorage.getItem('loginCode')?.trim();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (loginCode) h['x-login-code'] = loginCode;
  return h;
}

type FlashCard = {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
  order?: number;
};

type DeckState = {
  id: string;
  title: string;
  cards: FlashCard[];
  subject?: { name: string } | null;
};

export type CollaborativeFlashcardSessionModalProps = {
  open: boolean;
  onClose: () => void;
  groupId: string;
  lessonPath: string;
};

export const CollaborativeFlashcardSessionModal: React.FC<CollaborativeFlashcardSessionModalProps> = ({
  open,
  onClose,
  groupId,
  lessonPath,
}) => {
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [deck, setDeck] = useState<DeckState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDeck = useCallback(async () => {
    if (!deckId || !groupId) return;
    try {
      const res = await fetch(
        `/api/flashcards/decks/${encodeURIComponent(deckId)}/collaborative-deck-full?groupId=${encodeURIComponent(groupId)}`,
        { headers: fetchHeaders() }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Deck konnte nicht geladen werden');
      }
      const data = (await res.json()) as { deck: DeckState };
      if (data.deck) {
        setDeck(data.deck);
        setActionError(null);
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
    }
  }, [deckId, groupId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingMeta(true);
    setMetaError(null);
    setDeckId(null);
    setDeck(null);
    setActionError(null);
    setIsAddingCard(false);
    setNewCardFront('');
    setNewCardBack('');
    (async () => {
      try {
        const res = await fetch(
          `/api/lesson-instructions/by-group/${encodeURIComponent(groupId)}?lessonPath=${encodeURIComponent(lessonPath)}`,
          { headers: fetchHeaders() }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Laden fehlgeschlagen');
        }
        const data = (await res.json()) as { content?: { lessonPlan?: unknown } };
        const plan = (data.content?.lessonPlan || []) as Array<{
          type?: string;
          linkedCollaborativeDeckId?: string;
          linkedCollaborativeDeckTitle?: string;
        }>;
        const hit = plan.find((p) => p.type === 'karteikarten-gemeinsam-erstellen' && p.linkedCollaborativeDeckId);
        if (cancelled) return;
        if (!hit?.linkedCollaborativeDeckId) {
          setMetaError(
            'Die Lehrkraft hat im Stundenplan (Ansicht „Erstellen“) noch kein Ziel-Deck gewählt. Das Deck muss der Lerngruppe unter „Karteikarten“ zugewiesen sein.'
          );
          setLoadingMeta(false);
          return;
        }
        setDeckId(hit.linkedCollaborativeDeckId);
      } catch (e: unknown) {
        if (!cancelled) setMetaError(e instanceof Error ? e.message : 'Fehler beim Laden');
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, groupId, lessonPath]);

  useEffect(() => {
    if (!open || !deckId) return;
    void loadDeck();
    const t = window.setInterval(() => void loadDeck(), 2500);
    return () => window.clearInterval(t);
  }, [open, deckId, loadDeck]);

  const handleAddCard = () => {
    setIsAddingCard(true);
    setNewCardFront('');
    setNewCardBack('');
  };

  const handleSaveCard = async () => {
    if (!deckId || !groupId || !newCardFront.trim() || !newCardBack.trim()) {
      setActionError('Bitte Frage und Antwort ausfüllen.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/flashcards/decks/${encodeURIComponent(deckId)}/cards/collaborative`, {
        method: 'POST',
        headers: fetchHeaders(),
        body: JSON.stringify({
          groupId,
          front: newCardFront,
          back: newCardBack,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Speichern fehlgeschlagen');
      }
      setIsAddingCard(false);
      setNewCardFront('');
      setNewCardBack('');
      await loadDeck();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          minHeight: '85vh',
          maxHeight: '95vh',
          width: '98vw',
          maxWidth: '1600px',
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
          background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          height: '6px',
          background: `linear-gradient(90deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
          width: '100%',
        }}
      />
      <DialogTitle
        sx={{
          ...dialogCloseTitleSx,
          pb: 1,
          pt: 1.5,
          background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.accent1}08 100%)`,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: colors.textPrimary, fontSize: '1.1rem', mb: 0.5, pr: 1 }}>
          Karteikarten gemeinsam erstellen
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            Gleicher Editor wie bei der Lehrkraft — jede Person kann Karten hinzufügen; die Liste aktualisiert sich laufend.
          </Typography>
          {deck && (
            <>
              <Chip
                label={`${deck.cards?.length ?? 0} Karten`}
                size="small"
                sx={{
                  bgcolor: colors.primary + '20',
                  color: colors.primary,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 22,
                }}
              />
              {deck.subject?.name ? (
                <Chip label={deck.subject.name} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
              ) : null}
            </>
          )}
        </Box>
        <DialogCloseIconButton onClose={onClose} />
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          overflow: 'auto',
          flex: 1,
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-thumb': { background: colors.primary + '40', borderRadius: '4px' },
        }}
      >
        {loadingMeta && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 4, px: 2 }}>
            <CircularProgress size={28} />
            <Typography variant="body2">Verbindung wird aufgebaut …</Typography>
          </Box>
        )}
        {!loadingMeta && metaError && (
          <Typography color="error" variant="body2" sx={{ p: 2 }}>
            {metaError}
          </Typography>
        )}
        {!loadingMeta && !metaError && deckId && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {actionError && (
              <Typography color="error" variant="body2" sx={{ px: 2, pt: 1 }}>
                {actionError}
              </Typography>
            )}

            {!deck && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {deck && (
              <>
                <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                    {deck.title}
                  </Typography>
                </Box>

                {isAddingCard && (
                  <Box
                    sx={{
                      p: 3,
                      mb: 2,
                      background: `linear-gradient(135deg, ${colors.accent1}08 0%, ${colors.accent2}08 100%)`,
                      border: `2px solid ${colors.accent1}30`,
                      borderRadius: '16px',
                      mx: 2,
                      mt: 1,
                      boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        fontWeight: 600,
                        color: colors.accent1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        fontSize: '1rem',
                      }}
                    >
                      <AddIcon sx={{ fontSize: 20 }} />
                      Neue Karteikarte hinzufügen
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: colors.textPrimary }}>
                          Frage *
                        </Typography>
                        <RichTextEditor
                          value={newCardFront}
                          onChange={(value) => setNewCardFront(value)}
                          placeholder="Frage eingeben..."
                          rows={3}
                          compact
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: colors.textPrimary }}>
                          Antwort *
                        </Typography>
                        <RichTextEditor
                          value={newCardBack}
                          onChange={(value) => setNewCardBack(value)}
                          placeholder="Antwort eingeben..."
                          rows={3}
                          compact
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setIsAddingCard(false);
                          setNewCardFront('');
                          setNewCardBack('');
                        }}
                        disabled={saving}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => void handleSaveCard()}
                        disabled={saving || !newCardFront.trim() || !newCardBack.trim()}
                        sx={{
                          background: `linear-gradient(135deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                        }}
                      >
                        {saving ? 'Speichern …' : 'Karte speichern'}
                      </Button>
                    </Box>
                  </Box>
                )}

                {((deck.cards?.length ?? 0) > 0 || isAddingCard) && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2, mb: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleAddCard}
                      disabled={isAddingCard}
                      sx={{
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent1} 100%)`,
                        fontSize: '0.75rem',
                      }}
                    >
                      Neue Karte
                    </Button>
                  </Box>
                )}

                <Box sx={{ flex: 1, overflow: 'visible', p: 1.5, pt: 0 }}>
                  {(!deck.cards || deck.cards.length === 0) && !isAddingCard ? (
                    <Card
                      sx={{
                        p: 6,
                        textAlign: 'center',
                        bgcolor: colors.background,
                        borderRadius: '20px',
                        border: `2px dashed ${colors.border}`,
                        mx: 2,
                      }}
                    >
                      <StyleIcon sx={{ fontSize: 60, color: colors.textSecondary, mb: 2, opacity: 0.4 }} />
                      <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1.5, fontWeight: 600 }}>
                        Noch keine Karteikarten
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 3 }}>
                        Erstellt die erste Karte gemeinsam — wie im Karteikarten-Editor der Lehrkraft.
                      </Typography>
                      <Button
                        variant="contained"
                        size="medium"
                        startIcon={<AddIcon />}
                        onClick={handleAddCard}
                        sx={{
                          background: `linear-gradient(135deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                          borderRadius: '16px',
                          px: 4,
                          py: 1.5,
                        }}
                      >
                        Erste Karte erstellen
                      </Button>
                    </Card>
                  ) : (
                    <Grid container spacing={2}>
                      {(deck.cards || []).map((card, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
                          <Card
                            sx={{
                              height: '100%',
                              minHeight: 280,
                              background: `linear-gradient(135deg, ${colors.cardBg} 0%, ${colors.background} 100%)`,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            }}
                          >
                            <Box
                              sx={{
                                p: 1.5,
                                pb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: `1px solid ${colors.border}20`,
                              }}
                            >
                              <Chip
                                label={`Karte ${index + 1}`}
                                size="small"
                                sx={{
                                  bgcolor: colors.primary + '20',
                                  color: colors.primary,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 24,
                                }}
                              />
                              {card.hint && (
                                <Chip label={card.hint} size="small" variant="outlined" sx={{ fontSize: '0.65rem', maxWidth: '50%' }} />
                              )}
                            </Box>
                            <CardContent sx={{ p: 1.5, pt: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.2, color: colors.primary, fontSize: '0.7rem' }}>
                                Frage:
                              </Typography>
                              <Box
                                sx={{
                                  mb: 0.5,
                                  fontSize: '0.65rem',
                                  lineHeight: 1.15,
                                  color: colors.textPrimary,
                                  '& p': { margin: '0 0 0.5em 0' },
                                  '& p:last-child': { margin: 0 },
                                }}
                                dangerouslySetInnerHTML={{ __html: card.front || '—' }}
                              />
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, mb: 0.2, mt: 0.5, color: colors.secondary, fontSize: '0.7rem' }}
                              >
                                Antwort:
                              </Typography>
                              <Box
                                sx={{
                                  fontSize: '0.65rem',
                                  lineHeight: 1.15,
                                  color: colors.textPrimary,
                                  '& p': { margin: '0 0 0.5em 0' },
                                  '& p:last-child': { margin: 0 },
                                }}
                                dangerouslySetInnerHTML={{ __html: card.back || '—' }}
                              />
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 1.5, borderTop: `1px solid ${colors.border}` }}>
        <Button onClick={onClose} variant="outlined" size="small">
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
