import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Popover,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  FormatListBulleted,
  FormatListNumbered,
  FormatIndentIncrease,
  FormatIndentDecrease,
  FormatColorText,
  ImageOutlined,
  EmojiEmotions,
  Remove as RemoveIcon,
  Add as AddIcon,
  TableChartOutlined as TableIcon,
  Superscript as SuperscriptIcon,
  InsertLink as InsertLinkIcon,
  LinkOff as LinkOffIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDropDown as ArrowDropDownIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFileOutlined as FileIcon,
  FilterFrames as FrameIcon,
  Functions as FunctionsIcon,
} from '@mui/icons-material';
import { HIGHLIGHT_PRESETS, TEXT_COLOR_PRESETS } from '../../lib/presentationTheme';
import {
  FORMULA_PASTE_MODE_EVENT,
  isPresentationFormulaPasteMode,
  setPresentationFormulaPasteMode,
} from '../../lib/presentationFormulaPasteMode';
import {
  findPresentationMathInEditor,
  insertPresentationFormulaAtCursor,
  rememberFormulaInsertCaret,
  readPresentationMathLatex,
  renderPresentationMathHtml,
  replacePresentationMathElement,
} from '../../lib/presentationPasteMath';
import { setFormatBarInteracting, isPresentationModalTypingActive } from '../../lib/presentationFormatBarGuard';
import {
  applyFontFamily,
  applyHighlightColor,
  applyPresentationLink,
  applyTextColor,
  clearFontFamilyInSelection,
  clearInlineFormatting,
  execFormat,
  formatEditorSuperscripts,
  getPresentationLinkAtSelection,
  getSelectionFontSizePx,
  isSafePresentationHref,
  normalizePresentationLinkInput,
  nudgeFontSize,
  removePresentationLink,
  stashEditorSelection,
  insertTextAtCursor,
  keepEditorSelection,
} from '../../lib/presentationRichText';
import {
  applyOrderedListStyle,
  getCurrentPresentationOlStyle,
} from '../../lib/presentationListNormalize';
import { PRESENTATION_OL_STYLES } from '../../lib/presentationListStyles';
import {
  applyEditorFontSizePx,
  getEditorFontSizeSteps,
} from '../../lib/presentationFontSize';
import { PRESENTATION_EMOJI_GROUPS } from '../../lib/presentationEmojis';
import {
  getEditorSelectionFontFamily,
  PRESENTATION_FONT_FAMILIES,
  presentationFontLabel,
} from '../../lib/presentationFonts';
import {
  PRES_NOTES_IMG_FRAME_ATTR,
  PRES_NOTES_IMG_SELECTED_CLASS,
  PRES_NOTES_IMG_WRAP_CLASS,
  toggleNotesImageFrame,
} from '../../lib/presentationNotesImages';
import {
  TABLE_CELL_BG_PRESETS,
  TABLE_COLOR_THEMES,
  applyCellBackground,
  applyTableTheme,
  applyZebraStriping,
  buildBlankTableHtml,
  distributeColumnsEvenly,
  findTableRoot,
  formatEditorContentAsTable,
  getTableTheme,
  tableAddColumn,
  tableAddRow,
  tableDeleteColumn,
  tableDeleteLastColumn,
  tableDeleteLastRow,
  tableDeleteRow,
  tableTranspose,
} from '../../lib/presentationSlideTables';
import {
  defaultBrowseStartPath,
  fetchFolderBrowseListing,
  fetchLessonFolderLinkableFiles,
  lessonFileDisplayLabel,
  parentFolderPath,
  PRESENTATION_FILE_BROWSER_ROOT,
  presentationLessonFileHref,
  type LessonFolderFsItem,
} from '../../lib/presentationLessonFileLink';

const MOD_LABEL = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘' : 'Strg';

/** Sentinel — never use value="" with a disabled MenuItem (MUI Select render loop). */
const FONT_SIZE_PLACEHOLDER = '__pres_font_size__';

const FORMAT_POPOVER_FOCUS = {
  disableAutoFocus: true,
  disableEnforceFocus: true,
  disableRestoreFocus: true,
} as const;

const FORMAT_SELECT_MENU_PROPS = {
  ...FORMAT_POPOVER_FOCUS,
  autoFocus: false,
  MenuListProps: { autoFocusItem: false },
} as const;

interface PresentationFormatBarProps {
  activeEditor: HTMLElement | null;
  disabled?: boolean;
  contextLabel?: string;
  /** Stundenordner — für Verknüpfungen zu lokalen Dateien (PDF, …). */
  lessonPath?: string;
  onInsertImage?: () => void;
  onEditorChanged?: () => void;
  onMessage?: (message: string) => void;
}

const PresentationFormatBar: React.FC<PresentationFormatBarProps> = ({
  activeEditor,
  disabled,
  contextLabel,
  lessonPath,
  onInsertImage,
  onEditorChanged,
  onMessage,
}) => {
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [highlightAnchor, setHighlightAnchor] = useState<HTMLElement | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [tableAnchor, setTableAnchor] = useState<HTMLElement | null>(null);
  const [olStyleAnchor, setOlStyleAnchor] = useState<HTMLElement | null>(null);
  const [fontPx, setFontPx] = useState<number | ''>('');
  const [fontFamily, setFontFamily] = useState('');
  const [notesTableTick, setNotesTableTick] = useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkHasExisting, setLinkHasExisting] = useState(false);
  const [linkFileSource, setLinkFileSource] = useState<'lesson' | 'browse'>('lesson');
  const [lessonFiles, setLessonFiles] = useState<LessonFolderFsItem[]>([]);
  const [lessonFilesLoading, setLessonFilesLoading] = useState(false);
  const [lessonFilesError, setLessonFilesError] = useState<string | null>(null);
  const [browsePath, setBrowsePath] = useState(PRESENTATION_FILE_BROWSER_ROOT);
  const [browseFolders, setBrowseFolders] = useState<LessonFolderFsItem[]>([]);
  const [browseFiles, setBrowseFiles] = useState<LessonFolderFsItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [formulaPasteMode, setFormulaPasteMode] = useState(() => isPresentationFormulaPasteMode());
  const [formulaDialogOpen, setFormulaDialogOpen] = useState(false);
  const [formulaLatex, setFormulaLatex] = useState('');
  const [formulaEditTarget, setFormulaEditTarget] = useState<HTMLElement | null>(null);
  const [formulaNoSource, setFormulaNoSource] = useState(false);
  const formulaEditTargetRef = useRef<HTMLElement | null>(null);
  const formulaInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedLessonFile, setSelectedLessonFile] = useState<string>('');
  const [selectedFileMeta, setSelectedFileMeta] = useState<LessonFolderFsItem | null>(null);
  const linkRangeRef = useRef<Range | null>(null);
  const formatMenuOpen =
    Boolean(colorAnchor) ||
    Boolean(highlightAnchor) ||
    Boolean(emojiAnchor) ||
    Boolean(tableAnchor) ||
    Boolean(olStyleAnchor) ||
    linkDialogOpen ||
    formulaDialogOpen;
  const formatMenuOpenRef = useRef(formatMenuOpen);
  formatMenuOpenRef.current = formatMenuOpen;

  useEffect(() => {
    const sync = () => setFormulaPasteMode(isPresentationFormulaPasteMode());
    window.addEventListener(FORMULA_PASTE_MODE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FORMULA_PASTE_MODE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isNotesEditor = Boolean(
    activeEditor?.getAttribute('data-pres-notes-zone') === 'true' || contextLabel === 'Notizen',
  );

  const editorTableCtx = useMemo(() => {
    void notesTableTick;
    if (!activeEditor) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      const first = activeEditor.querySelector('table');
      return first ? { table: first as HTMLTableElement, cell: null as HTMLTableCellElement | null } : null;
    }
    let node: Node | null = sel.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!(node instanceof Element) || !activeEditor.contains(node)) {
      const first = activeEditor.querySelector('table');
      return first ? { table: first as HTMLTableElement, cell: null as HTMLTableCellElement | null } : null;
    }
    const cell = node.closest('td, th') as HTMLTableCellElement | null;
    const table = (findTableRoot(cell || (node as HTMLElement)) ||
      node.closest('table')) as HTMLTableElement | null;
    if (!table || !activeEditor.contains(table)) return null;
    return { table, cell };
  }, [activeEditor, notesTableTick]);

  const fontSteps = activeEditor ? getEditorFontSizeSteps(activeEditor) : [];
  const fontSizeSelectValue =
    fontPx !== '' && fontSteps.includes(Number(fontPx))
      ? String(fontPx)
      : FONT_SIZE_PLACEHOLDER;
  const syncFormatting = useCallback(() => {
    if (!activeEditor) {
      setFontPx((prev) => (prev === '' ? prev : ''));
      setFontFamily((prev) => (prev === '' ? prev : ''));
      return;
    }
    const nextPx = getSelectionFontSizePx(activeEditor) ?? '';
    const nextFamily = getEditorSelectionFontFamily(activeEditor);
    setFontPx((prev) => (prev === nextPx ? prev : nextPx));
    setFontFamily((prev) => (prev === nextFamily ? prev : nextFamily));
    setNotesTableTick((n) => n + 1);
  }, [activeEditor]);

  useEffect(() => {
    syncFormatting();
    if (!activeEditor) return undefined;
    const persistSelection = () => stashEditorSelection(activeEditor);
    const onSelectionChange = () => {
      stashEditorSelection(activeEditor);
      syncFormatting();
    };
    activeEditor.addEventListener('keyup', persistSelection);
    activeEditor.addEventListener('mouseup', persistSelection);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      activeEditor.removeEventListener('keyup', persistSelection);
      activeEditor.removeEventListener('mouseup', persistSelection);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [activeEditor, syncFormatting]);

  const btnSx = {
    color: disabled || !activeEditor ? '#999' : '#444',
    p: 0.25,
    '&:hover': { bgcolor: '#e8e8e8' },
  };

  const releaseFormatBarInteraction = useCallback(() => {
    window.setTimeout(() => {
      if (formatMenuOpenRef.current) return;
      setFormatBarInteracting(false);
    }, 250);
  }, []);

  useEffect(() => {
    if (formatMenuOpen) setFormatBarInteracting(true);
  }, [formatMenuOpen]);

  useEffect(() => {
    const onPointerUp = () => releaseFormatBarInteraction();
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    return () => {
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
    };
  }, [releaseFormatBarInteraction]);

  const restoreEditorAfterMenu = () => {
    releaseFormatBarInteraction();
    if (!activeEditor) return;
    window.requestAnimationFrame(() => {
      activeEditor.focus({ preventScroll: true });
      keepEditorSelection(activeEditor);
    });
  };

  const applyAndNotify = (fn: () => void, refreshSize = false) => {
    if (!activeEditor) return;
    setFormatBarInteracting(true);
    stashEditorSelection(activeEditor);
    fn();
    keepEditorSelection(activeEditor);
    window.requestAnimationFrame(() => keepEditorSelection(activeEditor));
    if (refreshSize) syncFormatting();
    onEditorChanged?.();
    releaseFormatBarInteraction();
  };

  useEffect(() => {
    if (disabled || !activeEditor) return undefined;
    const editor = activeEditor;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isPresentationModalTypingActive()) return;
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') {
        return;
      }
      const sel = window.getSelection();
      const inEditor =
        target === editor ||
        (target != null && editor.contains(target)) ||
        (sel?.anchorNode != null && editor.contains(sel.anchorNode));
      if (!inEditor) return;
      const key = e.key.toLowerCase();
      if (key === 'b' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        applyAndNotify(() => execFormat(editor, 'bold'));
        return;
      }
      if (key === 'i' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        applyAndNotify(() => execFormat(editor, 'italic'));
        return;
      }
      if (key === 'u' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        applyAndNotify(() => execFormat(editor, 'underline'));
        return;
      }
      if (key === 'x' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        applyAndNotify(() => execFormat(editor, 'strikeThrough'));
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
    // applyAndNotify closes over the current editor; rebind when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEditor, disabled]);

  const preventToolbarFocus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isSelectTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return !!el?.closest('.MuiSelect-root, .MuiPopover-root, .MuiMenu-root, [role="listbox"]');
  };

  const handleNudge = (dir: 1 | -1) => {
    if (!activeEditor) return;
    setFormatBarInteracting(true);
    stashEditorSelection(activeEditor);
    const px = nudgeFontSize(activeEditor, dir);
    if (px != null) {
      keepEditorSelection(activeEditor);
      window.requestAnimationFrame(() => keepEditorSelection(activeEditor));
      syncFormatting();
      onEditorChanged?.();
    }
    releaseFormatBarInteraction();
  };

  const beginFormatBarInteraction = () => {
    setFormatBarInteracting(true);
    stashEditorSelection(activeEditor);
  };

  const closeLinkDialog = useCallback(() => {
    setLinkDialogOpen(false);
    linkRangeRef.current = null;
    setLinkFileSource('lesson');
    setSelectedFileMeta(null);
    setFormatBarInteracting(false);
  }, []);

  const closeFormulaDialog = useCallback(() => {
    setFormulaDialogOpen(false);
    setFormulaLatex('');
    setFormulaEditTarget(null);
    formulaEditTargetRef.current = null;
    setFormulaNoSource(false);
    setFormatBarInteracting(false);
  }, []);

  const openFormulaDialog = useCallback(
    (target?: HTMLElement | null) => {
      if (!activeEditor || disabled || isNotesEditor) return;
      rememberFormulaInsertCaret(activeEditor);
      setFormatBarInteracting(true);
      stashEditorSelection(activeEditor);
      const math = target ?? findPresentationMathInEditor(activeEditor);
      if (math) {
        const src = readPresentationMathLatex(math);
        setFormulaEditTarget(math);
        formulaEditTargetRef.current = math;
        setFormulaLatex(src);
        setFormulaNoSource(!math.getAttribute('data-pres-latex') && math.getAttribute('data-pres-math') !== 'img');
      } else {
        setFormulaEditTarget(null);
        formulaEditTargetRef.current = null;
        setFormulaLatex('');
        setFormulaNoSource(false);
      }
      window.getSelection()?.removeAllRanges();
      activeEditor.blur();
      setFormulaDialogOpen(true);
    },
    [activeEditor, disabled, isNotesEditor],
  );

  const applyFormulaDialog = useCallback(() => {
    if (!activeEditor) return;
    const latex = formulaLatex.trim();
    if (!latex) {
      onMessage?.('Bitte LaTeX eingeben (z. B. \\frac{a}{b})');
      return;
    }
    const target = formulaEditTargetRef.current;
    if (target && activeEditor.contains(target)) {
      const next = replacePresentationMathElement(target, latex);
      if (!next) {
        onMessage?.('Formel konnte nicht gerendert werden — LaTeX prüfen');
        return;
      }
    } else if (!insertPresentationFormulaAtCursor(activeEditor, latex)) {
      onMessage?.('Formel konnte nicht eingefügt werden');
      return;
    }
    activeEditor.dispatchEvent(new Event('input', { bubbles: true }));
    onEditorChanged?.();
    closeFormulaDialog();
    onMessage?.(target ? 'Formel aktualisiert' : 'Formel eingefügt');
  }, [activeEditor, formulaLatex, closeFormulaDialog, onEditorChanged, onMessage]);

  const deleteFormulaFromDialog = useCallback(() => {
    const target = formulaEditTargetRef.current;
    if (!target || !activeEditor?.contains(target)) return;
    target.remove();
    activeEditor.dispatchEvent(new Event('input', { bubbles: true }));
    onEditorChanged?.();
    closeFormulaDialog();
    onMessage?.('Formel entfernt');
  }, [activeEditor, closeFormulaDialog, onEditorChanged, onMessage]);

  useEffect(() => {
    if (!formulaDialogOpen) return;
    const t = window.setTimeout(() => {
      const el = formulaInputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    }, 80);
    return () => window.clearTimeout(t);
  }, [formulaDialogOpen]);

  useEffect(() => {
    if (!activeEditor || disabled || isNotesEditor) return;
    const onDblClick = (e: MouseEvent) => {
      const math = (e.target as HTMLElement | null)?.closest('[data-pres-math]') as HTMLElement | null;
      if (!math || !activeEditor.contains(math)) return;
      e.preventDefault();
      e.stopPropagation();
      openFormulaDialog(math);
    };
    activeEditor.addEventListener('dblclick', onDblClick);
    return () => activeEditor.removeEventListener('dblclick', onDblClick);
  }, [activeEditor, disabled, isNotesEditor, openFormulaDialog]);

  const formulaPreviewHtml = useMemo(() => {
    const trimmed = formulaLatex.trim();
    if (!trimmed) return '';
    return renderPresentationMathHtml(trimmed) || '';
  }, [formulaLatex]);

  const captureLinkSelection = useCallback(() => {
    if (!activeEditor) {
      linkRangeRef.current = null;
      return;
    }
    stashEditorSelection(activeEditor);
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      if (activeEditor.contains(range.commonAncestorContainer)) {
        linkRangeRef.current = range.cloneRange();
        return;
      }
    }
    linkRangeRef.current = null;
  }, [activeEditor]);

  const restoreLinkSelection = useCallback(() => {
    if (!activeEditor || !linkRangeRef.current) return false;
    try {
      activeEditor.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (!sel) return false;
      sel.removeAllRanges();
      sel.addRange(linkRangeRef.current.cloneRange());
      stashEditorSelection(activeEditor);
      return true;
    } catch {
      return false;
    }
  }, [activeEditor]);

  const openLinkDialog = useCallback(() => {
    if (!activeEditor) return;
    setFormatBarInteracting(true);
    captureLinkSelection();
    const existing = getPresentationLinkAtSelection(activeEditor);
    setLinkHasExisting(Boolean(existing));
    setLinkUrl(existing?.href || '');
    setSelectedLessonFile(existing?.lessonFilePath || '');
    setSelectedFileMeta(
      existing?.lessonFilePath
        ? {
            type: 'file',
            name: existing.lessonFilePath.split('/').pop() || existing.lessonFilePath,
            path: existing.lessonFilePath,
          }
        : null,
    );
    setLinkFileSource('lesson');
    setBrowsePath(defaultBrowseStartPath(lessonPath));
    setBrowseError(null);
    setLessonFilesError(null);
    setLinkDialogOpen(true);
  }, [activeEditor, captureLinkSelection, lessonPath]);

  useEffect(() => {
    if (!linkDialogOpen || linkFileSource !== 'lesson' || !lessonPath) {
      if (!linkDialogOpen) {
        setLessonFiles([]);
        setLessonFilesLoading(false);
      }
      return undefined;
    }
    let cancelled = false;
    setLessonFilesLoading(true);
    setLessonFilesError(null);
    void fetchLessonFolderLinkableFiles(lessonPath)
      .then((files) => {
        if (!cancelled) setLessonFiles(files);
      })
      .catch((err) => {
        if (!cancelled) {
          setLessonFiles([]);
          setLessonFilesError(err instanceof Error ? err.message : 'Dateien konnten nicht geladen werden');
        }
      })
      .finally(() => {
        if (!cancelled) setLessonFilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkDialogOpen, linkFileSource, lessonPath]);

  useEffect(() => {
    if (!linkDialogOpen || linkFileSource !== 'browse' || !browsePath) {
      if (!linkDialogOpen) {
        setBrowseFolders([]);
        setBrowseFiles([]);
        setBrowseLoading(false);
      }
      return undefined;
    }
    let cancelled = false;
    setBrowseLoading(true);
    setBrowseError(null);
    void fetchFolderBrowseListing(browsePath)
      .then((listing) => {
        if (!cancelled) {
          setBrowseFolders(listing.folders);
          setBrowseFiles(listing.files);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setBrowseFolders([]);
          setBrowseFiles([]);
          setBrowseError(err instanceof Error ? err.message : 'Ordner konnte nicht geladen werden');
        }
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkDialogOpen, linkFileSource, browsePath]);

  const selectFileForLink = (file: LessonFolderFsItem) => {
    setSelectedLessonFile(file.path);
    setSelectedFileMeta(file);
    setLinkUrl(presentationLessonFileHref(file.path, file.name));
  };

  const applyLinkFromDialog = (href: string, options?: { label?: string; lessonFilePath?: string }) => {
    if (!activeEditor) return;
    restoreLinkSelection();
    applyAndNotify(() => {
      restoreLinkSelection();
      const ok = applyPresentationLink(activeEditor, href, options);
      if (!ok) {
        onMessage?.('Ungültige Verknüpfung');
        return;
      }
      onMessage?.(
        options?.lessonFilePath
          ? `Verknüpfung zu „${options.label || options.lessonFilePath.split('/').pop() || options.lessonFilePath}“`
          : 'Verknüpfung gesetzt',
      );
    });
    closeLinkDialog();
  };

  const applyUrlLink = () => {
    const href = normalizePresentationLinkInput(linkUrl);
    if (!isSafePresentationHref(href)) {
      onMessage?.('Bitte http(s)-URL, App-Pfad (/…) oder mailto: eingeben');
      return;
    }
    applyLinkFromDialog(href);
  };

  const applySelectedLessonFile = (file?: LessonFolderFsItem) => {
    const item =
      file ||
      selectedFileMeta ||
      lessonFiles.find((f) => f.path === selectedLessonFile) ||
      browseFiles.find((f) => f.path === selectedLessonFile) ||
      null;
    if (!item) {
      onMessage?.('Bitte eine Datei wählen');
      return;
    }
    const href = presentationLessonFileHref(item.path, item.name);
    if (!href || !isSafePresentationHref(href)) {
      onMessage?.('Datei konnte nicht verknüpft werden');
      return;
    }
    applyLinkFromDialog(href, {
      label: item.name,
      lessonFilePath: item.path,
    });
  };

  const browseParent = parentFolderPath(browsePath);
  const browsePathLabel =
    browsePath === PRESENTATION_FILE_BROWSER_ROOT
      ? PRESENTATION_FILE_BROWSER_ROOT
      : lessonFileDisplayLabel(browsePath, PRESENTATION_FILE_BROWSER_ROOT);

  return (
    <Box
      data-presentation-format-bar
      sx={{ display: 'flex', alignItems: 'center', gap: 0.1, flexWrap: 'nowrap', minWidth: 0 }}
      onPointerDownCapture={() => beginFormatBarInteraction()}
      onMouseDownCapture={() => stashEditorSelection(activeEditor)}
      onMouseDown={(e) => {
        if (!isSelectTarget(e.target)) preventToolbarFocus(e);
      }}
    >
      {contextLabel && contextLabel !== 'Folie' && (
        <Typography variant="caption" sx={{ color: '#2E7D32', fontSize: 10, fontWeight: 700, mr: 0.35 }}>
          {contextLabel}
        </Typography>
      )}

      <Tooltip title={`Fett (${MOD_LABEL}+B)`}>
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'bold'))}>
            <FormatBold sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`Kursiv (${MOD_LABEL}+I)`}>
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'italic'))}>
            <FormatItalic sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`Unterstrichen (${MOD_LABEL}+U)`}>
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'underline'))}>
            <FormatUnderlined sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`Durchgestrichen (⇧${MOD_LABEL}+X)`}>
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'strikeThrough'))}>
            <FormatStrikethrough sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Hochgestellt (Auswahl) · oder x² / 10^n">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              applyAndNotify(() => {
                if (!activeEditor) return;
                const result = formatEditorSuperscripts(activeEditor);
                onMessage?.(result.message);
              })
            }
          >
            <SuperscriptIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Verknüpfung (URL oder lokale Datei)">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onMouseDown={(e) => {
              e.preventDefault();
              setFormatBarInteracting(true);
              stashEditorSelection(activeEditor);
            }}
            onClick={openLinkDialog}
          >
            <InsertLinkIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip
        title="LaTeX einfügen (markieren oder klicken). Einfügen mit ⌘V wird erkannt. Doppelklick: bearbeiten"
      >
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor || isNotesEditor}
            sx={{
              ...btnSx,
              color: formulaPasteMode ? '#1565C0' : btnSx.color,
              bgcolor: formulaPasteMode ? 'rgba(21,101,192,0.12)' : 'transparent',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              rememberFormulaInsertCaret(activeEditor);
            }}
            onClick={(e) => {
              if (e.shiftKey) {
                openFormulaDialog();
                return;
              }
              const selected = (window.getSelection()?.toString() || '').trim();
              if (selected && activeEditor) {
                rememberFormulaInsertCaret(activeEditor);
                if (insertPresentationFormulaAtCursor(activeEditor, selected)) {
                  onEditorChanged?.();
                  onMessage?.('Formel eingefügt');
                  return;
                }
              }
              openFormulaDialog();
            }}
          >
            <FunctionsIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.1 }} />

      <Tooltip title="Als Tabelle formatieren (Text mit Tabs/| oder vorhandene Tabelle stylen)">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={{
              ...btnSx,
              ...(editorTableCtx ? { color: '#2E7D32', bgcolor: 'rgba(46,125,50,0.1)' } : {}),
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              setFormatBarInteracting(true);
              stashEditorSelection(activeEditor);
            }}
            onClick={(e) => {
              if (!activeEditor) return;
              if (editorTableCtx) {
                setTableAnchor(e.currentTarget);
                return;
              }
              applyAndNotify(() => {
                const result = formatEditorContentAsTable(activeEditor, isNotesEditor ? 'grau' : 'gelb');
                if (!result.ok) {
                  // Kein Tabellen-Text → leere Tabelle einfügen
                  stashEditorSelection(activeEditor);
                  const html = buildBlankTableHtml(3, 3, getTableTheme(isNotesEditor ? 'grau' : 'gelb'));
                  try {
                    document.execCommand('styleWithCSS', false, 'true');
                  } catch {
                    /* ignore */
                  }
                  document.execCommand('insertHTML', false, html);
                  onMessage?.('Leere Tabelle eingefügt');
                } else {
                  onMessage?.(result.message);
                }
                setNotesTableTick((n) => n + 1);
              });
            }}
          >
            <TableIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.1 }} />

      <Tooltip title="Aufzählung">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'insertUnorderedList'))}>
            <FormatListBulleted sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
        <Tooltip title="Nummerierung (1, 2, 3)">
          <span>
            <IconButton
              size="small"
              disabled={disabled || !activeEditor}
              sx={{ ...btnSx, pr: 0 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyAndNotify(() => execFormat(activeEditor, 'insertOrderedList'))}
            >
              <FormatListNumbered sx={{ fontSize: 17 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Nummerierungsart (a, b, …)">
          <span>
            <IconButton
              size="small"
              disabled={disabled || !activeEditor}
              sx={{ ...btnSx, p: 0, width: 16, minWidth: 16 }}
              onMouseDown={(e) => {
                e.preventDefault();
                setFormatBarInteracting(true);
                stashEditorSelection(activeEditor);
              }}
              onClick={(e) => {
                if (!activeEditor) return;
                setOlStyleAnchor(e.currentTarget);
              }}
            >
              <ArrowDropDownIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Popover
        open={Boolean(olStyleAnchor)}
        anchorEl={olStyleAnchor}
        onClose={() => {
          setOlStyleAnchor(null);
          releaseFormatBarInteraction();
        }}
        {...FORMAT_POPOVER_FOCUS}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box data-presentation-format-ui sx={{ py: 0.5, minWidth: 148 }}>
          {PRESENTATION_OL_STYLES.map((style) => {
            const current = getCurrentPresentationOlStyle(activeEditor);
            const selected = current === style.id;
            return (
              <MenuItem
                key={style.id}
                dense
                selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyAndNotify(() => {
                    if (!activeEditor) return;
                    applyOrderedListStyle(activeEditor, style.id);
                  });
                  setOlStyleAnchor(null);
                }}
                sx={{ fontSize: 13, gap: 1.25 }}
              >
                <Box component="span" sx={{ minWidth: 36, fontWeight: 700, color: '#2E7D32' }}>
                  {style.sample}
                </Box>
                {style.label}
              </MenuItem>
            );
          })}
        </Box>
      </Popover>
      <Tooltip title="Einzug vergrößern (Tab)">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'indent'))}>
            <FormatIndentIncrease sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Einzug verkleinern (Shift+Tab)">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'outdent'))}>
            <FormatIndentDecrease sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.1 }} />

      <Tooltip title="Links">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'justifyLeft'))}>
            <FormatAlignLeft sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Zentriert">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'justifyCenter'))}>
            <FormatAlignCenter sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Rechts">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'justifyRight'))}>
            <FormatAlignRight sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Blocksatz">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'justifyFull'))}>
            <FormatAlignJustify sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.1 }} />

      <Select
        size="small"
        value={
          fontFamily && PRESENTATION_FONT_FAMILIES.some((f) => f.value === fontFamily)
            ? fontFamily
            : ''
        }
        displayEmpty
        disabled={disabled || !activeEditor}
        MenuProps={FORMAT_SELECT_MENU_PROPS}
        onOpen={() => setFormatBarInteracting(true)}
        onClose={restoreEditorAfterMenu}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            applyAndNotify(() => clearFontFamilyInSelection(activeEditor), true);
            return;
          }
          applyAndNotify(() => applyFontFamily(activeEditor, value), true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        renderValue={(v) => presentationFontLabel(v)}
        sx={{
          color: '#444',
          fontSize: 11,
          height: 28,
          minWidth: 72,
          '.MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
        }}
      >
        <MenuItem value="" dense>
          Standard
        </MenuItem>
        {PRESENTATION_FONT_FAMILIES.map((font) => (
          <MenuItem key={font.value} value={font.value} dense sx={{ fontFamily: font.value }}>
            {font.label}
          </MenuItem>
        ))}
      </Select>

      <Tooltip title={`Kleiner (${MOD_LABEL}+[)`}>
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={{ ...btnSx, width: 26, height: 26 }}
            onMouseDown={(e) => {
              preventToolbarFocus(e);
              if (disabled || !activeEditor) return;
              handleNudge(-1);
            }}
          >
            <RemoveIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Select
        size="small"
        value={fontSizeSelectValue}
        disabled={disabled || !activeEditor}
        MenuProps={FORMAT_SELECT_MENU_PROPS}
        onOpen={() => setFormatBarInteracting(true)}
        onClose={restoreEditorAfterMenu}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === FONT_SIZE_PLACEHOLDER) return;
          const px = parseInt(raw, 10);
          if (!Number.isFinite(px)) return;
          applyAndNotify(() => applyEditorFontSizePx(activeEditor, px), true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        renderValue={(v) =>
          v && v !== FONT_SIZE_PLACEHOLDER ? `${v} px` : 'Größe'
        }
        sx={{
          color: '#444',
          fontSize: 11,
          height: 28,
          minWidth: 76,
          '.MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
        }}
      >
        <MenuItem value={FONT_SIZE_PLACEHOLDER} dense sx={{ display: 'none' }}>
          Größe
        </MenuItem>
        {fontSteps.map((px) => (
          <MenuItem key={px} value={String(px)} dense>
            {px} px
          </MenuItem>
        ))}
      </Select>

      <Tooltip title={`Größer (${MOD_LABEL}+])`}>
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={{ ...btnSx, width: 26, height: 26 }}
            onMouseDown={(e) => {
              preventToolbarFocus(e);
              if (disabled || !activeEditor) return;
              handleNudge(1);
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.1 }} />

      <Tooltip title="Textfarbe">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onMouseDown={(e) => {
              e.preventDefault();
              setFormatBarInteracting(true);
              stashEditorSelection(activeEditor);
            }}
            onClick={(e) => setColorAnchor(e.currentTarget)}
          >
            <FormatColorText sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={() => {
          setColorAnchor(null);
          releaseFormatBarInteraction();
        }}
        {...FORMAT_POPOVER_FOCUS}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box data-presentation-format-ui sx={{ p: 1, maxWidth: 260 }}>
          <Box
            onMouseDown={(e) => {
              e.preventDefault();
              stashEditorSelection(activeEditor);
              applyAndNotify(() => clearInlineFormatting(activeEditor, 'color'));
              setColorAnchor(null);
            }}
            sx={{
              mb: 0.75,
              py: 0.35,
              px: 0.75,
              borderRadius: 1,
              border: '1px dashed #bbb',
              fontSize: 11,
              color: '#666',
              cursor: 'pointer',
              textAlign: 'center',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
          >
            Farbe entfernen
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {TEXT_COLOR_PRESETS.map((c) => (
            <Box
              key={c}
              onMouseDown={(e) => {
                e.preventDefault();
                stashEditorSelection(activeEditor);
                applyAndNotify(() => applyTextColor(activeEditor, c));
                setColorAnchor(null);
              }}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: c,
                border: c === '#FFFFFF' ? '1px solid #999' : '1px solid #ccc',
                cursor: 'pointer',
              }}
            />
          ))}
          </Box>
        </Box>
      </Popover>

      <Tooltip title="Markierung">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onMouseDown={(e) => {
              e.preventDefault();
              setFormatBarInteracting(true);
              stashEditorSelection(activeEditor);
            }}
            onClick={(e) => setHighlightAnchor(e.currentTarget)}
          >
            <Box sx={{ width: 14, height: 14, bgcolor: '#FFF59D', borderRadius: 0.5, border: '1px solid #888' }} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(highlightAnchor)}
        anchorEl={highlightAnchor}
        onClose={() => {
          setHighlightAnchor(null);
          releaseFormatBarInteraction();
        }}
        {...FORMAT_POPOVER_FOCUS}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box data-presentation-format-ui sx={{ p: 1, maxWidth: 260 }}>
          <Box
            onMouseDown={(e) => {
              e.preventDefault();
              stashEditorSelection(activeEditor);
              applyAndNotify(() => clearInlineFormatting(activeEditor, 'highlight'));
              setHighlightAnchor(null);
            }}
            sx={{
              mb: 0.75,
              py: 0.35,
              px: 0.75,
              borderRadius: 1,
              border: '1px dashed #bbb',
              fontSize: 11,
              color: '#666',
              cursor: 'pointer',
              textAlign: 'center',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
          >
            Markierung entfernen
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {HIGHLIGHT_PRESETS.map((c) => (
            <Box
              key={c}
              onMouseDown={(e) => {
                e.preventDefault();
                stashEditorSelection(activeEditor);
                applyAndNotify(() => applyHighlightColor(activeEditor, c));
                setHighlightAnchor(null);
              }}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: c,
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            />
          ))}
          </Box>
        </Box>
      </Popover>

      <Tooltip title="Emoji einfügen">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onMouseDown={(e) => {
              e.preventDefault();
              setFormatBarInteracting(true);
              stashEditorSelection(activeEditor);
            }}
            onClick={(e) => setEmojiAnchor(e.currentTarget)}
          >
            <EmojiEmotions sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => {
          setEmojiAnchor(null);
          releaseFormatBarInteraction();
        }}
        {...FORMAT_POPOVER_FOCUS}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box
          data-presentation-format-ui
          sx={{ p: 1, maxWidth: 280, maxHeight: 320, overflowY: 'auto', scrollbarWidth: 'thin' }}
        >
          {PRESENTATION_EMOJI_GROUPS.map((group, groupIndex) => (
            <Box
              key={group.label}
              sx={{ mb: groupIndex < PRESENTATION_EMOJI_GROUPS.length - 1 ? 0.75 : 0 }}
            >
              <Typography
                variant="caption"
                sx={{ display: 'block', color: '#666', fontSize: 10, fontWeight: 600, mb: 0.35 }}
              >
                {group.label}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35 }}>
                {group.emojis.map((emoji) => (
                  <Box
                    key={emoji}
                    component="button"
                    type="button"
                    aria-label={`Emoji ${emoji}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      stashEditorSelection(activeEditor);
                      applyAndNotify(() => {
                        insertTextAtCursor(activeEditor, emoji);
                      });
                      setEmojiAnchor(null);
                    }}
                    sx={{
                      width: 28,
                      height: 28,
                      p: 0,
                      border: '1px solid transparent',
                      borderRadius: 1,
                      bgcolor: 'transparent',
                      fontSize: 18,
                      lineHeight: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': { bgcolor: '#f0f0f0', borderColor: '#ddd' },
                    }}
                  >
                    {emoji}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>

      {onInsertImage && (
        <>
          <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.1 }} />
          <Tooltip title="Bild einfügen">
            <span>
              <IconButton
                size="small"
                disabled={disabled || !activeEditor}
                sx={btnSx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onInsertImage}
              >
                <ImageOutlined sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}

      {isNotesEditor && (
        <Tooltip title={navigator.platform.toLowerCase().includes('mac') ? 'Bild umranden (⌘R)' : 'Bild umranden (Strg+R)'}>
          <span>
            <IconButton
              size="small"
              aria-label="Bild umranden"
              disabled={disabled || !activeEditor}
              sx={{
                ...btnSx,
                color:
                  activeEditor?.querySelector(
                    `.${PRES_NOTES_IMG_WRAP_CLASS}.${PRES_NOTES_IMG_SELECTED_CLASS}[${PRES_NOTES_IMG_FRAME_ATTR}]`,
                  )
                    ? '#C62828'
                    : btnSx.color,
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!activeEditor) return;
                if (!toggleNotesImageFrame(activeEditor)) {
                  onMessage?.('Bild in den Notizen anklicken, dann umranden');
                  return;
                }
                activeEditor.dispatchEvent(new Event('input', { bubbles: true }));
                onEditorChanged?.();
              }}
            >
              <FrameIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Popover
        open={Boolean(tableAnchor) && Boolean(editorTableCtx)}
        anchorEl={tableAnchor}
        onClose={() => {
          setTableAnchor(null);
          releaseFormatBarInteraction();
        }}
        {...FORMAT_POPOVER_FOCUS}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {editorTableCtx &&
          (() => {
            const { table, cell } = editorTableCtx;
            const dim = {
              rows: table.rows.length,
              cols: table.rows[0]?.cells.length || 0,
            };
            const miniBtn = {
              minWidth: 0,
              px: 0.5,
              py: 0.15,
              fontSize: 10,
              lineHeight: 1.2,
              textTransform: 'none' as const,
            };
            const run = (fn: () => void) => {
              if (!activeEditor) return;
              stashEditorSelection(activeEditor);
              setFormatBarInteracting(true);
              fn();
              keepEditorSelection(activeEditor);
              onEditorChanged?.();
              setNotesTableTick((n) => n + 1);
              releaseFormatBarInteraction();
            };
            return (
              <Box
                data-presentation-format-ui
                data-presentation-table-tools
                sx={{ p: 0.85, width: 210, display: 'flex', flexDirection: 'column', gap: 0.45 }}
              >
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#78909c' }}>
                  Tabelle · {dim.rows}×{dim.cols}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ ...miniBtn, justifyContent: 'flex-start', fontWeight: 700 }}
                  onClick={() =>
                    run(() => {
                      formatEditorContentAsTable(activeEditor!, 'gelb');
                      onMessage?.('Tabelle formatiert');
                    })
                  }
                >
                  Als Johnny-Tabelle stylen
                </Button>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.3 }}>
                  <Button size="small" sx={miniBtn} onClick={() => run(() => tableAddRow(table))}>
                    +Zeile
                  </Button>
                  <Button size="small" sx={miniBtn} onClick={() => run(() => tableAddColumn(table))}>
                    +Spalte
                  </Button>
                  <Button size="small" sx={miniBtn} onClick={() => run(() => tableTranspose(table))}>
                    ⇄
                  </Button>
                  <Button
                    size="small"
                    sx={miniBtn}
                    onClick={() =>
                      run(() => {
                        if (cell && tableDeleteRow(table, cell)) return;
                        tableDeleteLastRow(table);
                      })
                    }
                  >
                    −Zeile
                  </Button>
                  <Button
                    size="small"
                    sx={miniBtn}
                    onClick={() =>
                      run(() => {
                        if (cell && tableDeleteColumn(table, cell)) return;
                        tableDeleteLastColumn(table);
                      })
                    }
                  >
                    −Spalte
                  </Button>
                  <Button size="small" sx={miniBtn} onClick={() => run(() => applyZebraStriping(table))}>
                    Zebra
                  </Button>
                </Box>
                <Button
                  size="small"
                  sx={miniBtn}
                  onClick={() => run(() => distributeColumnsEvenly(table))}
                >
                  Spalten =
                </Button>
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#78909c', mt: 0.25 }}>
                  Farben
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                  {TABLE_COLOR_THEMES.map((t) => (
                    <Tooltip key={t.id} title={t.label}>
                      <Box
                        onClick={() => run(() => applyTableTheme(table, t))}
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: '3px',
                          bgcolor: t.headerBg,
                          border: `1px solid ${t.border}`,
                          cursor: 'pointer',
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
                {cell && (
                  <>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#78909c' }}>
                      Zelle
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                      {TABLE_CELL_BG_PRESETS.map((c) => (
                        <Box
                          key={c}
                          onClick={() => run(() => applyCellBackground(cell, c))}
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '3px',
                            bgcolor: c,
                            border: '1px solid #bbb',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            );
          })()}
      </Popover>

      <Dialog
        open={linkDialogOpen}
        onClose={closeLinkDialog}
        fullWidth
        maxWidth="sm"
        data-presentation-format-ui
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DialogTitle sx={{ pb: 1, fontSize: 16 }}>Verknüpfung einfügen</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: 12, color: '#666', mb: 1 }}>
            Text markieren, dann URL oder eine lokale Datei wählen. Beim Präsentieren öffnet der Link in
            einem neuen Tab.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="URL (Webadresse)"
            placeholder="https://… oder /api/…"
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              setSelectedLessonFile('');
              setSelectedFileMeta(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyUrlLink();
              }
            }}
            sx={{ mb: 1.5 }}
          />

          <Box sx={{ display: 'flex', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant={linkFileSource === 'lesson' ? 'contained' : 'outlined'}
              onClick={() => setLinkFileSource('lesson')}
              sx={{ textTransform: 'none', fontSize: 12 }}
            >
              Stundenordner
            </Button>
            <Button
              size="small"
              variant={linkFileSource === 'browse' ? 'contained' : 'outlined'}
              startIcon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setLinkFileSource('browse');
                setBrowsePath((prev) => prev || defaultBrowseStartPath(lessonPath));
              }}
              sx={{ textTransform: 'none', fontSize: 12 }}
            >
              Anderer Ordner…
            </Button>
          </Box>

          {linkFileSource === 'lesson' ? (
            <>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#37474f', mb: 0.75 }}>
                Datei im Stundenordner
              </Typography>
              {!lessonPath ? (
                <Typography sx={{ fontSize: 12, color: '#999' }}>
                  Kein Stundenordner — wechsle zu „Anderer Ordner…“ oder nutze eine Web-URL.
                </Typography>
              ) : lessonFilesLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                  <CircularProgress size={18} />
                  <Typography sx={{ fontSize: 12, color: '#666' }}>Dateien werden geladen…</Typography>
                </Box>
              ) : lessonFilesError ? (
                <Typography sx={{ fontSize: 12, color: '#c62828' }}>{lessonFilesError}</Typography>
              ) : lessonFiles.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: '#999' }}>Keine Dateien im Stundenordner.</Typography>
              ) : (
                <List
                  dense
                  sx={{
                    maxHeight: 240,
                    overflow: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    py: 0,
                  }}
                >
                  {lessonFiles.map((file) => {
                    const selected = selectedLessonFile === file.path;
                    return (
                      <ListItemButton
                        key={file.path}
                        selected={selected}
                        onClick={() => selectFileForLink(file)}
                        onDoubleClick={() => applySelectedLessonFile(file)}
                        sx={{ py: 0.35 }}
                      >
                        <ListItemText
                          primary={file.name}
                          secondary={lessonFileDisplayLabel(file.path, lessonPath)}
                          primaryTypographyProps={{ fontSize: 13 }}
                          secondaryTypographyProps={{ fontSize: 10, noWrap: true }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <Tooltip title="Überordner">
                  <span>
                    <IconButton
                      size="small"
                      disabled={!browseParent}
                      onClick={() => browseParent && setBrowsePath(browseParent)}
                      sx={{ p: 0.4 }}
                    >
                      <ArrowUpwardIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#37474f',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={browsePath}
                >
                  {browsePathLabel}
                </Typography>
                {lessonPath ? (
                  <Button
                    size="small"
                    onClick={() => setBrowsePath(lessonPath)}
                    sx={{ textTransform: 'none', fontSize: 11, flexShrink: 0 }}
                  >
                    Zur Stunde
                  </Button>
                ) : null}
              </Box>
              {browseLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                  <CircularProgress size={18} />
                  <Typography sx={{ fontSize: 12, color: '#666' }}>Ordner wird geladen…</Typography>
                </Box>
              ) : browseError ? (
                <Typography sx={{ fontSize: 12, color: '#c62828' }}>{browseError}</Typography>
              ) : browseFolders.length === 0 && browseFiles.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: '#999' }}>Dieser Ordner ist leer.</Typography>
              ) : (
                <List
                  dense
                  sx={{
                    maxHeight: 260,
                    overflow: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    py: 0,
                  }}
                >
                  {browseFolders.map((folder) => (
                    <ListItemButton
                      key={folder.path}
                      onClick={() => setBrowsePath(folder.path)}
                      sx={{ py: 0.35 }}
                    >
                      <FolderOpenIcon sx={{ fontSize: 18, color: '#f9a825', mr: 1, flexShrink: 0 }} />
                      <ListItemText
                        primary={folder.name}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                      />
                    </ListItemButton>
                  ))}
                  {browseFiles.map((file) => {
                    const selected = selectedLessonFile === file.path;
                    return (
                      <ListItemButton
                        key={file.path}
                        selected={selected}
                        onClick={() => selectFileForLink(file)}
                        onDoubleClick={() => applySelectedLessonFile(file)}
                        sx={{ py: 0.35 }}
                      >
                        <FileIcon sx={{ fontSize: 18, color: '#78909c', mr: 1, flexShrink: 0 }} />
                        <ListItemText
                          primary={file.name}
                          primaryTypographyProps={{ fontSize: 13 }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, gap: 0.5, flexWrap: 'wrap' }}>
          {linkHasExisting ? (
            <Button
              color="inherit"
              startIcon={<LinkOffIcon />}
              onClick={() => {
                restoreLinkSelection();
                applyAndNotify(() => {
                  restoreLinkSelection();
                  if (!removePresentationLink(activeEditor)) {
                    onMessage?.('Kein Link an der Auswahl');
                    return;
                  }
                  onMessage?.('Verknüpfung entfernt');
                });
                closeLinkDialog();
              }}
              sx={{ mr: 'auto', textTransform: 'none' }}
            >
              Entfernen
            </Button>
          ) : (
            <Box sx={{ mr: 'auto' }} />
          )}
          <Button onClick={closeLinkDialog} sx={{ textTransform: 'none' }}>
            Abbrechen
          </Button>
          {selectedLessonFile ? (
            <Button
              variant="contained"
              onClick={() => applySelectedLessonFile()}
              sx={{ textTransform: 'none' }}
            >
              Datei verknüpfen
            </Button>
          ) : (
            <Button variant="contained" onClick={applyUrlLink} sx={{ textTransform: 'none' }}>
              URL verknüpfen
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={formulaDialogOpen}
        onClose={closeFormulaDialog}
        maxWidth="xs"
        fullWidth
        data-pres-formula-dialog
        data-open={formulaDialogOpen ? 'true' : 'false'}
        PaperProps={{ 'data-presentation-format-ui': 'true', 'data-pres-formula-dialog': 'true' }}
        TransitionProps={{
          onEntered: () => {
            activeEditor?.blur();
            formulaInputRef.current?.focus({ preventScroll: true });
          },
        }}
      >
        <DialogTitle sx={{ py: 0.75, px: 1.5, fontSize: 14, fontWeight: 700 }}>
          {formulaEditTarget ? 'Formel bearbeiten' : 'Formel einfügen'}
        </DialogTitle>
        <DialogContent
          sx={{ px: 1.5, pt: 0, pb: 1 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {formulaNoSource ? (
            <Typography sx={{ fontSize: 10, color: '#666', mb: 0.75, lineHeight: 1.35 }}>
              Keine gespeicherte LaTeX-Quelle (Word/PP). Neue Eingabe ersetzt die Darstellung.
            </Typography>
          ) : null}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 1, alignItems: 'stretch' }}>
            <Box
              component="textarea"
              ref={formulaInputRef}
              value={formulaLatex}
              onChange={(e) => setFormulaLatex(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  applyFormulaDialog();
                }
              }}
              placeholder="LaTeX, z. B. \frac{a}{b}"
              rows={3}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              sx={{
                width: '100%',
                resize: 'vertical',
                minHeight: 56,
                maxHeight: 140,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 12,
                lineHeight: 1.45,
                p: 1,
                border: '1px solid #ccc',
                borderRadius: 1,
                outline: 'none',
                '&:focus': { borderColor: '#1565C0', boxShadow: '0 0 0 1px #1565C0' },
              }}
            />
            <Box
              sx={{
                border: '1px solid #ddd',
                borderRadius: 1,
                bgcolor: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
                minHeight: 56,
                overflow: 'hidden',
              }}
              dangerouslySetInnerHTML={{
                __html: formulaPreviewHtml || '<span style="color:#bbb;font-size:11px">Vorschau</span>',
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 9, color: '#888', mt: 0.75 }}>
            ⌘/Strg+Enter übernehmen · ohne $-Zeichen
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 1.5, py: 0.75, gap: 0.5, minHeight: 0 }}>
          {formulaEditTarget ? (
            <Button
              size="small"
              color="error"
              onClick={deleteFormulaFromDialog}
              sx={{ textTransform: 'none', fontSize: 12, mr: 'auto' }}
            >
              Entfernen
            </Button>
          ) : (
            <Box sx={{ mr: 'auto' }} />
          )}
          <Button size="small" onClick={closeFormulaDialog} sx={{ textTransform: 'none', fontSize: 12 }}>
            Abbrechen
          </Button>
          <Button size="small" variant="contained" onClick={applyFormulaDialog} sx={{ textTransform: 'none', fontSize: 12 }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PresentationFormatBar;
