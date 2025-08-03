import React from 'react';
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
  Chip
} from '@mui/material';

interface EmojiSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  currentEmoji?: string;
}

const emojiCategories = [
  {
    name: 'Menschen',
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
    emojis: [
      '👹', '👺', '👻', '👽', '🤖', '💀', '☠️', '👾', '🤡', '👿', '😈',
      '🧙‍♂️', '🧙‍♀️', '🧛‍♂️', '🧛‍♀️', '🧜‍♂️', '🧜‍♀️', '🧚‍♂️', '🧚‍♀️',
      '🦸‍♂️', '🦸‍♀️', '🦹‍♂️', '🦹‍♀️', '🧝‍♂️', '🧝‍♀️', '🧞‍♂️', '🧞‍♀️',
      '🧟‍♂️', '🧟‍♀️', '🧌', '🐉', '🐲', '🦕', '🦖', '🦈', '🐋', '🐳', '🐬',
      '🦄', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦙', '🦒'
    ]
  },
  {
    name: 'Natur & Pflanzen',
    emojis: [
      '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳',
      '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰', '🦠',
      '🌍', '🌎', '🌏', '🌐', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘',
      '🌙', '🌚', '🌛', '🌜', '☀️', '🌝', '🌞', '⭐', '🌟', '🌠', '☁️', '⛅',
      '🌤️', '🌥️', '🌦️', '🌧️', '🌨️', '🌩️', '🌪️', '🌫️', '🌬️', '🌈', '☂️', '☔'
    ]
  },
  {
    name: 'Essen & Trinken',
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽',
      '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀',
      '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔',
      '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫'
    ]
  },
  {
    name: 'Aktivitäten & Sport',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
      '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
      '🥊', '🥋', '🎽', '🛹', '🛷️', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️',
      '🏋️‍♂️', '🤼‍♀️', '🤼‍♂️', '🤸‍♀️', '🤸‍♂️', '⛹️‍♀️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾‍♂️',
      '🏊‍♀️', '🏊‍♂️', '🚣‍♀️', '🚣‍♂️', '🧗‍♀️', '🧗‍♂️', '🚵‍♀️', '🚵‍♂️', '🚴‍♀️', '🚴‍♂️'
    ]
  }
];

const EmojiSelector: React.FC<EmojiSelectorProps> = ({
  open,
  onClose,
  onSelect,
  currentEmoji = '🧙‍♂️'
}) => {
  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

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
        textAlign: 'center', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '8px 8px 0 0',
        py: 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          🎭 Wähle dein Avatar-Emoji
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 2, maxHeight: '60vh', overflowY: 'auto' }}>
        {emojiCategories.map((category, categoryIndex) => (
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
                      transform: emoji === currentEmoji ? 'scale(1.05)' : 'scale(1)',
                      border: emoji === currentEmoji ? '2px solid #1976d2' : '1px solid transparent',
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
                      background: emoji === currentEmoji 
                        ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                        : 'white'
                    }}>
                      <Typography variant="h5" sx={{ fontSize: '2rem' }}>
                        {emoji}
                      </Typography>
                      {emoji === currentEmoji && (
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