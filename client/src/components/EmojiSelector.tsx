import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ImageIcon from '@mui/icons-material/Image';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';
import {
  examLibraryIconImageSrc,
  isExamLibraryImageIcon,
} from '../lib/examLibraryIcons';

interface EmojiSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  currentEmoji?: string;
  title?: string;
  /** Eigenes Bild hochladen (z. B. Prüfungs-Icons). */
  allowImageUpload?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
}

type EmojiCategory = {
  name: string;
  emojis: string[];
  keywords?: string[];
};

const emojiCategories: EmojiCategory[] = [
  {
    name: 'Schule & Prüfung',
    keywords: [
      'schule',
      'prüfung',
      'pruefung',
      'quiz',
      'test',
      'klasse',
      'mathe',
      'informatik',
      'ki',
      'note',
      'arbeit',
      'hausaufgabe',
      'hü',
      'ka',
    ],
    emojis: [
      '📝', '✏️', '📋', '📊', '🧮', '🔬', '🧪', '💻', '🤖', '⚡', '❓', '📘', '📗', '📙',
      '🎯', '🏫', '✅', '⭐', '🧠', '📐', '📈', '🎓', '🦉', '🔢', '🌍', '🎨', '🎵', '⚽',
    ],
  },
  {
    name: 'Menschen',
    keywords: ['mensch', 'lehrer', 'schüler', 'schueler', 'beruf', 'avatar'],
    emojis: [
      '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍💻', '👩‍💻',
      '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '👨‍⚕️', '👩‍⚕️', '👨‍🚀', '👩‍🚀',
      '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳',
      '👨‍🎤', '👩‍🎤', '👨‍🎭', '👩‍🎭', '👨‍🎪', '👩‍🎪', '👨‍🏭', '👩‍🏭',
      '👨‍🚒', '👩‍🚒', '👨‍✈️', '👩‍✈️', '👨‍⚖️', '👩‍⚖️', '👨‍🚁', '👩‍🚁',
      '👨‍🚢', '👩‍🚢', '👨‍🚛', '👩‍🚛', '👨‍🚜', '👩‍🚜', '👨‍🏗️', '👩‍🏗️'
    ]
  },
  {
    name: 'Tiere',
    keywords: [
      'tier',
      'hund',
      'katze',
      'hase',
      'vogel',
      'fisch',
      'pferd',
      'bär',
      'baer',
      'affe',
      'loewe',
      'einhorn',
    ],
    emojis: [
      '🐱', '🐶', '🐰', '🐹', '🐭', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣', '🦆', '🦅', '🦉', '🦇',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗', '🕷️',
      '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍',
      '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦙', '🦒', '🐃', '🐂', '🐄', '🐎',
      '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🦚', '🦜',
      '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀',
      '🐉', '🐲', '🦕', '🦖', '🦈', '🐋', '🐳', '🐬', '🐟', '🐠', '🐡', '🦐'
    ]
  },
  {
    name: 'Monster & Fantasie',
    keywords: ['monster', 'fantasie', 'robot', 'roboter', 'alien', 'hexe', 'drache', 'superheld'],
    emojis: [
      '👹', '👺', '👻', '👽', '🤖', '💀', '☠️', '👾', '🤡', '👿', '😈',
      '🧙‍♂️', '🧙‍♀️', '🧛‍♂️', '🧛‍♀️', '🧜‍♂️', '🧜‍♀️', '🧚‍♂️', '🧚‍♀️',
      '🦸‍♂️', '🦸‍♀️', '🦹‍♂️', '🦹‍♀️', '🧝‍♂️', '🧝‍♀️', '🧞‍♂️', '🧞‍♀️',
      '🧟‍♂️', '🧟‍♀️', '🧌', '🐉', '🐲', '🦕', '🦖', '🦈', '🐋', '🐳', '🐬',
      '🦄', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦙', '🦒'
    ]
  },
  {
    name: 'Emotionen & Gesichter',
    keywords: ['gesicht', 'smiley', 'emotion', 'lustig', 'traurig', 'freude', 'herz'],
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃',
      '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
      '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟',
      '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
      '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗'
    ]
  }
];

const EmojiSelector: React.FC<EmojiSelectorProps> = ({
  open,
  onClose,
  onSelect,
  currentEmoji = '🧙‍♂️',
  title = '🎭 Wähle dein Avatar-Emoji',
  allowImageUpload = false,
  onUploadImage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setImageUploadError(null);
      setImageUploading(false);
    }
  }, [open]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim();
    const qLower = q.toLowerCase();
    if (!qLower) {
      return emojiCategories.map((c) => ({ name: c.name, emojis: c.emojis }));
    }

    const emojiHits = new Set<string>();
    for (const cat of emojiCategories) {
      for (const emoji of cat.emojis) {
        if (emoji === q || (q.length >= 1 && emoji.includes(q))) {
          emojiHits.add(emoji);
        }
      }
    }
    if (emojiHits.size > 0) {
      return [{ name: 'Treffer', emojis: [...emojiHits] }];
    }

    const matched = emojiCategories.filter((cat) => {
      if (cat.name.toLowerCase().includes(qLower)) return true;
      return (cat.keywords || []).some((k) => k.includes(qLower) || qLower.includes(k));
    });

    if (matched.length === 0) return [];
    return matched.map((c) => ({ name: c.name, emojis: c.emojis }));
  }, [searchQuery]);

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const handleImageFile = (file: File | undefined) => {
    if (!file || !onUploadImage) return;
    setImageUploadError(null);
    setImageUploading(true);
    void (async () => {
      try {
        const iconValue = await onUploadImage(file);
        onSelect(iconValue);
        onClose();
      } catch (e) {
        setImageUploadError(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
      } finally {
        setImageUploading(false);
      }
    })();
  };

  const currentIsImage = isExamLibraryImageIcon(currentEmoji);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }
      }}
    >
      <DialogTitle sx={{
        ...dialogCloseTitleSx,
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '8px 8px 0 0',
        py: 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        <DialogCloseIconButton
          onClose={onClose}
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          iconSx={{ color: '#fff' }}
        />
      </DialogTitle>

      <DialogContent sx={{ p: 2, maxHeight: '60vh', overflowY: 'auto' }}>
        {allowImageUpload && onUploadImage ? (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: '#fff',
              border: '1px dashed #90caf9',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            {currentIsImage ? (
              <Box
                component="img"
                src={examLibraryIconImageSrc(currentEmoji, 64)}
                alt=""
                sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 1 }}
              />
            ) : (
              <ImageIcon color="primary" />
            )}
            <Box sx={{ flex: 1, minWidth: 140 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Eigenes Bild
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PNG, JPG, WebP … (wird verkleinert gespeichert)
              </Typography>
            </Box>
            <Button
              component="label"
              variant="contained"
              size="small"
              disabled={imageUploading}
              sx={{ flexShrink: 0 }}
            >
              {imageUploading ? 'Lade hoch …' : 'Bild wählen …'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  handleImageFile(f);
                }}
              />
            </Button>
            {imageUploadError ? (
              <Typography variant="caption" color="error" sx={{ width: '100%' }}>
                {imageUploadError}
              </Typography>
            ) : null}
          </Box>
        ) : null}
        <TextField
          fullWidth
          size="small"
          placeholder="Suchen … (z. B. Quiz, Hund, 🤖)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          sx={{ mb: 2, bgcolor: '#fff', borderRadius: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        {filteredCategories.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            Kein Icon passend zu „{searchQuery.trim()}“
          </Typography>
        ) : null}
        {filteredCategories.map((category) => (
          <Box key={category.name} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 'bold',
                color: '#1976d2',
                mb: 1.5,
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {category.name}
            </Typography>
            <Grid container spacing={1}>
              {category.emojis.map((emoji, emojiIndex) => (
                <Grid item xs={2} sm={1.5} key={emojiIndex}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      transform:
                        !currentIsImage && emoji === currentEmoji ? 'scale(1.05)' : 'scale(1)',
                      border:
                        !currentIsImage && emoji === currentEmoji
                          ? '2px solid #1976d2'
                          : '1px solid transparent',
                      minHeight: '60px',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: '1px solid #1976d2'
                      }
                    }}
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    <CardContent sx={{
                      p: 1,
                      textAlign: 'center',
                      background:
                        !currentIsImage && emoji === currentEmoji
                        ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                        : 'white'
                    }}>
                      <Typography variant="h5" sx={{ fontSize: '2rem' }}>
                        {emoji}
                      </Typography>
                      {!currentIsImage && emoji === currentEmoji && (
                        <Chip
                          label="Aktuell"
                          size="small"
                          color="primary"
                          sx={{ mt: 0.5, fontSize: '0.6rem', height: '16px' }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            px: 3,
            py: 1,
            fontWeight: 600,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': {
              borderColor: '#1565c0',
              backgroundColor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Abbrechen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmojiSelector;
