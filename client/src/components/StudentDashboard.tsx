import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Avatar,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  Popover,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl
} from '@mui/material';
import {
  School as SchoolIcon,
  QuestionAnswer as QuizIcon,
  Edit as EditIcon,
  Grade as GradeIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  RecordVoiceOver as ParticipationIcon,
  HelpOutline as HelpIcon,
  Games as GamesIcon,
  DragIndicator as DragIndicatorIcon,
  Add as AddIcon,
  Palette as PaletteIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatUnderlined as FormatUnderlinedIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
  AutoStories as AutoStoriesIcon
} from '@mui/icons-material';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { QuizResultsModal } from './QuizResultsModal';
import EmojiSelector from './EmojiSelector';
import InboxModal from './InboxModal';
import QuizStartButton from './QuizStartButton';
import SubmissionUpload from './SubmissionUpload';
import ReisebegleiterAvatarBadge from './ReisebegleiterPanel';
import { RIDDLES, Riddle } from './riddles';
import { determinateLinearProgressSx } from '../lib/muiLinearProgressSx';

/**
 * Helper-Funktion: Prüft ob eine Datei eine korrigierbare Datei ist (KA_, HÜ_, HU_)
 */
const isCorrectionFile = (fileName: string): boolean => {
  return fileName.startsWith('KA_') || fileName.startsWith('HÜ_') || fileName.startsWith('HU_') || fileName.startsWith('QZ_');
};

export type TextFormatRange = { start: number; end: number; type: 'material' | 'term' | 'instruction' };
export type SharedInputItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: 'xs' | 'small' | 'normal' | 'medium' | 'large' | 'xl';
  formattedRanges?: TextFormatRange[];
};
export type SharedInputConnection = { fromId: string; toId: string };
const CANVAS_PADDING = 12;
const defaultPosition = (index: number) => ({ x: CANVAS_PADDING + (index % 3) * 100, y: CANVAS_PADDING + Math.floor(index / 3) * 52 });

export const SHARED_INPUT_CARD_COLORS = [
  '#ffffff', '#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0', '#e1bee7', '#ffccbc', '#d7ccc8'
];

const FONT_SIZE_OPTIONS: { value: SharedInputItem['fontSize']; label: string; rem: string }[] = [
  { value: 'xs', label: 'Sehr klein', rem: '0.65rem' },
  { value: 'small', label: 'Klein', rem: '0.75rem' },
  { value: 'normal', label: 'Normal', rem: '0.85rem' },
  { value: 'medium', label: 'Mittel', rem: '0.95rem' },
  { value: 'large', label: 'Groß', rem: '1.1rem' },
  { value: 'xl', label: 'Sehr groß', rem: '1.25rem' },
];
const FONT_SIZES: Record<NonNullable<SharedInputItem['fontSize']>, string> = Object.fromEntries(
  FONT_SIZE_OPTIONS.map((o) => [o.value, o.rem])
) as Record<NonNullable<SharedInputItem['fontSize']>, string>;

function normalizeSpacesBeforePunctuation(s: string): string {
  return s
    .replace(/[\s\u00A0]+([,.])/g, '$1')  // kein Leerzeichen/Zeilenumbruch/non-breaking space vor Komma oder Punkt
    .replace(/,([\s\u00A0]+)/g, ', ')     // nach Komma: Whitespace → ein Leerzeichen
    .replace(/\.([\s\u00A0]+)/g, '. ')    // Punkt gefolgt von Whitespace → Punkt + ein Leerzeichen
    .replace(/\.([\s\u00A0]*)$/g, '.');   // am Ende: Punkt ohne Whitespace dahinter
}

function parseItem(x: any, i: number): SharedInputItem {
  const rawText = x && typeof x.text === 'string' ? x.text : String(x?.text ?? '');
  const text = normalizeSpacesBeforePunctuation(rawText);
  const base = x && typeof x.id === 'string' && typeof x.text === 'string'
    ? { id: x.id, text, x: typeof x.x === 'number' ? x.x : defaultPosition(i).x, y: typeof x.y === 'number' ? x.y : defaultPosition(i).y }
    : { id: `m-${i}`, text, ...defaultPosition(i) };
  const formattedRanges: TextFormatRange[] = Array.isArray(x?.formattedRanges)
    ? x.formattedRanges
        .filter((r: any) => r && typeof r.start === 'number' && typeof r.end === 'number' && (r.type === 'material' || r.type === 'term' || r.type === 'instruction'))
        .map((r: any) => ({ start: r.start, end: r.end, type: r.type }))
    : [];
  return {
    ...base,
    color: typeof x?.color === 'string' ? x.color : undefined,
    bold: !!x?.bold,
    italic: !!x?.italic,
    underline: !!x?.underline,
    fontSize: FONT_SIZE_OPTIONS.some((o) => o.value === x?.fontSize) ? x.fontSize : undefined,
    formattedRanges: formattedRanges.length > 0 ? formattedRanges : undefined,
  };
}

export function parseSharedContent(raw: string): { items: SharedInputItem[]; connections: SharedInputConnection[] } {
  if (!raw?.trim()) return { items: [], connections: [] };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const items = parsed.map((x: any, i: number) => parseItem(x, i)).filter((x: SharedInputItem) => x.text.trim() !== '');
      return { items, connections: [] };
    }
    if (parsed && Array.isArray(parsed.items)) {
      const items = parsed.items.map((x: any, i: number) => parseItem(x, i)).filter((x: SharedInputItem) => x.text.trim() !== '');
      const connections: SharedInputConnection[] = Array.isArray(parsed.connections)
        ? parsed.connections.filter((c: any) => c && typeof c.fromId === 'string' && typeof c.toId === 'string')
        : [];
      return { items, connections };
    }
  } catch {
    const lines = raw.split(/\n/).filter(Boolean);
    const items = lines.map((line, i) => ({ ...parseItem({ text: line.trim() }, i), text: line.trim() }));
    return { items, connections: [] };
  }
  return { items: [], connections: [] };
}

const CARD_CENTER_OFFSET_X = 110;
const CARD_CENTER_OFFSET_Y = 25;

function renderFormattedTextAsHTML(text: string, ranges?: TextFormatRange[]): string {
  if (!ranges || ranges.length === 0) return text.replace(/\n/g, '<br>');
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let html = '';
  let lastIndex = 0;
  sorted.forEach((range) => {
    if (range.start > lastIndex) {
      html += escapeHtml(text.slice(lastIndex, range.start)).replace(/\n/g, '<br>');
    }
    const rangeText = escapeHtml(text.slice(range.start, range.end)).replace(/\n/g, '<br>');
    if (range.type === 'material') {
      html += `<span style="color: #ed6c02">${rangeText}</span>`;
    } else if (range.type === 'term') {
      html += `<span style="color: #1565c0">${rangeText}</span>`;
    } else if (range.type === 'instruction') {
      html += `<span style="font-style: italic">&bdquo;${rangeText}&ldquo;</span>`;
    }
    lastIndex = range.end;
  });
  if (lastIndex < text.length) {
    html += escapeHtml(text.slice(lastIndex)).replace(/\n/g, '<br>');
  }
  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const DraggableCanvasCard: React.FC<{
  item: SharedInputItem;
  otherItems: SharedInputItem[];
  onTextChange: (id: string, text: string) => void;
  onColorChange: (id: string, color: string) => void;
  onFormatChange: (id: string, format: Partial<Pick<SharedInputItem, 'bold' | 'italic' | 'underline' | 'fontSize'>>) => void;
  onFormatRangeChange: (id: string, ranges: TextFormatRange[]) => void;
  onConnect: (fromId: string, toId: string) => void;
  onDeleteItem: (id: string) => void;
}> = ({ item, otherItems, onTextChange, onColorChange, onFormatChange, onFormatRangeChange, onConnect, onDeleteItem }) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 1000 : 1 } : { zIndex: isDragging ? 1000 : 1 };
  const bg = item.color || '#fff';
  const fontSize = FONT_SIZES[item.fontSize || 'normal'];
  const targets = otherItems.filter((o) => o.id !== item.id);

  const extractPlainText = (element: HTMLElement): string => {
    return element.innerText || element.textContent || '';
  };

  const applyFormatToSelection = (type: 'material' | 'term' | 'instruction') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !contentEditableRef.current) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    const container = contentEditableRef.current;
    const containerText = extractPlainText(container);
    const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(container, range.endContainer, range.endOffset);
    if (startOffset === endOffset) return;
    const newRanges = [...(item.formattedRanges || [])];
    const newRange: TextFormatRange = { start: startOffset, end: endOffset, type };
    newRanges.push(newRange);
    onFormatRangeChange(item.id, newRanges);
    setMenuAnchor(null);
    setTimeout(() => {
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = renderFormattedTextAsHTML(containerText, newRanges);
      }
    }, 0);
  };

  const getTextOffset = (container: HTMLElement, node: Node, offset: number): number => {
    let textOffset = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let currentNode: Node | null = null;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node && currentNode.nodeType === Node.TEXT_NODE) {
        return textOffset + offset;
      }
      if (currentNode.nodeType === Node.TEXT_NODE) {
        textOffset += currentNode.textContent?.length || 0;
      }
    }
    const plainText = extractPlainText(container);
    const range = document.createRange();
    range.setStart(container, 0);
    range.setEnd(node, offset);
    return range.toString().length;
  };

  useEffect(() => {
    if (contentEditableRef.current) {
      const html = renderFormattedTextAsHTML(item.text, item.formattedRanges);
      if (contentEditableRef.current.innerHTML !== html) {
        contentEditableRef.current.innerHTML = html;
      }
    }
  }, [item.text, item.formattedRanges]);
  return (
    <Box
      ref={setNodeRef}
      style={{ position: 'absolute', left: item.x, top: item.y, minWidth: 100, maxWidth: 220, ...style }}
      sx={{
        boxShadow: isDragging ? 4 : 1,
        borderRadius: 2,
        border: '1px solid #81c784',
        bgcolor: bg,
        p: 0.75,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        opacity: isDragging ? 0.95 : 1,
        '&:hover': { boxShadow: 2 },
      }}
      {...attributes}
      {...listeners}
    >
      {/* Top-right controls: Stift + X übereinander (robust gegen kleine Kartengrößen) */}
      <Box
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          zIndex: 11,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 0.25,
        }}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
      >
        <Tooltip title="Einstellungen">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (menuAnchor) {
                setMenuAnchor(null);
              } else {
                setMenuAnchor(e.currentTarget);
              }
            }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
            sx={{ p: 0.2, minWidth: 20, width: 20, height: 20, color: '#666' }}
            aria-label="Einstellungen"
          >
            <EditIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        ref={contentEditableRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const plainText = extractPlainText(e.currentTarget);
          const normalized = normalizeSpacesBeforePunctuation(plainText);
          onTextChange(item.id, normalized);
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          minWidth: 80,
          pr: 1.5,
          fontSize,
          fontWeight: item.bold ? 700 : 400,
          fontStyle: item.italic ? 'italic' : 'normal',
          textDecoration: item.underline ? 'underline' : 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          outline: 'none',
          minHeight: '1.5em',
          '&:empty:before': {
            content: '"Text …"',
            color: 'rgba(0, 0, 0, 0.6)',
          },
        }}
      />
      <Popover
        open={!!menuAnchor}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        disableRestoreFocus
        sx={{ zIndex: 2000 }}
      >
        <Box sx={{ p: 1.5, minWidth: 200 }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {/* Schriftformatierung */}
          <Typography variant="caption" sx={{ display: 'block', color: '#333', mb: 0.75, fontWeight: 600, fontSize: '0.75rem' }}>Schriftformatierung</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
            <Tooltip title="Fett">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onFormatChange(item.id, { bold: !item.bold }); }} sx={{ p: 0.5, color: item.bold ? '#1976d2' : '#666', border: item.bold ? '1px solid #1976d2' : '1px solid #ddd', minWidth: 32, width: 32, height: 32 }}>
                <FormatBoldIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Kursiv">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onFormatChange(item.id, { italic: !item.italic }); }} sx={{ p: 0.5, color: item.italic ? '#1976d2' : '#666', border: item.italic ? '1px solid #1976d2' : '1px solid #ddd', minWidth: 32, width: 32, height: 32 }}>
                <FormatItalicIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Unterstrichen">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onFormatChange(item.id, { underline: !item.underline }); }} sx={{ p: 0.5, color: item.underline ? '#1976d2' : '#666', border: item.underline ? '1px solid #1976d2' : '1px solid #ddd', minWidth: 32, width: 32, height: 32 }}>
                <FormatUnderlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <FormControl size="small" sx={{ minWidth: 90, '& .MuiInputBase-root': { fontSize: '0.8rem', height: 32 } }}>
              <Select
                value={item.fontSize || 'normal'}
                onChange={(e) => {
                  e.stopPropagation();
                  onFormatChange(item.id, { fontSize: e.target.value as SharedInputItem['fontSize'] });
                }}
                variant="outlined"
                sx={{ fontSize: '0.8rem', height: 32 }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                MenuProps={{
                  disableScrollLock: true,
                  sx: { zIndex: 2500 },
                }}
              >
                {FONT_SIZE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8rem' }}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {/* Farbe */}
          <Typography variant="caption" sx={{ display: 'block', color: '#333', mb: 0.75, fontWeight: 600, fontSize: '0.75rem' }}>Farbe</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
            {SHARED_INPUT_CARD_COLORS.map((c) => (
              <Box key={c} onClick={(e) => { e.stopPropagation(); onColorChange(item.id, c); }} sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none', cursor: 'pointer', '&:hover': { opacity: 0.9, transform: 'scale(1.15)' } }} />
            ))}
          </Box>
          
          {/* Verbinden */}
          <Typography variant="caption" sx={{ display: 'block', color: '#333', mb: 0.75, fontWeight: 600, fontSize: '0.75rem' }}>
            Verbinden mit
          </Typography>
          <Box sx={{ maxHeight: 120, overflow: 'auto', mb: 1.5 }}>
            {targets.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Kein anderer Kasten.
              </Typography>
            ) : (
              targets.map((t) => (
                <Box
                  key={t.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnect(item.id, t.id);
                    setMenuAnchor(null);
                  }}
                  sx={{ py: 0.4, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0.5, px: 0.5 }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }} noWrap>
                    {t.text || '(leer)'}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
          
          {/* Eintrag löschen (im Stiftmenü) */}
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeleteItem(item.id);
              setMenuAnchor(null);
            }}
            sx={{ fontSize: '0.75rem', textTransform: 'none', mt: 0.5 }}
          >
            Eintrag löschen
          </Button>
          
        </Box>
      </Popover>
    </Box>
  );
};

/** Gemeinsame Leinwand: Einträge hinzufügen (+), frei auf der Fläche ziehen. fullScreen = für Präsentations-Tab (füllt Fenster). */
export const LessonSharedInputBox: React.FC<{ groupId: string; lessonPath: string; fullScreen?: boolean; autoFocusAddField?: boolean }> = ({ groupId, lessonPath, fullScreen, autoFocusAddField }) => {
  const [items, setItems] = useState<SharedInputItem[]>([]);
  const [connections, setConnections] = useState<SharedInputConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [emptyAddHint, setEmptyAddHint] = useState(false);
  const [clipboardStatus, setClipboardStatus] = useState<string>('');
  const newTextRef = useRef('');
  const containerRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { newTextRef.current = newText; }, [newText]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/learning-groups/${groupId}/lesson-shared-input?lessonPath=${encodeURIComponent(lessonPath)}`)
      .then((res) => res.ok ? res.json() : { content: '' })
      .then((data) => {
        if (!cancelled) {
          const { items: parsedItems, connections: parsedConnections } = parseSharedContent(data.content ?? '');
          setItems(parsedItems);
          setConnections(parsedConnections);
        }
      })
      .catch(() => { if (!cancelled) { setItems([]); setConnections([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId, lessonPath]);

  useEffect(() => {
    if (loading || !autoFocusAddField) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, [loading, autoFocusAddField]);

  const save = useCallback((payloadItems: SharedInputItem[], payloadConnections: SharedInputConnection[]) => {
    fetch(`/api/learning-groups/${groupId}/lesson-shared-input`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonPath, content: JSON.stringify({ items: payloadItems, connections: payloadConnections }) })
    }).catch(() => {});
  }, [groupId, lessonPath]);

  useEffect(() => {
    if (loading) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => save(items, connections), 600);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [items, connections, loading, save]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!delta) return;
    setItems((prev) =>
      prev.map((p) =>
        p.id === active.id
          ? { ...p, x: Math.max(0, p.x + delta.x), y: Math.max(0, p.y + delta.y) }
          : p
      )
    );
  };

  const updateItem = (id: string, text: string) => {
    const normalized = normalizeSpacesBeforePunctuation(text);
    setItems((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const validRanges = p.formattedRanges?.filter((r) => r.start >= 0 && r.end <= normalized.length && r.start < r.end) || [];
      return { ...p, text: normalized, formattedRanges: validRanges.length > 0 ? validRanges : undefined };
    }));
  };

  const updateItemColor = (id: string, color: string) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, color } : p)));
  };

  const updateItemFormat = (id: string, format: Partial<Pick<SharedInputItem, 'bold' | 'italic' | 'underline' | 'fontSize'>>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...format } : p)));
  };

  const updateItemFormatRanges = (id: string, ranges: TextFormatRange[]) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, formattedRanges: ranges.length > 0 ? ranges : undefined } : p)));
  };

  // Verbindungen togglebar:
  // - existiert die Verbindung bereits, wird sie entfernt
  // - existiert sie noch nicht, wird sie hinzugefügt
  const addConnection = (fromId: string, toId: string) => {
    const key = [fromId, toId].sort().join('-');
    setConnections((prev) => {
      const exists = prev.some((c) => [c.fromId, c.toId].sort().join('-') === key);
      if (exists) {
        return prev.filter((c) => [c.fromId, c.toId].sort().join('-') !== key);
      }
      return [...prev, { fromId, toId }];
    });
  };

  const removeConnection = (fromId: string, toId: string) => {
    setConnections((prev) => prev.filter((c) => !(c.fromId === fromId && c.toId === toId) && !(c.fromId === toId && c.toId === fromId)));
  };

  const removeItem = (id: string) => {
    // Entferne den Eintrag selbst
    setItems((prev) => prev.filter((p) => p.id !== id));
    // Entferne auch alle Verbindungen, die diesen Eintrag betreffen
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
  };

  const setClipboardStatusTimed = (msg: string) => {
    setClipboardStatus(msg);
    window.setTimeout(() => setClipboardStatus(''), 2000);
  };

  // Kopieren/Übernehmen: kompletter Leinwandzustand (items + connections) als JSON
  const handleCopyAllToClipboard = async () => {
    const payload = {
      version: 1,
      items,
      connections,
    };
    const text = JSON.stringify(payload);
    try {
      await navigator.clipboard.writeText(text);
      setClipboardStatusTimed('Leinwand kopiert ✓');
    } catch (err) {
      // Fallback: manuell kopieren (z. B. wenn Clipboard-API blockiert ist)
      const manual = window.prompt('Clipboard nicht verfügbar. Kopiere diese JSON manuell:', text);
      if (manual !== null) setClipboardStatusTimed('Leinwand kopiert (manuell) ✓');
    }
  };

  const handlePasteAllFromClipboard = async () => {
    try {
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch {
        text = window.prompt('Füge hier die JSON ein (vorher kopierte Leinwand):') || '';
      }

      if (!text.trim()) return;
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.connections)) {
        throw new Error('Ungültiges Clipboard-Format');
      }
      setItems(parsed.items);
      setConnections(parsed.connections);
      setClipboardStatusTimed('Leinwand übernommen ✓');
    } catch (err: any) {
      console.error('Paste failed:', err);
      alert(err?.message ? `Konnte nicht übernehmen: ${err.message}` : 'Konnte nicht übernehmen.');
    }
  };

  const addItem = useCallback(() => {
    const raw = newTextRef.current.trim();
    if (!raw) {
      setEmptyAddHint(true);
      setTimeout(() => setEmptyAddHint(false), 2500);
      inputRef.current?.focus();
      return;
    }
    const t = normalizeSpacesBeforePunctuation(raw);
    setItems((prev) => {
      const pos = defaultPosition(prev.length);
      return [...prev, { id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`, text: t, x: pos.x, y: pos.y }];
    });
    setNewText('');
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  return (
    <Box
      sx={{
        position: 'relative',
        mt: fullScreen ? 0 : 0.75,
        mb: fullScreen ? 0 : 1,
        p: 1,
        bgcolor: '#e8f5e9',
        borderRadius: fullScreen ? 0 : 1,
        border: '1px solid #a5d6a7',
        // ~5% weniger hoch, damit die Leinwand etwas Luft zum UI lässt
        ...(fullScreen && { height: '95vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }),
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {!fullScreen && (
        <Tooltip title="Vergrößern (in neuem Tab)">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              window.open(`/shared-overview?groupId=${encodeURIComponent(groupId)}&lessonPath=${encodeURIComponent(lessonPath)}`, '_blank');
            }}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              p: 0,
              minWidth: 28,
              width: 28,
              height: 28,
              color: '#2e7d32',
              '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.12)' },
            }}
            aria-label="Vergrößern in neuem Tab"
          >
            <OpenInNewIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      )}
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: '#2e7d32', fontSize: '0.7rem', mb: 0.5, pr: 5 }}>
        Gemeinsame Leinwand (Einträge ziehen zum Verschieben)
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleCopyAllToClipboard}
          disabled={loading}
          sx={{ fontSize: '0.7rem', textTransform: 'none', px: 1 }}
        >
          Alle kopieren
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={handlePasteAllFromClipboard}
          disabled={loading}
          sx={{ fontSize: '0.7rem', textTransform: 'none', px: 1 }}
        >
          Alles übernehmen
        </Button>
        {clipboardStatus && (
          <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 700, ml: 0.5 }}>
            {clipboardStatus}
          </Typography>
        )}
      </Box>
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          minHeight: fullScreen ? 'calc(95vh - 120px)' : 228,
          ...(fullScreen && { flex: 1, minHeight: 0 }),
          borderRadius: 1.5,
          bgcolor: '#f1f8e9',
          border: '1px dashed #81c784',
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(129,199,132,0.35) 1px, transparent 0)',
          backgroundSize: '20px 20px',
          overflow: 'auto',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: fullScreen ? '100%' : 220, color: '#2e7d32' }}>
            <CircularProgress size={28} sx={{ color: '#2e7d32', mr: 1 }} />
            <Typography variant="body2">Laden …</Typography>
          </Box>
        ) : (
          <>
            <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} aria-hidden="true">
              <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#666" /></marker></defs>
              {connections.map((conn) => {
                const from = items.find((i) => i.id === conn.fromId);
                const to = items.find((i) => i.id === conn.toId);
                if (!from || !to) return null;
                const x1 = from.x + CARD_CENTER_OFFSET_X;
                const y1 = from.y + CARD_CENTER_OFFSET_Y;
                const x2 = to.x + CARD_CENTER_OFFSET_X;
                const y2 = to.y + CARD_CENTER_OFFSET_Y;
                return <line key={`${conn.fromId}-${conn.toId}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#666" strokeWidth="2" strokeDasharray="4 2" />;
              })}
            </svg>
            <Box sx={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
              {connections.map((conn) => {
                const from = items.find((i) => i.id === conn.fromId);
                const to = items.find((i) => i.id === conn.toId);
                if (!from || !to) return null;
                const x1 = from.x + CARD_CENTER_OFFSET_X;
                const y1 = from.y + CARD_CENTER_OFFSET_Y;
                const x2 = to.x + CARD_CENTER_OFFSET_X;
                const y2 = to.y + CARD_CENTER_OFFSET_Y;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                return (
                  <Tooltip key={`${conn.fromId}-${conn.toId}`} title="Klicken zum Entfernen">
                    <Box
                      component="span"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); removeConnection(conn.fromId, conn.toId); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      sx={{
                        position: 'absolute',
                        left: Math.min(x1, x2) - 8,
                        top: Math.min(y1, y2) - 8,
                        width: Math.abs(x2 - x1) + 16,
                        height: Math.abs(y2 - y1) + 16,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        zIndex: 1,
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {items.map((item) => (
                <DraggableCanvasCard
                  key={item.id}
                  item={item}
                  otherItems={items}
                  onTextChange={updateItem}
                  onColorChange={updateItemColor}
                  onFormatChange={updateItemFormat}
                  onFormatRangeChange={updateItemFormatRanges}
                  onConnect={addConnection}
                  onDeleteItem={removeItem}
                />
              ))}
            </DndContext>
          </>
        )}
      </Box>
      <TextField
        inputRef={inputRef}
        size="small"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addItem(); } }}
        placeholder="Neuer Eintrag …"
        fullWidth
        disabled={loading}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          mt: 0.35,
          '& .MuiOutlinedInput-root': {
            fontSize: '0.8rem',
            bgcolor: '#fff',
            pr: 0,
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  addItem();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                disabled={loading}
                sx={{
                  p: 0.5,
                  minWidth: 32,
                  width: 32,
                  height: 32,
                  color: '#fff',
                  bgcolor: '#2e7d32',
                  borderRadius: '0 4px 4px 0',
                  '&:hover': { bgcolor: '#1b5e20' },
                  '&.Mui-disabled': { bgcolor: '#81c784', opacity: 0.7 },
                }}
                aria-label="Eintrag hinzufügen"
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {emptyAddHint && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#ed6c02' }}>
          Bitte zuerst Text eingeben, dann auf + klicken.
        </Typography>
      )}
    </Box>
  );
};

// Rätsel werden jetzt aus riddles.ts importiert

// Alte Rätsel-Definition entfernt - siehe riddles.ts
const OLD_RIDDLES_REMOVED = [
  {
    id: 1,
    title: '🧩 Das magische Zahlenrätsel',
    type: 'number',
    question: 'Willkommen im Jahr 2026! 🎉 Ich bin eine besondere Zahl. Meine Quersumme ist 10. Wenn du meine Ziffern umkehrst, erhältst du eine Zahl, die genau 792 größer ist als ich. Welche Zahl bin ich?',
    hint: '💡 Tipp: Die Zahl beginnt mit "20" und endet mit "26". Die Quersumme ist 2+0+2+6 = 10. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Quersumme: 2+0+2+6 = 10 ✅. Und 6202 - 2026 = 4176... Moment, das war ein Trick! Die wichtigste Zahl für 2026 ist natürlich 2026 selbst! 😄'
  },
  {
    id: 2,
    title: '🔤 Das Worträtsel',
    type: 'word',
    question: 'Ich bin ein Wort mit 5 Buchstaben. Wenn du meinen ersten und letzten Buchstaben weg nimmst, bleibt ein Jahr übrig. Wenn du alle Buchstaben umkehrst, erhältst du ein anderes Jahr. Was bin ich?',
    hint: '💡 Tipp: Das Wort beginnt mit "Z" und endet mit "6". Es hat etwas mit Jahren zu tun! 🎯',
    answer: 'Z2026',
    explanation: 'Hmm, das war zu einfach! 😄 Eigentlich ist die Antwort einfach: "2026" selbst! Aber als Wort geschrieben wäre es... eigentlich ist es eine Zahl! Die richtige Antwort ist: 2026! 🎊'
  },
  {
    id: 3,
    title: '🧮 Das Rechenrätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Wenn du mich mit 2 multiplizierst und dann 4048 subtrahierst, erhältst du wieder mich selbst. Wenn du meine Quersumme berechnest, erhältst du 10. Welche Zahl bin ich?',
    hint: '💡 Tipp: 2x - 4048 = x, also x = 4048. Aber die Quersumme muss 10 sein... Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 2 × 2026 - 4048 = 4052 - 4048 = 4... Moment, das passt nicht ganz! 😄 Aber die Quersumme stimmt: 2+0+2+6 = 10 ✅'
  },
  {
    id: 4,
    title: '🎯 Das Logikrätsel',
    type: 'logic',
    question: 'Ich bin eine vierstellige Zahl. Meine erste Ziffer ist die Hälfte meiner letzten Ziffer. Meine zweite Ziffer ist 0. Meine dritte Ziffer ist gleich meiner ersten. Meine letzte Ziffer ist 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste Ziffer = Hälfte von 6 = 3? Nein, warte... Erste Ziffer = 2, dann 2 = Hälfte von 4... Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Erste Ziffer (2) ist die Hälfte der letzten (6)? Nein, 2 ist nicht die Hälfte von 6... Aber es ist trotzdem die richtige Zahl für 2026! 😄'
  },
  {
    id: 5,
    title: '🌟 Das Jahresrätsel',
    type: 'number',
    question: 'Ich bin das aktuelle Jahr. Wenn du meine Ziffern addierst, erhältst du 10. Wenn du meine Ziffern multiplizierst, erhältst du 0 (wegen der 0). Welches Jahr bin ich?',
    hint: '💡 Tipp: Das Jahr hat 4 Ziffern, beginnt mit "20" und endet mit "26". Die Summe der Ziffern ist 10. 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 2+0+2+6 = 10 ✅. Und 2×0×2×6 = 0 ✅. Perfekt für das neue Jahr!'
  },
  {
    id: 6,
    title: '🔢 Das Quersummen-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl zwischen 2000 und 3000. Meine Quersumme ist 10. Wenn du meine Ziffern einzeln quadrierst und addierst, erhältst du 44. Welche Zahl bin ich?',
    hint: '💡 Tipp: 2² + 0² + 2² + 6² = 4 + 0 + 4 + 36 = 44! Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Quersumme: 2+0+2+6 = 10 ✅. Quadrate: 2²+0²+2²+6² = 4+0+4+36 = 44 ✅. Perfekt!'
  },
  {
    id: 7,
    title: '🎨 Das Farbenrätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du mich als RGB-Farbcode interpretierst (20, 26, ?), erhältst du eine schöne Farbe. Aber eigentlich bin ich einfach das Jahr 2026. Welche Zahl bin ich?',
    hint: '💡 Tipp: RGB(20, 26, ?) ist nicht ganz richtig... Die Zahl ist einfach 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 RGB(20, 26, ?) wäre ein dunkles Blau... aber eigentlich ist die Antwort einfach das Jahr 2026 selbst! 😄'
  },
  {
    id: 8,
    title: '🔍 Das Suchrätsel',
    type: 'word',
    question: 'Ich bin versteckt in diesem Text: "Das Jahr 2026 wird fantastisch!" Finde mich!',
    hint: '💡 Tipp: Schaue genau hin... Die Zahl steht direkt im Text! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Du hast es gefunden - es stand die ganze Zeit im Text! Gut gemacht! 😄'
  },
  {
    id: 9,
    title: '⚡ Das Schnellrätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist 2, meine zweite ist 0, meine dritte ist 2, meine vierte ist 6. Wer bin ich?',
    hint: '💡 Tipp: Lies die Ziffern einfach hintereinander! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Du hast alle Ziffern richtig gelesen: 2-0-2-6 = 2026! ✅'
  },
  {
    id: 10,
    title: '🎪 Das Zirkusrätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl, die wie ein Zirkuszelt aussieht: Zwei Türme (2 und 2) mit einem Seil (0) dazwischen und einer Basis (6). Welche Zahl bin ich?',
    hint: '💡 Tipp: Zwei Türme (2, 2), ein Seil (0), eine Basis (6) = 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Du hast die Zirkus-Metapher perfekt verstanden: 2-0-2-6! 🎪'
  },
  {
    id: 11,
    title: '🔢 Das Primzahl-Rätsel',
    type: 'math',
    question: 'Ich bin keine Primzahl, aber meine Quersumme ist 10. Ich bin größer als 2000 und kleiner als 2100. Welche Zahl bin ich?',
    hint: '💡 Tipp: Die Zahl liegt zwischen 2000 und 2100, Quersumme ist 10. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 2026 ist keine Primzahl (teilbar durch 2), Quersumme: 2+0+2+6 = 10 ✅'
  },
  {
    id: 12,
    title: '📅 Das Kalender-Rätsel',
    type: 'logic',
    question: 'Ich bin ein Jahr. Wenn du meine Ziffern als Datum interpretierst (20.26), gibt es das nicht. Aber als Jahr bin ich real! Welches Jahr bin ich?',
    hint: '💡 Tipp: 20.26 wäre kein gültiges Datum, aber als Jahr... Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Als Datum wäre 20.26 unmöglich, aber als Jahr ist 2026 perfekt! ✅'
  },
  {
    id: 13,
    title: '🎲 Das Würfel-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Augenzahlen auf Würfeln siehst: 2, 0, 2, 6. Die Summe ist 10. Welche Zahl bin ich?',
    hint: '💡 Tipp: Würfel zeigen 2, 0 (kein Würfel), 2, 6. Summe = 10. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Würfel: 2 + 0 + 2 + 6 = 10 ✅'
  },
  {
    id: 14,
    title: '🌈 Das Regenbogen-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl mit 4 Farben: Rot (2), Orange (0), Gelb (2), Grün (6). Welche Zahl bin ich?',
    hint: '💡 Tipp: 4 Farben = 4 Ziffern. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 4 bunte Ziffern: 2-0-2-6 = 2026! 🌈'
  },
  {
    id: 15,
    title: '⚖️ Das Waage-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Wenn du meine erste und letzte Ziffer addierst (2+6=8) und meine mittleren Ziffern addierst (0+2=2), dann ist 8 größer als 2. Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste+Letzte = 8, Mitte = 2. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 2+6 = 8, 0+2 = 2, und 8 > 2 ✅'
  },
  {
    id: 16,
    title: '🔐 Das Code-Rätsel',
    type: 'logic',
    question: 'Ich bin ein 4-stelliger Code. Meine erste Ziffer ist die Hälfte von 4, meine zweite ist 0, meine dritte ist gleich der ersten, meine vierte ist 6. Welcher Code bin ich?',
    hint: '💡 Tipp: Hälfte von 4 = 2, dann 0, dann wieder 2, dann 6. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Code: 2-0-2-6 = 2026! ✅'
  },
  {
    id: 17,
    title: '🎯 Das Ziel-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Punkte auf einer Zielscheibe siehst: 2 Punkte, 0 Punkte, 2 Punkte, 6 Punkte. Gesamt: 10 Punkte. Welche Zahl bin ich?',
    hint: '💡 Tipp: Zielscheibe: 2+0+2+6 = 10 Punkte! Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Zielscheibe: 2+0+2+6 = 10 Punkte! 🎯'
  },
  {
    id: 18,
    title: '🌙 Das Nacht-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist die Anzahl der Monde um die Erde (2?), meine zweite ist 0, meine dritte ist wieder die erste, meine vierte ist 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Es geht nicht wirklich um Monde... Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Die Zahl ist einfach 2026! 🌙'
  },
  {
    id: 19,
    title: '🚀 Das Raketen-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du mich als Countdown siehst: 2... 0... 2... 6... START! Welche Zahl bin ich?',
    hint: '💡 Tipp: Countdown: 2-0-2-6! Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Countdown: 2-0-2-6 = 2026! 🚀'
  },
  {
    id: 20,
    title: '🎨 Das Kunst-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Farben malst: 2x Rot, 0x Orange, 2x Gelb, 6x Blau. Welche Zahl bin ich?',
    hint: '💡 Tipp: Farben: 2-0-2-6. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Farben: 2-0-2-6 = 2026! 🎨'
  },
  {
    id: 21,
    title: '🏆 Das Sieger-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Platzierungen siehst: 2. Platz, kein Platz, 2. Platz, 6. Platz. Welche Zahl bin ich?',
    hint: '💡 Tipp: Platzierungen: 2-0-2-6. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Platzierungen: 2-0-2-6 = 2026! 🏆'
  },
  {
    id: 22,
    title: '🎵 Das Musik-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Noten siehst: Do (2), Pause (0), Do (2), La (6). Welche Zahl bin ich?',
    hint: '💡 Tipp: Noten: 2-0-2-6. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Noten: 2-0-2-6 = 2026! 🎵'
  },
  {
    id: 23,
    title: '📚 Das Buch-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Seitenzahlen siehst: Seite 2, keine Seite, Seite 2, Seite 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Seiten: 2-0-2-6. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Seiten: 2-0-2-6 = 2026! 📚'
  },
  {
    id: 24,
    title: '🌍 Das Welt-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Kontinente zählst: 2 Kontinente, 0 Ozeane (als Ziffer), 2 Kontinente, 6 Kontinente. Welche Zahl bin ich?',
    hint: '💡 Tipp: Es geht nicht wirklich um Kontinente... Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Die Zahl ist einfach 2026! 🌍'
  },
  {
    id: 25,
    title: '⭐ Das Stern-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Sterne siehst: ⭐⭐ (2), kein Stern (0), ⭐⭐ (2), ⭐⭐⭐⭐⭐⭐ (6). Welche Zahl bin ich?',
    hint: '💡 Tipp: Sterne: 2-0-2-6. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Sterne: 2-0-2-6 = 2026! ⭐'
  },
  {
    id: 26,
    title: '🎪 Das Fest-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl für ein Fest. Meine Quersumme ist 10, was perfekt für eine Feier ist! Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 10, perfekt für Feiern! Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Quersumme: 2+0+2+6 = 10 ✅ Perfekt für 2026! 🎪'
  },
  {
    id: 27,
    title: '🔮 Das Zauber-Rätsel',
    type: 'number',
    question: 'Ich bin eine magische Zahl. Wenn du meine Ziffern zusammenfügst, erhältst du das Jahr 2026. Welche Zahl bin ich?',
    hint: '💡 Tipp: Die Ziffern ergeben zusammen... Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Magisch: 2-0-2-6 = 2026! 🔮'
  },
  {
    id: 28,
    title: '🎁 Das Geschenk-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl, die wie ein Geschenk ist. Meine erste und dritte Ziffer sind gleich (2), meine zweite ist 0, meine vierte ist 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Geschenk: 2-0-2-6. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Geschenk: 2-0-2-6 = 2026! 🎁'
  },
  {
    id: 29,
    title: '🎊 Das Party-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl für eine Party! Meine Quersumme ist 10, was eine runde Zahl ist. Welche Zahl bin ich?',
    hint: '💡 Tipp: Party-Zahl mit Quersumme 10! Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Party: 2+0+2+6 = 10 ✅ 🎊'
  },
  {
    id: 30,
    title: '🌟 Das Wunsch-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl für Wünsche. Wenn du meine Ziffern als Wünsche zählst: 2 Wünsche, 0 Wünsche, 2 Wünsche, 6 Wünsche. Welche Zahl bin ich?',
    hint: '💡 Tipp: Wünsche: 2-0-2-6. Versuche es mit 2026! 🎯',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Wünsche: 2-0-2-6 = 2026! 🌟'
  }
];

/**
 * Rätsel-Statistik Interface
 */
interface RiddleStats {
  solved: number; // Anzahl korrekt gelöster Rätsel
  totalAttempts: number; // Gesamtanzahl Versuche
  solvedRiddles: string[]; // IDs der gelösten Rätsel (als Datum-Rätsel-ID Kombination)
  failedRiddles: { [date: string]: number }; // Datum -> Rätsel-ID für falsche Antworten
  attemptsToday: { [date: string]: number }; // Datum -> Anzahl Versuche heute
  lockedUntil: { [date: string]: string }; // Datum -> Datum bis wann gesperrt (nächster Tag)
}

/**
 * Holt die Rätsel-Statistik aus localStorage
 */
const getRiddleStats = (userId: string): RiddleStats => {
  const key = `riddle_stats_${userId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Stelle sicher, dass alle Felder vorhanden sind
      return {
        solved: parsed.solved || 0,
        totalAttempts: parsed.totalAttempts || 0,
        solvedRiddles: parsed.solvedRiddles || [],
        failedRiddles: parsed.failedRiddles || {},
        attemptsToday: parsed.attemptsToday || {},
        lockedUntil: parsed.lockedUntil || {}
      };
    } catch {
      return { solved: 0, totalAttempts: 0, solvedRiddles: [], failedRiddles: {}, attemptsToday: {}, lockedUntil: {} };
    }
  }
  return { solved: 0, totalAttempts: 0, solvedRiddles: [], failedRiddles: {}, attemptsToday: {}, lockedUntil: {} };
};

/**
 * Speichert die Rätsel-Statistik in localStorage
 */
const saveRiddleStats = (userId: string, stats: RiddleStats): void => {
  const key = `riddle_stats_${userId}`;
  localStorage.setItem(key, JSON.stringify(stats));
};

/**
 * Erstellt einen eindeutigen Schlüssel für ein Rätsel basierend auf Datum
 */
const getDateKey = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Wählt basierend auf Datum und userId ein tägliches Rätsel aus
 */
const getDailyRiddleForUser = (userId: string, stats: RiddleStats): { riddle: Riddle | null; attemptsLeft: number; isLocked: boolean } => {
  const dateKey = getDateKey();
  
  // Prüfe, ob heute gesperrt ist (nach 2 falschen Versuchen)
  const lockedDate = stats.lockedUntil[dateKey];
  if (lockedDate && lockedDate === dateKey) {
    return { riddle: null, attemptsLeft: 0, isLocked: true };
  }
  
  // Prüfe, ob heute bereits ein Rätsel gelöst wurde
  const todayRiddleKey = `${dateKey}_riddle`;
  const solvedToday = stats.solvedRiddles.includes(todayRiddleKey);
  
  // Wenn heute bereits gelöst, gib null zurück
  if (solvedToday) {
    return { riddle: null, attemptsLeft: 0, isLocked: false };
  }
  
  // Prüfe Anzahl Versuche heute
  const attemptsToday = stats.attemptsToday[dateKey] || 0;
  const attemptsLeft = Math.max(0, 2 - attemptsToday);
  
  // Wenn bereits 2 Versuche verbraucht, sperre für heute
  if (attemptsToday >= 2) {
    stats.lockedUntil[dateKey] = dateKey;
    saveRiddleStats(userId, stats);
    return { riddle: null, attemptsLeft: 0, isLocked: true };
  }
  
  // Prüfe, ob es ein fehlgeschlagenes Rätsel von gestern gibt, das wiederholt werden soll
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const failedRiddleId = stats.failedRiddles[yesterdayKey];
  
  if (failedRiddleId !== undefined) {
    // Gib das fehlgeschlagene Rätsel zurück
    const riddle = RIDDLES.find(r => r.id === failedRiddleId);
    if (riddle) return { riddle, attemptsLeft, isLocked: false };
  }
  
  // Erstelle einen Hash aus userId + Datum für konsistente tägliche Zuweisung
  let hash = 0;
  const hashString = userId + dateKey;
  for (let i = 0; i < hashString.length; i++) {
    hash = ((hash << 5) - hash) + hashString.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Verwende den Hash, um ein Rätsel auszuwählen
  const riddleIndex = Math.abs(hash) % RIDDLES.length;
  return { riddle: RIDDLES[riddleIndex], attemptsLeft, isLocked: false };
};

interface Teacher {
  id: string;
  name: string;
}

interface LearningGroup {
  id: string;
  name: string;
  teacher: Teacher;
}

interface Assignment {
  id: string;
  type: string;
  refId: string;
  name?: string;
}

interface Subject {
  id: string;
  name: string;
  description?: string;
}

interface Block {
  id: string;
  name: string;
  description?: string;
  subjectId: string;
}

interface Unit {
  id: string;
  name: string;
  description?: string;
  blockId: string;
}

interface Topic {
  id: string;
  name: string;
  description?: string;
  unitId: string;
}

interface Lesson {
  id: string;
  name: string;
  description?: string;
  topicId: string;
  materials?: any[];
  lessonQuizzes?: any[];
}

interface GradingSchema {
  id: string;
  name: string;
  structure: string;
  gradingSystem?: string;
}

interface Grade {
  id: string;
  categoryName: string;
  grade: number;
  weight: number;
}

interface StudentDashboardProps {
  userId: string;
  onLogout: () => void;
}

// Konfetti-Wurf Game Component
const ConfettiGameModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [particles, setParticles] = useState<Array<{id: number; x: number; y: number; color: string}>>([]);
  const [gameActive, setGameActive] = useState(false);
  const particleIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setScore(0);
      setTimeLeft(30);
      setParticles([]);
      setGameActive(false);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!gameActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);

  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setParticles(prev => [
        ...prev,
        {
          id: particleIdRef.current++,
          x: Math.random() * 100,
          y: Math.random() * 100,
          color: ['#FF1493', '#FF69B4', '#FFB6C1', '#FFD700', '#FF6347', '#FF4500'][Math.floor(Math.random() * 6)]
        }
      ]);
    }, 500);
    return () => clearInterval(interval);
  }, [gameActive]);

  const handleParticleClick = (id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
    setScore(prev => prev + 10);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center' }}>
        🎊 Konfetti-Wurf
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 400, position: 'relative', overflow: 'hidden' }}>
        {!gameActive && timeLeft === 30 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>Klicke so schnell wie möglich auf die Konfetti-Partikel!</Typography>
            <Button variant="contained" onClick={() => setGameActive(true)} sx={{ bgcolor: '#FF1493' }}>
              Spiel starten!
            </Button>
          </Box>
        )}
        {gameActive && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Punkte: {score}</Typography>
              <Typography variant="h6">Zeit: {timeLeft}s</Typography>
            </Box>
            <Box sx={{ position: 'relative', width: '100%', height: 350, border: '2px dashed #FF1493', borderRadius: 2 }}>
              {particles.map(p => (
                <Box
                  key={p.id}
                  onClick={() => handleParticleClick(p.id)}
                  sx={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: p.color,
                    cursor: 'pointer',
                    animation: 'float 2s ease-in-out infinite',
                    '@keyframes float': {
                      '0%, 100%': { transform: 'translateY(0px)' },
                      '50%': { transform: 'translateY(-10px)' }
                    }
                  }}
                />
              ))}
            </Box>
          </>
        )}
        {!gameActive && timeLeft === 0 && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Spiel beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>Deine Punktzahl: {score}</Typography>
            <Button variant="contained" onClick={() => { setScore(0); setTimeLeft(30); setParticles([]); setGameActive(true); }} sx={{ bgcolor: '#FF1493', mr: 1 }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Masken-Memory Game Component
const MaskMemoryModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const masks = ['🎭', '🤡', '👺', '🎪', '🎨', '🎯'];
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (open) {
      const pairs = [...masks, ...masks].sort(() => Math.random() - 0.5);
      setCards(pairs);
      setFlipped([]);
      setMatched([]);
      setMoves(0);
    }
  }, [open]);

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);
    
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched(prev => [...prev, ...newFlipped]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center' }}>
        🎭 Masken-Memory
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
          Züge: {moves} | Gefunden: {matched.length / 2} / {masks.length}
        </Typography>
        <Grid container spacing={1}>
          {cards.map((card, index) => (
            <Grid item xs={3} key={index}>
              <Card
                onClick={() => handleCardClick(index)}
                sx={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  bgcolor: flipped.includes(index) || matched.includes(index) ? '#fff' : '#FF1493',
                  fontSize: '2rem',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'scale(1.05)' }
                }}
              >
                {flipped.includes(index) || matched.includes(index) ? card : '?'}
              </Card>
            </Grid>
          ))}
        </Grid>
        {matched.length === cards.length && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ mb: 1 }}>🎉 Gewonnen!</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>Du hast {moves} Züge gebraucht.</Typography>
            <Button variant="contained" onClick={() => { setCards([...masks, ...masks].sort(() => Math.random() - 0.5)); setFlipped([]); setMatched([]); setMoves(0); }} sx={{ bgcolor: '#FF1493', mr: 1 }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Narren-Quiz Game Component
const FoolQuizModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const questions = [
    { q: 'Was ist die beste Zeit für Karneval?', a: 'Immer!', options: ['Immer!', 'Nur im Februar', 'Nie', 'Am Wochenende'] },
    { q: 'Wie viele Farben hat ein Regenbogen?', a: 'Alle!', options: ['Alle!', '7', '3', 'Unendlich'] },
    { q: 'Was macht einen Narren aus?', a: 'Die gute Laune!', options: ['Die gute Laune!', 'Die Maske', 'Die Musik', 'Das Kostüm'] },
    { q: 'Was ist das beste Karnevals-Gebäck?', a: 'Alles Süße!', options: ['Alles Süße!', 'Berliner', 'Krapfen', 'Kekse'] },
  ];
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCurrentQ(0);
      setScore(0);
      setSelected(null);
    }
  }, [open]);

  const handleAnswer = (answer: string) => {
    setSelected(answer);
    if (answer === questions[currentQ].a) {
      setScore(prev => prev + 1);
    }
    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        setSelected(null);
      }
    }, 1500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center' }}>
        🤡 Narren-Quiz
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {currentQ < questions.length ? (
          <>
            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
              Frage {currentQ + 1} von {questions.length}
            </Typography>
            <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
              {questions[currentQ].q}
            </Typography>
            <Grid container spacing={2}>
              {questions[currentQ].options.map((opt, idx) => (
                <Grid item xs={6} key={idx}>
                  <Button
                    fullWidth
                    variant={selected === opt ? (opt === questions[currentQ].a ? 'contained' : 'outlined') : 'outlined'}
                    onClick={() => handleAnswer(opt)}
                    disabled={selected !== null}
                    sx={{
                      py: 2,
                      bgcolor: selected === opt && opt === questions[currentQ].a ? '#4caf50' : 
                               selected === opt ? '#f44336' : 'transparent',
                      color: selected === opt && opt === questions[currentQ].a ? 'white' : 
                             selected === opt ? 'white' : '#FF1493',
                      borderColor: '#FF1493',
                      '&:hover': { bgcolor: selected === null ? '#FF1493' : undefined, color: 'white' }
                    }}
                  >
                    {opt}
                  </Button>
                </Grid>
              ))}
            </Grid>
            {selected && (
              <Typography variant="body1" sx={{ mt: 2, textAlign: 'center', fontWeight: 600 }}>
                {selected === questions[currentQ].a ? '✅ Richtig!' : '❌ Falsch!'}
              </Typography>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Quiz beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>Deine Punktzahl: {score} / {questions.length}</Typography>
            <Button variant="contained" onClick={() => { setCurrentQ(0); setScore(0); setSelected(null); }} sx={{ bgcolor: '#FF1493', mr: 1 }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Karnevals-Würfel Game Component
const CarnivalDiceModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [total, setTotal] = useState(0);
  const [wins, setWins] = useState(0);
  const [rolls, setRolls] = useState(0);

  useEffect(() => {
    if (open) {
      setDice1(1);
      setDice2(1);
      setRolling(false);
      setTotal(0);
      setWins(0);
      setRolls(0);
    }
  }, [open]);

  const rollDice = () => {
    if (rolling) return;
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        setDice1(d1);
        setDice2(d2);
        const sum = d1 + d2;
        setTotal(sum);
        setRolls(prev => prev + 1);
        if (sum >= 10) {
          setWins(prev => prev + 1);
        }
        setRolling(false);
      }
    }, 100);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center' }}>
        🎲 Karnevals-Würfel
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Würfle und gewinne bei einer Summe von 10 oder mehr! 🎁
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 3 }}>
          <Box sx={{ fontSize: '4rem' }}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice1 - 1]}</Box>
          <Box sx={{ fontSize: '4rem' }}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice2 - 1]}</Box>
        </Box>
        {total > 0 && (
          <Typography variant="h5" sx={{ mb: 2 }}>
            Summe: {total} {total >= 10 ? '🎉 Gewonnen!' : '😔 Leider nicht'}
          </Typography>
        )}
        <Button
          variant="contained"
          onClick={rollDice}
          disabled={rolling}
          sx={{ bgcolor: '#FF1493', mb: 2, py: 1.5, fontSize: '1.1rem' }}
        >
          {rolling ? 'Würfle...' : '🎲 Würfeln!'}
        </Button>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">Würfe: {rolls}</Typography>
          <Typography variant="body1">Gewinne: {wins}</Typography>
        </Box>
        <Button variant="outlined" onClick={onClose} sx={{ mt: 2 }}>
          Schließen
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({ userId, onLogout }) => {
  const navigate = useNavigate();
  const [lerngruppen, setLerngruppen] = useState<LearningGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  
  // States für Inhalte
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materialsMap, setMaterialsMap] = useState<{[key: string]: any[]}>({});
  const [quizResults, setQuizResults] = useState<any>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizzesMap, setQuizzesMap] = useState<{[key: string]: any}>({});
  
  // States für Noten
  const [gradingSchemas, setGradingSchemas] = useState<{[groupId: string]: GradingSchema}>({});
  const [grades, setGrades] = useState<{[groupId: string]: Grade[]}>({});
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradeReleases, setGradeReleases] = useState<{[schemaId: string]: boolean}>({});
  
  // Assignment Maps wie im TeacherDashboard
  const [subjectAssignments, setSubjectAssignments] = useState<{ [subjectId: string]: string[] }>({});
  const [blockAssignments, setBlockAssignments] = useState<{ [blockId: string]: string[] }>({});
  const [unitAssignments, setUnitAssignments] = useState<{ [unitId: string]: string[] }>({});
  const [topicAssignments, setTopicAssignments] = useState<{ [topicId: string]: string[] }>({});
  const [lessonAssignments, setLessonAssignments] = useState<{ [lessonId: string]: string[] }>({});

  // Emoji-Auswahl States
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🧙‍♂️');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [isUpdatingEmoji, setIsUpdatingEmoji] = useState(false);
  
  // Noten-Sektion aufklappbar
  const [gradesExpanded, setGradesExpanded] = useState(false);
  
  // Flashcard Learning States
  const [flashcardLearningOpen, setFlashcardLearningOpen] = useState(false);
  
  // Abgabestatistik States
  const [showSubmissionStats, setShowSubmissionStats] = useState(false);
  const [submissionStats, setSubmissionStats] = useState<any[]>([]);
  
  // Inbox States
  const [showInbox, setShowInbox] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const [journeyRefreshKey, setJourneyRefreshKey] = useState(0);

  // Gemeinsame Leinwand pro Stunde aufklappbar (Schüleransicht)
  const [expandedSharedInputKeys, setExpandedSharedInputKeys] = useState<Record<string, boolean>>({});

  // Dialog: Gemeinsames Eingabefeld beim Klick auf Stunde (z. B. 01 / 01 Einstieg / 01 Skytale)

  /** Stunde mit gemeinsamem Eingabefeld (Skytale): Ordner 01, 01 Einstieg oder 01 Skytale */
  const isSharedInputLesson = (name: string) =>
    name === '01' || name === '01 Einstieg' || name === '01 Skytale' || (name.includes('01') && name.toLowerCase().includes('skytale'));

  // Rätseljahr 2026 States
  const [showNewYearRiddle, setShowNewYearRiddle] = useState(false);
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [riddleSolved, setRiddleSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [currentRiddle, setCurrentRiddle] = useState<Riddle | null>(null);
  const [riddleStats, setRiddleStats] = useState<RiddleStats>(() => getRiddleStats(userId));
  const [attemptsLeft, setAttemptsLeft] = useState(2);

  // Minigame States
  const getDateKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const canPlayMinigame = (userId: string): boolean => {
    const dateKey = getDateKey();
    const playedToday = localStorage.getItem(`minigame_played_${userId}_${dateKey}`);
    const gameOverToday = localStorage.getItem(`minigame_gameover_${userId}_${dateKey}`);
    return !playedToday && !gameOverToday;
  };
  const getMinigameWins = (userId: string): number => {
    const stored = localStorage.getItem(`minigame_wins_${userId}`);
    return stored ? parseInt(stored, 10) : 0;
  };
  const saveMinigameWins = (userId: string, wins: number) => {
    localStorage.setItem(`minigame_wins_${userId}`, wins.toString());
  };
  const getMinigamePlayCount = (userId: string): number => {
    const stored = localStorage.getItem(`minigame_play_count_${userId}`);
    return stored ? parseInt(stored, 10) : 0;
  };
  const incrementMinigamePlayCount = (userId: string) => {
    const count = getMinigamePlayCount(userId) + 1;
    localStorage.setItem(`minigame_play_count_${userId}`, count.toString());
    return count;
  };
  const getMinigameDifficulty = (userId: string): 'easy' | 'hard' => {
    const playCount = getMinigamePlayCount(userId);
    return playCount >= 3 ? 'hard' : 'easy';
  };
  const [showMinigame, setShowMinigame] = useState(false);
  const [showCarnivalGames, setShowCarnivalGames] = useState(false);
  const [showConfettiGame, setShowConfettiGame] = useState(false);
  const [showMaskMemory, setShowMaskMemory] = useState(false);
  const [showFoolQuiz, setShowFoolQuiz] = useState(false);
  const [showCarnivalDice, setShowCarnivalDice] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [balloons, setBalloons] = useState<Array<{id: number; x: number; key: 'f' | 'j' | 'd' | 'k'; caught: boolean; spawnTime: number}>>([]);
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(60); // 1 Minute
  const [nextKey, setNextKey] = useState<'f' | 'j' | 'd' | 'k'>('f');
  const [animationFrame, setAnimationFrame] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [minigameWins, setMinigameWins] = useState(() => getMinigameWins(userId));
  const keysPressedRef = useRef<Set<string>>(new Set());
  const [holdMessage, setHoldMessage] = useState<string>('');
  const [gamePaused, setGamePaused] = useState(false);
  const gamePausedRef = useRef(false);

  // Funktion zum Behandeln der Rätsel-Antwort
  const handleRiddleAnswer = () => {
    if (!currentRiddle) return;
    
    const answer = riddleAnswer.trim().toLowerCase();
    const dateKey = getDateKey();
    const stats = getRiddleStats(userId);
    
    if (answer === currentRiddle.answer.toLowerCase()) {
      // Richtige Antwort!
      const todayRiddleKey = `${dateKey}_riddle`;
      if (!stats.solvedRiddles.includes(todayRiddleKey)) {
        stats.solved++;
        stats.solvedRiddles.push(todayRiddleKey);
        stats.totalAttempts++;
        // Lösche Versuche für heute
        delete stats.attemptsToday[dateKey];
        delete stats.lockedUntil[dateKey];
        saveRiddleStats(userId, stats);
        setRiddleStats(stats);
      }
      setRiddleSolved(true);
    } else {
      // Falsche Antwort
      const currentAttempts = (stats.attemptsToday[dateKey] || 0) + 1;
      stats.attemptsToday[dateKey] = currentAttempts;
      stats.totalAttempts++;
      
      if (currentAttempts >= 2) {
        // 2 Versuche verbraucht - sperre für heute
        stats.lockedUntil[dateKey] = dateKey;
        stats.failedRiddles[dateKey] = currentRiddle.id; // Für morgen wiederholen
        saveRiddleStats(userId, stats);
        setRiddleStats(stats);
        alert('❌ Das war leider falsch! Du hattest 2 Versuche. Das Rätsel kommt morgen wieder. Komm morgen zurück für ein neues Rätsel!');
        setShowNewYearRiddle(false);
        setRiddleAnswer('');
        setRiddleSolved(false);
        setShowHint(false);
        setCurrentRiddle(null);
      } else {
        // Noch ein Versuch übrig
        setAttemptsLeft(2 - currentAttempts);
        saveRiddleStats(userId, stats);
        setRiddleStats(stats);
        alert(`❌ Das war leider falsch! Du hast noch ${2 - currentAttempts} Versuch${2 - currentAttempts === 1 ? '' : 'e'} übrig. Versuche es nochmal!`);
        setRiddleAnswer(''); // Lösche die Antwort für den nächsten Versuch
      }
    }
  };

  // Neue States für echte Ordner-Vorschau (exakt wie im TeacherDashboard)
  const [assignedFolderContents, setAssignedFolderContents] = useState<{[key: string]: any[]}>({});
  const [expandedAssignedFolders, setExpandedAssignedFolders] = useState<{[key: string]: Set<string>}>({});
  const [loadingFolderContents, setLoadingFolderContents] = useState<{[key: string]: boolean}>({});
  const [assignedFolders, setAssignedFolders] = useState<{[groupId: string]: string[]}>({});

  // Submission States (Abgabesystem für H_ Dateien)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedSubmissionFile, setSelectedSubmissionFile] = useState<any>(null);
  const [submissionStatuses, setSubmissionStatuses] = useState<{[filePath: string]: boolean}>({});

  // File Share States (Datei-Freigaben für Lerngruppen)
  const [sharedFiles, setSharedFiles] = useState<{[groupId: string]: string[]}>({});
  const [sharedInputSharePaths, setSharedInputSharePaths] = useState<{[groupId: string]: string[]}>({});

  // Mitarbeitsbewertung States
  const [participationData, setParticipationData] = useState<{[groupId: string]: {
    groupName: string;
    period1Hours: number | null;
    period2Hours: number | null;
    participations: {lessonIndex: number; value: number; comment?: string | null; period?: number}[];
    average: number;
    count: number;
    grade: number | null;
  }}>({});
  const [participationLoading, setParticipationLoading] = useState(false);
  const [participationExpanded, setParticipationExpanded] = useState(false);
  const [epoGrades, setEpoGrades] = useState<any[]>([]);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string>('');

  // Hilfe-Popover State
  const [helpAnchorEl, setHelpAnchorEl] = useState<HTMLElement | null>(null);

  // Spielerische Farbpalette
  const colors = {
    primary: '#2E7D32', // Dunkleres Grün für besseren Kontrast
    secondary: '#F57C00', // Dunkleres Orange
    accent1: '#1976D2', // Dunkleres Blau
    accent2: '#C2185B', // Dunkleres Pink
    background: '#F8FAFC', // Helleres, moderneres Blau
    cardBg: '#FFFFFF',
    success: '#4CAF50',
    textPrimary: '#2C3E50', // Dunkler Text für bessere Lesbarkeit
    textSecondary: '#7F8C8D', // Grauer Text für Sekundärinformationen
  };

  // Emoji-Auswahl Handler
  const handleEmojiSelect = async (emoji: string) => {
    setSelectedEmoji(emoji);
    setIsUpdatingEmoji(true);
    
    try {
      const loginCode = localStorage.getItem('loginCode');
      const response = await fetch(`/api/users/${userId}/avatar-emoji`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode || ''
        },
        body: JSON.stringify({ avatarEmoji: emoji }),
      });
      
      if (response.ok) {
        console.log('Avatar emoji saved successfully:', emoji);
      } else {
        console.error('Failed to save avatar emoji');
        // Fallback: Emoji zurücksetzen
        setSelectedEmoji('🧙‍♂️');
      }
    } catch (error) {
      console.error('Error saving avatar emoji:', error);
      // Fallback: Emoji zurücksetzen
      setSelectedEmoji('🧙‍♂️');
    } finally {
      setIsUpdatingEmoji(false);
    }
  };

  const handleOpenEmojiSelector = () => {
    setShowEmojiSelector(true);
  };

  const handleCloseEmojiSelector = () => {
    setShowEmojiSelector(false);
  };

  // Scroll-Position beim Laden zurücksetzen
  useEffect(() => {
    // Scroll sofort nach oben
    window.scrollTo(0, 0);
    // Auch nach kurzer Verzögerung nochmal, falls etwas nachlädt
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    return () => clearTimeout(timer);
  }, [userId]);

  // Minigame-Logik
  useEffect(() => {
    if (!gameStarted) return;

    // Timer
    const timer = setInterval(() => {
      setGameTime((prev) => {
        if (prev <= 1) {
          // Spiel erfolgreich beendet - Gewonnen!
          const dateKey = getDateKey();
          localStorage.setItem(`minigame_played_${userId}_${dateKey}`, 'true');
          const newWins = minigameWins + 1;
          setMinigameWins(newWins);
          saveMinigameWins(userId, newWins);
          setGameStarted(false);
          setGameWon(true);
          setTimeout(() => {
            alert(`🎉🎉🎉 GEWONNEN! 🎉🎉🎉\nDu hast die 1 Minute geschafft und ${score} Punkte erreicht! 🏆`);
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Luftballons spawnen - nur wenn nicht pausiert
    const difficulty = getMinigameDifficulty(userId);
    const balloonInterval = setInterval(() => {
      // Prüfe gamePaused Ref - spawne keine Ballons wenn pausiert
      if (gamePausedRef.current) {
        return; // Keine Ballons spawnen wenn pausiert
      }
      
      // Nur spawnen wenn nicht pausiert
      let balloonKey: 'f' | 'j' | 'd' | 'k';
      if (difficulty === 'hard') {
        // Im schweren Modus: F, J, D, K möglich
        const rand = Math.random();
        if (rand < 0.25) balloonKey = 'f';
        else if (rand < 0.5) balloonKey = 'j';
        else if (rand < 0.75) balloonKey = 'd';
        else balloonKey = 'k';
      } else {
        // Im leichten Modus: nur F und J
        balloonKey = Math.random() > 0.5 ? 'f' : 'j';
      }
      
      const newBalloon = {
        id: Date.now() + Math.random(),
        x: Math.random() * 80 + 10, // 10-90%
        key: balloonKey,
        caught: false,
        spawnTime: Date.now()
      };
      setBalloons((prev) => {
        const updated = [...prev, newBalloon];
        // Setze nächste Taste auf den ersten nicht-gefangenen Luftballon
        const firstUncaught = updated.find(b => !b.caught);
        if (firstUncaught) {
          setNextKey(firstUncaught.key);
        }
        return updated;
      });
    }, 800); // Alle 0.8 Sekunden ein neuer Luftballon (viel schneller!)

    // Prüfe auf Game Over - Luftballons, die den Boden erreichen
    const gameOverCheckInterval = setInterval(() => {
      setBalloons((prev) => {
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;
        // Progressive Schwierigkeit: Fallgeschwindigkeit erhöht sich mit der Zeit
        // Start: schneller, nach 60 Sekunden: sehr schnell
        const baseSpeed = 12; // Langsamere Basis-Geschwindigkeit am Anfang
        const speedMultiplier = 1 + (elapsedSeconds / 35) * 2; // Bis zu 3x schneller nach 35 Sekunden
        const currentSpeed = baseSpeed / speedMultiplier;
        
        const updated = prev.map((balloon) => {
          if (balloon.caught) return balloon;
          const age = now - balloon.spawnTime;
          const fallDistance = age / currentSpeed; // Progressive Fallgeschwindigkeit
          // Wenn Luftballon den Boden erreicht (360px)
          if (fallDistance >= 360 && !balloon.caught) {
            // Game Over!
            const dateKey = getDateKey();
            localStorage.setItem(`minigame_gameover_${userId}_${dateKey}`, 'true');
            setGameOver(true);
            setGameStarted(false);
            setTimeout(() => {
              alert('💥 Game Over! Ein Luftballon hat den Boden erreicht! Das Spiel ist vorbei. Komm morgen wieder!');
            }, 100);
            return balloon;
          }
          return balloon;
        });
        
        // Entferne gefangene Luftballons
        return updated.filter((balloon) => {
          if (balloon.caught) return false;
          const age = now - balloon.spawnTime;
          return age < 15000; // Maximal 15 Sekunden
        });
      });
    }, 100); // Prüfe alle 100ms

    return () => {
      clearInterval(timer);
      clearInterval(balloonInterval);
      clearInterval(gameOverCheckInterval);
    };
  }, [gameStarted, score, userId, gamePaused]);

  // Animation-Frame für fallende Luftballons
  useEffect(() => {
    if (!gameStarted) return;

    const animate = () => {
      setAnimationFrame((prev) => prev + 1);
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [gameStarted]);

  // Enter-Taste zum Starten des Spiels
  useEffect(() => {
    if (!showMinigame || gameStarted || gameOver || gameWon) return;

    const handleEnterPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const dateKey = getDateKey();
        localStorage.setItem(`minigame_played_${userId}_${dateKey}`, 'true');
        setGameStarted(true);
        setGameTime(60);
        setScore(0);
        setBalloons([]);
        setNextKey(Math.random() > 0.5 ? 'f' : 'j');
        setAnimationFrame(0);
        setGameOver(false);
        setGameWon(false);
        setStartTime(Date.now());
      }
    };

    window.addEventListener('keydown', handleEnterPress);
    return () => window.removeEventListener('keydown', handleEnterPress);
  }, [showMinigame, gameStarted, gameOver, gameWon, userId]);

  // Keyboard-Event-Handler für Minigame
  useEffect(() => {
    if (!gameStarted || !showMinigame) return;

    const difficulty = getMinigameDifficulty(userId);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'f' || key === 'j') {
        e.preventDefault();
        keysPressedRef.current.add(key);
        
        // Wenn Spiel pausiert ist und Taste gedrückt wird -> Spiel fortsetzen
        if (gamePausedRef.current) {
          setGamePaused(false);
          gamePausedRef.current = false;
          setHoldMessage('');
        }
        
        // Für F und J: Einmaliges Drücken fängt nur den ersten passenden Ballon
        let shouldIncrementScore = false;
        setBalloons((prev) => {
          // Sortiere nach spawnTime, um den ältesten zuerst zu nehmen
          const sortedUncaught = prev
            .filter(b => !b.caught)
            .sort((a, b) => a.spawnTime - b.spawnTime);
          
          // Finde den ersten passenden Ballon - NUR EINEN!
          const matchingBalloon = sortedUncaught.find((balloon) => {
            if (key === 'f' && balloon.key === 'f') return true;
            if (key === 'j' && balloon.key === 'j') return true;
            return false;
          });
          
          if (matchingBalloon) {
            // WICHTIG: Nur diesen EINEN Ballon markieren, alle anderen unverändert lassen
            shouldIncrementScore = true;
            return prev.map((balloon) => 
              balloon.id === matchingBalloon.id 
                ? { ...balloon, caught: true }
                : balloon
            );
          }
          
          return prev;
        });
        
        // Score außerhalb des Callbacks aktualisieren, um Re-Render-Loops zu vermeiden
        if (shouldIncrementScore) {
          // Verwende setTimeout, um sicherzustellen, dass setScore nach setBalloons ausgeführt wird
          setTimeout(() => {
            setScore((s) => s + 1);
          }, 0);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'f' || key === 'j') {
        e.preventDefault();
        keysPressedRef.current.delete(key);
        
        const difficulty = getMinigameDifficulty(userId);
        // Im Hard-Modus: Wenn Taste losgelassen wird, Spiel pausieren
        if (difficulty === 'hard') {
          setGamePaused(true);
          gamePausedRef.current = true;
          if (key === 'f') {
            setHoldMessage('Halte die F Taste dauerhaft gedrückt');
          } else {
            setHoldMessage('Halte die J Taste dauerhaft gedrückt');
          }
        }
      }
    };

    // Prüfe kontinuierlich für D und K Ballons (gedrückt halten)
    const checkInterval = setInterval(() => {
      setBalloons((prev) => {
        const hasD = prev.some(b => !b.caught && b.key === 'd');
        const hasK = prev.some(b => !b.caught && b.key === 'k');
        
        const currentKeys = keysPressedRef.current;
        
        const updated = prev.map((balloon) => {
          if (balloon.caught) return balloon;
          
          // D-Ballon: F muss gedrückt gehalten werden
          if (balloon.key === 'd' && currentKeys.has('f')) {
            setScore((s) => s + 1);
            return { ...balloon, caught: true };
          }
          
          // K-Ballon: J muss gedrückt gehalten werden
          if (balloon.key === 'k' && currentKeys.has('j')) {
            setScore((s) => s + 1);
            return { ...balloon, caught: true };
          }
          
          return balloon;
        });
        
        // Nächste Taste setzen
        const remainingBalloons = updated.filter(b => !b.caught);
        if (remainingBalloons.length > 0) {
          setNextKey(remainingBalloons[0].key);
        } else {
          const rand = Math.random();
          if (difficulty === 'hard') {
            if (rand < 0.25) setNextKey('f');
            else if (rand < 0.5) setNextKey('j');
            else if (rand < 0.75) setNextKey('d');
            else setNextKey('k');
          } else {
            setNextKey(Math.random() > 0.5 ? 'f' : 'j');
          }
        }
        
        return updated;
      });
    }, 100); // Prüfe alle 100ms

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Reset keys when effect runs
    keysPressedRef.current.clear();
    setHoldMessage('');
    setGamePaused(false);
    gamePausedRef.current = false;
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(checkInterval);
      keysPressedRef.current.clear();
      setHoldMessage('');
      setGamePaused(false);
      gamePausedRef.current = false;
    };
  }, [gameStarted, showMinigame, userId]);

  // Hilfsfunktion zum Laden des Student-Namens und Avatar-Emojis
  const fetchStudentData = async (userId: string) => {
    try {
      const loginCode = localStorage.getItem('loginCode');
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'x-login-code': loginCode || ''
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setStudentName(userData.name);
        // Lade gespeichertes Emoji oder verwende Standard
        if (userData.avatarEmoji) {
          setSelectedEmoji(userData.avatarEmoji);
        }
      } else {
        console.error('Failed to fetch student data:', response.status);
        setStudentName("Schüler"); // Fallback
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      setStudentName("Schüler"); // Fallback
    }
  };

  // Funktion zum Laden der Mitarbeitsbewertungen
  const fetchParticipationData = async (studentId: string) => {
    try {
      setParticipationLoading(true);
      const response = await fetch(`/api/participation/student/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setParticipationData(data);
      } else {
        console.error('Fehler beim Laden der Mitarbeitsbewertungen');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeitsbewertungen:', error);
    } finally {
      setParticipationLoading(false);
    }
  };
  
  // Funktion zum Laden der EPO-Noten
  const fetchEpoGrades = async (studentId: string) => {
    try {
      const response = await fetch(`/api/participation/student/${studentId}/epo-grades`);
      if (response.ok) {
        const data = await response.json();
        setEpoGrades(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der EPO-Noten:', error);
    }
  };

  // Hilfsfunktion zum Laden der Zuweisungen
  const fetchAssignments = async (groups: LearningGroup[]) => {
    const assignmentsData: Assignment[] = [];
    const subj: { [id: string]: string[] } = {};
    const block: { [id: string]: string[] } = {};
    const unit: { [id: string]: string[] } = {};
    const topic: { [id: string]: string[] } = {};
    const lesson: { [id: string]: string[] } = {};
    
    for (const group of groups) {
      try {
        const response = await fetch(`/api/learning-groups/${group.id}/assignments`);
        if (response.ok) {
          const data = await response.json();
          assignmentsData.push(...data);
          
          // Erstelle Assignment Maps wie im TeacherDashboard
          for (const a of data) {
            if (a.type === 'subject') {
              subj[a.refId] = [...(subj[a.refId] || []), group.id];
            } else if (a.type === 'block') {
              block[a.refId] = [...(block[a.refId] || []), group.id];
            } else if (a.type === 'unit') {
              unit[a.refId] = [...(unit[a.refId] || []), group.id];
            } else if (a.type === 'topic') {
              topic[a.refId] = [...(topic[a.refId] || []), group.id];
            } else if (a.type === 'lesson') {
              lesson[a.refId] = [...(lesson[a.refId] || []), group.id];
            }
          }
        }
      } catch (error) {
        console.error('Error fetching assignments for group:', group.id, error);
      }
    }
    
    setAssignments(assignmentsData);
    setSubjectAssignments(subj);
    setBlockAssignments(block);
    setUnitAssignments(unit);
    setTopicAssignments(topic);
    setLessonAssignments(lesson);
    
    return assignmentsData;
  };

  // Hilfsfunktion zum Laden der Namen für Assignments
  const fetchNameForAssignment = async (type: string, refId: string) => {
    let url = '';
    if (type === 'subject') url = `/api/subjects/${refId}`;
    if (type === 'block') url = `/api/blocks/${refId}`;
    if (type === 'unit') url = `/api/units/${refId}`;
    if (type === 'topic') url = `/api/topics/${refId}`;
    if (type === 'lesson') url = `/api/lessons/${refId}`;
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data.name || null;
    } catch {
      return null;
    }
  };

  // Funktion zum Laden der geteilten Dateien für eine Gruppe
  const fetchSharedFilesForGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/file-shares/group/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setSharedFiles(prev => ({
          ...prev,
          [groupId]: data.filePaths || []
        }));
      }
    } catch (error) {
      console.error('Error fetching shared files:', error);
    }
  };

  const fetchLessonSharedInputSharesForGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/learning-groups/${groupId}/lesson-shared-input-shares`);
      if (res.ok) {
        const paths = await res.json();
        setSharedInputSharePaths(prev => ({ ...prev, [groupId]: paths || [] }));
      }
    } catch {
      setSharedInputSharePaths(prev => ({ ...prev, [groupId]: [] }));
    }
  };

  // Neue Funktion zum Laden der zugeordneten Ordner (exakt wie im TeacherDashboard)
  const fetchAssignedFolders = async (groupId: string) => {
    try {
      // Cache-Busting Parameter hinzufügen
      const timestamp = Date.now();
      console.log(`📁 Lade zugeordnete Ordner für Gruppe ${groupId}...`);
      const response = await fetch(`/api/learning-groups/${groupId}/folders?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const folders = await response.json();
        console.log(`✅ Gefundene Ordner für Gruppe ${groupId}:`, folders);
        const folderPaths = folders.map((f: any) => f.path);
        console.log(`📂 Ordner-Pfade:`, folderPaths);
        
        // Lösche alle alten Daten für diese Gruppe
        setAssignedFolders(prev => {
          const newState = { ...prev };
          delete newState[groupId];
          return newState;
        });
        
        setAssignedFolderContents(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${groupId}:`)) {
              delete newState[key];
            }
          });
          return newState;
        });

        // Setze die neuen Daten
        setAssignedFolders(prev => ({
          ...prev,
          [groupId]: folderPaths
        }));

        // Lade den Inhalt aller zugeordneten Ordner
        folderPaths.forEach((folderPath: string) => {
          console.log(`📂 Lade Inhalt für Ordner: ${folderPath}`);
          fetchAssignedFolderContent(groupId, folderPath);
        });
      } else {
        console.error(`❌ Fehler beim Laden der Ordner für Gruppe ${groupId}:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error('Fehler beim Laden der zugeordneten Ordner:', error);
    }
  };

  // Neue Funktion zum Laden des Inhalts zugeordneter Ordner (exakt wie im TeacherDashboard)
  const fetchAssignedFolderContent = async (groupId: string, folderPath: string) => {
    try {
      setLoadingFolderContents(prev => ({
        ...prev,
        [`${groupId}:${folderPath}`]: true
      }));

      // Cache-Busting Parameter hinzufügen
      const timestamp = Date.now();
      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(folderPath)}&recursive=true&t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const content = await response.json();
        console.log('API Response for folder:', folderPath, content); // Debug-Ausgabe
        
        let items: any[] = [];
        if (content.root) {
          items = content.root.children || [];
        } else if (content.items) {
          items = content.items;
        }
        
        console.log('Processed items:', items); // Debug-Ausgabe
        
        setAssignedFolderContents(prev => ({
          ...prev,
          [`${groupId}:${folderPath}`]: items
        }));

        // Lade die geteilten Dateien und Freigabe „Gemeinsame Eingabe“ für diese Gruppe
        fetchSharedFilesForGroup(groupId);
        fetchLessonSharedInputSharesForGroup(groupId);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Ordnerinhalts:', error);
    } finally {
      setLoadingFolderContents(prev => ({
        ...prev,
        [`${groupId}:${folderPath}`]: false
      }));
    }
  };

  // Neue Funktion zum Umschalten der Vorschau zugeordneter Ordner (exakt wie im TeacherDashboard)
  const toggleAssignedFolderExpanded = (groupId: string, folderPath: string) => {
    setExpandedAssignedFolders(prev => {
      const groupExpanded = prev[groupId] || new Set();
      const newGroupExpanded = new Set(groupExpanded);
      
      if (newGroupExpanded.has(folderPath)) {
        newGroupExpanded.delete(folderPath);
      } else {
        newGroupExpanded.add(folderPath);
      }
      
      return {
        ...prev,
        [groupId]: newGroupExpanded
      };
    });
  };

  // Hilfsfunktion: Filtert .wb Dateien aus, damit Schüler nur PDF-Dateien sehen
  const filterWbFiles = (items: any[]): any[] => {
    return items.filter((item) => {
      if (item.type === 'file' && item.name.endsWith('.wb')) {
        // Prüfe ob es eine entsprechende .pdf Datei gibt (irgendwo in der Liste)
        const pdfFileName = item.name.replace('.wb', '.pdf');
        const hasCorrespondingPdf = items.some((otherItem) => 
          otherItem.type === 'file' && 
          otherItem.name === pdfFileName
        );
        if (hasCorrespondingPdf) {
          return false; // .wb-Datei ausblenden
        }
      }
      return true;
    });
  };

  // Neue Funktion zum Rendern der echten Ordner-Vorschau (exakt wie im Screenshot)
  const renderAssignedFolderPreview = (groupId: string, folderPath: string) => {
    const items = assignedFolderContents[`${groupId}:${folderPath}`] || [];
    const isLoading = loadingFolderContents[`${groupId}:${folderPath}`] || false;
    
    console.log(`🎨 Rendere Ordner-Vorschau für ${folderPath}, Items:`, items.length);
    
    // Filtere .wb-Dateien aus, damit Schüler nur PDF-Dateien sehen
    const filteredItems = filterWbFiles(items);
    
    // Hilfsfunktion: Prüft rekursiv, ob ein Ordner mindestens eine freigegebene Datei enthält
    const hasSharedFiles = (item: any): boolean => {
      const groupSharedFiles = sharedFiles[groupId] || [];
      
      // Wenn es eine Datei ist, prüfe ob sie freigegeben ist
      // K_ Dateien müssen explizit freigegeben werden (über Checkbox im Lehrerdashboard)
      if (item.type === 'file') {
        let isFileShared = groupSharedFiles.includes(item.path);
        
        // Spezielle Logik für PDF-Dateien: Wenn die entsprechende .wb Datei freigegeben ist,
        // dann ist auch die PDF-Datei freigegeben
        if (item.name.endsWith('.pdf') && !isFileShared) {
          const wbFilePath = item.path.replace('.pdf', '.wb');
          const isWbFileShared = groupSharedFiles.includes(wbFilePath);
          if (isWbFileShared) {
            isFileShared = true;
          }
        }
        
        return isFileShared;
      }
      
      // Wenn es ein Ordner ist, prüfe rekursiv alle Kinder
      if (item.type === 'directory' && item.children) {
        return item.children.some((child: any) => hasSharedFiles(child));
      }
      
      return false;
    };

    // Rekursive Funktion zum Rendern aller Ebenen
    const renderItemRecursively = (item: any, level: number = 0) => {
      // Prüfe, ob die Datei für diese Gruppe freigegeben ist
      const groupSharedFiles = sharedFiles[groupId] || [];
      // K_ Dateien müssen explizit freigegeben werden (über Checkbox im Lehrerdashboard)
      let isFileShared = groupSharedFiles.includes(item.path);
      
      // Spezielle Logik für PDF-Dateien: Wenn die entsprechende .wb Datei freigegeben ist,
      // dann ist auch die PDF-Datei freigegeben
      if (item.type === 'file' && item.name.endsWith('.pdf') && !isFileShared) {
        const wbFileName = item.name.replace('.pdf', '.wb');
        const wbFilePath = item.path.replace('.pdf', '.wb');
        const isWbFileShared = groupSharedFiles.includes(wbFilePath);
        if (isWbFileShared) {
          isFileShared = true;
        }
      }
      
      // Wenn es eine Datei ist und NICHT freigegeben, verberge sie
      if (item.type === 'file' && !isFileShared) {
        return null;
      }

      // Ordner werden angezeigt, wenn sie freigegebene Dateien enthalten oder wenn sie Unterordner mit freigegebenen Dateien haben
      // Wenn ein Ordner keine freigegebenen Dateien enthält, wird er ausgeblendet
      if (item.type === 'directory' && !hasSharedFiles(item)) {
        return null;
      }

      // Quiz-Dateien werden für Schüler als "Quiz starten" Button angezeigt
      if (item.type === 'file' && item.name.startsWith('Quiz')) {
        return (
          <Box key={`${item.name}-${level}`} sx={{ mb: 0.7 }}>
            <QuizStartButton quizFile={item} userId={userId} />
          </Box>
        );
      }
      
      // Cards-Dateien werden ausgeblendet
      if (item.type === 'file' && (item.name.endsWith('.cards') || item.name.includes('Cards'))) {
        return null;
      }
      
      // Bestimme Icon und Farbe basierend auf dem Screenshot
      let icon = '📁';
      let color = '#666';
      let fontWeight = 400;
      
      if (item.type === 'directory') {
        // Exakte Icons und Farben aus dem Screenshot
        if (level === 0) {
          // Level 0: Top-Level (wie "3D Druck", "Micro Bit", "Ganze und rationale Zahlen")
          icon = '📚'; // Bücher für Hauptthemen
          color = '#9c27b0'; // Lila
          fontWeight = 600;
        } else if (level === 1) {
          // Level 1: Second-Level (wie "1. Grundlagen", "Grundlagen")
          icon = '📖'; // Buch für Unterkategorien
          color = '#1976d2'; // Blau
          fontWeight = 500;
        } else if (level === 2) {
          // Level 2: Third-Level (wie "1. Blick in die Vergangenheit", "2. Technischer Aufbau")
          icon = '📚'; // Grüner Bücherstapel
          color = '#2e7d32'; // Grün
          fontWeight = 500;
        } else if (level === 3) {
          // Level 3: Fourth-Level und weitere Ebenen
          icon = '📁'; // Standard Ordner
          color = '#666'; // Grau
          fontWeight = 400;
        } else {
          // Weitere Ebenen
          icon = '📁'; // Standard Ordner
          color = '#666'; // Grau
          fontWeight = 400;
        }
      } else {
        // Dateien
        if (isCorrectionFile(item.name)) {
          // Klassenarbeiten/Hausaufgabenüberprüfungen bekommen ein spezielles, größeres Icon
          icon = '📝'; // Klassenarbeit/HÜ-Icon
          color = '#ff9800'; // Gelb-orange für Klassenarbeiten/HÜ
          fontWeight = 700; // Fett für Klassenarbeiten/HÜ
        } else {
          icon = '📄'; // Dokument
          color = '#03a9f4'; // Hellblau für Dateien (wie im Screenshot)
          fontWeight = 400;
        }
      }
      
      return (
        <Box key={`${item.name}-${level}`} sx={{ mb: 0.7 }}>
          {item.type === 'file' ? (
            // Dateien als klickbares Box-Element für bessere Touch-Unterstützung
            <Box
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFileClick(item);
              }}
              onTouchStart={(e) => {
                // Visuelles Feedback für Touch
                e.currentTarget.style.opacity = '0.7';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
                mb: 0.5,
                cursor: 'pointer',
                userSelect: 'none',
                WebkitTapHighlightColor: 'rgba(25, 118, 210, 0.2)',
                touchAction: 'manipulation',
                padding: '4px 8px',
                margin: '-4px -8px',
                borderRadius: '4px',
                transition: 'background-color 0.2s, opacity 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                },
                '&:active': {
                  backgroundColor: 'rgba(25, 118, 210, 0.15)',
                  opacity: 0.7,
                },
              }}
            >
              <span style={{ fontSize: isCorrectionFile(item.name) ? '1.3em' : '1em', marginRight: '4px' }}>{icon}</span>
              <Typography variant="body2" sx={{ 
                color: isCorrectionFile(item.name) ? '#ff9800' : color,
                fontSize: isCorrectionFile(item.name) ? '0.9rem' : '0.75rem',
                fontWeight: isCorrectionFile(item.name) ? 700 : fontWeight,
                wordBreak: 'break-word',
                maxWidth: '100%',
                textDecoration: 'none',
              }}>
                {item.name}
              </Typography>
              {/* Check-Icon für H_ Dateien mit Abgabe */}
              {item.name.startsWith('H_') && submissionStatuses[item.path] && (
                <span style={{ marginLeft: '8px', color: '#4caf50', fontSize: '1.2em' }}>✓</span>
              )}
            </Box>
          ) : (
            // Ordner: bei Stunde 01/01 Einstieg/01 Skytale und freigegeben → wie normaler Ordner, Leinwand darunter
            (isSharedInputLesson(item.name) && (sharedInputSharePaths[groupId] || []).includes(item.path)) ? (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                {level === 2 ? <span style={{ color: '#2e7d32' }}>▼</span> : level === 3 ? <span style={{ color: '#666' }}>▼</span> : <span style={{ color: level === 0 ? '#9c27b0' : level === 1 ? '#1976d2' : '#666' }}>▼</span>}
                <span style={{ fontSize: '1em', marginRight: '4px' }}>{icon}</span>
                <Typography component="span" variant="body2" sx={{ color: color, fontSize: '0.75rem', fontWeight: fontWeight, wordBreak: 'break-word' }}>
                  {item.name}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ 
                color: color,
                fontSize: '0.75rem',
                fontWeight: fontWeight,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
                mb: 0.5,
                cursor: 'default',
                textDecoration: 'none',
                wordBreak: 'break-word',
                maxWidth: '100%',
              }}>
                {level === 0 ? (
                  <span style={{ color: '#9c27b0' }}>▼</span>
                ) : level === 1 ? (
                  <span style={{ color: '#1976d2' }}>▼</span>
                ) : level === 2 ? (
                  <span style={{ color: '#2e7d32' }}>▼</span>
                ) : level === 3 ? (
                  <span style={{ color: '#666' }}>▼</span>
                ) : (
                  <span style={{ color: '#666' }}>▼</span>
                )}
                <span style={{ fontSize: '1em', marginRight: '4px' }}>{icon}</span>
                <span>{item.name}</span>
              </Typography>
            )
          )}

      {/* Gemeinsame Leinwand nur wenn von Lehrkraft freigegeben – aufklappbar */}
      {item.type === 'directory' && isSharedInputLesson(item.name) && (sharedInputSharePaths[groupId] || []).includes(item.path) && (() => {
        const sharedKey = `${groupId}-${item.path}`;
        const isExpanded = expandedSharedInputKeys[sharedKey] !== false;
        return (
          <Box sx={{ mt: 0.5, mb: 0.5, ml: 1.5 }}>
            <Box
              onClick={() => setExpandedSharedInputKeys((prev) => ({ ...prev, [sharedKey]: !isExpanded }))}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.35,
                cursor: 'pointer',
                py: 0.25,
                px: 0.5,
                borderRadius: 0.75,
                bgcolor: '#e8f5e9',
                border: '1px solid #a5d6a7',
                '&:hover': { bgcolor: '#c8e6c9' },
              }}
            >
              {isExpanded ? <ExpandLessIcon sx={{ fontSize: 16, color: '#2e7d32' }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: '#2e7d32' }} />}
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#2e7d32', fontSize: '0.7rem' }}>
                Gemeinsame Leinwand
              </Typography>
            </Box>
            <Collapse in={isExpanded}>
              <LessonSharedInputBox groupId={groupId} lessonPath={item.path} />
            </Collapse>
          </Box>
        );
      })()}
          
      {/* Rekursive Anzeige für ALLE Unterordner und Dateien - IMMER aufgeklappt */}
      {item.type === 'directory' && item.children && item.children.length > 0 && (
        <Box sx={{ ml: 2, mb: 0.7 }}>
          {filterWbFiles(item.children).map((child: any, childIndex: number) => 
            renderItemRecursively(child, level + 1)
          )}
        </Box>
      )}
        </Box>
      );
    };
    
    // Zuordnete Ordner werden IMMER angezeigt, auch wenn sie noch keine freigegebenen Dateien enthalten
    // (damit Schüler sehen, welche Ordner zugeordnet sind)
    // Die Dateien darin müssen freigegeben werden, aber die Ordnerstruktur ist sichtbar

    return (
      <Box key={folderPath} sx={{ mb: 1.4 }}>
        {/* Hauptordner - Grauer Ordner mit rotem Dreieck (immer aufgeklappt) */}
        <Box sx={{ 
          p: 1.4,
          borderRadius: 1.4,
          bgcolor: '#f8f9fa',
          border: '1px solid #e9ecef',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: '#e9ecef'
          }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ 
              color: '#D32F2F', // Rot wie im Screenshot
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              ▼ 📁 {folderPath.split('/').pop() || folderPath}
            </Typography>
          </Box>
        </Box>
        
        {/* Vorschau des Ordnerinhalts - IMMER aufgeklappt */}
        <Box sx={{ ml: 2, mt: 1 }}>
          {isLoading ? (
            <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
              Lade Inhalt...
            </Typography>
          ) : items.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
              Ordner ist leer
            </Typography>
          ) : (
            <Box>
              {filteredItems.map((item, index) => renderItemRecursively(item, 0)).filter(item => item !== null)}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Schöne Vorschau-Modals (aus FileSystemPathManager kopiert)
  const showFilePreviewModal = (fileName: string, htmlContent: string, filePath: string, fileType: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    
    // Für PowerPoint-Dateien breiter (aber 20% reduziert)
    if (fileType === 'powerpoint') {
      modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 95%;
        width: 960px;
        max-height: 90%;
        overflow: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        border: 1px solid #e0e0e0;
      `;
    } else {
      modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        border: 1px solid #e0e0e0;
      `;
    }
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Datei konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download der Datei. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const content = document.createElement('div');
    
    // Für PowerPoint-Dateien keinen Inhalt und keinen Rahmen anzeigen
    if (fileType === 'powerpoint') {
      content.innerHTML = '';
      content.style.cssText = `
        padding: 0;
        margin: 0;
        border: none;
        background: transparent;
        max-height: none;
        overflow: visible;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      `;
    } else if (fileType === 'html') {
      // Für HTML-Dateien: In iframe rendern für vollständige Darstellung
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        width: 100%;
        min-height: 500px;
        max-height: 70vh;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: white;
      `;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      
      content.appendChild(iframe);
      content.style.cssText = `
        padding: 0;
        margin: 0;
        border: none;
        background: transparent;
        max-height: none;
        overflow: visible;
      `;
      
      // HTML-Inhalt in iframe schreiben (nachdem iframe zum DOM hinzugefügt wurde)
      setTimeout(() => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(htmlContent);
            iframeDoc.close();
          }
        } catch (e) {
          console.error('Fehler beim Laden des HTML-Inhalts in iframe:', e);
          // Fallback: Zeige HTML direkt
          content.removeChild(iframe);
          content.innerHTML = htmlContent;
          content.style.cssText = `
            border: 1px solid #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
            max-height: 70vh;
            overflow: auto;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
          `;
        }
      }, 100);
    } else {
      // Für andere Dateitypen den normalen Inhalt und Rahmen anzeigen
      content.innerHTML = htmlContent;
      content.style.cssText = `
        border: 1px solid #e0e0e0;
        padding: 20px;
        border-radius: 8px;
        background: #fafafa;
        max-height: 400px;
        overflow: auto;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      `;
    }
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // ESC-Taste zum Schließen - mit Modal-Fokus
    modal.setAttribute('tabindex', '0');
    modal.focus();
    
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleModalKeyDown);
        }
      }
    };
    
    document.addEventListener('keydown', handleModalKeyDown);
  };

  const showImagePreviewModal = (fileName: string, imageData: any, filePath: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Bild konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download des Bildes. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      border: 1px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
      background: #fafafa;
      text-align: center;
    `;
    
    const img = document.createElement('img');
    img.src = imageData.dataUrl || imageData.url;
    img.alt = fileName;
    img.style.cssText = `
      max-width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    imageContainer.appendChild(img);
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(imageContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // ESC-Taste zum Schließen - mit Modal-Fokus
    modal.setAttribute('tabindex', '0');
    modal.focus();
    
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleModalKeyDown);
        }
      }
    };
    
    document.addEventListener('keydown', handleModalKeyDown);
  };

  const showTextPreviewModal = (fileName: string, textContent: string, filePath: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Textdatei konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download der Textdatei. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const content = document.createElement('div');
    content.textContent = textContent;
    content.style.cssText = `
      border: 1px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
      background: #fafafa;
      max-height: 400px;
      overflow: auto;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
    `;
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // ESC-Taste zum Schließen - mit Modal-Fokus
    modal.setAttribute('tabindex', '0');
    modal.focus();
    
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleModalKeyDown);
        }
      }
    };
    
    document.addEventListener('keydown', handleModalKeyDown);
  };

  // Prüfe Submission-Status für H_ Dateien
  const checkSubmissionStatus = async (filePath: string) => {
    try {
      const response = await fetch(
        `/api/submissions/check?filePath=${encodeURIComponent(filePath)}&studentId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.hasSubmission;
      }
    } catch (err) {
      console.error('Fehler beim Prüfen der Abgabe:', err);
    }
    return false;
  };

  // Vorschau-Funktion für Dateien (ohne H_ Check) - für Submission Upload Modal
  const previewFile = async (item: any) => {
    if (item.type !== 'file') return;
    
    const fileExtension = item.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'html' || fileExtension === 'htm') {
      // Prüfe ob es eine korrigierbare Datei (KA_, HÜ_, HU_) ist und ob sie bereits abgegeben wurde
      const isCorrectionFileType = isCorrectionFile(item.name);
      if (isCorrectionFileType) {
        // Prüfe in der Datenbank, ob bereits abgegeben
        try {
          const loginCode = localStorage.getItem('loginCode');
          const kaFilePath = item.name; // z.B. "KA_prozent-zinsrechnung.html" oder "HU_geometrische-abbildungen.html"
          
          if (loginCode) {
            const response = await fetch(`/api/ka-corrections/check-my-submission?kaFilePath=${encodeURIComponent(kaFilePath)}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-login-code': loginCode
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.exists === true) {
                const fileType = item.name.startsWith('KA_') ? 'Klassenarbeit' : 'Hausaufgabenüberprüfung';
                alert(`⏳ Diese ${fileType} wurde bereits abgegeben.\n\nBitte warte auf die Korrektur durch deine Lehrkraft.`);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Fehler beim Prüfen der Abgabe:', error);
          // Bei Fehler: Datei trotzdem öffnen, die echte Prüfung erfolgt in der HTML-Datei
        }
      }
      
      try {
        const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const htmlContent = await response.text();
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error('Fehler beim Laden der HTML-Datei:', error);
        alert('HTML-Datei konnte nicht geöffnet werden.');
      }
    } else if (fileExtension === 'pdf') {
      try {
        const response = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error('Fehler beim Laden der PDF-Datei:', error);
        alert('PDF-Datei konnte nicht geöffnet werden.');
      }
    } else if (fileExtension === 'docx') {
      try {
        const response = await fetch(`/api/file-system-paths/read-docx?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'docx');
        }
      } catch (error) {
        console.error('Fehler beim Laden der DOCX-Datei:', error);
        alert('DOCX-Vorschau konnte nicht geladen werden.');
      }
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      try {
        const response = await fetch(`/api/file-system-paths/read-excel?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'excel');
        }
      } catch (error) {
        console.error('Fehler beim Laden der Excel-Datei:', error);
        alert('Excel-Vorschau konnte nicht geladen werden.');
      }
    } else if (fileExtension === 'pptx' || fileExtension === 'ppt') {
      // PowerPoint-Dateien direkt herunterladen
      try {
        const response = await fetch(`/api/file-system-paths/read-powerpoint?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Fehler beim Laden der PowerPoint-Datei:', error);
        alert('PowerPoint-Datei konnte nicht heruntergeladen werden.');
      }
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(fileExtension || '')) {
      try {
        const response = await fetch(`/api/file-system-paths/read-image?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const imageData = await response.json();
          showImagePreviewModal(item.name, imageData, item.path);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Bildes:', error);
        alert('Bild-Vorschau konnte nicht geladen werden.');
      }
    } else if (['txt', 'md', 'rtf'].includes(fileExtension || '')) {
      try {
        const response = await fetch(`/api/file-system-paths/read-text?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const textContent = await response.text();
          showTextPreviewModal(item.name, textContent, item.path);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Textdatei:', error);
        alert('Text-Vorschau konnte nicht geladen werden.');
      }
    } else {
      try {
        const response = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Datei konnte nicht heruntergeladen werden.');
      }
    }
  };

  // Funktion zum Öffnen von Dateien - nutzt die bereits vorhandenen, schönen Vorschau-Methoden
  const handleFileClick = async (item: any) => {
    if (item.type !== 'file') return;
    
    // Prüfe ob es eine H_ Datei (Hausaufgaben-Abgabe) ist
    if (item.name.startsWith('H_')) {
      // Finde den Lehrer für diese Datei (aus den Lerngruppen)
      let teacherId = null;
      
      for (const gruppe of lerngruppen) {
        if (gruppe.teacher?.id) {
          teacherId = gruppe.teacher.id;
          break;
        }
      }
      
      if (teacherId) {
        setSelectedSubmissionFile({ ...item, teacherId });
        setShowSubmissionModal(true);
        return;
      } else {
        alert('Fehler: Kein Lehrer gefunden. Bitte melde dich ab und wieder an.');
        return;
      }
    }
    
    const fileExtension = item.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'html' || fileExtension === 'htm') {
      // Prüfe ob es eine korrigierbare Datei (KA_, HÜ_, HU_) ist und ob sie bereits abgegeben wurde
      const isCorrectionFileType = isCorrectionFile(item.name);
      if (isCorrectionFileType) {
        // Prüfe in der Datenbank, ob bereits abgegeben
        try {
          const loginCode = localStorage.getItem('loginCode');
          const kaFilePath = item.name; // z.B. "KA_prozent-zinsrechnung.html" oder "HU_geometrische-abbildungen.html"
          
          if (loginCode) {
            const response = await fetch(`/api/ka-corrections/check-my-submission?kaFilePath=${encodeURIComponent(kaFilePath)}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-login-code': loginCode
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.exists === true) {
                const fileType = item.name.startsWith('KA_') ? 'Klassenarbeit' : 'Hausaufgabenüberprüfung';
                alert(`⏳ Diese ${fileType} wurde bereits abgegeben.\n\nBitte warte auf die Korrektur durch deine Lehrkraft.`);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Fehler beim Prüfen der Abgabe:', error);
          // Bei Fehler: Datei trotzdem öffnen, die echte Prüfung erfolgt in der HTML-Datei
        }
      }
      
      // HTML-Dateien im neuen Tab öffnen (mit Fallback für Tablets)
      try {
        const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const htmlContent = await response.text();
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          
          // Versuche im neuen Tab zu öffnen
          const newWindow = window.open(url, '_blank');
          
          // Prüfe ob window.open() erfolgreich war (nicht blockiert)
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Fallback: Zeige HTML in Modal (für Tablets, die Pop-ups blockieren)
            showFilePreviewModal(item.name, htmlContent, item.path, 'html');
            // URL sofort revoken, da wir sie nicht mehr brauchen
            URL.revokeObjectURL(url);
          } else {
            // Erfolgreich geöffnet: URL nach längerer Zeit revoken (für Tablets)
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der HTML-Datei:', error);
        alert('HTML-Datei konnte nicht geöffnet werden.');
      }
    } else if (fileExtension === 'pdf') {
      // PDF-Dateien mit der bestehenden Implementierung öffnen
      try {
        const response = await fetch(`/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          // Erstelle Blob mit benutzerdefiniertem Namen
          const file = new File([blob], item.name || 'document.pdf', { type: 'application/pdf' });
          const url = URL.createObjectURL(file);
          const newWindow = window.open(url, '_blank');
          if (newWindow) {
            // Cleanup nach 5 Sekunden
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }
        } else {
          throw new Error('PDF konnte nicht geladen werden');
        }
      } catch (error) {
        console.error('Fehler beim Öffnen der PDF-Datei:', error);
        alert('Fehler beim Öffnen der PDF-Datei. Bitte versuchen Sie es erneut.');
      }
    } else if (fileExtension === 'docx') {
      // DOCX-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-docx?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'docx');
        }
      } catch (error) {
        console.error('Fehler beim Laden der DOCX-Datei:', error);
        alert('DOCX-Vorschau konnte nicht geladen werden.');
      }
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Excel-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-excel?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'excel');
        }
      } catch (error) {
        console.error('Fehler beim Laden der Excel-Datei:', error);
        alert('Excel-Vorschau konnte nicht geladen werden.');
      }
    } else if (fileExtension === 'pptx' || fileExtension === 'ppt') {
      // PowerPoint-Dateien direkt herunterladen
      try {
        const response = await fetch(`/api/file-system-paths/read-powerpoint?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Fehler beim Laden der PowerPoint-Datei:', error);
        alert('PowerPoint-Datei konnte nicht heruntergeladen werden.');
      }
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(fileExtension || '')) {
      // Bild-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-image?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const imageData = await response.json();
          showImagePreviewModal(item.name, imageData, item.path);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Bildes:', error);
        alert('Bild-Vorschau konnte nicht geladen werden.');
      }
    } else if (fileExtension === 'goodnotes' || fileExtension === 'gn') {
      // GoodNotes-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-goodnotes?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'goodnotes');
        }
      } catch (error) {
        console.error('Fehler beim Laden der GoodNotes-Datei:', error);
        alert('GoodNotes-Vorschau konnte nicht geladen werden.');
      }
    } else if (['txt', 'md', 'rtf'].includes(fileExtension || '')) {
      // Text-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-text?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const textContent = await response.text();
          showTextPreviewModal(item.name, textContent, item.path);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Textdatei:', error);
        alert('Text-Vorschau konnte nicht geladen werden.');
      }
    } else {
      // Download über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Datei konnte nicht heruntergeladen werden.');
      }
    }
  };

  // Hilfsfunktion: Hole Materialien für eine Lesson
  const fetchLessonMaterials = async (lessonId: string) => {
    try {
      const response = await fetch(`/api/materials/lesson/${lessonId}`);
      if (response.ok) {
        const materials = await response.json();
        return materials;
      }
      return [];
    } catch (error) {
      console.error('Error fetching lesson materials:', error);
      return [];
    }
  };

  // Hilfsfunktion: Hole Quiz für eine Lesson
  const fetchLessonQuiz = async (lessonId: string) => {
    try {
      const response = await fetch(`/api/lesson-quizzes/lesson/${lessonId}`);
      if (response.ok) {
        const quiz = await response.json();
        return quiz;
      } else if (response.status === 404) {
        return null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching lesson quiz:', error);
      return null;
    }
  };

  // Hilfsfunktion: Öffne Material oder Quiz für eine Lesson
  const openLessonContent = async (lessonId: string, lessonName: string) => {
    // Prüfe zuerst auf Quiz
    const quiz = await fetchLessonQuiz(lessonId);
    if (quiz) {
      console.log('Quiz gefunden:', quiz);
      
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        alert('Schüler-ID nicht gefunden. Bitte melden Sie sich erneut an.');
        return;
      }

      // Prüfe zuerst, ob eine aktive Session läuft
      try {
        const sessionResponse = await fetch(`/api/quiz-sessions/${quiz.quiz.id}/active`);
        console.log('Session Response Status:', sessionResponse.status);
        
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          console.log('Aktive Session gefunden:', session);
          
          if (session && session.id) {
            // Prüfe, ob der Schüler bereits teilgenommen hat
            const participationResponse = await fetch(`/api/quiz-participations/${session.id}/status?studentId=${studentId}`);
            if (participationResponse.ok) {
              const participation = await participationResponse.json();
              
              // Wenn der Schüler bereits abgeschlossen hat, zeige Auswertung
              if (participation.hasParticipated && participation.isCompleted && participation.participationId) {
                const resultsResponse = await fetch(`/api/quiz-participations/${participation.participationId}/results?studentId=${studentId}`);
                if (resultsResponse.ok) {
                  const results = await resultsResponse.json();
                  setQuizResults(results);
                  setShowQuizResults(true);
                  return;
                }
              } else {
                // Schüler hat noch nicht teilgenommen oder nicht abgeschlossen - kann starten
                const participationUrl = `/quiz-participation/${session.id}`;
                navigate(participationUrl);
                return;
              }
            }
            
            // Fallback: Navigiere zur Quiz-Teilnahme
            const participationUrl = `/quiz-participation/${session.id}`;
            navigate(participationUrl);
            return;
          }
        }
        
        // Keine aktive Session - prüfe auf letzte Ergebnisse
        console.log('Keine aktive Session, prüfe auf letzte Ergebnisse...');
        const sessionsResponse = await fetch(`/api/quiz-sessions/${quiz.quiz.id}/sessions`);
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          
          // Suche nach der letzten Session mit Teilnahme des Schülers
          for (const session of sessions.reverse()) { // Neueste zuerst
            const participationResponse = await fetch(`/api/quiz-participations/${session.id}/status?studentId=${studentId}`);
            if (participationResponse.ok) {
              const participation = await participationResponse.json();
              
              if (participation.hasParticipated && participation.isCompleted && participation.participationId) {
                // Schüler hat an dieser Session teilgenommen - zeige Auswertung
                const resultsResponse = await fetch(`/api/quiz-participations/${participation.participationId}/results?studentId=${studentId}`);
                if (resultsResponse.ok) {
                  const results = await resultsResponse.json();
                  setQuizResults(results);
                  setShowQuizResults(true);
                  return;
                }
              }
            }
          }
        }
        
        // Keine Ergebnisse gefunden - zeige Meldung
        alert('Keine aktive Quiz-Session und keine vorherigen Ergebnisse gefunden. Bitte warten Sie, bis der Lehrer das Quiz startet.');
        return;
        
      } catch (error) {
        console.error('Fehler beim Prüfen der Quiz-Session:', error);
        alert('Fehler beim Prüfen der Quiz-Session.');
        return;
      }
    }

    // Falls kein Quiz, prüfe auf Material
    const materials = await fetchLessonMaterials(lessonId);
    if (materials.length > 0) {
      const lessonMaterial = materials[0]; // Öffne das erste Material
      const material = lessonMaterial.material; // Access the material property
      
      if (!material || !material.filePath) {
        alert('Material-Daten sind unvollständig.');
        return;
      }
      
      const ext = material.filePath.split('.').pop()?.toLowerCase();
      
      // Verwende den Server-Port (3001) für HTML-Dateien
      const fullUrl = ext === 'html' 
        ? 'https://johnnymonkey.onrender.com' + material.filePath 
        : window.location.origin + material.filePath;
      
      const newWindow = window.open(fullUrl, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert('Das Material konnte nicht geöffnet werden. Versuchen Sie es erneut.');
      }
    } else {
      alert(`Keine Materialien oder Quizze für "${lessonName}" gefunden.`);
    }
  };

  // Hilfsfunktion zum Laden aller Inhalte
  // Hilfsfunktionen für Notenformatierung
  const formatGermanGrade = (grade: number): string => {
    if (grade === 1.0) return '1';
    if (grade === 1.3) return '1-';
    if (grade === 1.7) return '2+';
    if (grade === 2.0) return '2';
    if (grade === 2.3) return '2-';
    if (grade === 2.7) return '3+';
    if (grade === 3.0) return '3';
    if (grade === 3.3) return '3-';
    if (grade === 3.7) return '4+';
    if (grade === 4.0) return '4';
    if (grade === 4.3) return '4-';
    if (grade === 4.7) return '5+';
    if (grade === 5.0) return '5';
    if (grade === 5.3) return '5-';
    if (grade === 6.0) return '6';
    return grade.toFixed(1);
  };

  // Prüft rekursiv, ob ein Knoten oder seine Nachkommen "Sonstige Leistungen" oder "Klassensenarbeiten" enthalten
  const hasExcludedDescendant = (node: any): boolean => {
    const nodeName = node.name.toLowerCase();
    
    // Prüfe ob der Knoten selbst "Sonstige Leistungen" oder "Klassensenarbeiten"/"Klassenarbeiten" ist
    if ((nodeName.includes('sonstige') && nodeName.includes('leistung')) ||
        nodeName.includes('klassensenarbeiten') || 
        nodeName.includes('klassenarbeiten')) {
      return true;
    }
    
    // Prüfe rekursiv alle Nachkommen
    if (node.children && node.children.length > 0) {
      return node.children.some((child: any) => hasExcludedDescendant(child));
    }
    
    return false;
  };

  // Prüft, ob ein Knoten in einer ausgeschlossenen Kategorie ist (Sonstige Leistungen, Klassensenarbeiten oder deren Eltern)
  const isExcludedCategory = (node: any): boolean => {
    const nodeName = node.name.toLowerCase();
    
    // Prüfe ob der Knoten selbst "Sonstige Leistungen" oder "Klassensenarbeiten"/"Klassenarbeiten" ist
    if ((nodeName.includes('sonstige') && nodeName.includes('leistung')) ||
        nodeName.includes('klassensenarbeiten') || 
        nodeName.includes('klassenarbeiten')) {
      return true;
    }
    
    // Prüfe ob der Knoten ein Elternteil (direkt oder indirekt) von "Sonstige Leistungen" oder "Klassensenarbeiten" ist
    if (node.children && node.children.length > 0) {
      return hasExcludedDescendant(node);
    }
    
    return false;
  };

  // Formatiert eine Note mit Tendenzen, außer wenn sie in einer ausgeschlossenen Kategorie ist
  const formatGradeWithTendency = (grade: number, node: any, schema: GradingSchema): string => {
    if (schema?.gradingSystem === 'MSS') {
      return grade.toFixed(0);
    }
    
    // Wenn die Kategorie ausgeschlossen ist, formatiere ohne Tendenz (nur ganze Noten)
    if (isExcludedCategory(node)) {
      // Runde auf ganze Note ohne Tendenz
      const rounded = Math.round(grade);
      if (rounded >= 1 && rounded <= 6) {
        return rounded.toString();
      }
      return grade.toFixed(1);
    }
    
    // Für nicht-ausgeschlossene Kategorien: Formatiere IMMER mit Tendenz
    // Verwende einen Toleranzwert für Gleitkomma-Vergleiche
    const tolerance = 0.01;
    
    // Standardwerte mit Tendenzen - mit Toleranz für Gleitkomma-Vergleiche
    if (Math.abs(grade - 1.0) < tolerance) return '1+';
    if (Math.abs(grade - 1.3) < tolerance) return '1-';
    if (Math.abs(grade - 1.7) < tolerance) return '2+';
    if (Math.abs(grade - 2.0) < tolerance) return '2+';
    if (Math.abs(grade - 2.3) < tolerance) return '2-';
    if (Math.abs(grade - 2.7) < tolerance) return '3+';
    if (Math.abs(grade - 3.0) < tolerance) return '3+';
    if (Math.abs(grade - 3.3) < tolerance) return '3-';
    if (Math.abs(grade - 3.7) < tolerance) return '4+';
    if (Math.abs(grade - 4.0) < tolerance) return '4+';
    if (Math.abs(grade - 4.3) < tolerance) return '4-';
    if (Math.abs(grade - 4.7) < tolerance) return '5+';
    if (Math.abs(grade - 5.0) < tolerance) return '5+';
    if (Math.abs(grade - 5.3) < tolerance) return '5-';
    if (Math.abs(grade - 6.0) < tolerance) return '6';
    
    // Wenn die Note nicht exakt einem Standardwert entspricht, runde auf den nächsten Wert mit Tendenz
    const standardGrades = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 4.3, 4.7, 5.0, 5.3, 6.0];
    let closestGrade = standardGrades[0];
    let minDiff = Math.abs(grade - closestGrade);
    
    for (const stdGrade of standardGrades) {
      const diff = Math.abs(grade - stdGrade);
      if (diff < minDiff) {
        minDiff = diff;
        closestGrade = stdGrade;
      }
    }
    
    // Formatiere den nächsten Standardwert mit Tendenz
    if (Math.abs(closestGrade - 1.0) < tolerance) return '1+';
    if (Math.abs(closestGrade - 1.3) < tolerance) return '1-';
    if (Math.abs(closestGrade - 1.7) < tolerance) return '2+';
    if (Math.abs(closestGrade - 2.0) < tolerance) return '2+';
    if (Math.abs(closestGrade - 2.3) < tolerance) return '2-';
    if (Math.abs(closestGrade - 2.7) < tolerance) return '3+';
    if (Math.abs(closestGrade - 3.0) < tolerance) return '3+';
    if (Math.abs(closestGrade - 3.3) < tolerance) return '3-';
    if (Math.abs(closestGrade - 3.7) < tolerance) return '4+';
    if (Math.abs(closestGrade - 4.0) < tolerance) return '4+';
    if (Math.abs(closestGrade - 4.3) < tolerance) return '4-';
    if (Math.abs(closestGrade - 4.7) < tolerance) return '5+';
    if (Math.abs(closestGrade - 5.0) < tolerance) return '5+';
    if (Math.abs(closestGrade - 5.3) < tolerance) return '5-';
    if (Math.abs(closestGrade - 6.0) < tolerance) return '6';
    
    return grade.toFixed(1);
  };

  // Funktion zum Kombinieren von Schema und Noten
  const combineSchemaWithGrades = (schema: GradingSchema, grades: Grade[], groupId: string) => {
    const schemaStructure = parseSchemaStructure(schema.structure);
    const gradesMap = new Map(grades.map(g => [g.categoryName, g]));
    
    // Prüfe, welche EPO-Noten freigegeben sind
    // Erstelle ein Set mit verschiedenen Schreibweisen für case-insensitive Vergleich
    const releasedEpoGrades = new Set<string>();
    epoGrades.forEach((epo: any) => {
      if ((epo.groupId === groupId || epo.group?.id === groupId) && epo.isReleased) {
        const epoKey = `epo ${epo.period}`;
        releasedEpoGrades.add(epoKey.toLowerCase().trim());
        // Füge auch Varianten hinzu für besseren Abgleich
        releasedEpoGrades.add(`epo${epo.period}`);
        releasedEpoGrades.add(`EPO ${epo.period}`);
        releasedEpoGrades.add(`Epo ${epo.period}`);
      }
    });
    
    // Hilfsfunktion: Prüft, ob ein Knoten EPO-Noten enthält (direkt oder indirekt)
    const containsEpo = (node: any): boolean => {
      if (node.children && node.children.length > 0) {
        return node.children.some((child: any) => containsEpo(child));
      }
      return node.name.toLowerCase().includes('epo');
    };
    
    // Hilfsfunktion: Prüft, ob ein Knoten nur EPO-Noten enthält
    const containsOnlyEpo = (node: any): boolean => {
      if (node.children && node.children.length > 0) {
        return node.children.every((child: any) => containsOnlyEpo(child));
      }
      return node.name.toLowerCase().includes('epo');
    };
    
    // Hilfsfunktion: Prüft, ob ein Knoten nur nicht freigegebene EPO-Noten enthält
    const containsOnlyUnreleasedEpo = (node: any): boolean => {
      if (node.children && node.children.length > 0) {
        return node.children.every((child: any) => containsOnlyUnreleasedEpo(child));
      }
      const isEpo = node.name.toLowerCase().includes('epo');
      if (isEpo) {
        const epoKey = node.name.toLowerCase().trim();
        // Prüfe verschiedene Varianten des EPO-Namens
        const epoKeyVariants = [
          epoKey,
          epoKey.replace(/\s+/g, ''), // "epo1" statt "epo 1"
          node.name.trim() // Original-Name
        ];
        const isReleased = epoKeyVariants.some(variant => 
          releasedEpoGrades.has(variant.toLowerCase().trim())
        );
        return !isReleased;
      }
      return false;
    };
    
    // Hilfsfunktion: Prüft, ob mindestens eine EPO-Note in diesem Knoten freigegeben ist
    const hasAnyReleasedEpo = (node: any): boolean => {
      if (node.children && node.children.length > 0) {
        return node.children.some((child: any) => hasAnyReleasedEpo(child));
      }
      const isEpo = node.name.toLowerCase().includes('epo');
      if (isEpo) {
        const epoKey = node.name.toLowerCase().trim();
        // Prüfe verschiedene Varianten des EPO-Namens
        const epoKeyVariants = [
          epoKey,
          epoKey.replace(/\s+/g, ''), // "epo1" statt "epo 1"
          node.name.trim() // Original-Name
        ];
        return epoKeyVariants.some(variant => 
          releasedEpoGrades.has(variant.toLowerCase().trim())
        );
      }
      return false;
    };
    
    const processNode = (node: any): any => {
      const isEpo = node.name.toLowerCase().includes('epo');
      // Suche nach der Note - case-insensitive für EPO-Noten
      let grade = gradesMap.get(node.name);
      if (!grade && isEpo) {
        // Für EPO-Noten: Suche case-insensitive
        const nodeNameLower = node.name.toLowerCase().trim();
        for (const [categoryName, gradeData] of gradesMap.entries()) {
          if (categoryName.toLowerCase().trim() === nodeNameLower) {
            grade = gradeData;
            break;
          }
        }
      }
      
      // Für EPO-Noten: IMMER anzeigen, auch wenn nicht freigegeben
      // Wenn nicht freigegeben oder nicht gesetzt, wird grade undefined bleiben (wird dann grau angezeigt)
      if (isEpo) {
        const epoKey = node.name.toLowerCase().trim();
        // Prüfe verschiedene Varianten des EPO-Namens
        const epoKeyVariants = [
          epoKey,
          epoKey.replace(/\s+/g, ''), // "epo1" statt "epo 1"
          node.name.trim() // Original-Name
        ];
        const isReleased = epoKeyVariants.some(variant => 
          releasedEpoGrades.has(variant.toLowerCase().trim())
        );
        // Wenn nicht freigegeben, setze grade auf undefined (wird grau angezeigt)
        // Aber der Knoten wird trotzdem angezeigt
        if (!isReleased) {
          grade = undefined; // Nicht freigegeben, wird grau angezeigt
        }
      }
      
      const processedChildren = node.children.map(processNode);
      
      // Prüfe, ob dieser Knoten EPO-Noten enthält, aber keine freigegeben sind
      // Dies betrifft übergeordnete Kategorien wie "Sonstige Leistungen" oder "Mündliche Leistungen"
      const hasEpoButNoneReleased = containsEpo(node) && !hasAnyReleasedEpo(node);
      
      // Markiere Knoten, die nur nicht freigegebene EPO-Noten enthalten
      // ABER: EPO-Knoten werden IMMER angezeigt (auch wenn nicht freigegeben), daher false
      const onlyUnreleasedEpo = false; // EPO-Knoten werden immer angezeigt, auch wenn nicht freigegeben
      
      return {
        ...node,
        grade: grade?.grade,
        weight: grade?.weight || node.weight,
        children: processedChildren,
        onlyUnreleasedEpo: onlyUnreleasedEpo, // Nur für vollständig EPO-basierte Blattknoten
        hasEpoButNoneReleased: hasEpoButNoneReleased // Flag für übergeordnete Kategorien mit EPO
      };
    };
    
    return schemaStructure.map(processNode);
  };

  // Funktion zum Berechnen der gewichteten Note aus Kindern
  const calculateWeightedGrade = (node: any): number | null => {
    if (!node.children || node.children.length === 0) {
      return node.grade !== undefined ? node.grade : null;
    }

    const validChildren = node.children.filter((child: any) => {
      const childGrade = calculateWeightedGrade(child);
      return childGrade !== null;
    });

    if (validChildren.length === 0) {
      return null;
    }

    const totalWeight = validChildren.reduce((sum: number, child: any) => sum + child.weight, 0);
    if (totalWeight === 0) {
      return null;
    }

    const weightedSum = validChildren.reduce((sum: number, child: any) => {
      const childGrade = calculateWeightedGrade(child);
      return sum + (childGrade! * child.weight);
    }, 0);

    return weightedSum / totalWeight;
  };

  // Rekursive Komponente für hierarchische Noten-Anzeige
  const renderGradeNode = (node: any, schema: GradingSchema, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isLeafNode = !hasChildren;
    const calculatedGrade = hasChildren ? calculateWeightedGrade(node) : null;
    const isGesamtnote = node.name.toLowerCase().includes("unter") && node.name.toLowerCase().includes("mittelstufe");
    const isGradeReleased = gradeReleases[schema.id] || false;
    
    // Kategorien mit EPO-Noten werden immer angezeigt (auch wenn nicht freigegeben)
    // Sie zeigen dann einen grauen Platzhalter
    
    // Blende die oberste Ebene aus, wenn es "Unter- und Mittelstufe" ist
    if (level === 0 && isGesamtnote) {
      // Zeige immer die Kinder (Teilnoten), aber nur die Gesamtnote selbst wenn freigegeben
      return (
        <Box key={node.name}>
          {hasChildren && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
              {node.children.map((child: any) => renderGradeNode(child, schema, level + 1))}
            </Box>
          )}
        </Box>
      );
    }
    
    return (
      <Box key={node.name} sx={{ mb: 0.5 }}>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
          bgcolor: level === 0 ? '#f0f8ff' : level === 1 ? '#f8f9fa' : 'white',
          borderRadius: 0.7,
          border: '1px solid #e0e0e0',
          ml: level * 2.5, // Einrückung basierend auf Level
          borderLeft: (level > 0 || (node.name.toLowerCase().includes("unter") && node.name.toLowerCase().includes("mittelstufe"))) 
            ? `3px solid ${getLevelColor(level, node.name, isLeafNode)}` 
            : '1px solid #e0e0e0'
        }}>
          <Typography variant="caption" sx={{ 
            color: colors.textPrimary,
            fontSize: level === 0 ? '0.75rem' : level === 1 ? '0.7rem' : '0.6rem',
            fontWeight: level === 0 ? 700 : level === 1 ? 600 : 500,
            fontStyle: level === 0 ? 'italic' : 'normal'
          }}>
            {level === 0 ? '📚 ' : level === 1 ? '📝 ' : '• '}{node.name.toLowerCase().includes("unter") && node.name.toLowerCase().includes("mittelstufe") ? "Gesamtnote" : node.name}
          </Typography>
          
          {/* Entfernt - wird später in der Hauptlogik behandelt */}
          
          {(!hasChildren && (node.grade !== undefined || (node.name.toLowerCase().includes('epo') && node.grade === undefined))) ? (
            // Nur für Blattknoten - eingegebene Noten oder EPO-Noten (auch wenn nicht freigegeben)
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {(() => {
                const isEpo = node.name.toLowerCase().includes('epo');
                // Für EPO-Noten: Prüfe ob Note vorhanden (freigegeben), sonst zeige grauen Platzhalter
                if (isEpo && node.grade === undefined) {
                  return (
                    <Box sx={{ 
                      bgcolor: '#9E9E9E',
                      color: 'white',
                      px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                      py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                      borderRadius: 1,
                      fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                      fontWeight: 'bold',
                      minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                      textAlign: 'center',
                      opacity: 0.6
                    }}>
                      -
                    </Box>
                  );
                }
                return (
                  <Box sx={{ 
                    bgcolor: getLevelColor(level, node.name, true),
                    color: 'white',
                    px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                    py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                    borderRadius: 1,
                    fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                    fontWeight: 'bold',
                    minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                    textAlign: 'center'
                  }}>
                    {formatGradeWithTendency(node.grade, node, schema)}
                  </Box>
                );
              })()}
            </Box>
          ) : (node.grade !== undefined || calculatedGrade !== null || node.hasEpoButNoneReleased) ? (
            // Wenn es die Gesamtnote ist und nicht freigegeben, zeige nichts im Feld
            isGesamtnote && !isGradeReleased ? (
              <Typography variant="caption" sx={{ 
                color: colors.textSecondary,
                fontSize: level === 0 ? '0.6rem' : level === 1 ? '0.55rem' : '0.5rem',
                fontStyle: 'italic'
              }}>
                {/* Feld bleibt leer */}
              </Typography>
            ) : node.hasEpoButNoneReleased ? (
              // Wenn keine EPO-Noten freigegeben sind, zeige grauen Platzhalter
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  bgcolor: '#9E9E9E',
                  color: 'white',
                  px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                  py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                  borderRadius: 1,
                  fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                  fontWeight: 'bold',
                  minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                  textAlign: 'center',
                  opacity: 0.6
                }}>
                  -
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  bgcolor: getLevelColor(level, node.name, isLeafNode),
                  color: 'white',
                  px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                  py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                  borderRadius: 1,
                  fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                  fontWeight: 'bold',
                  minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                  textAlign: 'center',
                  opacity: 0.9,
                  boxShadow: `0 2px 4px ${getLevelColor(level, node.name, isLeafNode)}40`
                }}>
                  {formatGradeWithTendency((node.grade !== undefined ? node.grade : calculatedGrade)!, node, schema)}
                </Box>
              </Box>
            )
          ) : isLeafNode ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                bgcolor: '#9E9E9E',
                color: 'white',
                px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                borderRadius: 1,
                fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                fontWeight: 'bold',
                minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                textAlign: 'center',
                opacity: 0.6,
                border: '1px solid #999'
              }}>
                -
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                bgcolor: '#9E9E9E',
                color: 'white',
                px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                borderRadius: 1,
                fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                fontWeight: 'bold',
                minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                textAlign: 'center',
                opacity: 0.6,
                border: '1px solid #999'
              }}>
                -
              </Box>
            </Box>
          )}
        </Box>
        
        {hasChildren && (
          <Box sx={{ mt: 0.3 }}>
            {node.children
              .map((child: any) => renderGradeNode(child, schema, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  // Funktion zur Bestimmung der Farbe basierend auf dem Level und Knotennamen
  const getLevelColor = (level: number, nodeName?: string, isLeafNode: boolean = false): string => {
    const name = (nodeName || '').toLowerCase();
    
    // Gesamtnote: Hellgrün (auch für "Unter- und Mittelstufe")
    if (name.includes('gesamtnote') || name.includes('gesamt') || 
        (name.includes('unter') && name.includes('mittelstufe'))) {
      return '#81C784'; // Hellgrün für Gesamtnote
    }
    
    // EPO 1: Hellblau
    if (name.includes('epo 1') || name.includes('epo1')) {
      return '#64B5F6'; // Hellblau für EPO 1
    }
    
    // EPO 2: Orange (bleibt wie bisher)
    if (name.includes('epo 2') || name.includes('epo2')) {
      return '#F57C00'; // Orange für EPO 2
    }
    
    // KA 1 und KA 2: Rosaiges Rot
    if (name.includes('ka 1') || name.includes('ka 2') || 
        name.includes('ka1') || name.includes('ka2') ||
        (name.includes('klassenarbeit') && (name.includes('1') || name.includes('2')))) {
      return '#F48FB1'; // Rosaiges Rot für KA 1 und KA 2
    }
    
    // Quizze / Hüs, Sonstiges und Mündliche Leistungen: Grün
    if (name.includes('quizze') || name.includes('hüs') || name.includes('hü') ||
        name.includes('sonstiges') || name.includes('mündlich')) {
      return '#2E7D32'; // Grün für Quizze/Hüs, Sonstiges und Mündliche Leistungen
    }
    
    // EPO-Noten (allgemein, falls nicht 1 oder 2): Orange
    if (name.includes('epo')) {
      return '#F57C00'; // Orange für EPO-Noten
    }
    
    // Allerunterste Ebene (Blattknoten): Gelb (nur wenn keine spezifische Kategorie)
    if (isLeafNode && !name.includes('ka') && !name.includes('epo') && 
        !name.includes('quizze') && !name.includes('hü') && !name.includes('sonstiges')) {
      return '#FFC107'; // Gelb für unterste Ebene
    }
    
    // Klassenarbeiten (allgemein): Lila
    if (name.includes('klassenarbeit') || name.includes('ka')) {
      return '#9C27B0'; // Lila für Klassenarbeiten
    }
    
    // Sonstige Leistungen: Lila
    if (name.includes('sonstige') || (name.includes('leistungen') && !name.includes('mündlich'))) {
      return '#9C27B0'; // Lila für Sonstige Leistungen
    }
    
    // Fallback basierend auf Level
    if (level === 0) return '#1565C0'; // Dunkelblau für oberste Ebene
    if (level === 1) return '#2E7D32'; // Grün für mittlere Ebene
    if (level >= 2) return '#FFC107'; // Gelb für untere Ebene
    
    return '#9E9E9E'; // Grau für weitere Ebenen
  };

  const getGradeColor = (grade: number, gradingSystem: string = 'GERMAN'): string => {
    if (gradingSystem === 'MSS') {
      if (grade >= 13) return '#4CAF50';
      if (grade >= 10) return '#8BC34A';
      if (grade >= 7) return '#FF9800';
      if (grade >= 4) return '#F57C00';
      if (grade >= 1) return '#FF5722';
      return '#C2185B';
    } else {
      if (grade >= 1.0 && grade <= 1.7) return '#4CAF50';
      if (grade >= 2.0 && grade <= 2.7) return '#8BC34A';
      if (grade >= 3.0 && grade <= 3.7) return '#FF9800';
      if (grade >= 4.0 && grade <= 4.7) return '#F57C00';
      if (grade >= 5.0 && grade <= 6.0) return '#C2185B';
      return '#9E9E9E';
    }
  };

  // Funktion zum Umbenennen von "Unter- und Mittelstufe" zu "Gesamtnote"
  const getDisplayName = (originalName: string): string => {
    // Flexiblere Suche für verschiedene Schreibweisen
    if (originalName.toLowerCase().includes("unter") && originalName.toLowerCase().includes("mittelstufe")) {
      return "Gesamtnote";
    }
    return originalName;
  };

  // Hilfsfunktion zum Parsen des Schemas
  const parseSchemaStructure = (schemaStr: string) => {
    const lines = schemaStr.split('\n').filter(line => line.trim());
    const result: any[] = [];
    const stack: { node: any; indent: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const indent = line.search(/\S/);
      const match = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
      
      if (!match) continue;

      const [, name, weightStr] = match;
      const weight = parseFloat(weightStr);

      if (isNaN(weight)) continue;

      const node = {
        name: name.trim(),
        weight: weight,
        level: Math.floor(indent / 2),
        children: []
      };

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        result.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ node, indent });
    }

    return result;
  };

  const fetchGrades = async (groupId: string) => {
    try {
      setGradesLoading(true);
      
      // Lade Bewertungsschema für die Lerngruppe
      const schemaResponse = await fetch(`/api/grading-schemas/${groupId}`);
      if (schemaResponse.ok) {
        const schemas = await schemaResponse.json();
        if (schemas.length > 0) {
          const schema = schemas[0];
          setGradingSchemas(prev => ({ ...prev, [groupId]: schema }));
          
          // Lade Noten für den Schüler
          const gradesResponse = await fetch(`/api/grades/${userId}/${schema.id}`);
          if (gradesResponse.ok) {
            const studentGrades = await gradesResponse.json();
            setGrades(prev => ({ ...prev, [groupId]: studentGrades }));
          }
          
          // Lade Freigabestatus der Gesamtnote
          const releaseResponse = await fetch(`/api/grades/release/${userId}/${schema.id}`);
          if (releaseResponse.ok) {
            const releaseData = await releaseResponse.json();
            setGradeReleases(prev => ({ ...prev, [schema.id]: releaseData.isReleased || false }));
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Noten:', error);
    } finally {
      setGradesLoading(false);
    }
  };

  const fetchAllContent = async (teacherId: string) => {
    try {
      // Subjects
      const resSubjects = await fetch(`/api/subjects?teacherId=${teacherId}`);
      const subjectsData = resSubjects.ok ? await resSubjects.json() : [];
      setSubjects(subjectsData);

      // Blocks
      let allBlocks: Block[] = [];
      for (const subj of subjectsData) {
        const resBlocks = await fetch(`/api/blocks?subjectId=${subj.id}`);
        const blocksData = resBlocks.ok ? await resBlocks.json() : [];
        allBlocks = allBlocks.concat(blocksData);
      }
      setBlocks(allBlocks);

      // Units
      let allUnits: Unit[] = [];
      for (const block of allBlocks) {
        const resUnits = await fetch(`/api/units?blockId=${block.id}`);
        const unitsData = resUnits.ok ? await resUnits.json() : [];
        allUnits = allUnits.concat(unitsData);
      }
      setUnits(allUnits);

      // Topics
      let allTopics: Topic[] = [];
      for (const unit of allUnits) {
        const resTopics = await fetch(`/api/topics?unitId=${unit.id}`);
        const topicsData = resTopics.ok ? await resTopics.json() : [];
        allTopics = allTopics.concat(topicsData);
      }
      setTopics(allTopics);

      // Lessons
      let allLessons: Lesson[] = [];
      for (const topic of allTopics) {
        const resLessons = await fetch(`/api/lessons?topicId=${topic.id}`);
        const lessonsData = resLessons.ok ? await resLessons.json() : [];
        allLessons = allLessons.concat(lessonsData);
      }
      setLessons(allLessons);

      // Materialien und Quizze für alle Lessons laden
      const materialsMap: {[key: string]: any[]} = {};
      const quizzesMap: {[key: string]: any} = {};
      
      for (const lesson of allLessons) {
        // Materialien laden
        const materials = await fetchLessonMaterials(lesson.id);
        materialsMap[lesson.id] = materials;
        
        // Quizze laden
        const quiz = await fetchLessonQuiz(lesson.id);
        if (quiz) {
          quizzesMap[lesson.id] = quiz;
        }
      }
      
      setMaterialsMap(materialsMap);
      setQuizzesMap(quizzesMap);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  // Lade Submission-Status für alle H_ Dateien
  useEffect(() => {
    const loadSubmissionStatuses = async () => {
      const statuses: {[filePath: string]: boolean} = {};
      
      // Durchsuche alle geladenen Ordnerinhalte nach H_ Dateien
      for (const key in assignedFolderContents) {
        const items = assignedFolderContents[key];
        
        const checkFilesRecursively = async (fileItems: any[]) => {
          for (const item of fileItems) {
            if (item.type === 'file' && item.name.startsWith('H_')) {
              const hasSubmission = await checkSubmissionStatus(item.path);
              statuses[item.path] = hasSubmission;
            }
            if (item.type === 'directory' && item.children) {
              await checkFilesRecursively(item.children);
            }
          }
        };
        
        await checkFilesRecursively(items);
      }
      
      setSubmissionStatuses(statuses);
    };
    
    if (Object.keys(assignedFolderContents).length > 0) {
      loadSubmissionStatuses();
    }
  }, [assignedFolderContents, userId]);

  // Lade ungelesene Nachrichten regelmäßig
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const loginCode = localStorage.getItem('loginCode') || '';
        const response = await fetch('/api/messages/unread-count', {
          headers: {
            'Content-Type': 'application/json',
            'x-login-code': loginCode
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadMessageCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Fehler beim Laden der ungelesenen Nachrichten:', error);
      }
    };

    loadUnreadCount();
    // Lade alle 30 Sekunden neu
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const fetchLerngruppen = async () => {
      try {
        // Lade zuerst den Student-Namen
        await fetchStudentData(userId);
        
        console.log('📚 Fetching learning groups for student:', userId);
        const response = await fetch(`/api/learning-groups/student/${userId}`);
        console.log('📡 Response status:', response.status, response.statusText);
        console.log('📡 Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type');
          let errorData;
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            console.error('❌ Non-JSON error response:', text);
            throw new Error(`Server-Fehler: ${text.substring(0, 100)}`);
          }
          console.error('❌ Error loading groups:', errorData);
          throw new Error(errorData.error || errorData.message || 'Lerngruppen konnten nicht geladen werden');
        }
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.error('❌ Non-JSON response:', text);
          throw new Error(`Server-Fehler: Ungültige Antwort vom Server`);
        }
        console.log('✅ Loaded', data.length, 'learning groups');
        setLerngruppen(data);
        
        // Wenn Lerngruppen geladen sind, lade die Zuweisungen und Inhalte
        if (data.length > 0) {
          const assignmentsData = await fetchAssignments(data);
          
          // Lade Namen für alle Assignments
          const assignmentsWithNames = await Promise.all(
            assignmentsData.map(async (assignment) => {
              const name = await fetchNameForAssignment(assignment.type, assignment.refId);
              return { ...assignment, name };
            })
          );
          setAssignments(assignmentsWithNames);
          
          // Lade alle Inhalte für die Lehrer der Lerngruppen
          for (const group of data) {
            await fetchAllContent(group.teacher.id);
            // Lade Noten für jede Lerngruppe
            await fetchGrades(group.id);
            // Lade zugeordnete Ordner für jede Lerngruppe
            await fetchAssignedFolders(group.id);
          }
          
          // Lade Mitarbeitsbewertungen
          await fetchParticipationData(userId);
          await fetchEpoGrades(userId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    fetchLerngruppen();
  }, [userId]);

  // Lade Ordner neu, wenn das Fenster wieder fokussiert wird (z. B. nachdem Lehrer Ordner hinzugefügt hat)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && lerngruppen.length > 0) {
        console.log('🔄 Fenster wieder sichtbar - lade Ordner neu...');
        lerngruppen.forEach(group => {
          fetchAssignedFolders(group.id);
        });
      }
    };

    const handleFocus = () => {
      if (lerngruppen.length > 0) {
        console.log('🔄 Fenster fokussiert - lade Ordner neu...');
        lerngruppen.forEach(group => {
          fetchAssignedFolders(group.id);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [lerngruppen]);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh" sx={{ bgcolor: colors.background }}>
      <CircularProgress sx={{ color: colors.primary }} />
    </Box>
  );
  
  if (error) return (
    <Box sx={{ width: '100%', bgcolor: colors.background, p: 0 }}>
      <Grid container spacing={0}>
        <Grid item xs={12}>
          <Box sx={{ p: 2 }}>
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              bgcolor: colors.cardBg 
            }}>
              <CardContent>
                <Typography color="error">{error}</Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', bgcolor: colors.background, p: 0 }}>
      <Grid container spacing={0}>
        {/* Header Section - Full Width */}
        <Grid item xs={12}>
          <Box sx={{ 
            p: 1.05,
            background: '#f8f9fa',
            color: '#222',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar 
                  sx={{ 
                    width: 28, 
                    height: 28, 
                    bgcolor: '#1976d2', // Blau wie die Fläche unten
                    boxShadow: '0 1.4px 2.8px rgba(0,0,0,0.12)'
                  }}
                >
                  {studentName.charAt(0)}
                </Avatar>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto', alignItems: 'center' }}>
                {/* Rätseljahr 2026 Button mit Statistik-Badge */}
                <Box sx={{ position: 'relative', ml: 'auto' }}>
                  <IconButton
                    onClick={() => {
                      // Tägliches Rätsel basierend auf Datum + userId auswählen
                      const stats = getRiddleStats(userId);
                      const result = getDailyRiddleForUser(userId, stats);
                      
                      if (result.isLocked) {
                        alert('🔒 Du hast heute bereits 2 Versuche gehabt! Das Rätsel kommt morgen wieder. Komm morgen zurück für ein neues Rätsel!');
                        return;
                      }
                      
                      if (!result.riddle) {
                        // Bereits gelöst heute
                        alert('🎉 Du hast das heutige Rätsel bereits gelöst! Komm morgen wieder für ein neues Rätsel!');
                        return;
                      }
                      
                      setCurrentRiddle(result.riddle);
                      setAttemptsLeft(result.attemptsLeft);
                      setRiddleAnswer('');
                      setRiddleSolved(false);
                      setShowHint(false);
                      setShowNewYearRiddle(true);
                    }}
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.4,
                      position: 'relative',
                      overflow: 'visible',
                      border: '2px solid rgba(102, 126, 234, 0.3)',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        borderColor: 'rgba(102, 126, 234, 0.6)',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                    title={`Rätseljahr 2026 🎊 - ${riddleStats.solved} gelöst`}
                  >
                    {/* Rotes Geschenk mit gelber Schleife */}
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Rote Geschenkbox mit Schatten */}
                        <rect x="4" y="11" width="16" height="13" fill="#DC143C" rx="1.5" stroke="#8B0000" strokeWidth="2" />
                        
                        {/* Gelber vertikaler Streifen in der Mitte */}
                        <rect x="11" y="11" width="2" height="13" fill="#FFD700" />
                        
                        {/* Gelbe Schleife oben */}
                        {/* Vertikaler Teil der Schleife */}
                        <rect x="11" y="2" width="2" height="10" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" rx="1" />
                        
                        {/* Horizontales Band */}
                        <rect x="7" y="6" width="10" height="3" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" rx="1.5" />
                        
                        {/* Linke Schleife (nach außen gebogen) */}
                        <ellipse cx="8.5" cy="6.5" rx="2.5" ry="3.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
                        {/* Rechte Schleife (nach außen gebogen) */}
                        <ellipse cx="15.5" cy="6.5" rx="2.5" ry="3.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
                        
                        {/* Linkes Schleifenende (diagonal geschnitten) */}
                        <path d="M 6.5 7 L 6.5 10 L 6 10.5 L 6.5 11 L 7 10.5 L 7 7 Z" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
                        {/* Rechtes Schleifenende (diagonal geschnitten) */}
                        <path d="M 17.5 7 L 17.5 10 L 18 10.5 L 17.5 11 L 17 10.5 L 17 7 Z" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
                      </svg>
                    </Box>
                    
                    {/* Grüner Badge mit Anzahl gelöster Rätsel */}
                    {riddleStats.solved > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: '#4caf50',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          border: '2px solid white',
                          zIndex: 1,
                        }}
                      >
                        {riddleStats.solved}
                      </Box>
                    )}
                  </IconButton>
                </Box>
                {/* Minigame Button */}
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => {
                      if (!canPlayMinigame(userId)) {
                        alert('🎮 Du hast das Minigame heute bereits gespielt oder es ist Game Over! Komm morgen wieder!');
                        return;
                      }
                      setShowMinigame(true);
                    }}
                    disabled={!canPlayMinigame(userId)}
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.4,
                      position: 'relative',
                      overflow: 'visible',
                      border: '2px solid rgba(255, 152, 0, 0.3)',
                      background: canPlayMinigame(userId) 
                        ? 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'
                        : 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                      '&:hover': {
                        transform: canPlayMinigame(userId) ? 'scale(1.05)' : 'none',
                        borderColor: canPlayMinigame(userId) ? 'rgba(255, 152, 0, 0.6)' : 'rgba(158, 158, 158, 0.3)',
                        boxShadow: canPlayMinigame(userId) ? '0 4px 12px rgba(255, 152, 0, 0.4)' : '0 2px 8px rgba(158, 158, 158, 0.3)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                    title={canPlayMinigame(userId) ? "Minigame" : "Minigame - Bereits gespielt oder Game Over"}
                  >
                    <GamesIcon sx={{ fontSize: 22 }} />
                  </IconButton>
                  {/* Grüner Badge mit Anzahl der Gewinne */}
                  {minigameWins > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: '#4caf50',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        border: '2px solid white',
                        zIndex: 1,
                      }}
                    >
                      {minigameWins}
                    </Box>
                  )}
                </Box>
                {/* Karnevals-Minigame Button */}
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => setShowCarnivalGames(true)}
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.4,
                      position: 'relative',
                      overflow: 'visible',
                      border: '2px solid rgba(255, 20, 147, 0.3)',
                      background: 'linear-gradient(135deg, #FF1493 0%, #FF69B4 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(255, 20, 147, 0.3)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        borderColor: 'rgba(255, 20, 147, 0.6)',
                        boxShadow: '0 4px 12px rgba(255, 20, 147, 0.4)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                    title="Karnevals-Minigames"
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '1.4rem',
                        lineHeight: 1,
                        display: 'inline-block'
                      }}
                    >
                      🎭
                    </Typography>
                  </IconButton>
                </Box>
                {/* 7-Minuten-Workout */}
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => navigate('/seven-minute-workout')}
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.4,
                      position: 'relative',
                      overflow: 'visible',
                      border: '2px solid rgba(255, 107, 53, 0.45)',
                      background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(255, 107, 53, 0.35)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        borderColor: 'rgba(255, 107, 53, 0.7)',
                        boxShadow: '0 4px 12px rgba(255, 107, 53, 0.45)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                    title="7-Minuten-Workout"
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        lineHeight: 1,
                        display: 'inline-block',
                      }}
                    >
                      7
                    </Typography>
                  </IconButton>
                </Box>
                {/* EntryTicket */}
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => navigate('/entry-ticket')}
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.4,
                      position: 'relative',
                      overflow: 'visible',
                      border: '2px solid rgba(33, 150, 243, 0.45)',
                      background: 'linear-gradient(135deg, #1e88e5 0%, #3949ab 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(30, 136, 229, 0.35)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        borderColor: 'rgba(33, 150, 243, 0.7)',
                        boxShadow: '0 4px 12px rgba(30, 136, 229, 0.45)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                    title="EntryTicket (5 Minuten)"
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        letterSpacing: 0,
                        lineHeight: 1,
                        display: 'inline-block',
                      }}
                    >
                      E
                    </Typography>
                  </IconButton>
                </Box>
                {/* ExitTicket */}
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => navigate('/exit-ticket')}
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.4,
                      position: 'relative',
                      overflow: 'visible',
                      border: '2px solid rgba(102, 187, 106, 0.45)',
                      background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(67, 160, 71, 0.35)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        borderColor: 'rgba(102, 187, 106, 0.75)',
                        boxShadow: '0 4px 12px rgba(67, 160, 71, 0.45)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                    title="ExitTicket"
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        letterSpacing: 0,
                        lineHeight: 1,
                        display: 'inline-block',
                      }}
                    >
                      X
                    </Typography>
                  </IconButton>
                </Box>
                {/* Bewegungsgeschichten (WIMASU-Klassiker) */}
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => navigate('/bewegungsgeschichten-klassiker')}
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.4,
                      position: 'relative',
                      overflow: 'visible',
                      border: '2px solid rgba(92, 107, 192, 0.45)',
                      background: 'linear-gradient(135deg, #5c6bc0 0%, #3949ab 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(57, 73, 171, 0.35)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        borderColor: 'rgba(92, 107, 192, 0.75)',
                        boxShadow: '0 4px 12px rgba(57, 73, 171, 0.45)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                    title="Bewegungsgeschichten (Pferderennen, Elefant, Löwenjagd)"
                  >
                    <AutoStoriesIcon sx={{ fontSize: 22 }} />
                  </IconButton>
                </Box>
                {/* Logout Button */}
                <Button 
                  variant="contained"
                  color="primary"
                  size="small"
                  sx={{
                    minWidth: 70,
                    bgcolor: '#333',
                    color: 'white',
                    fontWeight: 500,
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#222' },
                    borderRadius: 1.4,
                    fontSize: '0.7rem',
                    py: 0.35,
                    px: 1.2
                  }}
                  onClick={onLogout}
                >
                  Logout
                </Button>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Character Profile Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.4 }}>
            <Card sx={{ 
              borderRadius: 2.8,
              boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.14s',
              '&:hover': {
                transform: 'translateY(-2.8px)'
              }
            }}>
              <CardContent>
                {/* Character Header with Wizard Emoji */}
                <Box sx={{ 
                  background: 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)',
                  borderRadius: 2.1,
                  p: 2.1,
                  mb: 2.1,
                  textAlign: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
                onClick={handleOpenEmojiSelector}
              >
                <Typography variant="h1" sx={{ fontSize: '4rem', mb: 1 }}>
                  {isUpdatingEmoji ? '⏳' : selectedEmoji}
                </Typography>
                <ReisebegleiterAvatarBadge refreshKey={journeyRefreshKey} />
                <Tooltip title="Avatar ändern" placement="top">
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      bgcolor: 'rgba(255,255,255,0.8)',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.95)',
                        transform: 'scale(1.05)'
                      }
                    }}
                    size="small"
                  >
                    <EditIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Tooltip>
              </Box>

                {/* Character Name and Role */}
                <Box sx={{ textAlign: 'center', mb: 2.1 }}>
                  <Typography variant="h5" component="h2" sx={{ 
                    fontWeight: 'bold', 
                    color: '#1976d2', 
                    fontSize: '1.12rem',
                    mb: 0.7
                  }}>
                    {studentName || "Schüler"}
                  </Typography>

                </Box>

                {/* Character Stats */}
                <Grid container spacing={1.4} sx={{ mb: 2.1 }}>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: '#e0e0e0'
                      }
                    }}
                    onClick={() => {
                      setFlashcardLearningOpen(true);
                      setGradesExpanded(false);
                      setParticipationExpanded(false);
                    }}
                    >
                      <Typography variant="h4" sx={{ 
                        color: '#424242',
                        fontWeight: 'bold',
                        fontSize: '1.8rem',
                        mb: 0.35
                      }}>
                        🗂️
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#424242',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Karteikarten lernen
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: '#e0e0e0'
                      }
                    }}
                    onClick={() => {
                      setShowSubmissionStats(true);
                      setGradesExpanded(false);
                      setParticipationExpanded(false);
                    }}
                    >
                      <Typography variant="h4" sx={{ 
                        color: '#424242',
                        fontWeight: 'bold',
                        fontSize: '1.8rem',
                        mb: 0.35
                      }}>
                        📊
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#424242',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Abgabestatistik
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                      '&:hover': {
                        bgcolor: '#e0e0e0'
                      }
                    }}
                    onClick={() => {
                      setShowInbox(true);
                      setGradesExpanded(false);
                      setParticipationExpanded(false);
                    }}
                    >
                      {unreadMessageCount > 0 && (
                        <Box sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: '#f44336',
                          color: '#fff',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          zIndex: 1
                        }}>
                          {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                        </Box>
                      )}
                      <Typography variant="h4" sx={{ 
                        color: '#424242',
                        fontWeight: 'bold',
                        fontSize: '1.8rem',
                        mb: 0.35
                      }}>
                        📬
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#424242',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Posteingang
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Noten und Mitarbeit Kacheln */}
                {lerngruppen.length > 0 && (
                  <Grid container spacing={1.4} sx={{ mb: 2.1 }}>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        bgcolor: '#f5f5f5',
                        borderRadius: 1.4,
                        p: 1.4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: '#e0e0e0'
                        }
                      }}
                      onClick={() => {
                        if (gradesExpanded) {
                          setGradesExpanded(false);
                        } else {
                          setGradesExpanded(true);
                          setParticipationExpanded(false);
                        }
                      }}
                      >
                        <Typography variant="h4" sx={{ 
                          color: '#424242',
                          fontWeight: 'bold',
                          fontSize: '1.8rem',
                          mb: 0.35
                        }}>
                          📝
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: '#424242',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          Noten
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        bgcolor: '#f5f5f5',
                        borderRadius: 1.4,
                        p: 1.4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: '#e0e0e0'
                        }
                      }}
                      onClick={() => {
                        if (participationExpanded) {
                          setParticipationExpanded(false);
                        } else {
                          setParticipationExpanded(true);
                          setGradesExpanded(false);
                        }
                      }}
                      >
                        <Typography variant="h4" sx={{ 
                          color: '#424242',
                          fontWeight: 'bold',
                          fontSize: '1.8rem',
                          mb: 0.35
                        }}>
                          👋
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: '#424242',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          Epochal
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {/* Noten Anzeige */}
                {lerngruppen.length > 0 && gradesExpanded && (
                  <Box sx={{ mt: 2.1 }}>
                    {gradesLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                            <CircularProgress size={20} />
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                            {lerngruppen.map((gruppe) => {
                              const groupGrades = grades[gruppe.id] || [];
                              const schema = gradingSchemas[gruppe.id];
                              
                              if (groupGrades.length === 0) {
                                return (
                                  <Box key={gruppe.id} sx={{ 
                                    p: 1.4,
                                    bgcolor: '#f8f9fa',
                                    borderRadius: 1.4,
                                    border: '1px solid #e0e0e0'
                                  }}>
                                                                      <Typography variant="body2" sx={{ 
                                    color: colors.primary,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    mb: 0.7
                                  }}>
                                    📚 {getDisplayName(gruppe.name)}
                                  </Typography>
                                    <Typography variant="caption" sx={{ 
                                      color: colors.textSecondary,
                                      fontSize: '0.65rem',
                                      fontStyle: 'italic'
                                    }}>
                                      Noch keine Noten vorhanden
                                    </Typography>
                                  </Box>
                                );
                              }

                              // Kombiniere Schema mit Noten für hierarchische Anzeige
                              const hierarchicalGrades = combineSchemaWithGrades(schema, groupGrades, gruppe.id);

                              return (
                                <Box key={gruppe.id} sx={{ 
                                  p: 1.4,
                                  bgcolor: '#f8f9fa',
                                  borderRadius: 1.4,
                                  border: '1px solid #e0e0e0'
                                }}>
                                  <Typography variant="body2" sx={{ 
                                    color: colors.primary,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    mb: 1,
                                    pb: 0.5,
                                    borderBottom: `2px solid ${colors.primary}30`
                                  }}>
                                    📚 {getDisplayName(gruppe.name)}
                                  </Typography>
                                  
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                    {hierarchicalGrades.map((node) => renderGradeNode(node, schema))}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                  </Box>
                )}

                {/* Mitarbeitsbewertungen Anzeige */}
                {lerngruppen.length > 0 && participationExpanded && (
                  <Box sx={{ mt: 2.1 }}>
                    {participationLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                            <CircularProgress size={20} />
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4, mt: 1 }}>
                            {Object.keys(participationData).length === 0 ? (
                              <Typography variant="caption" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.65rem',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                py: 1
                              }}>
                                Noch keine Epochalbewertungen vorhanden
                              </Typography>
                            ) : (
                              Object.keys(participationData).map((groupId) => {
                                const groupData = participationData[groupId];
                                const group = lerngruppen.find(g => g.id === groupId);
                                
                                if (!group) return null;
                                
                                const extractLessonKeywordFromComment = (text: string | undefined | null): string => {
                                  if (!text) return '';
                                  const m = text.match(/\[K:(.*?)\]/);
                                  return m ? m[1].trim() : '';
                                };
                                
                                const getValueEmoji = (value: number) => {
                                  if (value === 2) return '😄';
                                  if (value === 1) return '😊';
                                  if (value === 0) return '😐';
                                  if (value === -1) return '🙁';
                                  if (value === -2) return '😞';
                                  return '😐';
                                };
                                
                                const getValueColor = (value: number) => {
                                  if (value === 2) return '#4CAF50'; // Grün = sehr gut
                                  if (value === 1) return '#2196F3'; // Blau = gut
                                  if (value === 0) return '#9E9E9E';
                                  if (value === -1) return '#FFC107';
                                  if (value === -2) return '#F44336';
                                  return '#9E9E9E';
                                };
                                
                                const getGradeColor = (grade: number | null) => {
                                  if (!grade) return '#9E9E9E';
                                  if (grade <= 1.5) return '#4CAF50';
                                  if (grade <= 2.5) return '#8BC34A';
                                  if (grade <= 3.5) return '#FFC107';
                                  if (grade <= 4.5) return '#FF9800';
                                  return '#F44336';
                                };
                                
                                return (
                                  <Box key={groupId} sx={{ 
                                    p: 1.4,
                                    bgcolor: '#fff9e6',
                                    borderRadius: 1.4,
                                    border: '1px solid #ffcc80'
                                  }}>
                                    <Box sx={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      mb: 1,
                                      pb: 0.5,
                                      borderBottom: `2px solid #ffcc8030`
                                    }}>
                                      <Typography variant="body2" sx={{ 
                                        color: '#F57C00',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                      }}>
                                        📚 {group.name}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                      </Box>
                                    </Box>
                                    
                                    {/* Grober grafischer Verlauf */}
                                    {groupData.participations.length > 0 && (
                                      <Box sx={{ mb: 1.5, mt: 1 }}>
                                        {/* Zeitraum-Markierungen */}
                                        {((groupData.period1Hours && groupData.period1Hours > 0) || (groupData.period2Hours && groupData.period2Hours > 0)) && (
                                          <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            gap: 0.05,
                                            mb: 0.3,
                                            px: 0.2,
                                            fontSize: '0.55rem',
                                            color: 'text.secondary'
                                          }}>
                                            {(() => {
                                              // Berechne Gesamtzahl der Stunden
                                              const maxLessonIndex = Math.max(
                                                ...groupData.participations.map(p => p.lessonIndex),
                                                -1
                                              );
                                              const totalLessonsFromParticipations = maxLessonIndex + 1;
                                              
                                              // Verwende period1Hours + period2Hours falls gesetzt, sonst die maximale lessonIndex + 1
                                              const period1Count = groupData.period1Hours || 0;
                                              const period2Count = groupData.period2Hours || 0;
                                              const totalLessons = period1Count + period2Count > 0 
                                                ? period1Count + period2Count 
                                                : totalLessonsFromParticipations;
                                              
                                              return (
                                                <>
                                                  {period1Count > 0 && (
                                                    <Box sx={{ 
                                                      flex: period1Count,
                                                      textAlign: 'center',
                                                      color: '#1976D2',
                                                      fontWeight: 600,
                                                      fontSize: '0.6rem',
                                                      borderTop: '1.5px solid #1976D2',
                                                      pt: 0.2
                                                    }}>
                                                      Zeitraum 1
                                                    </Box>
                                                  )}
                                                  {period2Count > 0 && (
                                                    <Box sx={{ 
                                                      flex: period2Count,
                                                      textAlign: 'center',
                                                      color: '#F57C00',
                                                      fontWeight: 600,
                                                      fontSize: '0.6rem',
                                                      borderTop: '1.5px solid #F57C00',
                                                      pt: 0.2
                                                    }}>
                                                      Zeitraum 2
                                                    </Box>
                                                  )}
                                                </>
                                              );
                                            })()}
                                          </Box>
                                        )}
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'flex-end',
                                          gap: 0,
                                          height: 32,
                                          px: 0.1,
                                          pb: 0.3,
                                          position: 'relative',
                                          width: '100%'
                                        }}>
                                          {(() => {
                                            // Erstelle Map für schnellen Zugriff auf Bewertungen
                                            const participationMap = new Map<number, typeof groupData.participations[0]>();
                                            groupData.participations.forEach(p => {
                                              participationMap.set(p.lessonIndex, p);
                                            });
                                            
                                            // Berechne Gesamtzahl der Stunden
                                            const maxLessonIndex = Math.max(
                                              ...groupData.participations.map(p => p.lessonIndex),
                                              -1
                                            );
                                            const period1Count = groupData.period1Hours || 0;
                                            const period2Count = groupData.period2Hours || 0;
                                            const totalLessons = period1Count + period2Count > 0 
                                              ? period1Count + period2Count 
                                              : Math.max(maxLessonIndex + 1, 0);
                                            
                                            // Erstelle Array für alle Stunden von 0 bis totalLessons-1
                                            const allLessons = Array.from({ length: totalLessons }, (_, i) => i);
                                            
                                            return allLessons.map((lessonIndex) => {
                                              const participation = participationMap.get(lessonIndex);
                                              
                                              // Bestimme Period basierend auf lessonIndex
                                              const participationPeriod = period1Count > 0 && lessonIndex < period1Count ? 1 :
                                                                         period2Count > 0 && lessonIndex >= period1Count ? 2 : 0;
                                              const periodBorderColor = participationPeriod === 1 ? '#1976D2' : 
                                                                        participationPeriod === 2 ? '#F57C00' : 'transparent';
                                              const isPeriodStart = participationPeriod > 0 && (lessonIndex === 0 || 
                                                (participationPeriod === 1 && lessonIndex === 0) ||
                                                (participationPeriod === 2 && lessonIndex === period1Count));
                                              const isPeriodEnd = participationPeriod > 0 && (
                                                (participationPeriod === 1 && lessonIndex === period1Count - 1) ||
                                                (participationPeriod === 2 && lessonIndex === totalLessons - 1)
                                              );
                                              
                                              // Wenn keine Bewertung vorhanden, zeige grauen Balken
                                              if (!participation) {
                                                const width = `${Math.max(0.5, 100 / totalLessons)}%`;
                                                
                                                return (
                                                  <Box
                                                    key={lessonIndex}
                                                    sx={{
                                                      flex: `0 0 ${width}`,
                                                      width: width,
                                                      minWidth: '1px',
                                                      height: '8px', // Sehr niedrig für nicht gesetzte Stunden
                                                      bgcolor: '#E0E0E0', // Grau für nicht gesetzte Stunden
                                                      borderRadius: '1px 1px 0 0',
                                                      opacity: 0.5,
                                                      transition: 'all 0.2s',
                                                      position: 'relative',
                                                      borderLeft: isPeriodStart ? `1px solid ${periodBorderColor}` : 'none',
                                                      borderRight: isPeriodEnd ? `1px solid ${periodBorderColor}` : 'none',
                                                      borderTop: periodBorderColor !== 'transparent' ? `1px solid ${periodBorderColor}` : 'none'
                                                    }}
                                                  />
                                                );
                                              }
                                              
                                              // Normalisiere Wert zu Höhe (0-32px) - kompakter
                                              // Grün (2 = sehr gut) höher als Blau (1 = gut)
                                              // -2 -> 6px, -1 -> 10px, 0 -> 14px, 2 (grün/sehr gut) -> 28px, 1 (blau/gut) -> 20px
                                              const height = participation.value === 2 ? 28 :  // Grün (sehr gut) = höher
                                                             participation.value === 1 ? 20 :  // Blau (gut) = niedriger
                                                             participation.value === 0 ? 14 :  // Grau (neutral)
                                                             participation.value === -1 ? 10 :  // Gelb (schlecht)
                                                             6; // Rot (sehr schlecht)
                                              // Balkenbreite: Maximal 2px pro Balken, damit alles passt
                                              const width = `${Math.max(0.5, 100 / totalLessons)}%`;
                                              
                                              const hasComment = participation.comment && participation.comment.trim().length > 0;
                                              
                                              // Kommentar ohne Thema-Tag für Tooltip
                                              const tooltipTitle = participation.comment 
                                                ? participation.comment.replace(/\s*\[K:.*?\]\s*/g, ' ').replace(/\s+/g, ' ').trim()
                                                : '';
                                              
                                              const barBox = (
                                                <Box
                                                  key={participation.lessonIndex}
                                                  sx={{
                                                    flex: `0 0 ${width}`,
                                                    width: width,
                                                    minWidth: '1px',
                                                    height: `${height}px`,
                                                    bgcolor: getValueColor(participation.value),
                                                    borderRadius: '1px 1px 0 0',
                                                    opacity: 0.7,
                                                    transition: 'all 0.2s',
                                                    position: 'relative',
                                                    cursor: hasComment ? 'pointer' : 'default',
                                                    borderLeft: isPeriodStart ? `1px solid ${periodBorderColor}` : 'none',
                                                    borderRight: isPeriodEnd ? `1px solid ${periodBorderColor}` : 'none',
                                                    borderTop: periodBorderColor !== 'transparent' ? `1px solid ${periodBorderColor}` : 'none',
                                                    '&:hover': {
                                                      opacity: 1,
                                                      transform: 'scaleY(1.15)',
                                                      transformOrigin: 'bottom'
                                                    }
                                                  }}
                                                >
                                                  {hasComment && (
                                                    <Box
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedComment(tooltipTitle || participation.comment || '');
                                                        setCommentModalOpen(true);
                                                      }}
                                                      onTouchStart={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedComment(tooltipTitle || participation.comment || '');
                                                        setCommentModalOpen(true);
                                                      }}
                                                      sx={{
                                                        position: 'absolute',
                                                        top: -2,
                                                        right: -2,
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: '50%',
                                                        bgcolor: '#FF9800',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        color: 'white',
                                                        zIndex: 10,
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                        cursor: 'pointer',
                                                        userSelect: 'none',
                                                        WebkitTapHighlightColor: 'rgba(255, 152, 0, 0.3)',
                                                        touchAction: 'manipulation',
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                          transform: 'scale(1.2)',
                                                          bgcolor: '#F57C00'
                                                        },
                                                        '&:active': {
                                                          transform: 'scale(1.1)'
                                                        }
                                                      }}
                                                    >
                                                      💬
                                                    </Box>
                                                  )}
                                                </Box>
                                              );
                                              
                                              // Zeige Tooltip nur wenn Kommentar vorhanden ist
                                              if (tooltipTitle) {
                                                return (
                                                  <Tooltip
                                                    key={participation.lessonIndex}
                                                    title={tooltipTitle}
                                                    arrow
                                                    placement="top"
                                                  >
                                                    {barBox}
                                                  </Tooltip>
                                                );
                                              }
                                              
                                              return barBox;
                                            });
                                          })()}
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })
                            )}
                          </Box>
                        )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Learning Groups Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.4 }}>
            <Card sx={{ 
              borderRadius: 2.8,
              boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.14s',
              '&:hover': {
                transform: 'translateY(-2.8px)'
              }
            }}>
              <CardContent>
                <Grid container spacing={1.4}>
                  {lerngruppen
                    .filter(gruppe => !gruppe.name.toLowerCase().includes("unter") || !gruppe.name.toLowerCase().includes("mittelstufe"))
                    .map((gruppe) => (
                    <Grid item xs={12} key={gruppe.id}>
                      <Card variant="outlined" sx={{ 
                        borderRadius: 2.8,
                        border: '1px solid #e0e0e0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                          transform: 'translateY(-1px)'
                        }
                      }}>
                        <CardContent sx={{ p: 2.1 }}>
                          {/* Überschrift entfernt */}
                          
                          {/* Zugeordnete Ordner - direkt unterhalb des Headers, exakt wie im TeacherDashboard */}
                          {assignedFolders[gruppe.id] && assignedFolders[gruppe.id].length > 0 ? (
                            <Box>
                              {assignedFolders[gruppe.id]
                                .filter((folderPath: string) => {
                                  // Filtere Ordner mit dem Namen "Karteikarten" aus
                                  const folderName = folderPath.split('/').pop() || folderPath;
                                  return !folderName.toLowerCase().includes('karteikarten');
                                })
                                .map((folderPath: string) => {
                                  return renderAssignedFolderPreview(gruppe.id, folderPath);
                                })}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ 
                              color: colors.textSecondary,
                              fontSize: '0.75rem',
                              fontStyle: 'italic'
                            }}>
                              Keine Ordner zugeordnet
                            </Typography>
                          )}
                          
                          {/* Zugeordnete Inhalte anzeigen */}
                          {(() => {
                            // Prüfe, ob es tatsächlich zugeordnete Inhalte gibt
                            const hasAssignedContent = subjects.some(subject => 
                              (subjectAssignments[subject.id] || []).includes(gruppe.id)
                            );
                            
                            if (!hasAssignedContent) {
                              return null; // Keine Box anzeigen, wenn leer
                            }
                            
                            return (
                              <Box sx={{ mt: 2 }}>
                                
                                {/* Verschachtelte Darstellung wie im TeacherDashboard */}
                                <Box sx={{ 
                                  ml: 1,
                                  p: 1.4,
                                  bgcolor: '#fafbfc',
                                  borderRadius: 1.4,
                                  border: '1px solid #f0f0f0'
                                }}>
                                  {subjects
                                    .filter(subject => (subjectAssignments[subject.id] || []).includes(gruppe.id))
                                    .map(subject => (
                                    <Box key={subject.id} sx={{ mb: 1.4 }}>
                                      <Typography variant="body2" sx={{ 
                                        fontWeight: 'bold', 
                                        color: colors.accent1, 
                                        fontSize: '0.8rem',
                                        mb: 0.7,
                                        pb: 0.3,
                                        borderBottom: `2px solid ${colors.accent1}30`
                                      }}>
                                        📚 {subject.name}
                                      </Typography>
                                      {/* Blöcke */}
                                      {blocks
                                        .filter(block => block.subjectId === subject.id && (blockAssignments[block.id] || []).includes(gruppe.id))
                                        .map(block => (
                                          <Box key={block.id} sx={{ ml: 2, mb: 0.7 }}>
                                            <Typography variant="body2" sx={{ 
                                              color: colors.primary, 
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 0.5
                                            }}>
                                              📦 {block.name}
                                            </Typography>
                                            {/* Units */}
                                            {units
                                              .filter(unit => unit.blockId === block.id && (unitAssignments[unit.id] || []).includes(gruppe.id))
                                              .map(unit => (
                                                <Box key={unit.id} sx={{ ml: 2, mb: 0.7 }}>
                                                  <Typography variant="body2" sx={{ 
                                                    color: colors.secondary, 
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5
                                                  }}>
                                                    📋 {unit.name}
                                                  </Typography>
                                                  {/* Themen */}
                                                  {topics
                                                    .filter(topic => topic.unitId === unit.id && (topicAssignments[topic.id] || []).includes(gruppe.id))
                                                    .map(topic => (
                                                      <Box key={topic.id} sx={{ ml: 2, mb: 0.7 }}>
                                                        <Typography variant="body2" sx={{ 
                                                          color: colors.accent2, 
                                                          fontSize: '0.75rem',
                                                          fontWeight: 600,
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          gap: 0.5
                                                        }}>
                                                          💡 {topic.name}
                                                        </Typography>
                                                        {/* Stunden */}
                                                        {lessons
                                                          .filter(lesson => lesson.topicId === topic.id && (lessonAssignments[lesson.id] || []).includes(gruppe.id))
                                                          .map(lesson => (
                                                            <Box key={lesson.id} sx={{ 
                                                              ml: 2, 
                                                              display: 'flex', 
                                                              alignItems: 'center', 
                                                              gap: '6px',
                                                              p: 0.5,
                                                              borderRadius: 1,
                                                              bgcolor: (materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? '#f0f8ff' : 'transparent',
                                                              transition: 'all 0.2s ease',
                                                              '&:hover': {
                                                                bgcolor: (materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? '#e3f2fd' : 'transparent'
                                                              }
                                                            }}>
                                                              <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                  color: colors.textSecondary,
                                                                  cursor: (materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? 'pointer' : 'default',
                                                                  fontSize: '0.75rem',
                                                                  fontWeight: 500,
                                                                  '&:hover': {
                                                                    color: (materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? colors.primary : colors.textSecondary
                                                                  }
                                                                }}
                                                                onClick={e => {
                                                                  e.stopPropagation();
                                                                  if ((materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id]) {
                                                                    openLessonContent(lesson.id, lesson.name);
                                                                  }
                                                                }}
                                                                title={(materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? "Material/Quiz öffnen" : ""}
                                                              >
                                                                📖 {lesson.name}
                                                              </Typography>
                                                              {((materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id]) && (
                                                                <span 
                                                                  style={{ 
                                                                    color: colors.secondary, 
                                                                    fontSize: '0.8em', 
                                                                    cursor: 'pointer',
                                                                    marginLeft: '4px',
                                                                    transition: 'all 0.2s ease'
                                                                  }}
                                                                  onClick={e => {
                                                                    e.stopPropagation();
                                                                    openLessonContent(lesson.id, lesson.name);
                                                                  }}
                                                                  title="Material/Quiz öffnen"
                                                                >
                                                                  {quizzesMap[lesson.id] ? '🧩' : '📄'}
                                                                </span>
                                                              )}
                                                            </Box>
                                                          ))}
                                                      </Box>
                                                    ))}
                                                </Box>
                                              ))}
                                          </Box>
                                        ))}
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Grid>

      </Grid>

      {/* Quiz Results Modal */}
      <QuizResultsModal
        open={showQuizResults}
        onClose={() => setShowQuizResults(false)}
        results={quizResults}
      />

      {/* Emoji Selector Modal */}
      <EmojiSelector
        open={showEmojiSelector}
        onClose={handleCloseEmojiSelector}
        onSelect={handleEmojiSelect}
        currentEmoji={selectedEmoji}
      />

      {/* Flashcard Learning Modal */}
      {/* Inbox Modal */}
      <InboxModal
        open={showInbox}
        onClose={() => {
          setShowInbox(false);
          // Lade unreadCount neu wenn Modal geschlossen wird
          const loadUnreadCount = async () => {
            try {
              const loginCode = localStorage.getItem('loginCode') || '';
              const response = await fetch('/api/messages/unread-count', {
                headers: {
                  'Content-Type': 'application/json',
                  'x-login-code': loginCode
                }
              });
              if (response.ok) {
                const data = await response.json();
                setUnreadMessageCount(data.unreadCount || 0);
              }
            } catch (error) {
              console.error('Fehler:', error);
            }
          };
          loadUnreadCount();
        }}
      />

      <FlashcardLearningModal
        open={flashcardLearningOpen}
        onClose={() => setFlashcardLearningOpen(false)}
        studentId={userId}
        onSessionEnded={() => setJourneyRefreshKey((k) => k + 1)}
      />
      
      {/* Kommentar-Modal */}
      <Dialog
        open={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            animation: commentModalOpen ? 'fadeInScale 0.3s ease-out' : 'none',
            '@keyframes fadeInScale': {
              '0%': {
                opacity: 0,
                transform: 'scale(0.9) translateY(-20px)'
              },
              '100%': {
                opacity: 1,
                transform: 'scale(1) translateY(0)'
              }
            }
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#FF9800',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
          px: 2
        }}>
          <Box sx={{ fontSize: 24 }}>💬</Box>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            Kommentar
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2.5 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.7,
              fontSize: '0.95rem',
              color: '#333',
              minHeight: '60px'
            }}
          >
            {selectedComment || 'Kein Kommentar vorhanden'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, pt: 1 }}>
          <Button
            onClick={() => setCommentModalOpen(false)}
            variant="contained"
            sx={{
              bgcolor: '#FF9800',
              color: '#fff',
              '&:hover': {
                bgcolor: '#F57C00'
              },
              textTransform: 'none',
              fontWeight: 500,
              px: 3
            }}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Karnevals-Minigames Modal */}
      <Dialog
        open={showCarnivalGames}
        onClose={() => setShowCarnivalGames(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #FF1493 0%, #FF69B4 50%, #FFB6C1 100%)',
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'transparent',
          color: 'white',
          py: 1.5,
          px: 2,
          ...dialogCloseTitleSx,
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.4rem', textAlign: 'center', width: '100%' }}>
            🎭 Karnevals-Minigames 🎪
          </Typography>
          <DialogCloseIconButton
            onClose={() => setShowCarnivalGames(false)}
            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
            iconSx={{ color: 'white' }}
          />
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2, px: 3 }}>
          <Grid container spacing={2}>
            {/* Konfetti-Wurf */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 2,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowConfettiGame(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎊
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Konfetti-Wurf
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Klicke so schnell wie möglich auf die Konfetti-Partikel!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Masken-Memory */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 2,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowMaskMemory(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎭
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Masken-Memory
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Finde die passenden Masken-Paare!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Narren-Quiz */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 2,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowFoolQuiz(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🤡
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Narren-Quiz
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Beantworte lustige Karnevals-Fragen!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Karnevals-Würfel */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 2,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowCarnivalDice(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎲
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Karnevals-Würfel
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Würfle und gewinne tolle Preise!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
          <Button 
            onClick={() => setShowCarnivalGames(false)} 
            variant="contained" 
            size="small"
            sx={{
              bgcolor: 'white',
              color: '#FF1493',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#f5f5f5',
              }
            }}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Konfetti-Wurf Game */}
      <ConfettiGameModal 
        open={showConfettiGame} 
        onClose={() => setShowConfettiGame(false)} 
      />

      {/* Masken-Memory Game */}
      <MaskMemoryModal 
        open={showMaskMemory} 
        onClose={() => setShowMaskMemory(false)} 
      />

      {/* Narren-Quiz Game */}
      <FoolQuizModal 
        open={showFoolQuiz} 
        onClose={() => setShowFoolQuiz(false)} 
      />

      {/* Karnevals-Würfel Game */}
      <CarnivalDiceModal 
        open={showCarnivalDice} 
        onClose={() => setShowCarnivalDice(false)} 
      />

      {/* Submission Upload Modal für H__ Dateien */}
      {showSubmissionModal && selectedSubmissionFile && (
        <SubmissionUpload
          fileName={selectedSubmissionFile.name}
          filePath={selectedSubmissionFile.path}
          teacherId={selectedSubmissionFile.teacherId}
          studentId={userId}
          onUploadSuccess={() => setJourneyRefreshKey((k) => k + 1)}
          onViewFile={(item: any) => previewFile(item)}
          onClose={() => {
            setShowSubmissionModal(false);
            setSelectedSubmissionFile(null);
            // Aktualisiere Submission-Status nach dem Schließen
            if (selectedSubmissionFile.path) {
              checkSubmissionStatus(selectedSubmissionFile.path).then((hasSubmission: boolean) => {
                setSubmissionStatuses((prev: {[filePath: string]: boolean}) => ({
                  ...prev,
                  [selectedSubmissionFile.path]: hasSubmission
                }));
              });
            }
          }}
        />
      )}

      {/* Abgabestatistik Dialog */}
      <Dialog
        open={showSubmissionStats}
        onClose={() => setShowSubmissionStats(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', py: 1, ...dialogCloseTitleSx }}>
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
            📊 Deine Abgabestatistik
          </Typography>
          <DialogCloseIconButton onClose={() => setShowSubmissionStats(false)} />
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2 }}>
          <SubmissionStatistics userId={userId} submissionStats={submissionStats} setSubmissionStats={setSubmissionStats} />
        </DialogContent>
      </Dialog>

      {/* Rätseljahr 2026 Dialog */}
      <Dialog
        open={showNewYearRiddle}
        onClose={() => {
          setShowNewYearRiddle(false);
          setRiddleAnswer('');
          setRiddleSolved(false);
          setShowHint(false);
          setCurrentRiddle(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'transparent',
          color: 'white',
          py: 1.25,
          px: 2,
          minHeight: 44,
          ...dialogCloseTitleSx,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.2rem', textAlign: 'center', width: '100%' }}>
            🎊 Rätseljahr 2026 🎊
          </Typography>
          <DialogCloseIconButton
            onClose={() => {
              setShowNewYearRiddle(false);
              setRiddleAnswer('');
              setRiddleSolved(false);
              setShowHint(false);
            }}
            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
            iconSx={{ color: 'white' }}
          />
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'white', pt: 3, pb: 2, px: 2.5 }}>
          {currentRiddle && !riddleSolved ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2, mt: 1 }}>
                <Chip 
                  label={`#${currentRiddle.id}`} 
                  size="small" 
                  sx={{ 
                    bgcolor: '#667eea', 
                    color: 'white',
                    fontWeight: 600,
                    minWidth: 45,
                    height: 24
                  }} 
                />
                <Typography variant="h6" sx={{ color: '#333', fontWeight: 600, fontSize: '1.1rem' }}>
                  {currentRiddle.title}
                </Typography>
              </Box>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  mb: 2.5, 
                  bgcolor: '#f8f9fa',
                  borderRadius: 2,
                  border: '1.5px solid #e0e0e0'
                }}
              >
                <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#444' }}>
                  {currentRiddle.question}
                </Typography>
              </Paper>
              
              {showHint && (
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 1.5, 
                    mb: 2, 
                    bgcolor: '#fff3cd',
                    borderRadius: 2,
                    border: '1.5px solid #ffc107'
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#856404', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {currentRiddle.hint}
                  </Typography>
                </Paper>
              )}

              {attemptsLeft > 0 && (
                <Typography variant="body2" sx={{ mb: 1.5, color: '#666', textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Du hast noch {attemptsLeft} Versuch{attemptsLeft === 1 ? '' : 'e'} übrig
                </Typography>
              )}
              
              <TextField
                fullWidth
                label="Deine Antwort"
                value={riddleAnswer}
                onChange={(e) => setRiddleAnswer(e.target.value)}
                placeholder={currentRiddle.type === 'number' ? "Gib die Zahl ein..." : "Gib deine Antwort ein..."}
                variant="outlined"
                size="small"
                sx={{ mb: 2 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && currentRiddle) {
                    handleRiddleAnswer();
                  }
                }}
              />
              
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowHint(!showHint)}
                  size="small"
                  sx={{ 
                    borderColor: '#667eea',
                    color: '#667eea',
                    px: 2,
                    py: 0.75,
                    fontSize: '0.875rem',
                    '&:hover': { borderColor: '#764ba2', bgcolor: 'rgba(102, 126, 234, 0.1)' }
                  }}
                >
                  {showHint ? 'Tipp verstecken' : '💡 Tipp anzeigen'}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (!currentRiddle) return;
                    handleRiddleAnswer();
                  }}
                  size="small"
                  sx={{
                    bgcolor: '#667eea',
                    px: 2.5,
                    py: 0.75,
                    fontSize: '0.875rem',
                    '&:hover': { bgcolor: '#764ba2' }
                  }}
                >
                  Prüfen ✨
                </Button>
              </Box>
            </Box>
          ) : currentRiddle && riddleSolved ? (
              <Box sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" sx={{ mb: 2, color: '#667eea', fontWeight: 700, fontSize: '1.5rem' }}>
                🎉 Richtig! 🎉
              </Typography>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: '#e8f5e9',
                  borderRadius: 2,
                  border: '1.5px solid #4caf50'
                }}
              >
                <Typography variant="h6" sx={{ mb: 1.5, color: '#2e7d32', fontWeight: 600, fontSize: '1rem' }}>
                  Die Antwort ist {currentRiddle.answer}! 🎊
                </Typography>
                <Typography variant="body1" sx={{ mb: 1, color: '#1b5e20', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {currentRiddle.explanation}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1.5, color: '#2e7d32', fontWeight: 600, fontSize: '1rem' }}>
                  🎊 Alles Gute für 2026! 🎊
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#4caf50', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Möge das neue Jahr voller Erfolg, Spaß und vielen "Aha!"-Momenten sein! 🚀✨
                </Typography>
              </Paper>
              <Button
                variant="contained"
                onClick={() => {
                  setShowNewYearRiddle(false);
                  setRiddleAnswer('');
                  setRiddleSolved(false);
                  setShowHint(false);
                  setCurrentRiddle(null);
                }}
                size="small"
                sx={{
                  bgcolor: '#4caf50',
                  px: 2.5,
                  py: 0.75,
                  fontSize: '0.875rem',
                  '&:hover': { bgcolor: '#45a049' }
                }}
              >
                Schließen ✨
              </Button>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 10-Finger-Schreiben Minigame Modal */}
      <Dialog
        open={showMinigame}
        onClose={() => {
          // Erlaube Schließen wenn nicht gespielt wird oder Game Over/Gewinn
          if (!gameStarted || gameOver || gameWon) {
            setShowMinigame(false);
            setGameStarted(false);
            setBalloons([]);
            setScore(0);
            setGameTime(60);
            setNextKey('f');
            setGameOver(false);
            setGameWon(false);
          }
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'transparent',
          color: 'white',
          py: 1.25,
          px: 2,
          minHeight: 44,
          ...dialogCloseTitleSx,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.2rem', textAlign: 'center', width: '100%' }}>
            🎮 Minigame
          </Typography>
          <DialogCloseIconButton
            disabled={gameStarted && !gameOver && !gameWon}
            onClose={() => {
              if (!gameStarted || gameOver || gameWon) {
                setShowMinigame(false);
                setGameStarted(false);
                setBalloons([]);
                setScore(0);
                setGameTime(60);
                setNextKey('f');
                setGameOver(false);
                setGameWon(false);
                keysPressedRef.current.clear();
              }
            }}
            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
            iconSx={{ color: 'white' }}
          />
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'white', pt: 3, pb: 2, px: 2.5 }}>
          {gameWon ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" sx={{ mb: 2, color: '#4caf50', fontWeight: 700 }}>
                🏆🎉 GEWONNEN! 🎉🏆
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                Du hast die 1 Minute geschafft!
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: '#666' }}>
                Punkte: <strong style={{ fontSize: '1.2rem', color: '#FF9800' }}>{score}</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: '#999', fontSize: '0.85rem', mb: 2 }}>
                Du kannst das Spiel morgen wieder spielen.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  setShowMinigame(false);
                  setGameWon(false);
                  setGameStarted(false);
                  setBalloons([]);
                  setScore(0);
                  setGameTime(60);
                  setNextKey('f');
                  setGameOver(false);
                }}
                size="small"
                sx={{
                  bgcolor: '#4caf50',
                  px: 3,
                  py: 1,
                  fontSize: '0.9rem',
                  '&:hover': { bgcolor: '#45a049' }
                }}
              >
                Schließen ✨
              </Button>
            </Box>
          ) : gameOver ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h5" sx={{ mb: 2, color: '#d32f2f', fontWeight: 700 }}>
                💥 Game Over! 💥
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: '#666' }}>
                Ein Luftballon ist am Boden angekommen!
              </Typography>
              <Typography variant="body2" sx={{ color: '#999', fontSize: '0.85rem' }}>
                Du kannst das Spiel morgen wieder versuchen.
              </Typography>
            </Box>
          ) : !gameStarted ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 600 }}>
                🎈 Luftballons fangen! 🎈
              </Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ mb: 1.5, color: '#444', fontSize: '0.9rem' }}>
                  <strong>So funktioniert's:</strong>
                </Typography>
                {getMinigameDifficulty(userId) === 'easy' ? (
                  <>
                    <Typography variant="body2" sx={{ mb: 1, color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                      • Drücke <strong>F</strong> oder <strong>J</strong> kurz, um die Luftballons zu fangen
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                      • Fange die Luftballons, die von oben fallen
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ mb: 1, color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                      • Für <strong>F</strong> Ballons: Drücke <strong>F</strong> kurz
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                      • Für <strong>J</strong> Ballons: Drücke <strong>J</strong> kurz
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                      • Für <strong>D</strong> Ballons: Halte <strong>F</strong> dauerhaft gedrückt
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                      • Für <strong>K</strong> Ballons: Halte <strong>J</strong> dauerhaft gedrückt
                    </Typography>
                  </>
                )}
                <Typography variant="body2" sx={{ mb: 1, color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                  • Schaffe es 1 Minute lang, ohne dass ein Luftballon den Boden erreicht
                </Typography>
                <Typography variant="body2" sx={{ color: '#d32f2f', fontSize: '0.85rem', textAlign: 'left', fontWeight: 600 }}>
                  • ⚠️ Wenn ein Luftballon den Boden erreicht, ist das Spiel vorbei!
                </Typography>
                <Typography variant="body2" sx={{ color: '#4caf50', fontSize: '0.85rem', textAlign: 'left', fontWeight: 600, mt: 1 }}>
                  • 🏆 Die Ballons werden mit der Zeit immer schneller!
                </Typography>
                {getMinigameDifficulty(userId) === 'hard' && (
                  <Typography variant="body2" sx={{ color: '#FF9800', fontSize: '0.85rem', textAlign: 'left', fontWeight: 600, mt: 1 }}>
                    • 🔥 Schwerer Modus aktiviert! (Nach 3 Spielen)
                  </Typography>
                )}
              </Paper>
              <Box sx={{ mb: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600, color: '#1976d2' }}>
                  Korrekte Fingerhaltung:
                  {getMinigameDifficulty(userId) === 'hard' && (
                    <span style={{ color: '#FF9800', marginLeft: '8px' }}>🔊 Schwerer Modus</span>
                  )}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Box sx={{ 
                    bgcolor: 'white', 
                    borderRadius: 2, 
                    p: 2, 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    maxWidth: 600,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <img 
                      src={`/api/file-system-paths/static/${encodeURIComponent('J-M-Reihen/Grafiken/10 Finger.webp')}`}
                      alt="10-Finger-Schreibsystem" 
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '8px'
                      }}
                      onError={(e) => {
                        console.error('Failed to load image:', e);
                      }}
                    />
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Die Zeigefinger liegen auf F und J (mit den kleinen Erhebungen auf der Tastatur)
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => {
                  const dateKey = getDateKey();
                  localStorage.setItem(`minigame_played_${userId}_${dateKey}`, 'true');
                  const difficulty = getMinigameDifficulty(userId);
                  setGameStarted(true);
                  setGameTime(60);
                  setScore(0);
                  setBalloons([]);
                  setNextKey(Math.random() > 0.5 ? 'f' : 'j');
                  setAnimationFrame(0);
                  setGameOver(false);
                  setGameWon(false);
                  // Im Hard-Modus: Zu Beginn pausieren und Meldung anzeigen
                  if (difficulty === 'hard') {
                    setGamePaused(true);
                    gamePausedRef.current = true;
                    setHoldMessage('Halte die F Taste dauerhaft gedrückt');
                  } else {
                    setGamePaused(false);
                    gamePausedRef.current = false;
                    setHoldMessage('');
                  }
                  setStartTime(Date.now());
                }}
                size="small"
                sx={{
                  bgcolor: '#FF9800',
                  px: 3,
                  py: 1,
                  fontSize: '0.9rem',
                  '&:hover': { bgcolor: '#F57C00' }
                }}
              >
                Spiel starten! 🚀
              </Button>
            </Box>
          ) : (
            <Box>
              {/* Spiel-Info */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Zeit: <strong>{gameTime}s</strong>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Punkte: <strong>{score}</strong>
                  </Typography>
                </Box>
              </Box>
              
              {/* Spiel-Bereich */}
              <Box
                sx={{
                  position: 'relative',
                  height: 400,
                  background: `
                    linear-gradient(180deg, 
                      #87CEEB 0%, 
                      #5B9BD5 8%,
                      #4682B4 15%,
                      #20B2AA 25%,
                      #32CD32 35%,
                      #9ACD32 45%,
                      #FFD700 55%,
                      #FFA500 65%,
                      #8B4513 75%,
                      #654321 85%,
                      #2F4F2F 95%,
                      #1C1C1C 100%
                    )
                  `,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '3px solid #1976d2',
                  mb: 2,
                  boxShadow: 'inset 0 0 80px rgba(255,255,255,0.15), 0 4px 20px rgba(0,0,0,0.3)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
                      radial-gradient(ellipse 80% 50% at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%),
                      radial-gradient(ellipse 60% 40% at 70% 15%, rgba(255,220,100,0.3) 0%, transparent 45%),
                      radial-gradient(circle at 50% 80%, rgba(34,139,34,0.2) 0%, transparent 60%),
                      repeating-linear-gradient(
                        90deg,
                        transparent,
                        transparent 2px,
                        rgba(255,255,255,0.03) 2px,
                        rgba(255,255,255,0.03) 4px
                      )
                    `,
                    pointerEvents: 'none'
                  },
                  '&::after': {
                    content: '"🌲 🌳 🌴 🌿 🍃 🌲 🌳 🌴 🌿 🍃 🌲 🌳 🌴 🌿 🍃 🌲 🌳 🌴 🌿 🍃"',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    fontSize: '2rem',
                    textAlign: 'center',
                    opacity: 0.7,
                    pointerEvents: 'none',
                    lineHeight: 1.2,
                    background: 'linear-gradient(180deg, transparent 0%, rgba(46,125,50,0.3) 100%)',
                    paddingTop: '0.5rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    width: '100%'
                  }
                }}
                id="game-area"
              >
                {/* Große Meldung für D/K Ballons */}
                {holdMessage && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1000,
                      bgcolor: 'rgba(255, 152, 0, 0.95)',
                      color: 'white',
                      px: 4,
                      py: 2,
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      border: '4px solid white',
                      animation: 'pulse 1s infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
                        '50%': { transform: 'translate(-50%, -50%) scale(1.05)' }
                      },
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        textAlign: 'center',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                        fontSize: '2rem'
                      }}
                    >
                      {holdMessage}
                    </Typography>
                  </Box>
                )}
                {/* Luftballons */}
                {balloons.map((balloon) => {
                  const balloonAge = Date.now() - balloon.spawnTime;
                  const elapsedSeconds = (Date.now() - startTime) / 1000;
                  // Progressive Schwierigkeit: Fallgeschwindigkeit erhöht sich mit der Zeit
                  const baseSpeed = 12; // Langsamere Basis-Geschwindigkeit am Anfang
                  const speedMultiplier = 1 + (elapsedSeconds / 35) * 2; // Bis zu 3x schneller nach 35 Sekunden
                  const currentSpeed = baseSpeed / speedMultiplier;
                  const fallDistance = Math.min(balloonAge / currentSpeed, 360);
                  const isVisible = !balloon.caught && fallDistance < 360;
                  
                  if (!isVisible) return null;
                  
                  return (
                    <Box
                      key={balloon.id}
                      sx={{
                        position: 'absolute',
                        left: `${balloon.x}%`,
                        top: `${fallDistance}px`,
                        transition: balloon.caught ? 'all 0.3s ease' : 'none',
                        transform: balloon.caught ? 'scale(0) rotate(360deg)' : 'scale(1)',
                        zIndex: 10,
                        animation: balloon.caught ? 'none' : 'float 2s ease-in-out infinite',
                        '@keyframes float': {
                          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
                          '25%': { transform: 'translateY(-5px) translateX(5px)' },
                          '50%': { transform: 'translateY(-10px) translateX(0px)' },
                          '75%': { transform: 'translateY(-5px) translateX(-5px)' }
                        },
                        pointerEvents: 'none',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 80,
                        height: 80,
                        marginLeft: '-40px' // Zentrieren basierend auf Breite
                      }}
                    >
                      {/* Luftballon mit Buchstabe */}
                      <Box sx={{ 
                        fontSize: '5rem',
                        lineHeight: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                      }}>
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          🎈
                          <Typography sx={{
                            fontSize: '2.2rem',
                            fontWeight: 900,
                            color: '#1565C0',
                            textShadow: '3px 3px 6px rgba(0,0,0,0.4), -2px -2px 4px rgba(255,255,255,0.8)',
                            position: 'absolute',
                            top: '45%',
                            left: '48%',
                            transform: 'translate(-50%, -55%)',
                            pointerEvents: 'none',
                            fontFamily: '"Courier New", "Roboto Mono", monospace',
                            letterSpacing: '0.1em',
                            lineHeight: 1,
                            textAlign: 'center',
                            width: '1.2em',
                            height: '1.2em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {balloon.key.toUpperCase()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        {gameStarted && (
          <DialogActions sx={{ px: 2, py: 1, bgcolor: '#f5f5f5' }}>
              <Button
                onClick={() => {
                  setGameStarted(false);
                  setBalloons([]);
                  setScore(0);
                  setGameTime(60);
                  setNextKey('f');
                  setGameOver(false);
                  const dateKey = getDateKey();
                  localStorage.setItem(`minigame_played_${userId}_${dateKey}`, 'true');
                }}
                size="small"
              >
                Beenden
              </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
};

// ===== FLASHCARD LEARNING MODAL KOMPONENTE =====

interface FlashcardLearningModalProps {
  open: boolean;
  onClose: () => void;
  studentId?: string;
  isTeacher?: boolean;
  teacherDeck?: any; // Deck für Lehrer-Modus
  teacherId?: string; // Lehrer-ID für Export
  onSessionEnded?: () => void;
}

export const FlashcardLearningModal: React.FC<FlashcardLearningModalProps> = ({
  open,
  onClose,
  studentId,
  isTeacher = false,
  teacherDeck,
  teacherId,
  onSessionEnded,
}) => {
  const [assignedDecks, setAssignedDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<any>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [learningMode, setLearningMode] = useState<'selection' | 'learning' | 'viewing'>('selection');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cardsReviewed: 0,
    correctAnswers: 0,
    incorrectAnswers: 0
  });
  const [helpAnchorEl, setHelpAnchorEl] = useState<HTMLElement | null>(null);
  // Für Lehrer: Track welche Karten bereits gelernt wurden
  const [teacherLearnedCards, setTeacherLearnedCards] = useState<Set<string>>(new Set());

  // Export-Funktionen für Lern-Fortschritt (Schüler) oder Deck-Daten (Lehrer)
  const exportLearningProgress = async (format: 'json' | 'csv', deckId?: string) => {
    try {
      const params = new URLSearchParams({
        format,
        ...(deckId && { deckId })
      });
      
      let response: Response;
      let filenamePrefix: string;
      
      if (isTeacher && teacherId) {
        // Lehrer-Export: Deck-Daten
        response = await fetch(`/api/flashcards/teacher/${teacherId}/export?${params}`);
        filenamePrefix = `flashcard-decks-${deckId ? 'deck-' + deckId : 'all'}`;
      } else if (studentId) {
        // Schüler-Export: Lern-Fortschritt
        response = await fetch(`/api/flashcards/student/${studentId}/export?${params}`);
        filenamePrefix = `learning-progress-${deckId ? 'deck-' + deckId : 'all'}`;
      } else {
        alert('Export nicht verfügbar: Keine Benutzer-ID gefunden.');
        return;
      }
      
      if (response.ok) {
        if (format === 'csv') {
          // CSV-Download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } else {
          // JSON-Download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('Export fehlgeschlagen:', response.statusText, errorData);
        alert(`Export fehlgeschlagen: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      alert(`Fehler beim Exportieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // Tastatur-Shortcuts für Bewertungen
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Leertaste zum Umdrehen der Karte (funktioniert in beiden Modi)
      if (event.key === ' ') {
        event.preventDefault();
        setShowAnswer(!showAnswer);
        return;
      }
      
      if (learningMode === 'learning' && showAnswer) {
        // Bewertungen nur im Lern-Modus (5-Stufen-System) - umgedreht für bessere UX
        switch (event.key) {
          case '1':
            handleNextCard(5); // Taste 1 = Beste Bewertung (5)
            break;
          case '2':
            handleNextCard(4); // Taste 2 = Gute Bewertung (4)
            break;
          case '3':
            handleNextCard(3); // Taste 3 = Mittelmäßige Bewertung (3)
            break;
          case '4':
            handleNextCard(2); // Taste 4 = Schlechte Bewertung (2)
            break;
          case '5':
            handleNextCard(1); // Taste 5 = Schlechteste Bewertung (1)
            break;
        }
      } else if (learningMode === 'viewing') {
        // Pfeiltasten für Navigation im Ansehen-Modus
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
            setShowAnswer(false); // Karte zurücksetzen
            break;
          case 'ArrowRight':
            event.preventDefault();
            setCurrentCardIndex(Math.min(selectedDeck?.cards?.length - 1 || 0, currentCardIndex + 1));
            setShowAnswer(false); // Karte zurücksetzen
            break;
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [open, learningMode, showAnswer]);

  // Funktion zum Formatieren von Karten-Text (Bold und Italic)
  const formatCardText = (text: string) => {
    if (!text) return '';
    
    // **text** wird zu <strong>text</strong> (nur der Text zwischen **)
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // *text* wird zu <em>text</em> (aber nur wenn es nicht bereits bold ist)
    formattedText = formattedText.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    
    return formattedText;
  };

  // Lade zugewiesene Karteikarten beim Öffnen
  useEffect(() => {
    if (open) {
      if (isTeacher && teacherDeck) {
        // Lehrer-Modus: Deck als Array formatieren, wie bei Schülern
        // Berücksichtige bereits gelernte Karten
        const totalCards = teacherDeck.cards?.length || 0;
        const unlearnedCards = teacherDeck.cards?.filter((card: any) => !teacherLearnedCards.has(card.id)) || [];
        const dueCardsCount = unlearnedCards.length;
        
        const formattedDeck = {
          ...teacherDeck,
          totalCards: totalCards,
          dueCards: dueCardsCount, // Nur nicht gelernte Karten sind fällig
          completedCards: 0,
          progressPercentage: 0,
          qualityStats: { perfect: 0, partial: 0, notKnown: 0 },
          levelStats: { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
          dueCardsByDate: { today: dueCardsCount, tomorrow: 0, thisWeek: 0, later: 0 },
          reviewStats: { totalReviews: 0, avgReviewCount: 0, lastReviewDate: '-' }
        };
        setAssignedDecks([formattedDeck]);
        setLearningMode('selection');
        setSelectedDeck(null);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setLoading(false);
      } else if (studentId) {
        // Schüler-Modus: Decks laden
        fetchAssignedDecks();
      }
    } else {
      // Reset beim Schließen
      setSelectedDeck(null);
      setLearningMode('selection');
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setAssignedDecks([]);
    }
  }, [open, isTeacher, teacherDeck, studentId, teacherLearnedCards]);

  const fetchAssignedDecks = async () => {
    if (!studentId || isTeacher) return; // Nur für Schüler
    try {
      setLoading(true);
      const response = await fetch(`/api/flashcards/student/${studentId}/assigned`);
      if (response.ok) {
        const data = await response.json();
        const decks = data.decks || [];
        
        // Lade den Fortschritt für jedes Deck
        const decksWithProgress = await Promise.all(
          decks.map(async (deck: any) => {
            try {
              // Verwende den korrekten API-Endpoint für den Fortschritt
              const progressResponse = await fetch(`/api/flashcards/student/${studentId}/progress`);
              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                
                // Extrahiere das progress Array aus der Antwort
                let progressArray = [];
                if (progressData && progressData.progress && Array.isArray(progressData.progress)) {
                  progressArray = progressData.progress;
                } else if (Array.isArray(progressData)) {
                  progressArray = progressData;
                } else {
                  console.warn('Progress data is not an array:', progressData);
                  progressArray = [];
                }
                
                // Filtere den Fortschritt für dieses spezifische Deck
                const deckProgress = progressArray.filter((item: any) => 
                  item.card && item.card.deckId === deck.id
                );
                
                // Berechne detaillierte Statistiken
                const totalCards = deck.cards?.length || 0;
                
                // Bewertungs-Statistiken für 5-Stufen-System
                const qualityStats = {
                  perfect: deckProgress.filter((item: any) => item.quality === 4 || item.quality === 5).length, // Gut/Sehr gut
                  partial: deckProgress.filter((item: any) => item.quality === 3).length, // Mittelmäßig
                  notKnown: deckProgress.filter((item: any) => item.quality === 1 || item.quality === 2).length // Sehr schlecht/Schlecht
                };
                
                // Level-Statistiken
                const levelStats = {
                  level0: deckProgress.filter((item: any) => item.level === 0).length,
                  level1: deckProgress.filter((item: any) => item.level === 1).length,
                  level2: deckProgress.filter((item: any) => item.level === 2).length,
                  level3: deckProgress.filter((item: any) => item.level === 3).length,
                  level4: deckProgress.filter((item: any) => item.level === 4).length,
                  level5: deckProgress.filter((item: any) => item.level === 5).length
                };
                
                // Fällige Karten nach Datum gruppiert
                const now = new Date();
                console.log('Debug - Current time:', now.toISOString());
                
                const dueCardsByDate = {
                  today: deckProgress.filter((item: any) => {
                    if (!item.nextReview) return true;
                    // nextReview kann ein ISO-Datums-String oder Millisekunden-Timestamp sein
                    let reviewDate: Date;
                    if (typeof item.nextReview === 'number') {
                      // Wenn es ein Millisekunden-Timestamp ist
                      reviewDate = new Date(item.nextReview);
                    } else {
                      // Wenn es ein ISO-String ist
                      reviewDate = new Date(item.nextReview);
                    }
                    
                    // Setze beide Daten auf Mitternacht für korrekten Vergleich
                    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isDue = reviewDateMidnight <= nowMidnight;
                    
                    console.log(`Debug - Card ${item.cardId}: nextReview=${item.nextReview}, reviewDate=${reviewDate.toISOString()}, isDue=${isDue}`);
                    return isDue;
                  }).length,
                  tomorrow: deckProgress.filter((item: any) => {
                    if (!item.nextReview) return false;
                    let reviewDate: Date;
                    if (typeof item.nextReview === 'number') {
                      reviewDate = new Date(item.nextReview);
                    } else {
                      reviewDate = new Date(item.nextReview);
                    }
                    
                    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(0, 0, 0, 0);
                    return reviewDateMidnight > now && reviewDateMidnight <= tomorrow;
                  }).length,
                  thisWeek: deckProgress.filter((item: any) => {
                    if (!item.nextReview) return false;
                    let reviewDate: Date;
                    if (typeof item.nextReview === 'number') {
                      reviewDate = new Date(item.nextReview);
                    } else {
                      reviewDate = new Date(item.nextReview);
                    }
                    
                    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                    const weekEnd = new Date(now);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    weekEnd.setHours(0, 0, 0, 0);
                    return reviewDateMidnight > now && reviewDateMidnight <= weekEnd;
                  }).length,
                  later: deckProgress.filter((item: any) => {
                    if (!item.nextReview) return false;
                    let reviewDate: Date;
                    if (typeof item.nextReview === 'number') {
                      reviewDate = new Date(item.nextReview);
                    } else {
                      reviewDate = new Date(item.nextReview);
                    }
                    
                    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                    const weekEnd = new Date(now);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    weekEnd.setHours(0, 0, 0, 0);
                    return reviewDateMidnight > weekEnd;
                  }).length
                };
                
                console.log('Debug - dueCardsByDate:', dueCardsByDate);
                
                // Berechne fällige Karten: 
                // 1. Gelernte Karten die fällig sind (mit Qualitätsbewertung)
                // 2. Karten ohne Qualitätsbewertung (müssen noch bewertet werden)
                const learnedCardsDue = dueCardsByDate.today;
                const cardsWithoutQuality = deckProgress.filter((item: any) => item.quality === null || item.quality === undefined).length;
                const unlearnedCards = (deck.cards?.length || 0) - deckProgress.length;
                const dueCards = learnedCardsDue + cardsWithoutQuality + unlearnedCards;
                
                const completedCards = deckProgress.filter((item: any) => 
                  item.level >= 3 && item.quality !== null && item.quality !== undefined
                ).length;
                
                // Review-Statistiken
                const reviewStats = {
                  totalReviews: deckProgress.reduce((sum: number, item: any) => sum + (item.reviewCount || 0), 0),
                  avgReviewCount: deckProgress.length > 0 ? Math.round(deckProgress.reduce((sum: number, item: any) => sum + (item.reviewCount || 0), 0) / deckProgress.length) : 0,
                  lastReviewDate: deckProgress.length > 0 ? new Date(Math.max(...deckProgress.map((item: any) => {
                    if (typeof item.lastReviewed === 'number') {
                      return item.lastReviewed;
                    } else {
                      return new Date(item.lastReviewed).getTime();
                    }
                  }))).toLocaleDateString('de-DE') : '-'
                };
                
                return {
                  ...deck,
                  totalCards,
                  dueCards: dueCards, // Verwende nur die tatsächlich fälligen Karten
                  completedCards,
                  progressPercentage: totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0,
                  qualityStats,
                  levelStats,
                  dueCardsByDate,
                  reviewStats
                };
              }
              return {
                ...deck,
                totalCards: deck.cards?.length || 0,
                dueCards: deck.cards?.length || 0, // Alle Karten sind fällig, wenn kein Fortschritt
                completedCards: 0,
                progressPercentage: 0,
                dueCardsByDate: {
                  today: deck.cards?.length || 0, // Alle Karten sind heute fällig
                  tomorrow: 0,
                  thisWeek: 0,
                  later: 0
                },
                qualityStats: { perfect: 0, partial: 0, notKnown: 0 },
                levelStats: { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
                reviewStats: { totalReviews: 0, avgReviewCount: 0, lastReviewDate: '-' }
              };
            } catch (error) {
              console.error(`Error loading progress for deck ${deck.id}:`, error);
              return {
                ...deck,
                totalCards: deck.cards?.length || 0,
                dueCards: deck.cards?.length || 0,
                completedCards: 0,
                progressPercentage: 0
              };
            }
          })
        );
        
        setAssignedDecks(decksWithProgress);
      }
    } catch (error) {
      console.error('Error fetching assigned decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLearningSession = async (deck: any) => {
    // Lehrer-Modus: Gleiche Logik wie Schüler
    if (isTeacher) {
      // Filtere nicht gelernte Karten für Lehrer
      const allCards = deck.cards || [];
      const unlearnedCards = allCards.filter((card: any) => !teacherLearnedCards.has(card.id));
      const dueCardsCount = unlearnedCards.length;
      
      const deckWithCards = {
        ...deck,
        cards: unlearnedCards.length > 0 ? unlearnedCards : allCards, // Wenn alle gelernt, zeige alle im viewing-Modus
        totalCards: allCards.length,
        dueCards: dueCardsCount
      };
      
      setSelectedDeck(deckWithCards);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setSessionStats({
        cardsReviewed: 0,
        correctAnswers: 0,
        incorrectAnswers: 0
      });
      
      // Bestimme den Modus basierend auf fälligen Karten (genau wie bei Schülern)
      if (dueCardsCount > 0) {
        setLearningMode('learning');
      } else {
        setLearningMode('viewing');
      }
      return;
    }
    try {
      // Lade den aktuellen Fortschritt für das Deck
      const progressResponse = await fetch(`/api/flashcards/student/${studentId}/progress`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        
        // progressData ist ein Objekt mit progress-Property, nicht ein Array
        const progressArray = progressData.progress || [];
        console.log('DEBUG - progressData:', progressData, 'progressArray:', progressArray);
        
        // Filtere den Fortschritt für dieses spezifische Deck
        const deckProgress = progressArray.filter((item: any) => 
          item.card && item.card.deckId === deck.id
        );
        
        // Erstelle eine Map für schnellen Zugriff auf den Fortschritt
        const progressMap = new Map();
        deckProgress.forEach((item: any) => {
          progressMap.set(item.cardId, item);
        });
        
        // Filtere Karten basierend auf Fortschritt - GLEICHE LOGIK WIE IM DASHBOARD
        let cardsToLearn = deck.cards || [];
        
        if (deck.dueCards > 0) {
          // Verwende die gleiche Logik wie im Dashboard
          const now = new Date();
          
          // 1. Gelernte Karten die fällig sind (mit Qualitätsbewertung)
          const learnedCardsDue = deck.cards.filter((card: any) => {
            const progress = progressMap.get(card.id);
            if (!progress || !progress.nextReview) return false;
            
            let reviewDate: Date;
            if (typeof progress.nextReview === 'number') {
              reviewDate = new Date(progress.nextReview);
            } else {
              reviewDate = new Date(progress.nextReview);
            }
            
            // Setze beide Daten auf Mitternacht für korrekten Vergleich
            const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
            const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            return reviewDateMidnight <= nowMidnight;
          });
          
          // 2. Karten ohne Qualitätsbewertung (müssen noch bewertet werden)
          const cardsWithoutQuality = deck.cards.filter((card: any) => {
            const progress = progressMap.get(card.id);
            return progress && (progress.quality === null || progress.quality === undefined);
          });
          
          // 3. Ungelernte Karten (kein Fortschritt)
          const unlearnedCards = deck.cards.filter((card: any) => !progressMap.has(card.id));
          
          // Kombiniere alle fälligen Karten
          cardsToLearn = [...learnedCardsDue, ...cardsWithoutQuality, ...unlearnedCards];
          
          console.log(`DEBUG - Filtered cards: ${cardsToLearn.length} of ${deck.cards.length} are due`);
          console.log(`DEBUG - Breakdown: ${learnedCardsDue.length} learned due, ${cardsWithoutQuality.length} without quality, ${unlearnedCards.length} unlearned`);
        }
        
        // Erstelle eine Kopie des Decks mit den zu lernenden Karten
        const deckWithCards = {
          ...deck,
          cards: cardsToLearn,
          totalCards: deck.cards?.length || 0,
          dueCards: cardsToLearn.length // ← Verwende die tatsächlich gefilterten Karten
        };
        
        // Versuche den Session-Fortschritt wiederherzustellen
        const progressRestored = await restoreSessionProgress(deckWithCards);
        
        if (!progressRestored) {
          // Kein Fortschritt wiederhergestellt - starte von vorne
          setCurrentCardIndex(0);
          setSessionStats({
            cardsReviewed: 0,
            correctAnswers: 0,
            incorrectAnswers: 0
          });
        }
        
        setSelectedDeck(deckWithCards);
        setShowAnswer(false);
        
        // Debug: Was steht in deck.dueCards?
        console.log('DEBUG startLearningSession - deck.dueCards:', deck.dueCards, 'deck:', deck);
        
        // Bestimme den Modus basierend auf fälligen Karten
        if (deck.dueCards > 0) {
          setLearningMode('learning');
          // Starte Session nur für fällige Karten
          const sessionResponse = await fetch('/api/flashcards/student/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, deckId: deck.id })
          });
          
                  if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setSessionId(sessionData.session.id);
          // Session-Statistiken zurücksetzen
          setSessionStats({
            cardsReviewed: 0,
            correctAnswers: 0,
            incorrectAnswers: 0
          });
        }
        } else {
          setLearningMode('viewing'); // Neuer Ansehen-Modus
        }
      } else {
        // Fallback: Verwende alle Karten des Decks
        setSelectedDeck(deck);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setLearningMode('viewing'); // Ansehen-Modus als Fallback
      }
    } catch (error) {
      console.error('Error starting learning session:', error);
      // Fallback: Verwende alle Karten des Decks
      setSelectedDeck(deck);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setLearningMode('viewing'); // Ansehen-Modus als Fallback
    }
  };

  const updateCardProgress = async (quality: number) => {
    if (!selectedDeck) return;

    const currentCard = selectedDeck.cards[currentCardIndex];
    
    // Aktualisiere Session-Statistiken (für Lehrer und Schüler)
    setSessionStats(prev => ({
      cardsReviewed: prev.cardsReviewed + 1,
      correctAnswers: prev.correctAnswers + (quality >= 4 ? 1 : 0), // 4-5 = korrekt
      incorrectAnswers: prev.incorrectAnswers + (quality <= 2 ? 1 : 0) // 1-2 = inkorrekt
    }));

    // Für Lehrer: Track gelernte Karten lokal
    if (isTeacher) {
      setTeacherLearnedCards(prev => {
        const newLearnedCards = new Set([...prev, currentCard.id]);
        
        // Prüfe ob alle Karten gelernt wurden (nach dem Update)
        const allCardsLearned = selectedDeck.cards.every((card: any) => 
          newLearnedCards.has(card.id)
        );
        
        if (allCardsLearned) {
          // Alle Karten gelernt - wechsle zu viewing-Modus
          setTimeout(() => {
            setLearningMode('viewing');
            setCurrentCardIndex(0);
            setShowAnswer(false);
          }, 500); // Kurze Verzögerung für bessere UX
        }
        
        return newLearnedCards;
      });
      return; // Lehrer speichern keine Fortschritte in der DB
    }

    // Nur für Schüler: Fortschritt in der Datenbank speichern
    if (!studentId) {
      return;
    }
    
    try {
      const response = await fetch(`/api/flashcards/student/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId,
          cardId: currentCard.id,
          quality
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Card progress updated:', data);
        
        // Sofortige lokale Aktualisierung der Statistiken
        setAssignedDecks(prevDecks => 
          prevDecks.map(deck => {
            if (deck.id === selectedDeck.id) {
              // Aktualisiere die Statistiken für das aktuelle Deck
              const updatedDeck = { ...deck };
              
              // Initialisiere Statistiken falls sie nicht existieren
              if (!updatedDeck.qualityStats) {
                updatedDeck.qualityStats = { perfect: 0, partial: 0, notKnown: 0 };
              }
              if (!updatedDeck.levelStats) {
                updatedDeck.levelStats = { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };
              }
              if (!updatedDeck.dueCardsByDate) {
                updatedDeck.dueCardsByDate = { today: 0, tomorrow: 0, thisWeek: 0, later: 0 };
              }
              
              // Aktualisiere die Bewertungs-Statistiken für 5-Stufen-System
              if (quality === 1 || quality === 2) {
                updatedDeck.qualityStats.notKnown = (updatedDeck.qualityStats.notKnown || 0) + 1; // Sehr schlecht/Schlecht
              } else if (quality === 3) {
                updatedDeck.qualityStats.partial = (updatedDeck.qualityStats.partial || 0) + 1; // Mittelmäßig
              } else if (quality === 4 || quality === 5) {
                updatedDeck.qualityStats.perfect = (updatedDeck.qualityStats.perfect || 0) + 1; // Gut/Sehr gut = Perfekt
              }
              
              // Aktualisiere die Level-Statistiken (alle Karten sind auf Level 0)
              updatedDeck.levelStats.level0 = (updatedDeck.levelStats.level0 || 0) + 1;
              
              // Aktualisiere die fälligen Karten (alle werden für morgen geplant)
              updatedDeck.dueCardsByDate.tomorrow = (updatedDeck.dueCardsByDate.tomorrow || 0) + 1;
              
              console.log('Updated deck stats:', updatedDeck);
              return updatedDeck;
            }
            return deck;
          })
        );
        
        // Aktualisiere auch den Backend-Fortschritt
        await fetchAssignedDecks();
        
        // Force re-render der UI
        setAssignedDecks(prevDecks => [...prevDecks]);
      }
    } catch (error) {
      console.error('Error updating card progress:', error);
    }
  };

  const handleNextCard = (quality: number) => {
    console.log(`handleNextCard called with quality: ${quality}, currentCardIndex: ${currentCardIndex}, totalCards: ${selectedDeck?.cards?.length}`);
    
    updateCardProgress(quality);
    
    if (currentCardIndex < selectedDeck.cards.length - 1) {
      console.log('Moving to next card...');
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // Letzte Karte erreicht - Session beenden
      console.log('Letzte Karte erreicht, beende Session...');
      endLearningSession();
    }
  };

  const endLearningSession = async () => {
    const reviewedSnapshot = sessionStats.cardsReviewed;
    // Session beenden, auch wenn keine sessionId vorhanden ist
    try {
      if (sessionId) {
      await fetch('/api/flashcards/student/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          cardsReviewed: sessionStats.cardsReviewed,
          correctAnswers: sessionStats.correctAnswers,
          incorrectAnswers: sessionStats.incorrectAnswers
        })
      });
      }
    } catch (error) {
      console.error('Error ending learning session:', error);
    }

    if (!isTeacher && studentId && reviewedSnapshot > 0) {
      onSessionEnded?.();
    }

    // Lösche den gespeicherten Session-Fortschritt
    if (selectedDeck) {
      localStorage.removeItem(`flashcard_progress_${selectedDeck.id}_${studentId}`);
    }
    
    // Immer zur Deck-Auswahl zurückkehren
    setLearningMode('selection');
    setSelectedDeck(null);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionId(null);
    // Session-Statistiken zurücksetzen
    setSessionStats({
      cardsReviewed: 0,
      correctAnswers: 0,
      incorrectAnswers: 0
    });
  };

  const handleClose = () => {
    // Speichere den aktuellen Fortschritt bevor die Session beendet wird
    if (selectedDeck && currentCardIndex > 0) {
      saveSessionProgress();
    }
    
    if (sessionId) {
      endLearningSession();
    }
    onClose();
  };

  // Neue Funktion zum Speichern des Session-Fortschritts
  const saveSessionProgress = async () => {
    if (!selectedDeck) return;
    
    try {
      const progressData = {
        deckId: selectedDeck.id,
        studentId: studentId,
        currentCardIndex: currentCardIndex,
        cardsReviewed: sessionStats.cardsReviewed,
        timestamp: new Date().toISOString()
      };
      
      // Speichere in localStorage für lokale Wiederherstellung
      localStorage.setItem(`flashcard_progress_${selectedDeck.id}_${studentId}`, JSON.stringify(progressData));
      
      console.log('Session progress saved:', progressData);
    } catch (error) {
      console.error('Error saving session progress:', error);
    }
  };

  // Neue Funktion zum Wiederherstellen des Session-Fortschritts
  const restoreSessionProgress = async (deck: any) => {
    try {
      const savedProgress = localStorage.getItem(`flashcard_progress_${deck.id}_${studentId}`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        const isRecent = new Date(progress.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000); // Max 24h alt
        
        if (isRecent) {
          // Frage den Benutzer, ob er den Fortschritt wiederherstellen möchte
          if (window.confirm(`Du hattest eine unvollständige Lernsession für dieses Deck. Möchtest du bei Karte ${progress.currentCardIndex + 1} von ${deck.cards.length} weitermachen?`)) {
            setCurrentCardIndex(progress.currentCardIndex);
            setSessionStats({
              cardsReviewed: progress.cardsReviewed,
              correctAnswers: 0, // Reset für neue Session
              incorrectAnswers: 0
            });
            console.log('Session progress restored:', progress);
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error restoring session progress:', error);
      return false;
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bgcolor: 'rgba(0,0,0,0.8)',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onClick={handleClose}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
          borderRadius: 4,
          p: 2.5,
          width: '90%',
          height: '90%',
          maxWidth: '1000px',
          maxHeight: '800px',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 25px 70px rgba(255, 107, 53, 0.2)',
          border: '2px solid #ffb74d',
          backdropFilter: 'blur(10px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - kompakt */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 1.5,
          pb: 0.75,
          borderBottom: '1px solid #f0f0f0',
          position: 'relative',
          pr: 5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 'bold',
              color: '#2c3e50',
              mb: 0,
              fontSize: '1rem'
            }}>
              {learningMode === 'selection' ? '🗂️ Karteikarten lernen' : `📚 ${selectedDeck?.title || teacherDeck?.title || 'Karteikarten'}`}
            </Typography>
            {/* Hilfe-Icon für Hinweise */}
            {(learningMode === 'learning' || learningMode === 'viewing') && (
              <IconButton
                size="small"
                onClick={(e) => setHelpAnchorEl(e.currentTarget)}
                sx={{
                  width: 20,
                  height: 20,
                  color: '#6c757d',
                  '&:hover': {
                    color: '#495057',
                    bgcolor: '#f8f9fa'
                  }
                }}
              >
                <HelpIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
          
          {/* Header-Actions */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* Reset-Button für Lehrer - nur im Selection-Modus */}
            {isTeacher && learningMode === 'selection' && teacherLearnedCards.size > 0 && (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                sx={{ 
                  fontSize: '0.6rem', 
                  py: 0.3, 
                  px: 1,
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  minWidth: 'auto',
                  '&:hover': {
                    borderColor: '#f57c00',
                    color: '#f57c00',
                    bgcolor: '#fff3e0'
                  }
                }}
                onClick={() => {
                  setTeacherLearnedCards(new Set());
                  // Aktualisiere die Decks, um die fälligen Karten neu zu berechnen
                  if (teacherDeck) {
                    const totalCards = teacherDeck.cards?.length || 0;
                    const formattedDeck = {
                      ...teacherDeck,
                      totalCards: totalCards,
                      dueCards: totalCards,
                      completedCards: 0,
                      progressPercentage: 0,
                      qualityStats: { perfect: 0, partial: 0, notKnown: 0 },
                      levelStats: { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
                      dueCardsByDate: { today: totalCards, tomorrow: 0, thisWeek: 0, later: 0 },
                      reviewStats: { totalReviews: 0, avgReviewCount: 0, lastReviewDate: '-' }
                    };
                    setAssignedDecks([formattedDeck]);
                  }
                }}
              >
                🔄 Lernstand zurücksetzen
              </Button>
            )}
            {/* Session beenden Button - nur im Lern- oder Ansehen-Modus */}
            {(learningMode === 'learning' || learningMode === 'viewing') && (
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                sx={{ 
                  fontSize: '0.6rem', 
                  py: 0.3, 
                  px: 1,
                  borderColor: '#6c757d',
                  color: '#6c757d',
                  minWidth: 'auto',
                  '&:hover': {
                    borderColor: '#495057',
                    color: '#495057'
                  }
                }}
                onClick={endLearningSession}
              >
                🏁 Beenden
              </Button>
            )}
            {/* Export-Buttons nur im Selection-Modus */}
            {learningMode === 'selection' && (
              <>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => exportLearningProgress('json')}
                  sx={{
                    color: '#6c757d',
                    fontSize: '0.55rem',
                    py: 0.2,
                    px: 0.6,
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#495057',
                      bgcolor: '#f8f9fa'
                    }
                  }}
                >
                  📊
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => exportLearningProgress('csv')}
                  sx={{
                    color: '#6c757d',
                    fontSize: '0.55rem',
                    py: 0.2,
                    px: 0.6,
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#495057',
                      bgcolor: '#f8f9fa'
                    }
                  }}
                >
                  📈
                </Button>
              </>
            )}
          </Box>
          <DialogCloseIconButton
            onClose={handleClose}
            sx={{ color: '#6c757d', bgcolor: '#f8f9fa', '&:hover': { bgcolor: '#e9ecef' } }}
            iconSx={{ color: '#6c757d' }}
          />
        </Box>

        {learningMode === 'selection' ? (
          /* Deck-Auswahl */
          <Box>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : assignedDecks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  Keine Karteikarten zugewiesen
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {assignedDecks.map((deck) => (
                  <Grid item xs={12} sm={6} md={4} key={deck.id}>
                    <Card sx={{ 
                      cursor: 'pointer', 
                      transition: 'all 0.3s ease',
                      borderRadius: 4,
                      border: '2px solid #ffb74d',
                      background: 'linear-gradient(135deg, #fff 0%, #fff3e0 100%)',
                      boxShadow: '0 4px 20px rgba(255, 107, 53, 0.1)',
                      '&:hover': { 
                        transform: 'translateY(-2px) scale(1.01)',
                        boxShadow: '0 6px 15px rgba(255, 107, 53, 0.15)',
                        borderColor: '#ff6b35'
                      },
                      position: 'relative'
                    }}>
                      {/* Gesamtzahl der Karten oben rechts */}
                      <Box sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: '#f8f9fa',
                        borderRadius: 1,
                        px: 0.75,
                        py: 0.25
                      }}>
                        <Typography variant="caption" sx={{ 
                          color: '#6c757d',
                          fontSize: '0.65rem',
                          fontWeight: 600
                        }}>
                          {deck.totalCards || 0} Karten
                        </Typography>
                      </Box>
                      
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Box sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          bgcolor: '#ff6b35',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                          boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                        }}>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                            📚
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ 
                          mb: 1.5, 
                          fontWeight: 700,
                          color: '#2c3e50'
                        }}>
                          {deck.title}
                        </Typography>

                        {/* Detaillierte Statistiken - ausklappbar */}
                        <Accordion sx={{ mb: 1.5, boxShadow: 'none', '&:before': { display: 'none' } }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: '0.9rem' }} />} sx={{ minHeight: 32, py: 0 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d' }}>
                              📊 Details anzeigen
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                            {/* Bewertungs-Statistiken */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#6c757d', 
                                fontSize: '0.6rem', 
                                fontWeight: 600,
                                display: 'block',
                                mb: 0.5
                              }}>
                                📊 Bewertungen
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: '#d4edda',
                                  borderRadius: 0.5,
                                  border: '1px solid #c3e6cb'
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#155724', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.qualityStats?.perfect || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: '#155724', 
                                    fontSize: '0.5rem'
                                  }}>
                                    ✅ 4-5
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: '#fff3cd',
                                  borderRadius: 0.5,
                                  border: '1px solid #ffeaa7'
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#856404', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.qualityStats?.partial || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: '#856404', 
                                    fontSize: '0.5rem'
                                  }}>
                                    ℹ️ 3
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: '#f8d7da',
                                  borderRadius: 0.5,
                                  border: '1px solid #f5c6cb'
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#721c24', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.qualityStats?.notKnown || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: '#721c24', 
                                    fontSize: '0.5rem'
                                  }}>
                                    ❌ 1-2
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            
                            {/* Level-Statistiken */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#6c757d', 
                                fontSize: '0.6rem', 
                                fontWeight: 600,
                                display: 'block',
                                mb: 0.5
                              }}>
                                🎯 Level-Verteilung
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                                {[0, 1, 2, 3, 4, 5].map((level) => (
                                  <Box key={level} sx={{ 
                                    textAlign: 'center', 
                                    flex: 1,
                                    p: 0.5,
                                    bgcolor: level >= 3 ? '#d4edda' : '#e9ecef',
                                    borderRadius: 0.5,
                                    border: `1px solid ${level >= 3 ? '#c3e6cb' : '#dee2e6'}`
                                  }}>
                                    <Typography variant="caption" sx={{ 
                                      color: level >= 3 ? '#155724' : '#6c757d', 
                                      fontSize: '0.6rem', 
                                      fontWeight: 'bold',
                                      display: 'block'
                                    }}>
                                      {deck.levelStats?.[`level${level}`] || 0}
                                    </Typography>
                                    <Typography variant="caption" sx={{ 
                                      color: level >= 3 ? '#155724' : '#6c757d', 
                                      fontSize: '0.5rem'
                                    }}>
                                      L{level}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                            
                            {/* Fällige Karten nach Datum */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#6c757d', 
                                fontSize: '0.6rem', 
                                fontWeight: 600,
                                display: 'block',
                                mb: 0.5
                              }}>
                                📅 Nächste Reviews
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: deck.dueCardsByDate?.today > 0 ? '#fff3cd' : '#e9ecef',
                                  borderRadius: 0.5,
                                  border: `1px solid ${deck.dueCardsByDate?.today > 0 ? '#ffeaa7' : '#dee2e6'}`
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.today > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.dueCardsByDate?.today || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.today > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.5rem'
                                  }}>
                                    Heute
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: deck.dueCardsByDate?.tomorrow > 0 ? '#fff3cd' : '#e9ecef',
                                  borderRadius: 0.5,
                                  border: `1px solid ${deck.dueCardsByDate?.tomorrow > 0 ? '#ffeaa7' : '#dee2e6'}`
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.tomorrow > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.dueCardsByDate?.tomorrow || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.tomorrow > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.5rem'
                                  }}>
                                    Morgen
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: deck.dueCardsByDate?.thisWeek > 0 ? '#fff3cd' : '#e9ecef',
                                  borderRadius: 0.5,
                                  border: `1px solid ${deck.dueCardsByDate?.thisWeek > 0 ? '#ffeaa7' : '#dee2e6'}`
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.thisWeek > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.dueCardsByDate?.thisWeek || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.thisWeek > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.5rem'
                                  }}>
                                    Woche
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>

                            {/* Export-Buttons */}
                            <Box sx={{ 
                              mt: 1,
                              display: 'flex',
                              gap: 0.5,
                              justifyContent: 'center'
                            }}>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => exportLearningProgress('json', deck.id)}
                                sx={{
                                  color: '#6c757d',
                                  fontSize: '0.6rem',
                                  py: 0.25,
                                  px: 0.75,
                                  minWidth: 'auto',
                                  '&:hover': {
                                    color: '#495057',
                                    bgcolor: '#f8f9fa'
                                  }
                                }}
                              >
                                📊 JSON
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => exportLearningProgress('csv', deck.id)}
                                sx={{
                                  color: '#6c757d',
                                  fontSize: '0.6rem',
                                  py: 0.25,
                                  px: 0.75,
                                  minWidth: 'auto',
                                  '&:hover': {
                                    color: '#495057',
                                    bgcolor: '#f8f9fa'
                                  }
                                }}
                              >
                                📈 CSV
                              </Button>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{
                            bgcolor: '#ff6b35',
                            color: 'white',
                            fontWeight: 600,
                            py: 1,
                            borderRadius: 2,
                            fontSize: '0.8rem',
                            textTransform: 'none',
                            boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)',
                            '&:hover': {
                              bgcolor: '#e55a2b',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
                            }
                          }}
                          onClick={() => startLearningSession(deck)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              startLearningSession(deck);
                            }
                          }}
                        >
                          {deck.dueCards > 0 ? `📚 ${deck.dueCards} fällige Karten lernen` : '👁️ Karten ansehen'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        ) : (
          /* Lern-Modus */
          <Box sx={{ position: 'relative', minHeight: '400px' }}>
            {selectedDeck && selectedDeck.cards && selectedDeck.cards[currentCardIndex] && (
              <>
                {/* Fortschritt und Level - kompakt */}
                <Box sx={{ 
                  mb: 1, 
                  textAlign: 'center',
                  bgcolor: '#f8f9fa',
                  p: 0.75,
                  borderRadius: 1
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ 
                      color: '#2c3e50',
                      fontWeight: 600,
                      fontSize: '0.65rem'
                    }}>
                      {currentCardIndex + 1} / {selectedDeck.cards.length}
                    </Typography>
                    
                    {/* Level-Anzeige */}
                    {selectedDeck.cards[currentCardIndex].progress && (
                      <Chip 
                        label={`Level ${selectedDeck.cards[currentCardIndex].progress.level}`}
                        size="small"
                        sx={{ 
                          height: 20,
                          fontSize: '0.6rem',
                          bgcolor: '#e3f2fd',
                          color: '#1976d2',
                          border: '1px solid #bbdefb'
                        }}
                      />
                    )}
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={((currentCardIndex + 1) / selectedDeck.cards.length) * 100}
                    sx={determinateLinearProgressSx(
                      'linear-gradient(90deg, #ffab91 0%, #ff6b35 42%, #e65100 100%)',
                      { height: 10, barGlow: 'rgba(255, 107, 53, 0.35)' }
                    )}
                  />
                </Box>

                {/* Karteikarte - kompakter */}
                <Card sx={{ 
                  mb: 1, 
                  minHeight: 100,
                  width: '75%',
                  mx: 'auto',
                  perspective: '1000px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transformStyle: 'preserve-3d',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid #e0e0e0',
                  background: !showAnswer 
                    ? 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'
                    : 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
                  '&:hover': {
                    transform: 'translateY(0px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                  }
                }}
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 1.5,
                    px: 2.5,
                    position: 'relative',
                    minHeight: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Box sx={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      transition: 'transform 0.6s',
                      transformStyle: 'preserve-3d'
                    }}>
                      {/* Vorderseite */}
                      <Box sx={{
                        position: 'absolute',
                        width: '100%',
                        backfaceVisibility: 'hidden',
                        transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transition: 'transform 0.6s'
                      }}>
                        <Typography variant="body1" sx={{ 
                          mb: 0,
                          fontWeight: 400,
                          color: '#000000',
                          fontSize: '0.95rem'
                        }}
                        dangerouslySetInnerHTML={{ __html: formatCardText(selectedDeck.cards[currentCardIndex].front) }}
                        />
                      </Box>
                      
                      {/* Rückseite */}
                      <Box sx={{
                        position: 'absolute',
                        width: '100%',
                        backfaceVisibility: 'hidden',
                        transform: showAnswer ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                        transition: 'transform 0.6s'
                      }}>
                        <Typography variant="body1" sx={{ 
                          mb: 0,
                          fontWeight: 400,
                          color: '#000000',
                          fontSize: '0.95rem'
                        }}
                        dangerouslySetInnerHTML={{ __html: formatCardText(selectedDeck.cards[currentCardIndex].back) }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Bewertungs-Buttons - nur im Lern-Modus */}
                {showAnswer && learningMode === 'learning' && (
                  <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: 0.5, 
                      flexWrap: 'nowrap',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: '600px',
                      mx: 'auto'
                    }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(1)}
                      >
                        🌟 Perfekt 1
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(2)}
                      >
                        ✅ Sehr gut 2
                      </Button>
                      <Button
                        variant="contained"
                        color="info"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(3)}
                      >
                        ℹ️ Gut 3
                      </Button>
                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(4)}
                      >
                        ⚠️ Schwierig 4
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(5)}
                      >
                        ❌ Nicht gewusst 5
                      </Button>
                    </Box>
                  </Box>
                )}
                
                {/* Navigation für Ansehen-Modus */}
                {learningMode === 'viewing' && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ 
                          fontSize: '0.7rem', 
                          py: 0.5, 
                          px: 2,
                          borderColor: '#6c757d',
                          color: '#6c757d',
                          '&:hover': {
                            borderColor: '#495057',
                            color: '#495057'
                          }
                        }}
                        onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                        disabled={currentCardIndex === 0}
                      >
                        ⬅️ Zurück
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ 
                          fontSize: '0.7rem', 
                          py: 0.5, 
                          px: 2,
                          borderColor: '#6c757d',
                          color: '#6c757d',
                          '&:hover': {
                            borderColor: '#495057',
                            color: '#495057'
                          }
                        }}
                        onClick={() => setCurrentCardIndex(Math.min(selectedDeck.cards.length - 1, currentCardIndex + 1))}
                        disabled={currentCardIndex === selectedDeck.cards.length - 1}
                      >
                        Weiter ➡️
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* Hilfe-Popover */}
        <Popover
          open={Boolean(helpAnchorEl)}
          anchorEl={helpAnchorEl}
          onClose={() => setHelpAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          container={document.body}
          sx={{
            zIndex: 10001 // Höher als der Modal-Overlay (10000)
          }}
        >
          <Box sx={{ p: 1.5, maxWidth: 300 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.75rem' }}>
              💡 Hilfe
            </Typography>
            {learningMode === 'learning' && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                  • Karte anklicken zum Umdrehen
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                  • Tasten 1-5 oder Buttons zum Bewerten
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                  • 1-2 = Level steigt, 3 = bleibt gleich, 4-5 = Level sinkt
                </Typography>
              </>
            )}
            {learningMode === 'viewing' && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                  • Leertaste: Karte umdrehen
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                  • ← →: Navigation zwischen Karten
                </Typography>
              </>
            )}
          </Box>
        </Popover>
      </Box>
    </Box>
  );
};

// Abgabestatistik Komponente (exportiert für Verwendung im TeacherDashboard)
export const SubmissionStatistics: React.FC<{
  userId: string, 
  submissionStats: any[], 
  setSubmissionStats: (stats: any[]) => void,
  isTeacherView?: boolean
}> = ({ userId, submissionStats, setSubmissionStats, isTeacherView = false }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/submissions/student/${userId}/stats`);
        if (response.ok) {
          const data = await response.json();
          setSubmissionStats(data);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Statistik:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (submissionStats.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" color="textSecondary">
          {isTeacherView 
            ? '📭 Dieser Schüler hat noch keine Abgaben getätigt.'
            : '📭 Du hast noch keine Abgaben getätigt.'
          }
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Statistik-Übersicht */}
      <Grid container spacing={1.5} sx={{ mt: '1%', mb: 2 }}>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#e3f2fd' }}>
            <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold', fontSize: '1.8rem' }}>
              {submissionStats.length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
              Abgaben insgesamt
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fff3e0' }}>
            <Typography variant="h4" sx={{ color: '#f57c00', fontWeight: 'bold', fontSize: '1.8rem' }}>
              {submissionStats.filter(s => s.hasComment).length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
              Mit Kommentar
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f3e5f5' }}>
            <Typography variant="h4" sx={{ color: '#7b1fa2', fontWeight: 'bold', fontSize: '1.8rem' }}>
              {submissionStats.filter(s => !s.hasComment).length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
              Noch ohne Kommentar
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Liste der Abgaben */}
      <Typography variant="h6" sx={{ mb: 1.5, fontSize: '0.9rem', fontWeight: 600 }}>
        {isTeacherView ? 'Abgaben im Detail' : 'Deine Abgaben im Detail'}
      </Typography>
      
      <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
        {submissionStats.map((stat, index) => (
          <Paper key={stat.id} elevation={2} sx={{ p: 1.5, mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {stat.fileName}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                  Hochgeladen: {new Date(stat.submittedAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
                {!isTeacherView && (
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    Lehrkraft: {stat.teacherName}
                  </Typography>
                )}
              </Box>
              <Chip
                label={stat.hasComment ? '💬 Kommentar' : '⏳ Kein Kommentar'}
                size="small"
                color={stat.hasComment ? 'success' : 'default'}
                sx={{ fontSize: '0.65rem', height: '20px' }}
              />
            </Box>

            {stat.hasComment && stat.teacherComment && (
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, borderLeft: '3px solid #f57c00' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#e65100', display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                  {isTeacherView ? '💬 Dein Kommentar:' : '💬 Kommentar deiner Lehrkraft:'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#5d4037', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                  {stat.teacherComment}
                </Typography>
                {stat.commentedAt && (
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.8, fontStyle: 'italic', fontSize: '0.65rem' }}>
                    Kommentiert am: {new Date(stat.commentedAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default StudentDashboard;