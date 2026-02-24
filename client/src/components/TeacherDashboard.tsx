import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import KACorrectionMode from './KACorrectionMode';
import TeacherMessageBox from './TeacherMessageBox';
import { FlashcardLearningModal, LessonSharedInputBox } from './StudentDashboard';
import { RIDDLES } from './riddles';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  LinearProgress,
  CircularProgress,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Switch,
  FormControlLabel,
  FormGroup,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  Slider,
  Rating,
  Badge,
  Menu,
  Popover,
  Drawer,
  AppBar,
  Toolbar,
  Breadcrumbs,
  Link,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  MobileStepper,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Backdrop,
  Skeleton,
  AlertTitle,
  Fade,
  Grow,
  Slide,
  Zoom,
  useTheme,
  useMediaQuery,
  styled,
  alpha,
  darken,
  lighten,
  emphasize,
  getContrastRatio,
  getLuminance,
  recomposeColor,
  hexToRgb,
  decomposeColor
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  MoreVert as MoreVertIcon,
  Brush as BrushIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
  Build as BuildIcon,
  Style as StyleIcon,
  Storage as StorageIcon,
  Description as DescriptionIcon,
  PersonAdd as PersonAddIcon,
  Folder as FolderIcon,
  Grade as GradeIcon,
  DragIndicator as GripVerticalIcon,
  Delete as Trash2Icon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  DragIndicator as DragIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Flag as FlagIcon,
  Report as ReportIcon,
  Block as BlockIcon,
  Security as SecurityIcon,
  Verified as VerifiedIcon,
  NewReleases as NewIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Email as EmailIcon,
  Mail,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Event as EventIcon,
  Today as TodayIcon,
  Update as UpdateIcon,
  History as HistoryIcon,
  Archive as ArchiveIcon,
  DeleteForever as DeleteForeverIcon,
  Restore as RestoreIcon,
  SettingsBackupRestore as BackupIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  CloudSync as CloudSyncIcon,
  CloudQueue as CloudQueueIcon,
  CloudOff as CloudOffIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  SignalCellular4Bar as SignalIcon,
  SignalCellular0Bar as NoSignalIcon,
  BrightnessHigh as BrightnessHighIcon,
  BrightnessLow as BrightnessLowIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  VolumeDown as VolumeDownIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Camera as CameraIcon,
  CameraAlt as CameraAltIcon,
  Photo as PhotoIcon,
  Image as ImageIcon,
  Slideshow as SlideshowIcon,
  Movie as MovieIcon,
  MusicNote as MusicIcon,
  Headset as HeadsetIcon,
  Speaker as SpeakerIcon,
  Keyboard as KeyboardIcon,
  Mouse as MouseIcon,
  Laptop as LaptopIcon,
  DesktopMac as DesktopMacIcon,
  Tablet as TabletIcon,
  Watch as WatchIcon,
  FitnessCenter as FitnessCenterIcon,
  Directions as DirectionsIcon,
  Navigation as NavigationIcon,
  Map as MapIcon,
  Place as PlaceIcon,
  LocalHospital as LocalHospitalIcon,
  LocalPharmacy as LocalPharmacyIcon,
  LocalGroceryStore as LocalGroceryStoreIcon,
  Restaurant as LocalRestaurantIcon,
  LocalBar as LocalBarIcon,
  LocalCafe as LocalCafeIcon,
  LocalHotel as LocalHotelIcon,
  LocalTaxi as LocalTaxiIcon,
  LocalAirport as LocalAirportIcon,
  LocalGasStation as LocalGasStationIcon,
  LocalCarWash as LocalCarWashIcon,
  LocalParking as LocalParkingIcon,
  LocalAtm as LocalAtmIcon,
  LocalPostOffice as LocalPostOfficeIcon,
  LocalLibrary as LocalLibraryIcon,
  School as LocalSchoolIcon,
  School as LocalUniversityIcon,
  LocalMall as LocalMallIcon,
  TheaterComedy as LocalTheaterIcon,
  LocalConvenienceStore as LocalConvenienceStoreIcon,
  LocalFlorist as LocalFloristIcon,
  LocalLaundryService as LocalLaundryServiceIcon,
  LocalPizza as LocalPizzaIcon,
  LocalPrintshop as LocalPrintshopIcon,
  LocalShipping as LocalShippingIcon,
  LocalOffer as LocalOfferIcon,
  LocalActivity as LocalActivityIcon,
  LocalPlay as LocalPlayIcon,
  LocalDining as LocalDiningIcon,
  LocalDrink as LocalDrinkIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  LocalPolice as LocalPoliceIcon,
  LocalSee as LocalSeeIcon,
  Traffic as LocalTrafficIcon,
  Build as LocalUtilityIcon,
  WorkspacePremium as LocalWorkspacePremiumIcon,
  LocationOn as LocalZoneIcon,
  School as SchoolIcon,
  Book as BookIcon,
  Topic as TopicIcon,
  MenuBook as LessonIcon,
  PersonAddAlt1 as HandRaiseIcon,
  EmojiEvents as EmojiEventsIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  BarChart as BarChartIcon,
  Description as MaterialIcon,
  Quiz as QuizIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  FastForward as FastForwardIcon,
  FastRewind as FastRewindIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Shuffle as ShuffleIcon,
  Repeat as RepeatIcon,
  VolumeMute as VolumeMuteIcon,
  TableChart as TableChartIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Code as CodeIcon,
  Games as GamesIcon,
  Computer as ComputerIcon,
  Calculate as CalculateIcon,
  Functions as FunctionsIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import DatabaseViewer from './DatabaseViewer';
import SubjectManager from './SubjectManager';
import { fetchAssignments } from './SubjectManager';
import MaterialCreator from './MaterialCreator';
import GradingSchemaModal from './GradingSchemaModal';
import GradesModal from './GradesModal';
import FileSystemPathManager from './FileSystemPathManager';
import FolderAssignmentSelector from './FolderAssignmentSelector';
import { SubmissionStatistics } from './StudentDashboard';
import { RichTextEditor } from './ui/rich-text-editor';
import { FlashcardCreationModal } from './FlashcardCreationModal';
import SubmissionViewer from './SubmissionViewer';

/**
 * Helper-Funktion: Prüft ob eine Datei eine korrigierbare Datei ist (KA_, HÜ_, HU_)
 */
const isCorrectionFile = (fileName: string): boolean => {
  return fileName.startsWith('KA_') || fileName.startsWith('HÜ_') || fileName.startsWith('HU_') || fileName.startsWith('QZ_');
};

interface TeacherDashboardProps {
  userId: string;
  onLogout: () => void;
}

interface Subject {
  id: string;
  name: string;
  description?: string;
}

interface LearningGroup {
  id: string;
  name: string;
  students: Student[];
}

/** Anzeigereihenfolge der Lerngruppen: 7a → 10c → Mathe LK 11 → GK 11 → GK 12 → rest */
function sortLearningGroups(groups: LearningGroup[]): LearningGroup[] {
  const order = (name: string): number => {
    const n = name.toLowerCase();
    if (n.includes('7a') || n === 'klasse 7a') return 0;
    if (n.includes('10c') || n === 'klasse 10c') return 1;
    if (n.includes('mathe lk 11')) return 2;
    if (n.includes('gk 11') || n.includes('informatik gk 11')) return 3;
    if (n.includes('gk 12') || n.includes('informatik gk 12')) return 4;
    return 5;
  };
  return [...groups].sort((a, b) => order(a.name) - order(b.name));
}

interface Student {
  id: string;
  name: string;
  loginCode: string;
  avatarEmoji?: string;
}

// Mini-Noten: Schema/Grade Typen
interface GradingSchemaMini {
  id: string;
  name: string;
  structure: string;
  gradingSystem?: string;
}
interface GradeMini {
  id: string;
  categoryName: string;
  grade: number;
  weight: number;
}

// Kompakte Mini-Noten-Knoten für hierarchische Anzeige
interface MiniGradeNode {
  name: string;
  grade: number | null;
  children: MiniGradeNode[];
}

// Flashcard-Interfaces
interface Flashcard {
  id?: string;
  front: string;
  back: string;
  hint?: string;
  difficulty: number;
  order: number;
}

// Flashcard Progress Interface
interface FlashcardProgress {
  cardId: string;
  studentId: string;
  level: number;
  nextReview: string;
  lastReviewed: string;
  reviewCount: number;
  quality: number;
}

interface StudentFlashcardStats {
  totalCards: number;
  completedCards: number;
  dueCards: number;
  progressPercentage: number;
  qualityStats: {
    perfect: number;
    partial: number;
    notKnown: number;
    partiallyKnown: number;
    wellKnown: number;
  };
  levelStats: {
    level0: number;
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  progressData: any[]; // Speichere die ursprünglichen Progress-Daten
}

interface FlashcardDeck {
  id?: string;
  title: string;
  description?: string;
  subjectId?: string;
  teacherId: string;
  imageUrl?: string; // URL für das Deck-Bild
  imageColor?: string; // Fallback-Farbe für das Deck-Bild
  imageIcon?: string; // Fallback-Emoji/Icon für das Deck
  cards: Flashcard[];
  subject?: Subject;
  assignments?: FlashcardAssignment[];
}

interface FlashcardAssignment {
  id: string;
  deckId: string;
  groupId: string;
  dueDate?: string;
  group: LearningGroup;
}

interface DocumentProcessingHistory {
  id: string;
  sourceFile: string;
  fileName: string;
  teacherId: string;
  action: 'created_deck' | 'added_to_deck';
  deckId: string;
  deckTitle: string;
  cardsCount: number;
  processedAt: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Hilfsfunktion zum Konvertieren von HTML zu Plaintext für Vorschau
const htmlToPlainText = (html: string): string => {
  if (!html) return '';
  // Erstelle ein temporäres div-Element
  const temp = document.createElement('div');
  temp.innerHTML = html;
  // Extrahiere nur den Text-Inhalt
  return temp.textContent || temp.innerText || '';
};

// Konfetti-Wurf Game Component mit Modi
const ConfettiGameModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [mode, setMode] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [particles, setParticles] = useState<Array<{id: number; x: number; y: number; color: string; speed: number}>>([]);
  const [gameActive, setGameActive] = useState(false);
  const particleIdRef = useRef(0);

  const gameConfig = {
    easy: { time: 45, spawnRate: 800, particleSize: 25, points: 10, speed: 1 },
    medium: { time: 30, spawnRate: 500, particleSize: 20, points: 15, speed: 2 },
    hard: { time: 20, spawnRate: 300, particleSize: 15, points: 20, speed: 3 }
  };

  useEffect(() => {
    if (!open) {
      setMode(null);
      setScore(0);
      setTimeLeft(30);
      setParticles([]);
      setGameActive(false);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!gameActive || timeLeft <= 0 || !mode) return;
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
  }, [gameActive, timeLeft, mode]);

  useEffect(() => {
    if (!gameActive || !mode) return;
    const config = gameConfig[mode];
    const interval = setInterval(() => {
      setParticles(prev => [
        ...prev,
        {
          id: particleIdRef.current++,
          x: Math.random() * 100,
          y: Math.random() * 100,
          color: ['#FF1493', '#FF69B4', '#FFB6C1', '#FFD700', '#FF6347', '#FF4500', '#00CED1', '#9370DB'][Math.floor(Math.random() * 8)],
          speed: config.speed
        }
      ]);
    }, config.spawnRate);
    return () => clearInterval(interval);
  }, [gameActive, mode]);

  useEffect(() => {
    if (!gameActive || !mode) return;
    const config = gameConfig[mode];
    const moveInterval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 100,
        x: p.x + (Math.random() - 0.5) * 0.5
      })));
    }, 50);
    return () => clearInterval(moveInterval);
  }, [gameActive, mode]);

  const handleParticleClick = (id: number) => {
    if (!mode) return;
    const config = gameConfig[mode];
    setParticles(prev => prev.filter(p => p.id !== id));
    setScore(prev => prev + config.points);
  };

  const startGame = (selectedMode: 'easy' | 'medium' | 'hard') => {
    setMode(selectedMode);
    setScore(0);
    setTimeLeft(gameConfig[selectedMode].time);
    setParticles([]);
    setGameActive(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center' }}>
        🎊 Konfetti-Wurf
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 400, position: 'relative', overflow: 'hidden' }}>
        {!mode && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>Wähle einen Schwierigkeitsgrad:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('easy')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟢 Einfach</Typography>
                  <Typography variant="caption">45s, große Partikel</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('medium')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟡 Mittel</Typography>
                  <Typography variant="caption">30s, normale Partikel</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('hard')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🔴 Schwer</Typography>
                  <Typography variant="caption">20s, schnelle Partikel</Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        {gameActive && mode && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Punkte: {score}</Typography>
              <Typography variant="h6">Zeit: {timeLeft}s</Typography>
              <Typography variant="h6">Modus: {mode === 'easy' ? '🟢' : mode === 'medium' ? '🟡' : '🔴'}</Typography>
            </Box>
            <Box sx={{ position: 'relative', width: '100%', height: 350, border: '2px dashed #FF1493', borderRadius: 2, overflow: 'hidden' }}>
              {particles.map(p => (
                <Box
                  key={p.id}
                  onClick={() => handleParticleClick(p.id)}
                  sx={{
                    position: 'absolute',
                    left: `${Math.max(0, Math.min(100, p.x))}%`,
                    top: `${Math.max(0, Math.min(100, p.y))}%`,
                    width: gameConfig[mode].particleSize,
                    height: gameConfig[mode].particleSize,
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
        {!gameActive && timeLeft === 0 && mode && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Spiel beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>Deine Punktzahl: {score}</Typography>
            <Button variant="contained" onClick={() => startGame(mode)} sx={{ bgcolor: '#FF1493', mr: 1 }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={() => { setMode(null); setScore(0); setTimeLeft(30); setParticles([]); }} sx={{ mr: 1 }}>
              Modus wählen
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

// Masken-Memory Game Component mit Modi
const MaskMemoryModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const allMasks = ['🎭', '🤡', '👺', '🎪', '🎨', '🎯', '🎬', '🎤', '🎧', '🎮', '🎰', '🎲'];
  const [mode, setMode] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const gameConfig = {
    easy: { pairs: 4, timeLimit: 0, flipDelay: 1500 },
    medium: { pairs: 6, timeLimit: 120, flipDelay: 1000 },
    hard: { pairs: 8, timeLimit: 90, flipDelay: 800 }
  };

  useEffect(() => {
    if (!open) {
      setMode(null);
      setCards([]);
      setFlipped([]);
      setMatched([]);
      setMoves(0);
      setTimeLeft(0);
      return;
    }
  }, [open]);

  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    if (!mode || !gameActive || timeLimit === 0) return;
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
  }, [mode, gameActive, timeLimit]);

  const startGame = (selectedMode: 'easy' | 'medium' | 'hard') => {
    const config = gameConfig[selectedMode];
    const selectedMasks = allMasks.slice(0, config.pairs);
    const pairs = [...selectedMasks, ...selectedMasks].sort(() => Math.random() - 0.5);
    setMode(selectedMode);
    setCards(pairs);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTimeLeft(config.timeLimit);
    setTimeLimit(config.timeLimit);
    setGameActive(true);
  };

  const handleCardClick = (index: number) => {
    if (!gameActive || flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);
    
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const config = gameConfig[mode!];
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched(prev => [...prev, ...newFlipped]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), config.flipDelay);
      }
    }
  };

  const totalPairs = mode ? gameConfig[mode].pairs : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center' }}>
        🎭 Masken-Memory
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {!mode && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>Wähle einen Schwierigkeitsgrad:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('easy')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟢 Einfach</Typography>
                  <Typography variant="caption">4 Paare, kein Zeitlimit</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('medium')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟡 Mittel</Typography>
                  <Typography variant="caption">6 Paare, 2 Minuten</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('hard')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🔴 Schwer</Typography>
                  <Typography variant="caption">8 Paare, 90 Sekunden</Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        {mode && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1">Züge: {moves}</Typography>
              <Typography variant="body1">Gefunden: {matched.length / 2} / {totalPairs}</Typography>
              {timeLimit > 0 && <Typography variant="body1">Zeit: {timeLeft}s</Typography>}
            </Box>
            <Grid container spacing={1}>
              {cards.map((card, index) => (
                <Grid item xs={cards.length <= 8 ? 3 : 2.4} key={index}>
                  <Card
                    onClick={() => handleCardClick(index)}
                    sx={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: gameActive && !flipped.includes(index) && !matched.includes(index) ? 'pointer' : 'default',
                      bgcolor: flipped.includes(index) || matched.includes(index) ? '#fff' : '#FF1493',
                      fontSize: cards.length <= 8 ? '2rem' : '1.5rem',
                      transition: 'all 0.3s',
                      opacity: matched.includes(index) ? 0.6 : 1,
                      '&:hover': { transform: gameActive && !flipped.includes(index) && !matched.includes(index) ? 'scale(1.05)' : 'none' }
                    }}
                  >
                    {flipped.includes(index) || matched.includes(index) ? card : '?'}
                  </Card>
                </Grid>
              ))}
            </Grid>
            {(matched.length === cards.length || (timeLimit > 0 && timeLeft === 0 && gameActive)) && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  {matched.length === cards.length ? '🎉 Gewonnen!' : '⏰ Zeit abgelaufen!'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>Du hast {moves} Züge gebraucht.</Typography>
                <Button variant="contained" onClick={() => startGame(mode)} sx={{ bgcolor: '#FF1493', mr: 1 }}>
                  Nochmal spielen
                </Button>
                <Button variant="outlined" onClick={() => { setMode(null); setCards([]); setFlipped([]); setMatched([]); setMoves(0); }} sx={{ mr: 1 }}>
                  Modus wählen
                </Button>
                <Button variant="outlined" onClick={onClose}>
                  Schließen
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Narren-Quiz Game Component mit Modi
const FoolQuizModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const allQuestions = [
    { q: 'Was ist die beste Zeit für Karneval?', a: 'Immer!', options: ['Immer!', 'Nur im Februar', 'Nie', 'Am Wochenende'] },
    { q: 'Wie viele Farben hat ein Regenbogen?', a: 'Alle!', options: ['Alle!', '7', '3', 'Unendlich'] },
    { q: 'Was macht einen Narren aus?', a: 'Die gute Laune!', options: ['Die gute Laune!', 'Die Maske', 'Die Musik', 'Das Kostüm'] },
    { q: 'Was ist das beste Karnevals-Gebäck?', a: 'Alles Süße!', options: ['Alles Süße!', 'Berliner', 'Krapfen', 'Kekse'] },
    { q: 'Welche Stadt ist berühmt für Karneval?', a: 'Köln!', options: ['Köln!', 'Berlin', 'München', 'Hamburg'] },
    { q: 'Was wirft man traditionell beim Karneval?', a: 'Konfetti!', options: ['Konfetti!', 'Steine', 'Blumen', 'Bonbons'] },
    { q: 'Wie heißt der Karnevalsdienstag?', a: 'Faschingsdienstag!', options: ['Faschingsdienstag!', 'Rosenmontag', 'Aschermittwoch', 'Fastnacht'] },
    { q: 'Was trägt man beim Karneval?', a: 'Ein Kostüm!', options: ['Ein Kostüm!', 'Uniform', 'Anzug', 'Pyjama'] },
    { q: 'Welches Tier ist ein Karnevalssymbol?', a: 'Der Narr!', options: ['Der Narr!', 'Der Löwe', 'Der Bär', 'Der Adler'] },
    { q: 'Was macht man beim Karneval?', a: 'Feiern!', options: ['Feiern!', 'Schlafen', 'Lernen', 'Arbeiten'] },
  ];
  const [mode, setMode] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [questions, setQuestions] = useState<typeof allQuestions>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameActive, setGameActive] = useState(false);

  const gameConfig = {
    easy: { count: 4, timePerQuestion: 0 },
    medium: { count: 6, timePerQuestion: 15 },
    hard: { count: 8, timePerQuestion: 10 }
  };

  useEffect(() => {
    if (!open) {
      setMode(null);
      setQuestions([]);
      setCurrentQ(0);
      setScore(0);
      setSelected(null);
      setTimeLeft(0);
      setGameActive(false);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!gameActive || !mode || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameActive, mode, timeLeft]);

  const handleTimeUp = () => {
    setSelected('TIME_UP');
    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        setSelected(null);
        if (mode && gameConfig[mode].timePerQuestion > 0) {
          setTimeLeft(gameConfig[mode].timePerQuestion);
        }
      } else {
        setGameActive(false);
      }
    }, 1500);
  };

  const startGame = (selectedMode: 'easy' | 'medium' | 'hard') => {
    const config = gameConfig[selectedMode];
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, config.count);
    setMode(selectedMode);
    setQuestions(shuffled);
    setCurrentQ(0);
    setScore(0);
    setSelected(null);
    setTimeLeft(config.timePerQuestion);
    setGameActive(true);
  };

  const handleAnswer = (answer: string) => {
    if (selected !== null) return;
    setSelected(answer);
    if (answer === questions[currentQ].a) {
      setScore(prev => prev + 1);
    }
    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        setSelected(null);
        if (mode && gameConfig[mode].timePerQuestion > 0) {
          setTimeLeft(gameConfig[mode].timePerQuestion);
        }
      } else {
        setGameActive(false);
      }
    }, 1500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center' }}>
        🤡 Narren-Quiz
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {!mode && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>Wähle einen Schwierigkeitsgrad:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('easy')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟢 Einfach</Typography>
                  <Typography variant="caption">4 Fragen, kein Zeitlimit</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('medium')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟡 Mittel</Typography>
                  <Typography variant="caption">6 Fragen, 15s pro Frage</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('hard')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🔴 Schwer</Typography>
                  <Typography variant="caption">8 Fragen, 10s pro Frage</Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        {mode && gameActive && currentQ < questions.length && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Frage {currentQ + 1} / {questions.length}</Typography>
              <Typography variant="h6">Punkte: {score}</Typography>
              {gameConfig[mode].timePerQuestion > 0 && (
                <Typography variant="h6" sx={{ color: timeLeft <= 5 ? '#f44336' : 'inherit' }}>
                  Zeit: {timeLeft}s
                </Typography>
              )}
            </Box>
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
                {selected === 'TIME_UP' ? '⏰ Zeit abgelaufen!' : selected === questions[currentQ].a ? '✅ Richtig!' : '❌ Falsch!'}
              </Typography>
            )}
          </>
        )}
        {mode && !gameActive && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Quiz beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>Deine Punktzahl: {score} / {questions.length}</Typography>
            <Button variant="contained" onClick={() => startGame(mode)} sx={{ bgcolor: '#FF1493', mr: 1 }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={() => { setMode(null); setQuestions([]); setCurrentQ(0); setScore(0); setSelected(null); }} sx={{ mr: 1 }}>
              Modus wählen
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

// Karnevals-Würfel Game Component mit Modi
const CarnivalDiceModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [mode, setMode] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [dice3, setDice3] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [total, setTotal] = useState(0);
  const [wins, setWins] = useState(0);
  const [rolls, setRolls] = useState(0);
  const [maxRolls, setMaxRolls] = useState(0);
  const [rollsLeft, setRollsLeft] = useState(0);

  const gameConfig = {
    easy: { winThreshold: 8, diceCount: 2, maxRolls: 10 },
    medium: { winThreshold: 10, diceCount: 2, maxRolls: 8 },
    hard: { winThreshold: 12, diceCount: 3, maxRolls: 6 }
  };

  useEffect(() => {
    if (open) {
      setMode(null);
      setDice1(1);
      setDice2(1);
      setDice3(1);
      setRolling(false);
      setTotal(0);
      setWins(0);
      setRolls(0);
      setMaxRolls(0);
      setRollsLeft(0);
    }
  }, [open]);

  const startGame = (selectedMode: 'easy' | 'medium' | 'hard') => {
    const config = gameConfig[selectedMode];
    setMode(selectedMode);
    setDice1(1);
    setDice2(1);
    setDice3(1);
    setRolling(false);
    setTotal(0);
    setWins(0);
    setRolls(0);
    setMaxRolls(config.maxRolls);
    setRollsLeft(config.maxRolls);
  };

  const rollDice = () => {
    if (rolling || !mode || rollsLeft <= 0) return;
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      if (gameConfig[mode].diceCount === 3) {
        setDice3(Math.floor(Math.random() * 6) + 1);
      }
      count++;
      if (count > 10) {
        clearInterval(interval);
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const d3 = gameConfig[mode].diceCount === 3 ? Math.floor(Math.random() * 6) + 1 : 0;
        setDice1(d1);
        setDice2(d2);
        if (gameConfig[mode].diceCount === 3) {
          setDice3(d3);
        }
        const sum = d1 + d2 + d3;
        setTotal(sum);
        setRolls(prev => prev + 1);
        setRollsLeft(prev => prev - 1);
        if (sum >= gameConfig[mode].winThreshold) {
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
        {!mode && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>Wähle einen Schwierigkeitsgrad:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('easy')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟢 Einfach</Typography>
                  <Typography variant="caption">2 Würfel, Summe ≥8, 10 Würfe</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('medium')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟡 Mittel</Typography>
                  <Typography variant="caption">2 Würfel, Summe ≥10, 8 Würfe</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('hard')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🔴 Schwer</Typography>
                  <Typography variant="caption">3 Würfel, Summe ≥12, 6 Würfe</Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        {mode && (
          <>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Würfle und gewinne bei einer Summe von {gameConfig[mode].winThreshold} oder mehr! 🎁
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ fontSize: '4rem' }}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice1 - 1]}</Box>
              <Box sx={{ fontSize: '4rem' }}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice2 - 1]}</Box>
              {gameConfig[mode].diceCount === 3 && (
                <Box sx={{ fontSize: '4rem' }}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice3 - 1]}</Box>
              )}
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1">Würfe übrig: {rollsLeft} / {maxRolls}</Typography>
              <Typography variant="body1">Gewinne: {wins}</Typography>
            </Box>
            {total > 0 && (
              <Typography variant="h5" sx={{ mb: 2 }}>
                Summe: {total} {total >= gameConfig[mode].winThreshold ? '🎉 Gewonnen!' : '😔 Leider nicht'}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={rollDice}
              disabled={rolling || rollsLeft <= 0}
              sx={{ bgcolor: '#FF1493', mb: 2, py: 1.5, fontSize: '1.1rem' }}
            >
              {rolling ? 'Würfle...' : rollsLeft <= 0 ? 'Keine Würfe mehr!' : '🎲 Würfeln!'}
            </Button>
            {rollsLeft === 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>🎉 Spiel beendet!</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>Du hast {wins} von {maxRolls} Würfen gewonnen!</Typography>
                <Button variant="contained" onClick={() => startGame(mode)} sx={{ bgcolor: '#FF1493', mr: 1 }}>
                  Nochmal spielen
                </Button>
                <Button variant="outlined" onClick={() => { setMode(null); setRolls(0); setWins(0); setTotal(0); }} sx={{ mr: 1 }}>
                  Modus wählen
                </Button>
                <Button variant="outlined" onClick={onClose}>
                  Schließen
                </Button>
              </Box>
            )}
            {rollsLeft > 0 && (
              <Button variant="outlined" onClick={onClose} sx={{ mt: 2 }}>
                Schließen
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Karnevals-Lied-Raten Game Component mit Musik
const SongGuessModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const songs = [
    { title: 'Viva Colonia', hint: 'Kölner Karnevalshymne', emoji: '🍺', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { title: 'Ein Hoch auf uns', hint: 'Party-Klassiker', emoji: '🎉', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { title: 'Atemlos', hint: 'Deutscher Pop-Hit', emoji: '💃', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { title: '99 Luftballons', hint: '80er Jahre Hit', emoji: '🎈', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { title: 'Ein Kommen und Gehen', hint: 'Karnevals-Klassiker', emoji: '🎪', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { title: 'Marmor, Stein und Eisen bricht', hint: 'Oldie', emoji: '💎', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  ];
  const [mode, setMode] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [currentSong, setCurrentSong] = useState(0);
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const gameConfig = {
    easy: { songs: 3, playDuration: 10, showEmoji: true },
    medium: { songs: 4, playDuration: 8, showEmoji: true },
    hard: { songs: 5, playDuration: 5, showEmoji: false }
  };

  useEffect(() => {
    if (!open) {
      setMode(null);
      setCurrentSong(0);
      setScore(0);
      setGuess('');
      setShowHint(false);
      setGameActive(false);
      setTimeLeft(0);
      setIsPlaying(false);
      setPlaybackTime(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }
  }, [open]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const timer = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(audioRef.current.currentTime);
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isPlaying]);

  const startGame = (selectedMode: 'easy' | 'medium' | 'hard') => {
    const config = gameConfig[selectedMode];
    const shuffled = [...songs].sort(() => Math.random() - 0.5).slice(0, config.songs);
    setMode(selectedMode);
    setCurrentSong(0);
    setScore(0);
    setGuess('');
    setShowHint(false);
    setGameActive(true);
    playCurrentSong();
  };

  const playCurrentSong = () => {
    if (!mode) return;
    const config = gameConfig[mode];
    const song = songs[currentSong];
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(song.audioUrl);
    audioRef.current = audio;
    setIsPlaying(true);
    setPlaybackTime(0);
    
    audio.play().catch(() => {
      // Fallback wenn Audio nicht geladen werden kann
      setIsPlaying(false);
    });
    
    setTimeout(() => {
      audio.pause();
      setIsPlaying(false);
    }, config.playDuration * 1000);
  };

  const handleGuess = () => {
    if (!mode || !gameActive) return;
    const song = songs[currentSong];
    if (guess.toLowerCase().includes(song.title.toLowerCase()) || song.title.toLowerCase().includes(guess.toLowerCase())) {
      setScore(prev => prev + 1);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setTimeout(() => nextSong(), 1500);
    }
  };

  const handleSkip = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    nextSong();
  };

  const nextSong = () => {
    const config = gameConfig[mode!];
    if (currentSong < config.songs - 1) {
      setCurrentSong(prev => prev + 1);
      setGuess('');
      setShowHint(false);
      setTimeout(() => playCurrentSong(), 500);
    } else {
      setGameActive(false);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center' }}>
        🎵 Karnevals-Lied-Raten
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center' }}>
        {!mode && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>Wähle einen Schwierigkeitsgrad:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('easy')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟢 Einfach</Typography>
                  <Typography variant="caption">3 Lieder, 10s pro Lied</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('medium')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🟡 Mittel</Typography>
                  <Typography variant="caption">4 Lieder, 8s pro Lied</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ cursor: 'pointer', p: 2, '&:hover': { transform: 'scale(1.05)' } }} onClick={() => startGame('hard')}>
                  <Typography variant="h6" sx={{ mb: 1 }}>🔴 Schwer</Typography>
                  <Typography variant="caption">5 Lieder, 5s pro Lied</Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        {mode && gameActive && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Lied {currentSong + 1} / {gameConfig[mode].songs}</Typography>
              <Typography variant="h6">Punkte: {score}</Typography>
            </Box>
            {isPlaying && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ mb: 1 }}>🎵 Musik läuft...</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {gameConfig[mode].playDuration - Math.floor(playbackTime)}s verbleibend
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(playbackTime / gameConfig[mode].playDuration) * 100} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            )}
            {!isPlaying && (
              <Typography variant="h3" sx={{ mb: 2 }}>
                {gameConfig[mode].showEmoji ? songs[currentSong].emoji : '🎵'}
              </Typography>
            )}
            {showHint && (
              <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic' }}>
                Tipp: {songs[currentSong].hint}
              </Typography>
            )}
            <TextField
              fullWidth
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGuess()}
              placeholder="Liedtitel eingeben..."
              sx={{ mb: 2 }}
              disabled={isPlaying}
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" onClick={handleGuess} sx={{ bgcolor: '#FF1493' }} disabled={isPlaying}>
                Raten
              </Button>
              <Button variant="outlined" onClick={() => setShowHint(true)} disabled={showHint || isPlaying}>
                Tipp
              </Button>
              <Button variant="outlined" onClick={handleSkip} disabled={isPlaying}>
                Überspringen
              </Button>
            </Box>
          </>
        )}
        {mode && !gameActive && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Spiel beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>Deine Punktzahl: {score} / {gameConfig[mode].songs}</Typography>
            <Button variant="contained" onClick={() => startGame(mode)} sx={{ bgcolor: '#FF1493', mr: 1 }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={() => { setMode(null); setCurrentSong(0); setScore(0); }} sx={{ mr: 1 }}>
              Modus wählen
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

// Musik-Stopp-Spiel (für ganze Klasse) - Musik spielt, stoppt, Karte erscheint
const GroupConfettiModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const actionCards = [
    { emoji: '🎭', task: 'Macht eine Maske nach!' },
    { emoji: '🤡', task: 'Macht einen Clown-Gesicht!' },
    { emoji: '👏', task: 'Klatscht zusammen!' },
    { emoji: '🦶', task: 'Stampft mit den Füßen!' },
    { emoji: '🎉', task: 'Ruft "Hurra!"!' },
    { emoji: '🎊', task: 'Macht eine Welle!' },
    { emoji: '🎪', task: 'Macht einen Zirkus-Trick!' },
    { emoji: '🎨', task: 'Malt in der Luft!' },
    { emoji: '🎯', task: 'Zeigt auf ein Ziel!' },
    { emoji: '🎲', task: 'Würfelt in der Luft!' },
  ];
  const [gameActive, setGameActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCard, setCurrentCard] = useState<typeof actionCards[0] | null>(null);
  const [round, setRound] = useState(0);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      setGameActive(false);
      setIsPlaying(false);
      setCurrentCard(null);
      setRound(0);
      if (audioRef) {
        audioRef.pause();
        setAudioRef(null);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
  }, [open]);

  const startGame = () => {
    setGameActive(true);
    setRound(0);
    playMusic();
  };

  const playMusic = () => {
    setIsPlaying(true);
    setCurrentCard(null);
    const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
    audio.loop = true;
    audio.play().catch(() => {
      // Fallback wenn Audio nicht geladen werden kann
      setIsPlaying(false);
    });
    setAudioRef(audio);
    
    // Stoppt nach zufälliger Zeit (3-8 Sekunden)
    const stopTime = Math.random() * 5000 + 3000;
    timerRef.current = setTimeout(() => {
      audio.pause();
      setIsPlaying(false);
      const card = actionCards[Math.floor(Math.random() * actionCards.length)];
      setCurrentCard(card);
      setRound(prev => prev + 1);
    }, stopTime);
  };

  const nextRound = () => {
    if (round >= 10) {
      setGameActive(false);
      return;
    }
    setTimeout(() => playMusic(), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center', fontSize: '1.5rem' }}>
        🎵 Musik-Stopp-Spiel
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 500 }}>
        {!gameActive && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Musik-Stopp-Spiel!</Typography>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Musik spielt, stoppt zufällig, dann kommt eine Karte mit einer Aufgabe!
            </Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}>
              Spiel starten!
            </Button>
          </Box>
        )}
        {gameActive && (
          <>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Runde {round} / 10
            </Typography>
            {isPlaying && (
              <Box sx={{ my: 4 }}>
                <Typography variant="h2" sx={{ mb: 2, fontSize: '4rem' }}>🎵</Typography>
                <Typography variant="h4" sx={{ mb: 2 }}>Musik läuft...</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>Wartet auf den Stopp!</Typography>
                <CircularProgress size={60} />
              </Box>
            )}
            {currentCard && !isPlaying && (
              <Box sx={{ my: 4, p: 4, bgcolor: '#f5f5f5', borderRadius: 3, border: '3px solid #FF1493' }}>
                <Typography variant="h1" sx={{ mb: 3, fontSize: '10rem' }}>
                  {currentCard.emoji}
                </Typography>
                <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, color: '#FF1493' }}>
                  {currentCard.task}
                </Typography>
                <Button
                  variant="contained"
                  onClick={nextRound}
                  size="small"
                  sx={{ bgcolor: '#FF1493', fontSize: '0.7rem', py: 0.5, px: 1.5, minWidth: 'auto' }}
                >
                  Weiter
                </Button>
              </Box>
            )}
          </>
        )}
        {!gameActive && round >= 10 && (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>🎉 Spiel beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 3 }}>Ihr habt alle 10 Runden geschafft!</Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', mr: 1, fontSize: '1.1rem' }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ fontSize: '1.1rem' }}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Simon sagt - Gruppenspiel (für ganze Klasse)
const GroupMemoryModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const actions = [
    { emoji: '👏', name: 'Klatscht' },
    { emoji: '🦶', name: 'Stampft' },
    { emoji: '🎉', name: 'Ruft "Hurra!"' },
    { emoji: '🤡', name: 'Macht Clown-Gesicht' },
    { emoji: '🎭', name: 'Macht Maske' },
    { emoji: '🕺', name: 'Tanzt' },
  ];
  type ActionType = typeof actions[0];
  const [gameActive, setGameActive] = useState(false);
  const [sequence, setSequence] = useState<ActionType[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showingSequence, setShowingSequence] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!open) {
      setGameActive(false);
      setSequence([]);
      setCurrentStep(0);
      setShowingSequence(false);
      setRound(0);
      return;
    }
  }, [open]);

  const startGame = () => {
    setGameActive(true);
    setRound(0);
    setSequence([]);
    nextRound();
  };

  const nextRound = () => {
    const newAction = actions[Math.floor(Math.random() * actions.length)];
    setSequence(prev => [...prev, newAction]);
    setCurrentStep(0);
    setShowingSequence(true);
  };

  useEffect(() => {
    if (!showingSequence || !gameActive) return;
    const timer = setTimeout(() => {
      if (currentStep < sequence.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setTimeout(() => {
          setShowingSequence(false);
          setRound(prev => prev + 1);
        }, 1000);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentStep, showingSequence, sequence.length, gameActive]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center', fontSize: '1.5rem' }}>
        🎭 Simon sagt
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 500 }}>
        {!gameActive && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Simon sagt!</Typography>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Wiederholt die Sequenz von Aktionen!
            </Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}>
              Spiel starten!
            </Button>
          </Box>
        )}
        {gameActive && (
          <>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Runde {round} - Folge {sequence.length} Aktionen
            </Typography>
            {showingSequence && currentStep < sequence.length && sequence[currentStep] && (
              <Box sx={{ my: 4, p: 4, bgcolor: '#f5f5f5', borderRadius: 3, border: '3px solid #FF1493' }}>
                <Typography variant="h1" sx={{ mb: 2, fontSize: '6rem' }}>
                  {sequence[currentStep].emoji}
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#FF1493' }}>
                  Simon sagt: {sequence[currentStep].name}!
                </Typography>
              </Box>
            )}
            {!showingSequence && sequence.length > 0 && (
              <Box sx={{ my: 4 }}>
                <Typography variant="h4" sx={{ mb: 3 }}>Jetzt seid ihr dran!</Typography>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Wiederholt die Sequenz: {sequence.map(s => s.emoji).join(' → ')}
                </Typography>
                <Button
                  variant="contained"
                  onClick={nextRound}
                  sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}
                >
                  Nächste Runde
                </Button>
              </Box>
            )}
          </>
        )}
        {round >= 5 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>🎉 Super gemacht!</Typography>
            <Typography variant="h5" sx={{ mb: 3 }}>Ihr habt {round} Runden geschafft!</Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', mr: 1, fontSize: '1.1rem' }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ fontSize: '1.1rem' }}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Stille Post mit Karten - Gruppenspiel (für ganze Klasse)
const GroupQuizModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const cards = [
    { emoji: '🎭', word: 'Maske' },
    { emoji: '🤡', word: 'Clown' },
    { emoji: '🎪', word: 'Zirkus' },
    { emoji: '🎊', word: 'Konfetti' },
    { emoji: '🎨', word: 'Farbe' },
    { emoji: '🎯', word: 'Ziel' },
  ];
  const [gameActive, setGameActive] = useState(false);
  const [currentCard, setCurrentCard] = useState<typeof cards[0] | null>(null);
  const [round, setRound] = useState(0);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (!open) {
      setGameActive(false);
      setCurrentCard(null);
      setRound(0);
      setShowCard(false);
      return;
    }
  }, [open]);

  const startGame = () => {
    setGameActive(true);
    setRound(0);
    nextCard();
  };

  const nextCard = () => {
    if (round >= 6) {
      setGameActive(false);
      return;
    }
    const card = cards[Math.floor(Math.random() * cards.length)];
    setCurrentCard(card);
    setShowCard(true);
    setRound(prev => prev + 1);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center', fontSize: '1.5rem' }}>
        🤡 Stille Post mit Karten
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 500 }}>
        {!gameActive && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Stille Post!</Typography>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Eine Person sieht die Karte und flüstert das Wort weiter!
            </Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}>
              Spiel starten!
            </Button>
          </Box>
        )}
        {gameActive && showCard && currentCard && (
          <>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Runde {round} / 6
            </Typography>
            <Box sx={{ my: 4, p: 4, bgcolor: '#f5f5f5', borderRadius: 3, border: '3px solid #FF1493' }}>
              <Typography variant="h1" sx={{ mb: 3, fontSize: '6rem' }}>
                {currentCard.emoji}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#FF1493', mb: 2 }}>
                {currentCard.word}
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Flüstere dieses Wort der nächsten Person zu!
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  setShowCard(false);
                  setTimeout(() => {
                    if (round < 6) {
                      nextCard();
                    } else {
                      setGameActive(false);
                    }
                  }, 2000);
                }}
                sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}
              >
                Weiter
              </Button>
            </Box>
          </>
        )}
        {gameActive && !showCard && (
          <Box sx={{ my: 4 }}>
            <Typography variant="h4" sx={{ mb: 2 }}>Warte...</Typography>
            <Typography variant="h6">Die nächste Person bereitet sich vor...</Typography>
          </Box>
        )}
        {!gameActive && round >= 6 && (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>🎉 Spiel beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 3 }}>Ihr habt alle 6 Runden geschafft!</Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', mr: 1, fontSize: '1.1rem' }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ fontSize: '1.1rem' }}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Bewegungs-Challenge - Gruppenspiel (für ganze Klasse)
const GroupDiceModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const challenges = [
    { emoji: '🕺', task: 'Tanzt alle zusammen!' },
    { emoji: '👯', task: 'Macht alle eine Synchron-Bewegung!' },
    { emoji: '🤸', task: 'Macht alle einen Handstand (oder versucht es)!' },
    { emoji: '💃', task: 'Tanzt alle wie ein Clown!' },
    { emoji: '🎪', task: 'Macht alle eine Zirkus-Pose!' },
    { emoji: '🎭', task: 'Spielt alle eine Szene nach!' },
  ];
  const [gameActive, setGameActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<typeof challenges[0] | null>(null);
  const [round, setRound] = useState(0);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      setGameActive(false);
      setIsPlaying(false);
      setCurrentChallenge(null);
      setRound(0);
      if (audioRef) {
        audioRef.pause();
        setAudioRef(null);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
  }, [open]);

  const startGame = () => {
    setGameActive(true);
    setRound(0);
    playMusic();
  };

  const playMusic = () => {
    setIsPlaying(true);
    setCurrentChallenge(null);
    const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3');
    audio.loop = true;
    audio.play().catch(() => {
      setIsPlaying(false);
    });
    setAudioRef(audio);
    
    const stopTime = Math.random() * 4000 + 4000;
    timerRef.current = setTimeout(() => {
      audio.pause();
      setIsPlaying(false);
      const challenge = challenges[Math.floor(Math.random() * challenges.length)];
      setCurrentChallenge(challenge);
      setRound(prev => prev + 1);
    }, stopTime);
  };

  const nextRound = () => {
    if (round >= 8) {
      setGameActive(false);
      return;
    }
    setTimeout(() => playMusic(), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center', fontSize: '1.5rem' }}>
        🎲 Bewegungs-Challenge
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 500 }}>
        {!gameActive && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Bewegungs-Challenge!</Typography>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Musik spielt, stoppt, dann kommt eine Bewegungsaufgabe!
            </Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}>
              Challenge starten!
            </Button>
          </Box>
        )}
        {gameActive && (
          <>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Runde {round} / 8
            </Typography>
            {isPlaying && (
              <Box sx={{ my: 4 }}>
                <Typography variant="h2" sx={{ mb: 2, fontSize: '4rem' }}>🎵</Typography>
                <Typography variant="h4" sx={{ mb: 2 }}>Musik läuft...</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>Bewegt euch zur Musik!</Typography>
                <CircularProgress size={60} />
              </Box>
            )}
            {currentChallenge && !isPlaying && (
              <Box sx={{ my: 4, p: 4, bgcolor: '#f5f5f5', borderRadius: 3, border: '3px solid #FF1493' }}>
                <Typography variant="h1" sx={{ mb: 3, fontSize: '6rem' }}>
                  {currentChallenge.emoji}
                </Typography>
                <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, color: '#FF1493' }}>
                  {currentChallenge.task}
                </Typography>
                <Button
                  variant="contained"
                  onClick={nextRound}
                  sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}
                >
                  Weiter
                </Button>
              </Box>
            )}
          </>
        )}
        {!gameActive && round >= 8 && (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>🎉 Challenge beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 3 }}>Ihr habt alle 8 Runden geschafft!</Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', mr: 1, fontSize: '1.1rem' }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ fontSize: '1.1rem' }}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Karnevalsumzug - Gruppenspiel (für ganze Klasse)
const CarnivalParadeModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const paradeFloats = [
    { emoji: '🎪', name: 'Zirkus-Wagen', action: 'Macht Zirkus-Gesten!' },
    { emoji: '🤡', name: 'Clown-Wagen', action: 'Macht Clown-Gesichter!' },
    { emoji: '🎭', name: 'Theater-Wagen', action: 'Spielt eine Szene!' },
    { emoji: '🎨', name: 'Kunst-Wagen', action: 'Malt in der Luft!' },
    { emoji: '🎺', name: 'Musik-Wagen', action: 'Spielt Luft-Instrumente!' },
    { emoji: '👑', name: 'Königs-Wagen', action: 'Winkt wie Könige!' },
    { emoji: '🦁', name: 'Tier-Wagen', action: 'Macht Tiergeräusche!' },
    { emoji: '🎈', name: 'Ballon-Wagen', action: 'Springt wie Ballons!' },
  ];
  const [gameActive, setGameActive] = useState(false);
  const [currentFloat, setCurrentFloat] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [showAction, setShowAction] = useState(false);

  useEffect(() => {
    if (!open) {
      setGameActive(false);
      setCurrentFloat(0);
      setIsMoving(false);
      setShowAction(false);
      return;
    }
  }, [open]);

  const startGame = () => {
    setGameActive(true);
    setCurrentFloat(0);
    setIsMoving(true);
    setShowAction(false);
    nextFloat();
  };

  const nextFloat = () => {
    if (currentFloat >= paradeFloats.length) {
      setGameActive(false);
      return;
    }
    setIsMoving(true);
    setShowAction(false);
    setTimeout(() => {
      setIsMoving(false);
      setShowAction(true);
    }, 2000);
  };

  const continueParade = () => {
    setCurrentFloat(prev => prev + 1);
    if (currentFloat + 1 < paradeFloats.length) {
      nextFloat();
    } else {
      setGameActive(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center', fontSize: '1.5rem' }}>
        🎪 Karnevalsumzug
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 500 }}>
        {!gameActive && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Karnevalsumzug!</Typography>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Spielt einen Karnevalsumzug nach! Verschiedene Wagen kommen vorbei!
            </Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}>
              Umzug starten!
            </Button>
          </Box>
        )}
        {gameActive && (
          <>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Wagen {currentFloat + 1} / {paradeFloats.length}
            </Typography>
            {isMoving && (
              <Box sx={{ my: 4 }}>
                <Typography variant="h1" sx={{ mb: 2, fontSize: '8rem', animation: 'moveRight 2s linear' }}>
                  {currentFloat < paradeFloats.length ? paradeFloats[currentFloat].emoji : '🎉'}
                </Typography>
                <Typography variant="h4" sx={{ mb: 2 }}>
                  {currentFloat < paradeFloats.length ? paradeFloats[currentFloat].name : 'Ende'}
                </Typography>
                <Typography variant="h6">Der Wagen kommt...</Typography>
                <style>{`
                  @keyframes moveRight {
                    0% { transform: translateX(-100px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(100px); opacity: 0; }
                  }
                `}</style>
              </Box>
            )}
            {showAction && currentFloat < paradeFloats.length && (
              <Box sx={{ my: 4, p: 4, bgcolor: '#f5f5f5', borderRadius: 3, border: '3px solid #FF1493' }}>
                <Typography variant="h1" sx={{ mb: 3, fontSize: '10rem' }}>
                  {paradeFloats[currentFloat].emoji}
                </Typography>
                <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, color: '#FF1493' }}>
                  {paradeFloats[currentFloat].action}
                </Typography>
                <Button
                  variant="contained"
                  onClick={continueParade}
                  size="small"
                  sx={{ bgcolor: '#FF1493', fontSize: '0.7rem', py: 0.5, px: 1.5, minWidth: 'auto' }}
                >
                  Weiter
                </Button>
              </Box>
            )}
          </>
        )}
        {!gameActive && currentFloat >= paradeFloats.length && (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>🎉 Umzug beendet!</Typography>
            <Typography variant="h5" sx={{ mb: 3 }}>Der Karnevalsumzug ist vorbei!</Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', mr: 1, fontSize: '1.1rem' }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ fontSize: '1.1rem' }}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Luftschlangen-Rhythmus-Spiel - Gruppenspiel (für ganze Klasse)
const StreamerGameModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const colorActions = [
    { color: '#FF1493', emoji: '👏', action: 'Klatscht zusammen!' },
    { color: '#FFD700', emoji: '🦶', action: 'Stampft mit den Füßen!' },
    { color: '#00CED1', emoji: '👋', action: 'Winkt in die Luft!' },
    { color: '#FF6347', emoji: '🎉', action: 'Ruft "Hurra!"!' },
    { color: '#9370DB', emoji: '🎊', action: 'Macht eine Welle!' },
    { color: '#FF69B4', emoji: '🤡', action: 'Macht einen Clown-Gesicht!' },
  ];

  const [gameActive, setGameActive] = useState(false);
  const [round, setRound] = useState(0);
  const [currentAction, setCurrentAction] = useState<typeof colorActions[0] | null>(null);
  const [showAction, setShowAction] = useState(false);
  const [score, setScore] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const actionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      setGameActive(false);
      setRound(0);
      setCurrentAction(null);
      setShowAction(false);
      setScore(0);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (actionTimerRef.current) {
        clearTimeout(actionTimerRef.current);
        actionTimerRef.current = null;
      }
      return;
    }
  }, [open]);

  const startGame = () => {
    setGameActive(true);
    setRound(0);
    setScore(0);
    nextAction();
  };

  const nextAction = () => {
    if (round >= 15) {
      setGameActive(false);
      return;
    }

    // Warte kurz, dann zeige die nächste Aktion
    timerRef.current = setTimeout(() => {
      const randomAction = colorActions[Math.floor(Math.random() * colorActions.length)];
      setCurrentAction(randomAction);
      setShowAction(true);
      setRound(prev => prev + 1);

      // Zeige die Aktion für 3-5 Sekunden
      const showDuration = 3000 + Math.random() * 2000;
      actionTimerRef.current = setTimeout(() => {
        setShowAction(false);
        // Kurze Pause, dann nächste Aktion
        timerRef.current = setTimeout(() => {
          nextAction();
        }, 1000);
      }, showDuration);
    }, 1500);
  };

  const handleActionDone = () => {
    if (!showAction || !currentAction) return;
    setScore(prev => prev + 1);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center', fontSize: '1.5rem' }}>
        🎊 Luftschlangen-Rhythmus
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 500 }}>
        {!gameActive && round === 0 && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Luftschlangen-Rhythmus!</Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Luftschlangen erscheinen in verschiedenen Farben.
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: '#666' }}>
              Jede Farbe steht für eine Aktion, die die ganze Klasse zusammen machen soll!
            </Typography>
            <Box sx={{ mb: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              {colorActions.map((ca, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ width: 40, height: 8, bgcolor: ca.color, borderRadius: 1 }} />
                  <Typography variant="body1">{ca.emoji} {ca.action}</Typography>
                </Box>
              ))}
            </Box>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}>
              Spiel starten!
            </Button>
          </Box>
        )}
        {gameActive && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 3 }}>
              <Typography variant="h5">Runde: {round} / 15</Typography>
              <Typography variant="h5">Punkte: {score}</Typography>
            </Box>
            {!showAction && (
              <Box sx={{ my: 8 }}>
                <Typography variant="h3" sx={{ mb: 2 }}>🎵</Typography>
                <Typography variant="h5">Bereit für die nächste Aktion...</Typography>
              </Box>
            )}
            {showAction && currentAction && (
              <Box sx={{ my: 4 }}>
                <Box
                  sx={{
                    width: '100%',
                    height: 120,
                    bgcolor: currentAction.color,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                    animation: 'pulse 1s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.05)' }
                    }
                  }}
                >
                  <Typography variant="h1" sx={{ fontSize: '8rem', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    🎊
                  </Typography>
                </Box>
                <Typography variant="h1" sx={{ mb: 2, fontSize: '6rem' }}>
                  {currentAction.emoji}
                </Typography>
                <Typography variant="h3" sx={{ mb: 4, fontWeight: 700, color: '#FF1493' }}>
                  {currentAction.action}
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleActionDone}
                  size="small"
                  sx={{
                    bgcolor: '#FF1493',
                    fontSize: '0.7rem',
                    py: 0.5,
                    px: 1.5,
                    minWidth: 'auto'
                  }}
                >
                  Weiter
                </Button>
              </Box>
            )}
          </>
        )}
        {!gameActive && round >= 15 && (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>🎉 Spiel beendet!</Typography>
            <Typography variant="h4" sx={{ mb: 2 }}>Punkte: {score} / {round}</Typography>
            <Typography variant="h5" sx={{ mb: 3 }}>
              {score >= round * 0.8 ? '🏆 Fantastisch! Perfekt synchron!' :
               score >= round * 0.6 ? '🎉 Sehr gut! Tolle Zusammenarbeit!' :
               score >= round * 0.4 ? '👍 Gut gemacht!' : '💪 Weiter so!'}
            </Typography>
            <Button variant="contained" onClick={startGame} sx={{ bgcolor: '#FF1493', mr: 1, fontSize: '1.1rem' }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ fontSize: '1.1rem' }}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Luftballon-Spiel - Gruppenspiel (für ganze Klasse)
const BalloonGameModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [gameActive, setGameActive] = useState(false);
  const [balloons, setBalloons] = useState<Array<{id: number; x: number; y: number; color: string; speed: number}>>([]);
  const [popped, setPopped] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const balloonIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setGameActive(false);
      setBalloons([]);
      setPopped(0);
      setTimeLeft(60);
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
      setBalloons(prev => [
        ...prev,
        {
          id: balloonIdRef.current++,
          x: Math.random() * 100,
          y: 100,
          color: ['#FF1493', '#FF69B4', '#FFD700', '#FF6347', '#00CED1', '#9370DB', '#FF4500'][Math.floor(Math.random() * 7)],
          speed: Math.random() * 1 + 0.5
        }
      ]);
    }, 1500);
    return () => clearInterval(interval);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;
    const moveInterval = setInterval(() => {
      setBalloons(prev => prev.map(b => ({
        ...b,
        y: b.y - b.speed,
        x: b.x + (Math.random() - 0.5) * 0.3
      })).filter(b => b.y > -10));
    }, 50);
    return () => clearInterval(moveInterval);
  }, [gameActive]);

  const handleBalloonClick = (id: number) => {
    setBalloons(prev => prev.filter(b => b.id !== id));
    setPopped(prev => prev + 1);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: '#FF1493', color: 'white', textAlign: 'center', fontSize: '1.5rem' }}>
        🎈 Luftballon-Pop
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center', minHeight: 500 }}>
        {!gameActive && timeLeft === 60 && (
          <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>🎉 Luftballon-Pop!</Typography>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Popst so viele Luftballons wie möglich, bevor sie oben verschwinden!
            </Typography>
            <Button variant="contained" onClick={() => setGameActive(true)} sx={{ bgcolor: '#FF1493', fontSize: '1.2rem', py: 1.5, px: 4 }}>
              Spiel starten!
            </Button>
          </Box>
        )}
        {gameActive && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 3 }}>
              <Typography variant="h4">⏰ Zeit: {timeLeft}s</Typography>
              <Typography variant="h4">💥 Gepoppt: {popped}</Typography>
            </Box>
            <Box sx={{ position: 'relative', width: '100%', height: 400, border: '3px solid #FF1493', borderRadius: 2, overflow: 'hidden', bgcolor: '#e3f2fd' }}>
              {balloons.map(b => (
                <Box
                  key={b.id}
                  onClick={() => handleBalloonClick(b.id)}
                  sx={{
                    position: 'absolute',
                    left: `${Math.max(0, Math.min(100, b.x))}%`,
                    top: `${Math.max(0, Math.min(100, b.y))}%`,
                    width: 50,
                    height: 60,
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                    '&:hover': { transform: 'scale(1.1)' }
                  }}
                >
                  <svg width="50" height="60" viewBox="0 0 50 60">
                    <ellipse cx="25" cy="35" rx="20" ry="25" fill={b.color} stroke="#fff" strokeWidth="2" />
                    <path d="M 25 10 L 25 35" stroke="#333" strokeWidth="2" />
                    <circle cx="25" cy="35" r="3" fill="rgba(255,255,255,0.5)" />
                  </svg>
                </Box>
              ))}
            </Box>
          </>
        )}
        {!gameActive && timeLeft === 0 && (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>🎉 Spiel beendet!</Typography>
            <Typography variant="h4" sx={{ mb: 2 }}>Gepoppte Ballons: {popped}</Typography>
            <Typography variant="h5" sx={{ mb: 3 }}>
              {popped >= 40 ? '🏆 Fantastisch! So viele Ballons!' :
               popped >= 25 ? '🎉 Sehr gut! Tolle Ballon-Popper!' :
               popped >= 15 ? '👍 Gut gemacht!' : '💪 Weiter so!'}
            </Typography>
            <Button variant="contained" onClick={() => { setTimeLeft(60); setBalloons([]); setPopped(0); setGameActive(true); }} sx={{ bgcolor: '#FF1493', mr: 1, fontSize: '1.1rem' }}>
              Nochmal spielen
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ fontSize: '1.1rem' }}>
              Schließen
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ userId, onLogout }) => {
  const navigate = useNavigate();
  const subjectManagerRef = useRef<any>(null);
  const materialCreatorRef = useRef<any>(null);
  const isAddingStudentsRef = useRef(false);
  
  // Debug: Log userId
  
  const [groups, setGroups] = useState<LearningGroup[]>([]);
  const [teacherName, setTeacherName] = useState<string>('');
  const [subjectTabValue, setSubjectTabValue] = useState(0);
  const [blockTabValue, setBlockTabValue] = useState(0);
  useEffect(() => {
    setBlockTabValue(0);
  }, [subjectTabValue]);

  // Load teacher name from database
  useEffect(() => {
    const fetchTeacherName = async () => {
      try {
        const response = await fetch('/api/users/me', {
          headers: {
            'x-login-code': localStorage.getItem('loginCode') || ''
          }
        });
        if (response.ok) {
          const user = await response.json();
          setTeacherName(user.name || '');
        }
      } catch (error) {
        console.error('Error fetching teacher name:', error);
      }
    };
    fetchTeacherName();
  }, []);

  // Format name to show only first name and last name (without middle names)
  const formatStudentName = (fullName: string): string => {
    if (!fullName || !fullName.trim()) return '';
    const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    // Return first name + last name (skip middle names)
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  // Extract initials from name (first letter of first name and last name, ignoring titles)
  const getInitials = (name: string): string => {
    if (!name || !name.trim()) return '';
    const words = name.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return '';
    
    // Filter out common titles
    const titles = ['frau', 'herr', 'dr', 'prof', 'prof.'];
    const nameWords = words.filter(word => {
      const normalized = word.toLowerCase().replace('.', '').trim();
      return !titles.includes(normalized);
    });
    
    // Special case: If name is "Frau Christ" or just "Christ", use "Vera" as first name
    if (nameWords.length === 1 && nameWords[0].toLowerCase() === 'christ') {
      return 'VC'; // Vera Christ
    }
    
    // If we have at least 2 name words (after filtering titles), use first and last
    if (nameWords.length >= 2) {
      const firstInitial = nameWords[0].charAt(0).toUpperCase();
      const lastInitial = nameWords[nameWords.length - 1].charAt(0).toUpperCase();
      return firstInitial + lastInitial;
    }
    
    // If we have only 1 name word, try to use first and last word of original (might be title + name)
    if (words.length >= 2) {
      const firstInitial = words[0].charAt(0).toUpperCase();
      const lastInitial = words[words.length - 1].charAt(0).toUpperCase();
      // If the result would be "FC" (Frau Christ), use "VC" instead (Vera Christ)
      if (firstInitial === 'F' && lastInitial === 'C') {
        return 'VC';
      }
      return firstInitial + lastInitial;
    }
    
    // Fallback: single word - use first letter twice
    if (words.length === 1) {
      const letter = words[0].charAt(0).toUpperCase();
      return letter + letter;
    }
    
    return '';
  };

  // Wenn genau 2 Fächer vorhanden sind, automatisch mit rechtem (Informatik) starten
  useEffect(() => {
    // Warten bis subjects-State existiert (weiter unten deklariert)
    // Dieser Effekt wird nach der Erst-Initialisierung erneut getriggert
  }, []);
  // Track which groups are expanded (default: expanded)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Track which groups' student lists are expanded (default: collapsed)
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  // Ensure newly loaded groups get a default expanded state
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    setExpandedGroups(prev => {
      const next: Record<string, boolean> = { ...prev };
      for (const g of groups) {
        if (next[g.id] === undefined) {
          next[g.id] = false; // alle standardmäßig eingeklappt
        }
      }
      return next;
    });
    // Initialize student lists as collapsed by default
    setExpandedStudents(prev => {
      const next: Record<string, boolean> = { ...prev };
      for (const g of groups) {
        if (next[g.id] === undefined) {
          next[g.id] = false; // default collapsed
        }
      }
      return next;
    });
  }, [groups]);



  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !(prev[groupId] ?? false) }));
  };

  const toggleStudentsExpanded = (groupId: string) => {
    setExpandedStudents(prev => ({ ...prev, [groupId]: !(prev[groupId] ?? false) }));
  };
  const [openNewGroupDialog, setOpenNewGroupDialog] = useState(false);
  const [openAddStudentsDialog, setOpenAddStudentsDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [mainTabValue, setMainTabValue] = useState(0);
  const [lessonMaterials, setLessonMaterials] = useState<{[key: string]: any[]}>({});
  const [lessonQuizzes, setLessonQuizzes] = useState<{[key: string]: any}>({});

  // Im TeacherDashboard State:
  const [subjectAssignments, setSubjectAssignments] = useState<{ [subjectId: string]: string[] }>({});
  const [blockAssignments, setBlockAssignments] = useState<{ [blockId: string]: string[] }>({});
  const [unitAssignments, setUnitAssignments] = useState<{ [unitId: string]: string[] }>({});
  const [topicAssignments, setTopicAssignments] = useState<{ [unitId: string]: string[] }>({});
  const [lessonAssignments, setLessonAssignments] = useState<{ [lessonId: string]: string[] }>({});
  // Listen für Namen
  const [subjects, setSubjects] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [confirmDelete1, setConfirmDelete1] = useState(false);
  const [confirmDelete2, setConfirmDelete2] = useState(false);
  const [confirmDeleteWord, setConfirmDeleteWord] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  
  // Flashcard Progress State
  const [studentFlashcardStats, setStudentFlashcardStats] = useState<Record<string, StudentFlashcardStats>>({});
  const [flashcardStatsLoading, setFlashcardStatsLoading] = useState<Record<string, boolean>>({});
  const [gradingGroupId, setGradingGroupId] = useState<string | null>(null);
  const [gradingGroupName, setGradingGroupName] = useState('');
  const [gradesModalOpen, setGradesModalOpen] = useState(false);
  const [gradesGroupId, setGradesGroupId] = useState<string | null>(null);
  const [gradesGroupName, setGradesGroupName] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Flashcard States
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [openNewDeckDialog, setOpenNewDeckDialog] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  
  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');
  
  // Flashcard Management States
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [draggedCard, setDraggedCard] = useState<Flashcard | null>(null);

  // Document Processing History States
  const [documentHistoryMap, setDocumentHistoryMap] = useState<{[key: string]: DocumentProcessingHistory[]}>({});


  // Menü pro Schüler
  const [studentMenuAnchorEl, setStudentMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [studentMenuCtx, setStudentMenuCtx] = useState<null | { groupId: string; student: Student }>(null);
  
  // Abgabestatistik für Schüler
  const [showStudentSubmissionStats, setShowStudentSubmissionStats] = useState(false);
  const [selectedStudentForStats, setSelectedStudentForStats] = useState<Student | null>(null);
  const [studentSubmissionStats, setStudentSubmissionStats] = useState<any[]>([]);
  
  // Student removal confirmation
  const [removeStudentDialogOpen, setRemoveStudentDialogOpen] = useState(false);
  const [removeStudentCtx, setRemoveStudentCtx] = useState<{ groupId: string; student: Student } | null>(null);
  const [confirmRemoveStudent1, setConfirmRemoveStudent1] = useState(false);
  const [confirmRemoveStudent2, setConfirmRemoveStudent2] = useState(false);
  const [confirmRemoveStudentWord, setConfirmRemoveStudentWord] = useState('');

  // Mini-Noten Cache: key = `${groupId}:${studentId}`
  const [miniGradesMap, setMiniGradesMap] = useState<{ [key: string]: { loading: boolean; gradingSystem: string; overall?: number | null; nodes: MiniGradeNode[] } }>({});

  // Neue States für echte Ordner-Vorschau
  const [assignedFolderContents, setAssignedFolderContents] = useState<{[key: string]: any[]}>({});
  const [expandedAssignedFolders, setExpandedAssignedFolders] = useState<{[key: string]: Set<string>}>({});
  const [loadingFolderContents, setLoadingFolderContents] = useState<{[key: string]: boolean}>({});
  
  // States für zugeordnete Karteikarten-Decks
  const [assignedFlashcardDecks, setAssignedFlashcardDecks] = useState<{[groupId: string]: FlashcardDeck[]}>({});
  const [loadingFlashcardDecks, setLoadingFlashcardDecks] = useState<{[groupId: string]: boolean}>({});
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [selectedFlashcardDeck, setSelectedFlashcardDeck] = useState<FlashcardDeck | null>(null);

  // Submission States (Abgabesystem für H_ Dateien)
  const [showSubmissionViewer, setShowSubmissionViewer] = useState(false);
  const [selectedSubmissionFile, setSelectedSubmissionFile] = useState<any>(null);
  const [submissionCounts, setSubmissionCounts] = useState<{[filePath: string]: number}>({});
  
  // KA Korrekturmodus States
  const [showKACorrectionMode, setShowKACorrectionMode] = useState(false);
  const [selectedKAFilePath, setSelectedKAFilePath] = useState<string>('');
  const [showTeacherMessageBox, setShowTeacherMessageBox] = useState(false);
  const [showRiddleOverview, setShowRiddleOverview] = useState(false);
  const [showCarnivalGames, setShowCarnivalGames] = useState(false);
  // Modal für Unterrichtsstunde (Anweisungen, Folien, AB)
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [lessonModalData, setLessonModalData] = useState<{
    lessonName: string;
    lessonPath: string;
    children: any[];
    groupId: string;
  } | null>(null);
  const [voraussetzungenGlossarOpen, setVoraussetzungenGlossarOpen] = useState(false);
  const [geheimtexteOpen, setGeheimtexteOpen] = useState(false);
  // Bearbeitbare Stunden-Texte: pro Stunde (lessonPath) Overrides für die farbigen Boxen – werden persistent gespeichert
  type LessonBoxField = 'voraussetzungen' | 'materialliste' | 'anweisungen' | 'abAnleitung' | 'geheimtexte';
  const [editedLessonInstructions, setEditedLessonInstructions] = useState<Record<string, Partial<Record<LessonBoxField, string>>>>({});
  const [lessonBoxEdit, setLessonBoxEdit] = useState<{ lessonName: string; lessonPath: string; section: LessonBoxField; draft: string; originalDraft: string } | null>(null);
  const [showConfettiGame, setShowConfettiGame] = useState(false);
  const [showMaskMemory, setShowMaskMemory] = useState(false);
  const [showFoolQuiz, setShowFoolQuiz] = useState(false);
  const [showCarnivalDice, setShowCarnivalDice] = useState(false);
  const [showSongGuess, setShowSongGuess] = useState(false);
  const [showGroupConfetti, setShowGroupConfetti] = useState(false);
  const [showGroupMemory, setShowGroupMemory] = useState(false);
  const [showGroupQuiz, setShowGroupQuiz] = useState(false);
  const [showGroupDice, setShowGroupDice] = useState(false);
  const [showCarnivalParade, setShowCarnivalParade] = useState(false);
  const [showStreamerGame, setShowStreamerGame] = useState(false);
  const [showBalloonGame, setShowBalloonGame] = useState(false);
  const [showMinigame, setShowMinigame] = useState(false);
  const [selectedMinigameDifficulty, setSelectedMinigameDifficulty] = useState<'easy' | 'hard'>('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [balloons, setBalloons] = useState<Array<{id: number; x: number; key: 'f' | 'j' | 'd' | 'k'; caught: boolean; spawnTime: number}>>([]);
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(60);
  const [nextKey, setNextKey] = useState<'f' | 'j' | 'd' | 'k'>('f');
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const [gamePaused, setGamePaused] = useState(false);
  const gamePausedRef = useRef(false);
  const [holdMessage, setHoldMessage] = useState('');
  const [animationFrame, setAnimationFrame] = useState(0);
  const [requiredKey, setRequiredKey] = useState<'f' | 'j' | null>(null); // Welche Taste muss im Hard-Modus gedrückt werden
  const pauseStartTimeRef = useRef<number>(0); // Wann wurde pausiert (für korrekte Fall-Distanz-Berechnung)
  const totalPausedTimeRef = useRef<number>(0); // Gesamte pausierte Zeit

  // Helper-Funktion für Datum
  const getDateKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Minigame-Logik für Lehrer
  useEffect(() => {
    if (!gameStarted) return;

    // Timer
    const timer = setInterval(() => {
      setGameTime((prev) => {
        if (prev <= 1) {
          // Spiel erfolgreich beendet - Gewonnen!
          setGameStarted(false);
          setGameWon(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Luftballons spawnen
    const balloonInterval = setInterval(() => {
      // Im Hard-Modus: Prüfe ob Spiel pausiert ist
      if (selectedMinigameDifficulty === 'hard' && gamePausedRef.current) {
        return; // Keine Ballons spawnen wenn pausiert
      }
      
      if (selectedMinigameDifficulty === 'easy') {
        // Easy-Modus: Normale Logik - F und J Ballons
        let balloonKey: 'f' | 'j' = Math.random() > 0.5 ? 'f' : 'j';
        const newBalloon = {
          id: Date.now() + Math.random(),
          x: Math.random() * 80 + 10,
          key: balloonKey,
          caught: false,
          spawnTime: Date.now()
        };
        setBalloons((prev) => {
          const updated = [...prev, newBalloon];
          const firstUncaught = updated.find(b => !b.caught);
          if (firstUncaught) {
            setNextKey(firstUncaught.key);
          }
          return updated;
        });
      } else {
        // Hard-Modus: Ballons nur wenn die erforderliche Taste (F oder J) gedrückt gehalten wird
        const currentKeys = keysPressedRef.current;
        const requiredKeyValue = requiredKey;
        
        if (!requiredKeyValue) {
          // Noch keine erforderliche Taste gewählt - keine Ballons
          console.log('🎮 Balloon Spawn: Keine requiredKey');
          return;
        }
        
        // Prüfe ob die erforderliche Taste gedrückt ist
        if (!currentKeys.has(requiredKeyValue)) {
          // Erforderliche Taste nicht gedrückt - keine Ballons
          console.log('🎮 Balloon Spawn: Required key nicht gedrückt', { requiredKey: requiredKeyValue, currentKeys: Array.from(currentKeys), gamePaused: gamePausedRef.current });
          return;
        }
        
        // Prüfe ob Spiel pausiert ist
        if (gamePausedRef.current) {
          console.log('🎮 Balloon Spawn: Spiel pausiert');
          return;
        }
        
        console.log('🎮 Balloon Spawn: Versuche Ballon zu spawnen', { requiredKey: requiredKeyValue, currentKeys: Array.from(currentKeys) });
        
        // Bestimme welche Ballons spawnen dürfen basierend auf der gedrückten Taste
        let allowedKeys: ('f' | 'j' | 'd' | 'k')[] = [];
        if (requiredKeyValue === 'f') {
          // F gedrückt: D, J, K Ballons
          allowedKeys = ['d', 'j', 'k'];
        } else if (requiredKeyValue === 'j') {
          // J gedrückt: D, F, K Ballons
          allowedKeys = ['d', 'f', 'k'];
        }
        
        if (allowedKeys.length === 0) {
          return;
        }
        
        // Wähle zufälligen erlaubten Ballon
        const randomIndex = Math.floor(Math.random() * allowedKeys.length);
        const balloonKey = allowedKeys[randomIndex];
        
        const newBalloon = {
          id: Date.now() + Math.random(),
          x: Math.random() * 80 + 10,
          key: balloonKey,
          caught: false,
          spawnTime: Date.now()
        };
        setBalloons((prev) => {
          const updated = [...prev, newBalloon];
          const firstUncaught = updated.find(b => !b.caught);
          if (firstUncaught) {
            setNextKey(firstUncaught.key);
          }
          return updated;
        });
      }
    }, 800);

    // Prüfe auf Game Over
    const gameOverCheckInterval = setInterval(() => {
      setBalloons((prev) => {
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;
        const baseSpeed = 12;
        const speedMultiplier = 1 + (elapsedSeconds / 35) * 2;
        const currentSpeed = baseSpeed / speedMultiplier;
        
        // Im Hard-Modus: Berücksichtige Pause-Zeit
        const isPaused = selectedMinigameDifficulty === 'hard' && gamePausedRef.current;
        const effectiveAge = isPaused 
          ? (pauseStartTimeRef.current > 0 ? pauseStartTimeRef.current - startTime : 0)
          : (now - startTime) - totalPausedTimeRef.current;
        
        const updated = prev.map((balloon) => {
          if (balloon.caught) return balloon;
          
          // Berechne Fall-Distanz - wenn pausiert, verwende die Zeit bis zur Pause
          let balloonAge: number;
          if (isPaused && selectedMinigameDifficulty === 'hard') {
            // Im Hard-Modus: Wenn pausiert, verwende die Zeit bis zur Pause
            const pauseTime = pauseStartTimeRef.current > 0 ? pauseStartTimeRef.current : balloon.spawnTime;
            balloonAge = pauseTime - balloon.spawnTime;
          } else {
            // Normal: Alter des Ballons
            balloonAge = now - balloon.spawnTime;
          }
          
          const fallDistance = balloonAge / currentSpeed;
          if (fallDistance >= 410 && !balloon.caught) {
            setGameOver(true);
            setGameStarted(false);
            return balloon;
          }
          return balloon;
        });
        
        return updated.filter((balloon) => {
          if (balloon.caught) return false;
          const age = Date.now() - balloon.spawnTime;
          return age < 15000;
        });
      });
    }, 100);

    return () => {
      clearInterval(timer);
      clearInterval(balloonInterval);
      clearInterval(gameOverCheckInterval);
    };
  }, [gameStarted, selectedMinigameDifficulty, startTime, requiredKey, gamePaused]);

  // Animation-Frame
  useEffect(() => {
    if (!gameStarted) return;
    const animate = () => {
      setAnimationFrame((prev) => prev + 1);
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [gameStarted]);

  // Keyboard-Event-Handler für Minigame
  useEffect(() => {
    if (!gameStarted || !showMinigame) {
      console.log('🎮 Minigame: Handler nicht aktiv', { gameStarted, showMinigame });
      return;
    }

    console.log('🎮 Minigame: Handler wird registriert', { gameStarted, showMinigame, selectedMinigameDifficulty, requiredKey });

    const validKeys = selectedMinigameDifficulty === 'hard' ? ['f', 'j', 'd', 'k'] : ['f', 'j'];

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Nur für F und J interessieren
      if (key !== 'f' && key !== 'j') {
        return;
      }
      
      console.log('🎮 Minigame: KeyDown erkannt', { key, activeElement: document.activeElement?.tagName, activeElementType: document.activeElement?.getAttribute('type') });
      
      // Prüfe ob der Fokus in einem Input-Feld ist (nur wenn wirklich aktiv und editierbar)
      const activeElement = document.activeElement;
      const isInInput = activeElement && (
        (activeElement.tagName === 'INPUT' && (activeElement as HTMLInputElement).type !== 'button' && (activeElement as HTMLInputElement).type !== 'submit') ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable === true
      );
      
      if (isInInput) {
        console.log('🎮 Minigame: In Input-Feld - ignoriere', { tagName: activeElement?.tagName, type: (activeElement as HTMLInputElement)?.type });
        return;
      }
      
      // Verhindere Default-Verhalten und Propagation
        e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Verhindere wiederholtes Auslösen bei gehaltener Taste
      if (keysPressedRef.current.has(key)) {
        console.log('🎮 Minigame: Taste bereits gedrückt - ignoriere wiederholtes Event', { key });
        return; // Taste ist bereits gedrückt, ignoriere
      }
      
      console.log('🎮 Minigame: Taste registriert', { key, difficulty: selectedMinigameDifficulty, requiredKey });
        keysPressedRef.current.add(key);
        
      // Im Easy-Modus: Einmaliges Drücken fängt nur den ersten passenden Ballon
        if (selectedMinigameDifficulty === 'easy') {
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
            setScore((s) => s + 1);
            return prev.map((balloon) => 
              balloon.id === matchingBalloon.id 
                ? { ...balloon, caught: true }
                : balloon
            );
          }
          
          return prev;
          });
          // WICHTIG: Sofort returnen, damit kein weiterer Ballon gefangen wird
          return;
        } else {
        // Hard-Modus: Prüfe ob die richtige Taste gedrückt wurde
        if (requiredKey && key === requiredKey) {
          // Richtige Taste gedrückt -> Spiel fortsetzen
          if (gamePausedRef.current && pauseStartTimeRef.current > 0) {
            // Addiere die Pause-Zeit zur Gesamt-Pause-Zeit
            const pauseDuration = Date.now() - pauseStartTimeRef.current;
            totalPausedTimeRef.current += pauseDuration;
            pauseStartTimeRef.current = 0;
          }
          setHoldMessage('');
          setGamePaused(false);
          gamePausedRef.current = false;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Nur für F und J interessieren
      if (key !== 'f' && key !== 'j') {
        return;
      }
      
      // Prüfe ob der Fokus in einem Input-Feld ist (nur wenn wirklich aktiv und editierbar)
      const activeElement = document.activeElement;
      const isInInput = activeElement && (
        (activeElement.tagName === 'INPUT' && (activeElement as HTMLInputElement).type !== 'button' && (activeElement as HTMLInputElement).type !== 'submit') ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable === true
      );
      
      if (isInInput) {
        return;
      }
      
      // Verhindere Default-Verhalten und Propagation
        e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Entferne nur wenn wirklich gedrückt war
      if (keysPressedRef.current.has(key)) {
        keysPressedRef.current.delete(key);
        
        // Im Hard-Modus: Wenn die erforderliche Taste losgelassen wird, pausieren
        if (selectedMinigameDifficulty === 'hard' && requiredKey && key === requiredKey) {
            setGamePaused(true);
            gamePausedRef.current = true;
          pauseStartTimeRef.current = Date.now(); // Speichere Pause-Startzeit
          setHoldMessage(`Halte die ${requiredKey.toUpperCase()} Taste dauerhaft gedrückt`);
        }
      }
    };

    // Im Hard-Modus: Prüfe kontinuierlich ob Ballons gefangen werden können
    // WICHTIG: Nur ein Ballon pro Check-Intervall!
    const checkInterval = selectedMinigameDifficulty === 'hard' ? setInterval(() => {
      setBalloons((prev) => {
        const currentKeys = keysPressedRef.current;
        
        const uncaughtBalloons = prev.filter(b => !b.caught);
        // Finde den ersten passenden Ballon (der älteste, der noch nicht gefangen ist)
        // Sortiere nach spawnTime, um den ältesten zuerst zu nehmen
        const sortedUncaught = prev
          .filter(b => !b.caught)
          .sort((a, b) => a.spawnTime - b.spawnTime);
        
        if (sortedUncaught.length === 0) {
          // Keine Ballons vorhanden - keine Aktion nötig
          return prev;
        }
        
        console.log('🎮 Minigame: CheckInterval', { 
          currentKeys: Array.from(currentKeys), 
          balloonCount: uncaughtBalloons.length,
          balloonKeys: uncaughtBalloons.map(b => b.key),
          requiredKey,
          gamePaused: gamePausedRef.current,
          firstBallonKey: sortedUncaught[0]?.key
        });
        
        let caughtOne = false;
        const updated = prev.map((balloon) => {
          if (balloon.caught || caughtOne) return balloon;
          
          // Prüfe ob dieser Ballon gefangen werden kann
          let shouldCatch = false;
          
          // F-Ballon: F muss gedrückt sein
          if (balloon.key === 'f' && currentKeys.has('f')) {
            shouldCatch = true;
          }
          // J-Ballon: J muss gedrückt sein
          else if (balloon.key === 'j' && currentKeys.has('j')) {
            shouldCatch = true;
          }
          // D-Ballon: F muss gedrückt sein
          else if (balloon.key === 'd' && currentKeys.has('f')) {
            shouldCatch = true;
          }
          // K-Ballon: J muss gedrückt sein
          else if (balloon.key === 'k' && currentKeys.has('j')) {
            shouldCatch = true;
          }
          
          if (shouldCatch) {
            // Nur den ersten passenden Ballon fangen
            const isFirstMatching = sortedUncaught[0]?.id === balloon.id;
            if (isFirstMatching) {
              caughtOne = true;
              console.log('🎮 Minigame: Ballon gefangen!', { balloonKey: balloon.key, currentKeys: Array.from(currentKeys) });
            setScore((s) => s + 1);
            return { ...balloon, caught: true };
            }
          }
          
          return balloon;
        });
        
        // Prüfe ob die erforderliche Taste noch gedrückt ist
        if (requiredKey && !currentKeys.has(requiredKey)) {
          if (!gamePausedRef.current) {
          setGamePaused(true);
          gamePausedRef.current = true;
            pauseStartTimeRef.current = Date.now();
            setHoldMessage(`Halte die ${requiredKey.toUpperCase()} Taste dauerhaft gedrückt`);
          }
        } else if (requiredKey && currentKeys.has(requiredKey)) {
          if (gamePausedRef.current && pauseStartTimeRef.current > 0) {
            // Addiere die Pause-Zeit zur Gesamt-Pause-Zeit
            const pauseDuration = Date.now() - pauseStartTimeRef.current;
            totalPausedTimeRef.current += pauseDuration;
            pauseStartTimeRef.current = 0;
          }
          setHoldMessage('');
          setGamePaused(false);
          gamePausedRef.current = false;
        }
        
        const remainingBalloons = updated.filter(b => !b.caught);
        if (remainingBalloons.length > 0) {
          setNextKey(remainingBalloons[0].key);
        }
        
        return updated;
      });
    }, 100) : null;

    // Verwende capture: true, um Events früher abzufangen
    // Und { passive: false } um preventDefault() zu ermöglichen
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', handleKeyUp, { capture: true, passive: false });
    
    console.log('🎮 Minigame: Event-Listener registriert');
    
    // Reset keys when effect runs
    keysPressedRef.current.clear();
    if (selectedMinigameDifficulty === 'hard' && requiredKey) {
      setHoldMessage(`Halte die ${requiredKey.toUpperCase()} Taste dauerhaft gedrückt`);
      setGamePaused(true);
      gamePausedRef.current = true;
      pauseStartTimeRef.current = Date.now();
      totalPausedTimeRef.current = 0;
    } else {
      setHoldMessage('');
      setGamePaused(false);
      gamePausedRef.current = false;
      pauseStartTimeRef.current = 0;
      totalPausedTimeRef.current = 0;
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      if (checkInterval) clearInterval(checkInterval);
      keysPressedRef.current.clear();
      setHoldMessage('');
      setGamePaused(false);
      gamePausedRef.current = false;
      pauseStartTimeRef.current = 0;
      totalPausedTimeRef.current = 0;
    };
  }, [gameStarted, showMinigame, selectedMinigameDifficulty, requiredKey]);
  
  // Nachricht an Schüler senden
  const [showSendMessageDialog, setShowSendMessageDialog] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<Student | null>(null);
  const messageSubjectInputRef = useRef<HTMLInputElement>(null);

  // File Share States (Datei-Freigaben für Lerngruppen)
  const [fileShares, setFileShares] = useState<{[key: string]: boolean}>({});
  // Freigabe „Gemeinsame Eingabe“ pro Gruppe: [groupId] = Liste der freigegebenen lessonPath
  const [lessonSharedInputSharePaths, setLessonSharedInputSharePaths] = useState<{[groupId: string]: string[]}>({});

  // Mitarbeitsbewertung States
  const [participationModalOpen, setParticipationModalOpen] = useState(false);
  const [createExaminationModalOpen, setCreateExaminationModalOpen] = useState(false);
  const [examinationType, setExaminationType] = useState<'KA' | 'KU' | 'HU' | 'QZ' | ''>('QZ');
  const [examinationFileName, setExaminationFileName] = useState('');
  const [examinationFolderPath, setExaminationFolderPath] = useState('');
  const [examinationLearningGroupId, setExaminationLearningGroupId] = useState('');
  const [availableFolders, setAvailableFolders] = useState<Array<{ path: string; name: string }>>([]);
  const [folderTree, setFolderTree] = useState<any>(null);
  const [expandedFolderPaths, setExpandedFolderPaths] = useState<Set<string>>(new Set());
  const [examDurationMinutes, setExamDurationMinutes] = useState(5);
  const examinationFileNameInputRef = useRef<HTMLInputElement>(null);
  
  // Einzelfragen-Bearbeitung
  const [singleQuestionModalOpen, setSingleQuestionModalOpen] = useState(false);
  const [singleQuestionFilePath, setSingleQuestionFilePath] = useState<string>('');
  const [examinationQuestions, setExaminationQuestions] = useState<any[]>([]);
  const [examinationTitle, setExaminationTitle] = useState<string>('');
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [participationGroupId, setParticipationGroupId] = useState<string | null>(null);
  const [participationGroupName, setParticipationGroupName] = useState('');
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [participations, setParticipations] = useState<{[groupId: string]: {[lessonIndex: number]: {[studentId: string]: {value: number; comment?: string | null}}}}>({});
  const [statisticsModalOpen, setStatisticsModalOpen] = useState(false);
  const [participationStats, setParticipationStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const getDefaultExamDurationMinutes = (type: 'KA' | 'KU' | 'HU' | 'QZ' | '') => {
    switch (type) {
      case 'KU':
        return 90;
      case 'KA':
        return 60;
      case 'HU':
        return 15;
      case 'QZ':
        return 5;
      default:
        return 15;
    }
  };

  const getDefaultLearningGroupId = useCallback(() => {
    const defaultGroup = groups.find((group) =>
      group.name.toLowerCase().includes('klasse 7a')
    );
    return defaultGroup?.id || '';
  }, [groups]);

  useEffect(() => {
    if (!createExaminationModalOpen) return;
    if (!examinationLearningGroupId) {
      const defaultGroupId = getDefaultLearningGroupId();
      if (defaultGroupId) {
        setExaminationLearningGroupId(defaultGroupId);
      }
    }
  }, [createExaminationModalOpen, examinationLearningGroupId, getDefaultLearningGroupId]);
  
  // Sortiere participationStats nach Sitzordnung
  const sortedParticipationStats = useMemo(() => {
    if (!participationStats.length) return [];
    
    const getSeatingOrder = (fullName: string): number => {
      if (!fullName) return 999;
      const nameLower = fullName.toLowerCase().trim();
      
      // Mapping: vollständige Namen zu Sitzpositionen (von oben nach unten, links nach rechts)
      // Top Row
      if (nameLower.includes('robin') && nameLower.includes('maas')) return 1;
      if (nameLower.includes('felix') && nameLower.includes('schmelzlin')) return 2;
      
      // Row 1
      if (nameLower.includes('luise') && nameLower.includes('habach')) return 3;
      if (nameLower.includes('louis') && nameLower.includes('gerharz')) return 4;
      if (nameLower.includes('jonathan') && nameLower.includes('dillmann')) return 5;
      if (nameLower.includes('jan') && nameLower.includes('wimmershoff')) return 6;
      if ((nameLower.includes('miró') || nameLower.includes('miro')) && nameLower.includes('mohr')) return 7;
      if (nameLower.includes('killian') && nameLower.includes('jahnke')) return 8;
      
      // Row 2
      if (nameLower.includes('vincent') && nameLower.includes('schlag')) return 9;
      if (nameLower.includes('marlene') && nameLower.includes('geis')) return 10;
      if (nameLower.includes('adela') && (nameLower.includes('mureşan') || nameLower.includes('muresan'))) return 11;
      if (nameLower.includes('jakob') && nameLower.includes('ackermann')) return 12;
      if (nameLower.includes('nils') && (nameLower.includes('weiß') || nameLower.includes('weiss'))) return 13;
      if (nameLower.includes('paul') && nameLower.includes('pfeifer')) return 14;
      if (nameLower.includes('niklas') && nameLower.includes('schmitz')) return 15;
      
      // Row 3
      if (nameLower.includes('julia') && nameLower.includes('reiners')) return 16;
      if (nameLower.includes('jasmin') && nameLower.includes('farnung')) return 17;
      if (nameLower.includes('lennas') && nameLower.includes('weinem')) return 18;
      if (nameLower.includes('louisa') && nameLower.includes('plattes')) return 19;
      if (nameLower.includes('andreas') && nameLower.includes('thielen')) return 20;
      if (nameLower.includes('marlene') && nameLower.includes('krall')) return 21;
      if (nameLower.includes('friederike') && nameLower.includes('bremser')) return 22; // Ixi = Friederike
      if (nameLower.includes('dennis') && nameLower.includes('miller')) return 23;
      
      // Row 4
      if (nameLower.includes('fabio') && nameLower.includes('urso')) return 24;
      if (nameLower.includes('josefine') && nameLower.includes('baierl')) return 25;
      if (nameLower.includes('jonas') && nameLower.includes('maxeiner')) return 26;
      if (nameLower.includes('arthur') && nameLower.includes('potemkin')) return 27;
      if (nameLower.includes('samuel') && nameLower.includes('may')) return 28;
      if (nameLower.includes('hannah') && nameLower.includes('hagedorn')) return 29;
      if (nameLower.includes('bruno') && nameLower.includes('scavio')) return 30;
      if (nameLower.includes('freya') && nameLower.includes('zipper')) return 31;
      
      // Fallback: Versuche nur mit Vornamen (für Fälle, wo Nachname nicht passt)
      const firstName = fullName.trim().split(/\s+/)[0].toLowerCase();
      const seatingOrderByFirstName: { [key: string]: number } = {
        'robin': 1,
        'felix': 2,
        'luise': 3,
        'louis': 4,
        'jonathan': 5,
        'jan': 6,
        'miró': 7,
        'miro': 7,
        'killian': 8,
        'vincent': 9,
        'adela': 11,
        'jakob': 12,
        'nils': 13,
        'paul': 14,
        'niklas': 15,
        'julia': 16,
        'jasmin': 17,
        'lennas': 18,
        'louisa': 19,
        'andreas': 20,
        'dennis': 23,
        'fabio': 24,
        'josefine': 25,
        'jonas': 26,
        'arthur': 27,
        'samuel': 28,
        'hannah': 29,
        'bruno': 30,
        'freya': 31,
        'friederike': 22 // Ixi = Friederike
      };
      
      // Spezielle Behandlung für Marlene (G. vs K.)
      if (firstName === 'marlene') {
        if (nameLower.includes('geis')) return 10;
        if (nameLower.includes('krall')) return 21;
      }
      
      return seatingOrderByFirstName[firstName] || 999; // Nicht gefundene Schüler ans Ende
    };
    
    // Erstelle eine Kopie des Arrays und sortiere es
    const sorted = [...participationStats].sort((a, b) => {
      const nameA = a.student?.name || '';
      const nameB = b.student?.name || '';
      const orderA = getSeatingOrder(nameA);
      const orderB = getSeatingOrder(nameB);
      
      // Wenn beide in der Sitzordnung sind, sortiere nach Position
      if (orderA !== 999 && orderB !== 999) {
        return orderA - orderB;
      }
      
      // Wenn nur einer in der Sitzordnung ist, dieser kommt zuerst
      if (orderA !== 999) return -1;
      if (orderB !== 999) return 1;
      
      // Beide nicht in Sitzordnung: alphabetisch nach Nachname
      const getLastName = (name: string) => {
        const parts = name.trim().split(/\s+/);
        return parts.length > 1 ? parts[parts.length - 1] : parts[0];
      };
      const lastNameA = getLastName(nameA).toLowerCase();
      const lastNameB = getLastName(nameB).toLowerCase();
      return lastNameA.localeCompare(lastNameB, 'de');
    });
    
    return sorted;
  }, [participationStats]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentStudentId, setCommentStudentId] = useState<string | null>(null);
  const [commentStudentName, setCommentStudentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef<any>(null);
  const [periodConfig, setPeriodConfig] = useState<{period1Hours: number | null; period2Hours: number | null}>({period1Hours: null, period2Hours: null});
  const [epoGrades, setEpoGrades] = useState<any[]>([]);
  const [periodConfigModalOpen, setPeriodConfigModalOpen] = useState(false);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragOverDeskIndex, setDragOverDeskIndex] = useState<string | null>(null);
  const [deskPositions, setDeskPositions] = useState<{[groupId: string]: Array<{deskId: number; gridRow: number; gridCol: number}>}>({});
  const [draggedDeskId, setDraggedDeskId] = useState<number | null>(null);
  const [dragOverGridCell, setDragOverGridCell] = useState<string | null>(null);
  // Genauer Drop-Target State: { deskId, slotIndex } oder { gridRow, gridCol, slotIndex }
  const [dropTarget, setDropTarget] = useState<{
    type: 'desk' | 'grid';
    deskId?: number;
    slotIndex: number;
    gridRow?: number;
    gridCol?: number;
  } | null>(null);
  const [customSeatingOrder, setCustomSeatingOrder] = useState<{[groupId: string]: Array<string | null>}>({});
  const [tempPeriod1Hours, setTempPeriod1Hours] = useState<string>('');
  const [tempPeriod2Hours, setTempPeriod2Hours] = useState<string>('');
  const [lessonKeyword, setLessonKeyword] = useState<string>('');
  const [lessonKeywordsMap, setLessonKeywordsMap] = useState<{[groupId: string]: {[lessonIndex: number]: string}}>({});
  const lessonKeywordInputRef = useRef<HTMLInputElement | null>(null);
  const navFocusRef = useRef<HTMLDivElement | null>(null);
  const participationDebugShownRef = useRef<string>('');
  const [applyingLessonKeyword, setApplyingLessonKeyword] = useState<boolean>(false);

  // Fokussiere den Navigationscontainer beim Öffnen des Mitarbeits-Modals,
  // damit Tastaturkürzel wie 't' sofort verfügbar sind.
  useEffect(() => {
    if (participationModalOpen) {
      // leichte Verzögerung, bis der Dialog gerendert ist
      setTimeout(() => {
        navFocusRef.current?.focus();
      }, 0);
    } else {
      // Reset Debug-Ref wenn Modal geschlossen wird
      participationDebugShownRef.current = '';
    }
  }, [participationModalOpen]);

  // Lade Sitzordnung, wenn sich die Gruppe ändert oder das Modal geöffnet wird
  useEffect(() => {
    if (participationGroupId && participationModalOpen) {
      console.log('🔄 Lade Sitzordnung für Gruppe:', participationGroupId);
      loadSeatingOrder(participationGroupId);
    }
  }, [participationGroupId, participationModalOpen]);

  // Aktualisiere lessonKeyword, wenn sich die Unterrichtsstunde ändert
  useEffect(() => {
    if (!participationGroupId) return;
    const mapped = lessonKeywordsMap[participationGroupId]?.[currentLessonIndex];
    if (mapped !== undefined) {
      setLessonKeyword(mapped);
    } else {
      // Versuche aus Kommentaren zu extrahieren
      const groupData = participations[participationGroupId] || {};
      const lessonData = groupData[currentLessonIndex] || {};
      const anyStudentId = Object.keys(lessonData)[0];
      if (anyStudentId) {
        const data = lessonData[anyStudentId];
        const comment = data && typeof data === 'object' ? (data.comment as string | undefined) : undefined;
        const extracted = extractLessonKeywordFromComment(comment);
        setLessonKeyword(extracted);
      } else {
        setLessonKeyword('');
      }
    }
  }, [currentLessonIndex, participationGroupId, lessonKeywordsMap, participations]);

  // Beim Öffnen des Unterrichts-Modals Freigabe-Stand für die Gruppe laden (Dateien + gemeinsame Eingabe)
  useEffect(() => {
    if (lessonModalOpen && lessonModalData?.groupId) {
      const gid = lessonModalData.groupId;
      fetchFileSharesForGroup(gid);
      fetch(`/api/learning-groups/${gid}/lesson-shared-input-shares`)
        .then(res => res.ok ? res.json() : [])
        .then((paths: string[]) => setLessonSharedInputSharePaths(prev => ({ ...prev, [gid]: paths })))
        .catch(() => {});
    }
  }, [lessonModalOpen, lessonModalData?.groupId]);

  // Fokussiere das Betreff-Feld beim Öffnen des Nachrichten-Dialogs
  useEffect(() => {
    if (showSendMessageDialog && messageSubjectInputRef.current) {
      setTimeout(() => {
        messageSubjectInputRef.current?.focus();
      }, 100);
    }
  }, [showSendMessageDialog]);

  // Fokussiere das Kommentar-Feld beim Öffnen des Kommentar-Dialogs
  useEffect(() => {
    if (commentModalOpen && commentInputRef.current) {
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 100);
    }
  }, [commentModalOpen]);

  // Enter-Taste für Kommentar-Dialog
  useEffect(() => {
    if (!commentModalOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Nur speichern, wenn der Fokus nicht im TextField/TextArea ist
        if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT' && !target.isContentEditable) {
          e.preventDefault();
          handleCommentSave();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentModalOpen]);

  // Funktion zum Senden der Nachricht
  const handleSendMessage = async () => {
    if (!selectedStudentForMessage) {
      console.error('❌ Kein selectedStudentForMessage');
      alert('Fehler: Schüler-Informationen fehlen');
      return;
    }
    
    if (!messageSubject || !messageContent) {
      console.error('❌ Betreff oder Nachricht fehlt');
      alert('Bitte füllen Sie beide Felder aus');
      return;
    }
    
    setSendingMessage(true);
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      console.log('🔑 LoginCode:', loginCode);
      console.log('📤 Sende Nachricht an:', selectedStudentForMessage.id);
      
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify({
          studentId: selectedStudentForMessage.id,
          subject: messageSubject,
          content: messageContent
        })
      });

      console.log('📥 Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Nachricht gesendet:', data);
        setShowSendMessageDialog(false);
        setMessageSubject('');
        setMessageContent('');
        setSelectedStudentForMessage(null);
        alert('✅ Nachricht erfolgreich gesendet!');
      } else {
        const errorText = await response.text();
        console.error('❌ Fehler-Response:', errorText);
        let errorMessage = 'Unbekannter Fehler';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        alert(`❌ Fehler: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ Fehler beim Senden:', error);
      alert(`❌ Fehler beim Senden der Nachricht: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Anzeige-Thema für aktuelle Stunde: erst Map, sonst aus Kommentaren
  const displayedLessonKeyword: string = (() => {
    if (!participationGroupId) return '';
    const mapped = lessonKeywordsMap[participationGroupId]?.[currentLessonIndex];
    if (mapped !== undefined) return mapped;
    const groupData = participations[participationGroupId] || {};
    const lessonData = groupData[currentLessonIndex] || {};
    const anyStudentId = Object.keys(lessonData)[0];
    if (anyStudentId) {
      const data = lessonData[anyStudentId];
      const comment = data && typeof data === 'object' ? (data.comment as string | undefined) : undefined;
      return extractLessonKeywordFromComment(comment);
    }
    return '';
  })();

  // Vordefinierte Schlagworte in fünf Kategorien (rot, gelb, grau, blau, grün)
  const commentShortcuts = {
    rot: [
      'Sehr unaufmerksam',
      'Sehr unruhig',
      'Sehr viele geschwätzt',
      'Dauernd aufgestanden',
      'Reingerufen',
      'Häufig Reingerufen',
      'Häufig gestört',
      'Nicht konzentriert gearbeitet',
      'Fehlende HA',
      'Fehlendes Material',
      'HA probiert aber zu wenig'
    ],
    gelb: [
      'Unaufmerksam',
      'Verträumt',
      'Abgelenkt',
      'Häufig geschwätzt',
      'Abgelenkt durch Nachbarn',
      'Nachbarn abgelenkt',
      'Früher eingepackt',
      'Heft nicht ordentlich geführt',
      'Aufgaben nicht gewissenhaft bearbeitet'
    ],
    grau: [
      'HA unvollständig'
    ],
    blau: [
      'Ruhig gearbeitet',
      'Sorgfältig gearbeitet',
      'Gute Fragen gestellt',
      'Engagiert mitgedacht'
    ],
    gruen: [
      'Produktive Beiträge',
      'Gewinnbringende Meldungen',
      'Kreative Antworten',
      'Fleißig gearbeitet',
      'Sehr konzentriert',
      'Bis zum Ende fleißig',
      'Toll präsentiert'
    ]
  } as const;


  // Spielerische Farbpalette
  const colors = {
    primary: '#2E7D32', // Dunkleres Grün für besseren Kontrast
    secondary: '#F57C00', // Dunkleres Orange
    accent1: '#1976D2', // Dunkleres Blau
    accent2: '#C2185B', // Dunkleres Pink
    background: '#F8FAFC', // Helleres, moderneres Blau
    cardBg: '#FFFFFF',
    success: '#4CAF50',
    error: '#F44336', // Fehlerfarbe
    warning: '#FF9800', // Warnfarbe
    textPrimary: '#2C3E50', // Dunkler Text für bessere Lesbarkeit
    textSecondary: '#7F8C8D', // Grauer Text für Sekundärinformationen
    border: '#E0E0E0', // Rahmenfarbe für Karten und Modals
  };

  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups();
  }, [userId]);

  // Lade Karteikarten-Decks aus der Datenbank
  const fetchFlashcardDecks = async () => {
    try {
  
      const response = await fetch(`/api/flashcards/teacher/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        const decks = data.decks || [];

        
        setFlashcardDecks(decks);

      } else {
        console.error(`HTTP-Fehler beim Laden der Karteikarten-Decks: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Karteikarten-Decks:', error);
    }
  };

  // Lade Flashcard-Assignments für alle Decks
  const fetchFlashcardAssignments = async () => {
    try {
      // Die Assignments sind bereits in den Decks enthalten, da wir sie mit den Decks laden
      
    } catch (error) {
      console.error('Fehler beim Laden der Flashcard-Assignments:', error);
    }
  };

  // Lade Verarbeitungshistorie für ein Dokument
  const fetchDocumentProcessingHistory = async (sourceFile: string): Promise<DocumentProcessingHistory[]> => {
    try {
      const response = await fetch(`/api/flashcards/document-history?teacherId=${userId}&sourceFile=${encodeURIComponent(sourceFile)}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.history || [];
      } else {
        console.error(`HTTP-Fehler beim Laden der Verarbeitungshistorie: ${response.status} ${response.statusText}`);
        return [];
      }
    } catch (error) {
      console.error('Fehler beim Laden der Verarbeitungshistorie:', error);
      return [];
    }
  };

  // Lade alle Karten für ein spezifisches Deck
  const fetchDeckCards = async (deckId: string) => {
    try {
      console.log(`Lade Karten für Deck ${deckId}...`);
      const response = await fetch(`/api/flashcards/${deckId}`);
      
      if (response.ok) {
        const data = await response.json();
        const deck = data.deck;
        console.log(`Erfolgreich Deck mit ${deck.cards.length} Karten geladen:`, deck);
        
        // Aktualisiere das Deck mit den Karten
        setFlashcardDecks(prev => prev.map(d => 
          d.id === deckId 
            ? deck
            : d
        ));
        
        return deck.cards || [];
      } else {
        console.error(`HTTP-Fehler beim Laden der Karten: ${response.status} ${response.statusText}`);
        return [];
      }
    } catch (error) {
      console.error('Fehler beim Laden der Deck-Karten:', error);
      return [];
    }
  };



  // Erstelle oder aktualisiere Lerngruppen-Zuweisungen
  const handleAssignGroups = async (deckId: string, groupIds: string[]) => {
    try {
      // Lösche alle bestehenden Zuweisungen für dieses Deck
      const existingAssignments = flashcardDecks.find(d => d.id === deckId)?.assignments || [];
      for (const assignment of existingAssignments) {
        await fetch(`/api/flashcards/assignments/${assignment.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            teacherId: userId
          })
        });
      }

      // Erstelle neue Zuweisungen
      for (const groupId of groupIds) {
        await fetch('/api/flashcards/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deckId,
            groupId,
            teacherId: userId
          })
        });
      }

      // Lade Assignments neu
      await fetchFlashcardAssignments();
      
      setSnackbar({
        open: true,
        message: 'Lerngruppen erfolgreich zugewiesen',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Zuweisen der Lerngruppen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Zuweisen der Lerngruppen',
        severity: 'error'
      });
    }
  };

  // Lade Daten beim ersten Laden und wenn sich userId ändert
  useEffect(() => {
    if (userId) {
  
      fetchFlashcardDecks();
    }
  }, [userId]);

  // Gespeicherte Unterrichts-Anweisungen (Stift-Bearbeitungen) laden
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lesson-instructions/teacher/${userId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data && typeof data === 'object') setEditedLessonInstructions(data);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Lade Assignments nachdem Decks geladen wurden
  useEffect(() => {
    if (flashcardDecks && flashcardDecks.length > 0) {
      fetchFlashcardAssignments();
    }
  }, [flashcardDecks?.length]);

  // Gruppen laden
  useEffect(() => {
    fetchGroups();
  }, [userId]);

  // Flashcard-Zuweisungen laden, nachdem Gruppen geladen wurden
  useEffect(() => {
    if (groups.length > 0) {
      fetchFlashcardAssignments();
    }
  }, [groups, userId]);

  // Nach dem Laden der Gruppen: Zuweisungen und Listen laden
  useEffect(() => {
    if (groups.length === 0) return;
    // Zuweisungen laden
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
    // Listen laden
    const fetchAll = async () => {
      // Subjects
      const resSubjects = await fetch(`/api/subjects?teacherId=${userId}`);
      const subjectsData = resSubjects.ok ? await resSubjects.json() : [];
      setSubjects(subjectsData);
      if (subjectsData.length === 2) {
        setSubjectTabValue(1);
      }
      // Blocks
      let allBlocks: any[] = [];
      for (const subj of subjectsData) {
        const resBlocks = await fetch(`/api/blocks?subjectId=${subj.id}`);
        const blocksData = resBlocks.ok ? await resBlocks.json() : [];
        allBlocks = allBlocks.concat(blocksData);
      }
      setBlocks(allBlocks);
      // Units
      let allUnits: any[] = [];
      for (const block of allBlocks) {
        const resUnits = await fetch(`/api/units?blockId=${block.id}`);
        const unitsData = resUnits.ok ? await resUnits.json() : [];
        allUnits = allUnits.concat(unitsData);
      }
      setUnits(allUnits);
      // Topics
      let allTopics: any[] = [];
      for (const unit of allUnits) {
        const resTopics = await fetch(`/api/topics?unitId=${unit.id}`);
        const topicsData = resTopics.ok ? await resTopics.json() : [];
        allTopics = allTopics.concat(topicsData);
      }
      setTopics(allTopics);
      // Lessons
      let allLessons: any[] = [];
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
        const materials = await fetchLessonMaterials(lesson.id);
        const quiz = await fetchLessonQuiz(lesson.id);
        materialsMap[lesson.id] = materials;
        if (quiz) {
          quizzesMap[lesson.id] = quiz;
        }
      }
      setLessonMaterials(materialsMap);
      setLessonQuizzes(quizzesMap);
    };
    fetchAll();
  }, [groups, userId]);

  // Mini-Noten für alle Schüler pro Gruppe vorab laden, damit alles sofort sichtbar ist
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    for (const group of groups) {
      for (const student of group.students) {
        ensureMiniGrades(group.id, student.id);
      }
    }
  }, [groups]);

  // AutoFocus auf Dateiname-Feld wenn Modal geöffnet wird
  useEffect(() => {
    if (createExaminationModalOpen) {
      // Verzögerung, damit das Modal vollständig gerendert ist
      const timer = setTimeout(() => {
        if (examinationFileNameInputRef.current) {
          examinationFileNameInputRef.current.focus();
          examinationFileNameInputRef.current.select();
        } else {
          // Fallback: Suche das Input-Element direkt
          const input = document.querySelector('input[type="text"][value=""]') as HTMLInputElement;
          if (input) {
            input.focus();
            input.select();
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [createExaminationModalOpen]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`/api/learning-groups/teacher/${userId}`);
      if (!response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('❌ Error loading groups:', errorData);
        } else {
          const text = await response.text();
          console.error('❌ Non-JSON error response:', text);
        }
        showSnackbar('Fehler beim Laden der Gruppen', 'error');
        return;
      }
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let groupsData;
      if (contentType && contentType.includes('application/json')) {
        groupsData = await response.json();
      } else {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text);
        showSnackbar('Server-Fehler: Ungültige Antwort', 'error');
        return;
      }
      setGroups(sortLearningGroups(groupsData));
      
      // Lade zugeordnete Ordner für alle Gruppen
      for (const group of groupsData) {
        await fetchAssignedFolders(group.id);
        await fetchAssignedFlashcardDecks(group.id);
      }
      
      // Lade Karteikarten-Fortschritt für alle Schüler
      for (const group of groupsData) {
        for (const student of group.students) {
          await fetchStudentFlashcardProgress(student.id);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Gruppen:', error);
      showSnackbar('Fehler beim Laden der Gruppen', 'error');
    }
  };

  // Funktion zum Laden des Karteikarten-Fortschritts eines Schülers
  const fetchStudentFlashcardProgress = async (studentId: string) => {
    try {
      setFlashcardStatsLoading(prev => ({ ...prev, [studentId]: true }));
      
      const response = await fetch(`/api/flashcards/student/${studentId}/progress`);
      if (response.ok) {
        const data = await response.json();
        let progressData = data.progress || [];
        
        if (!Array.isArray(progressData)) {
          progressData = [];
        }
        
        // Berechne Statistiken
        const totalCards = progressData.length;
        const completedCards = progressData.filter((item: any) => item.level > 0).length;
        const dueCards = progressData.filter((item: any) => {
          if (!item.nextReview) return false;
          const reviewDate = new Date(item.nextReview);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return reviewDate <= today;
        }).length;
        
        const qualityStats = {
          perfect: progressData.filter((item: any) => item.quality === 1).length,
          partial: progressData.filter((item: any) => item.quality === 2).length,
          notKnown: progressData.filter((item: any) => item.quality === 1 || item.quality === 2).length, // Sehr schlecht/Schlecht
          partiallyKnown: progressData.filter((item: any) => item.quality === 3).length, // Mittelmäßig
          wellKnown: progressData.filter((item: any) => item.quality === 4 || item.quality === 5).length // Gut/Sehr gut
        };
        
        const levelStats = {
          level0: progressData.filter((item: any) => item.level === 0).length,
          level1: progressData.filter((item: any) => item.level === 1).length,
          level2: progressData.filter((item: any) => item.level === 2).length,
          level3: progressData.filter((item: any) => item.level === 3).length,
          level4: progressData.filter((item: any) => item.level === 4).length,
          level5: progressData.filter((item: any) => item.level === 5).length
        };
        
        const stats: StudentFlashcardStats = {
          totalCards,
          completedCards,
          dueCards,
          progressPercentage: totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0,
          qualityStats,
          levelStats,
          progressData // Speichere die ursprünglichen Daten für die letzten Reviews
        };
        
        setStudentFlashcardStats(prev => ({ ...prev, [studentId]: stats }));

        // Check if learning is too old and start blinking
        if (progressData.length > 0) {
          const lastReviews = progressData
            .filter((item: any) => item.lastReviewed)
            .sort((a: any, b: any) => new Date(b.lastReviewed).getTime() - new Date(a.lastReviewed).getTime())
            .slice(0, 3);
          
          if (lastReviews.length > 0) {
            const oldestReview = lastReviews[lastReviews.length - 1];
            const oldestDate = new Date(oldestReview.lastReviewed);
            const today = new Date();
            const oldestDiffTime = Math.abs(today.getTime() - oldestDate.getTime());
            const oldestDiffDays = Math.ceil(oldestDiffTime / (1000 * 60 * 60 * 24));
            const isTooOld = oldestDiffDays > 14;
            
            // Start blinking animation for old cards
            startBlinkingForOldCards(studentId, isTooOld);
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Karteikarten-Fortschritts:', error);
    } finally {
      setFlashcardStatsLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  // Funktion zum Steuern der Aufblink-Animation für Karten mit altem Lernstand
  const startBlinkingForOldCards = (studentId: string, isTooOld: boolean) => {
    const cardElement = document.getElementById(`student-card-${studentId}`);
    if (cardElement) {
      if (isTooOld) {
        cardElement.style.animation = 'cardBlink 2s infinite';
        cardElement.style.borderColor = '#dc3545';
        cardElement.style.borderWidth = '2px';
      } else {
        cardElement.style.animation = 'none';
        cardElement.style.borderColor = '#e0e0e0';
        cardElement.style.borderWidth = '1px';
      }
    }
  };
  // Neue Funktion zum Laden der zugeordneten Ordner
  const fetchAssignedFolders = async (groupId: string) => {
    try {
      // Cache-Busting Parameter hinzufügen
      const timestamp = Date.now();
      const response = await fetch(`/api/learning-groups/${groupId}/folders?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const folders = await response.json();
        const folderPaths = folders.map((f: any) => f.path);
        
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
          fetchAssignedFolderContent(groupId, folderPath);
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der zugeordneten Ordner:', error);
    }
  };

  // Funktion zum Laden der zugeordneten Karteikarten-Decks für eine Lerngruppe
  const fetchAssignedFlashcardDecks = async (groupId: string) => {
    try {
      setLoadingFlashcardDecks(prev => ({ ...prev, [groupId]: true }));
      
      const response = await fetch(`/api/flashcards/assignments/group/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Loaded flashcard decks for group ${groupId}:`, data.decks?.length || 0, 'decks');
        setAssignedFlashcardDecks(prev => ({
          ...prev,
          [groupId]: data.decks || []
        }));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('Fehler beim Laden der Karteikarten-Decks für Gruppe', groupId, ':', errorData);
        setAssignedFlashcardDecks(prev => ({
          ...prev,
          [groupId]: []
        }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Karteikarten-Decks für Gruppe', groupId, ':', error);
      setAssignedFlashcardDecks(prev => ({
        ...prev,
        [groupId]: []
      }));
    } finally {
      setLoadingFlashcardDecks(prev => ({ ...prev, [groupId]: false }));
    }
  };

  // Neue Funktion zum Laden des Inhalts zugeordneter Ordner
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
        let items: any[] = [];
        if (content.root) {
          items = content.root.children || [];
        } else if (content.root.children) {
          items = content.root.children;
        } else if (content.items) {
          items = content.items;
        }
        
        setAssignedFolderContents(prev => ({
          ...prev,
          [`${groupId}:${folderPath}`]: items
        }));

        // Lade die File Shares für diese Gruppe
        fetchFileSharesForGroup(groupId);

        // Verarbeitungshistorie wird jetzt im useEffect geladen
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

  // Neue Funktion zum Umschalten der Vorschau zugeordneter Ordner
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
  function extractLessonKeywordFromComment(text: string | undefined | null): string {
    if (!text) return '';
    const m = text.match(/\[K:(.*?)\]/);
    return m ? m[1].trim() : '';
  }

  function injectLessonKeywordIntoComment(original: string | undefined | null, keyword: string): string {
    const base = original || '';
    const cleaned = base.replace(/\s*\[K:.*?\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!keyword.trim()) return cleaned; // entfernen
    const tag = `[K: ${keyword.trim()}]`;
    return cleaned ? `${tag} ${cleaned}` : tag;
  }
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
      align-items: flex-start;
      padding-top: 15px;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    
    // Für PowerPoint-Dateien breiter (aber 20% reduziert)
    if (fileType === 'powerpoint') {
      modalContent.style.cssText = `
        background: white;
        padding: 15px;
        border-radius: 8px;
        width: 94%;
        max-height: 90%;
        overflow: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        border: 1px solid #e0e0e0;
      `;
    } else {
      modalContent.style.cssText = `
        background: white;
        padding: 15px;
        border-radius: 8px;
        width: 94%;
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
      top: 0px;
      right: 10px;
      background: #f5f5f5;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
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
      margin: 0;
      color: #1976d2;
      font-size: 12px;
      font-weight: 600;
      border-bottom: none;
      display: flex;
      align-items: center;
      padding-top: -5px;
      justify-content: flex-start;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
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
      margin: 0 0 10px 0;
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
    
    // Für PowerPoint-Dateien den Inhalt anzeigen
    if (fileType === 'powerpoint') {
      content.innerHTML = htmlContent;
      content.style.cssText = `
        padding: 8px;
        margin: 0;
        border: none;
        background: transparent;
        max-height: none;
        overflow: visible;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
        width: 100%;
        box-sizing: border-box;
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
        width: 100%;
        box-sizing: border-box;
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
            padding: 15px;
            border-radius: 6px;
            background: #fafafa;
            max-height: 70vh;
            width: 100%;
            box-sizing: border-box;
            overflow: auto;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            margin: 0;
            display: block;
          `;
        }
      }, 100);
    } else {
      // Für andere Dateitypen den normalen Inhalt und Rahmen anzeigen
      content.innerHTML = htmlContent;
      
      // Stelle sicher, dass alle inneren Elemente die volle Breite nutzen
      const style = document.createElement('style');
      style.textContent = `
        .preview-content * {
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .preview-content img {
          max-width: 100% !important;
          height: auto !important;
        }
        .preview-content table {
          width: 100% !important;
          max-width: 100% !important;
        }
        .preview-content div, .preview-content p, .preview-content span {
          width: 100% !important;
          max-width: 100% !important;
        }
      `;
      document.head.appendChild(style);
      content.className = 'preview-content';
      
      content.style.cssText = `
        border: 1px solid #e0e0e0;
        padding: 15px;
        border-radius: 6px;
        background: #fafafa;
        max-height: 600px;
        width: 100%;
        box-sizing: border-box;
        overflow: auto;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
        margin: 0;
        display: block;
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
      align-items: flex-start;
      padding-top: 15px;
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
      margin: 0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 0px;
      right: 10px;
      background: #f5f5f5;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
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
      margin: 0;
      color: #1976d2;
      font-size: 12px;
      font-weight: 600;
      border-bottom: none;
      display: flex;
      align-items: center;
      padding-top: -5px;
      justify-content: flex-start;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
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
      margin: 0 0 10px 0;
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
      align-items: flex-start;
      padding-top: 15px;
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
      margin: 0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 0px;
      right: 10px;
      background: #f5f5f5;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
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
      margin: 0;
      color: #1976d2;
      font-size: 12px;
      font-weight: 600;
      border-bottom: none;
      display: flex;
      align-items: center;
      padding-top: -5px;
      justify-content: flex-start;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
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
      margin: 0 0 10px 0;
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
      padding: 8px;
      border-radius: 6px;
      background: #fafafa;
      max-height: 600px;
      width: 100%;
      box-sizing: border-box;
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

  // Funktion zum Öffnen von Dateien - nutzt die bereits vorhandenen, schönen Vorschau-Methoden
  const handleFileClick = async (item: any) => {
    if (item.type !== 'file') return;
    
    const fileExtension = item.name.split('.').pop()?.toLowerCase();
    
    // Korrigierbare Dateien (KA_, HÜ_, HU_): Korrekturmodus öffnen
    if (isCorrectionFile(item.name) && (fileExtension === 'html' || fileExtension === 'htm')) {
      setSelectedKAFilePath(item.path); // Verwende den vollständigen Pfad, nicht nur den Dateinamen
      setShowKACorrectionMode(true);
      return;
    }
    
    if (fileExtension === 'html' || fileExtension === 'htm') {
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
    } else if (fileExtension === 'wb') {
      // Whiteboard-Dateien im Whiteboard öffnen
      try {
        // Navigiere zum Whiteboard mit der Datei als Parameter
        const fileName = item.name.replace('.wb', '');
        const whiteboardUrl = `/whiteboard?loadFile=${encodeURIComponent(item.path)}&filename=${encodeURIComponent(fileName)}`;
        window.open(whiteboardUrl, '_blank');
      } catch (error) {
        console.error('Fehler beim Öffnen der Whiteboard-Datei:', error);
        alert('Whiteboard-Datei konnte nicht geöffnet werden.');
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

  // Whiteboard Functions
  const handleOpenWhiteboard = (groupId: string) => {
    // Öffne Whiteboard in neuem Tab
    window.open(`/whiteboard?groupId=${groupId}`, '_blank');
  };
  // File Share Functions – einheitlicher Key aus normalisiertem Pfad (Forward-Slash) + groupId
  const fileShareKey = (path: string, groupId: string) => `${(path || '').replace(/\\/g, '/').trim()}:${groupId}`;
  const fetchFileSharesForGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/file-shares/group/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        const shareMap: {[key: string]: boolean} = {};
        (data.filePaths || []).forEach((filePath: string) => {
          shareMap[fileShareKey(filePath, groupId)] = true;
        });
        setFileShares(prev => ({ ...prev, ...shareMap }));
      }
    } catch (error) {
      console.error('Error fetching file shares:', error);
    }
  };
  const toggleFileShare = async (filePath: string, groupId: string) => {
    if (!filePath?.trim() || !groupId?.trim()) {
      showSnackbar('Dateipfad oder Gruppe fehlt', 'error');
      return;
    }
    const normalizedPath = filePath.replace(/\\/g, '/').trim();
    const key = fileShareKey(normalizedPath, groupId);
    const wasShared = !!fileShares[key];
    // Optimistisches Update: Checkbox sofort umschalten
    setFileShares(prev => ({ ...prev, [key]: !wasShared }));
    try {
      const response = await fetch('/api/file-shares/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: normalizedPath, groupId })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setFileShares(prev => ({ ...prev, [key]: data.shared }));
        showSnackbar(data.message || (data.shared ? 'Datei freigegeben' : 'Freigabe entfernt'), 'success');
      } else {
        setFileShares(prev => ({ ...prev, [key]: wasShared }));
        const msg = data.error || data.message || `Fehler (${response.status})`;
        showSnackbar(msg, 'error');
      }
    } catch (error) {
      setFileShares(prev => ({ ...prev, [key]: wasShared }));
      console.error('Error toggling file share:', error);
      showSnackbar('Fehler beim Ändern der Datei-Freigabe (Netzwerk?)', 'error');
    }
  };

  const toggleLessonSharedInputShare = async (groupId: string, lessonPath: string) => {
    if (!groupId?.trim() || !lessonPath?.trim()) return;
    const paths = lessonSharedInputSharePaths[groupId] || [];
    const wasShared = paths.includes(lessonPath);
    setLessonSharedInputSharePaths(prev => ({
      ...prev,
      [groupId]: wasShared ? paths.filter(p => p !== lessonPath) : [...paths, lessonPath]
    }));
    try {
      const res = await fetch(`/api/learning-groups/${groupId}/lesson-shared-input-share/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonPath })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showSnackbar(data.shared ? 'Gemeinsame Eingabe für SuS freigegeben' : 'Freigabe entfernt', 'success');
      } else {
        setLessonSharedInputSharePaths(prev => ({ ...prev, [groupId]: paths }));
        showSnackbar('Fehler beim Umschalten', 'error');
      }
    } catch {
      setLessonSharedInputSharePaths(prev => ({ ...prev, [groupId]: paths }));
      showSnackbar('Fehler (Netzwerk?)', 'error');
    }
  };

  // Hilfsfunktion zum Filtern von PDF-Dateien, die zu .wb Dateien gehören, und temporären Dateien
  const filterPdfFiles = (items: any[]): any[] => {
    return items.filter((item) => {
      // Filtere temporäre Dateien, die mit ~$ starten (z.B. Microsoft Office temporäre Dateien)
      if (item.type === 'file' && item.name.startsWith('~$')) {
        return false;
      }
      
      if (item.type === 'file' && item.name.endsWith('.pdf')) {
        // Prüfe ob es eine entsprechende .wb Datei gibt (irgendwo in der Liste)
        const wbFileName = item.name.replace('.pdf', '.wb');
        const hasCorrespondingWb = items.some((otherItem) => 
          otherItem.type === 'file' && 
          otherItem.name === wbFileName
        );
        if (hasCorrespondingWb) {
          return false; // PDF-Datei ausblenden
        }
      }
      return true;
    });
  };

  // Lehrerhinweise pro Unterrichtsstunde (Stundenordner-Name als Key)
  const LESSON_INSTRUCTIONS: Record<string, {
    voraussetzungen?: string;
    materialliste?: string;
    anweisungen: string;
    abAnleitung?: string;
    geheimtexte?: string;
  }> = {
    '01': {
      materialliste: `Die 10 Lederbänder mit den Geheimtexten, die Kiste mit den Stöcken, Papierstreifen.`,
      anweisungen: `• Die zwei **Skytale**-Folien zeigen.
• Die **10 Lederbänder** austeilen: Findet heraus, was dort steht.
• **Folie 3:** Oh, ihr erhaltet eine Nachricht von einem eurer Spione.
• **Kiste mit Stöcken** öffnen, können benutzt werden.
• Wer herausgefunden hat, was die Nachricht besagt, trägt sie hier ein.
• Sortiert die entstandene Übersicht in Flinga gemeinsam.
• Jetzt darf jeder einmal ausprobieren, eine eigene Nachricht zu **transpositionieren**: **A3-Papierstreifen** austeilen.
• Denkt euch eine weitere Verschlüsselungsmethode aus, die das Prinzip der **Transposition** verwendet (**Gartenzaunmethode** … kurz anreißen: https://www.lehrerfortbildung-bw.de/u_matna-tech/imp/gym/bp2016/fb1/4_i4_iud/1_hintergrund/2_verlauf/03_skytale/)`,
      abAnleitung: `• [Arbeitsblatt-Anleitung für Stunde 01 – bitte ergänzen]`,
      geheimtexte: `Nachrichten Klartexte
Skytale Verschlüsselung der Spartaner 25
Die Lederbänder konnten unauffällig als Gürtel getragen werden. 20
Der Durchmesser ist der Schlüssel 14
General Lysander vereitelte einen persischen Angriff mit Hilfe der Skytale 35
Entschlüssele den Geheimtext 35
Wie gelangt der Schlüssel zum Empfänger? 20
Griechisch für Stock 14
Verschlüssele den Klartext 25
Die Zeichen des Klartextes werden umsortiert 20
Nachrichten wurden schon vor 2500 Jahren per Transposition verschlüsselt und so geheim ausgetauscht. 25`
    },
    '01 Einstieg': {
      materialliste: `Die 10 Lederbänder mit den Geheimtexten, die Kiste mit den Stöcken, Papierstreifen.`,
      anweisungen: `• Die zwei **Skytale**-Folien zeigen.
• Die **10 Lederbänder** austeilen: Findet heraus, was dort steht.
• **Folie 3:** Oh, ihr erhaltet eine Nachricht von einem eurer Spione.
• **Kiste mit Stöcken** öffnen, können benutzt werden.
• Wer herausgefunden hat, was die Nachricht besagt, trägt sie hier ein.
• Sortiert die entstandene Übersicht in Flinga gemeinsam.
• Jetzt darf jeder einmal ausprobieren, eine eigene Nachricht zu **transpositionieren**: **A3-Papierstreifen** austeilen.
• Denkt euch eine weitere Verschlüsselungsmethode aus, die das Prinzip der **Transposition** verwendet (**Gartenzaunmethode** … kurz anreißen: https://www.lehrerfortbildung-bw.de/u_matna-tech/imp/gym/bp2016/fb1/4_i4_iud/1_hintergrund/2_verlauf/03_skytale/)`,
      abAnleitung: `• [Arbeitsblatt-Anleitung für Stunde 01 – bitte ergänzen]`,
      geheimtexte: `Nachrichten Klartexte
Skytale Verschlüsselung der Spartaner 25
Die Lederbänder konnten unauffällig als Gürtel getragen werden. 20
Der Durchmesser ist der Schlüssel 14
General Lysander vereitelte einen persischen Angriff mit Hilfe der Skytale 35
Entschlüssele den Geheimtext 35
Wie gelangt der Schlüssel zum Empfänger? 20
Griechisch für Stock 14
Verschlüssele den Klartext 25
Die Zeichen des Klartextes werden umsortiert 20
Nachrichten wurden schon vor 2500 Jahren per Transposition verschlüsselt und so geheim ausgetauscht. 25`
    },
    '01 Skytale': {
      materialliste: `Die 10 Lederbänder mit den Geheimtexten, die Kiste mit den Stöcken, Papierstreifen.`,
      anweisungen: `• Die zwei **Skytale**-Folien zeigen.
• Die **10 Lederbänder** austeilen: Findet heraus, was dort steht.
• **Folie 3:** Oh, ihr erhaltet eine Nachricht von einem eurer Spione.
• **Kiste mit Stöcken** öffnen, können benutzt werden.
• Wer herausgefunden hat, was die Nachricht besagt, trägt sie hier ein.
• Sortiert die entstandene Übersicht in Flinga gemeinsam.
• Jetzt darf jeder einmal ausprobieren, eine eigene Nachricht zu **transpositionieren**: **A3-Papierstreifen** austeilen.
• Denkt euch eine weitere Verschlüsselungsmethode aus, die das Prinzip der **Transposition** verwendet (**Gartenzaunmethode** … kurz anreißen: https://www.lehrerfortbildung-bw.de/u_matna-tech/imp/gym/bp2016/fb1/4_i4_iud/1_hintergrund/2_verlauf/03_skytale/)`,
      abAnleitung: `• [Arbeitsblatt-Anleitung für Stunde 01 – bitte ergänzen]`,
      geheimtexte: `Nachrichten Klartexte
Skytale Verschlüsselung der Spartaner 25
Die Lederbänder konnten unauffällig als Gürtel getragen werden. 20
Der Durchmesser ist der Schlüssel 14
General Lysander vereitelte einen persischen Angriff mit Hilfe der Skytale 35
Entschlüssele den Geheimtext 35
Wie gelangt der Schlüssel zum Empfänger? 20
Griechisch für Stock 14
Verschlüssele den Klartext 25
Die Zeichen des Klartextes werden umsortiert 20
Nachrichten wurden schon vor 2500 Jahren per Transposition verschlüsselt und so geheim ausgetauscht. 25`
    },
    '02 Sicherheitsziele': {
      voraussetzungen: `**Transpositionsverschlüsselung** bekannt, **Skytale** als Beispiel
Gegenüberstellung zu anderen **Verfahrensarten** (z. B. **Substitutionsverschlüsselung**) bekannt oder wird thematisiert`,
      materialliste: `Zettel`,
      anweisungen: `• Ich schreibe etwas auf einen **Zettel**, falte ihn und schreibe den **Namen** einer weiterentfernt sitzenden Schülerin oder Schülers darauf.
• Ich bitte eine Schülerin oder einen Schüler, den Zettel an den Adressaten **weiterzuleiten**.
• Je nach Lerngruppe wird beobachtet und besprochen, was passiert ist und/oder besprochen, **was alles hätte passieren können**. Es lassen sich damit schnell die **Angriffsszenarien** und die entsprechenden **Ziele** der **Kryptologie** herausarbeiten.`,
      abAnleitung: `• Wir brauchen **fünf** **Gruppen**, die sich mit den Fällen A bis E befassen. Bearbeitet damit Aufgabe 1.
• Besprechung Aufgabe 1 und Folien dazu zeigen.
• Danach die restlichen beiden Aufgaben bearbeiten und mit Folien besprechen.`
    }
  };

  const FACHBEGRIFFE_GLOSSAR: Record<string, { erklärung: string; beispiel: string }> = {
    'Transpositionsverschlüsselung': {
      erklärung: 'Verschlüsselung durch Umstellung (Vertauschen) der Zeichenpositionen.',
      beispiel: 'Skytale: Nachricht wird spiralförmig auf einen Stab geschrieben und quer abgelesen.'
    },
    'Skytale': {
      erklärung: 'Antikes Verschlüsselungsverfahren: Nachricht wird um einen Stab gewickelt geschrieben, ohne Stab wirkt der Text unleserlich.',
      beispiel: 'Nur wer den gleichen Stabdurchmesser hat, kann die Nachricht entziffern.'
    },
    'Substitutionsverschlüsselung': {
      erklärung: 'Verschlüsselung durch Ersetzen von Zeichen (jedes Zeichen wird durch ein anderes ersetzt).',
      beispiel: 'Caesar-Verschlüsselung: Jeder Buchstabe wird durch einen fest versetzten Buchstaben im Alphabet ersetzt.'
    },
    'Verfahrensarten': {
      erklärung: 'Zwei grundlegende Arten: Transposition (Zeichen werden umgestellt) vs. Substitution (Zeichen werden ersetzt).',
      beispiel: 'Skytale = Transposition; Caesar = Substitution.'
    },
    'Kryptologie': {
      erklärung: 'Wissenschaft von der Verschlüsselung (Kryptographie) und dem Entschlüsseln (Kryptoanalyse).',
      beispiel: 'Sicherheitsziele wie Vertraulichkeit und Integrität werden durch kryptologische Verfahren angestrebt.'
    },
    'Angriffsszenarien': {
      erklärung: 'Mögliche Angriffe auf eine Nachricht oder ein System (z. B. Abfangen, Verändern, Unterdrücken).',
      beispiel: 'Zettel wird abgefangen und gelesen → Verletzung der Vertraulichkeit.'
    },
    'Ziele': {
      erklärung: 'Sicherheitsziele der Kryptologie: Vertraulichkeit, Integrität, Verfügbarkeit, Verbindlichkeit.',
      beispiel: 'Vertraulichkeit: Nur der Adressat soll die Nachricht lesen können.'
    },
    'Sicherheitsziele der Informatik': {
      erklärung: 'Ziele zum Schutz von Daten und Systemen: Vertraulichkeit, Integrität, Verfügbarkeit.',
      beispiel: 'Vertraulichkeit = nur Berechtigte lesen; Integrität = unverändert; Verfügbarkeit = erreichbar.'
    }
  };

  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const renderPartWithLinks = (part: string, keyPrefix: string) => {
    const segments = part.split(urlRegex);
    return segments.map((seg, j) => {
      if (seg.startsWith('http://') || seg.startsWith('https://')) {
        const url = seg.trim();
        const short = url.length > 45 ? url.slice(0, 42) + '…' : url;
        return (
          <a
            key={`${keyPrefix}-${j}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: '#1565c0', textDecoration: 'none', borderBottom: '1px solid #90caf9' }}
          >
            {short}
          </a>
        );
      }
      return <span key={`${keyPrefix}-${j}`}>{seg}</span>;
    });
  };
  // Direkte Anweisungen: Anführungszeichen, kursiv, Operator fett – ohne Platzhalter, nur Segmentliste bauen
  const INSTRUCTION_OPERATORS = [
    'Wer herausgefunden hat',
    'Je nach Lerngruppe',
    'Findet heraus',
    'Jetzt darf',
    'Denkt euch',
    'Ich schreibe',
    'Ich bitte',
    'Wir brauchen',
    'Sortiert',
    'Bearbeitet',
    'Besprechung',
    'Danach'
  ];

  // Konvertiert Anzeige-Text zu Editor-HTML wie auf der Seite: **fett** → <strong>, Zeilenumbrüche → <br>, vorhandenes HTML unverändert.
  const plainTextToHtml = (text: string): string => {
    if (text === undefined || text === null) return '';
    const t = String(text);
    if (t.trim() === '') return t;
    if (/<[a-zA-Z][^>]*>/i.test(t)) return t;
    // 1) **...** durch Platzhalter ersetzen (damit Escapen die Tags nicht zerstört)
    const OPEN = '\uFFFFBOLD\uFFFF';
    const CLOSE = '\uFFFF/BOLD\uFFFF';
    let out = t.replace(/\*\*([^*]+)\*\*/g, OPEN + '$1' + CLOSE);
    // 2) HTML escapen, Zeilenumbrüche → <br>
    out = out
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r\n?|\n/g, '<br>');
    // 3) Platzhalter durch echte <strong>-Tags ersetzen
    out = out.split(OPEN).join('<strong>').split(CLOSE).join('</strong>');
    return out;
  };

  // Hilfsfunktion: Rendert HTML-Inhalt oder Plaintext mit renderBoldText
  const renderTextContent = (text: string, boldColor?: string, lineHeight: number = 1.75, asList: boolean = false) => {
    if (!text) return null;
    const trimmed = text.trim();
    // Gespeichertes HTML aus dem Editor: immer als HTML rendern (Tag-Heuristik, auch bei führendem Whitespace)
    const hasHtml = trimmed.length > 0 && (/<[a-z][^>]*>/i.test(trimmed) || (trimmed.includes('<') && trimmed.includes('>')));
    if (hasHtml) {
      return <Box component="div" dangerouslySetInnerHTML={{ __html: text }} sx={{ fontSize: '1.15rem', lineHeight, color: '#333', '& p': { margin: '0.5em 0' }, '& ul, & ol': { margin: '0.5em 0', paddingLeft: '1.5em' }, '& li': { margin: '0.25em 0', lineHeight }, '& br': { display: 'block', content: '""', marginBottom: '0.5em' } }} />;
    }
    // Plaintext: Wenn als Liste, zeige als Liste mit renderBoldText pro Zeile
    if (asList) {
      return (
        <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#333', fontSize: '1.15rem', lineHeight }}>
          {text.split('\n').filter(Boolean).map((line, i) => (
            <Box component="li" key={i} sx={{ mb: 0.75 }}>
              {renderBoldText(line.replace(/^•\s*/, ''), boldColor)}
            </Box>
          ))}
        </Box>
      );
    }
    // Plaintext: Zeige mit Zeilenumbrüchen
    return (
      <Box component="div" sx={{ whiteSpace: 'pre-wrap', fontSize: '1.15rem', lineHeight, color: '#333' }}>
        {text.split('\n').map((line, i, arr) => (
          <React.Fragment key={i}>
            {renderBoldText(line, boldColor)}
            {i < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </Box>
    );
  };

  const renderBoldText = (text: string, boldColor?: string) => {
    type Seg = { type: 'instruction'; operator: string; rest: string; punct: string } | { type: 'bold'; content: string } | { type: 'normal'; content: string };
    const segments: Seg[] = [];
    let pos = 0;

    while (pos < text.length) {
      // Nächstes Vorkommen: Anweisung oder **term**
      let nextInstruction: { index: number; operator: string; rest: string; punct: string; end: number } | null = null;
      for (const op of INSTRUCTION_OPERATORS) {
        const idx = text.toLowerCase().indexOf(op.toLowerCase(), pos);
        if (idx === -1) continue;
        const afterOp = text.slice(idx + op.length);
        const m = afterOp.match(/^([^.,:]*?)([,.:]|$)/);
        const rest = m ? m[1] : afterOp;
        const punct = m && m[2] ? m[2] : '';
        const end = idx + op.length + rest.length + punct.length;
        if (!nextInstruction || idx < nextInstruction.index) {
          nextInstruction = { index: idx, operator: text.slice(idx, idx + op.length), rest, punct, end };
        }
      }
      const boldMatch = text.slice(pos).match(/\*\*([^*]+)\*\*/);
      const boldIndex = boldMatch ? pos + boldMatch.index! : text.length;

      if (nextInstruction && nextInstruction.index < boldIndex) {
        if (nextInstruction.index > pos) {
          segments.push({ type: 'normal', content: text.slice(pos, nextInstruction.index) });
        }
        segments.push({
          type: 'instruction',
          operator: nextInstruction.operator,
          rest: nextInstruction.rest,
          punct: nextInstruction.punct
        });
        pos = nextInstruction.end;
        continue;
      }
      if (boldMatch) {
        if (boldIndex > pos) {
          segments.push({ type: 'normal', content: text.slice(pos, boldIndex) });
        }
        segments.push({ type: 'bold', content: boldMatch[1] });
        pos = boldIndex + boldMatch[0].length;
        continue;
      }
      segments.push({ type: 'normal', content: text.slice(pos) });
      break;
    }

    return segments.map((seg, i) => {
      // Direkte Rede (operationalisieren): Anweisungsoperator bold, Rede in Anführungszeichen und kursiv
      if (seg.type === 'instruction') {
        return (
          <span key={i} style={{ fontStyle: 'italic' }}>
            &bdquo;<strong>{seg.operator}</strong>{seg.rest}&ldquo;{seg.punct}
          </span>
        );
      }
      if (seg.type === 'bold') {
        const term = seg.content;
        const glossar = FACHBEGRIFFE_GLOSSAR[term];
        if (!glossar) {
          if (term === 'fünf') return <strong key={i} style={{ color: boldColor ?? '#2e7d32' }}>{term}</strong>;
          if (term === 'Gruppen') return <strong key={i} style={{ color: boldColor ?? '#e65100' }}>{term}</strong>;
          // Material: orange, nicht bold, mit Icon
          if (boldColor === '#ed6c02') {
            return (
              <Box key={i} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, color: '#ed6c02' }}>
                <AssignmentIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                <span>{term}</span>
              </Box>
            );
          }
          // Sonstige Begriffe (nur Farbe, nicht bold)
          return <span key={i} style={{ color: '#1565c0' }}>{term}</span>;
        }
        // Fachbegriffe: blau, nicht bold (mit Tooltip)
        return (
          <Tooltip
            key={i}
            title={
              <Box component="span" sx={{ display: 'block', maxWidth: 320, fontSize: '1rem' }}>
                <Box component="span" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Erklärung:</Box>
                {glossar.erklärung}
                <Box component="span" sx={{ fontWeight: 600, display: 'block', mt: 1, mb: 0.5 }}>Beispiel:</Box>
                {glossar.beispiel}
              </Box>
            }
            placement="top"
            arrow
          >
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, cursor: 'help', borderBottom: '1px dotted currentColor', color: '#1565c0', fontWeight: 400 }}>
              <span>{term}</span>
              <InfoIcon sx={{ fontSize: 14, opacity: 0.8 }} />
            </Box>
          </Tooltip>
        );
      }
      return <span key={i}>{renderPartWithLinks(seg.content, `normal-${i}`)}</span>;
    });
  };

  // Materialliste: Leerzeichen vor Komma/Punkt entfernen, nur Materialbegriffe orange + Icon
  const normalizeMaterialListText = (s: string) =>
    s
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.])/g, '$1')
      .trim();

  const MATERIAL_TERMS: { pattern: RegExp; label: string; icon: 'lederband' | 'stoebe' | 'papier' | 'zettel' }[] = [
    { pattern: /10 Lederbänder/gi, label: '10 Lederbänder', icon: 'lederband' },
    { pattern: /Stöcken?/gi, label: 'Stöcken', icon: 'stoebe' },
    { pattern: /Papierstreifen/gi, label: 'Papierstreifen', icon: 'papier' },
    { pattern: /Zettel/gi, label: 'Zettel', icon: 'zettel' }
  ];

  const renderMaterialListContent = (raw: string) => {
    const text = normalizeMaterialListText(raw);
    const parts: Array<{ type: 'text' | 'material'; content: string; icon?: 'lederband' | 'stoebe' | 'papier' | 'zettel' }> = [];
    let remaining = text;
    let key = 0;
    while (remaining.length > 0) {
      let best: { index: number; length: number; label: string; icon: 'lederband' | 'stoebe' | 'papier' | 'zettel' } | null = null;
      for (const { pattern, label, icon } of MATERIAL_TERMS) {
        pattern.lastIndex = 0;
        const m = pattern.exec(remaining);
        if (m && (best === null || m.index < best.index)) {
          best = { index: m.index, length: m[0].length, label: m[0], icon };
        }
      }
      if (!best) {
        parts.push({ type: 'text', content: remaining });
        break;
      }
      if (best.index > 0) {
        parts.push({ type: 'text', content: remaining.slice(0, best.index) });
      }
      parts.push({ type: 'material', content: best.label, icon: best.icon });
      remaining = remaining.slice(best.index + best.length);
    }
    const iconSx = { flexShrink: 0, lineHeight: 0, display: 'inline-flex', alignItems: 'center', mr: 0.5, verticalAlign: 'middle' };
    return (
      <Box component="span" sx={{ display: 'inline', color: '#333', fontSize: '1.15rem', lineHeight: 1.75 }}>
        {parts.map((p, i) => {
          if (p.type === 'text') return <span key={i}>{p.content}</span>;
          const IconComp = p.icon === 'zettel' ? (
            <Box component="span" sx={iconSx} title={p.content}>
              <svg width="20" height="24" viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="20" height="25" rx="0.5" fill="#fffef7" stroke="#b0a090" strokeWidth="0.8"/>
                <line x1="4" y1="6" x2="18" y2="6" stroke="#d0c8b8" strokeWidth="0.6"/>
                <line x1="4" y1="10" x2="16" y2="10" stroke="#d0c8b8" strokeWidth="0.6"/>
                <line x1="4" y1="14" x2="18" y2="14" stroke="#d0c8b8" strokeWidth="0.6"/>
              </svg>
            </Box>
          ) : p.icon === 'lederband' ? (
            <Box component="span" sx={iconSx} title={p.content}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12h16M4 12v6l8-3 8 3v-6M4 12l8-3 8 3" stroke="#ed6c02" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              </svg>
            </Box>
          ) : p.icon === 'stoebe' ? (
            <Box component="span" sx={iconSx} title={p.content}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="2" width="4" height="20" rx="1" fill="#8d6e63" stroke="#5d4e37" strokeWidth="0.8"/>
                <rect x="4" y="6" width="4" height="16" rx="1" fill="#8d6e63" stroke="#5d4e37" strokeWidth="0.8"/>
                <rect x="16" y="6" width="4" height="16" rx="1" fill="#8d6e63" stroke="#5d4e37" strokeWidth="0.8"/>
              </svg>
            </Box>
          ) : (
            <Box component="span" sx={iconSx} title={p.content}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="5" width="18" height="14" rx="0.5" fill="#fffef7" stroke="#ed6c02" strokeWidth="0.8"/>
                <line x1="6" y1="10" x2="18" y2="10" stroke="#e0d0b0" strokeWidth="0.6"/>
                <line x1="6" y1="14" x2="15" y2="14" stroke="#e0d0b0" strokeWidth="0.6"/>
              </svg>
            </Box>
          );
          return (
            <Box component="span" key={i} sx={{ color: '#ed6c02', fontWeight: 400, display: 'inline-flex', alignItems: 'center' }}>
              {IconComp}
              <span>{p.content}</span>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Icons als <img> mit Data-URI (contentEditable entfernt Inline-SVG oft; img bleibt erhalten)
  const svgToImgDataUri = (svg: string, w: number, h: number, style = 'vertical-align:middle;margin-right:2px'): string => {
    try {
      const base64 = btoa(unescape(encodeURIComponent(svg.trim())));
      const uri = `data:image/svg+xml;base64,${base64}`;
      return `<img src="${uri}" width="${w}" height="${h}" alt="" style="${style}" data-editor-icon="1" />`;
    } catch {
      return '';
    }
  };
  const MATERIAL_ICONS_SVG: Record<'lederband' | 'stoebe' | 'papier' | 'zettel', string> = {
    zettel: '<svg width="20" height="24" viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="20" height="25" rx="0.5" fill="#fffef7" stroke="#b0a090" stroke-width="0.8"/><line x1="4" y1="6" x2="18" y2="6" stroke="#d0c8b8" stroke-width="0.6"/><line x1="4" y1="10" x2="16" y2="10" stroke="#d0c8b8" stroke-width="0.6"/><line x1="4" y1="14" x2="18" y2="14" stroke="#d0c8b8" stroke-width="0.6"/></svg>',
    lederband: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h16M4 12v6l8-3 8 3v-6M4 12l8-3 8 3" stroke="#ed6c02" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>',
    stoebe: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="2" width="4" height="20" rx="1" fill="#8d6e63" stroke="#5d4e37" stroke-width="0.8"/><rect x="4" y="6" width="4" height="16" rx="1" fill="#8d6e63" stroke="#5d4e37" stroke-width="0.8"/><rect x="16" y="6" width="4" height="16" rx="1" fill="#8d6e63" stroke="#5d4e37" stroke-width="0.8"/></svg>',
    papier: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="0.5" fill="#fffef7" stroke="#ed6c02" stroke-width="0.8"/><line x1="6" y1="10" x2="18" y2="10" stroke="#e0d0b0" stroke-width="0.6"/><line x1="6" y1="14" x2="15" y2="14" stroke="#e0d0b0" stroke-width="0.6"/></svg>'
  };
  const ASSIGNMENT_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="#ed6c02"/></svg>';
  const INFO_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#1565c0"/></svg>';
  const MATERIAL_ICONS_HTML = (() => {
    const r: Record<'lederband' | 'stoebe' | 'papier' | 'zettel', string> = {} as any;
    (['zettel', 'lederband', 'stoebe', 'papier'] as const).forEach(k => {
      r[k] = svgToImgDataUri(MATERIAL_ICONS_SVG[k], k === 'zettel' ? 20 : 20, k === 'zettel' ? 24 : 20);
    });
    return r;
  })();
  const ASSIGNMENT_ICON_HTML = svgToImgDataUri(ASSIGNMENT_ICON_SVG, 16, 16);
  const INFO_ICON_HTML = svgToImgDataUri(INFO_ICON_SVG, 14, 14, 'vertical-align:middle;margin-left:1px;opacity:0.8');

  /** Konvertiert Anzeige-Text zu Editor-HTML mit gleicher Formatierung wie auf der Seite: Farben, Icons, Glossar-Tooltips. */
  function plainTextToEditorHtml(text: string, section: 'voraussetzungen' | 'materialliste' | 'anweisungen' | 'abAnleitung' | 'geheimtexte'): string {
    if (text === undefined || text === null) return '';
    const t = String(text);
    if (t.trim() === '') return t;
    if (/<[a-zA-Z][^>]*>/i.test(t)) return t;
    // Geheimtexte/Klartexte: Anzeige ist nur Pre-Wrap oder HTML – nur Fett und Zeilenumbrüche
    if (section === 'geheimtexte') return plainTextToHtml(t);

    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapeTitle = (s: string) => escapeHtml(s).replace(/"/g, '&quot;');

    if (section === 'materialliste') {
      const normalized = normalizeMaterialListText(t);
      const parts: Array<{ type: 'text' | 'material'; content: string; icon?: 'lederband' | 'stoebe' | 'papier' | 'zettel' }> = [];
      let remaining = normalized;
      while (remaining.length > 0) {
        let best: { index: number; length: number; label: string; icon: 'lederband' | 'stoebe' | 'papier' | 'zettel' } | null = null;
        for (const { pattern, label, icon } of MATERIAL_TERMS) {
          pattern.lastIndex = 0;
          const m = pattern.exec(remaining);
          if (m && (best === null || m.index < best.index)) {
            best = { index: m.index, length: m[0].length, label: m[0], icon };
          }
        }
        if (!best) {
          parts.push({ type: 'text', content: remaining });
          break;
        }
        if (best.index > 0) parts.push({ type: 'text', content: remaining.slice(0, best.index) });
        parts.push({ type: 'material', content: best.label, icon: best.icon });
        remaining = remaining.slice(best.index + best.length);
      }
      const out = parts.map(p => {
        if (p.type === 'text') return escapeHtml(p.content).replace(/\n/g, '<br>');
        const icon = p.icon ? MATERIAL_ICONS_HTML[p.icon] : MATERIAL_ICONS_HTML.papier;
        return `<span style="color:#ed6c02;font-weight:400;display:inline-flex;align-items:center">${icon}${escapeHtml(p.content)}</span>`;
      }).join('');
      return out.replace(/\r\n?|\n/g, '<br>');
    }

    const boldColor = (section === 'anweisungen' || section === 'abAnleitung') ? '#ed6c02' : undefined;
    type Seg = { type: 'instruction'; operator: string; rest: string; punct: string } | { type: 'bold'; content: string } | { type: 'normal'; content: string };
    const segments: Seg[] = [];
    let pos = 0;
    while (pos < t.length) {
      let nextInstruction: { index: number; operator: string; rest: string; punct: string; end: number } | null = null;
      for (const op of INSTRUCTION_OPERATORS) {
        const idx = t.toLowerCase().indexOf(op.toLowerCase(), pos);
        if (idx === -1) continue;
        const afterOp = t.slice(idx + op.length);
        const m = afterOp.match(/^([^.,:]*?)([,.:]|$)/);
        const rest = m ? m[1] : afterOp;
        const punct = m && m[2] ? m[2] : '';
        const end = idx + op.length + rest.length + punct.length;
        if (!nextInstruction || idx < nextInstruction.index) {
          nextInstruction = { index: idx, operator: t.slice(idx, idx + op.length), rest, punct, end };
        }
      }
      const boldMatch = t.slice(pos).match(/\*\*([^*]+)\*\*/);
      const boldIndex = boldMatch ? pos + boldMatch.index! : t.length;
      if (nextInstruction && nextInstruction.index < boldIndex) {
        if (nextInstruction.index > pos) segments.push({ type: 'normal', content: t.slice(pos, nextInstruction.index) });
        segments.push({ type: 'instruction', operator: nextInstruction.operator, rest: nextInstruction.rest, punct: nextInstruction.punct });
        pos = nextInstruction.end;
        continue;
      }
      if (boldMatch) {
        if (boldIndex > pos) segments.push({ type: 'normal', content: t.slice(pos, boldIndex) });
        segments.push({ type: 'bold', content: boldMatch[1] });
        pos = boldIndex + boldMatch[0].length;
        continue;
      }
      segments.push({ type: 'normal', content: t.slice(pos) });
      break;
    }

    const linkify = (part: string) => {
      const segs = part.split(urlRegex);
      return segs.map(seg => {
        if (seg.startsWith('http://') || seg.startsWith('https://')) {
          const url = seg.trim();
          const short = url.length > 45 ? url.slice(0, 42) + '…' : url;
          return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem;word-break:break-all;color:#1565c0;text-decoration:none;border-bottom:1px solid #90caf9">${escapeHtml(short)}</a>`;
        }
        return escapeHtml(seg);
      }).join('');
    };

    const htmlParts = segments.map(seg => {
      if (seg.type === 'instruction') {
        return `<span style="font-style:italic">„<strong>${escapeHtml(seg.operator)}</strong>${escapeHtml(seg.rest)}„${escapeHtml(seg.punct)}</span>`;
      }
      if (seg.type === 'bold') {
        const term = seg.content;
        const glossar = FACHBEGRIFFE_GLOSSAR[term];
        if (!glossar) {
          if (term === 'fünf') return `<strong style="color:${boldColor ?? '#2e7d32'}">${escapeHtml(term)}</strong>`;
          if (term === 'Gruppen') return `<strong style="color:${boldColor ?? '#e65100'}">${escapeHtml(term)}</strong>`;
          if (boldColor === '#ed6c02') {
            return `<span style="color:#ed6c02;display:inline-flex;align-items:center;gap:0.35em">${ASSIGNMENT_ICON_HTML}${escapeHtml(term)}</span>`;
          }
          return `<span style="color:#1565c0">${escapeHtml(term)}</span>`;
        }
        const title = `Erklärung: ${glossar.erklärung} — Beispiel: ${glossar.beispiel}`;
        return `<span style="color:#1565c0;border-bottom:1px dotted currentColor;cursor:help" title="${escapeTitle(title)}">${escapeHtml(term)}${INFO_ICON_HTML}</span>`;
      }
      return linkify(seg.content).replace(/\r\n?|\n/g, '<br>');
    });

    return htmlParts.join('').replace(/\r\n?|\n/g, '<br>');
  }

  /** Gruppiert Dateien nach Basisname (ohne Endung). Eine Zeile pro Dokument, Buttons PDF/DOC pro Version. Freigabe nur für PDF. */
  const groupFilesByBaseName = (files: any[]): { baseName: string; versions: { ext: string; file: any }[] }[] => {
    const map = new Map<string, { ext: string; file: any }[]>();
    for (const file of files) {
      const name = file.name || '';
      const baseName = name.replace(/\.[^.]+$/, '') || name;
      const ext = (name.match(/\.([^.]+)$/) || ['', ''])[1].toLowerCase();
      if (!map.has(baseName)) map.set(baseName, []);
      map.get(baseName)!.push({ ext, file });
    }
    return Array.from(map.entries()).map(([baseName, versions]) => ({ baseName, versions }));
  };

  const getPdfFromGroup = (versions: { ext: string; file: any }[]) =>
    versions.find(v => v.ext === 'pdf')?.file || null;

  /** Wandelt eine Item-Liste (Ordner + Dateien) in Anzeige-Items um: Ordner unverändert, Dateien nach Basisname gruppiert. */
  const itemsToDisplayItems = (items: any[]): any[] => {
    const dirs = items.filter((i: any) => i.type === 'directory');
    const files = items.filter((i: any) => i.type === 'file');
    const groups = groupFilesByBaseName(files);
    return [
      ...dirs,
      ...groups.map((g: any) => ({ type: 'fileGroup', baseName: g.baseName, versions: g.versions }))
    ];
  };

  // Neue Funktion zum Rendern der echten Ordner-Vorschau
  const renderAssignedFolderPreview = (groupId: string, folderPath: string) => {
    const items = assignedFolderContents[`${groupId}:${folderPath}`] || [];
    const isLoading = loadingFolderContents[`${groupId}:${folderPath}`] || false;
    
    // Filtere PDF-Dateien aus, die zu .wb Dateien gehören - NUR für die Anzeige
    // Die ursprünglichen Daten bleiben unverändert für Schüler
    const filteredItems = filterPdfFiles(items);
    
    // Sortierung: PDF immer zuerst, danach Rest
    const sortVersionsPdfFirst = (versions: { ext: string; file: any }[]) =>
      [...versions].sort((a, b) => (a.ext.toLowerCase() === 'pdf' ? -1 : b.ext.toLowerCase() === 'pdf' ? 1 : 0));

    // Zeile für eine Dateigruppe (ein Name, mehrere Formate): Icons + nur PDF-Freigabe
    const renderFileGroupRow = (group: { baseName: string; versions: { ext: string; file: any }[] }, level: number) => {
      const pdfFile = getPdfFromGroup(group.versions);
      const sortedVersions = sortVersionsPdfFirst(group.versions);
      const getExtIcon = (ext: string) => {
        if (ext === 'pdf') return <PictureAsPdfIcon sx={{ fontSize: 18 }} />;
        if (['doc', 'docx'].includes(ext.toLowerCase())) return <DescriptionIcon sx={{ fontSize: 18 }} />;
        return <DescriptionIcon sx={{ fontSize: 18 }} />;
      };
      const iconBtnSx = {
        p: 0.5,
        borderRadius: 1,
        color: 'primary.main',
        '&:hover': { bgcolor: 'action.hover' },
      };
      return (
        <Box key={`group-${group.baseName}-${level}`} sx={{ mb: 0.7 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', minWidth: 0 }}>
            {pdfFile && (
              <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }} title={fileShares[fileShareKey(pdfFile.path, groupId)] ? 'Für Schüler freigegeben' : 'Nur PDF freigeben'}>
                <input
                  type="checkbox"
                  checked={!!fileShares[fileShareKey(pdfFile.path, groupId)]}
                  onChange={() => toggleFileShare(pdfFile.path, groupId)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#4caf50' }}
                />
              </Box>
            )}
            <Typography variant="body2" sx={{ color: '#03a9f4', fontSize: '0.75rem', flexShrink: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📄 {group.baseName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}>
              {sortedVersions.map(({ ext, file }) => (
                <Tooltip key={file.path} title={`${ext.toUpperCase()} öffnen`}>
                  <IconButton size="small" onClick={() => handleFileClick(file)} sx={iconBtnSx}>
                    {getExtIcon(ext)}
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
          </Box>
        </Box>
      );
    };

    // Rekursive Funktion zum Rendern aller Ebenen
    const renderItemRecursively = (item: any, level: number = 0) => {
      if (item.type === 'fileGroup') {
        return renderFileGroupRow(item, level);
      }
      // Filtere temporäre Dateien, die mit ~$ starten
      if (item.type === 'file' && item.name.startsWith('~$')) {
        return null;
      }
      
      // Bestimme Icon und Farbe basierend auf dem Screenshot
      let icon = '📁';
      let color = '#666';
      let fontWeight = 400;
      let showCreateIcon = false;
      let createIcon = '';
      let createTooltip = '';
      
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

        
        // Prüfe ob es sich um Quiz-, Cards-, H__ oder W_ Dateien handelt
        if (item.name.startsWith('Quiz')) {
          showCreateIcon = true;
          createIcon = '🎯';
          createTooltip = 'Quiz erstellen';

        } else if (item.name.startsWith('K_')) {
          showCreateIcon = true;
          createIcon = '🗂️';
          createTooltip = 'Karteikarten erstellen';
          color = '#666'; // Grau für K_ Dateien

        } else if (item.name.startsWith('H_')) {
          showCreateIcon = true;
          createIcon = '📥';
          createTooltip = 'Abgaben ansehen';

        } else if (item.name.startsWith('W_') && item.name.endsWith('.wb')) {
          // Für .wb Dateien: Zeige PDF-Icon daneben
          showCreateIcon = true;
          createIcon = '📄';
          createTooltip = 'PDF-Version öffnen';
        }
      }
      
      return (
        <Box key={`${item.name}-${level}`} sx={{ mb: 0.7 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            gap: 0.5
          }}>
            {/* Checkbox/Grüner Punkt LINKS - nur für Dateien */}
            {item.type === 'file' && (
              // Checkbox für alle Dateien (inklusive K_ Dateien)
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexShrink: 0
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFileShare(item.path, groupId);
                  }}
                  title={fileShares[fileShareKey(item.path, groupId)] ? 'Für Schüler freigegeben (klicken zum Deaktivieren)' : 'Nicht für Schüler sichtbar (klicken zum Freigeben)'}
                >
                  <input
                    type="checkbox"
                    checked={!!fileShares[fileShareKey(item.path, groupId)]}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleFileShare(item.path, groupId);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '14px',
                      height: '14px',
                      cursor: 'pointer',
                      accentColor: '#4caf50'
                    }}
                  />
                </Box>
            )}

            <Typography variant="body2" sx={{ 
              color: color,
              fontSize: isCorrectionFile(item.name) ? '0.9rem' : '0.75rem',
              fontWeight: fontWeight,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.5,
              mb: 0.5,
              cursor: (item.type === 'file' || item.type === 'directory') ? 'pointer' : 'default',
              textDecoration: 'none',
              wordBreak: 'break-word',
              maxWidth: '100%',
              flex: 1,
              '&:hover': (item.type === 'file' || item.type === 'directory') ? {
                color: '#1976D2'
              } : {}
            }}
            onClick={() => {
              if (item.type === 'file') {
                handleFileClick(item);
              } else if (item.type === 'directory') {
                setLessonModalData({
                  lessonName: item.name,
                  lessonPath: item.path || `${folderPath}/${item.name}`,
                  children: item.children || [],
                  groupId
                });
                setLessonModalOpen(true);
              }
            }}
            >
            {/* Dreiecke nur für Ordner - exakt wie im Screenshot */}
            {item.type === 'directory' ? (
              level === 0 ? (
                <span style={{ color: '#9c27b0' }}>▼</span> // Lila für Level 0
              ) : level === 1 ? (
                <span style={{ color: '#1976d2' }}>▼</span> // Blau für Level 1
              ) : level === 2 ? (
                <span style={{ color: '#2e7d32' }}>▼</span> // Grün für Level 2
              ) : level === 3 ? (
                <span style={{ color: '#666' }}>▼</span> // Grau für Level 3
              ) : (
                <span style={{ color: '#666' }}>▼</span> // Grau für weitere Ebenen
              )
            ) : null} {/* Kein Dreieck für Dateien */}
            <span style={{ fontSize: isCorrectionFile(item.name) ? '1.3em' : '1em', marginRight: '4px' }}>{icon}</span>
            <span style={{ 
              fontWeight: isCorrectionFile(item.name) ? 700 : fontWeight,
              fontSize: isCorrectionFile(item.name) ? '0.9rem' : '0.75rem',
              color: isCorrectionFile(item.name) ? '#ff9800' : color
            }}>{item.name}</span>
            
            {/* Icon für Bearbeitung von Prüfungsdateien */}
            {item.type === 'file' && isCorrectionFile(item.name) && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditSingleQuestion(item);
                }}
                sx={{
                  p: 0.3,
                  minWidth: 20,
                  width: 20,
                  height: 20,
                  color: '#1976d2',
                  ml: 0.5,
                  '&:hover': {
                    bgcolor: '#e3f2fd',
                    color: '#1565c0'
                  }
                }}
                title="Bearbeiten"
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}

            </Typography>
            
            {/* Erstellungs-Icons für Quiz- und Cards-Dateien */}
            {showCreateIcon && (
              <Typography variant="caption" sx={{ 
                color: '#666',
                fontSize: '0.7rem',
                userSelect: 'none',
                cursor: 'pointer',
                ml: 0.2,
                border: '1px solid #ccc',
                borderRadius: '2px',
                padding: '1px',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              title={createTooltip}
              onClick={() => {
                if (item.name.startsWith('Quiz')) {
                  // Öffne das Quiz-Erstellungsmodal direkt im Dashboard
                  handleQuizDialogOpen(item.path, item.name);
                } else if (item.name.startsWith('K_') || (item.name.endsWith('.md') && item.name.toLowerCase().includes('karteikarten'))) {
                  // Öffne das Karteikarten-Erstellungsmodal
                  handleFlashcardDialogOpen(item.path, item.name);
                } else if (item.name.startsWith('H_')) {
                  // Öffne Submissions-Grid in neuem Tab - übergebe groupId
                  window.open(`/submissions-grid?filePath=${encodeURIComponent(item.path)}&fileName=${encodeURIComponent(item.name)}&teacherId=${userId}&groupId=${groupId}`, '_blank');
                } else if (item.name.startsWith('W_') && item.name.endsWith('.wb')) {
                  // Öffne PDF-Version der Whiteboard-Datei
                  const pdfPath = item.path.replace('.wb', '.pdf');
                  handleFileClick({ ...item, path: pdfPath, name: item.name.replace('.wb', '.pdf') });
                }
              }}
              >
                {createIcon}
              </Typography>
            )}

            {/* Verarbeitungshistorie für Cards-Dateien als grünes Icon rechts neben dem Karteikarten-Icon */}
            {item.type === 'file' && (item.name.startsWith('K_') || (item.name.endsWith('.md') && item.name.toLowerCase().includes('karteikarten'))) && documentHistoryMap[item.path] && documentHistoryMap[item.path].length > 0 && (
              <Typography variant="caption" sx={{ 
                color: '#4caf50',
                fontSize: '0.7rem',
                ml: 0.2,
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              title={documentHistoryMap[item.path].map((history, index) => 
                `${history.action === 'created_deck' ? '✅' : '➕'} ${history.deckTitle} (${history.cardsCount} Karten) - ${new Date(history.processedAt).toLocaleDateString('de-DE')}`
              ).join('\n')}
              onClick={() => {
                const historyText = documentHistoryMap[item.path].map((history, index) => 
                  `${history.action === 'created_deck' ? '✅' : '➕'} ${history.deckTitle} (${history.cardsCount} Karten) - ${new Date(history.processedAt).toLocaleDateString('de-DE')}`
                ).join('\n');
                
                alert(`Verarbeitungshistorie für ${item.name}:\n\n${historyText}`);
              }}
              >
                ✅
              </Typography>
            )}
            
          </Box>
          
          {/* Rekursive Anzeige für ALLE Unterordner und Dateien - IMMER aufgeklappt */}
          {item.type === 'directory' && item.children && item.children.length > 0 && (
            <Box sx={{ ml: 2, mb: 0.7 }}>
              {itemsToDisplayItems(filterPdfFiles(item.children)).map((child: any, childIndex: number) => 
                renderItemRecursively(child, level + 1)
              )}
            </Box>
          )}
        </Box>
      );
    };
    
    return (
      <Box key={folderPath} sx={{ mb: 1.4 }}>
        {/* Hauptordner - Hellgrauer Ordner mit rotem Dreieck (immer aufgeklappt) */}
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
              Ordner ist leer (Debug: {items.length} Items geladen)
            </Typography>
          ) : (
            <Box>
              {itemsToDisplayItems(filteredItems).map((item, index) => renderItemRecursively(item, 0))}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const handleCreateGroup = async () => {
    try {
      const response = await fetch('/api/learning-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, teacherId: userId }),
      });
      if (!response.ok) throw new Error('Fehler beim Erstellen der Gruppe');
      await fetchGroups();
      setNewGroupName('');
      setOpenNewGroupDialog(false);
      showSnackbar('Lerngruppe erfolgreich erstellt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Erstellen der Lerngruppe', 'error');
    }
  };

  const handleOpenAddStudents = async (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedStudents([]); // Reset selected students when opening dialog
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/available-students`);
      if (!response.ok) throw new Error('Fehler beim Laden der verfügbaren Schüler');
      const data = await response.json();
      // State-Updates in einem Batch durchführen, um Re-Render-Loops zu vermeiden
      setAvailableStudents(data);
      // Dialog erst nach dem State-Update öffnen
      setTimeout(() => {
        setOpenAddStudentsDialog(true);
      }, 0);
    } catch (error) {
      showSnackbar('Fehler beim Laden der verfügbaren Schüler', 'error');
    }
  };

  const handleCloseAddStudentsDialog = useCallback(() => {
    if (isAddingStudentsRef.current) return; // Verhindere Schließen während des Hinzufügens
    setOpenAddStudentsDialog(false);
    setSelectedStudents([]);
  }, []);

  const handleAddStudents = async () => {
    if (isAddingStudentsRef.current) return; // Verhindere mehrfache Aufrufe
    if (!selectedGroupId || selectedStudents.length === 0) {
      showSnackbar('Bitte wählen Sie mindestens einen Schüler aus', 'error');
      return;
    }
    
    isAddingStudentsRef.current = true;
    const studentIdsToAdd = [...selectedStudents]; // Kopie für async Operation
    const groupIdToUse = selectedGroupId;
    
    // Dialog sofort schließen, um Re-Render-Loops zu vermeiden
    setOpenAddStudentsDialog(false);
    setSelectedStudents([]);
    
    try {
      const response = await fetch(`/api/learning-groups/${groupIdToUse}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: studentIdsToAdd }),
      });
      if (!response.ok) throw new Error('Fehler beim Hinzufügen der Schüler');
      await fetchGroups();
      showSnackbar('Schüler erfolgreich hinzugefügt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Hinzufügen der Schüler', 'error');
    } finally {
      isAddingStudentsRef.current = false;
    }
  };

  const handleRemoveStudent = async (groupId: string, studentId: string) => {
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/students/${studentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Fehler beim Entfernen des Schülers');
      await fetchGroups();
      showSnackbar('Schüler erfolgreich entfernt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Entfernen des Schülers', 'error');
    }
  };

  // Funktion zum Laden verfügbarer Ordner für Prüfungserstellung
  const fetchAvailableFolders = async () => {
    try {
      const response = await fetch(`/api/file-system-paths/teacher/${userId}`);
      if (response.ok) {
        const paths = await response.json();
        console.log('📁 Geladene Pfade:', paths);
        
        // Funktion zum Durchsuchen eines Pfades und Aufbauen der Baumstruktur
        const scanPath = async (pathToScan: string) => {
          try {
            const readResponse = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(pathToScan)}&recursive=true`);
            if (readResponse.ok) {
              const content = await readResponse.json();
              console.log(`📂 Inhalt von ${pathToScan}:`, content);
              
              // Filtere nur Ordner und baue Baumstruktur auf
              const buildTree = (item: any): any | null => {
                if (!item) return null;
                
                // Wenn item selbst ein Ordner ist
                if (item.type === 'directory' && item.path && item.path.startsWith('git-intern/')) {
                  const folderName = item.path === 'git-intern' 
                    ? 'J-M-Reihen' 
                    : item.path.replace('git-intern/', '').split('/').pop() || item.path;
                  
                  const children = item.children 
                    ? item.children
                        .filter((child: any) => child && child.type === 'directory' && child.path && child.path.startsWith('git-intern/'))
                        .map((child: any) => buildTree(child))
                        .filter((child: any) => child !== null)
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                    : [];
                  
                  return {
                    path: item.path,
                    name: folderName,
                    children: children
                  };
                }
                
                return null;
              };
              
              // Baue Baumstruktur auf
              let tree = null;
              
              if (content.root) {
                // Wenn root selbst ein Ordner ist
                if (content.root.type === 'directory' && content.root.path && content.root.path.startsWith('git-intern/')) {
                  tree = buildTree(content.root);
                } else if (content.root.children && Array.isArray(content.root.children)) {
                  // Wenn root.children vorhanden sind, erstelle einen virtuellen Root
                  const childFolders = content.root.children
                    .filter((item: any) => item && item.type === 'directory' && item.path && item.path.startsWith('git-intern/'))
                    .map((item: any) => buildTree(item))
                    .filter((item: any) => item !== null)
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));
                  
                  if (childFolders.length > 0) {
                    tree = {
                      path: 'git-intern',
                      name: 'J-M-Reihen',
                      children: childFolders
                    };
                  }
                }
                
                console.log('🌳 Gebaute Baumstruktur:', tree);
              } else if (content.items && Array.isArray(content.items)) {
                // Fallback: Wenn kein root, aber items vorhanden sind
                const childFolders = content.items
                  .filter((item: any) => item && item.type === 'directory' && item.path && item.path.startsWith('git-intern/'))
                  .map((item: any) => buildTree(item))
                  .filter((item: any) => item !== null)
                  .sort((a: any, b: any) => a.name.localeCompare(b.name));
                
                if (childFolders.length > 0) {
                  tree = {
                    path: 'git-intern',
                    name: 'J-M-Reihen',
                    children: childFolders
                  };
                }
              }
              
              if (tree) {
                const defaultExpanded = new Set<string>();
                const targets = new Set(['J-M-Reihen', 'Informatik', 'Mathe']);
                let defaultFolderPath = '';
                const collectExpanded = (node: any) => {
                  if (!node) return;
                  if (targets.has(node.name)) {
                    defaultExpanded.add(node.path);
                  }
                  if (!defaultFolderPath && node.name === 'Klasse 7a') {
                    defaultFolderPath = node.path;
                  }
                  if (node.children && Array.isArray(node.children)) {
                    node.children.forEach((child: any) => collectExpanded(child));
                  }
                };
                collectExpanded(tree);
                setExpandedFolderPaths(defaultExpanded);
                if (!examinationFolderPath && defaultFolderPath) {
                  setExaminationFolderPath(defaultFolderPath);
                }
                setFolderTree(tree);
                console.log('✅ Ordnerstruktur geladen:', tree);
              } else {
                console.error('❌ Baumstruktur konnte nicht aufgebaut werden');
                console.error('📂 Content:', content);
                setFolderTree(null);
              }
            } else {
              const errorText = await readResponse.text();
              console.error(`Fehler beim Lesen von ${pathToScan}:`, readResponse.status, errorText);
            }
          } catch (error) {
            console.error(`Fehler beim Scannen von ${pathToScan}:`, error);
          }
        };
        
        // Scanne alle git-intern Pfade
        const gitInternPaths = paths.filter((p: any) => p.path && p.path.startsWith('git-intern/'));
        
        if (gitInternPaths.length > 0) {
          for (const pathItem of gitInternPaths) {
            await scanPath(pathItem.path);
            break; // Nimm nur den ersten Pfad
          }
        } else {
          // Falls keine git-intern Pfade vorhanden sind, versuche den Root-Pfad
          console.log('⚠️ Keine git-intern Pfade gefunden, versuche Root-Pfad...');
          await scanPath('git-intern');
        }
      } else {
        const errorText = await response.text();
        console.error('Fehler beim Laden der Pfade:', response.status, errorText);
        setFolderTree(null);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ordner:', error);
      setFolderTree(null);
    }
  };

  // Funktion zum Rendern der Ordner-Baumstruktur
  const renderFolderTree = (node: any, level: number = 0) => {
    if (!node) return null;
    
    const isExpanded = expandedFolderPaths.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <Box key={node.path}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            py: 0.5,
            pl: level * 2,
            cursor: 'pointer',
            borderRadius: 1,
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.04)',
            },
            ...(examinationFolderPath === node.path && {
              bgcolor: '#e3f2fd',
              borderLeft: '3px solid #1976d2'
            })
          }}
          onClick={() => {
            setExaminationFolderPath(node.path);
            if (hasChildren) {
              const newExpanded = new Set(expandedFolderPaths);
              if (isExpanded) {
                newExpanded.delete(node.path);
              } else {
                newExpanded.add(node.path);
              }
              setExpandedFolderPaths(newExpanded);
            }
          }}
        >
          {hasChildren && (
            <Box sx={{ 
              width: 16, 
              height: 16, 
              mr: 0.5, 
              display: 'flex', 
              alignItems: 'center',
              color: '#666',
              fontWeight: 'bold',
              fontSize: '0.7rem'
            }}>
              {isExpanded ? '▼' : '▶'}
            </Box>
          )}
          {!hasChildren && <Box sx={{ width: 16, mr: 0.5 }} />}
          
          <Box sx={{ mr: 0.5, fontSize: '0.9rem' }}>
            📁
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.85rem',
              color: examinationFolderPath === node.path ? '#1976d2' : '#333',
              fontWeight: examinationFolderPath === node.path ? 600 : 'normal'
            }}
          >
            {node.name}
          </Typography>
        </Box>

        {/* Rekursive Anzeige der Kinder */}
        {hasChildren && isExpanded && (
          <Box>
            {node.children.map((child: any) => renderFolderTree(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  
  // Funktion zum Öffnen des Einzelfragen-Modals
  const handleEditSingleQuestion = async (item: any) => {
    setSingleQuestionFilePath(item.path);
    setExaminationQuestions([]);
    setEditingQuestion(null);
    setSingleQuestionModalOpen(true);
    setLoadingQuestions(true);
    
    try {
      const response = await fetch(`/api/file-system-paths/get-examination-questions?filePath=${encodeURIComponent(item.path)}`);
      if (response.ok) {
        const data = await response.json();
        setExaminationQuestions(data.questions || []);
        setExaminationTitle(data.title || '');
      } else {
        showSnackbar('Fehler beim Laden der Fragen', 'error');
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Fragen:', error);
      showSnackbar('Fehler beim Laden der Fragen', 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };
  
  // Funktion zum Speichern einer Frage
  const handleSaveQuestion = async (question: any) => {
    setSavingQuestion(true);
    try {
      const response = await fetch('/api/file-system-paths/update-single-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: singleQuestionFilePath,
          taskNumber: question.taskNumber,
          questionText: question.questionText,
          questionType: question.questionType,
          options: question.options || [],
          correctAnswer: question.correctAnswer || '',
          explanation: question.explanation || ''
        })
      });

      if (response.ok) {
        showSnackbar('Frage erfolgreich gespeichert!', 'success');
        setEditingQuestion(null);
        // Lade Fragen neu
        const reloadResponse = await fetch(`/api/file-system-paths/get-examination-questions?filePath=${encodeURIComponent(singleQuestionFilePath)}`);
        if (reloadResponse.ok) {
          const data = await reloadResponse.json();
          setExaminationQuestions(data.questions || []);
          setExaminationTitle(data.title || '');
        }
      } else {
        const errorText = await response.text();
        let errorMessage = 'Unbekannter Fehler';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.details || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        showSnackbar(`Fehler: ${errorMessage}`, 'error');
      }
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Frage:', error);
      showSnackbar('Fehler beim Speichern der Frage', 'error');
    } finally {
      setSavingQuestion(false);
    }
  };

  // Funktion zum Speichern des Titels
  const handleSaveTitle = async () => {
    if (!examinationTitle.trim()) {
      showSnackbar('Bitte geben Sie einen Titel ein', 'error');
      return;
    }

    setSavingTitle(true);
    try {
      const response = await fetch('/api/file-system-paths/update-examination-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: singleQuestionFilePath,
          title: examinationTitle.trim()
        })
      });

      if (response.ok) {
        showSnackbar('Titel erfolgreich gespeichert!', 'success');
      } else {
        const errorText = await response.text();
        let errorMessage = 'Unbekannter Fehler';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.details || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        showSnackbar(`Fehler: ${errorMessage}`, 'error');
      }
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Titels:', error);
      showSnackbar('Fehler beim Speichern des Titels', 'error');
    } finally {
      setSavingTitle(false);
    }
  };
  

  // Funktion zum Erstellen einer Prüfung
  const handleCreateExamination = async () => {
    if (!examinationType || !examinationFileName || !examinationFolderPath) {
      showSnackbar('Bitte füllen Sie alle Pflichtfelder aus', 'error');
      return;
    }

    try {
      const response = await fetch('/api/file-system-paths/create-examination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examType: examinationType,
          fileName: examinationFileName,
          folderPath: examinationFolderPath,
          learningGroupId: examinationLearningGroupId || null,
          title: examinationFileName || null,
          durationMinutes: examDurationMinutes
        })
      });

      if (response.ok) {
        const data = await response.json();
        showSnackbar(`Prüfung "${data.fileName}" erfolgreich erstellt!`, 'success');
        setCreateExaminationModalOpen(false);
        
        // Reset form (aber nicht die Datei-Pfade, die werden für die Inhaltserstellung benötigt)
        setExaminationType('QZ');
        setExaminationFileName('');
        setExamDurationMinutes(5);
        setExaminationFolderPath('');
        setExaminationLearningGroupId('');
      } else {
        const error = await response.json();
        showSnackbar(`Fehler: ${error.error || 'Unbekannter Fehler'}`, 'error');
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Prüfung:', error);
      showSnackbar('Fehler beim Erstellen der Prüfung', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
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
      // Zeige Quiz-Session-Manager für Lehrer
      const quizUrl = `/quiz-session/${quiz.quiz.id}`;
      navigate(quizUrl);
      return;
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

  const handleMainTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMainTabValue(newValue);
  };

  const handleSubjectTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === -1) {
      // "+" tab clicked - open subject dialog
      handleOpenSubjectDialog();
      return;
    }
    setSubjectTabValue(newValue);
    setBlockTabValue(0); // Reset block tab when subject changes
  };

  const handleOpenSubjectDialog = () => {
    // Call the SubjectManager's handleOpenDialog function
    if (subjectManagerRef.current?.handleOpenDialog) {
      subjectManagerRef.current.handleOpenDialog();
    }
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/learning-group/${groupId}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, groupId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuGroupId(groupId);
  };
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuGroupId(null);
  };
  const handleParticipationOpen = async (groupId: string, groupName: string) => {
    setParticipationGroupId(groupId);
    setParticipationGroupName(groupName);
    setCurrentLessonIndex(0);
    setParticipationModalOpen(true);
    // Lade bestehende Bewertungen
    await loadParticipations(groupId);
    // Initialisiere alle Schüler mit neutral (0) für die aktuelle Stunde, falls noch nicht vorhanden
    await initializeNeutralParticipations(groupId, 0);
    // Lade Zeitraum-Konfiguration
    await loadPeriodConfig(groupId);
    // Lade EPO-Noten für diese Gruppe
    await loadEpoGrades(groupId);
    // Lade Stichworte für alle Stunden
    await loadLessonKeywords(groupId);
    // Lade Sitzordnung
    await loadSeatingOrder(groupId);
  };
  
  const loadPeriodConfig = async (groupId: string) => {
    try {
      const response = await fetch(`/api/participation/${groupId}/periods`);
      if (response.ok) {
        const data = await response.json();
        setPeriodConfig(data);
        setTempPeriod1Hours(data.period1Hours?.toString() || '');
        setTempPeriod2Hours(data.period2Hours?.toString() || '');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zeitraum-Konfiguration:', error);
    }
  };

  // Lade Sitzordnung für eine Gruppe
  const loadSeatingOrder = async (groupId: string) => {
    try {
      console.log('📥 Lade Sitzordnung für Gruppe:', groupId);
      const response = await fetch(`/api/participation/${groupId}/seating-order`);
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Sitzordnung-Daten vom Server:', data);
        console.log('📥 seatingOrder ist Array:', Array.isArray(data.seatingOrder));
        console.log('📥 seatingOrder length:', data.seatingOrder?.length);
        
        if (data.seatingOrder && Array.isArray(data.seatingOrder)) {
          const filledSlots = data.seatingOrder.filter((id: string | null) => id !== null).length;
          const emptySlots = data.seatingOrder.filter((id: string | null) => id === null).length;
          console.log(`✅ Setze Sitzordnung: ${data.seatingOrder.length} Slots (${filledSlots} belegt, ${emptySlots} leer)`);
          console.log('✅ Erste 5 Slots:', data.seatingOrder.slice(0, 5).map((id: string | null) => id || '<LEER>'));
          
          setCustomSeatingOrder(prev => {
            const updated = {
              ...prev,
              [groupId]: data.seatingOrder
            };
            console.log('✅ State aktualisiert für Gruppe:', groupId);
            console.log('✅ Gespeicherte Gruppen:', Object.keys(updated));
            return updated;
          });
          
          // Lade auch Tisch-Positionen falls vorhanden
          if (data.deskPositions && Array.isArray(data.deskPositions) && data.deskPositions.length > 0) {
            console.log('✅ Setze Tisch-Positionen:', data.deskPositions.length);
            setDeskPositions(prev => ({
              ...prev,
              [groupId]: data.deskPositions
            }));
          }
        } else {
          console.log('ℹ️ Keine gespeicherte Sitzordnung gefunden - verwende Standard-Sortierung');
          // Lösche eventuell vorhandene alte Sitzordnung
          setCustomSeatingOrder(prev => {
            const updated = { ...prev };
            delete updated[groupId];
            return updated;
          });
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Fehler beim Laden der Sitzordnung:', response.status, response.statusText);
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sitzordnung:', error);
    }
  };

  // Speichere Sitzordnung für eine Gruppe
  const saveSeatingOrder = async (groupId: string, seatingOrder: Array<string | null>, deskPositions?: Array<{deskId: number; gridRow: number; gridCol: number}>) => {
    try {
      console.log('💾 Speichere Sitzordnung für Gruppe:', groupId, 'mit', seatingOrder.length, 'Schülern');
      if (deskPositions) {
        console.log('💾 Speichere auch', deskPositions.length, 'Tisch-Positionen');
      }
      const response = await fetch(`/api/participation/${groupId}/seating-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seatingOrder,
          deskPositions: deskPositions || []
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sitzordnung erfolgreich gespeichert:', data);
        // Aktualisiere auch den lokalen State, um sicherzustellen, dass er synchron ist
        setCustomSeatingOrder(prev => ({
          ...prev,
          [groupId]: seatingOrder
        }));
        if (deskPositions) {
          setDeskPositions(prev => ({
            ...prev,
            [groupId]: deskPositions
          }));
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Fehler beim Speichern der Sitzordnung:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Sitzordnung:', error);
    }
  };

  // Lade alle Stichworte für eine Gruppe
  const loadLessonKeywords = async (groupId: string) => {
    try {
      const response = await fetch(`/api/participation/${groupId}/keywords`);
      if (response.ok) {
        const data = await response.json();
        setLessonKeywordsMap(prev => ({
          ...prev,
          [groupId]: data
        }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Stichworte:', error);
    }
  };

  // Speichere Stichwort für eine Stunde
  const saveLessonKeyword = async (groupId: string, lessonIndex: number, keyword: string) => {
    try {
      const response = await fetch(`/api/participation/${groupId}/${lessonIndex}/keyword`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      });
      if (response.ok) {
        // Aktualisiere lokale Map
        setLessonKeywordsMap(prev => ({
          ...prev,
          [groupId]: {
            ...(prev[groupId] || {}),
            [lessonIndex]: keyword
          }
        }));
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Stichworts:', error);
    }
  };
  
  const savePeriodConfig = async () => {
    if (!participationGroupId) return;
    try {
      // Validiere Eingaben
      if (tempPeriod1Hours && (isNaN(parseInt(tempPeriod1Hours)) || parseInt(tempPeriod1Hours) < 1 || parseInt(tempPeriod1Hours) > 1000)) {
        alert('Zeitraum 1 muss zwischen 1 und 1000 Stunden liegen');
        return;
      }
      if (tempPeriod2Hours && (isNaN(parseInt(tempPeriod2Hours)) || parseInt(tempPeriod2Hours) < 1 || parseInt(tempPeriod2Hours) > 1000)) {
        alert('Zeitraum 2 muss zwischen 1 und 1000 Stunden liegen');
        return;
      }
      
      const period1Hours = tempPeriod1Hours && tempPeriod1Hours.trim() !== '' ? parseInt(tempPeriod1Hours) : null;
      const period2Hours = tempPeriod2Hours && tempPeriod2Hours.trim() !== '' ? parseInt(tempPeriod2Hours) : null;
      
      console.log('Saving period config:', { participationGroupId, period1Hours, period2Hours });
      
      const response = await fetch(`/api/participation/${participationGroupId}/periods`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period1Hours, period2Hours })
      });
      
      console.log('Response status:', response.status, response.statusText);
      console.log('Response headers:', response.headers.get('content-type'));
      
      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.error('❌ Non-JSON response:', text);
          alert('Server-Fehler: Ungültige Antwort vom Server');
          return;
        }
        setPeriodConfig(data);
        setPeriodConfigModalOpen(false);
        showSnackbar('Zeitraum-Konfiguration gespeichert', 'success');
      } else {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          console.error('❌ Non-JSON error response:', text);
          errorData = { error: `Server-Fehler: ${text.substring(0, 100)}` };
        }
        alert(errorData.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Zeitraum-Konfiguration:', error);
      alert('Fehler beim Speichern: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
  };
  
  const calculateEpoGrades = async () => {
    if (!participationGroupId) return;
    try {
      const response = await fetch(`/api/participation/${participationGroupId}/calculate-epo`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        showSnackbar(`EPO-Noten berechnet: ${data.count} Noten erstellt`, 'success');
        // Lade die berechneten EPO-Noten
        await loadEpoGrades(participationGroupId);
        // Integriere EPO-Noten ins Notenschema (mit kurzer Verzögerung, damit State aktualisiert ist)
        setTimeout(async () => {
          await integrateEpoGradesToSchema(participationGroupId);
        }, 500);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Fehler beim Berechnen der EPO-Noten');
      }
    } catch (error) {
      console.error('Fehler beim Berechnen der EPO-Noten:', error);
      alert('Fehler beim Berechnen');
    }
  };
  const loadEpoGrades = async (groupId: string) => {
    try {
      console.log('Loading EPO grades for group:', groupId);
      const response = await fetch(`/api/participation/${groupId}/epo-grades`);
      console.log('EPO grades response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded EPO grades:', data);
        console.log('EPO grades count:', data.length);
        setEpoGrades(data);
      } else {
        const errorText = await response.text();
        console.error('Error loading EPO grades:', response.status, errorText);
      }
    } catch (error) {
      console.error('Fehler beim Laden der EPO-Noten:', error);
    }
  };
  
  const releaseEpoGrade = async (period: number, isReleased: boolean) => {
    if (!participationGroupId) {
      showSnackbar('Keine Lerngruppe ausgewählt', 'error');
      return;
    }
    try {
      console.log('Releasing EPO grade:', { period, isReleased, groupId: participationGroupId });
      const response = await fetch(`/api/participation/${participationGroupId}/epo-grades/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, isReleased })
      });
      
      if (response.ok) {
        const data = await response.json();
        showSnackbar(data.message, 'success');
        // Lade EPO-Noten neu, um den Status zu aktualisieren
        await loadEpoGrades(participationGroupId);
      } else {
        let errorMessage = 'Fehler beim Freigeben';
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          // Extrahiere die Fehlermeldung aus verschiedenen möglichen Feldern
          // Bevorzuge 'message' für detaillierte Fehler, sonst 'error'
          if (errorData.message) {
            errorMessage = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          try {
            const text = await response.text();
            console.error('Error response (text):', text);
            errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
          } catch (textError) {
            console.error('Error reading response text:', textError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        console.error('Final error message:', errorMessage);
        showSnackbar(errorMessage, 'error');
      }
    } catch (error: any) {
      console.error('Fehler beim Freigeben der EPO-Note:', error);
      const errorMessage = error?.message || error?.toString() || 'Fehler beim Freigeben';
      showSnackbar(errorMessage, 'error');
    }
  };
  const integrateEpoGradesToSchema = async (groupId: string) => {
    try {
      // Lade das Notenschema für diese Gruppe
      const schemaResponse = await fetch(`/api/grading-schemas/${groupId}`);
      if (!schemaResponse.ok) {
        console.log('Kein Notenschema gefunden für Gruppe:', groupId);
        return;
      }
      
      const schemas = await schemaResponse.json();
      if (schemas.length === 0) {
        console.log('Kein Notenschema vorhanden für Gruppe:', groupId);
        return;
      }
      
      const schema = schemas[0]; // Verwende das erste Schema
      
      // Lade aktuelle EPO-Noten neu (um sicherzustellen, dass wir die neuesten haben)
      const epoResponse = await fetch(`/api/participation/${groupId}/epo-grades`);
      if (!epoResponse.ok) {
        console.error('Fehler beim Laden der EPO-Noten');
        return;
      }
      const currentEpoGrades = await epoResponse.json();
      
      if (currentEpoGrades.length === 0) {
        console.log('Keine EPO-Noten vorhanden');
        return;
      }
      
      // Für jeden Schüler: Speichere Epo 1 und Epo 2 als Noten
      let successCount = 0;
      for (const epoGrade of currentEpoGrades) {
        const categoryName = `EPO ${epoGrade.period}`;
        
        try {
          const gradeResponse = await fetch('/api/grades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: epoGrade.studentId,
              schemaId: schema.id,
              categoryName: categoryName,
              grade: epoGrade.grade,
              weight: 1.0
            })
          });
          
          if (gradeResponse.ok) {
            successCount++;
          } else {
            console.error('Fehler beim Speichern der Note für:', epoGrade.studentId, categoryName);
          }
        } catch (error) {
          console.error('Fehler beim Speichern der Note:', error);
        }
      }
      
      if (successCount > 0) {
        showSnackbar(`${successCount} EPO-Noten ins Notenschema übernommen`, 'success');
      }
    } catch (error) {
      console.error('Fehler beim Integrieren der EPO-Noten:', error);
    }
  };
  const handleParticipationClose = () => {
    setParticipationModalOpen(false);
    setParticipationGroupId(null);
    setParticipationGroupName('');
    setCurrentLessonIndex(0);
  };
  const loadParticipations = async (groupId: string) => {
    try {
      const response = await fetch(`/api/participation/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        // Konvertiere die Datenstruktur, falls nötig
        const convertedData: {[lessonIndex: number]: {[studentId: string]: {value: number; comment?: string | null}}} = {};
        Object.keys(data).forEach(lessonIndex => {
          const lessonData = data[lessonIndex];
          convertedData[parseInt(lessonIndex)] = {};
          Object.keys(lessonData).forEach(studentId => {
            const studentData = lessonData[studentId];
            if (typeof studentData === 'object' && studentData !== null) {
              convertedData[parseInt(lessonIndex)][studentId] = {
                value: studentData.value,
                comment: studentData.comment || undefined
              };
            } else {
              // Fallback für alte Datenstruktur
              convertedData[parseInt(lessonIndex)][studentId] = {
                value: studentData
              };
            }
          });
        });
        setParticipations(prev => ({
          ...prev,
          [groupId]: convertedData
        }));
      } else {
        const errorText = await response.text();
        console.error('Fehler beim Laden der Mitarbeitsbewertungen:', errorText);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeitsbewertungen:', error);
    }
  };
  const handleParticipationClick = (studentId: string, isLeft: boolean, isDoubleClick: boolean = false) => {
    if (!participationGroupId) return;
    const groupKey = participationGroupId;
    const lessonKey = currentLessonIndex;
    
    setParticipations(prev => {
      const groupData = prev[groupKey] || {};
      const lessonData = groupData[lessonKey] || {};
      const currentData = lessonData[studentId];
      const currentValue = typeof currentData === 'object' && currentData !== null 
        ? currentData.value 
        : (typeof currentData === 'number' ? currentData : 0);
      const currentComment = typeof currentData === 'object' && currentData !== null 
        ? currentData.comment 
        : undefined;
      
      let newValue = 0;
      
      // Doppelklick: Immer zurück auf neutral (0)
      if (isDoubleClick) {
        newValue = 0;
      } else if (isLeft) {
        // Links: 0 -> -1 (schlecht) -> -2 (sehr schlecht) -> 0 (neutral)
        if (currentValue === 0) newValue = -1;
        else if (currentValue === -1) newValue = -2;
        else if (currentValue === -2) newValue = 0; // Zurück zu neutral
        else newValue = -1; // Von positivem Wert zu -1
      } else {
        // Rechts: 0 -> 1 (gut) -> 2 (sehr gut) -> 0 (neutral)
        // Doppelklick rechts = sehr gut = Wert 2
        if (currentValue === 0) newValue = 1;
        else if (currentValue === 1) newValue = 2;
        else if (currentValue === 2) newValue = 0; // Zurück zu neutral
        else newValue = 1; // Von negativem Wert zu 1 (gut)
      }
      
      const updatedLessonData = { 
        ...lessonData, 
        [studentId]: {
          value: newValue,
          comment: currentComment
        }
      };
      const updatedGroupData = { ...groupData, [lessonKey]: updatedLessonData };
      
      // Speichere im Backend
      saveParticipation(groupKey, lessonKey, studentId, newValue);
      
      return {
        ...prev,
        [groupKey]: updatedGroupData
      };
    });
  };
  // Ref für Long-Press Timer
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStudentRef = useRef<{ studentId: string; studentName: string } | null>(null);

  // Gemeinsame Funktion zum Öffnen des Kommentar-Modals
  const openCommentModal = (studentId: string, studentName: string) => {
    setCommentStudentId(studentId);
    setCommentStudentName(studentName);
    
    // Lade aktuellen Kommentar, falls vorhanden
    if (participationGroupId) {
      const groupData = participations[participationGroupId] || {};
      const lessonData = groupData[currentLessonIndex] || {};
      const studentData = lessonData[studentId];
      if (studentData && typeof studentData === 'object' && studentData.comment) {
        setCommentText(studentData.comment);
      } else {
        setCommentText('');
      }
    }
    
    setCommentModalOpen(true);
  };

  const handleCommentRightClick = (e: React.MouseEvent, studentId: string, studentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    openCommentModal(studentId, studentName);
  };

  // Touch-Handler für Long-Press
  const handleTouchStart = (e: React.TouchEvent, studentId: string, studentName: string) => {
    // Verhindere Scroll während Long-Press
    e.stopPropagation();
    
    // Speichere Student-Info für Timer
    longPressStudentRef.current = { studentId, studentName };
    
    // Setze Timer für Long-Press (500ms)
    longPressTimerRef.current = setTimeout(() => {
      if (longPressStudentRef.current) {
        openCommentModal(longPressStudentRef.current.studentId, longPressStudentRef.current.studentName);
        longPressStudentRef.current = null;
      }
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Stoppe Timer wenn Touch vor Ablauf beendet wird
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStudentRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Wenn Finger bewegt wird, stoppe Long-Press
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStudentRef.current = null;
  };

  // Cleanup: Timer beim Unmount aufräumen
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressStudentRef.current = null;
    };
  }, []);
  
  const handleCommentSave = async () => {
    if (!participationGroupId || !commentStudentId) return;
    
    try {
      const response = await fetch(
        `/api/participation/${participationGroupId}/${currentLessonIndex}/${commentStudentId}/comment`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ comment: commentText.trim() || null })
        }
      );
      
      if (response.ok) {
        // Aktualisiere lokalen State
        setParticipations(prev => {
          const groupData = prev[participationGroupId] || {};
          const lessonData = groupData[currentLessonIndex] || {};
          const studentData = lessonData[commentStudentId];
          const currentValue = typeof studentData === 'object' && studentData !== null 
            ? studentData.value 
            : (typeof studentData === 'number' ? studentData : 0);
          
          const updatedLessonData = {
            ...lessonData,
            [commentStudentId]: {
              value: currentValue,
              comment: commentText.trim() || undefined
            }
          };
          const updatedGroupData = {
            ...groupData,
            [currentLessonIndex]: updatedLessonData
          };
          
          return {
            ...prev,
            [participationGroupId]: updatedGroupData
          };
        });
        
        setCommentModalOpen(false);
        setCommentStudentId(null);
        setCommentStudentName('');
        setCommentText('');
      } else {
        console.error('Fehler beim Speichern des Kommentars');
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Kommentars:', error);
    }
  };
  
  const handleCommentClose = () => {
    setCommentModalOpen(false);
    setCommentStudentId(null);
    setCommentStudentName('');
    setCommentText('');
  };

  // Funktion zum Löschen aller Kommentare für eine bestimmte Unterrichtsstunde
  const deleteAllCommentsForLesson = async (groupId: string, lessonIndex: number) => {
    if (!groupId) return;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const confirmed = window.confirm(`Möchten Sie wirklich alle Kommentare für Unterrichtsstunde ${lessonIndex + 1} löschen?`);
    if (!confirmed) return;

    try {
      // Lösche alle Kommentare für diese Stunde
      for (const student of group.students) {
        await fetch(`/api/participation/${groupId}/${lessonIndex}/${student.id}/comment`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: null })
        });
      }

      // Aktualisiere lokalen State
      setParticipations(prev => {
        const groupData = prev[groupId] || {};
        const lessonData = { ...(groupData[lessonIndex] || {}) };
        
        // Entferne Kommentare aus allen Schülern dieser Stunde
        Object.keys(lessonData).forEach(studentId => {
          const studentData = lessonData[studentId];
          if (studentData && typeof studentData === 'object') {
            lessonData[studentId] = {
              value: studentData.value,
              // Kommentar entfernen
            };
          }
        });

        return {
          ...prev,
          [groupId]: {
            ...groupData,
            [lessonIndex]: lessonData
          }
        };
      });

      // Lade die Daten neu, um sicherzustellen, dass alles synchron ist
      await loadParticipations(groupId);

      alert(`Alle Kommentare für Unterrichtsstunde ${lessonIndex + 1} wurden gelöscht.`);
    } catch (error) {
      console.error('Fehler beim Löschen der Kommentare:', error);
      alert('Fehler beim Löschen der Kommentare.');
    }
  };

  const saveParticipation = async (groupId: string, lessonIndex: number, studentId: string, value: number) => {
    try {
      const response = await fetch(`/api/participation/${groupId}/${lessonIndex}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, value })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fehler beim Speichern der Mitarbeitsbewertung:', errorText);
      } else {
        // Nach erfolgreichem Speichern: Lade die Daten neu, um sicherzustellen, dass alles synchron ist
        await loadParticipations(groupId);
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };
  const addLesson = async () => {
    const newIndex = currentLessonIndex + 1;
    setCurrentLessonIndex(newIndex);
    // Initialisiere alle Schüler mit neutral (0) für die neue Stunde, falls noch nicht vorhanden
    if (participationGroupId) {
      await initializeNeutralParticipations(participationGroupId, newIndex);
      // Lade die Daten neu, um die neuen Einträge zu sehen
      await loadParticipations(participationGroupId);
    }
  };
  const initializeNeutralParticipations = async (groupId: string, lessonIndex: number) => {
    if (!participationGroupId) return;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Prüfe welche Schüler bereits eine Bewertung für diese Stunde haben
    const groupData = participations[groupId] || {};
    const lessonData = groupData[lessonIndex] || {};
    
    // Initialisiere alle Schüler, die noch keine Bewertung haben, mit 0 (neutral)
    for (const student of group.students) {
      if (lessonData[student.id] === undefined) {
        // Speichere neutrale Bewertung in der Datenbank
        await saveParticipation(groupId, lessonIndex, student.id, 0);
      }
    }
  };
  const getParticipationValue = (studentId: string): number => {
    if (!participationGroupId) return 0;
    const groupData = participations[participationGroupId] || {};
    const lessonData = groupData[currentLessonIndex] || {};
    const studentData = lessonData[studentId];
    if (typeof studentData === 'object' && studentData !== null) {
      return studentData.value || 0;
    }
    return typeof studentData === 'number' ? studentData : 0;
  };
  
  const getParticipationComment = (studentId: string): string | undefined => {
    if (!participationGroupId) return undefined;
    const groupData = participations[participationGroupId] || {};
    const lessonData = groupData[currentLessonIndex] || {};
    const studentData = lessonData[studentId];
    if (typeof studentData === 'object' && studentData !== null) {
      return studentData.comment || undefined;
    }
    return undefined;
  };
  const calculateParticipationGrade = (studentId: string): number | null => {
    if (!participationGroupId) return null;
    const groupData = participations[participationGroupId] || {};
    const lessons = Object.keys(groupData).map(Number);
    if (lessons.length === 0) return null;
    
    let total = 0;
    let count = 0;
    lessons.forEach(lessonIndex => {
      const studentData = groupData[lessonIndex][studentId];
      const value = typeof studentData === 'object' && studentData !== null 
        ? studentData.value 
        : (typeof studentData === 'number' ? studentData : undefined);
      if (value !== undefined) {
        total += value;
        count++;
      }
    });
    
    if (count === 0) return null;
    const average = total / count;
    
    // Konvertiere Durchschnittswert zu Note (2 = sehr gut = 1.0, 1 = gut = 2.0, 0 = neutral = 3.0, -1 = schlecht = 4.0, -2 = sehr schlecht = 5.0)
    if (average >= 1.5) return 1.0;
    if (average >= 0.5) return 2.0;
    if (average >= -0.5) return 3.0;
    if (average >= -1.5) return 4.0;
    return 5.0;
  };
  const handleStatisticsOpen = async () => {
    if (!participationGroupId) return;
    setStatisticsModalOpen(true);
    setStatsLoading(true);
    try {
      const response = await fetch(`/api/participation/${participationGroupId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setParticipationStats(data);
      } else {
        console.error('Fehler beim Laden der Statistiken');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    } finally {
      setStatsLoading(false);
    }
  };
  const handleStatisticsClose = () => {
    setStatisticsModalOpen(false);
    setParticipationStats([]);
  };
  
  // Reset all participations for the group
  const handleResetAllParticipations = async () => {
    if (!participationGroupId) return;
    
    if (resetConfirmationText !== 'ZURÜCKSETZEN') {
      alert('Bitte geben Sie "ZURÜCKSETZEN" ein, um fortzufahren.');
      return;
    }

    try {
      const url = `/api/participation/reset-all-participations/${participationGroupId}`;
      console.log('Reset request URL:', url);
      console.log('Reset request groupId:', participationGroupId);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('Reset response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Reset response data:', data);
        
        // Refresh participations and stats
        await loadParticipations(participationGroupId);
        await handleStatisticsOpen();
        
        // Reset EPO grades state
        if (participationGroupId) {
          await loadEpoGrades(participationGroupId);
        }
        
        setResetDialogOpen(false);
        setResetConfirmationText('');
        alert('Alle Bewertungen und Kommentare wurden erfolgreich zurückgesetzt.');
      } else {
        const errorText = await response.text();
        console.error('Reset error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Unbekannter Fehler' };
        }
        alert(`Fehler beim Zurücksetzen: ${error.error || error.message || 'Unbekannter Fehler'}`);
      }
    } catch (error: any) {
      console.error('Fehler beim Zurücksetzen:', error);
      alert(`Fehler beim Zurücksetzen der Bewertungen: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  // Export-Funktionen für Epochalstatistik
  const exportToCSV = () => {
    if (!sortedParticipationStats.length || !participationGroupId) return;
    const headers = ['Schüler', 'Anzahl', 'Durchschnitt', 'Zeitraum 1', 'Zeitraum 2', 'Gesamtnote', 'Epo 1', 'Epo 2'];
    const rows = sortedParticipationStats.map((stat: any) => {
      const epo1 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 1);
      const epo2 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 2);
      return [
        formatStudentName(stat.student.name),
        stat.count,
        stat.average.toFixed(2),
        stat.period1 ? `${stat.period1.count}× ${stat.period1.grade?.toFixed(1) || '-'}` : '-',
        stat.period2 ? `${stat.period2.count}× ${stat.period2.grade?.toFixed(1) || '-'}` : '-',
        stat.grade?.toFixed(1) || '-',
        epo1 ? epo1.grade.toFixed(1) : '-',
        epo2 ? epo2.grade.toFixed(1) : '-'
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Epochalstatistik_${participationGroupName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    if (!sortedParticipationStats.length || !participationGroupId) return;
    // Excel-Export als CSV mit Tab-Trennung (kann in Excel geöffnet werden)
    const headers = ['Schüler', 'Anzahl', 'Durchschnitt', 'Zeitraum 1', 'Zeitraum 2', 'Gesamtnote', 'Epo 1', 'Epo 2'];
    const rows = sortedParticipationStats.map((stat: any) => {
      const epo1 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 1);
      const epo2 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 2);
      return [
        formatStudentName(stat.student.name),
        stat.count,
        stat.average.toFixed(2),
        stat.period1 ? `${stat.period1.count}× ${stat.period1.grade?.toFixed(1) || '-'}` : '-',
        stat.period2 ? `${stat.period2.count}× ${stat.period2.grade?.toFixed(1) || '-'}` : '-',
        stat.grade?.toFixed(1) || '-',
        epo1 ? epo1.grade.toFixed(1) : '-',
        epo2 ? epo2.grade.toFixed(1) : '-'
      ];
    });
    // Tab-getrenntes Format für Excel
    const excelContent = [headers, ...rows].map(row => row.join('\t')).join('\n');
    const blob = new Blob(['\ufeff' + excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Epochalstatistik_${participationGroupName}_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    if (!sortedParticipationStats.length || !participationGroupId) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Epochalstatistik: ${participationGroupName}`, 14, 20);
      doc.setFontSize(10);
      let y = 35;
      const headers = ['Schüler', 'Anzahl', 'Ø', 'Z1', 'Z2', 'Gesamt', 'EPO1', 'EPO2'];
      const colWidths = [60, 20, 15, 20, 20, 20, 20, 20];
      let x = 14;
      headers.forEach((header, i) => {
        doc.text(header, x, y);
        x += colWidths[i];
      });
      y += 7;
      sortedParticipationStats.forEach((stat: any) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const epo1 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 1);
        const epo2 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 2);
        x = 14;
        const row = [
          formatStudentName(stat.student.name).substring(0, 25),
          stat.count.toString(),
          stat.average.toFixed(1),
          stat.period1 ? `${stat.period1.count}×` : '-',
          stat.period2 ? `${stat.period2.count}×` : '-',
          stat.grade?.toFixed(1) || '-',
          epo1 ? epo1.grade.toFixed(1) : '-',
          epo2 ? epo2.grade.toFixed(1) : '-'
        ];
        row.forEach((cell, i) => {
          doc.text(cell, x, y);
          x += colWidths[i];
        });
        y += 7;
      });
      doc.save(`Epochalstatistik_${participationGroupName}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('Fehler beim Exportieren als PDF');
    }
  };

  const exportToWord = async () => {
    if (!sortedParticipationStats.length || !participationGroupId) return;
    try {
      const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType } = await import('docx');
      const rows = sortedParticipationStats.map((stat: any) => {
        const epo1 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 1);
        const epo2 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 2);
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(formatStudentName(stat.student.name))] }),
            new TableCell({ children: [new Paragraph(stat.count.toString())] }),
            new TableCell({ children: [new Paragraph(stat.average.toFixed(2))] }),
            new TableCell({ children: [new Paragraph(stat.period1 ? `${stat.period1.count}× ${stat.period1.grade?.toFixed(1) || '-'}` : '-')] }),
            new TableCell({ children: [new Paragraph(stat.period2 ? `${stat.period2.count}× ${stat.period2.grade?.toFixed(1) || '-'}` : '-')] }),
            new TableCell({ children: [new Paragraph(stat.grade?.toFixed(1) || '-')] }),
            new TableCell({ children: [new Paragraph(epo1 ? epo1.grade.toFixed(1) : '-')] }),
            new TableCell({ children: [new Paragraph(epo2 ? epo2.grade.toFixed(1) : '-')] })
          ]
        });
      });
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              text: `Epochalstatistik: ${participationGroupName}`,
              heading: HeadingLevel.HEADING_1
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph('Schüler')] }),
                    new TableCell({ children: [new Paragraph('Anzahl')] }),
                    new TableCell({ children: [new Paragraph('Durchschnitt')] }),
                    new TableCell({ children: [new Paragraph('Zeitraum 1')] }),
                    new TableCell({ children: [new Paragraph('Zeitraum 2')] }),
                    new TableCell({ children: [new Paragraph('Gesamtnote')] }),
                    new TableCell({ children: [new Paragraph('Epo 1')] }),
                    new TableCell({ children: [new Paragraph('Epo 2')] })
                  ]
                }),
                ...rows
              ],
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Epochalstatistik_${participationGroupName}_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim Word-Export:', error);
      alert('Fehler beim Exportieren als Word');
    }
  };

  const exportToJSON = () => {
    if (!sortedParticipationStats.length || !participationGroupId) return;
    const data = {
      groupName: participationGroupName,
      exportDate: new Date().toISOString(),
      stats: sortedParticipationStats.map((stat: any) => {
        const epo1 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 1);
        const epo2 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 2);
        return {
          student: formatStudentName(stat.student.name),
          count: stat.count,
          average: stat.average,
          period1: stat.period1 ? { count: stat.period1.count, grade: stat.period1.grade } : null,
          period2: stat.period2 ? { count: stat.period2.count, grade: stat.period2.grade } : null,
          grade: stat.grade,
          epo1: epo1 ? epo1.grade : null,
          epo2: epo2 ? epo2.grade : null
        };
      })
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Epochalstatistik_${participationGroupName}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteDialogOpen = (groupId: string) => {
    setDeleteGroupId(groupId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteGroupId(null);
    setConfirmDelete1(false);
    setConfirmDelete2(false);
    setConfirmDeleteWord('');
  };
  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    try {
      const res = await fetch(`/api/learning-groups/${deleteGroupId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchGroups();
      showSnackbar('Lerngruppe gelöscht', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Löschen', 'error');
    } finally {
      handleDeleteDialogClose();
    }
  };

  const handleEditDialogOpen = (groupId: string, currentName: string) => {
    setEditGroupId(groupId);
    setEditGroupName(currentName);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditGroupId(null);
    setEditGroupName('');
  };

  const handleEditGroup = async () => {
    if (!editGroupId || !editGroupName.trim()) return;
    try {
      const response = await fetch(`/api/learning-groups/${editGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editGroupName.trim() }),
      });
      if (!response.ok) throw new Error('Fehler beim Bearbeiten der Lerngruppe');
      await fetchGroups();
      showSnackbar('Lerngruppe erfolgreich bearbeitet', 'success');
      handleEditDialogClose();
    } catch (error) {
      showSnackbar('Fehler beim Bearbeiten der Lerngruppe', 'error');
    }
  };

  const handleGradingDialogOpen = (groupId: string, groupName: string) => {
    setGradingGroupId(groupId);
    setGradingGroupName(groupName);
    setGradingModalOpen(true);
    handleMenuClose();
  };

  const handleGradingDialogClose = () => {
    setGradingModalOpen(false);
    setGradingGroupId(null);
    setGradingGroupName('');
  };

  const handleGradesDialogOpen = (groupId: string, groupName: string, student: Student) => {
    setGradesGroupId(groupId);
    setGradesGroupName(groupName);
    setSelectedStudent(student);
    setGradesModalOpen(true);
    handleMenuClose();
  };

  const handleGradesDialogClose = () => {
    setGradesModalOpen(false);
    setGradesGroupId(null);
    setGradesGroupName('');
    setSelectedStudent(null);
  };

  const handleFolderAssignmentOpen = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setFolderAssignmentGroupId(groupId);
      setFolderAssignmentGroupName(group.name);
      setFolderAssignmentModalOpen(true);
      handleMenuClose();
    }
  };

  const handleFolderAssignmentClose = () => {
    setFolderAssignmentModalOpen(false);
    setFolderAssignmentGroupId(null);
    setFolderAssignmentGroupName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onLogout();
      e.preventDefault();
    } else if (e.key === 'Tab') {
      return; // Let Tab work normally for accessibility
            } else if (e.key === 'ArrowRight' && mainTabValue < 3) {
      e.preventDefault();
      setMainTabValue(mainTabValue + 1);
    } else if (e.key === 'ArrowLeft' && mainTabValue > 0) {
      e.preventDefault();
      setMainTabValue(mainTabValue - 1);
    }
  };

  useEffect(() => {
    dashboardRef.current?.focus();
  }, []);

  // Helfer: Schema parsen -> Hierarchie
  const parseSchemaStructureMini = (schemaStr: string) => {
    const lines = schemaStr.split('\n').filter(l => l.trim());
    const result: any[] = [];
    const stack: { node: any; indent: number }[] = [];
    for (const line of lines) {
      const indent = line.search(/\S/);
      const m = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
      if (!m) continue;
      const name = m[1].trim();
      const weight = parseFloat(m[2]);
      const node = { name, weight, children: [] as any[] };
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      if (stack.length === 0) result.push(node); else stack[stack.length - 1].node.children.push(node);
      stack.push({ node, indent });
    }
    return result;
  };

  const calculateWeightedMini = (node: any, gradesByName: Map<string, GradeMini>): number | null => {
    if (!node.children || node.children.length === 0) {
      // Suche case-insensitive nach der Note
      let g = gradesByName.get(node.name);
      if (!g) {
        // Fallback: Suche case-insensitive
        const nodeNameLower = node.name.toLowerCase().trim();
        for (const [categoryName, gradeData] of gradesByName.entries()) {
          if (categoryName.toLowerCase().trim() === nodeNameLower) {
            g = gradeData;
            break;
          }
        }
      }
      return g ? g.grade : null;
    }
    const childGrades: { grade: number; weight: number }[] = [];
    for (const child of node.children) {
      const cg = calculateWeightedMini(child, gradesByName);
      if (cg !== null) childGrades.push({ grade: cg, weight: child.weight });
    }
    if (childGrades.length === 0) return null;
    const totalW = childGrades.reduce((s, c) => s + c.weight, 0);
    if (totalW === 0) return null;
    const sum = childGrades.reduce((s, c) => s + c.grade * c.weight, 0);
    return sum / totalW;
  };

  const computeNodeWithGrade = (node: any, gradesByName: Map<string, GradeMini>): MiniGradeNode => {
    const gradeValue = calculateWeightedMini(node, gradesByName);
    const children: MiniGradeNode[] = (node.children || []).map((c: any) => computeNodeWithGrade(c, gradesByName));
    return { name: node.name, grade: gradeValue, children };
  };

  const collectLeaves = (node: MiniGradeNode): MiniGradeNode[] => {
    if (!node.children || node.children.length === 0) return [node];
    return node.children.flatMap(collectLeaves);
  };

  const groupLeavesBySecondLevel = (root: MiniGradeNode): { group: string; leaves: MiniGradeNode[] }[] => {
    // Gruppiere nach unmittelbaren Kindern von root
    return (root.children || []).map(second => ({ group: second.name, leaves: collectLeaves(second) }));
  };

  const shouldHideRoot = (name: string): boolean => {
    const n = name.toLowerCase();
    // Anzeige für Unter- und Mittelstufe weglassen
    return n.includes('unter') || n.includes('mittel');
  };

  const sortNodesByPriority = (nodes: MiniGradeNode[]): MiniGradeNode[] => {
    const priority = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('schrift') || n.includes('kursarbeit')) return 1; // Schriftlich/Klassenarbeiten zuerst
      if (n.includes('epo') || n.includes('epo')) return 2; // EPO danach
      if (n.includes('quiz') || n.includes('quiz')) return 3; // Quizze danach
      if (n.includes('sonstig')) return 4; // Sonstiges zuletzt
      return 99;
    };
    return [...nodes].sort((a, b) => priority(a.name) - priority(b.name));
  };

  const getGradeStats = (nodes: MiniGradeNode[], gradingSystem: string) => {
    const stats = {
      klassenarbeiten: { values: [] as number[], label: 'KAs', individualGrades: [] as { name: string; grade: number }[] },
      epo: { values: [] as number[], label: 'EPO', individualGrades: [] as { name: string; grade: number }[] },
      quizze: { values: [] as number[], label: 'Quizze', individualGrades: [] as { name: string; grade: number }[] },
      sonstiges: { values: [] as number[], label: 'Sonstige', individualGrades: [] as { name: string; grade: number }[] }
    };

    // Sammle alle Blatt-Noten und gruppiere sie
    const allLeaves = nodes.flatMap(root => collectLeaves(root));
    
    for (const leaf of allLeaves) {
      if (leaf.grade === null || leaf.grade === undefined) continue;
      
      const name = leaf.name.toLowerCase();
      if (name.includes('ka') || name.includes('klassenarbeit') || name.includes('schrift')) {
        stats.klassenarbeiten.values.push(leaf.grade);
        stats.klassenarbeiten.individualGrades.push({ name: leaf.name, grade: leaf.grade });
      } else if (name.includes('epo')) {
        stats.epo.values.push(leaf.grade);
        stats.epo.individualGrades.push({ name: leaf.name, grade: leaf.grade });
      } else if (name.includes('quiz') || name.includes('quiz') || name.includes('test')) {
        stats.quizze.values.push(leaf.grade);
        stats.quizze.individualGrades.push({ name: leaf.name, grade: leaf.grade });
      } else {
        stats.sonstiges.values.push(leaf.grade);
        stats.sonstiges.individualGrades.push({ name: leaf.name, grade: leaf.grade });
      }
    }

    return stats;
  };

  const formatGradeValue = (values: number[], gradingSystem: string) => {
    if (values.length === 0) return '–';
    if (values.length === 1) {
      return gradingSystem === 'MSS' ? values[0].toFixed(0) : formatGermanMini(values[0]);
    }
    // Bei mehreren Werten: Durchschnitt
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return gradingSystem === 'MSS' ? avg.toFixed(0) : formatGermanMini(avg);
  };

  const formatGermanMini = (grade: number) => {
    // gleiche Logik wie StudentDashboard, kurz gefasst
    return grade.toFixed(1).replace('.', ',');
  };

  const getGradeColorMini = (grade: number, gradingSystem: string = 'GERMAN'): string => {
    if (gradingSystem === 'MSS') {
      if (grade >= 13) return '#4CAF50';
      if (grade >= 10) return '#8BC34A';
      if (grade >= 7) return '#FF9800';
      if (grade >= 4) return '#F57C00';
      if (grade >= 1) return '#FF5722';
      return '#C2185B';
    }
    if (grade <= 1.7) return '#4CAF50';
    if (grade <= 2.7) return '#8BC34A';
    if (grade <= 3.7) return '#FF9800';
    if (grade <= 4.7) return '#F57C00';
    if (grade <= 6.0) return '#C2185B';
    return '#9E9E9E';
  };
  const ensureMiniGrades = async (groupId: string, studentId: string) => {
    const key = `${groupId}:${studentId}`;
    if (miniGradesMap[key]?.loading || miniGradesMap[key]?.overall !== undefined) return;
    setMiniGradesMap(prev => ({ ...prev, [key]: { loading: true, gradingSystem: 'GERMAN', overall: undefined, nodes: [] } }));
    try {
      const schemaRes = await fetch(`/api/grading-schemas/${groupId}`);
      if (!schemaRes.ok) throw new Error('schema');
      const schemas: GradingSchemaMini[] = await schemaRes.json();
      if (schemas.length === 0) throw new Error('no schema');
      const schema = schemas[0];
      const gradesRes = await fetch(`/api/grades/${studentId}/${schema.id}`);
      const studentGrades: GradeMini[] = gradesRes.ok ? await gradesRes.json() : [];
      const gradesMap = new Map(studentGrades.map(g => [g.categoryName, g] as const));
      const roots = parseSchemaStructureMini(schema.structure);
      // overall: gewichtetes Mittel der Root-Knoten
      const rootWithCalc = roots.map((r: any) => ({ name: r.name, grade: calculateWeightedMini(r, gradesMap) }));
      const validRoots = rootWithCalc.filter(r => r.grade !== null) as { name: string; grade: number }[];
      let overall: number | null = null;
      if (validRoots.length > 0) {
        // benutze Root-Gewichte aus Struktur
        const totalW = roots.reduce((s: number, r: any) => s + r.weight, 0);
        if (totalW > 0) {
          const sum = roots.reduce((s: number, r: any) => {
            const g = rootWithCalc.find(x => x.name === r.name)?.grade;
            return g !== null && g !== undefined ? s + (g as number) * r.weight : s;
          }, 0);
          overall = sum / totalW;
        }
      }
      // Hierarchische Knoten für Anzeige berechnen
      const nodes: MiniGradeNode[] = roots.map((r: any) => computeNodeWithGrade(r, gradesMap));
      setMiniGradesMap(prev => ({ ...prev, [key]: { loading: false, gradingSystem: schema.gradingSystem || 'GERMAN', overall, nodes } }));
    } catch (e) {
      setMiniGradesMap(prev => ({ ...prev, [key]: { loading: false, gradingSystem: 'GERMAN', overall: null, nodes: [] } }));
    }
  };
  const handleStudentMenuOpen = (e: React.MouseEvent<HTMLElement>, groupId: string, student: Student) => {
    e.stopPropagation();
    setStudentMenuAnchorEl(e.currentTarget);
    setStudentMenuCtx({ groupId, student });
  };

  const handleStudentCardClick = (groupId: string, student: Student) => {
    const cardElement = document.querySelector(`[data-student-id="${student.id}"]`);
    setStudentMenuAnchorEl(cardElement as HTMLElement);
    setStudentMenuCtx({ groupId, student });
  };
  const handleStudentMenuClose = () => {
    setStudentMenuAnchorEl(null);
    setStudentMenuCtx(null);
  };

  const handleRemoveStudentDialogOpen = (groupId: string, student: Student) => {
    setRemoveStudentCtx({ groupId, student });
    setRemoveStudentDialogOpen(true);
    setConfirmRemoveStudent1(false);
    setConfirmRemoveStudent2(false);
    setConfirmRemoveStudentWord('');
    handleStudentMenuClose();
  };

  const handleRemoveStudentDialogClose = () => {
    setRemoveStudentDialogOpen(false);
    setRemoveStudentCtx(null);
    setConfirmRemoveStudent1(false);
    setConfirmRemoveStudent2(false);
    setConfirmRemoveStudentWord('');
  };

  const handleRemoveStudentConfirm = async () => {
    if (!removeStudentCtx) return;
    try {
      await handleRemoveStudent(removeStudentCtx.groupId, removeStudentCtx.student.id);
      handleRemoveStudentDialogClose();
    } catch (error) {
      // Error handling is already in handleRemoveStudent
    }
  };

  // Ordner-Zuordnung States
  const [folderAssignmentModalOpen, setFolderAssignmentModalOpen] = useState(false);
  const [folderAssignmentGroupId, setFolderAssignmentGroupId] = useState<string | null>(null);
  const [folderAssignmentGroupName, setFolderAssignmentGroupName] = useState('');
  const [assignedFolders, setAssignedFolders] = useState<{[groupId: string]: string[]}>({});

  // Test-Funktion für den MaterialCreator-Ref
  const testMaterialCreatorRef = () => {
    console.log('Testing MaterialCreator ref:', materialCreatorRef.current);
    if (materialCreatorRef.current) {
      console.log('Ref is available, testing openQuizWithSource...');
      materialCreatorRef.current.openQuizWithSource('/test/path', 'TestQuiz.docx');
    } else {
      console.error('MaterialCreator ref is not available');
    }
  };

  // Neue States für Quiz-Erstellung direkt im Dashboard
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [selectedQuizFile, setSelectedQuizFile] = useState<{ path: string; name: string } | null>(null);
  
  // Flashcard creation modal state
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardSourceFile, setFlashcardSourceFile] = useState('');
  const [flashcardFileName, setFlashcardFileName] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [gradeCategory, setGradeCategory] = useState<string>('');
  const [selectedGradeSchema, setSelectedGradeSchema] = useState<string>('');
  const [availableGradeCategories, setAvailableGradeCategories] = useState<Array<{ schemaId: string; schemaName: string; category: string }>>([]);
  
  // State für Quiz-Status
  const [quizStatusMap, setQuizStatusMap] = useState<Map<string, { 
    exists: boolean; 
    quizId?: string; 
    title?: string;
    sessionId?: string;
    resultsReleased?: boolean;
  }>>(new Map());

  // Quiz-Erstellung direkt im Dashboard
  const handleQuizDialogOpen = (filePath: string, fileName: string) => {
    setSelectedQuizFile({ path: filePath, name: fileName });
    setQuizTitle(fileName.replace(/\.[^/.]+$/, "")); // Titel aus Dateinamen
    setQuizDescription('');
    setQuizTimeLimit(30);
    setShuffleQuestions(true);
    setShuffleAnswers(true);
    setGradeCategory('');
    setSelectedGradeSchema('');
    setQuizDialogOpen(true);
    loadGradeSchemas();
  };

  const handleQuizDialogClose = () => {
    setQuizDialogOpen(false);
    setSelectedQuizFile(null);
    setQuizTitle('');
    setQuizDescription('');
    setQuizTimeLimit(30);
    setShuffleQuestions(true);
    setShuffleAnswers(true);
    setGradeCategory('');
    setSelectedGradeSchema('');
  };

  // Flashcard creation handlers
  const handleFlashcardDialogOpen = (filePath: string, fileName: string) => {
    setFlashcardSourceFile(filePath);
    setFlashcardFileName(fileName);
    setFlashcardModalOpen(true);
  };

  const handleFlashcardDialogClose = () => {
    setFlashcardModalOpen(false);
    setFlashcardSourceFile('');
    setFlashcardFileName('');
  };

  const handleFlashcardSuccess = () => {
    // Refresh data if needed
    console.log('Flashcard deck created/updated successfully');
  };

  const loadGradeSchemas = async () => {
    try {
      const response = await fetch('/api/grading-schemas/all');
      if (!response.ok) {
        throw new Error('Failed to fetch grading schemas');
      }
      
      const schemas = await response.json();
      
      // Extract ONLY quiz-related grade categories from all schemas
      const quizCategories: Array<{category: string, schemaName: string, schemaId: string}> = [];
      
      schemas.forEach((schema: any) => {
        const structure = schema.structure;
        const lines = structure.split('\n');
        
        lines.forEach((line: string) => {
          const trimmedLine = line.trim();
          // ONLY look for lines that contain the word "Quiz" (case insensitive) AND exclude "Hüs"
          if (trimmedLine.toLowerCase().includes('quiz') && !trimmedLine.toLowerCase().includes('hüs')) {
            
            // Extract the category name (remove percentages and extra info)
            const categoryMatch = trimmedLine.match(/^([^(]+)/);
            if (categoryMatch) {
              const category = categoryMatch[1].trim();
              quizCategories.push({
                category,
                schemaName: schema.name,
                schemaId: schema.id
              });
            }
          }
        });
      });
      
      setAvailableGradeCategories(quizCategories);
      
    } catch (error) {
      console.error('Error loading grade schemas:', error);
    }
  };
  const handleCreateQuiz = async () => {
    if (!selectedQuizFile) return;

    try {
      console.log('Starting quiz creation...');
      console.log('Selected file:', selectedQuizFile);
      console.log('Quiz data:', {
        teacherId: userId,
        sourceFile: selectedQuizFile.path,
        title: quizTitle,
        description: quizDescription,
        timeLimit: quizTimeLimit,
        shuffleQuestions,
        shuffleAnswers,
        gradeCategory: gradeCategory || null,
        
      });

      const quizData = {
        teacherId: userId,
        sourceFile: selectedQuizFile.path,
        title: quizTitle,
        description: quizDescription,
        timeLimit: quizTimeLimit,
        shuffleQuestions,
        shuffleAnswers,
        gradeCategory: gradeCategory || null,
        
      };
      
      console.log('Sending quiz creation request to:', '/api/quizzes/create');
      const quizResponse = await fetch('/api/quizzes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      console.log('Quiz response status:', quizResponse.status);
      console.log('Quiz response headers:', quizResponse.headers);

      if (quizResponse.ok) {
        const quizResult = await quizResponse.json();
        console.log('Quiz created successfully:', quizResult);
        alert('Quiz erfolgreich erstellt!');
        
        // Quiz-Status aktualisieren, um das "Quiz starten" Icon anzuzeigen
        await checkQuizStatus(selectedQuizFile.path);
        
        handleQuizDialogClose();
      } else {
        const errorText = await quizResponse.text();
        console.error('Quiz creation error - Status:', quizResponse.status);
        console.error('Quiz creation error - Response:', errorText);
        
        let errorMessage = 'Fehler beim Erstellen des Quiz';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${quizResponse.status}: ${errorText}`;
        }
        
        alert(`Fehler beim Erstellen des Quiz:\n${errorMessage}`);
      }
    } catch (error) {
      console.error('Exception in handleCreateQuiz:', error);
      alert(`Fehler beim Erstellen des Quiz:\n${error instanceof Error ? error.message : String(error)}`);
    }
  };
  // Quiz-Status prüfen
  const checkQuizStatus = async (filePath: string) => {
    try {
      const response = await fetch(`/api/quizzes/check/exists?sourceFile=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.exists && data.quiz?.id) {
          // Prüfe den Freigabe-Status der Ergebnisse
          const activeSessionResponse = await fetch(`/api/quiz-sessions/${data.quiz.id}/active`);
          let session: { id: string; resultsReleased?: boolean } | null = null;
          
          if (activeSessionResponse.ok) {
            session = await activeSessionResponse.json();
          }
          
          // If no active session, check for the most recent session
          if (!session) {
            const sessionsResponse = await fetch(`/api/quiz-sessions/${data.quiz.id}/sessions`);
            if (sessionsResponse.ok) {
              const sessions = await sessionsResponse.json();
              if (sessions && sessions.length > 0) {
                session = sessions[0]; // Most recent session
              }
            }
          }
          
          if (session && session.id) {
            const sessionId = session.id;
            const resultsReleased = session.resultsReleased || false;
            setQuizStatusMap(prev => new Map(prev.set(filePath, {
              exists: data.exists,
              quizId: data.quiz?.id,
              title: data.quiz?.title,
              sessionId: sessionId,
              resultsReleased: resultsReleased
            })));
          } else {
            setQuizStatusMap(prev => new Map(prev.set(filePath, {
              exists: data.exists,
              quizId: data.quiz?.id,
              title: data.quiz?.title
            })));
          }
        } else {
          setQuizStatusMap(prev => new Map(prev.set(filePath, {
            exists: data.exists,
            quizId: data.quiz?.id,
            title: data.quiz?.title
          })));
        }
      }
    } catch (error) {
      console.error('Error checking quiz status:', error);
    }
  };
  // Quiz-Status für alle Quiz-Dateien prüfen
  const checkAllQuizStatuses = async () => {
    // Sammle alle Quiz-Dateien aus allen zugewiesenen Ordnern
    const allQuizFiles: Array<{ path: string; name: string }> = [];
    
    Object.entries(assignedFolderContents).forEach(([key, items]) => {
      const quizFiles = items.filter((item: any) => 
        item.type === 'file' && item.name.startsWith('Quiz')
      );
      allQuizFiles.push(...quizFiles);
    });
    
    for (const file of allQuizFiles) {
      await checkQuizStatus(file.path);
    }
  };
  // Quiz-Status beim Laden der Dateien prüfen
  useEffect(() => {
    if (Object.keys(assignedFolderContents).length > 0) {
      checkAllQuizStatuses();
    }
  }, [assignedFolderContents]);

  // Verarbeitungshistorie beim Laden der Dateien prüfen
  useEffect(() => {
    const loadDocumentHistory = async () => {
      if (Object.keys(assignedFolderContents).length > 0) {
        // Sammle alle Cards-Dateien aus allen Ordnern
        const allCardsFiles: any[] = [];
        Object.entries(assignedFolderContents).forEach(([key, items]) => {
          const cardsFiles = items.filter((item: any) => 
            item.type === 'file' && item.name.startsWith('K_')
          );
          allCardsFiles.push(...cardsFiles);
        });
        
        // Lade Verarbeitungshistorie für alle Cards-Dateien
        for (const cardsFile of allCardsFiles) {
          const history = await fetchDocumentProcessingHistory(cardsFile.path);
          setDocumentHistoryMap(prev => ({
            ...prev,
            [cardsFile.path]: history
          }));
        }
      }
    };
    
    loadDocumentHistory();
  }, [assignedFolderContents]);

  // Zusätzlich: Lade Verarbeitungshistorie für bekannte Cards-Dateien, auch wenn der Ordner noch nicht geladen ist
  useEffect(() => {
    const loadKnownCardsHistory = async () => {
      const knownCardsFiles = [
        '/Users/verachrist/Documents/Z. UNTERRICHT/J-M-Reihen/Mathe/Klasse 7/1. Ganze und rationale Zahlen (Kapitel 5)/1. Unser Grundwissen .../1. Ganz verschiedene Arten von Zahlen/Cards Didaktik_Bruchrechnung_Didaktikfokus.docx'
      ];
      
      for (const filePath of knownCardsFiles) {
        const history = await fetchDocumentProcessingHistory(filePath);
        if (history.length > 0) {
          setDocumentHistoryMap(prev => ({
            ...prev,
            [filePath]: history
          }));
        }
      }
    };
    
    loadKnownCardsHistory();
  }, []); // Nur einmal beim Laden der Komponente

  // Quiz starten
  const handleStartQuiz = async (quizId: string) => {
    try {
      console.log('Starting quiz with ID:', quizId);
      // Navigiere zur bestehenden Quiz-Session-Seite
      window.location.href = `/quiz-session/${quizId}`;
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Fehler beim Starten des Quiz');
    }
  };

  // Quiz-Ergebnisse freigeben
  const handleReleaseResults = async (sessionId: string, filePath: string) => {
    try {
      const response = await fetch(`/api/quiz-sessions/${sessionId}/release-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId: userId })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        await checkQuizStatus(filePath);
      } else {
        const errorText = await response.text();
        alert(`Fehler beim Freigeben/Zurücknehmen der Ergebnisse: ${errorText}`);
      }
    } catch (error) {
      console.error('Error toggling results release:', error);
      alert('Fehler beim Freigeben/Zurücknehmen der Ergebnisse');
    }
  };

  // Flashcard Functions
  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie einen Titel ein',
        severity: 'error'
      });
      return;
    }

    const newDeck: FlashcardDeck = {
      id: Date.now().toString(),
      title: newDeckTitle,
      description: newDeckDescription,

              teacherId: "01ed6e10-397e-446c-9254-2ad7fd4ec777",
      
      imageColor: '#1976D2',
      imageIcon: '📚',
      cards: []
    };

    setFlashcardDecks(prev => [...prev, newDeck]);
    setOpenNewDeckDialog(false);
    
    // Reset form
    setNewDeckTitle('');
    setNewDeckDescription('');


    setSnackbar({
      open: true,
      message: 'Karteideck erfolgreich erstellt',
      severity: 'success'
    });
  };

  const handleEditDeck = (deck: FlashcardDeck) => {
    setEditingDeck(deck);
    setNewDeckTitle(deck.title);
    setNewDeckDescription(deck.description || '');
    
    // Lade bestehende Zuweisungen
    if (deck.assignments && deck.assignments.length > 0) {
      setSelectedGroupIds(deck.assignments.map(a => a.groupId));
    } else {
      setSelectedGroupIds([]);
    }
    
    setOpenNewDeckDialog(true);
  };





  const handleUpdateDeck = async () => {
    if (!editingDeck || !newDeckTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie einen Titel ein',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await fetch(`/api/flashcards/decks/${editingDeck.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      title: newDeckTitle,
      description: newDeckDescription,
          teacherId: userId
        })
      });

      if (response.ok) {
        const updatedDeck = await response.json();
    setFlashcardDecks(prev => prev.map(d => d.id === editingDeck.id ? updatedDeck : d));
        
        // Aktualisiere Zuweisungen für ausgewählte Gruppen
        if (editingDeck.id) {
          await handleAssignGroups(editingDeck.id, selectedGroupIds);
        }
        
    setOpenNewDeckDialog(false);
    setEditingDeck(null);
    
    // Reset form
    setNewDeckTitle('');
    setNewDeckDescription('');
        setSelectedGroupIds([]);


    setSnackbar({
      open: true,
      message: 'Karteideck erfolgreich aktualisiert',
      severity: 'success'
      });
      } else {
        throw new Error('Fehler beim Aktualisieren des Karteidecks');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Karteidecks:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren des Karteidecks',
        severity: 'error'
      });
    }
  };

  const handleViewCards = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    
    // Lade alle Karten für das ausgewählte Deck
    if (deck.id) {
      try {
        const cards = await fetchDeckCards(deck.id);
        console.log(`Geladene Karten für Deck ${deck.title}:`, cards);
        
        // Aktualisiere das lokale Deck mit den geladenen Karten
        setFlashcardDecks(prev => prev.map(d => 
          d.id === deck.id 
            ? { ...d, cards: cards }
            : d
        ));
        
        // Aktualisiere auch das selectedDeck
        setSelectedDeck(prev => prev ? { ...prev, cards: cards } : null);
      } catch (error) {
        console.error('Fehler beim Laden der Karten:', error);
        // Fallback: Verwende vorhandene Karten falls verfügbar
        if (deck.cards && deck.cards.length > 0) {
          console.log('Verwende bereits geladene Karten:', deck.cards);
        }
      }
    }
  };

  // Verbesserte Funktion zum Öffnen des Karteikarten-Modals
  const handleOpenFlashcardModal = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    
    // Lade Karten, falls sie noch nicht geladen sind
    if (deck.id && (!deck.cards || deck.cards.length === 0)) {
      try {
        console.log(`Lade Karten für Deck ${deck.title}...`);
        const cards = await fetchDeckCards(deck.id);
        
        // Aktualisiere das lokale Deck mit den geladenen Karten
        setFlashcardDecks(prev => prev.map(d => 
          d.id === deck.id 
            ? { ...d, cards: cards }
            : d
        ));
        
        // Aktualisiere auch das selectedDeck
        setSelectedDeck(prev => prev ? { ...prev, cards: cards } : null);
        
        console.log(`Karten für Deck ${deck.title} geladen:`, cards);
      } catch (error) {
        console.error(`Fehler beim Laden der Karten für Deck ${deck.title}:`, error);
        // Fallback: Verwende vorhandene Karten falls verfügbar
        if (deck.cards && deck.cards.length > 0) {
          console.log('Verwende bereits geladene Karten:', deck.cards);
        }
      }
    } else if (deck.cards && deck.cards.length > 0) {
      console.log(`Verwende bereits geladene Karten für Deck ${deck.title}:`, deck.cards);
    }
  };

  // Funktion zum Neuladen der Karten für ein spezifisches Deck
  const refreshDeckCards = async (deckId: string) => {
    try {
      console.log(`Lade Karten für Deck ${deckId} neu...`);
      const cards = await fetchDeckCards(deckId);
      
      // Aktualisiere das lokale Deck mit den geladenen Karten
      setFlashcardDecks(prev => prev.map(d => 
        d.id === deckId 
          ? { ...d, cards: cards }
          : d
      ));
      
      // Aktualisiere auch das selectedDeck falls es das gleiche Deck ist
      setSelectedDeck(prev => prev && prev.id === deckId ? { ...prev, cards: cards } : prev);
      
      console.log(`Karten für Deck ${deckId} erfolgreich neu geladen:`, cards);
      return cards;
    } catch (error) {
      console.error(`Fehler beim Neuladen der Karten für Deck ${deckId}:`, error);
      return [];
    }
  };
  const handleDeleteDeck = (deckId: string) => {
    const deck = flashcardDecks.find(d => d.id === deckId);
    if (deck) {
      setDeckToDelete(deck);
      setDeleteModalOpen(true);
    }
  };
  const handleExportDeck = async (deck: FlashcardDeck) => {
    try {
      // Lade die Karten für das Deck, falls noch nicht vorhanden
      let cards = deck.cards || [];
      if (cards.length === 0 && deck.id) {
        cards = await fetchDeckCards(deck.id);
      }
      
      if (!cards || cards.length === 0) {
        setSnackbar({
          open: true,
          message: 'Keine Karten zum Exportieren gefunden.',
          severity: 'error'
        });
        return;
      }

      // Direkt Word-Export starten (ohne Popup)
      await exportFlashcardDeckToWord(deck, cards);

    } catch (error) {
      console.error('Fehler beim Exportieren des Decks:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Exportieren des Decks. Bitte versuchen Sie es erneut.',
        severity: 'error'
      });
    }
  };
  const exportFlashcardDeckToWord = async (deck: FlashcardDeck, cards: Flashcard[]) => {
    try {
      // Importiere die benötigten docx-Module dynamisch
      const { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, BorderStyle, WidthType, Table, TableRow, TableCell } = await import('docx');
      
      // Erstelle Word-Dokument mit verbessertem Styling
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Deck-Titel als Hauptüberschrift mit Styling
            new Paragraph({
              children: [
                new TextRun({
                  text: deck.title,
                  bold: true,
                  size: 32,
                  color: "2E7D32" // Dunkelgrün wie in der App
                })
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 600 },
              border: {
                bottom: {
                  color: "4CAF50", // Akzentfarbe
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6
                }
              }
            }),
            
            // Beschreibung falls vorhanden
            ...(deck.description ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: deck.description,
                    size: 20,
                    color: "666666" // Grau für Beschreibung
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 }
              })
            ] : []),
            
            // Karten-Counter
            new Paragraph({
              children: [
                new TextRun({
                  text: `${cards.length} Karteikarten`,
                  bold: true,
                  size: 18,
                  color: "4CAF50"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Alle Karteikarten mit verbessertem Styling
            ...cards.map((card, index) => [
              // Karten-Header mit Nummer
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Karte ${index + 1}`,
                    bold: true,
                    size: 24,
                    color: "1976D2" // Blau für Karten-Header
                  })
                ],
                spacing: { before: 400, after: 200 }
              }),
              
              // Frage in einem schönen Box-Design
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Frage:",
                    bold: true,
                    size: 18,
                    color: "D32F2F" // Rot für Fragen
                  })
                ],
                spacing: { before: 200, after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: card.front.replace(/<[^>]*>/g, ''), // HTML-Tags entfernen
                    size: 20,
                    color: "333333"
                  })
                ],
                spacing: { after: 300 },
                border: {
                  left: {
                    color: "D32F2F",
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 4
                  }
                },
                indent: { left: 200 }
              }),
              
              // Antwort in einem schönen Box-Design
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Antwort:",
                    bold: true,
                    size: 18,
                    color: "388E3C" // Grün für Antworten
                  })
                ],
                spacing: { before: 200, after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: card.back.replace(/<[^>]*>/g, ''), // HTML-Tags entfernen
                    size: 20,
                    color: "333333"
                  })
                ],
                spacing: { after: 300 },
                border: {
                  left: {
                    color: "388E3C",
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 4
                  }
                },
                indent: { left: 200 }
              }),
              
              // Hinweis falls vorhanden
              ...(card.hint ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Hinweis:",
                      bold: true,
                      size: 16,
                      color: "FF9800" // Orange für Hinweise
                    })
                  ],
                  spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: card.hint.replace(/<[^>]*>/g, ''), // HTML-Tags entfernen
                      size: 18,
                      color: "666666",
                      italics: true
                    })
                  ],
                  spacing: { after: 300 },
                  border: {
                    left: {
                      color: "FF9800",
                      space: 1,
                      style: BorderStyle.SINGLE,
                      size: 3
                    }
                  },
                  indent: { left: 200 }
                })
              ] : []),
              
              // Trennlinie zwischen Karten
              new Paragraph({
                children: [
                  new TextRun({
                    text: "─".repeat(50),
                    size: 16,
                    color: "CCCCCC"
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 }
              })
            ]).flat()
          ]
        }]
      });

      // Generiere und lade das Dokument herunter
      const blob = await Packer.toBlob(doc);
      const fileName = `${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_karteideck.docx`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: `Deck "${deck.title}" erfolgreich als Word-Datei exportiert!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Word-Export:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Word-Export. Bitte versuchen Sie es erneut.',
        severity: 'error'
      });
    }
  };
  const confirmDeleteDeck = async () => {
    if (!deckToDelete || deleteConfirmWord !== 'LÖSCHEN') {
      setSnackbar({
        open: true,
        message: 'Löschvorgang abgebrochen - falsches Bestätigungswort',
        severity: 'error'
      });
      return;
    }

    try {
      const deckId = deckToDelete!.id;
      if (!deckId) {
        throw new Error('Deck-ID ist nicht definiert');
      }
      let deckToDeleteWithData = deckToDelete!;

      // Stelle sicher, dass alle verknüpften Daten geladen sind
      console.log('Lade verknüpfte Daten vor dem Löschen...');
      
      // Lade Karten, falls noch nicht vorhanden
      if (!deckToDeleteWithData.cards || deckToDeleteWithData.cards.length === 0) {
        console.log('Lade Deck-Karten...');
        const cards = await fetchDeckCards(deckId!);
        deckToDeleteWithData = { ...deckToDeleteWithData, cards: cards };
      }

      // Lade Assignments neu, falls noch nicht vorhanden
      if (!deckToDeleteWithData.assignments || deckToDeleteWithData.assignments.length === 0) {
        console.log('Lade Deck-Assignments...');
        await fetchFlashcardAssignments();
        deckToDeleteWithData = flashcardDecks.find(d => d.id === deckId) || deckToDeleteWithData;
      }

      // Jetzt das Deck selbst löschen
      if (!userId) {
        throw new Error('Benutzer-ID ist nicht definiert');
      }
      
      const requestBody = { teacherId: userId };
      console.log('Lösche Karteideck...', { deckId, userId, deckToDelete: deckToDelete?.title, requestBody });
      const response = await fetch(`/api/flashcards/${deckId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Server-Response:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        // Aus dem lokalen State entfernen
        setFlashcardDecks(prev => prev.filter(d => d.id !== deckId));
        
        // Falls das gelöschte Deck gerade angezeigt wird, zurücksetzen
        if (selectedDeck?.id === deckId) {
          setSelectedDeck(null);
        }
        if (editingDeck?.id === deckId) {
          setEditingDeck(null);
        }
        
              setSnackbar({
          open: true,
          message: `Karteideck erfolgreich gelöscht`,
          severity: 'success'
        });
        
        // Modal schließen und States zurücksetzen
        setDeleteModalOpen(false);
        setDeckToDelete(null);
        setDeleteConfirmWord('');
      } else {
        const errorData = await response.text();
        console.error('Server-Fehler beim Löschen:', response.status, errorData);
        console.log('Error Response Body:', errorData);
        
        let errorMessage = 'Fehler beim Löschen des Karteidecks';
        switch (response.status) {
          case 403:
            errorMessage = 'Zugriff verweigert - Sie haben keine Berechtigung, dieses Karteideck zu löschen';
            break;
          case 404:
            errorMessage = 'Karteideck nicht gefunden';
            break;
          case 401:
            errorMessage = 'Nicht authentifiziert - Bitte melden Sie sich erneut an';
            break;
          case 500:
            errorMessage = 'Server-Fehler - Bitte versuchen Sie es später erneut';
            break;
          default:
            errorMessage = `Fehler beim Löschen des Karteidecks: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Karteidecks:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Karteidecks: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        severity: 'error'
      });
      
      // Modal schließen und States zurücksetzen
      setDeleteModalOpen(false);
      setDeckToDelete(null);
      setDeleteConfirmWord('');
    }
  };

  // Flashcard Management Functions
  const handleAddCard = () => {
    setIsAddingCard(true);
    setNewCardFront('');
    setNewCardBack('');
  };
  const handleSaveCard = async () => {
    if (!selectedDeck || !newCardFront.trim() || !newCardBack.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte füllen Sie beide Felder aus',
        severity: 'error'
      });
      return;
    }

    try {
      console.log('Erstelle neue Karteikarte...', {
        front: newCardFront,
        back: newCardBack,
        deckId: selectedDeck.id,
        teacherId: userId
      });

      const response = await fetch('/api/flashcards/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          front: newCardFront,
          back: newCardBack,
          deckId: selectedDeck.id,
          teacherId: userId,
          difficulty: 1, // Standard-Schwierigkeit
          order: (selectedDeck.cards?.length || 0) + 1 // Nächste Reihenfolge
        })
      });

      if (response.ok) {
        const newCard = await response.json();
        console.log('Neue Karte erfolgreich erstellt:', newCard);
        
        // Aktualisiere das lokale Deck
        setSelectedDeck(prev => prev ? {
          ...prev,
          cards: [...(prev.cards || []), newCard]
        } : null);
        
        // Aktualisiere auch den globalen State
        setFlashcardDecks(prev => prev.map(deck => 
          deck.id === selectedDeck.id 
            ? { ...deck, cards: [...(deck.cards || []), newCard] }
            : deck
        ));

        setIsAddingCard(false);
        setNewCardFront('');
        setNewCardBack('');
        
        setSnackbar({
          open: true,
          message: 'Karteikarte erfolgreich hinzugefügt',
          severity: 'success'
        });
      } else {
        const errorText = await response.text();
        console.error(`HTTP-Fehler: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Fehler beim Hinzufügen der Karteikarte: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Karteikarte:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Hinzufügen der Karteikarte: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleEditCard = (card: Flashcard) => {
    if (editingCard?.id === card.id) {
      // Wenn die gleiche Karte bereits bearbeitet wird, beende den Bearbeitungsmodus
      setEditingCard(null);
      setNewCardFront('');
      setNewCardBack('');
    } else {
      // Bearbeitungsmodus sofort aktivieren - der useEffect kümmert sich um die Werte
      setEditingCard(card);
      
      console.log('Bearbeite Karte:', {
        id: card.id,
        front: card.front,
        back: card.back,
        hasFront: !!card.front,
        hasBack: !!card.back,
        frontLength: (card.front || '').length,
        backLength: (card.back || '').length
      });
    }
  };

  // Hilfsfunktion um HTML-Content korrekt zu verarbeiten
  const processHtmlContent = (htmlContent: string): string => {
    if (!htmlContent) return '';
    
    // Falls es bereits HTML ist, direkt zurückgeben
    if (htmlContent.includes('<p>') || htmlContent.includes('<br>') || htmlContent.includes('<div>')) {
      return htmlContent;
    }
    
    // Falls es Plain Text mit \n ist, in HTML umwandeln
    if (htmlContent.includes('\n')) {
      return htmlContent.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
    }
    
    // Falls es nur Text ist, in Paragraph wrappen
    return `<p>${htmlContent}</p>`;
  };
  // useEffect um sicherzustellen, dass die RichTextEditor-Werte korrekt gesetzt werden
  useEffect(() => {
    if (editingCard) {
      const frontContent = processHtmlContent(editingCard.front || '');
      const backContent = processHtmlContent(editingCard.back || '');
      
      console.log('useEffect - Setting editor values:', {
        cardId: editingCard.id,
        originalFront: editingCard.front,
        originalBack: editingCard.back,
        processedFront: frontContent,
        processedBack: backContent,
        frontLength: frontContent.length,
        backLength: backContent.length
      });
      
      // Sofort setzen, ohne Verzögerung
      setNewCardFront(frontContent);
      setNewCardBack(backContent);
    } else {
      // Wenn kein editingCard mehr vorhanden ist, leere die Felder
      setNewCardFront('');
      setNewCardBack('');
    }
  }, [editingCard]);

  const handleUpdateCard = async () => {
    if (!editingCard || !newCardFront.trim() || !newCardBack.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte füllen Sie beide Felder aus',
        severity: 'error'
      });
      return;
    }

    try {
      console.log('Aktualisiere Karteikarte...', {
        cardId: editingCard.id,
        front: newCardFront,
        back: newCardBack,
        teacherId: userId
      });

      const response = await fetch(`/api/flashcards/cards/${editingCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          front: newCardFront,
          back: newCardBack,
          teacherId: userId
        })
      });

      if (response.ok) {
        const updatedCard = await response.json();
        console.log('Karte erfolgreich aktualisiert:', updatedCard);
        
        // Aktualisiere das lokale Deck
        setSelectedDeck(prev => prev ? {
          ...prev,
          cards: prev.cards?.map(c => c.id === editingCard.id ? updatedCard : c) || []
        } : null);
        
        // Aktualisiere auch den globalen State
        setFlashcardDecks(prev => prev.map(deck => 
          deck.id === selectedDeck?.id 
            ? { ...deck, cards: deck.cards?.map(c => c.id === editingCard.id ? updatedCard : c) || [] }
            : deck
        ));

        setEditingCard(null);
        setNewCardFront('');
        setNewCardBack('');
        
        setSnackbar({
          open: true,
          message: 'Karteikarte erfolgreich aktualisiert',
          severity: 'success'
        });
      } else {
        const errorText = await response.text();
        console.error(`HTTP-Fehler: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Fehler beim Aktualisieren der Karteikarte: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Karteikarte:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Aktualisieren der Karteikarte: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!selectedDeck) return;

    try {
      console.log(`Lösche Karteikarte ${cardId}...`);

      const response = await fetch(`/api/flashcards/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: userId
        })
      });

      if (response.ok) {
        console.log('Karte erfolgreich gelöscht');
        
        // Entferne die Karte aus dem lokalen State
        setSelectedDeck(prev => prev ? {
          ...prev,
          cards: prev.cards?.filter(c => c.id !== cardId) || []
        } : null);
        
        // Aktualisiere auch den globalen State
        setFlashcardDecks(prev => prev.map(deck => 
          deck.id === selectedDeck.id 
            ? { ...deck, cards: deck.cards?.filter(c => c.id !== cardId) || [] }
            : deck
        ));

        setSnackbar({
          open: true,
          message: 'Karteikarte erfolgreich gelöscht',
          severity: 'success'
        });
      } else {
        const errorText = await response.text();
        console.error(`HTTP-Fehler: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Fehler beim Löschen der Karteikarte: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Karteikarte:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen der Karteikarte: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, card: Flashcard) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', card.id || '');
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedCard || !selectedDeck || !selectedDeck.cards) return;

    try {
      const draggedIndex = selectedDeck.cards.findIndex(card => card.id === draggedCard.id);
      if (draggedIndex === -1 || draggedIndex === dropIndex) return;

      // Karten neu ordnen
      const updatedCards = [...selectedDeck.cards];
      const cardToMove = updatedCards[draggedIndex];
      
      // Karte aus der ursprünglichen Position entfernen
      updatedCards.splice(draggedIndex, 1);
      
      // Karte an der neuen Position einfügen
      updatedCards.splice(dropIndex, 0, cardToMove);
      
      // Reihenfolge aktualisieren
      updatedCards.forEach((card, i) => {
        card.order = i;
      });

      // Deck aktualisieren
      const updatedDeck = { ...selectedDeck, cards: updatedCards };
      setSelectedDeck(updatedDeck);

      // Hier würde die API-Aktualisierung erfolgen
      setSnackbar({
        open: true,
        message: 'Kartenreihenfolge aktualisiert',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Verschieben der Karte:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Verschieben der Karte',
        severity: 'error'
      });
    } finally {
      setDraggedCard(null);
    }
  };

  const handleNewDeckSubmit = async () => {
    if (!newDeckTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie einen Titel ein',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await fetch('/api/flashcards/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newDeckTitle,
          description: newDeckDescription,
          teacherId: userId
        })
      });

      if (response.ok) {
        const newDeck = await response.json();
        setFlashcardDecks(prev => [...prev, newDeck]);
        
        // Erstelle Zuweisungen für ausgewählte Gruppen
        if (selectedGroupIds.length > 0) {
          await handleAssignGroups(newDeck.id, selectedGroupIds);
        }
        
        setOpenNewDeckDialog(false);
        
        // Reset form
        setNewDeckTitle('');
        setNewDeckDescription('');
        setSelectedGroupIds([]);


    setSnackbar({
      open: true,
          message: 'Karteideck erfolgreich erstellt',
      severity: 'success'
    });
      } else {
        throw new Error('Fehler beim Erstellen des Karteidecks');
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Karteidecks:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen des Karteidecks',
        severity: 'error'
      });
    }
  };
  return (
    <Box 
      sx={{ width: '100%', bgcolor: colors.background, p: 0, outline: 'none', '&:focus': { outline: 'none' } }}
      ref={dashboardRef}
      tabIndex={-1}
      onKeyDown={async (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { 
          e.preventDefault(); 
          if (!participationGroupId) return; 
          const group = groups.find(g => g.id === participationGroupId); 
          if (!group) return; 
          setApplyingLessonKeyword(true);
          try {
            for (const student of group.students) {
              const groupData = participations[participationGroupId] || {};
              const lessonData = groupData[currentLessonIndex] || {};
              const studentData = lessonData[student.id];
              const existingComment = studentData && typeof studentData === 'object' ? (studentData.comment as string | undefined) : undefined;
              // Nur Kommentar aktualisieren, wenn bereits einer existiert
              if (existingComment) {
              const updatedComment = injectLessonKeywordIntoComment(existingComment, lessonKeyword);
                if (existingComment !== updatedComment) {
                await fetch(`/api/participation/${participationGroupId}/${currentLessonIndex}/${student.id}/comment`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ comment: updatedComment })
                });
                }
              }
            }
            setParticipations(prev => {
              const copy = { ...prev } as any;
              const groupData2 = copy[participationGroupId] || {};
              const lessonData2 = { ...(groupData2[currentLessonIndex] || {}) };
              for (const student of (groups.find(g => g.id === participationGroupId)?.students || [])) {
                const sd = lessonData2[student.id] || { value: 0 };
                const existingComment = sd.comment as (string | undefined);
                // Nur Kommentar aktualisieren, wenn bereits einer existiert
                const updatedComment = existingComment ? injectLessonKeywordIntoComment(existingComment, lessonKeyword) : undefined;
                lessonData2[student.id] = { 
                  value: (sd as any).value ?? 0, 
                  ...(updatedComment ? { comment: updatedComment } : {})
                };
              }
              copy[participationGroupId] = { ...groupData2, [currentLessonIndex]: lessonData2 };
              return copy;
            });
            // persist per-lesson keyword in map und Datenbank
            setLessonKeywordsMap(prev => ({
              ...prev,
              [participationGroupId]: {
                ...(prev[participationGroupId] || {}),
                [currentLessonIndex]: lessonKeyword
              }
            }));
            // Speichere in Datenbank
            if (participationGroupId) {
              await saveLessonKeyword(participationGroupId, currentLessonIndex, lessonKeyword);
            }
            // Fokus verlassen, aber Stichwort nicht löschen - es bleibt in der Map gespeichert
            lessonKeywordInputRef.current?.blur();
          } catch (err) {
            console.error('Fehler beim Anwenden des Stunden-Schlagworts:', err);
          } finally {
            setApplyingLessonKeyword(false);
          }
        } 
      }}
    >
      <Grid container spacing={0}>
        {/* Header Section */}
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
                    bgcolor: colors.accent1,
                    boxShadow: '0 1.4px 2.8px rgba(0,0,0,0.12)',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: 'white'
                  }}
                >
                  {getInitials(teacherName) || userId.substring(0, 2).toUpperCase()}
                </Avatar>
              </Box>
              <Box display="flex" gap={0.5} alignItems="center">
                <IconButton
                  onClick={() => setShowTeacherMessageBox(true)}
                  sx={{
                    p: 0.5,
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    color: '#1976d2',
                    bgcolor: '#9e9e9e',
                    borderRadius: 1.4,
                    '&:hover': { bgcolor: '#757575' }
                  }}
                  title="Nachrichten"
                >
                  <Mail sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton
                  onClick={() => {
                    setCreateExaminationModalOpen(true);
                    fetchAvailableFolders();
                  }}
                  sx={{
                    p: 0.5,
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    color: '#d32f2f',
                    bgcolor: '#9e9e9e',
                    borderRadius: 1.4,
                    '&:hover': { bgcolor: '#757575' }
                  }}
                  title="Prüfung erstellen"
                >
                  <AssignmentIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <Button 
                  variant="contained"
                  color="primary"
                  size="small"
                  sx={{
                    width: '5%',
                    minWidth: 70,
                    height: 32,
                    bgcolor: '#333',
                    color: 'white',
                    fontWeight: 500,
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#222' },
                    borderRadius: 1.4,
                    fontSize: '0.7rem',
                    py: 0.35,
                    px: 2.0
                  }}
                  onClick={onLogout}
                >
                  Logout
                </Button>
                {/* Adventskalender Button */}
                <IconButton
                  onClick={() => navigate('/advent-calendar')}
                  sx={{
                    p: 0.5,
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    color: 'white',
                    bgcolor: '#c62828',
                    borderRadius: 1.4,
                    '&:hover': { bgcolor: '#b71c1c' }
                  }}
                  title="Adventskalender"
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '1.2rem',
                      lineHeight: 1,
                      display: 'inline-block'
                    }}
                  >
                    🎄
                  </Typography>
                </IconButton>
                {/* Rätseljahr 2026 Button */}
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => setShowRiddleOverview(true)}
                    sx={{
                      p: 0.5,
                      minWidth: 32,
                      width: 32,
                      height: 32,
                      borderRadius: 1.4,
                      position: 'relative',
                      overflow: 'visible',
                      border: '2px solid rgba(102, 126, 234, 0.3)',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        borderColor: 'rgba(102, 126, 234, 0.6)',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                    title="Rätseljahr 2026 - Übersicht"
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
                        width="20"
                        height="20"
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
                  </IconButton>
                </Box>
                {/* Karnevals-Minigame Button */}
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => setShowCarnivalGames(true)}
                    sx={{
                      p: 0.5,
                      minWidth: 32,
                      width: 32,
                      height: 32,
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
                        fontSize: '1.2rem',
                        lineHeight: 1,
                        display: 'inline-block'
                      }}
                    >
                      🎭
                    </Typography>
                  </IconButton>
                </Box>
                {/* Minigame Test Button */}
                <IconButton
                  onClick={() => setShowMinigame(true)}
                  sx={{
                    p: 0.5,
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    borderRadius: 1.4,
                    position: 'relative',
                    overflow: 'visible',
                    border: '2px solid rgba(255, 152, 0, 0.3)',
                    background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      borderColor: 'rgba(255, 152, 0, 0.6)',
                      boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                  title="Minigame Test"
                >
                  <GamesIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1.4 }}>
            <Tabs value={mainTabValue} onChange={handleMainTabChange} aria-label="dashboard tabs" sx={{ minHeight: 28 }}>
              <Tab icon={<GroupIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Lerngruppen</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<BuildIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Verwalten</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<StyleIcon sx={{ fontSize: 18 }} />} label={<span style={{ fontSize: '0.65rem' }}>Karteikarten</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<StorageIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem', color: '#9E9E9E' }}>Datenbank</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<StyleIcon sx={{ fontSize: 18 }} />} label={<span style={{ fontSize: '0.65rem', color: '#9E9E9E' }}>Meine Fächer</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
            </Tabs>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TabPanel value={mainTabValue} index={0}>
            {/* Learning Groups Section */}
            <Box sx={{ p: 1.4 }}>
              <Card sx={{ 
                borderRadius: 2.8,
                boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
                bgcolor: colors.cardBg
              }}>
                <CardContent>
                  {groups.map((group) => {
                    const isInformatik = /informatik|gk\s*11|gk\s*12/i.test(group.name);
                    const isInformatikGK12 = /gk\s*12|informatik\s*gk\s*12/i.test(group.name);
                    const isMatheLK = /mathe\s*lk\s*11/i.test(group.name);
                    const is7a = /7a|klasse\s*7a/i.test(group.name);
                    const is10c = /10c|klasse\s*10c/i.test(group.name);
                    const groupColor = isInformatik ? (isInformatikGK12 ? '#0097A7' : '#006064')  // GK 12 mehr Cyan
                      : isMatheLK ? '#2E7D32'   // grünlich
                      : is7a ? '#F9A825'        // gelblich
                      : is10c ? '#E65100'       // orange
                      : colors.primary;
                    const rowIconColor = isInformatik ? (isInformatikGK12 ? '#1976D2' : '#9C27B0')  // GK 12 Icons blau
                      : isMatheLK ? '#2E7D32'   // Mathe-Icons in Grün
                      : is7a ? '#F9A825'        // 7a Zeilen-Icons gelblich
                      : is10c ? '#E65100'
                      : colors.primary;
                    const boxBg = isInformatik ? (isInformatikGK12 ? 'rgba(0, 151, 167, 0.16)' : 'rgba(0, 96, 100, 0.14)')
                      : isMatheLK ? 'rgba(46, 125, 50, 0.14)'
                      : is7a ? 'rgba(249, 168, 37, 0.16)'
                      : is10c ? 'rgba(230, 81, 0, 0.12)'
                      : `${groupColor}10`;
                    const boxHover = isInformatik ? (isInformatikGK12 ? 'rgba(0, 151, 167, 0.28)' : 'rgba(0, 96, 100, 0.25)')
                      : isMatheLK ? 'rgba(46, 125, 50, 0.25)'
                      : is7a ? 'rgba(249, 168, 37, 0.28)'
                      : is10c ? 'rgba(230, 81, 0, 0.22)'
                      : `${groupColor}20`;
                    const boxBorder = (isInformatik || isMatheLK || is7a || is10c)
                      ? `1px solid ${groupColor}50`
                      : 'none';
                    const hasCustomStyle = isInformatik || isMatheLK || is7a || is10c;
                    const prefixIcon = isInformatik ? (isInformatikGK12 ? <CodeIcon sx={{ fontSize: '1.35rem', color: rowIconColor }} /> : <ComputerIcon sx={{ fontSize: '1.35rem', color: rowIconColor }} />)
                      : isMatheLK ? <FunctionsIcon sx={{ fontSize: '1.35rem', color: rowIconColor }} />
                      : is7a ? <EmojiEmotionsIcon sx={{ fontSize: '1.35rem', color: '#FF9800' }} />
                      : is10c ? <LessonIcon sx={{ fontSize: '1.35rem', color: rowIconColor }} />
                      : null;
                    return (
                    <Box key={group.id} sx={{ mb: 1.4 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 0.8,
                        p: 1.0,
                        bgcolor: boxBg,
                        borderRadius: 1.4,
                        cursor: 'pointer',
                        border: boxBorder,
                        '&:hover': {
                          bgcolor: boxHover,
                        }
                      }} onClick={() => toggleGroupExpanded(group.id)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          {prefixIcon}
                          <Typography variant="h6" sx={{ 
                            color: groupColor, 
                            fontWeight: isMatheLK ? 800 : 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: isMatheLK ? '0.9rem' : '0.72rem'
                          }}>
                            {group.name}
                          </Typography>
                          <Chip 
                            label={`${group.students.length} Schüler`}
                            size="small" 
                            sx={{ 
                              ml: 1.0, 
                              bgcolor: groupColor,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.6rem',
                              height: 16
                            }} 
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, transform: 'translateX(-10%)' }}>
                          <IconButton
                            aria-label={expandedGroups[group.id] === false ? 'Aufklappen' : 'Zuklappen'}
                            onClick={e => { e.stopPropagation(); toggleGroupExpanded(group.id); }}
                            size="small"
                            sx={{ width: 28, height: 28, p: 0.25, color: hasCustomStyle ? rowIconColor : 'inherit' }}
                          >
                            {expandedGroups[group.id] === false ? (
                              <ExpandMoreIcon sx={{ fontSize: 28 }} />
                            ) : (
                              <ExpandLessIcon sx={{ fontSize: 28 }} />
                            )}
                          </IconButton>
                          <IconButton
                            aria-label="Whiteboard erstellen"
                            onClick={e => { e.stopPropagation(); handleOpenWhiteboard(group.id); }}
                            size="small"
                            sx={{ 
                              width: 28, 
                              height: 28, 
                              p: 0, 
                              mr: 0.5, 
                              color: hasCustomStyle ? rowIconColor : groupColor,
                              '& svg': {
                                width: '100%',
                                height: '100%'
                              }
                            }}
                            title="Whiteboard erstellen"
                          >
                            <BrushIcon sx={{ fontSize: 28 }} />
                          </IconButton>
                          <IconButton
                            aria-label="Epochal eintragen"
                            onClick={e => { e.stopPropagation(); handleParticipationOpen(group.id, group.name); }}
                            size="small"
                            sx={{ 
                              width: 28, 
                              height: 28, 
                              p: 0, 
                              mr: 0.5, 
                              color: '#FF6B35',
                              '& svg': {
                                width: '100%',
                                height: '100%'
                              }
                            }}
                            title="Epochal eintragen"
                          >
                            <HandRaiseIcon sx={{ fontSize: 28 }} />
                          </IconButton>
                          <IconButton
                            aria-label={expandedStudents[group.id] ? 'Schülerliste einklappen' : 'Schülerliste aufklappen'}
                            onClick={e => { e.stopPropagation(); toggleStudentsExpanded(group.id); }}
                            size="small"
                            sx={{ 
                              width: 28, 
                              height: 28, 
                              p: 0, 
                              mr: 0.5, 
                              color: hasCustomStyle ? rowIconColor : colors.accent1,
                              '& svg': {
                                width: '100%',
                                height: '100%'
                              }
                            }}
                            title="Schülerliste"
                          >
                            <GroupIcon sx={{ fontSize: 28 }} />
                          </IconButton>
                          <IconButton
                            aria-label="Mehr"
                            onClick={e => { e.stopPropagation(); handleMenuOpen(e, group.id); }}
                            size="small"
                            sx={{ 
                              width: 28, 
                              height: 28, 
                              p: 0,
                              color: hasCustomStyle ? rowIconColor : undefined,
                              '& svg': {
                                width: '100%',
                                height: '100%'
                              }
                            }}
                          >
                            <MoreVertIcon sx={{ fontSize: 28 }} />
                          </IconButton>
                        </Box>
                      </Box>
                      <Grid container spacing={0.8} sx={{ display: expandedGroups[group.id] === false ? 'none' : 'flex' }}>
                        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Grid container spacing={0.8} sx={{ display: expandedStudents[group.id] ? 'flex' : 'none' }}>
                            {group.students.map((student) => (
                              <Grid item xs={12} sm={6} md={6} lg={3} key={student.id}>
                                <Card 
                                  variant="outlined" 
                                  sx={{ 
                                    borderRadius: 2.8,
                                    border: '1px solid #e0e0e0',
                                    bgcolor: '#ffffff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                    transition: 'all 0.2s ease-in-out',
                                    cursor: 'pointer',
                                    p: 0,
                                    '& .MuiCardContent-root': {
                                      padding: '8px',
                                      '&:last-child': {
                                        paddingBottom: '8px'
                                      }
                                    },
                                    '&:hover': {
                                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                      transform: 'translateY(-1px)'
                                    },
                                    '@keyframes cardBlink': {
                                      '0%': { 
                                        opacity: 1,
                                        borderColor: '#dc3545',
                                        boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
                                      },
                                      '50%': { 
                                        opacity: 0.7,
                                        borderColor: '#dc3545',
                                        boxShadow: '0 2px 8px rgba(220, 53, 69, 0.6)'
                                      },
                                      '100%': { 
                                        opacity: 1,
                                        borderColor: '#dc3545',
                                        boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
                                      }
                                    }
                                  }}
                                  onMouseEnter={() => ensureMiniGrades(group.id, student.id)}
                                  onClick={() => handleStudentCardClick(group.id, student)}
                                  data-student-id={student.id}
                                  id={`student-card-${student.id}`}
                                >
                                  <CardContent sx={{ p: 0, pb: 0, pt: 0, pl: 0, pr: 0, overflow: 'hidden' }}>
                                    {/* Top Section - Avatar, Name and Overall Grade */}
                                    <Box sx={{ 
                                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                      p: 0.5,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      position: 'relative'
                                    }}>
                                      {/* Avatar - Left */}
                                      <Avatar sx={{ 
                                        bgcolor: student.avatarEmoji ? 'transparent' : colors.accent1, 
                                        width: 32, 
                                        height: 32,
                                        fontSize: student.avatarEmoji ? '1.1rem' : '0.9rem',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                      }}>
                                        {student.avatarEmoji || student.name.charAt(0)}
                                      </Avatar>
                                      
                                      {/* Name - Center */}
                                      <Typography variant="h6" sx={{ 
                                        fontWeight: 'bold', 
                                        fontSize: '0.7rem',
                                        color: colors.textPrimary,
                                        cursor: 'help',
                                        textAlign: 'center',
                                        flex: 1,
                                        mx: 0.5
                                      }}
                                      title={`Code: ${student.loginCode}`}
                                      >
                                        {formatStudentName(student.name)}
                                      </Typography>
                                      
                                      {/* Overall Grade - Right */}
                                      {(() => {
                                        const key = `${group.id}:${student.id}`;
                                        const mini = miniGradesMap[key];
                                        if (mini && mini.overall !== null && mini.overall !== undefined) {
                                          return (
                                            <Box sx={{ 
                                              textAlign: 'center',
                                              p: 0.2,
                                              minWidth: 24,
                                              bgcolor: `${getGradeColorMini(mini.overall, mini.gradingSystem)}15`,
                                              borderRadius: 0.5,
                                              border: `1px solid ${getGradeColorMini(mini.overall, mini.gradingSystem)}30`
                                            }}>
                                              <Typography sx={{ 
                                                fontSize: '0.6rem', 
                                                fontWeight: 'bold', 
                                                color: getGradeColorMini(mini.overall, mini.gradingSystem)
                                              }}>
                                                {mini.gradingSystem === 'MSS' ? mini.overall.toFixed(0) : formatGermanMini(mini.overall)}
                                              </Typography>
                                            </Box>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </Box>

                                    {/* Bottom Section - Grade Stats */}
                                    <Box sx={{ p: 0.5, pb: 0, mb: 0 }}>
                                      {(() => {
                                        const key = `${group.id}:${student.id}`;
                                        const mini = miniGradesMap[key];
                                        if (!mini || mini.loading) {
                                          return (
                                            <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '0.6rem' }}>
                                                Lade Noten...
                                              </Typography>
                                            </Box>
                                          );
                                        }

                                        const stats = getGradeStats(mini.nodes, mini.gradingSystem);
                                        
                                        return (
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                            {/* Grade Stat Boxes */}
                                            <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'nowrap' }}>
                                              {/* Klassenarbeiten */}
                                              <Box sx={{ 
                                                bgcolor: '#f5f5f5', 
                                                p: 0.4, 
                                                borderRadius: 1,
                                                textAlign: 'center',
                                                border: '1px solid #e0e0e0',
                                                flex: 1
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '0.7rem', 
                                                  fontWeight: 'bold', 
                                                  color: colors.primary,
                                                  mb: 0.1
                                                }}>
                                                  {formatGradeValue(stats.klassenarbeiten.values, mini.gradingSystem)}
                                                </Typography>
                                                <Typography sx={{ 
                                                  fontSize: '0.5rem', 
                                                  color: '#000000',
                                                  fontWeight: 'normal'
                                                }}>
                                                  {stats.klassenarbeiten.label}
                                                </Typography>
                                                {stats.klassenarbeiten.individualGrades.map((item, index) => (
                                                  <Typography key={index} variant="body2" sx={{ 
                                                    fontSize: '0.4rem', 
                                                    color: index % 2 === 0 ? '#666666' : '#999999', 
                                                    display: 'inline', 
                                                    mr: 0.3 
                                                  }}>
                                                    {formatGermanMini(item.grade)}
                                                  </Typography>
                                                ))}
                                              </Box>

                                              {/* EPO Noten */}
                                              <Box sx={{ 
                                                bgcolor: '#f5f5f5', 
                                                p: 0.4, 
                                                borderRadius: 1,
                                                textAlign: 'center',
                                                border: '1px solid #e0e0e0',
                                                flex: 1
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '0.7rem', 
                                                  fontWeight: 'bold', 
                                                  color: colors.primary,
                                                  mb: 0.1
                                                }}>
                                                  {formatGradeValue(stats.epo.values, mini.gradingSystem)}
                                                </Typography>
                                                <Typography sx={{ 
                                                  fontSize: '0.5rem', 
                                                  color: '#000000',
                                                  fontWeight: 'normal'
                                                }}>
                                                  {stats.epo.label}
                                                </Typography>
                                                {stats.epo.individualGrades.map((item, index) => (
                                                  <Typography key={index} variant="body2" sx={{ 
                                                    fontSize: '0.4rem', 
                                                    color: index % 2 === 0 ? '#666666' : '#999999', 
                                                    display: 'inline', 
                                                    mr: 0.3 
                                                  }}>
                                                    {formatGermanMini(item.grade)}
                                                  </Typography>
                                                ))}
                                              </Box>

                                              {/* Quizze */}
                                              <Box sx={{ 
                                                bgcolor: '#f5f5f5', 
                                                p: 0.4, 
                                                borderRadius: 1,
                                                textAlign: 'center',
                                                border: '1px solid #e0e0e0',
                                                flex: 1
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '0.7rem', 
                                                  fontWeight: 'bold', 
                                                  color: colors.primary,
                                                  mb: 0.1
                                                }}>
                                                  {formatGradeValue(stats.quizze.values, mini.gradingSystem)}
                                                </Typography>
                                                <Typography sx={{ 
                                                  fontSize: '0.5rem', 
                                                  color: '#000000',
                                                  fontWeight: 'normal'
                                                }}>
                                                  {stats.quizze.label}
                                                </Typography>
                                                {stats.quizze.individualGrades.map((item, index) => (
                                                  <Typography key={index} variant="body2" sx={{ 
                                                    fontSize: '0.4rem', 
                                                    color: index % 2 === 0 ? '#666666' : '#999999', 
                                                    display: 'inline', 
                                                    mr: 0.3 
                                                  }}>
                                                    {formatGermanMini(item.grade)}
                                                  </Typography>
                                                ))}
                                              </Box>

                                              {/* Sonstiges */}
                                              <Box sx={{ 
                                                bgcolor: '#f5f5f5', 
                                                p: 0.4, 
                                                borderRadius: 1,
                                                textAlign: 'center',
                                                border: '1px solid #e0e0e0',
                                                flex: 1
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '0.7rem', 
                                                  fontWeight: 'bold', 
                                                  color: colors.primary,
                                                  mb: 0.1
                                                }}>
                                                  {formatGradeValue(stats.sonstiges.values, mini.gradingSystem)}
                                                </Typography>
                                                <Typography sx={{ 
                                                  fontSize: '0.5rem', 
                                                  color: '#000000',
                                                  fontWeight: 'normal'
                                                }}>
                                                  {stats.sonstiges.label}
                                                </Typography>
                                                {stats.sonstiges.individualGrades.map((item, index) => (
                                                  <Typography key={index} variant="body2" sx={{ 
                                                    fontSize: '0.4rem', 
                                                    color: index % 2 === 0 ? '#666666' : '#999999', 
                                                    display: 'inline', 
                                                    mr: 0.3 
                                                  }}>
                                                    {formatGermanMini(item.grade)}
                                                  </Typography>
                                                ))}
                                              </Box>
                                            </Box>

                                            {/* Gesamtnote wird bereits oben angezeigt - hier entfernt */}
                                            
                                            {/* Karteikarten-Fortschritt */}
                                            <Box sx={{ mt: 0.5, p: 0.5, bgcolor: '#f8f9fa', borderRadius: 0.8, border: '1px solid #e9ecef' }}>
                                              
                                                                                             {(() => {
                                                 const stats = studentFlashcardStats[student.id];
                                                 const loading = flashcardStatsLoading[student.id];
                                                 
                                                 // Hole die ursprünglichen Progress-Daten für die letzten Reviews
                                                 const progressData = stats?.progressData || [];
                                                
                                                if (loading) {
                                                  return (
                                                    <Box sx={{ textAlign: 'center', py: 0.5 }}>
                                                      <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.5rem' }}>
                                                        Lade...
                                                      </Typography>
                                                    </Box>
                                                  );
                                                }
                                                
                                                if (!stats || stats.totalCards === 0) {
                                                  return (
                                                    <Box sx={{ textAlign: 'center', py: 0.5 }}>
                                                      <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.5rem' }}>
                                                        Keine Karten
                                                      </Typography>
                                                    </Box>
                                                  );
                                                }
                                                
                                                return (
                                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {/* Letzte Lern-Daten kompakt mit Icon */}
                                                    <Box sx={{ textAlign: 'center', mb: 0.5 }}>
                                                      {(() => {
                                                        const lastReviews = progressData
                                                          .filter((item: any) => item.lastReviewed)
                                                          .sort((a: any, b: any) => new Date(b.lastReviewed).getTime() - new Date(a.lastReviewed).getTime())
                                                          .slice(0, 3);
                                                        
                                                        if (lastReviews.length === 0) {
                                                          return (
                                                            <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.6rem', fontStyle: 'italic' }}>
                                                              🗂️ Noch nie gelernt
                                                            </Typography>
                                                          );
                                                        }
                                                        
                                                                                                                const dateTexts = lastReviews.map((review: any) => {
                                                          const date = new Date(review.lastReviewed);
                                                          const today = new Date();
                                                          const diffTime = Math.abs(today.getTime() - date.getTime());
                                                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                          
                                                          if (diffDays === 0) return 'Heute';
                                                          if (diffDays === 1) return 'Gestern';
                                                          if (diffDays <= 7) return `${diffDays}`;
                                                          return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                                        });

                                                        // Check if the oldest review is too old (more than 14 days)
                                                        const oldestReview = lastReviews[lastReviews.length - 1];
                                                        const oldestDate = new Date(oldestReview.lastReviewed);
                                                        const today = new Date();
                                                        const oldestDiffTime = Math.abs(today.getTime() - oldestDate.getTime());
                                                        const oldestDiffDays = Math.ceil(oldestDiffTime / (1000 * 60 * 60 * 24));
                                                        const isTooOld = oldestDiffDays > 14;

                                                        return (
                                                          <Typography 
                                                            variant="caption" 
                                                            sx={{ 
                                                              color: isTooOld ? '#dc3545' : '#495057', 
                                                              fontSize: '0.6rem', 
                                                              fontWeight: 'bold',
                                                              animation: isTooOld ? 'blink 2s infinite' : 'none',
                                                              '@keyframes blink': {
                                                                '0%': { opacity: 1 },
                                                                '50%': { opacity: 0.3 },
                                                                '100%': { opacity: 1 }
                                                              }
                                                            }}
                                                          >
                                                            🗂️ Gelernt vor {dateTexts.join(', ')} Tagen
                                                            {isTooOld && ' ⚠️'}
                                                          </Typography>
                                                        );
                                                      })()}
                                                    </Box>
                                                    
                                                    {/* Bewertungen kompakt */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.3 }}>
                                                      <Box sx={{ 
                                                        textAlign: 'center', 
                                                        flex: 1,
                                                        p: 0.3,
                                                        bgcolor: '#d4edda',
                                                        borderRadius: 0.5,
                                                        border: '1px solid #c3e6cb',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 0.3
                                                      }}>
                                                        <Typography variant="caption" sx={{ 
                                                          color: '#155724', 
                                                          fontSize: '0.6rem', 
                                                          fontWeight: 'bold'
                                                        }}>
                                                          {stats.qualityStats.perfect}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ 
                                                          color: '#155724', 
                                                          fontSize: '0.6rem'
                                                        }}>
                                                          ✅
                                                        </Typography>
                                                      </Box>
                                                      <Box sx={{ 
                                                        textAlign: 'center', 
                                                        flex: 1,
                                                        p: 0.3,
                                                        bgcolor: '#fff3cd',
                                                        borderRadius: 0.5,
                                                        border: '1px solid #ffeaa7',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 0.3
                                                      }}>
                                                        <Typography variant="caption" sx={{ 
                                                          color: '#856404', 
                                                          fontSize: '0.6rem', 
                                                          fontWeight: 'bold'
                                                        }}>
                                                          {stats.qualityStats.partial}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ 
                                                          color: '#856404', 
                                                          fontSize: '0.6rem'
                                                        }}>
                                                          ⚠️
                                                        </Typography>
                                                      </Box>
                                                      <Box sx={{ 
                                                        textAlign: 'center', 
                                                        flex: 1,
                                                        p: 0.3,
                                                        bgcolor: '#f8d7da',
                                                        borderRadius: 0.5,
                                                        border: '1px solid #f5c6cb',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 0.3
                                                      }}>
                                                        <Typography variant="caption" sx={{ 
                                                          color: '#721c24', 
                                                          fontSize: '0.6rem', 
                                                          fontWeight: 'bold'
                                                        }}>
                                                          {stats.qualityStats.notKnown}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ 
                                                          color: '#721c24', 
                                                          fontSize: '0.6rem'
                                                        }}>
                                                          ❌
                                                        </Typography>
                                                      </Box>
                                                    </Box>
                                                    
                                                    {/* Fällige Karten */}
                                                    {stats.dueCards > 0 && (
                                                      <Box sx={{ 
                                                        textAlign: 'center', 
                                                        mt: 0.3,
                                                        p: 0.3,
                                                        bgcolor: '#fff3cd',
                                                        borderRadius: 0.5,
                                                        border: '1px solid #ffeaa7'
                                                      }}>
                                                        <Typography variant="caption" sx={{ 
                                                          color: '#856404', 
                                                          fontSize: '0.5rem', 
                                                          fontWeight: 'bold'
                                                        }}>
                                                          {stats.dueCards} fällig
                                                        </Typography>
                                                      </Box>
                                                    )}
                                                  </Box>
                                                );
                                              })()}
                                            </Box>
                                          </Box>
                                        );
                                      })()}
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Grid>
                        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                          {/* Zugeordnete Ordner */}
                          <Box sx={{ 
                            p: 2.1, 
                            bgcolor: '#fff', 
                            borderRadius: 2.8, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0'
                          }}>
                            <Typography variant="h6" sx={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 600, 
                              mb: 1.5, 
                              color: colors.primary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}>
                              <FolderIcon sx={{ fontSize: 18 }} />
                              Zugeordnete Ordner
                            </Typography>
                            <Box sx={{ 
                              ml: 1,
                              p: 1.4,
                              bgcolor: '#fafbfc',
                              borderRadius: 1.4,
                              border: '1px solid #f0f0f0'
                            }}>
                              {assignedFolders[group.id] && assignedFolders[group.id].length > 0 ? (
                                <Box>
                                  {assignedFolders[group.id].map((folderPath: string) => {
                                    return renderAssignedFolderPreview(group.id, folderPath);
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
                            </Box>
                          </Box>
                          
                          {/* Zugeordnete Karteikarten-Decks */}
                          <Box sx={{ 
                            p: 2.1, 
                            bgcolor: '#fff', 
                            borderRadius: 2.8, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0'
                          }}>
                            <Typography variant="h6" sx={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 600, 
                              mb: 1.5, 
                              color: colors.primary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}>
                              📚 Karteikarten-Decks
                            </Typography>
                            <Box sx={{ 
                              ml: 1,
                              p: 1.4,
                              bgcolor: '#fafbfc',
                              borderRadius: 1.4,
                              border: '1px solid #f0f0f0'
                            }}>
                              {loadingFlashcardDecks[group.id] ? (
                                <Typography variant="body2" sx={{ 
                                  color: colors.textSecondary,
                                  fontSize: '0.75rem',
                                  fontStyle: 'italic'
                                }}>
                                  Lade Decks...
                                </Typography>
                              ) : assignedFlashcardDecks[group.id] && assignedFlashcardDecks[group.id].length > 0 ? (
                                <Box>
                                  {assignedFlashcardDecks[group.id].map((deck: FlashcardDeck) => (
                                    <Box 
                                      key={deck.id} 
                                      onClick={async () => {
                                        // Lade das vollständige Deck mit Karten
                                        try {
                                          const response = await fetch(`/api/flashcards/${deck.id}`);
                                          if (response.ok) {
                                            const responseData = await response.json();
                                            // Die API gibt { deck } zurück
                                            const deckData = responseData.deck || responseData;
                                            setSelectedFlashcardDeck(deckData);
                                            setShowFlashcardModal(true);
                                          }
                                        } catch (error) {
                                          console.error('Fehler beim Laden des Decks:', error);
                                        }
                                      }}
                                      sx={{ 
                                        mb: 1, 
                                        p: 1, 
                                        bgcolor: '#fff',
                                        borderRadius: 1,
                                        border: '1px solid #e0e0e0',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                        cursor: 'pointer',
                                        '&:hover': {
                                          bgcolor: '#f5f5f5'
                                        }
                                      }}
                                    >
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ 
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          color: colors.primary,
                                          mb: 0.3
                                        }}>
                                          {deck.title}
                                        </Typography>
                                        {deck.description && (
                                          <Typography variant="caption" sx={{ 
                                            fontSize: '0.65rem',
                                            color: colors.textSecondary,
                                            display: 'block'
                                          }}>
                                            {deck.description}
                                          </Typography>
                                        )}
                                        <Typography variant="caption" sx={{ 
                                          fontSize: '0.65rem',
                                          color: colors.textSecondary,
                                          display: 'block',
                                          mt: 0.3
                                        }}>
                                          {deck.cards?.length || 0} Karten
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (deck.id) {
                                              handleEditDeck(deck);
                                            }
                                          }}
                                          sx={{ 
                                            color: colors.accent1,
                                            width: 24,
                                            height: 24,
                                            '&:hover': { 
                                              bgcolor: colors.accent1 + '20'
                                            }
                                          }}
                                          title="Deck bearbeiten"
                                        >
                                          <StyleIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (deck.id && (deck as any).assignmentId) {
                                              try {
                                                const response = await fetch(`/api/flashcards/assignments/${(deck as any).assignmentId}`, {
                                                  method: 'DELETE',
                                                  headers: {
                                                    'Content-Type': 'application/json'
                                                  },
                                                  body: JSON.stringify({ teacherId: userId })
                                                });
                                                if (response.ok) {
                                                  // Reload decks for this group
                                                  await fetchAssignedFlashcardDecks(group.id);
                                                  showSnackbar('Zuweisung entfernt', 'success');
                                                } else {
                                                  const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
                                                  console.error('Fehler beim Entfernen der Zuweisung:', errorData);
                                                  showSnackbar(errorData.error || 'Fehler beim Entfernen der Zuweisung', 'error');
                                                }
                                              } catch (error) {
                                                console.error('Fehler beim Entfernen der Zuweisung:', error);
                                                showSnackbar('Fehler beim Entfernen der Zuweisung', 'error');
                                              }
                                            }
                                          }}
                                          sx={{ 
                                            color: colors.error,
                                            width: 24,
                                            height: 24,
                                            '&:hover': { 
                                              bgcolor: colors.error + '20'
                                            }
                                          }}
                                          title="Zuweisung entfernen"
                                        >
                                          <DeleteIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" sx={{ 
                                  color: colors.textSecondary,
                                  fontSize: '0.75rem',
                                  fontStyle: 'italic'
                                }}>
                                  Keine Karteikarten-Decks zugeordnet
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          
                          {/* Zugeordnete Inhalte - nur anzeigen wenn welche vorhanden */}
                          {subjects.filter(subject => (subjectAssignments[subject.id] || []).includes(group.id)).length > 0 && (
                            <Box sx={{ 
                              p: 2.1, 
                              bgcolor: '#fff', 
                              borderRadius: 2.8, 
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              border: '1px solid #e0e0e0'
                            }}>
                            {/* Verschachtelte Darstellung */}
                            <Box sx={{ 
                              ml: 1,
                              p: 1.4,
                              bgcolor: '#fafbfc',
                              borderRadius: 1.4,
                              border: '1px solid #f0f0f0'
                            }}>
                              {subjects
                                .filter(subject => (subjectAssignments[subject.id] || []).includes(group.id))
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
                                      .filter(block => block.subjectId === subject.id && (blockAssignments[block.id] || []).includes(group.id))
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
                                            .filter(unit => unit.blockId === block.id && (unitAssignments[unit.id] || []).includes(group.id))
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
                                                  .filter(topic => topic.unitId === unit.id && (topicAssignments[topic.id] || []).includes(group.id))
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
                                                        .filter(lesson => lesson.topicId === topic.id && (lessonAssignments[lesson.id] || []).includes(group.id))
                                                        .map(lesson => (
                                                                                                                  <Box key={lesson.id} sx={{ 
                                                          ml: 2, 
                                                          display: 'flex', 
                                                          alignItems: 'center', 
                                                          gap: '6px',
                                                          p: 0.5,
                                                          borderRadius: 1,
                                                          bgcolor: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? '#f0f8ff' : 'transparent',
                                                          transition: 'all 0.2s ease',
                                                          '&:hover': {
                                                            bgcolor: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? '#e3f2fd' : 'transparent'
                                                          }
                                                        }}>
                                                          <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                              color: colors.textSecondary,
                                                              cursor: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? 'pointer' : 'default',
                                                              fontSize: '0.75rem',
                                                              fontWeight: 500,
                                                              '&:hover': {
                                                                color: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? colors.primary : colors.textSecondary
                                                              }
                                                            }}
                                                              onClick={e => {
                                                                e.stopPropagation();
                                                                if ((lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id]) {
                                                                  openLessonContent(lesson.id, lesson.name);
                                                                }
                                                              }}
                                                              title={(lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? "Material/Quiz öffnen" : ""}
                                                            >
                                                              📖 {lesson.name}
                                                            </Typography>
                                                            {((lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id]) && (
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
                                                                {lessonQuizzes[lesson.id] ? '🧩' : '📄'}
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
                          )}

                        </Grid>
                      </Grid>
                      

                    </Box>
                  );
                  })}
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenNewGroupDialog(true)}
                    sx={{ 
                      bgcolor: `${colors.primary}20`,
                      color: colors.primary,
                      '&:hover': { bgcolor: `${colors.primary}30` },
                      mt: 1.0,
                      py: 0.4,
                      px: 1.0,
                      fontSize: '0.65rem',
                      alignSelf: 'flex-start',
                      minWidth: 'auto',
                      width: 'auto'
                    }}
                  >
                    Neue Lerngruppe hinzufügen
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Dateisystem-Pfade verwalten */}
              <Box sx={{ mb: 2 }}>
                <FileSystemPathManager teacherId={userId} />
              </Box>
              
              {/* Hauptbereich - MaterialCreator */}
              <Box>
                <MaterialCreator teacherId={userId} ref={materialCreatorRef} />
              </Box>
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={2}>
            {/* Karteikarten Section */}
            <Box sx={{ p: 1.4 }}>
              {/* Header */}
              <Card sx={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                bgcolor: colors.cardBg,
                mb: 1.5,
                border: `1px solid ${colors.border}`
              }}>
                <CardContent sx={{ p: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="h2" sx={{ 
                      fontWeight: '600', 
                      color: colors.primary,
                      fontSize: '1rem'
                    }}>
                      Karteikarten
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setOpenNewDeckDialog(true)}
                      sx={{
                        bgcolor: colors.accent1,
                        color: 'white',
                        fontWeight: '500',
                        borderRadius: '6px',
                        px: 0.4,
                        py: 0.4,
                        fontSize: '0.6rem',
                        minWidth: 'auto',
                        width: '25%',
                        '&:hover': {
                          bgcolor: colors.accent1 + 'dd'
                        }
                      }}
                    >
                      <AddIcon sx={{ fontSize: 10, mr: 0.1 }} />
                      Neues Deck
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Karteidecks Grid */}
              <Grid container spacing={1.4}>
                {flashcardDecks.map((deck) => (
                                    <Grid item xs={12} sm={6} md={4} key={deck.id}>
                    <Card sx={{ 
                      borderRadius: '12px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      bgcolor: colors.cardBg,
                      height: '100%',
                      cursor: 'pointer',
                      minHeight: 180,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)',
                        borderColor: colors.accent1
                      },
                      border: `1px solid ${colors.border}`,
                      position: 'relative',
                      overflow: 'hidden',
                      background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`
                    }}
                    onClick={() => handleEditDeck(deck)}
                    >
                      {/* Header with gradient accent */}
                      <Box sx={{ 
                        height: '3px',
                        background: `linear-gradient(90deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                        width: '100%'
                      }} />
                      
                      <CardContent sx={{ p: 1.2, height: '100%', display: 'flex', flexDirection: 'column' }}>

                        
                        {/* Title and Actions Row */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.4 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.15 }}>
                            <Typography variant="h6" component="h3" sx={{ 
                              fontWeight: '600', 
                              color: colors.primary,
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                                letterSpacing: '0.3px',
                                flex: 1,
                                minWidth: 0
                            }}>
                              {deck.title}
                            </Typography>
                              <Chip 
                                label={`${deck.cards?.length || 0}`}
                                size="small"
                                sx={{ 
                                  bgcolor: colors.primary + '20',
                                  color: colors.primary,
                                  fontSize: '0.45rem',
                                  height: '12px',
                                  fontWeight: '500',
                                  border: `1px solid ${colors.primary}30`,
                                  minWidth: '20px'
                                }}
                              />
                            </Box>
                            {deck.description && (
                              <Typography variant="body2" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.55rem',
                                lineHeight: 1.3,
                                mb: 0.4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: 0.8
                              }}>
                                {deck.description}
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Action Buttons */}
                          <Box sx={{ display: 'flex', gap: 0.25 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenFlashcardModal(deck);
                              }}
                              sx={{ 
                                color: colors.accent1,
                                bgcolor: colors.accent1 + '10',
                                '&:hover': { 
                                  bgcolor: colors.accent1 + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 20,
                                height: 20
                              }}
                              title="Karteikarten bearbeiten"
                            >
                              <StyleIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportDeck(deck);
                              }}
                              sx={{ 
                                color: colors.accent2,
                                bgcolor: colors.accent2 + '10',
                                '&:hover': { 
                                  bgcolor: colors.accent2 + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 20,
                                height: 20
                              }}
                              title="Deck exportieren"
                            >
                              <DescriptionIcon sx={{ fontSize: 11 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (deck.id) {
                                  handleDeleteDeck(deck.id || '');
                                }
                              }}
                              sx={{ 
                                color: colors.error,
                                bgcolor: colors.error + '10',
                                '&:hover': { 
                                  bgcolor: colors.error + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 20,
                                height: 20
                              }}
                              title="Deck löschen"
                            >
                              <DeleteIcon sx={{ fontSize: 11 }} />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        {/* Learning Groups - kompakter */}
                        <Box sx={{ mb: 0.5 }}>
                          <Typography variant="body2" sx={{ 
                            color: colors.textSecondary,
                            fontSize: '0.55rem',
                            mb: 0.25,
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3
                          }}>
                            <GroupIcon sx={{ fontSize: 11 }} />
                            Zugewiesene Gruppen:
                          </Typography>
                          {deck.assignments && deck.assignments.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                              {deck.assignments.map((assignment) => {
                                const group = assignment.group;
                                return group ? (
                                  <Box key={assignment.id} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.3,
                                    p: 0.2,
                                    borderRadius: '4px',
                                    bgcolor: colors.primary + '12',
                                    border: `1px solid ${colors.primary}25`
                                  }}>
                                    <Box sx={{ 
                                      width: 5, 
                                      height: 5, 
                                      borderRadius: '50%', 
                                      bgcolor: colors.accent2 
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.55rem',
                                      fontWeight: '500',
                                      color: colors.accent2,
                                      flex: 1
                                    }}>
                                      {group.name}
                                    </Typography>
                                <Chip 
                                      label={`${group.students?.length || 0}`}
                                  size="small"
                                  sx={{ 
                                        bgcolor: colors.accent2 + '20',
                                        color: colors.accent2,
                                        fontSize: '0.45rem',
                                        height: 12,
                                        fontWeight: '500',
                                        minWidth: 18
                                      }}
                                    />
                            </Box>
                          ) : (
                                  <Box key={assignment.id} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.3,
                                    p: 0.2,
                                    borderRadius: '4px',
                                    bgcolor: colors.textSecondary + '15',
                                    border: `1px solid ${colors.textSecondary}25`
                                  }}>
                                    <Box sx={{ 
                                      width: 5, 
                                      height: 5, 
                                      borderRadius: '50%', 
                                      bgcolor: colors.textSecondary 
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.55rem',
                                      fontWeight: '500',
                              color: colors.textSecondary,
                              fontStyle: 'italic'
                            }}>
                                      Unbekannte Gruppe
                            </Typography>
                        </Box>
                                );
                              })}
                            </Box>
                          ) : (
                        <Box sx={{ 
                              p: 0.3,
                              borderRadius: '4px',
                              bgcolor: colors.textSecondary + '10',
                              border: `1px solid ${colors.textSecondary}20`
                            }}>
                              <Typography variant="body2" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.5rem',
                                fontStyle: 'italic',
                                textAlign: 'center'
                              }}>
                                Keine Gruppen
                          </Typography>
                            </Box>
                          )}
                        </Box>
                        

                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={3}>
            <Box sx={{ fontSize: '0.7rem' }}>
              <DatabaseViewer />
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={4}>
            {/* Subtabs: Fächer als Tabs */}
            <Box sx={{ mb: 0.15 }}>
              <Tabs
                value={subjectTabValue}
                onChange={handleSubjectTabChange}
                variant="scrollable"
                scrollButtons={false}
                aria-label="subjects tabs"
                sx={{
                  minHeight: 32,
                  '& .MuiTabs-flexContainer': { gap: 0.5 },
                  '& .MuiTabs-indicator': { display: 'none' },
                  '& .MuiTab-root': {
                    minHeight: 30,
                    textTransform: 'none',
                    padding: '6px 10px',
                    borderRadius: '16px',
                    fontSize: '0.82rem',
                    color: '#2C3E50',
                    opacity: 1,
                  },
                  '& .MuiTab-root.Mui-selected': {
                    backgroundColor: '#e3f0fc',
                    color: '#1976D2',
                    fontWeight: 600,
                  },
                  '& .MuiTab-root:first-of-type': {
                    width: '7%',
                    minWidth: '56px',
                    maxWidth: '70px',
                  },
                  '& .MuiTab-root:not(:first-of-type)': {
                    flex: 1,
                    maxWidth: subjects.length === 1 ? '90%' : '45%',
                  },
                }}
              >
                {/* + Tab für "Fach hinzufügen" */}
                <Tab 
                  label="➕" 
                  value={-1} 
                  sx={{ 
                    fontSize: '1.2rem',
                    color: '#1976D2',
                    '&:hover': {
                      backgroundColor: '#e3f0fc',
                    }
                  }}
                />
                {subjects.map((s, i) => (
                  <Tab key={s.id} label={s.name} value={i} />
                ))}
              </Tabs>
            </Box>

            {/* Unter-Tabs: Blöcke direkt unterhalb der jeweiligen Obertabs (bei genau 2 Fächern links/rechts 50%) */}
            {subjects.length === 2 ? (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.15, mb: 2.5 }}>
                <Box sx={{ width: '50%', ml: '6%' }}>
                  {subjectTabValue === 0 && (
                    <Tabs
                      value={blockTabValue}
                      onChange={(_, v) => setBlockTabValue(v)}
                      variant="standard"
                      aria-label="blocks tabs left"
                      sx={{
                        minHeight: 20,
                        width: '100%',
                        '& .MuiTabs-flexContainer': { gap: 0.25, flexWrap: 'wrap' },
                        '& .MuiTabs-indicator': { display: 'none' },
                        '& .MuiTab-root': {
                          minHeight: 18,
                          textTransform: 'none',
                          padding: '1px 4px',
                          borderRadius: '10px',
                          fontSize: '0.6rem',
                          color: '#2C3E50',
                          opacity: 1,
                          backgroundColor: '#f1f5f9',
                          width: '20%',
                          minWidth: 0,
                        },
                        '& .MuiTab-root.Mui-selected': {
                          backgroundColor: '#e8f5e9',
                          color: '#2E7D32',
                          fontWeight: 600,
                        },
                      }}
                    >
                      {(blocks.filter(b => b.subjectId === subjects[0]?.id) || []).map((b, i) => (
                        <Tab key={b.id} label={b.name} value={i} />
                      ))}
                    </Tabs>
                  )}
                </Box>
                <Box sx={{ width: '50%', display: 'flex', justifyContent: 'flex-start' }}>
                  {subjectTabValue === 1 && (
                    <Tabs
                      value={blockTabValue}
                      onChange={(_, v) => setBlockTabValue(v)}
                      variant="standard"
                      aria-label="blocks tabs right"
                      sx={{
                        minHeight: 20,
                        width: '100%',
                        '& .MuiTabs-flexContainer': { gap: 0.25, flexWrap: 'wrap', justifyContent: 'flex-start' },
                        '& .MuiTabs-indicator': { display: 'none' },
                        '& .MuiTab-root': {
                          minHeight: 18,
                          textTransform: 'none',
                          padding: '1px 4px',
                          borderRadius: '10px',
                          fontSize: '0.6rem',
                          color: '#2C3E50',
                          opacity: 1,
                          backgroundColor: '#f1f5f9',
                          width: '20%',
                          minWidth: 0,
                        },
                        '& .MuiTab-root.Mui-selected': {
                          backgroundColor: '#e8f5e9',
                          color: '#2E7D32',
                          fontWeight: 600,
                        },
                      }}
                    >
                      {(blocks.filter(b => b.subjectId === subjects[1]?.id) || []).map((b, i) => (
                        <Tab key={b.id} label={b.name} value={i} />
                      ))}
                    </Tabs>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ mt: 0.15, mb: 2.5 }}>
                <Tabs
                  value={blockTabValue}
                  onChange={(_, v) => setBlockTabValue(v)}
                  variant="standard"
                  aria-label="blocks tabs"
                  sx={{
                    minHeight: 20,
                    width: '100%',
                    '& .MuiTabs-flexContainer': { gap: 0.25, flexWrap: 'wrap' },
                    '& .MuiTabs-indicator': { display: 'none' },
                    '& .MuiTab-root': {
                      minHeight: 18,
                      textTransform: 'none',
                      padding: '1px 4px',
                      borderRadius: '10px',
                      fontSize: '0.6rem',
                      color: '#2C3E50',
                      opacity: 1,
                      backgroundColor: '#f1f5f9',
                      width: '20%',
                      minWidth: 0,
                    },
                    '& .MuiTab-root.Mui-selected': {
                      backgroundColor: '#e8f5e9',
                      color: '#2E7D32',
                      fontWeight: 600,
                    },
                  }}
               >
                  {(blocks.filter(b => b.subjectId === subjects[subjectTabValue]?.id) || []).map((b, i) => (
                    <Tab key={b.id} label={b.name} value={i} />
                  ))}
                </Tabs>
              </Box>
            )}

            <SubjectManager
              ref={subjectManagerRef}
              teacherId={userId}
              subjectAssignments={subjectAssignments}
              setSubjectAssignments={setSubjectAssignments}
              blockAssignments={blockAssignments}
              setBlockAssignments={setBlockAssignments}
              unitAssignments={unitAssignments}
              setUnitAssignments={setUnitAssignments}
              topicAssignments={topicAssignments}
              setTopicAssignments={setTopicAssignments}
              lessonAssignments={lessonAssignments}
              setLessonAssignments={setLessonAssignments}
              setSubjects={setSubjects}
              setBlocks={setBlocks}
              setUnits={setUnits}
              setTopics={setTopics}
              setLessons={setLessons}
              visibleSubjectId={subjects[subjectTabValue]?.id}
              visibleBlockId={(blocks.filter(b => b.subjectId === subjects[subjectTabValue]?.id) || [])[blockTabValue]?.id}
              onOpenSubjectDialog={handleOpenSubjectDialog}
            />
          </TabPanel>
          <TabPanel value={mainTabValue} index={5}>
            {/* Karteikarten Section */}
            <Box sx={{ p: 1.4 }}>
              {/* Header */}
              <Card sx={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                bgcolor: colors.cardBg,
                mb: 1.5,
                border: `1px solid ${colors.border}`
              }}>
                <CardContent sx={{ p: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="h2" sx={{ 
                      fontWeight: '600', 
                      color: colors.primary,
                      fontSize: '1rem'
                    }}>
                      Karteikarten
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setOpenNewDeckDialog(true)}
                      sx={{
                        bgcolor: colors.accent1,
                        color: 'white',
                        fontWeight: '500',
                        borderRadius: '6px',
                        px: 0.4,
                        py: 0.4,
                        fontSize: '0.6rem',
                        minWidth: 'auto',
                        width: '25%',
                        '&:hover': {
                          bgcolor: colors.accent1 + 'dd'
                        }
                      }}
                    >
                      <AddIcon sx={{ fontSize: 10, mr: 0.1 }} />
                      Neues Deck
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Karteidecks Grid */}
              <Grid container spacing={1.4}>
                {flashcardDecks.map((deck) => (
                  <Grid item xs={12} sm={6} md={4} key={deck.id}>
                                        <Card sx={{ 
                      borderRadius: '12px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      bgcolor: colors.cardBg,
                      height: '100%',
                      cursor: 'pointer',
                      minHeight: 180,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)',
                        borderColor: colors.accent1
                      },
                      border: `1px solid ${colors.border}`,
                      position: 'relative',
                      overflow: 'hidden',
                      background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`
                    }}
                    onClick={() => handleEditDeck(deck)}
                    >
                      {/* Header with gradient accent */}
                      <Box sx={{ 
                        height: '3px',
                        background: `linear-gradient(90deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                        width: '100%'
                      }} />
                      
                      <CardContent sx={{ p: 1.2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Title and Actions Row */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.8 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.3 }}>
                            <Typography variant="h6" component="h3" sx={{ 
                              fontWeight: '600', 
                              color: colors.primary,
                              fontSize: '0.9rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                                letterSpacing: '0.3px',
                                flex: 1,
                                minWidth: 0
                            }}>
                              {deck.title}
                            </Typography>
                              <Chip 
                                label={`${deck.cards?.length || 0}`}
                                size="small"
                                sx={{ 
                                  bgcolor: colors.primary + '20',
                                  color: colors.primary,
                                  fontSize: '0.55rem',
                                  height: '16px',
                                  fontWeight: '500',
                                  border: `1px solid ${colors.primary}30`,
                                  minWidth: '24px'
                                }}
                              />
                            </Box>
                            {deck.description && (
                              <Typography variant="body2" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.7rem',
                                lineHeight: 1.3,
                                mb: 0.8,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: 0.8
                              }}>
                                {deck.description}
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Action Buttons */}
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenFlashcardModal(deck);
                              }}
                              sx={{ 
                                color: colors.accent1,
                                bgcolor: colors.accent1 + '10',
                                '&:hover': { 
                                  bgcolor: colors.accent1 + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 26,
                                height: 26
                              }}
                              title="Karteikarten bearbeiten"
                            >
                              <StyleIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportDeck(deck);
                              }}
                              sx={{ 
                                color: colors.accent2,
                                bgcolor: colors.accent2 + '10',
                                '&:hover': { 
                                  bgcolor: colors.accent2 + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 26,
                                height: 26
                              }}
                              title="Deck exportieren"
                            >
                              <DescriptionIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (deck.id) {
                                  handleDeleteDeck(deck.id || '');
                                }
                              }}
                              sx={{ 
                                color: colors.error,
                                bgcolor: colors.error + '10',
                                '&:hover': { 
                                  bgcolor: colors.error + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 26,
                                height: 26
                              }}
                              title="Deck löschen"
                            >
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        {/* Learning Groups - DEUTLICH nach oben, direkt unter dem Titel */}
                        <Box sx={{ mb: 0.8 }}>
                          <Typography variant="body2" sx={{ 
                            color: colors.textSecondary,
                            fontSize: '0.65rem',
                            mb: 0.4,
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3
                          }}>
                            <GroupIcon sx={{ fontSize: 14 }} />
                            Zugewiesen an:
                          </Typography>
                          {deck.assignments && deck.assignments.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              {deck.assignments.map((assignment) => {
                                const group = assignment.group;
                                return group ? (
                                  <Box key={assignment.id} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.4,
                                    p: 0.25,
                                    borderRadius: '6px',
                                    bgcolor: colors.primary + '12',
                                    border: `1px solid ${colors.primary}25`
                                  }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      bgcolor: colors.accent2 
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.6rem',
                                      fontWeight: '500',
                                      color: colors.accent2,
                                      flex: 1
                                    }}>
                                      {group.name}
                                    </Typography>
                                    <Chip 
                                      label={`${group.students?.length || 0}`}
                                      size="small"
                                      sx={{ 
                                        bgcolor: colors.accent2 + '20',
                                        color: colors.accent2,
                                        fontSize: '0.45rem',
                                        height: 14,
                                        fontWeight: '500'
                                      }}
                                    />
                                  </Box>
                                ) : (
                                  <Box key={assignment.id} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.4,
                                    p: 0.25,
                                    borderRadius: '6px',
                                    bgcolor: colors.textSecondary + '15',
                                    border: `1px solid ${colors.textSecondary}25`
                                  }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      bgcolor: colors.textSecondary 
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.6rem',
                                      fontWeight: '500',
                                      color: colors.textSecondary,
                                      fontStyle: 'italic'
                                    }}>
                                      Unbekannte Gruppe
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                          ) : (
                            <Box sx={{ 
                              p: 0.4,
                              borderRadius: '6px',
                              bgcolor: colors.textSecondary + '10',
                              border: `1px solid ${colors.textSecondary}20`
                            }}>
                              <Typography variant="body2" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.55rem',
                                fontStyle: 'italic',
                                textAlign: 'center'
                              }}>
                                Keine Lerngruppen zugewiesen
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        
                        {/* Icon Box - Smaller */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: 50,
                          height: 50,
                          borderRadius: '12px',
                          background: `linear-gradient(135deg, ${deck.imageColor || colors.accent2} 0%, ${deck.imageColor || colors.accent2}dd 100%)`,
                          mb: 1,
                          alignSelf: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                        }}>
                          <Typography sx={{ 
                            fontSize: '1.5rem',
                            color: 'white',
                            fontWeight: 'bold',
                            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                          }}>
                            {deck.imageIcon || '📚'}
                          </Typography>
                        </Box>
                        

                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Leerer Zustand */}
              {flashcardDecks.length === 0 && (
                <Card sx={{ 
                  borderRadius: 2.8,
                  boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
                  bgcolor: colors.cardBg,
                  textAlign: 'center',
                  p: 3,
                  border: `1px solid ${colors.border}`
                }}>
                  <Typography variant="h6" sx={{ 
                    color: colors.textSecondary,
                    mb: 1,
                    fontSize: '1rem'
                  }}>
                      Keine Karteidecks vorhanden
                    </Typography>
                  <Typography variant="body2" sx={{ 
                    color: colors.textSecondary + '80',
                    mb: 2,
                    fontSize: '0.8rem'
                  }}>
                      Erstellen Sie Ihr erstes Karteideck, um mit dem Lernen zu beginnen.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setOpenNewDeckDialog(true)}
                      sx={{
                      bgcolor: colors.accent1,
                      color: 'white',
                      '&:hover': {
                        bgcolor: colors.accent1 + 'dd'
                      }
                    }}
                  >
                    <AddIcon sx={{ mr: 1, fontSize: 16 }} />
                      Erstes Deck erstellen
                    </Button>
                </Card>
              )}
            </Box>
          </TabPanel>


        </Grid>
      </Grid>

      {/* New Group Dialog */}
      <Dialog open={openNewGroupDialog} onClose={() => setOpenNewGroupDialog(false)}>
        <DialogTitle>Neue Lerngruppe erstellen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name der Lerngruppe"
            type="text"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenNewGroupDialog(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setOpenNewGroupDialog(false);
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateGroup} 
            variant="contained" 
            color="primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateGroup();
              }
            }}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add Students Dialog */}
      <Dialog open={openAddStudentsDialog} onClose={handleCloseAddStudentsDialog}>
        <DialogTitle>Schüler hinzufügen</DialogTitle>
        <DialogContent>
          <List>
            {availableStudents.map((student) => (
              <ListItem key={student.id}>
                <ListItemText 
                  primary={formatStudentName(student.name)}
                  secondary={`Login-Code: ${student.loginCode}`}
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    onChange={(event) => {
                      setSelectedStudents((prev) => {
                        if (event.target.checked) {
                          return [...prev, student.id];
                        } else {
                          return prev.filter(id => id !== student.id);
                        }
                      });
                    }}
                    checked={selectedStudents.includes(student.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseAddStudentsDialog}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCloseAddStudentsDialog();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddStudents} 
            variant="contained" 
            color="primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddStudents();
              }
            }}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Kontextmenü für Gruppen */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
        PaperProps={{
          sx: {
            mt: 0.5,
            transform: 'translateX(-12px)'
          }
        }}
      >
        <MenuItem onClick={() => { handleOpenAddStudents(menuGroupId!); handleMenuClose(); }}>
          <PersonAddIcon fontSize="small" sx={{ mr: 1 }} /> Schüler hinzufügen
        </MenuItem>
        <MenuItem onClick={() => handleFolderAssignmentOpen(menuGroupId!)}>
          <FolderIcon fontSize="small" sx={{ mr: 1 }} /> Ordner zuordnen
        </MenuItem>
        <MenuItem onClick={() => handleEditDialogOpen(menuGroupId!, groups.find(g => g.id === menuGroupId!)?.name || '')}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Bearbeiten
        </MenuItem>
        <MenuItem onClick={() => handleGradingDialogOpen(menuGroupId!, groups.find(g => g.id === menuGroupId!)?.name || '')}>
          <AssessmentIcon fontSize="small" sx={{ mr: 1 }} /> Benotung festlegen
        </MenuItem>
        {(() => {
          const group = groups.find(g => g.id === menuGroupId!);
          return group && group.students.length > 0 ? (
            <MenuItem onClick={() => handleGradesDialogOpen(menuGroupId!, group.name, group.students[0])}>
              <GradeIcon fontSize="small" sx={{ mr: 1 }} /> Noten anzeigen
            </MenuItem>
          ) : null;
        })()}
        <MenuItem onClick={() => handleDeleteDialogOpen(menuGroupId!)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Löschen
        </MenuItem>
      </Menu>
      {/* Bearbeitungsdialog für Lerngruppe */}
      <Dialog open={editDialogOpen} onClose={handleEditDialogClose}>
        <DialogTitle>Lerngruppe bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name der Lerngruppe"
            type="text"
            fullWidth
            value={editGroupName}
            onChange={(e) => setEditGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditGroup();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleEditGroup} 
            variant="contained" 
            color="primary"
            disabled={!editGroupName.trim()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditGroup();
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bestätigungsdialog für Löschen */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Lerngruppe löschen</DialogTitle>
        <DialogContent>
          <Typography>Möchtest du diese Lerngruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</Typography>
          <Typography sx={{ color: 'error.main', mt: 2, fontWeight: 'bold' }}>
            Achtung: Diese Aktion löscht alle Zuweisungen und Bewertungsschemata dieser Gruppe unwiderruflich!
          </Typography>
          <Box sx={{ mt: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input type="checkbox" checked={confirmDelete1} onChange={e => setConfirmDelete1(e.target.checked)} style={{ marginRight: 8 }} />
              Ich habe verstanden, dass alle Inhalte und Zuweisungen gelöscht werden.
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={confirmDelete2} onChange={e => setConfirmDelete2(e.target.checked)} style={{ marginRight: 8 }} />
              Ich möchte diese Gruppe wirklich unwiderruflich löschen.
            </label>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'error.main', fontWeight: 'bold' }}>
                Zur Bestätigung: Gib "ENTFERNEN" ein
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={confirmDeleteWord}
                onChange={(e) => setConfirmDeleteWord(e.target.value)}
                placeholder="ENTFERNEN eingeben"
                sx={{ mb: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Abbrechen</Button>
          <Button onClick={handleDeleteGroup} color="error" variant="contained" disabled={!(confirmDelete1 && confirmDelete2 && confirmDeleteWord === 'ENTFERNEN')} onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleDeleteGroup();
              }
            }}>Löschen</Button>
        </DialogActions>
      </Dialog>

      {/* Grading Schema Modal */}
      <GradingSchemaModal
        open={gradingModalOpen}
        onClose={handleGradingDialogClose}
        groupId={gradingGroupId || ''}
        groupName={gradingGroupName}
      />

      {/* Schüler Menü */}
      <Menu anchorEl={studentMenuAnchorEl} open={Boolean(studentMenuAnchorEl)} onClose={handleStudentMenuClose}>
        <MenuItem onClick={() => { if (studentMenuCtx) handleGradesDialogOpen(studentMenuCtx.groupId, groups.find(g=>g.id===studentMenuCtx.groupId)?.name || '', studentMenuCtx.student); handleStudentMenuClose(); }}>
          <GradeIcon fontSize="small" style={{ marginRight: 8 }} /> Noten eintragen
        </MenuItem>
        <MenuItem onClick={() => { 
          if (studentMenuCtx) {
            setSelectedStudentForStats(studentMenuCtx.student);
            setShowStudentSubmissionStats(true);
          }
          handleStudentMenuClose(); 
        }}>
          <AssignmentIcon fontSize="small" style={{ marginRight: 8 }} /> Abgabestatistik
        </MenuItem>
        <MenuItem onClick={() => { 
          if (studentMenuCtx) {
            setSelectedStudentForMessage(studentMenuCtx.student);
            setMessageSubject('');
            setMessageContent('');
            setShowSendMessageDialog(true);
          }
          handleStudentMenuClose(); 
        }}>
          <EmailIcon fontSize="small" style={{ marginRight: 8 }} /> Nachricht senden
        </MenuItem>
        <MenuItem onClick={() => { if (studentMenuCtx) handleRemoveStudentDialogOpen(studentMenuCtx.groupId, studentMenuCtx.student); handleStudentMenuClose(); }}>
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Entfernen
        </MenuItem>
      </Menu>

      {/* Abgabestatistik Dialog für Schüler */}
      <Dialog
        open={showStudentSubmissionStats}
        onClose={() => setShowStudentSubmissionStats(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', py: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
              📊 Abgabestatistik: {selectedStudentForStats?.name}
            </Typography>
            <IconButton
              onClick={() => setShowStudentSubmissionStats(false)}
              sx={{ width: 24, height: 24, p: 0 }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2 }}>
          {selectedStudentForStats && (
            <SubmissionStatistics 
              userId={selectedStudentForStats.id} 
              submissionStats={studentSubmissionStats} 
              setSubmissionStats={setStudentSubmissionStats}
              isTeacherView={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Schüler Entfernung Bestätigungsdialog */}
      <Dialog open={removeStudentDialogOpen} onClose={handleRemoveStudentDialogClose}>
        <DialogTitle>Schüler entfernen</DialogTitle>
        <DialogContent>
          <Typography>Möchtest du diesen Schüler wirklich aus der Lerngruppe entfernen?</Typography>
          <Typography sx={{ color: 'error.main', mt: 2, fontWeight: 'bold' }}>
            Achtung: Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input type="checkbox" checked={confirmRemoveStudent1} onChange={e => setConfirmRemoveStudent1(e.target.checked)} style={{ marginRight: 8 }} />
              Ich habe verstanden, dass dieser Schüler unwiderruflich entfernt wird.
            </label>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input type="checkbox" checked={confirmRemoveStudent2} onChange={e => setConfirmRemoveStudent2(e.target.checked)} style={{ marginRight: 8 }} />
              Ich möchte diesen Schüler wirklich unwiderruflich entfernen.
            </label>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'error.main', fontWeight: 'bold' }}>
                Zur Bestätigung: Gib "ENTFERNEN" ein
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={confirmRemoveStudentWord}
                onChange={(e) => setConfirmRemoveStudentWord(e.target.value)}
                placeholder="ENTFERNEN eingeben"
                sx={{ mb: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRemoveStudentDialogClose}>Abbrechen</Button>
          <Button 
            onClick={handleRemoveStudentConfirm} 
            color="error" 
            variant="contained" 
            disabled={!(confirmRemoveStudent1 && confirmRemoveStudent2 && confirmRemoveStudentWord === 'ENTFERNEN')}
          >
            Entfernen
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0', mt: 2 }}>
        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
          Tastatur: Tab zum Navigieren, Pfeiltasten für Tabs, ESC zum Logout
        </Typography>
      </Box>

      {/* Ordner-Zuordnungs-Dialog */}
      <Dialog 
        open={folderAssignmentModalOpen} 
        onClose={handleFolderAssignmentClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          Ordner zuordnen: {folderAssignmentGroupName}
        </DialogTitle>
        <DialogContent>
          <FolderAssignmentSelector
            groupId={folderAssignmentGroupId || ''}
            onClose={handleFolderAssignmentClose}
            onFoldersAssigned={() => {
              if (folderAssignmentGroupId) {
                fetchAssignedFolders(folderAssignmentGroupId);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Grades Modal */}
      {selectedStudent && (
        <GradesModal
          open={gradesModalOpen}
          onClose={handleGradesDialogClose}
          student={selectedStudent}
          groupId={gradesGroupId || ''}
          groupName={gradesGroupName}
        />
      )}

      {/* Quiz-Erstellungsmodal */}
      <Dialog 
        open={quizDialogOpen} 
        onClose={handleQuizDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QuizIcon sx={{ mr: 1, color: '#ff9800' }} />
            Quiz erstellen aus: {selectedQuizFile?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Quiz-Einstellungen */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#ff9800' }}>
                Quiz-Einstellungen
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Titel des Quiz"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Zeitlimit (Minuten)"
                type="number"
                value={quizTimeLimit}
                onChange={(e) => setQuizTimeLimit(parseInt(e.target.value) || 30)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                multiline
                rows={3}
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Notenkategorie</InputLabel>
                <Select
                  value={gradeCategory}
                  onChange={(e) => setGradeCategory(e.target.value)}
                  label="Notenkategorie"
                >
                  {availableGradeCategories.map((cat) => (
                    <MenuItem key={cat.category} value={cat.category}>
                      {cat.category} ({cat.schemaName})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Notenschema</InputLabel>
                <Select
                  value={selectedGradeSchema}
                  onChange={(e) => setSelectedGradeSchema(e.target.value)}
                  label="Notenschema"
                >
                  {availableGradeCategories
                    .filter(cat => !gradeCategory || cat.category === gradeCategory)
                    .map((cat) => (
                      <MenuItem key={cat.schemaId} value={cat.schemaId}>
                        {cat.schemaName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                  />
                }
                label="Fragen mischen"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shuffleAnswers}
                    onChange={(e) => setShuffleAnswers(e.target.checked)}
                  />
                }
                label="Antworten mischen"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleQuizDialogClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateQuiz} 
            variant="contained" 
            color="primary"
            disabled={!quizTitle.trim()}
          >
            Quiz erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Neues Karteideck Dialog */}
      <Dialog 
        open={openNewDeckDialog} 
        onClose={() => {
          setOpenNewDeckDialog(false);
          setEditingDeck(null);
          setNewDeckTitle('');
          setNewDeckDescription('');
          setSelectedGroupIds([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, pt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: '600' }}>
              {editingDeck ? 'Karteideck bearbeiten' : 'Neues Karteideck erstellen'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titel *"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                required
                size="small"
                sx={{ mb: 1.5 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                multiline
                rows={2}
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                size="small"
                sx={{ mb: 1.5 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>Lerngruppen zuweisen</InputLabel>
                <Select
                  multiple
                  value={selectedGroupIds}
                  onChange={(e) => {
                    const value = e.target.value as string[];
                    console.log('Gruppenauswahl geändert:', value);
                    setSelectedGroupIds(value);
                  }}
                  label="Lerngruppen zuweisen"
                  renderValue={(selected: string[]) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                      {selected.map((value: string) => {
                        const group = groups.find(g => g.id === value);
                        return (
                          <Chip 
                            key={value} 
                            label={group?.name || value} 
                            size="small" 
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {groups && groups.length > 0 ? groups.map((group) => (
                    <MenuItem key={group.id} value={group.id} dense>
                      <Checkbox 
                        checked={selectedGroupIds.includes(group.id)}
                        size="small"
                      />
                      <ListItemText 
                        primary={group.name} 
                        primaryTypographyProps={{ fontSize: '0.8rem' }}
                      />
                    </MenuItem>
                  )) : (
                    <MenuItem disabled>
                      <Typography variant="body2" color="textSecondary">
                        Keine Lerngruppen verfügbar
                      </Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
              
              {/* Anzeige der bereits zugewiesenen Lerngruppen */}
              {false && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: colors.textSecondary, 
                    fontSize: '0.7rem', 
                    mb: 0.5,
                    fontWeight: '500'
                  }}>
                    Bereits zugewiesen:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                    {/* TODO: Implement assignment display */}
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, pt: 0 }}>
          <Button 
            onClick={() => {
              setOpenNewDeckDialog(false);
              setEditingDeck(null);
              setNewDeckTitle('');
              setNewDeckDescription('');
            setSelectedGroupIds([]);
            }}
            size="small"
          >
            Abbrechen
          </Button>
          <Button 
            onClick={editingDeck ? handleUpdateDeck : handleNewDeckSubmit} 
            variant="contained" 
            color="primary"
            disabled={!newDeckTitle.trim()}
            size="small"
          >
            {editingDeck ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Karteikarten-Verwaltungs-Modal */}
      {selectedDeck && (
        <Dialog 
          open={!!selectedDeck} 
          onClose={() => {
            setSelectedDeck(null);
            setEditingCard(null);
            setIsAddingCard(false);
            setNewCardFront('');
            setNewCardBack('');
          }}
          maxWidth={false}
          fullWidth
          PaperProps={{
            sx: {
              minHeight: '85vh',
              maxHeight: '95vh',
              width: '98vw',
              maxWidth: '1600px',
              borderRadius: '12px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`,
              overflow: 'hidden'
            }
          }}
        >
          {/* Header mit Gradient */}
          <Box sx={{ 
            height: '6px',
            background: `linear-gradient(90deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
            width: '100%'
          }} />
          
          {/* Modal Header */}
          <DialogTitle sx={{ 
            pb: 1,
            pt: 1.5,
            background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.accent1}08 100%)`,
            borderBottom: `1px solid ${colors.border}`,
            position: 'relative'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: '600',
                    color: colors.textPrimary,
                    letterSpacing: '0.2px',
                    fontSize: '1.1rem',
                    mb: 0.3
                  }}>
                    {selectedDeck?.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`${selectedDeck?.cards?.length || 0} Karten`}
                      size="small"
                      sx={{
                        bgcolor: colors.primary + '20',
                        color: colors.primary,
                        fontWeight: '600',
                        fontSize: '0.7rem',
                        height: '22px'
                      }}
                    />

                    {selectedDeck?.subject && (
                      <Chip 
                        label={selectedDeck.subject.name}
                        size="small"
                        sx={{
                          bgcolor: colors.secondary + '20',
                          color: colors.secondary,
                          fontWeight: '600',
                          fontSize: '0.7rem',
                          height: '22px'
                        }}
                      />
                    )}
                  </Box>

                </Box>
              </Box>
              
              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddCard}
                  sx={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent1} 100%)`,
                    borderRadius: '6px',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    minWidth: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <AddIcon sx={{ fontSize: 16, mr: 0.5, color: 'white' }} />
                  Neue Karte
                </Button>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0, overflow: 'auto', height: '100%', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-track': { background: colors.border + '20' }, '&::-webkit-scrollbar-thumb': { background: colors.primary + '40', borderRadius: '4px' } }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              {/* Neue Karte hinzufügen */}
              {isAddingCard && (
                <Box sx={{ 
                  p: 3, 
                  mb: 2, 
                  background: `linear-gradient(135deg, ${colors.accent1}08 0%, ${colors.accent2}08 100%)`,
                  border: `2px solid ${colors.accent1}30`,
                  borderRadius: '16px',
                  mx: 2,
                  mt: 2,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.08)'
                }}>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    fontWeight: '600',
                    color: colors.accent1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <AddIcon sx={{ fontSize: 20 }} />
                    Neue Karteikarte hinzufügen
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: '600', color: colors.textPrimary }}>
                          Frage *
                        </Typography>
                        <RichTextEditor
                          value={newCardFront}
                          onChange={(value) => setNewCardFront(value)}
                          placeholder="Frage eingeben..."
                          rows={3}
                          compact={true}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: '600', color: colors.textPrimary }}>
                          Antwort *
                        </Typography>
                        <RichTextEditor
                          value={newCardBack}
                          onChange={(value) => setNewCardBack(value)}
                          placeholder="Antwort eingeben..."
                          rows={3}
                          compact={true}
                        />
                      </Box>
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
                      sx={{
                        borderColor: colors.textSecondary,
                        color: colors.textSecondary,
                        borderRadius: '8px',
                        px: 2,
                        py: 0.8,
                        fontSize: '0.8rem'
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveCard}
                      disabled={!newCardFront.trim() || !newCardBack.trim()}
                      sx={{
                        background: `linear-gradient(135deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                        borderRadius: '8px',
                        px: 3,
                        py: 0.8,
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        '&:disabled': {
                          opacity: 0.6
                        }
                      }}
                    >
                      Karte speichern
                    </Button>
                  </Box>
                </Box>
              )}



              {/* Karteikarten-Übersicht */}
              <Box sx={{ flex: 1, overflow: 'visible', p: 1.5 }}>
                {(!selectedDeck.cards || selectedDeck.cards.length === 0) ? (
                                      <Card sx={{ 
                      p: 6, 
                      textAlign: 'center', 
                      bgcolor: colors.background,
                      borderRadius: '20px',
                      border: `2px dashed ${colors.border}`,
                      mx: 2,
                      boxShadow: '0 6px 24px rgba(0,0,0,0.08)'
                    }}>
                      <StyleIcon sx={{ fontSize: 60, color: colors.textSecondary, mb: 2, opacity: 0.4 }} />
                      <Typography variant="h5" sx={{ color: colors.textSecondary, mb: 1.5, fontWeight: '600' }}>
                        Keine Karteikarten vorhanden
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 3, fontSize: '1rem', opacity: 0.8 }}>
                        Erstellen Sie Ihre erste Karteikarte, um mit dem Lernen zu beginnen.
                      </Typography>
                      <Button
                        variant="contained"
                        size="medium"
                        onClick={handleAddCard}
                        sx={{
                          background: `linear-gradient(135deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                          borderRadius: '16px',
                          px: 4,
                          py: 1.5,
                          fontSize: '1rem',
                          fontWeight: '600',
                          boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <AddIcon sx={{ fontSize: 24, mr: 1 }} />
                        Erste Karte erstellen
                      </Button>
                    </Card>
                ) : (
                  <Box>
                    {/* Bearbeitungsbereich - wird angezeigt wenn editingCard gesetzt ist */}
                    {editingCard && (
                      <Box sx={{ 
                        mb: 3, 
                        p: 2, 
                        background: `linear-gradient(135deg, ${colors.cardBg} 0%, ${colors.background} 100%)`,
                        border: `2px solid ${colors.primary}`,
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="h6" sx={{ 
                          mb: 2, 
                          color: colors.primary, 
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          ✏️ Karte bearbeiten
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{
                            fontWeight: '700',
                            mb: 1,
                            color: colors.primary,
                            fontSize: '0.8rem'
                          }}>
                            Frage:
                          </Typography>
                          <RichTextEditor
                            value={newCardFront}
                            onChange={(value) => setNewCardFront(value)}
                            placeholder="Frage eingeben..."
                            rows={3}
                            compact={false}
                            key={`front-${editingCard?.id || 'new'}`}
                          />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{
                            fontWeight: '600',
                            mb: 1,
                            color: colors.secondary,
                            fontSize: '0.8rem'
                          }}>
                            Antwort:
                          </Typography>
                          <RichTextEditor
                            value={newCardBack}
                            onChange={(value) => setNewCardBack(value)}
                            placeholder="Antwort eingeben..."
                            rows={3}
                            compact={false}
                            key={`back-${editingCard?.id || 'new'}`}
                          />
                        </Box>
                        
                        {/* Aktions-Buttons */}
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setEditingCard(null);
                              setNewCardFront('');
                              setNewCardBack('');
                            }}
                            sx={{
                              borderColor: colors.textSecondary,
                              color: colors.textSecondary,
                              borderRadius: '8px',
                              px: 2,
                              py: 0.8,
                              fontSize: '0.8rem'
                            }}
                          >
                            Abbrechen
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleUpdateCard}
                            disabled={!newCardFront.trim() || !newCardBack.trim()}
                            sx={{
                              background: colors.primary,
                              borderRadius: '8px',
                              px: 2,
                              py: 0.8,
                              fontSize: '0.8rem',
                              '&:disabled': {
                                opacity: 0.6
                              }
                            }}
                          >
                            Speichern
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {/* Karteikarten-Liste mit Drag & Drop und Löschen-Funktion - Vier Spalten */}
                    <Grid container spacing={2}>
                      {selectedDeck.cards.map((card, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={card.id || index}>
                          <Card 
                            sx={{ 
                              height: '100%',
                              minHeight: '320px',
                              background: `linear-gradient(135deg, ${colors.cardBg} 0%, ${colors.background} 100%)`,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              transition: 'all 0.2s ease',
                              cursor: editingCard?.id === card.id ? 'default' : 'pointer',
                              '&:hover': {
                                borderColor: colors.primary,
                                transform: editingCard?.id === card.id ? 'none' : 'translateY(-1px)',
                                boxShadow: editingCard?.id === card.id ? '0 2px 8px rgba(0,0,0,0.06)' : '0 4px 16px rgba(0,0,0,0.12)'
                              },
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onClick={() => {
                              if (editingCard?.id !== card.id) {
                                handleEditCard(card);
                              }
                            }}
                          >
                          {/* Header mit Nummerierung und Aktionen */}
                          <Box sx={{ 
                            p: 1.5, 
                            pb: 0.5,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            borderBottom: `1px solid ${colors.border}20`
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {/* Drag Handle */}
                              <Box 
                                sx={{ 
                                  cursor: 'grab',
                                  color: colors.textSecondary,
                                  '&:hover': { color: colors.primary },
                                  transition: 'color 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Karte verschieben"
                              >
                                <GripVerticalIcon sx={{ fontSize: 18 }} />
                              </Box>
                              
                              {/* Karten-Nummer */}
                              <Chip 
                                label={`Karte ${index + 1}`}
                                size="small"
                                sx={{
                                  bgcolor: colors.primary + '20',
                                  color: colors.primary,
                                  fontWeight: '600',
                                  fontSize: '0.7rem',
                                  height: '24px'
                                }}
                              />
                            </Box>
                            
                            {/* Aktions-Buttons */}
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCard(card);
                                }}
                                sx={{
                                  borderColor: colors.accent1,
                                  color: colors.accent1,
                                  bgcolor: colors.accent1 + '10',
                                  '&:hover': { 
                                    bgcolor: colors.accent1 + '20',
                                    transform: 'scale(1.05)'
                                  },
                                  transition: 'all 0.15s ease',
                                  width: 28,
                                  height: 28,
                                  minWidth: 'auto',
                                  p: 0
                                }}
                                title="Karte bearbeiten"
                              >
                                <EditIcon sx={{ fontSize: 14 }} />
                              </Button>
                              
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCard(card.id || index.toString());
                                }}
                                sx={{
                                  borderColor: colors.error,
                                  color: colors.error,
                                  bgcolor: colors.error + '10',
                                  '&:hover': { 
                                    bgcolor: colors.error + '20',
                                    transform: 'scale(1.05)'
                                  },
                                  transition: 'all 0.15s ease',
                                  width: 28,
                                  height: 28,
                                  minWidth: 'auto',
                                  p: 0
                                }}
                                title="Karte löschen"
                              >
                                <Trash2Icon sx={{ fontSize: 14 }} />
                              </Button>
                            </Box>
                          </Box>
                          
                          {/* Karten-Inhalt */}
                          <CardContent sx={{ p: 1.5, pt: 0.5 }}>
                                                              {/* Anzeigemodus - immer sichtbar */}
                                <Box sx={{ mb: 0.1 }}>
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: '700', 
                                    mb: 0.1, 
                                    color: colors.primary,
                                    fontSize: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                  }}>
                                    Frage:
                                  </Typography>
                                  <Box sx={{ 
                                    mb: 0.1,
                                    fontSize: '0.65rem',
                                    lineHeight: 1.1,
                                    color: colors.textPrimary,
                                    minHeight: '1.1em',
                                    fontWeight: '500',
                                    '& p': { margin: '0 0 0.5em 0' },
                                    '& p:last-child': { margin: 0 },
                                    '& br': { lineHeight: '1.1em' }
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: card.front || 'Keine Frage eingegeben'
                                  }}
                                  />
                                  
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: '600', 
                                    mb: 0.1, 
                                    mt: 0.5,
                                    color: colors.secondary,
                                    fontSize: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                  }}>
                                    Antwort:
                                  </Typography>
                                  <Box sx={{ 
                                    mb: 0,
                                    fontSize: '0.65rem',
                                    lineHeight: 1.1,
                                    color: colors.textPrimary,
                                    minHeight: '1.1em',
                                    fontWeight: '500',
                                    '& p': { margin: '0 0 0.5em 0' },
                                    '& p:last-child': { margin: 0 },
                                    '& br': { lineHeight: '1.1em' }
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: card.back || 'Keine Antwort eingegeben'
                                  }}
                                  />
                                </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ 
            p: 1.5, 
            pt: 1,
            background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`,
            borderTop: `1px solid ${colors.border}`
          }}>
            <Button 
              onClick={() => {
                setSelectedDeck(null);
                setEditingCard(null);
                setIsAddingCard(false);
                setNewCardFront('');
                setNewCardBack('');
              }}
              variant="outlined"
              size="small"
              sx={{
                borderColor: colors.textSecondary,
                color: colors.textSecondary,
                borderRadius: '8px',
                px: 2,
                py: 0.8,
                fontSize: '0.8rem',
                fontWeight: '500'
              }}
            >
              Schließen
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog 
        open={deleteModalOpen} 
        onClose={() => {
          setDeleteModalOpen(false);
          setDeckToDelete(null);
          setDeleteConfirmWord('');
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(220, 38, 38, 0.3)',
            border: '2px solid #ef4444'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          pt: 2,
          backgroundColor: '#fef2f2',
          borderTopLeftRadius: '14px',
          borderTopRightRadius: '14px',
          borderBottom: '1px solid #fecaca'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}>
              <Typography variant="h6" sx={{ color: 'white', fontSize: '1.2rem' }}>
                ⚠️
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ 
                fontSize: '1.2rem', 
                fontWeight: '600',
                color: '#dc2626',
                mb: 0.5
              }}>
                Karteideck löschen
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#7f1d1d',
                fontSize: '0.85rem'
              }}>
                Diese Aktion kann nicht rückgängig gemacht werden
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3, backgroundColor: '#fef2f2' }}>
          <Typography variant="body1" sx={{ 
            mb: 3, 
            color: '#7f1d1d',
            fontSize: '0.95rem',
            lineHeight: 1.6
          }}>
            Sie sind dabei, das Karteideck <strong>"{deckToDelete?.title}"</strong> zu löschen.
            <br />
            <br />
            <strong>Alle folgenden Daten werden unwiderruflich gelöscht:</strong>
          </Typography>
          
          <Box sx={{ 
            p: 2, 
            backgroundColor: '#fee2e2', 
            borderRadius: '8px',
            border: '1px solid #fecaca',
            mb: 3
          }}>
            <Typography variant="body2" sx={{ color: '#991b1b', mb: 1 }}>
              • Alle Karteikarten in diesem Deck
            </Typography>
            <Typography variant="body2" sx={{ color: '#991b1b', mb: 1 }}>
              • Alle Gruppen-Zuweisungen
            </Typography>
            <Typography variant="body2" sx={{ color: '#991b1b' }}>
              • Alle Lernfortschritte der Schüler
            </Typography>
          </Box>
          
          <Typography variant="body1" sx={{ 
            mb: 2, 
            color: '#7f1d1d',
            fontWeight: '600'
          }}>
            Geben Sie <span style={{ color: '#dc2626' }}>LÖSCHEN</span> ein, um zu bestätigen:
          </Typography>
          
          <TextField
            fullWidth
            value={deleteConfirmWord}
            onChange={(e) => setDeleteConfirmWord(e.target.value)}
            placeholder="LÖSCHEN"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#dc2626',
                    borderWidth: '2px'
                  }
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ef4444'
                }
              }
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          pt: 2,
          backgroundColor: '#fef2f2',
          borderBottomLeftRadius: '14px',
          borderBottomRightRadius: '14px'
        }}>
            <Button 
              onClick={() => {
              setDeleteModalOpen(false);
              setDeckToDelete(null);
              setDeleteConfirmWord('');
            }}
            variant="outlined"
            sx={{
              borderColor: '#9ca3af',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#6b7280',
                backgroundColor: '#f9fafb'
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={confirmDeleteDeck}
              variant="contained"
            disabled={deleteConfirmWord !== 'LÖSCHEN'}
            sx={{
              backgroundColor: '#dc2626',
              color: 'white',
              fontWeight: '600',
              '&:hover': {
                backgroundColor: '#b91c1c'
              },
              '&:disabled': {
                backgroundColor: '#fca5a5',
                color: '#fecaca'
              }
            }}
          >
            Endgültig löschen
            </Button>
        </DialogActions>
      </Dialog>

      {/* Flashcard Creation Modal */}
      <FlashcardCreationModal
        open={flashcardModalOpen}
        onClose={handleFlashcardDialogClose}
        sourceFile={flashcardSourceFile}
        fileName={flashcardFileName}
        teacherId={userId}
        onSuccess={handleFlashcardSuccess}
      />

      {/* Mitarbeitsbewertungs-Modal */}
      <Dialog 
        open={participationModalOpen} 
        onClose={handleParticipationClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ pb: 0.5, pt: 1, px: 1.5, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Box sx={{ 
                width: 28, 
                height: 28, 
                borderRadius: '50%', 
                bgcolor: '#FF6B35', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <HandRaiseIcon sx={{ color: 'white', fontSize: 16 }} />
    </Box>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.2 }}>
                  Eintragung Epochalnoten
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.2 }}>
                  {participationGroupName}
                </Typography>
              </Box>
            </Box>
            {/* Buttons kompakt nebeneinander mittig zwischen Titel und X */}
            <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', flexWrap: 'nowrap', flex: '1 1 auto', justifyContent: 'center', mx: 1 }}>
              {/* Zeiträume einstellen */}
              <Button
                size="small"
                variant="outlined"
                startIcon={<GradeIcon sx={{ fontSize: 12 }} />}
                onClick={() => setPeriodConfigModalOpen(true)}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                Zeiträume
              </Button>
              {/* EPO-Noten berechnen */}
              <Button
                size="small"
                variant="contained"
                startIcon={<BarChartIcon sx={{ fontSize: 12 }} />}
                onClick={calculateEpoGrades}
                disabled={!periodConfig.period1Hours || !periodConfig.period2Hours}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                Berechnen
              </Button>
              {/* Zeitraum 1 */}
              {(() => {
                if (!participationGroupId) return null;
                const period1Grades = epoGrades.filter((g: any) => g.period === 1 && (g.groupId === participationGroupId || g.group?.id === participationGroupId));
                const allReleased1 = period1Grades.length > 0 && period1Grades.every((g: any) => g.isReleased === true);
                const hasPeriod1Grades = period1Grades.length > 0;
                return (
                  <Button
                    variant="contained"
                    color={allReleased1 ? "success" : "error"}
                    size="small"
                    disabled={!hasPeriod1Grades}
                    startIcon={allReleased1 ? <CheckIcon sx={{ fontSize: 12, color: 'white' }} /> : <CloseIcon sx={{ fontSize: 12, color: 'white' }} />}
                    onClick={() => {
                      releaseEpoGrade(1, !allReleased1);
                    }}
                    sx={{ 
                      fontSize: '0.65rem', 
                      py: 0.25,
                      px: 0.6,
                      minWidth: 'auto',
                      textTransform: 'none',
                      height: '24px',
                      '& .MuiButton-startIcon': {
                        marginRight: '4px',
                        marginLeft: 0
                      }
                    }}
                    title={!hasPeriod1Grades ? 'Bitte zuerst EPO-Noten berechnen' : ''}
                  >
                    Z1 {allReleased1 ? '✓' : '✗'}
                  </Button>
                );
              })()}
              {/* Zeitraum 2 */}
              {(() => {
                if (!participationGroupId) return null;
                const period2Grades = epoGrades.filter((g: any) => g.period === 2 && (g.groupId === participationGroupId || g.group?.id === participationGroupId));
                const allReleased2 = period2Grades.length > 0 && period2Grades.every((g: any) => g.isReleased === true);
                const hasPeriod2Grades = period2Grades.length > 0;
                return (
                  <Button
                    variant="contained"
                    color={allReleased2 ? "success" : "error"}
                    size="small"
                    disabled={!hasPeriod2Grades}
                    startIcon={allReleased2 ? <CheckIcon sx={{ fontSize: 12, color: 'white' }} /> : <CloseIcon sx={{ fontSize: 12, color: 'white' }} />}
                    onClick={() => {
                      releaseEpoGrade(2, !allReleased2);
                    }}
                    sx={{ 
                      fontSize: '0.65rem', 
                      py: 0.25,
                      px: 0.6,
                      minWidth: 'auto',
                      textTransform: 'none',
                      height: '24px',
                      '& .MuiButton-startIcon': {
                        marginRight: '4px',
                        marginLeft: 0
                      }
                    }}
                    title={!hasPeriod2Grades ? 'Bitte zuerst EPO-Noten berechnen' : ''}
                  >
                    Z2 {allReleased2 ? '✓' : '✗'}
                  </Button>
                );
              })()}
              {/* Statistik anzeigen */}
              <Button
                size="small"
                variant="outlined"
                startIcon={<BarChartIcon sx={{ fontSize: 12 }} />}
                onClick={() => {
                  console.log(`[STAT-DEBUG] 🖱️ BUTTON CLICK - Epochalstatistik Button wurde geklickt!`);
                  handleStatisticsOpen();
                }}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                Statistik
              </Button>
            </Box>
            <IconButton 
              size="small" 
              onClick={handleParticipationClose}
              sx={{ 
                p: 0,
                width: 20,
                height: 20,
                flexShrink: 0,
                '& svg': {
                  width: '100%',
                  height: '100%'
                }
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 1, pt: 1 }}>
          {/* Erklärung der Notenberechnung */}
          <Box sx={{ 
            mt: 1,
            mb: 1, 
            p: 0.6, 
            bgcolor: '#f5f5f5', 
            borderRadius: 0.8, 
            border: '1px solid #e0e0e0' 
          }}>
            <Typography variant="body2" sx={{ fontSize: '0.65rem', lineHeight: 1.4, color: 'text.secondary' }}>
              <strong>Notenberechnung:</strong> Grün = 1.0, Blau = 2.0, Grau = 3.0, Gelb = 4.0, Rot = 5.0
            </Typography>
          </Box>
          
          {/* Unterrichtsstunden-Navigation */}
          <Box
            ref={navFocusRef}
            tabIndex={0}
            onKeyDown={(e) => {
              const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
              const isTyping = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
              if (!isTyping && e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentLessonIndex((prev) => {
                  const next = Math.max(0, prev - 1);
                  if (participationGroupId) {
                    initializeNeutralParticipations(participationGroupId, next);
                    loadParticipations(participationGroupId);
                  }
                  return next;
                });
                return;
              }
              if (!isTyping && e.key === 'ArrowRight') {
                e.preventDefault();
                const next = currentLessonIndex + 1;
                setCurrentLessonIndex(next);
                if (participationGroupId) {
                  initializeNeutralParticipations(participationGroupId, next);
                  loadParticipations(participationGroupId);
                }
                return;
              }
              if (!isTyping && (e.key === 't' || e.key === 'T')) {
                e.preventDefault();
                lessonKeywordInputRef.current?.focus();
              }
            }}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: 1,
              pb: 0.75,
              px: 0.5,
              borderBottom: '1px solid #f0f0f0'
            }}
          >
            <IconButton 
              size="small" 
              onClick={async () => {
                const newIndex = Math.max(0, currentLessonIndex - 1);
                setCurrentLessonIndex(newIndex);
                // Initialisiere neutrale Bewertungen für diese Stunde, falls noch nicht vorhanden
                if (participationGroupId) {
                  await initializeNeutralParticipations(participationGroupId, newIndex);
                  await loadParticipations(participationGroupId);
                }
              }}
              disabled={currentLessonIndex === 0}
              sx={{ 
                p: 0,
                width: 20,
                height: 20,
                '& svg': {
                  width: '100%',
                  height: '100%'
                }
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                Unterrichtsstunde {currentLessonIndex + 1}
                {displayedLessonKeyword && displayedLessonKeyword.trim() ? (
                  <span style={{ color: 'rgba(0,0,0,0.6)', fontWeight: 400 }}>
                    {' '}– Thema: {displayedLessonKeyword.trim()}
                  </span>
                ) : null}
              </Typography>
              <TextField 
                placeholder="Stichwort"
                value={lessonKeyword}
                onChange={(e) => {
                  const v = e.target.value;
                  setLessonKeyword(v);
                  if (participationGroupId) {
                    setLessonKeywordsMap(prev => ({
                      ...prev,
                      [participationGroupId]: {
                        ...(prev[participationGroupId] || {}),
                        [currentLessonIndex]: v
                      }
                    }));
                    // Speichere in Datenbank mit kurzer Verzögerung (Debounce)
                    clearTimeout((window as any).lessonKeywordSaveTimeout);
                    (window as any).lessonKeywordSaveTimeout = setTimeout(() => {
                      if (participationGroupId) {
                        saveLessonKeyword(participationGroupId, currentLessonIndex, v);
                      }
                    }, 1000); // 1 Sekunde Verzögerung
                  }
                }}
                inputRef={lessonKeywordInputRef}
                onBlur={async () => { 
                  if (!participationGroupId) return; 
                  const group = groups.find(g => g.id === participationGroupId); 
                  if (!group) return; 
                  setApplyingLessonKeyword(true);
                  try {
                    for (const student of group.students) {
                      const groupData = participations[participationGroupId] || {};
                      const lessonData = groupData[currentLessonIndex] || {};
                      const studentData = lessonData[student.id];
                      const existingComment = studentData && typeof studentData === 'object' ? (studentData.comment as string | undefined) : undefined;
                      // Nur Kommentar aktualisieren, wenn bereits einer existiert
                      if (existingComment) {
                      const updatedComment = injectLessonKeywordIntoComment(existingComment, lessonKeyword);
                        if (existingComment !== updatedComment) {
                        await fetch(`/api/participation/${participationGroupId}/${currentLessonIndex}/${student.id}/comment`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ comment: updatedComment })
                        });
                        }
                      }
                    }
                    setParticipations(prev => {
                      const copy = { ...prev } as any;
                      const groupData2 = copy[participationGroupId] || {};
                      const lessonData2 = { ...(groupData2[currentLessonIndex] || {}) };
                      for (const student of (groups.find(g => g.id === participationGroupId)?.students || [])) {
                        const sd = lessonData2[student.id] || { value: 0 };
                        const existingComment = sd.comment as (string | undefined);
                        // Nur Kommentar aktualisieren, wenn bereits einer existiert
                        const updatedComment = existingComment ? injectLessonKeywordIntoComment(existingComment, lessonKeyword) : undefined;
                        lessonData2[student.id] = { 
                          value: (sd as any).value ?? 0, 
                          ...(updatedComment ? { comment: updatedComment } : {})
                        };
                      }
                      copy[participationGroupId] = { ...groupData2, [currentLessonIndex]: lessonData2 };
                      return copy;
                    });
                    // persist per-lesson keyword in map und Datenbank
                    setLessonKeywordsMap(prev => ({
                      ...prev,
                      [participationGroupId]: {
                        ...(prev[participationGroupId] || {}),
                        [currentLessonIndex]: lessonKeyword
                      }
                    }));
                    // Speichere in Datenbank
                    if (participationGroupId) {
                      await saveLessonKeyword(participationGroupId, currentLessonIndex, lessonKeyword);
                    }
                  } catch (err) {
                    console.error('Fehler beim Anwenden des Stunden-Schlagworts:', err);
                  } finally {
                    setApplyingLessonKeyword(false);
                    // Fokus verlassen, aber Stichwort nicht löschen - es bleibt in der Map gespeichert
                    lessonKeywordInputRef.current?.blur();
                    navFocusRef.current?.focus();
                  }
                }}
                onKeyDown={async (e) => { 
                  if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    if (!participationGroupId) return; 
                    const group = groups.find(g => g.id === participationGroupId); 
                    if (!group) return; 
                    setApplyingLessonKeyword(true);
                    try {
                      for (const student of group.students) {
                        const groupData = participations[participationGroupId] || {};
                        const lessonData = groupData[currentLessonIndex] || {};
                        const studentData = lessonData[student.id];
                        const existingComment = studentData && typeof studentData === 'object' ? (studentData.comment as string | undefined) : undefined;
                        // Nur Kommentar aktualisieren, wenn bereits einer existiert
                        if (existingComment) {
                        const updatedComment = injectLessonKeywordIntoComment(existingComment, lessonKeyword);
                          if (existingComment !== updatedComment) {
                          await fetch(`/api/participation/${participationGroupId}/${currentLessonIndex}/${student.id}/comment`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ comment: updatedComment })
                          });
                          }
                        }
                      }
                      setParticipations(prev => {
                        const copy = { ...prev } as any;
                        const groupData2 = copy[participationGroupId] || {};
                        const lessonData2 = { ...(groupData2[currentLessonIndex] || {}) };
                        for (const student of (groups.find(g => g.id === participationGroupId)?.students || [])) {
                          const sd = lessonData2[student.id] || { value: 0 };
                          const existingComment = sd.comment as (string | undefined);
                          // Nur Kommentar aktualisieren, wenn bereits einer existiert
                          const updatedComment = existingComment ? injectLessonKeywordIntoComment(existingComment, lessonKeyword) : undefined;
                          lessonData2[student.id] = { 
                            value: (sd as any).value ?? 0, 
                            ...(updatedComment ? { comment: updatedComment } : {})
                          };
                        }
                        copy[participationGroupId] = { ...groupData2, [currentLessonIndex]: lessonData2 };
                        return copy;
                      });
                      // persist per-lesson keyword in map und Datenbank
                      setLessonKeywordsMap(prev => ({
                        ...prev,
                        [participationGroupId]: {
                          ...(prev[participationGroupId] || {}),
                          [currentLessonIndex]: lessonKeyword
                        }
                      }));
                      // Speichere in Datenbank
                      if (participationGroupId) {
                        await saveLessonKeyword(participationGroupId, currentLessonIndex, lessonKeyword);
                      }
                    } catch (err) {
                      console.error('Fehler beim Anwenden des Stunden-Schlagworts:', err);
                    } finally {
                      setApplyingLessonKeyword(false);
                      // Fokus verlassen, aber Stichwort nicht löschen - es bleibt in der Map gespeichert
                      lessonKeywordInputRef.current?.blur();
                      navFocusRef.current?.focus();
                    }
                  } 
                }}
                size="small"
                variant="standard"
                sx={{ 
                  width: 140, 
                  '& .MuiInputBase-root': { 
                    fontSize: '0.7rem', 
                    color: 'text.secondary',
                    py: 0
                  },
                  '& .MuiInput-underline:before, & .MuiInput-underline:after': { borderBottom: 'none' },
                }}
              />
            </Box>
            <IconButton 
              size="small" 
              onClick={addLesson}
              sx={{ 
                p: 0,
                width: 20,
                height: 20,
                '& svg': {
                  width: '100%',
                  height: '100%'
                }
              }}
            >
              <ArrowForwardIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* Zeitraum-Übersicht */}
          {periodConfig.period1Hours || periodConfig.period2Hours ? (
            <Box sx={{ mb: 1.5, mt: 0.5 }}>
              {/* Zeitraum-Markierungen */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 0.3,
                mb: 0.5,
                px: 0.5,
                fontSize: '0.6rem',
                color: 'text.secondary'
              }}>
                {(() => {
                  // Berechne maximale Stundenzahl basierend auf vorhandenen Bewertungen
                  const maxLesson = participationGroupId ? 
                    Math.max(currentLessonIndex + 1, 
                      Object.keys(participations[participationGroupId] || {}).length > 0 ?
                        Math.max(...Object.keys(participations[participationGroupId] || {}).map(Number)) + 1 : 
                        currentLessonIndex + 1
                    ) : currentLessonIndex + 1;
                  
                  const totalLessons = Math.max(maxLesson, periodConfig.period1Hours ? periodConfig.period1Hours : 0, periodConfig.period2Hours ? (periodConfig.period1Hours || 0) + periodConfig.period2Hours : 0);
                  const period1Count = periodConfig.period1Hours ? Math.min(periodConfig.period1Hours, totalLessons) : 0;
                  const period2Count = periodConfig.period2Hours ? Math.min(periodConfig.period2Hours, totalLessons - period1Count) : 0;
                  
                  return (
                    <>
                      {period1Count > 0 && (
                        <Box sx={{ 
                          flex: period1Count,
                          textAlign: 'center',
                          color: '#1976D2',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          borderTop: '2px solid #1976D2',
                          pt: 0.3
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
                          fontSize: '0.65rem',
                          borderTop: '2px solid #F57C00',
                          pt: 0.3
                        }}>
                          Zeitraum 2
                        </Box>
                      )}
                    </>
                  );
                })()}
              </Box>
              
              {/* Stunden-Übersicht */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'flex-end',
                gap: 0.3,
                height: 40,
                px: 0.5,
                pb: 0.5,
                position: 'relative'
              }}>
                {(() => {
                  const maxLesson = participationGroupId ? 
                    Math.max(currentLessonIndex + 1, 
                      Object.keys(participations[participationGroupId] || {}).length > 0 ?
                        Math.max(...Object.keys(participations[participationGroupId] || {}).map(Number)) + 1 : 
                        currentLessonIndex + 1
                    ) : currentLessonIndex + 1;
                  
                  const totalLessons = Math.max(maxLesson, periodConfig.period1Hours ? periodConfig.period1Hours : 0, periodConfig.period2Hours ? (periodConfig.period1Hours || 0) + periodConfig.period2Hours : 0);
                  
                  return Array.from({ length: totalLessons }, (_, i) => {
                    const lessonIndex = i;
                    const isCurrentLesson = lessonIndex === currentLessonIndex;
                    
                    // Bestimme Zeitraum
                    let period = 0;
                    if (periodConfig.period1Hours && lessonIndex < periodConfig.period1Hours) {
                      period = 1;
                    } else if (periodConfig.period2Hours && periodConfig.period1Hours && lessonIndex < periodConfig.period1Hours + periodConfig.period2Hours) {
                      period = 2;
                    } else if (periodConfig.period2Hours && !periodConfig.period1Hours && lessonIndex < periodConfig.period2Hours) {
                      period = 2;
                    }
                    
                    const periodBorderColor = period === 1 ? '#1976D2' : period === 2 ? '#F57C00' : 'transparent';
                    const hasData = participationGroupId && participations[participationGroupId] && participations[participationGroupId][lessonIndex];
                    
                    // Berechne Durchschnittswert für diese Stunde
                    let avgValue = 0;
                    if (hasData && participationGroupId) {
                      const lessonData = participations[participationGroupId][lessonIndex];
                      const values = Object.values(lessonData).map((p: any) => p.value);
                      if (values.length > 0) {
                        avgValue = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
                      }
                    }
                    
                    // Normalisiere Wert zu Höhe
                    const height = avgValue === 2 ? 32 : 
                                   avgValue === 1 ? 24 : 
                                   avgValue === 0 ? 16 : 
                                   avgValue === -1 ? 12 : 8;
                    const width = Math.max(8, Math.min(24, 80 / totalLessons));
                    
                    const getValueColor = (value: number) => {
                      if (value === 2) return '#4CAF50'; // Grün = sehr gut
                      if (value === 1) return '#2196F3'; // Blau = gut
                      if (value === 0) return '#9E9E9E';
                      if (value === -1) return '#FFC107';
                      if (value === -2) return '#F44336';
                      return '#9E9E9E';
                    };
                    
                    // Prüfe ob dies der Start eines Zeitraums ist
                    const isPeriodStart = period > 0 && (lessonIndex === 0 || 
                      (periodConfig.period1Hours && lessonIndex === periodConfig.period1Hours));
                    const isPeriodEnd = period > 0 && (lessonIndex === totalLessons - 1 || 
                      (periodConfig.period1Hours && periodConfig.period2Hours && lessonIndex === periodConfig.period1Hours + periodConfig.period2Hours - 1));
                    
                    return (
                      <Box
                        key={lessonIndex}
                        onClick={() => {
                          setCurrentLessonIndex(lessonIndex);
                          if (participationGroupId) {
                            initializeNeutralParticipations(participationGroupId, lessonIndex);
                            loadParticipations(participationGroupId);
                          }
                        }}
                        sx={{
                          flex: 1,
                          minWidth: width,
                          height: `${height}px`,
                          bgcolor: hasData ? getValueColor(avgValue) : '#E0E0E0',
                          borderRadius: '2px 2px 0 0',
                          opacity: isCurrentLesson ? 1 : 0.6,
                          transition: 'all 0.2s',
                          position: 'relative',
                          cursor: 'pointer',
                          borderLeft: isPeriodStart ? `2px solid ${periodBorderColor}` : 'none',
                          borderRight: isPeriodEnd ? `2px solid ${periodBorderColor}` : 'none',
                          borderTop: periodBorderColor !== 'transparent' ? `1px solid ${periodBorderColor}` : 'none',
                          border: isCurrentLesson ? `2px solid #FF6B35` : 'none',
                          boxShadow: isCurrentLesson ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                          '&:hover': {
                            opacity: 1,
                            transform: 'scaleY(1.1)',
                            transformOrigin: 'bottom'
                          }
                        }}
                      >
                        {isCurrentLesson && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -18,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              color: '#FF6B35',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Aktuell
                          </Box>
                        )}
                      </Box>
                    );
                  });
                })()}
              </Box>
            </Box>
          ) : null}

          
           {/* Schüler-Kacheln */}
          {/* Schüler-Kacheln */}
          {participationGroupId && groups.find(g => g.id === participationGroupId)?.students && (() => {
            const students = groups.find(g => g.id === participationGroupId)!.students;
            
            // Sortiere Schüler nach Sitzordnung - exakt wie im Screenshot
            const getSeatingOrder = (fullName: string): number => {
              if (!fullName) return 999;
              const nameLower = fullName.toLowerCase().trim();
              
              // Exakte Reihenfolge basierend auf Screenshot (von oben nach unten, links nach rechts)
              // Reihe 1 (oben): 2 Schüler
              if (nameLower.includes('robin') && nameLower.includes('maas')) return 1;
              if (nameLower.includes('felix') && nameLower.includes('schmelzlin')) return 2;
              
              // Reihe 2: 6 Schüler
              if (nameLower.includes('luise') && nameLower.includes('habach')) return 3;
              if (nameLower.includes('louis') && nameLower.includes('gerharz')) return 4;
              if (nameLower.includes('jonathan') && nameLower.includes('dillmann')) return 5;
              if (nameLower.includes('jan') && nameLower.includes('wimmershoff')) return 6;
              if ((nameLower.includes('miró') || nameLower.includes('miro')) && nameLower.includes('mohr')) return 7;
              if ((nameLower.includes('killian') || nameLower.includes('kilian')) && nameLower.includes('jahnke')) return 8;
              
              // Reihe 3: 7 Schüler
              if (nameLower.includes('vincent') && nameLower.includes('schlag')) return 9;
              if (nameLower.includes('marlene') && nameLower.includes('geis')) return 10;
              if (nameLower.includes('adela') && (nameLower.includes('mureşan') || nameLower.includes('muresan'))) return 11;
              if (nameLower.includes('jakob') && nameLower.includes('ackermann')) return 12;
              if (nameLower.includes('nils') && (nameLower.includes('weiß') || nameLower.includes('weiss'))) return 13;
              if (nameLower.includes('paul') && nameLower.includes('pfeifer')) return 14;
              if (nameLower.includes('niklas') && nameLower.includes('schmitz')) return 15;
              
              // Reihe 4: 8 Schüler
              if (nameLower.includes('julia') && nameLower.includes('reiners')) return 16;
              if (nameLower.includes('jasmin') && nameLower.includes('farnung')) return 17;
              if (nameLower.includes('lennas') && nameLower.includes('weinem')) return 18;
              if (nameLower.includes('louisa') && nameLower.includes('plattes')) return 19;
              if (nameLower.includes('andreas') && nameLower.includes('thielen')) return 20;
              if (nameLower.includes('marlene') && nameLower.includes('krall')) return 21;
              if (nameLower.includes('friederike') && nameLower.includes('bremser')) return 22; // Ixi = Friederike
              if (nameLower.includes('dennis') && nameLower.includes('miller')) return 23;
              
              // Reihe 5: 8 Schüler
              if (nameLower.includes('fabio') && nameLower.includes('urso')) return 24;
              if (nameLower.includes('josefine') && nameLower.includes('baierl')) return 25;
              if (nameLower.includes('jonas') && nameLower.includes('maxeiner')) return 26;
              if (nameLower.includes('arthur') && nameLower.includes('potemkin')) return 27;
              if (nameLower.includes('samuel') && nameLower.includes('may')) return 28;
              if (nameLower.includes('hannah') && nameLower.includes('hagedorn')) return 29;
              if (nameLower.includes('bruno') && nameLower.includes('scavio')) return 30;
              if (nameLower.includes('freya') && nameLower.includes('zipper')) return 31;
              
              // Fallback: Versuche nur mit Vornamen (für Robustheit)
              const firstName = fullName.trim().split(/\s+/)[0].toLowerCase();
              const seatingOrderByFirstName: { [key: string]: number } = {
                'robin': 1,
                'felix': 2,
                'luise': 3,
                'louis': 4,
                'jonathan': 5,
                'jan': 6,
                'miró': 7,
                'miro': 7,
                'killian': 8,
                'vincent': 9,
                'adela': 11,
                'jakob': 12,
                'nils': 13,
                'paul': 14,
                'niklas': 15,
                'julia': 16,
                'jasmin': 17,
                'lennas': 18,
                'louisa': 19,
                'andreas': 20,
                'dennis': 23,
                'fabio': 24,
                'josefine': 25,
                'jonas': 26,
                'arthur': 27,
                'samuel': 28,
                'hannah': 29,
                'bruno': 30,
                'freya': 31,
                'friederike': 22 // Ixi = Friederike
              };
              
              // Spezielle Behandlung für Marlene (G. vs K.)
              if (firstName === 'marlene') {
                if (nameLower.includes('geis')) return 10;
                if (nameLower.includes('krall')) return 21;
              }
              
              return seatingOrderByFirstName[firstName] || 999;
            };
            
            // Verwende benutzerdefinierte Sitzordnung falls vorhanden
            const customOrder = customSeatingOrder[participationGroupId || ''];
            let sortedStudents: typeof students;
            
            console.log('🔍 Sitzordnung-Check für Gruppe:', participationGroupId);
            console.log('🔍 customOrder vorhanden:', !!customOrder);
            console.log('🔍 customOrder length:', customOrder?.length);
            if (customOrder && Array.isArray(customOrder)) {
              const filledSlots = customOrder.filter(id => id !== null).length;
              const emptySlots = customOrder.filter(id => id === null).length;
              console.log(`🔍 Slot-Verteilung: ${filledSlots} belegt, ${emptySlots} leer (von ${customOrder.length} Slots)`);
            }
            console.log('🔍 students length:', students.length);
            
            // Wenn keine benutzerdefinierte Sitzordnung vorhanden ist, erstelle eine basierend auf Standard-Sortierung
            // WICHTIG: Ein 40-Element-Array (auch mit vielen nulls) ist eine gültige Sortierung!
            const hasValidOrder = customOrder && Array.isArray(customOrder) && (
              customOrder.length === 40 || // Neues Format: 40-Element-Array
              (customOrder.length > 0 && customOrder.length < 40) // Altes Format: kompakte Liste
            );
            
            if (!hasValidOrder) {
              console.log('📋 Erstelle Standard-Sitzordnung basierend auf getSeatingOrder');
              // Sortiere Schüler nach Standard-Sitzordnung
              const standardSorted = [...students].sort((a, b) => {
                const orderA = getSeatingOrder(a.name);
                const orderB = getSeatingOrder(b.name);
                
                if (orderA !== 999 && orderB !== 999) {
                  return orderA - orderB;
                }
                
                if (orderA !== 999) return -1;
                if (orderB !== 999) return 1;
                
                // Beide nicht in Sitzordnung: alphabetisch nach Nachname
                const getLastName = (name: string) => {
                  const parts = name.trim().split(/\s+/);
                  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
                };
                const lastNameA = getLastName(a.name).toLowerCase();
                const lastNameB = getLastName(b.name).toLowerCase();
                return lastNameA.localeCompare(lastNameB, 'de');
              });
              
              // Erstelle Standard-Reihenfolge aus sortierten Schülern
              const standardOrder = standardSorted.map(s => s.id);
              console.log('📋 Standard-Reihenfolge erstellt:', standardOrder.length, 'Schüler');
              
              // Setze diese als benutzerdefinierte Sitzordnung (wird beim ersten Speichern persistiert)
              setCustomSeatingOrder(prev => ({
                ...prev,
                [participationGroupId || '']: standardOrder
              }));
              
              sortedStudents = standardSorted;
            } else if (customOrder && Array.isArray(customOrder) && customOrder.length > 0) {
              // Sortiere nach benutzerdefinierter Reihenfolge
              // WICHTIG: Wenn es ein 40-Element-Array ist (neues Format), verwende es direkt
              // Ansonsten behandle es als kompakte Liste (altes Format)
              const isSlotBased = customOrder.length === 40;
              
              const orderMap = new Map(customOrder.map((id, index) => [id, index]));
              
              // Stelle sicher, dass alle Schüler in der Reihenfolge sind
              // Füge fehlende Schüler am Ende hinzu
              const allStudentIds = new Set(students.map(s => s.id));
              const orderedStudentIds = customOrder.filter((id): id is string => id !== null && allStudentIds.has(id));
              const missingStudentIds = students
                .map(s => s.id)
                .filter(id => !customOrder.includes(id));
              
              const finalOrder = [...orderedStudentIds, ...missingStudentIds];
              
              if (isSlotBased) {
                console.log(`✅ Verwende gespeicherte Slot-basierte Reihenfolge (40 Slots, ${orderedStudentIds.length} belegt)`);
              } else {
                console.log('✅ Verwende benutzerdefinierte Reihenfolge (kompakte Liste)');
              }
              
              console.log('✅ Verwende benutzerdefinierte Reihenfolge');
              console.log('✅ Ordered:', orderedStudentIds.length, 'Missing:', missingStudentIds.length);
              
              sortedStudents = [...students].sort((a, b) => {
                const orderA = finalOrder.indexOf(a.id);
                const orderB = finalOrder.indexOf(b.id);
                // Wenn beide nicht gefunden, behalte ursprüngliche Reihenfolge
                if (orderA === -1 && orderB === -1) return 0;
                if (orderA === -1) return 1; // a kommt ans Ende
                if (orderB === -1) return -1; // b kommt ans Ende
                return orderA - orderB;
              });
            } else {
              // Standard-Sortierung nach Sitzordnung
              sortedStudents = [...students].sort((a, b) => {
                const orderA = getSeatingOrder(a.name);
                const orderB = getSeatingOrder(b.name);
                
                if (orderA !== 999 && orderB !== 999) {
                  return orderA - orderB;
                }
                
                if (orderA !== 999) return -1;
                if (orderB !== 999) return 1;
                
                // Beide nicht in Sitzordnung: alphabetisch nach Nachname
                const getLastName = (name: string) => {
                  const parts = name.trim().split(/\s+/);
                  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
                };
                const lastNameA = getLastName(a.name).toLowerCase();
                const lastNameB = getLastName(b.name).toLowerCase();
                return lastNameA.localeCompare(lastNameB, 'de');
              });
            }
            
            // Grid-System: 4x5 Kacheln (4 Spalten, 5 Zeilen)
            const gridCols = 4;
            const gridRows = 5;
            
            // Erstelle Map: studentId → Student für schnellen Zugriff
            const studentMap = new Map<string, typeof sortedStudents[0]>();
            sortedStudents.forEach(s => studentMap.set(s.id, s));
            
            // NEUE LÖSUNG: Hole Slot-Zuordnung DIREKT als Array von 40 Elementen
            // KRITISCH: null = leerer Slot, studentId = belegter Slot
            const currentOrderRaw = customSeatingOrder[participationGroupId || ''] || [];
            const currentDeskPositions = deskPositions[participationGroupId || ''] || [];
            
            // Prüfe ob currentOrder ein Array von 40 Elementen ist (neue Format) oder eine Liste (altes Format)
            const isSlotBasedOrder = Array.isArray(currentOrderRaw) && currentOrderRaw.length === 40;
            
            // Erstelle Slot-basierte Map: slotIndex (0-39) → studentId
            const slotToStudentMap = new Map<number, string>();
            
            if (isSlotBasedOrder) {
              // NEUE LÖSUNG: Direktes Slot-basiertes Array
              currentOrderRaw.forEach((studentId, slotIndex) => {
                if (studentId !== null && studentId !== undefined) {
                  slotToStudentMap.set(slotIndex, studentId);
                }
              });
              console.log(`✅ NEUE LÖSUNG: Slot-basierte Reihenfolge geladen (${slotToStudentMap.size} belegte Slots)`);
            } else {
              // ALTE LÖSUNG: Kompatibilität mit alter sequenzieller Liste
              const currentOrder = Array.isArray(currentOrderRaw) ? currentOrderRaw : sortedStudents.map(s => s.id);
              
              if (currentDeskPositions.length > 0 && currentOrder.length > 0) {
                const sortedDeskPositions = [...currentDeskPositions].sort((a, b) => {
                  const posA = a.gridRow * gridCols + a.gridCol;
                  const posB = b.gridRow * gridCols + b.gridCol;
                  return posA - posB;
                });
                
                const gridPosToDeskPos = new Map<string, typeof sortedDeskPositions[0]>();
                sortedDeskPositions.forEach(deskPos => {
                  const gridKey = `${deskPos.gridRow}-${deskPos.gridCol}`;
                  gridPosToDeskPos.set(gridKey, deskPos);
                });
                
                let orderIndex = 0;
                for (let gridRow = 0; gridRow < gridRows; gridRow++) {
                  for (let gridCol = 0; gridCol < gridCols; gridCol++) {
                    const gridKey = `${gridRow}-${gridCol}`;
                    const deskPos = gridPosToDeskPos.get(gridKey);
                    
                    if (deskPos) {
                      const slot0Num = (gridRow * gridCols + gridCol) * 2;
                      const slot1Num = slot0Num + 1;
                      
                      if (orderIndex < currentOrder.length && currentOrder[orderIndex] !== null) {
                        slotToStudentMap.set(slot0Num, currentOrder[orderIndex]!);
                        orderIndex++;
                      }
                      if (orderIndex < currentOrder.length && currentOrder[orderIndex] !== null) {
                        slotToStudentMap.set(slot1Num, currentOrder[orderIndex]!);
                        orderIndex++;
                      }
                    }
                  }
                }
                
                // DEBUG: Zeige Slot-Zuordnung
                console.log(`\n🔍 SLOT-ZUORDNUNG ERSTELLT:`);
                console.log(`   - Anzahl Desk-Positionen: ${sortedDeskPositions.length}`);
                console.log(`   - Anzahl Schüler in Reihenfolge: ${currentOrder.length}`);
                console.log(`   - Anzahl Slots zugeordnet: ${slotToStudentMap.size}`);
                
                // Zeige letzte 5 Slots
                const lastSlots: string[] = [];
                for (let slot = 35; slot < 40; slot++) {
                  const studentId = slotToStudentMap.get(slot);
                  if (studentId) {
                    const studentName = studentMap.get(studentId)?.name || studentId;
                    lastSlots.push(`Slot ${slot + 1}: ${studentName}`);
                  } else {
                    lastSlots.push(`Slot ${slot + 1}: <LEER>`);
                  }
                }
                console.log(`   - Letzte 5 Slots: ${lastSlots.join(', ')}`);
              } else {
                // Fallback: Erstelle Slot-Zuordnung sequenziell (für initiales Setup)
                currentOrder.forEach((studentId, index) => {
                  if (index < 40 && studentId !== null) {
                    slotToStudentMap.set(index, studentId);
                  }
                });
              }
            }
            
            // Erstelle Desk-Struktur DIREKT aus Slot-Positionen
            // Erstelle Map: deskId → Array von Schülern (max 2)
            const deskToStudentsMap = new Map<number, Array<typeof sortedStudents[0]>>();
            
            // Initialisiere alle Desks als leere Arrays
            if (currentDeskPositions.length > 0) {
              currentDeskPositions.forEach(pos => {
                if (!deskToStudentsMap.has(pos.deskId)) {
                  deskToStudentsMap.set(pos.deskId, []);
                }
              });
            }
            
            // Fülle Desks basierend auf Slot-Zuordnung
            slotToStudentMap.forEach((studentId, slotIndex) => {
              // Berechne Grid-Position aus Slot-Index
              const gridCellIndex = Math.floor(slotIndex / 2);
              const gridRow = Math.floor(gridCellIndex / gridCols);
              const gridCol = gridCellIndex % gridCols;
              const slotInCell = slotIndex % 2;
              
              // Finde Desk für diese Grid-Position
              const deskPos = currentDeskPositions.find(p => p.gridRow === gridRow && p.gridCol === gridCol);
              if (deskPos && studentMap.has(studentId)) {
                const desk = deskToStudentsMap.get(deskPos.deskId) || [];
                desk[slotInCell] = studentMap.get(studentId)!;
                deskToStudentsMap.set(deskPos.deskId, desk);
              }
            });
            
            // Konvertiere Desk-Map zu Array für Rendering
            const desks: Array<Array<typeof sortedStudents[0]>> = [];
            const maxDeskId = currentDeskPositions.length > 0 
              ? Math.max(...currentDeskPositions.map(p => p.deskId), -1)
              : -1;
            
            for (let i = 0; i <= maxDeskId; i++) {
              desks[i] = deskToStudentsMap.get(i) || [];
            }
            
            // Erstelle orderedStudents für Debugging (aus Slot-Zuordnung, sortiert nach Slot-Nummer)
            const orderedStudents: Array<typeof sortedStudents[0]> = [];
            for (let slot = 0; slot < 40; slot++) {
              const studentId = slotToStudentMap.get(slot);
              if (studentId && studentMap.has(studentId)) {
                orderedStudents.push(studentMap.get(studentId)!);
              }
            }
            
            // Initialisiere Tisch-Positionen falls noch nicht vorhanden
            
            // Standard-Grid-Positionen basierend auf Screenshot (mit Zeilenumbrüchen)
            // Reihe 1: 1 Tisch (2 Schüler) - Positionen 0,0
            // Reihe 2: 3 Tische (6 Schüler) - Positionen 1,0; 1,1; 1,2
            // Reihe 3: 4 Tische (7 Schüler, letzter Tisch hat nur 1) - Positionen 2,0; 2,1; 2,2; 2,3
            // Reihe 4: 4 Tische (8 Schüler) - Positionen 3,0; 3,1; 3,2; 3,3
            // Reihe 5: 4 Tische (8 Schüler) - Positionen 4,0; 4,1; 4,2; 4,3
            const getDefaultGridPosition = (deskIndex: number): { gridRow: number; gridCol: number } => {
              // Basierend auf der Reihenfolge im Screenshot
              if (deskIndex === 0) return { gridRow: 0, gridCol: 0 }; // Robin, Felix
              
              if (deskIndex >= 1 && deskIndex <= 3) {
                // Reihe 2: Luise+Louis, Jonathan+Jan, Miró+Killian
                return { gridRow: 1, gridCol: deskIndex - 1 };
              }
              
              if (deskIndex >= 4 && deskIndex <= 7) {
                // Reihe 3: Vincent+Marlene G., Adela+Jakob, Nils+Paul, Niklas (allein)
                return { gridRow: 2, gridCol: deskIndex - 4 };
              }
              
              if (deskIndex >= 8 && deskIndex <= 11) {
                // Reihe 4: Julia+Jasmin, Lennas+Louisa, Andreas+Marlene K., Friederike+Dennis
                return { gridRow: 3, gridCol: deskIndex - 8 };
              }
              
              if (deskIndex >= 12 && deskIndex <= 15) {
                // Reihe 5: Fabio+Josefine, Jonas+Arthur, Samuel+Hannah, Bruno+Freya
                return { gridRow: 4, gridCol: deskIndex - 12 };
              }
              
              // Fallback für weitere Tische
              return {
                gridRow: Math.floor(deskIndex / gridCols),
                gridCol: deskIndex % gridCols
              };
            };
            
            // Verwende initialisierte Positionen oder berechne sie neu basierend auf Standard-Layout
            let finalDeskPositions = currentDeskPositions.length > 0 
              ? currentDeskPositions 
              : (() => {
                  // Erstelle Standard-Positionen für alle Slots
                  const positions: Array<{deskId: number; gridRow: number; gridCol: number}> = [];
                  for (let slot = 0; slot < 40 && slot < orderedStudents.length; slot++) {
                    const gridCellIndex = Math.floor(slot / 2);
                    const gridRow = Math.floor(gridCellIndex / gridCols);
                    const gridCol = gridCellIndex % gridCols;
                    const deskId = Math.floor(slot / 2);
                    
                    // Prüfe ob diese Position bereits existiert
                    const existingPos = positions.find(p => p.gridRow === gridRow && p.gridCol === gridCol);
                    if (!existingPos) {
                      positions.push({ deskId, gridRow, gridCol });
                    }
                  }
                  return positions;
                })();
            
            // BEREINIGE DUPLIKATE: Entferne Tische mit doppelten Grid-Positionen
            const positionMap = new Map<string, number>();
            const cleanedPositions: Array<{deskId: number; gridRow: number; gridCol: number}> = [];
            const duplicateDeskIds: number[] = [];
            
            finalDeskPositions.forEach(pos => {
              const key = `${pos.gridRow}-${pos.gridCol}`;
              if (positionMap.has(key)) {
                // Duplikat gefunden - markiere zum Entfernen
                duplicateDeskIds.push(pos.deskId);
                console.warn(`⚠️ DUPLIKAT entfernt: Desk ${pos.deskId} an Position ${key} (bereits belegt von Desk ${positionMap.get(key)})`);
              } else {
                positionMap.set(key, pos.deskId);
                cleanedPositions.push(pos);
              }
            });
            
            // Wenn Duplikate gefunden wurden, finde freie Positionen für sie
            if (duplicateDeskIds.length > 0) {
              duplicateDeskIds.forEach(deskId => {
                // Finde nächste freie Position
                for (let row = 0; row < gridRows; row++) {
                  for (let col = 0; col < gridCols; col++) {
                    const key = `${row}-${col}`;
                    if (!positionMap.has(key)) {
                      positionMap.set(key, deskId);
                      cleanedPositions.push({ deskId, gridRow: row, gridCol: col });
                      console.log(`✅ Desk ${deskId} verschoben zu Position ${key}`);
                      return;
                    }
                  }
                }
              });
              
              // Aktualisiere finalDeskPositions
              finalDeskPositions = cleanedPositions;
              
              // Speichere bereinigte Positionen
              setDeskPositions(prev => ({
                ...prev,
                [participationGroupId || '']: finalDeskPositions
              }));
            }
            
            // Initialisiere State falls noch nicht vorhanden
            if (currentDeskPositions.length === 0 && desks.length > 0) {
              setDeskPositions(prev => ({
                ...prev,
                [participationGroupId || '']: finalDeskPositions
              }));
            }
            
            // Erstelle Grid-Map: Welcher Tisch ist in welcher Zelle?
            // Nach der Bereinigung sollten keine Duplikate mehr vorhanden sein
            const gridMap: {[key: string]: number} = {};
            finalDeskPositions.forEach(pos => {
              const key = `${pos.gridRow}-${pos.gridCol}`;
              if (gridMap[key] !== undefined) {
                console.error(`❌ FEHLER: Position ${key} wird immer noch mehrfach verwendet!`);
              }
              gridMap[key] = pos.deskId;
            });
            
            // Erstelle Map: deskId → Grid-Position für schnellen Zugriff
            const deskToGridPosMap: {[deskId: number]: {row: number, col: number}} = {};
            finalDeskPositions.forEach(pos => {
              deskToGridPosMap[pos.deskId] = { row: pos.gridRow, col: pos.gridCol };
            });
            
            // WICHTIG: Erstelle gridToDeskMap DIREKT aus finalDeskPositions UND slotToStudentMap
            // Diese Map wird sowohl von der UI als auch von der Debug-Funktion verwendet
            // WICHTIG: Verwende finalDeskPositions (bereinigt), nicht currentDeskPositions
            const gridToDeskMap: {[key: string]: {deskId: number, desk: Array<typeof sortedStudents[0]>}} = {};
            finalDeskPositions.forEach(pos => {
              const gridKey = `${pos.gridRow}-${pos.gridCol}`;
              const desk: Array<typeof sortedStudents[0]> = [];
              
              // Hole Schüler für diese Grid-Position aus slotToStudentMap
              const slot0Num = (pos.gridRow * gridCols + pos.gridCol) * 2;
              const slot1Num = slot0Num + 1;
              
              const student0Id = slotToStudentMap.get(slot0Num);
              const student1Id = slotToStudentMap.get(slot1Num);
              
              if (student0Id && studentMap.has(student0Id)) {
                desk[0] = studentMap.get(student0Id)!;
              }
              if (student1Id && studentMap.has(student1Id)) {
                desk[1] = studentMap.get(student1Id)!;
              }
              
              gridToDeskMap[gridKey] = {
                deskId: pos.deskId,
                desk: desk
              };
            });
            
            // DEBUG: Zeige welche Grid-Positionen Desk-Positionen haben
            console.log(`\n🔍 GRID-zu-DESK-MAP ERSTELLT:`);
            console.log(`   - Anzahl Desk-Positionen: ${finalDeskPositions.length}`);
            console.log(`   - Anzahl Grid-Einträge in Map: ${Object.keys(gridToDeskMap).length}`);
            Object.keys(gridToDeskMap).sort().forEach(gridKey => {
              const { deskId, desk } = gridToDeskMap[gridKey];
              const [row, col] = gridKey.split('-').map(Number);
              const slot0 = desk[0] ? desk[0].name : '<LEER>';
              const slot1 = desk[1] ? desk[1].name : '<LEER>';
              console.log(`   Grid ${gridKey} (R${row+1}, C${col+1}): Desk ${deskId}, Slot0=${slot0}, Slot1=${slot1}`);
            });
            
            // Funktion zur Berechnung der globalen Slot-Nummer (zeilenweise, beginnt bei 1)
            // WICHTIG: Immer Grid-Position verwenden, nicht deskId!
            const getGlobalSlotNumber = (slotIndex: number, gridRow: number, gridCol: number): number => {
              // Zeilenweise Nummerierung: (row * gridCols + col) * 2 + slotIndex + 1
              // Jede Grid-Zelle hat 2 Slots, nummeriert von oben links nach unten rechts
              return (gridRow * gridCols + gridCol) * 2 + slotIndex + 1;
            };
            
            // Debug: Zeige aktuelle Verteilung
            const uniqueStudentIds = new Set(orderedStudents.map(s => s.id));
            console.log(`\n📊 AKTUELLE SCHÜLER-VERTEILUNG:`);
            console.log(`   - Anzahl Schüler: ${orderedStudents.length}`);
            console.log(`   - Anzahl Tische: ${desks.length}`);
            console.log(`   - Reihenfolge: ${orderedStudents.map(s => s.name).join(', ')}`);
            console.log(`   - Duplikate geprüft: ${uniqueStudentIds.size === orderedStudents.length ? 'OK' : 'FEHLER!'}`);
            
            // Debug: Zeige Grid-zu-Desk-Zuordnung
            console.log(`\n📋 GRID-zu-DESK-ZUORDNUNG:`);
            Object.keys(gridToDeskMap).sort().forEach(gridKey => {
              const { deskId, desk } = gridToDeskMap[gridKey];
              const [row, col] = gridKey.split('-').map(Number);
              const slot0 = desk[0] ? desk[0].name : '<LEER>';
              const slot1 = desk[1] ? desk[1].name : '<LEER>';
              const slot0Num = getGlobalSlotNumber(0, row, col);
              const slot1Num = getGlobalSlotNumber(1, row, col);
              console.log(`   Grid R${row+1}, C${col+1} (Desk ${deskId}): Slot ${slot0Num} = ${slot0}, Slot ${slot1Num} = ${slot1}`);
            });
            console.log(`\n`);
            
            // DEBUG-FUNKTION: Zeige aktuelle Slot-Verteilung im Modal "Epochal eintragen"
            // WICHTIG: Diese Funktion muss EXAKT die gleiche Logik verwenden wie die UI-Render-Logik
            const debugParticipationSlots = () => {
              console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
              console.log('EPOCHAL EINTRAGEN: Klasse 7a - GRID-AUFTEILUNG (4 Spalten × 5 Zeilen, 2 Slots pro Zelle)');
              console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');
              
              // Erstelle Grid-Tabelle basierend auf gridToDeskMap (GLEICHE LOGIK WIE UI)
              const gridTable: Array<Array<{gridRow: number, gridCol: number, slot0: {number: number, student: string} | null, slot1: {number: number, student: string} | null}>> = [];
              
              // Initialisiere Grid-Tabelle mit leeren Slots
              for (let row = 0; row < gridRows; row++) {
                const rowData = [];
                for (let col = 0; col < gridCols; col++) {
                  const slot0Number = getGlobalSlotNumber(0, row, col);
                  const slot1Number = getGlobalSlotNumber(1, row, col);
                  rowData.push({
                    gridRow: row + 1,
                    gridCol: col + 1,
                    slot0: null,
                    slot1: null
                  });
                }
                gridTable.push(rowData);
              }
              
              // Fülle Grid-Tabelle mit Schülern basierend auf gridToDeskMap (GLEICHE LOGIK WIE UI)
              Object.keys(gridToDeskMap).forEach(gridKey => {
                const { deskId, desk } = gridToDeskMap[gridKey];
                const [row, col] = gridKey.split('-').map(Number);
                if (row < gridRows && col < gridCols) {
                  const slot0Number = getGlobalSlotNumber(0, row, col);
                  const slot1Number = getGlobalSlotNumber(1, row, col);
                  gridTable[row][col] = {
                    gridRow: row + 1,
                    gridCol: col + 1,
                    slot0: desk[0] ? { number: slot0Number, student: desk[0].name } : null,
                    slot1: desk[1] ? { number: slot1Number, student: desk[1].name } : null
                  };
                }
              });
              
              // Zeige Grid-Tabelle
              console.log('GRID-ZELLE | SPALTE 1                    | SPALTE 2                    | SPALTE 3                    | SPALTE 4');
              console.log('───────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────');
              
              gridTable.forEach((row, rowIndex) => {
                const rowNum = String(rowIndex + 1).padStart(2, ' ');
                const cells = row.map(cell => {
                  const slot0Str = cell.slot0 ? `Slot ${cell.slot0.number}: ${cell.slot0.student.substring(0, 20)}` : `Slot ${getGlobalSlotNumber(0, rowIndex, cell.gridCol - 1)}: <LEER>`;
                  const slot1Str = cell.slot1 ? `Slot ${cell.slot1.number}: ${cell.slot1.student.substring(0, 20)}` : `Slot ${getGlobalSlotNumber(1, rowIndex, cell.gridCol - 1)}: <LEER>`;
                  return `${slot0Str.padEnd(27)}\n${' '.repeat(12)}${slot1Str.padEnd(27)}`;
                });
                
                console.log(`Reihe ${rowNum}   | ${cells[0]}`);
                console.log(`           | ${cells[1]}`);
                console.log(`           | ${cells[2]}`);
                console.log(`           | ${cells[3]}`);
                console.log('───────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────');
              });
              
              console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
              console.log('DETAILLIERTE SLOT-LISTE (zeilenweise, beginnt bei 1):');
              console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');
              
              // Zeige detaillierte Slot-Liste basierend auf gridToDeskMap (GLEICHE LOGIK WIE UI)
              // Sortiere nach Slot-Nummer für bessere Lesbarkeit
              const slotList: Array<{slot: number, gridRow: number, gridCol: number, slotIndex: number, deskId: number, student: string | null}> = [];
              
              Object.keys(gridToDeskMap).forEach(gridKey => {
                const { deskId, desk } = gridToDeskMap[gridKey];
                const [row, col] = gridKey.split('-').map(Number);
                desk.forEach((student, slotIndex) => {
                  const slotNumber = getGlobalSlotNumber(slotIndex, row, col);
                  slotList.push({
                    slot: slotNumber,
                    gridRow: row + 1,
                    gridCol: col + 1,
                    slotIndex,
                    deskId,
                    student: student ? formatStudentName(student.name) : null
                  });
                });
                // Füge auch leere Slots hinzu
                if (desk.length < 2) {
                  const slotNumber = getGlobalSlotNumber(1, row, col);
                  slotList.push({
                    slot: slotNumber,
                    gridRow: row + 1,
                    gridCol: col + 1,
                    slotIndex: 1,
                    deskId,
                    student: null
                  });
                }
              });
              
              // Sortiere nach Slot-Nummer
              slotList.sort((a, b) => a.slot - b.slot);
              
              // Zeige alle Slots
              slotList.forEach(item => {
                const studentStr = item.student || '<LEER>';
                console.log(`Slot ${String(item.slot).padStart(3, ' ')} (Grid R${item.gridRow}, C${item.gridCol}, Slot ${item.slotIndex}, Desk ${item.deskId}): ${studentStr}`);
              });
              
              console.log('\n═══════════════════════════════════════════════════════════════════════════════════════\n');
            };
            
            // ROBUSTE Drag & Drop Handler für Schüler - NEU IMPLEMENTIERT
            const handleStudentDragStart = (e: React.DragEvent, studentId: string, sourceDeskId?: number, sourceSlotIndex?: number) => {
              setDraggedStudentId(studentId);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', studentId);
              e.dataTransfer.setData('application/student-id', studentId);
              e.dataTransfer.setData('drag-type', 'student');
              // Debug: Speichere Quelle
              if (sourceDeskId !== undefined && sourceSlotIndex !== undefined) {
                e.dataTransfer.setData('source-desk-id', String(sourceDeskId));
                e.dataTransfer.setData('source-slot-index', String(sourceSlotIndex));
                // Finde Grid-Position der Quelle
                const sourceGridPos = deskToGridPosMap[sourceDeskId];
                if (sourceGridPos) {
                  const globalSlot = getGlobalSlotNumber(sourceSlotIndex, sourceGridPos.row, sourceGridPos.col);
                  const studentName = sortedStudents.find(s => s.id === studentId)?.name || studentId;
                  console.log(`\n🔄 DRAG START: SuS ${studentName} wird von Slot ${globalSlot} (Grid R${sourceGridPos.row + 1}, C${sourceGridPos.col + 1}, Slot ${sourceSlotIndex}) gezogen\n`);
                }
              }
              // Verhindere dass andere Drag-Events ausgelöst werden
              e.stopPropagation();
            };

            // Universeller DragOver Handler für alle Drop-Zonen
            const handleStudentDragOver = (e: React.DragEvent) => {
              // Prüfe ob es ein Schüler-Drag ist
              const isStudentDrag = e.dataTransfer.types.includes('text/plain') || 
                                   e.dataTransfer.types.includes('application/student-id') ||
                                   draggedStudentId !== null;
              
              if (isStudentDrag) {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              }
            };

            // ROBUSTER Drop Handler - NEU IMPLEMENTIERT MIT VOLLSTÄNDIGEM DEBUGGING
            const handleStudentDrop = (
              e: React.DragEvent, 
              targetSlotIndex: number,
              targetDeskId: number | undefined,
              targetGridRow: number | undefined, 
              targetGridCol: number | undefined
            ) => {
              e.preventDefault();
              e.stopPropagation();
              
              console.log(`\n${'═'.repeat(100)}`);
              console.log(`🔄 DRAG & DROP START - ROBUSTE IMPLEMENTIERUNG`);
              console.log(`${'═'.repeat(100)}\n`);
              
              // Hole studentId
              let studentId = draggedStudentId;
              if (!studentId) {
                studentId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/student-id');
              }
              
              if (!studentId || !participationGroupId) {
                console.error('❌ FEHLER: Keine gültige studentId oder participationGroupId');
                setDraggedStudentId(null);
                setDropTarget(null);
                return;
              }

              // Hole aktuelle Reihenfolge (OHNE Duplikate)
              const currentOrder = customSeatingOrder[participationGroupId] || sortedStudents.map(s => s.id);
              
              // Entferne Duplikate aus currentOrder (filtere auch nulls heraus)
              const uniqueOrder: string[] = [];
              const seenOrderIds = new Set<string>();
              currentOrder.forEach(id => {
                if (id !== null && !seenOrderIds.has(id)) {
                  uniqueOrder.push(id);
                  seenOrderIds.add(id);
                }
              });
              
              console.log(`📋 AKTUELLE REIHENFOLGE:`);
              console.log(`   - Anzahl Schüler: ${uniqueOrder.length}`);
              console.log(`   - Reihenfolge: ${uniqueOrder.map(id => studentMap.get(id)?.name || id).join(', ')}`);
              
              // Finde aktuelle Position des gezogenen Schülers
              const sourceIndex = uniqueOrder.indexOf(studentId);
              if (sourceIndex === -1) {
                console.error(`❌ FEHLER: Schüler ${studentId} nicht in Reihenfolge gefunden!`);
                console.log(`   Verfügbare IDs: ${uniqueOrder.slice(0, 5).join(', ')}...`);
                setDraggedStudentId(null);
                setDropTarget(null);
                return;
              }

              // Bestimme Grid-Position des Ziels
              let finalGridRow: number;
              let finalGridCol: number;
              
              if (targetDeskId !== undefined) {
                // Hole Grid-Position aus deskToGridPosMap
                const gridPos = deskToGridPosMap[targetDeskId];
                if (!gridPos) {
                  console.error(`❌ FEHLER: Grid-Position für Desk ${targetDeskId} nicht gefunden!`);
                  setDraggedStudentId(null);
                  setDropTarget(null);
                  return;
                }
                finalGridRow = gridPos.row;
                finalGridCol = gridPos.col;
                console.log(`   - Ziel via Desk ${targetDeskId}: Grid R${finalGridRow + 1}, C${finalGridCol + 1}`);
              } else if (targetGridRow !== undefined && targetGridCol !== undefined) {
                finalGridRow = targetGridRow;
                finalGridCol = targetGridCol;
                console.log(`   - Ziel via Grid: R${finalGridRow + 1}, C${finalGridCol + 1}`);
              } else {
                console.error('❌ FEHLER: Keine gültige Grid-Position');
                setDraggedStudentId(null);
                setDropTarget(null);
                return;
              }

              // WICHTIG: Berechne Ziel-Position DIREKT aus Grid-Position (erlaubt Lücken!)
              // Formel: (row * gridCols + col) * 2 + slotIndex
              // Dies gibt uns die absolute Slot-Position (1-40), unabhängig von der aktuellen Reihenfolge
              const targetGlobalSlot = getGlobalSlotNumber(targetSlotIndex, finalGridRow, finalGridCol);
              const targetIndexInSlots = targetGlobalSlot - 1; // 0-basiert für Array-Index
              
              // Hole Quelle-Informationen für Debugging
              const sourceDeskId = e.dataTransfer.getData('source-desk-id');
              const sourceSlotIndex = e.dataTransfer.getData('source-slot-index');
              let sourceGridPos = null;
              let sourceGlobalSlot = -1;
              
              if (sourceDeskId && sourceSlotIndex) {
                sourceGridPos = deskToGridPosMap[parseInt(sourceDeskId)];
                if (sourceGridPos) {
                  sourceGlobalSlot = getGlobalSlotNumber(parseInt(sourceSlotIndex), sourceGridPos.row, sourceGridPos.col);
                }
              }
              
              // Fallback: Berechne aus sourceIndex
              if (sourceGlobalSlot === -1 && sourceIndex !== -1) {
                const sourceDeskIndex = Math.floor(sourceIndex / 2);
                const sourceSlotInDesk = sourceIndex % 2;
                const sourceDeskPos = finalDeskPositions.find(p => p.deskId === sourceDeskIndex);
                if (sourceDeskPos) {
                  sourceGridPos = { row: sourceDeskPos.gridRow, col: sourceDeskPos.gridCol };
                  sourceGlobalSlot = getGlobalSlotNumber(sourceSlotInDesk, sourceDeskPos.gridRow, sourceDeskPos.gridCol);
                }
              }
              
              // NEUE LOGIK: Slot-basierte Zuordnung (erlaubt Lücken!)
              // KRITISCH: Slots bleiben LEER wenn ein Schüler entfernt wird - KEINE Komprimierung!
              // Erstelle ein Array mit 40 Slots (kann null sein für leere Slots)
              // WICHTIG: Prüfe ob currentOrder bereits ein 40-Element-Array ist (neues Format)
              const isCurrentOrderSlotBased = Array.isArray(currentOrder) && currentOrder.length === 40;
              
              let slotBasedOrder: Array<string | null>;
              
              if (isCurrentOrderSlotBased) {
                // NEUE LÖSUNG: Verwende currentOrder direkt - es ist bereits ein 40-Element-Array mit nulls für leere Slots
                slotBasedOrder = [...currentOrder]; // Kopiere das Array
                console.log(`✅ Verwende bestehende Slot-basierte Reihenfolge (40 Elemente)`);
              } else {
                // ALTE LÖSUNG: Erstelle Slot-basierte Reihenfolge aus uniqueOrder (kompakte Liste)
                slotBasedOrder = new Array(40).fill(null);
                
                const sortedDeskPositionsForDrop = [...finalDeskPositions].sort((a, b) => {
                  const posA = a.gridRow * gridCols + a.gridCol;
                  const posB = b.gridRow * gridCols + b.gridCol;
                  return posA - posB;
                });
                
                let orderIndexForDrop = 0;
                for (let gridRow = 0; gridRow < gridRows; gridRow++) {
                  for (let gridCol = 0; gridCol < gridCols; gridCol++) {
                    const deskPos = sortedDeskPositionsForDrop.find(p => p.gridRow === gridRow && p.gridCol === gridCol);
                    if (deskPos) {
                      const slot0Num = (gridRow * gridCols + gridCol) * 2;
                      const slot1Num = slot0Num + 1;
                      
                      if (orderIndexForDrop < uniqueOrder.length) {
                        slotBasedOrder[slot0Num] = uniqueOrder[orderIndexForDrop];
                        orderIndexForDrop++;
                      }
                      if (orderIndexForDrop < uniqueOrder.length) {
                        slotBasedOrder[slot1Num] = uniqueOrder[orderIndexForDrop];
                        orderIndexForDrop++;
                      }
                    }
                  }
                }
                console.log(`✅ Erstelle Slot-basierte Reihenfolge aus kompakter Liste`);
              }
              
              const draggedStudentName = studentMap.get(studentId)?.name || studentId;
              
              // WICHTIG: Prüfe ob Ziel-Slot bereits belegt ist - verwende slotBasedOrder direkt!
              // slotBasedOrder ist bereits die korrekte sparse Slot-Zuordnung (40 Elemente mit nulls)
              const targetStudentId = slotBasedOrder[targetIndexInSlots];
              const targetStudentName = targetStudentId ? studentMap.get(targetStudentId)?.name || targetStudentId : null;
              const isTargetOccupied = targetStudentId !== null && targetStudentId !== undefined && targetStudentId !== studentId;

              // Debug-Ausgabe
              console.log(`\n📤 QUELLE:`);
              console.log(`   - Schüler: ${draggedStudentName} (ID: ${studentId})`);
              console.log(`   - Position in Liste: ${sourceIndex}`);
              console.log(`   - Feld: ${sourceGlobalSlot}`);
              if (sourceGridPos) {
                console.log(`   - Grid: R${sourceGridPos.row + 1}, C${sourceGridPos.col + 1}, Slot ${sourceSlotIndex || sourceIndex % 2}`);
              }
              
              console.log(`\n📥 ZIEL:`);
              console.log(`   - Feld: ${targetGlobalSlot}`);
              console.log(`   - Slot-Index im Array: ${targetIndexInSlots}`);
              console.log(`   - Grid: R${finalGridRow + 1}, C${finalGridCol + 1}, Slot ${targetSlotIndex}`);
              if (isTargetOccupied) {
                console.log(`   - Status: BELEGT (${targetStudentName})`);
                console.log(`   - Aktion: TAUSCH`);
              } else {
                console.log(`   - Status: LEER`);
                console.log(`   - Aktion: VERSCHIEBEN`);
              }
              console.log(`\n${'─'.repeat(100)}\n`);
              
              // Berechne Source-Slot-Index
              const sourceSlotIndexInArray = sourceGlobalSlot > 0 ? sourceGlobalSlot - 1 : -1;
              
              // DEBUG: Zeige aktuelle Slot-Zuordnung vor dem Drop
              console.log(`\n🔍 SLOT-BASIERTE ZUORDNUNG VOR DROP:`);
              console.log(`   - Quelle (Slot ${sourceGlobalSlot}): ${slotBasedOrder[sourceSlotIndexInArray] || '<LEER>'}`);
              console.log(`   - Ziel (Slot ${targetGlobalSlot}): ${slotBasedOrder[targetIndexInSlots] || '<LEER>'}`);
              
              // Entferne Schüler aus Quelle
              if (sourceSlotIndexInArray >= 0 && sourceSlotIndexInArray < 40) {
                slotBasedOrder[sourceSlotIndexInArray] = null;
                console.log(`   ✅ Schüler aus Quelle (Slot ${sourceGlobalSlot}) entfernt`);
              }
              
              // Füge Schüler am Ziel ein (oder tausche)
              if (isTargetOccupied && targetStudentId) {
                // TAUSCH: Setze Ziel-Schüler an Quelle
                if (sourceSlotIndexInArray >= 0 && sourceSlotIndexInArray < 40) {
                  slotBasedOrder[sourceSlotIndexInArray] = targetStudentId;
                }
                slotBasedOrder[targetIndexInSlots] = studentId;
                
                console.log(`✅ TAUSCH durchgeführt:`);
                console.log(`   - ${draggedStudentName} (Feld ${sourceGlobalSlot}) ↔ ${targetStudentName} (Feld ${targetGlobalSlot})`);
                console.log(`\n📋 ERGEBNIS: SuS ${draggedStudentName} aus Feld ${sourceGlobalSlot} in Feld ${targetGlobalSlot} verschoben (Tausch mit ${targetStudentName})`);
              } else {
                // VERSCHIEBEN: Setze Schüler am Ziel
                slotBasedOrder[targetIndexInSlots] = studentId;
                
                console.log(`✅ VERSCHIEBUNG durchgeführt:`);
                console.log(`   - ${draggedStudentName} von Feld ${sourceGlobalSlot} nach Feld ${targetGlobalSlot}`);
                console.log(`   - Quelle (Slot ${sourceGlobalSlot}) ist jetzt: ${slotBasedOrder[sourceSlotIndexInArray] || '<LEER>'}`);
                console.log(`   - Ziel (Slot ${targetGlobalSlot}) ist jetzt: ${slotBasedOrder[targetIndexInSlots] || '<LEER>'}`);
                console.log(`\n📋 ERGEBNIS: SuS ${draggedStudentName} aus Feld ${sourceGlobalSlot} in Feld ${targetGlobalSlot} verschoben`);
              }
              
              // DEBUG: Zeige Slot-Zuordnung nach dem Drop
              console.log(`\n🔍 SLOT-BASIERTE ZUORDNUNG NACH DROP:`);
              console.log(`   - Quelle (Slot ${sourceGlobalSlot}): ${slotBasedOrder[sourceSlotIndexInArray] || '<LEER>'}`);
              console.log(`   - Ziel (Slot ${targetGlobalSlot}): ${slotBasedOrder[targetIndexInSlots] || '<LEER>'}`);
              
              // WICHTIG: Aktualisiere Desk-Positionen ZUERST, dann erstelle Reihenfolge daraus
              const gridKey = `${finalGridRow}-${finalGridCol}`;
              let updatedPositions = [...(deskPositions[participationGroupId] || finalDeskPositions)];
              
              // Erstelle aktualisierte gridMap aus updatedPositions
              const updatedGridMap: {[key: string]: number} = {};
              updatedPositions.forEach(pos => {
                const key = `${pos.gridRow}-${pos.gridCol}`;
                updatedGridMap[key] = pos.deskId;
              });
              
              const existingDeskId = updatedGridMap[gridKey];
              let needsNewDesk = existingDeskId === undefined;
              
              // Finde oder erstelle Desk für Ziel-Position
              let targetDeskIdForOrder = existingDeskId;
              
              if (needsNewDesk) {
                // Finde nächste freie Desk-ID
                const usedDeskIds = new Set(updatedPositions.map(p => p.deskId));
                let newDeskId = 0;
                while (usedDeskIds.has(newDeskId)) {
                  newDeskId++;
                }
                
                const existingPosIndex = updatedPositions.findIndex(
                  p => p.gridRow === finalGridRow && p.gridCol === finalGridCol
                );
                
                if (existingPosIndex === -1) {
                  updatedPositions.push({
                    deskId: newDeskId,
                    gridRow: finalGridRow,
                    gridCol: finalGridCol
                  });
                  
                  targetDeskIdForOrder = newDeskId;
                  
                  // Aktualisiere auch updatedGridMap
                  updatedGridMap[gridKey] = newDeskId;
                  
                  console.log(`✅ Neuer Desk ${newDeskId} an Position ${gridKey} erstellt`);
                  console.log(`   🔍 updatedPositions Länge: ${updatedPositions.length}`);
                  console.log(`   🔍 Position ${gridKey} in updatedPositions: ${updatedPositions.some(p => p.gridRow === finalGridRow && p.gridCol === finalGridCol) ? 'JA' : 'NEIN'}`);
                }
              } else {
                console.log(`ℹ️ Desk ${existingDeskId} existiert bereits an Position ${gridKey}`);
              }
              
              // WICHTIG: Aktualisiere State SOFORT, damit updatedPositions korrekt ist
              setDeskPositions(prev => ({
                ...prev,
                [participationGroupId]: updatedPositions
              }));
              
              // WICHTIG: Erstelle Reihenfolge basierend auf Slot-Positionen UND Desk-Positionen
              // Sortiere Desk-Positionen nach Grid-Position (zeilenweise)
              const sortedDeskPositions = [...updatedPositions].sort((a, b) => {
                const posA = a.gridRow * gridCols + a.gridCol;
                const posB = b.gridRow * gridCols + b.gridCol;
                return posA - posB;
              });
              
              console.log(`\n🔍 DESK-POSITIONEN FÜR NEWORDER:`);
              console.log(`   - Anzahl Desk-Positionen: ${sortedDeskPositions.length}`);
              console.log(`   - Ziel-Position ${gridKey} vorhanden: ${sortedDeskPositions.some(p => p.gridRow === finalGridRow && p.gridCol === finalGridCol) ? 'JA' : 'NEIN'}`);
              
              // NEUE LÖSUNG: Speichere Slot-Zuordnung DIREKT als Array von 40 Elementen
              // KRITISCH: null = leerer Slot, studentId = belegter Slot
              // Dies stellt sicher, dass Slots leer bleiben können!
              const newOrder: Array<string | null> = [];
              
              // Kopiere slotBasedOrder direkt - das ist die finale Slot-Zuordnung
              for (let slot = 0; slot < 40; slot++) {
                newOrder.push(slotBasedOrder[slot]);
              }
              
              console.log(`   ✅ NEUE LÖSUNG: Slot-basierte Reihenfolge gespeichert (40 Slots)`);
              console.log(`   🔍 Quelle (Slot ${sourceGlobalSlot}): ${newOrder[sourceSlotIndexInArray] || '<LEER>'}`);
              console.log(`   🔍 Ziel (Slot ${targetGlobalSlot}): ${newOrder[targetIndexInSlots] || '<LEER>'}`);
              console.log(`   🔍 Anzahl belegte Slots: ${newOrder.filter(s => s !== null).length}`);
              console.log(`   🔍 Anzahl leere Slots: ${newOrder.filter(s => s === null).length}`);
              
              console.log(`   - Neue Reihenfolge aus slotBasedOrder: ${newOrder.length} Schüler`);
              console.log(`   - Desk-Positionen: ${updatedPositions.length}`);
              console.log(`   - Schüler in Slot ${targetGlobalSlot}: ${slotBasedOrder[targetIndexInSlots] !== null ? slotBasedOrder[targetIndexInSlots] : '<LEER>'}`);
              console.log(`   - Leere Slots erlaubt: JA (z.B. Slot ${targetGlobalSlot} kann belegt sein, auch wenn davor Slots leer sind)`);
              
              // Prüfe auf Duplikate in neuer Reihenfolge
              const newOrderSet = new Set(newOrder);
              if (newOrder.length !== newOrderSet.size) {
                console.error(`❌ FEHLER: Duplikate in neuer Reihenfolge gefunden!`);
                console.log(`   - Erwartet: ${newOrder.length}, Eindeutig: ${newOrderSet.size}`);
              } else {
                console.log(`✅ Duplikate-Prüfung: OK (${newOrder.length} eindeutige Schüler)`);
              }
              
              // Debug: Zeige welche Schüler in welchen Slots sind
              console.log(`\n📋 SLOT-ZUORDNUNG (alle 40 Slots):`);
              for (let slot = 0; slot < 40; slot++) {
                const studentId = slotBasedOrder[slot];
                if (studentId !== null) {
                  const studentName = studentMap.get(studentId)?.name || studentId;
                  const gridCellIndex = Math.floor(slot / 2);
                  const gridRow = Math.floor(gridCellIndex / gridCols);
                  const gridCol = gridCellIndex % gridCols;
                  const slotInCell = slot % 2;
                  const deskPos = updatedPositions.find(p => p.gridRow === gridRow && p.gridCol === gridCol);
                  const deskInfo = deskPos ? `, Desk ${deskPos.deskId}` : ', Kein Desk';
                  console.log(`   Slot ${slot + 1} (Grid R${gridRow+1}, C${gridCol+1}, Slot ${slotInCell}${deskInfo}): ${studentName}`);
                }
              }
              
              console.log(`\n${'═'.repeat(100)}\n`);

              // Aktualisiere State - speichere als Array von 40 Elementen (null für leere Slots)
              setCustomSeatingOrder(prev => ({
                ...prev,
                [participationGroupId]: newOrder as any // Array<string | null>
              }));

              // Speichere die neue Sitzordnung im Backend
              saveSeatingOrder(participationGroupId, newOrder, updatedPositions);

              // Reset alle Drag-States
              setDraggedStudentId(null);
              setDropTarget(null);
              setDragOverDeskIndex(null);
              setDragOverGridCell(null);
              
              // Zeige aktualisierte Verteilung nach kurzer Verzögerung
              setTimeout(() => {
                console.log('📊 AKTUALISIERTE SLOT-VERTEILUNG NACH DROP:');
                debugParticipationSlots();
              }, 200);
            };
            
            // Drag & Drop Handler für ganze Tische
            const handleDeskDragStart = (e: React.DragEvent, deskId: number) => {
              setDraggedDeskId(deskId);
              e.dataTransfer.effectAllowed = 'move';
              e.stopPropagation(); // Verhindere dass Schüler-Drag ausgelöst wird
            };
            
            // Grid Cell Drag Handler - ROBUST NEU IMPLEMENTIERT
            const handleGridCellDragOver = (e: React.DragEvent, gridKey: string) => {
              // Erlaube sowohl Tisch-Drag als auch Schüler-Drag
              const isStudentDrag = e.dataTransfer.types.includes('text/plain') || 
                                   e.dataTransfer.types.includes('application/student-id') ||
                                   draggedStudentId !== null;
              
              if (draggedDeskId !== null || isStudentDrag) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (draggedDeskId !== null) {
                  setDragOverGridCell(gridKey);
                }
                if (isStudentDrag) {
                  setDragOverGridCell(gridKey);
                  setDragOverDeskIndex(null);
                }
              }
            };
            
            const handleGridCellDragLeave = (e: React.DragEvent) => {
              // Nur zurücksetzen wenn wirklich die Zelle verlassen wird
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                if (draggedDeskId !== null && !draggedStudentId) {
                  setDragOverGridCell(null);
              } else if (draggedStudentId) {
                  setDragOverGridCell(null);
                }
              }
            };
            
            const handleGridCellDrop = (e: React.DragEvent, gridRow: number, gridCol: number) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Priorität für Schüler-Drop - verwende dropTarget wenn verfügbar
              const isStudentDrag = draggedStudentId !== null || 
                                   e.dataTransfer.types.includes('text/plain') ||
                                   e.dataTransfer.types.includes('application/student-id');
              
              if (isStudentDrag && dropTarget && dropTarget.type === 'grid') {
                handleStudentDrop(e, dropTarget.slotIndex, undefined, gridRow, gridCol);
                  return;
              } else if (isStudentDrag) {
                // Fallback: verwende Slot 0
                handleStudentDrop(e, 0, undefined, gridRow, gridCol);
                return;
              }
              
              // Fall 2: Tisch wird verschoben
              if (draggedDeskId === null || !participationGroupId) return;
              
              const gridKey = `${gridRow}-${gridCol}`;
              const existingDeskId = gridMap[gridKey];
              const currentPositions = [...(deskPositions[participationGroupId] || [])];
              const draggedPos = currentPositions.find(p => p.deskId === draggedDeskId);
              
              if (!draggedPos) return;
              
              if (existingDeskId !== undefined && existingDeskId !== draggedDeskId) {
                // Tausche Positionen
                const existingPos = currentPositions.find(p => p.deskId === existingDeskId);
                if (existingPos) {
                  const oldRow = draggedPos.gridRow;
                  const oldCol = draggedPos.gridCol;
                  draggedPos.gridRow = gridRow;
                  draggedPos.gridCol = gridCol;
                  existingPos.gridRow = oldRow;
                  existingPos.gridCol = oldCol;
                }
              } else {
                // Verschiebe Tisch zur neuen Position
                draggedPos.gridRow = gridRow;
                draggedPos.gridCol = gridCol;
              }
              
              setDeskPositions(prev => ({
                ...prev,
                [participationGroupId]: currentPositions
              }));
              
              const currentOrder = customSeatingOrder[participationGroupId] || sortedStudents.map(s => s.id);
              if (currentOrder.length > 0) {
                saveSeatingOrder(participationGroupId, currentOrder, currentPositions);
              }
              
              setDraggedDeskId(null);
              setDragOverGridCell(null);
            };

            // Einheitliche Höhe für alle Boxen
            const BOX_HEIGHT = '46px';
            
            // Helper-Funktion zum Rendern eines Schülers - MIT DROP-FUNKTIONALITÄT
            const renderStudent = (student: typeof sortedStudents[0], deskId: number, slotIndex: number, gridRow: number, gridCol: number) => {
                const value = getParticipationValue(student.id);
                const getColor = () => {
                if (value === 2) return { bg: '#E8F5E9', border: '#4CAF50', emoji: '😄' };
                if (value === 1) return { bg: '#E3F2FD', border: '#2196F3', emoji: '😊' };
                if (value === 0) return { bg: '#F5F5F5', border: '#9E9E9E', emoji: '😐' };
                if (value === -1) return { bg: '#FFF9C4', border: '#FFC107', emoji: '🙁' };
                if (value === -2) return { bg: '#FFEBEE', border: '#F44336', emoji: '😞' };
                  return { bg: '#F5F5F5', border: '#9E9E9E', emoji: '😐' };
                };
                const colors = getColor();
                const grade = calculateParticipationGrade(student.id);
                
                const groupData = participations[participationGroupId] || {};
                const lessonData = groupData[currentLessonIndex] || {};
                const studentData = lessonData[student.id];
                const existingComment = (studentData && typeof studentData === 'object' && studentData.comment) ? String(studentData.comment) : '';
                const hasComment = existingComment.trim().length > 0;
                
                // Prüfe ob diese Box das aktuelle Drop-Target ist
                const isCurrentDropTarget = dropTarget !== null && 
                                           dropTarget.type === 'desk' && 
                                           dropTarget.deskId === deskId && 
                                           dropTarget.slotIndex === slotIndex &&
                                           draggedStudentId !== student.id;
                
              const studentCard = (
                        <Paper
                  draggable
                  onDragStart={(e) => {
                    handleStudentDragStart(e, student.id, deskId, slotIndex);
                    setDropTarget(null);
                  }}
                  onDragEnd={(e) => {
                    // Reset nur wenn Drop nicht erfolgreich war
                    if (draggedStudentId) {
                    setDraggedStudentId(null);
                      setDropTarget(null);
                    setDragOverDeskIndex(null);
                    setDragOverGridCell(null);
                    }
                  }}
                  onDragOver={(e) => {
                    if (draggedStudentId && draggedStudentId !== student.id) {
                      handleStudentDragOver(e);
                      setDropTarget({ type: 'desk', deskId, slotIndex });
                    }
                  }}
                  onDragLeave={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                      if (dropTarget?.deskId === deskId && dropTarget?.slotIndex === slotIndex) {
                        setDropTarget(null);
                      }
                    }
                  }}
                  onDrop={(e) => {
                    if (draggedStudentId && draggedStudentId !== student.id) {
                      const sourceDeskId = e.dataTransfer.getData('source-desk-id');
                      const sourceSlotIndex = e.dataTransfer.getData('source-slot-index');
                      const sourceGridPos = sourceDeskId ? deskToGridPosMap[parseInt(sourceDeskId)] : null;
                      const sourceGlobalSlot = sourceGridPos ? getGlobalSlotNumber(parseInt(sourceSlotIndex || '0'), sourceGridPos.row, sourceGridPos.col) : -1;
                      const targetGridPos = deskToGridPosMap[deskId];
                      if (targetGridPos) {
                        const targetGlobalSlot = getGlobalSlotNumber(slotIndex, targetGridPos.row, targetGridPos.col);
                        const studentName = sortedStudents.find(s => s.id === draggedStudentId)?.name || draggedStudentId;
                        console.log(`\n🔄 DRAG DROP (StudentBox): SuS ${studentName} von Slot ${sourceGlobalSlot} in Slot ${targetGlobalSlot} verschoben\n`);
                        handleStudentDrop(e, slotIndex, deskId, targetGridPos.row, targetGridPos.col);
                      }
                    }
                  }}
                          elevation={2}
                          sx={{
                            p: 0.5,
                    cursor: 'grab',
                            border: isCurrentDropTarget ? '3px solid #4CAF50' : `2px solid ${colors.border}`,
                            bgcolor: isCurrentDropTarget ? '#C8E6C9' : colors.bg,
                            borderRadius: 1.2,
                            transition: 'all 0.15s',
                            position: 'relative',
                    height: BOX_HEIGHT,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    margin: '2px',
                    boxShadow: isCurrentDropTarget ? '0 0 0 3px rgba(76, 175, 80, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                    transform: isCurrentDropTarget ? 'scale(1.05)' : 'scale(1)',
                    zIndex: isCurrentDropTarget ? 10 : 1,
                    '&:active': {
                      cursor: 'grabbing',
                      opacity: 0.7
                    },
                            '&:hover': {
                              transform: isCurrentDropTarget ? 'scale(1.05)' : 'translateY(-1px)',
                              boxShadow: isCurrentDropTarget ? '0 0 0 3px rgba(76, 175, 80, 0.3)' : '0 3px 6px rgba(0,0,0,0.15)'
                            }
                          }}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const isLeft = clickX < rect.width / 2;
                            handleParticipationClick(student.id, isLeft, false);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleParticipationClick(student.id, true, true);
                          }}
                          onContextMenu={(e) => handleCommentRightClick(e, student.id, formatStudentName(student.name))}
                  onTouchStart={(e) => handleTouchStart(e, student.id, formatStudentName(student.name))}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                        >
                  {isCurrentDropTarget && (
                    <Box sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: '#4CAF50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      zIndex: 11
                    }}>
                      ✓
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.05, justifyContent: 'center', height: '100%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.5rem', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.1 }}>
                              {formatStudentName(student.name)}
                            </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1 }}>
                              {colors.emoji}
                            </Typography>
                          </Box>
                  {/* Globale Slot-Nummer */}
                  <Box sx={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'rgba(76, 175, 80, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    zIndex: 2,
                    border: '1px solid white'
                  }}>
                    {getGlobalSlotNumber(slotIndex, gridRow, gridCol)}
                          </Box>
                  {hasComment && (
                    <Box sx={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: '50%', bgcolor: '#FF9800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 600, color: 'white', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                            K
                          </Box>
                  )}
                        </Paper>
              );
              
              return hasComment ? (
                <Tooltip key={student.id} title={existingComment} arrow>
                  {studentCard}
                      </Tooltip>
                    ) : (
                <Box key={student.id}>{studentCard}</Box>
              );
            };
            
            // Helper-Funktion zum Rendern einer leeren Box - MIT KLARER VISUELLER MARKIERUNG
            const renderEmptyBox = (
              key: string, 
              slotIndex: number, 
              deskId?: number, 
              gridRow?: number, 
              gridCol?: number
            ) => {
              const isInEmptyGridCell = deskId === undefined && gridRow !== undefined && gridCol !== undefined;
              
              // Prüfe ob diese Box das aktuelle Drop-Target ist
              const isCurrentDropTarget = dropTarget !== null && (
                (deskId !== undefined && dropTarget.type === 'desk' && dropTarget.deskId === deskId && dropTarget.slotIndex === slotIndex) ||
                (isInEmptyGridCell && dropTarget.type === 'grid' && dropTarget.gridRow === gridRow && dropTarget.gridCol === gridCol && dropTarget.slotIndex === slotIndex)
              );
              
              return (
                <Box
                  key={key}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    height: BOX_HEIGHT,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    border: isCurrentDropTarget ? '3px solid #4CAF50' : (draggedStudentId ? '2px dashed #4CAF50' : '2px dashed #FFB3B3'),
                    borderRadius: 1.2,
                    bgcolor: isCurrentDropTarget ? '#C8E6C9' : (draggedStudentId ? '#f0f0f0' : '#FFE8E8'),
                    opacity: draggedStudentId ? (isCurrentDropTarget ? 1 : 0.7) : 0.8,
                    cursor: draggedStudentId ? 'copy' : 'default',
                    transition: 'all 0.15s',
                    margin: '2px',
                    boxShadow: isCurrentDropTarget ? '0 0 0 3px rgba(76, 175, 80, 0.3)' : '0 1px 3px rgba(255, 179, 179, 0.2)',
                    transform: isCurrentDropTarget ? 'scale(1.05)' : 'scale(1)',
                    zIndex: isCurrentDropTarget ? 10 : 1,
                    '&:hover': {
                      opacity: draggedStudentId ? 1 : 0.9,
                      borderColor: draggedStudentId ? '#4CAF50' : '#FF9999',
                      transform: draggedStudentId ? 'scale(1.02)' : 'translateY(-1px)',
                      boxShadow: '0 2px 4px rgba(255, 179, 179, 0.3)'
                    }
                  }}
                  onDragOver={(e) => {
                    handleStudentDragOver(e);
                    // Setze genaues Drop-Target
                      if (deskId !== undefined) {
                      setDropTarget({ type: 'desk', deskId, slotIndex });
                    } else if (gridRow !== undefined && gridCol !== undefined) {
                      setDropTarget({ type: 'grid', gridRow, gridCol, slotIndex });
                    }
                  }}
                  onDragLeave={(e) => {
                    // Nur zurücksetzen wenn wirklich verlassen
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                      setDropTarget(null);
                    }
                  }}
                  onDrop={(e) => {
                    const sourceDeskId = e.dataTransfer.getData('source-desk-id');
                    const sourceSlotIndex = e.dataTransfer.getData('source-slot-index');
                    const sourceGridPos = sourceDeskId ? deskToGridPosMap[parseInt(sourceDeskId)] : null;
                    const sourceGlobalSlot = sourceGridPos ? getGlobalSlotNumber(parseInt(sourceSlotIndex || '0'), sourceGridPos.row, sourceGridPos.col) : -1;
                    const studentName = sortedStudents.find(s => s.id === draggedStudentId)?.name || draggedStudentId;
                    
                      if (deskId !== undefined) {
                      const targetGridPos = deskToGridPosMap[deskId];
                      if (targetGridPos) {
                        const targetGlobalSlot = getGlobalSlotNumber(slotIndex, targetGridPos.row, targetGridPos.col);
                        console.log(`\n🔄 DRAG DROP (EmptyBox): SuS ${studentName} von Slot ${sourceGlobalSlot} in Slot ${targetGlobalSlot} verschoben\n`);
                        handleStudentDrop(e, slotIndex, deskId, targetGridPos.row, targetGridPos.col);
                      }
                    } else if (gridRow !== undefined && gridCol !== undefined) {
                      const targetGlobalSlot = getGlobalSlotNumber(slotIndex, gridRow, gridCol);
                      console.log(`\n🔄 DRAG DROP (EmptyBox): SuS ${studentName} von Slot ${sourceGlobalSlot} in Slot ${targetGlobalSlot} verschoben\n`);
                      handleStudentDrop(e, slotIndex, undefined, gridRow, gridCol);
                    }
                  }}
                >
                  {isCurrentDropTarget && (
                    <Box sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: '#4CAF50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      zIndex: 11
                    }}>
                      ✓
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ color: isCurrentDropTarget ? '#2E7D32' : '#9e9e9e', fontSize: '0.6rem', fontWeight: isCurrentDropTarget ? 600 : 400 }}>
                    {isCurrentDropTarget ? 'Hier ablegen' : 'Leer'}
                  </Typography>
                  {/* Globale Slot-Nummer */}
                  <Box sx={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'rgba(76, 175, 80, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    zIndex: 2,
                    border: '1px solid white'
                  }}>
                    {getGlobalSlotNumber(slotIndex, gridRow!, gridCol!)}
                  </Box>
                </Box>
              );
            };
            
            // Zeige Debug-Ausgabe beim ersten Rendern (nur einmal beim Öffnen)
            const currentDebugKey = `${participationGroupId}-${sortedStudents.length}`;
            if (participationModalOpen && participationGroupId && sortedStudents.length > 0 && participationDebugShownRef.current !== currentDebugKey) {
              console.log('📊 INITIALE SLOT-VERTEILUNG BEIM ÖFFNEN DES MODALS:');
              debugParticipationSlots();
              participationDebugShownRef.current = currentDebugKey;
            }
            
            return (
              <Box sx={{ bgcolor: '#f5f0e8', p: 1.2, borderRadius: 1 }}>
                <Box
                            sx={{ 
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                    gap: 0.1,
                    minHeight: '500px'
                  }}
                >
                  {/* Render Grid-Zellen */}
                  {Array.from({ length: gridRows * gridCols }, (_, index) => {
                    const gridRow = Math.floor(index / gridCols);
                    const gridCol = index % gridCols;
                    const gridKey = `${gridRow}-${gridCol}`;
                    
                    // WICHTIG: Verwende gridToDeskMap für konsistente Zuordnung
                    const deskInfo = gridToDeskMap[gridKey];
                    const deskId = deskInfo?.deskId;
                    const desk = deskInfo?.desk || null;
                    const isDragOver = dragOverGridCell === gridKey;
                    const isDragged = draggedDeskId === deskId;
                    
                    return (
                      <Box
                        key={gridKey}
                            sx={{ 
                          height: '72px',
                          minHeight: '72px',
                          maxHeight: '72px',
                          minWidth: '120px',
                          border: desk ? '2px solid #8B6F47' : (isDragOver || (draggedStudentId && !desk)) ? '2px dashed #4CAF50' : '2px dashed #FFB3B3',
                          borderRadius: 1.2,
                          bgcolor: desk ? (isDragOver ? '#D4A574' : '#C9A882') : (isDragOver || (draggedStudentId && !desk)) ? '#e8f5e9' : '#FFE8E8',
                          p: 0.2,
                          m: 0.2,
                          transition: 'all 0.2s',
                          opacity: isDragged ? 0.5 : 1,
                          display: 'flex',
                          gap: 0.6,
                          alignItems: 'center',
                          boxShadow: desk ? '0 2px 4px rgba(139, 111, 71, 0.2)' : '0 1px 2px rgba(255, 179, 179, 0.2)'
                        }}
                        onDragOver={(e) => handleGridCellDragOver(e, gridKey)}
                        onDragLeave={handleGridCellDragLeave}
                        onDrop={(e) => handleGridCellDrop(e, gridRow, gridCol)}
                      >
                        {desk ? (
                          <Box
                            sx={{ 
                              display: 'flex',
                              gap: 0.6,
                              width: '100%',
                              cursor: 'grab',
                              '&:active': { cursor: 'grabbing' }
                            }}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDeskDragStart(e, deskId);
                            }}
                            onDragEnd={() => {
                              setDraggedDeskId(null);
                              setDragOverGridCell(null);
                            }}
                            onDragOver={(e) => {
                              // Lass einzelne Boxen das Drag handhaben
                              const hasStudentData = e.dataTransfer.types.includes('text/plain') || 
                                                    e.dataTransfer.types.includes('application/student-id') ||
                                                    draggedStudentId !== null;
                              if (hasStudentData) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                              }
                            }}
                          >
                            {/* Render 2 Slots - entweder mit Schüler oder leer */}
                            {Array.from({ length: 2 }, (_, slotIndex) => {
                              const student = desk[slotIndex];
                              if (student) {
                                return (
                              <Box key={student.id} sx={{ flex: 1, minWidth: 0, height: BOX_HEIGHT, display: 'flex', flexDirection: 'column' }}>
                                    {renderStudent(student, deskId, slotIndex, gridRow, gridCol)}
                        </Box>
                                );
                              } else {
                                // Verwende die aktuelle Grid-Position, nicht aus finalDeskPositions
                                return renderEmptyBox(`empty-${deskId}-${slotIndex}`, slotIndex, deskId, gridRow, gridCol);
                              }
                            })}
                          </Box>
                        ) : (
                          // Leere Kachel - kann als Drop-Zone verwendet werden
                        <Box 
                          onDragOver={(e) => {
                            // Lass einzelne Boxen das Drag handhaben
                            const hasStudentData = e.dataTransfer.types.includes('text/plain') || 
                                                  e.dataTransfer.types.includes('application/student-id') ||
                                                  draggedStudentId !== null;
                            
                            if (hasStudentData) {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              setDragOverGridCell(gridKey);
                              setDragOverDeskIndex(null);
                              // dropTarget wird von den einzelnen Boxen gesetzt
                            } else if (draggedDeskId !== null) {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              setDragOverGridCell(gridKey);
                            }
                          }}
                          onDragLeave={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX;
                              const y = e.clientY;
                              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                if (draggedStudentId) {
                                setDragOverGridCell(null);
                                }
                                if (draggedDeskId !== null) {
                                  setDragOverGridCell(null);
                              }
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const isStudentDrag = draggedStudentId !== null || 
                                                 e.dataTransfer.types.includes('text/plain') ||
                                                 e.dataTransfer.types.includes('application/student-id');
                            
                            if (isStudentDrag) {
                              // Verwende dropTarget wenn verfügbar, sonst Slot 0
                              const slotIndex = dropTarget?.type === 'grid' && dropTarget.gridRow === gridRow && dropTarget.gridCol === gridCol 
                                ? dropTarget.slotIndex 
                                : 0;
                              handleStudentDrop(e, slotIndex, undefined, gridRow, gridCol);
                            } else if (draggedDeskId !== null) {
                              handleGridCellDrop(e, gridRow, gridCol);
                            }
                          }}
                          sx={{ 
                              width: '100%',
                              display: 'flex',
                              flexDirection: 'row',
                              gap: 0.6,
                              alignItems: 'center',
                              cursor: draggedStudentId ? 'copy' : (draggedDeskId !== null ? 'move' : 'default'),
                              bgcolor: draggedStudentId ? '#e8f5e9' : (draggedDeskId !== null && dragOverGridCell === gridKey ? '#fff3e0' : 'transparent'),
                              transition: 'background-color 0.2s',
                              position: 'relative',
                              height: '72px',
                              minHeight: '72px',
                              maxHeight: '72px'
                            }}
                          >
                            {/* Leere Schülerboxen in leeren Kacheln - nebeneinander */}
                            {Array.from({ length: 2 }, (_, slotIndex) => 
                              renderEmptyBox(`empty-cell-${gridKey}-${slotIndex}`, slotIndex, undefined, gridRow, gridCol)
                            )}
                          </Box>
                        )}
                      </Box>
                );
              })}
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Statistik-Modal */}
      <Dialog 
        open={statisticsModalOpen} 
        onClose={handleStatisticsClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ pb: 0.5, pt: 1, px: 1.5, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 auto', minWidth: 0 }}>
              <Box sx={{ 
                width: 28, 
                height: 28, 
                borderRadius: '50%', 
                bgcolor: '#2196F3', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <BarChartIcon sx={{ color: 'white', fontSize: 16 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.2 }}>
                  Epochalstatistik
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.2 }}>
                  {participationGroupName}
                </Typography>
              </Box>
            </Box>
            {/* Export-Buttons kompakt nebeneinander in der Leiste */}
            <Box sx={{ display: 'flex', gap: 0.3, alignItems: 'center', flexWrap: 'nowrap', flexShrink: 0 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<TableChartIcon sx={{ fontSize: 12 }} />}
                onClick={exportToCSV}
                disabled={!sortedParticipationStats.length}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<TableChartIcon sx={{ fontSize: 12 }} />}
                onClick={exportToExcel}
                disabled={!sortedParticipationStats.length}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                Excel
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PictureAsPdfIcon sx={{ fontSize: 12 }} />}
                onClick={exportToPDF}
                disabled={!sortedParticipationStats.length}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                PDF
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DescriptionIcon sx={{ fontSize: 12 }} />}
                onClick={exportToWord}
                disabled={!sortedParticipationStats.length}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                Word
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CodeIcon sx={{ fontSize: 12 }} />}
                onClick={exportToJSON}
                disabled={!sortedParticipationStats.length}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                JSON
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon sx={{ fontSize: 12 }} />}
                onClick={() => setResetDialogOpen(true)}
                sx={{ 
                  fontSize: '0.65rem', 
                  py: 0.25, 
                  px: 0.6,
                  minWidth: 'auto',
                  textTransform: 'none',
                  height: '24px',
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    marginLeft: 0
                  }
                }}
              >
                Zurücksetzen
              </Button>
            </Box>
            <IconButton 
              size="small" 
              onClick={handleStatisticsClose}
              sx={{ 
                p: 0,
                width: 20,
                height: 20,
                flexShrink: 0,
                '& svg': {
                  width: '100%',
                  height: '100%'
                }
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 1.5, pt: 1.5 }}>
          {statsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : participationStats.length === 0 ? (
            <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: '0.75rem' }}>
              Noch keine Bewertungen vorhanden
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {sortedParticipationStats.map((stat: any, index: number) => {
                  const getGradeColor = (grade: number | null) => {
                    if (!grade) return '#9E9E9E';
                    if (grade <= 1.5) return '#4CAF50';
                    if (grade <= 2.5) return '#8BC34A';
                    if (grade <= 3.5) return '#FFC107';
                    if (grade <= 4.5) return '#FF9800';
                    return '#F44336';
                  };
                  const epo1 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 1);
                  const epo2 = epoGrades.find((g: any) => g.studentId === stat.student.id && g.period === 2);
                  
                  return (
                    <Box
                      key={stat.student.id}
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 0.5,
                        px: 1,
                        py: 0.5,
                        bgcolor: '#fafafa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mt: index === 0 ? 1 : 0,
                        '&:hover': {
                          bgcolor: '#f5f5f5'
                        }
                      }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, flex: '0 0 auto', minWidth: '120px' }}>
                        {formatStudentName(stat.student.name)}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: '1 1 auto', justifyContent: 'flex-end' }}>
                        <Tooltip title={`${stat.count} Bewertungen, Durchschnitt: ${stat.average.toFixed(2)}`} arrow>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                              {stat.count}×
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                              Ø{stat.average.toFixed(1)}
                            </Typography>
                          </Box>
                        </Tooltip>
                        
                        {periodConfig.period1Hours && stat.period1 && (
                          <Tooltip title={`Zeitraum 1 (St. 1-${periodConfig.period1Hours}): ${stat.period1.count} Bewertungen`} arrow>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                Z1:
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                {stat.period1.count}×
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  color: getGradeColor(stat.period1.grade || null)
                                }}
                              >
                                {stat.period1.grade ? stat.period1.grade.toFixed(1) : '-'}
                              </Typography>
                            </Box>
                          </Tooltip>
                        )}
                        
                        {periodConfig.period2Hours && stat.period2 && (
                          <Tooltip title={`Zeitraum 2 (St. ${periodConfig.period1Hours ? periodConfig.period1Hours + 1 : 1}-${periodConfig.period1Hours ? periodConfig.period1Hours + periodConfig.period2Hours : periodConfig.period2Hours}): ${stat.period2.count} Bewertungen`} arrow>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                Z2:
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                {stat.period2.count}×
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  color: getGradeColor(stat.period2.grade || null)
                                }}
                              >
                                {stat.period2.grade ? stat.period2.grade.toFixed(1) : '-'}
                              </Typography>
                            </Box>
                          </Tooltip>
                        )}
                        
                        <Box sx={{ width: '1px', height: '16px', bgcolor: '#d0d0d0', mx: 0.5 }} />
                        
                        <Tooltip title="Gesamtnote (alle Bewertungen)" arrow>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: getGradeColor(stat.grade),
                              minWidth: '32px',
                              textAlign: 'center'
                            }}
                          >
                            {stat.grade ? stat.grade.toFixed(1) : '-'}
                          </Typography>
                        </Tooltip>
                        
                        <Box sx={{ width: '1px', height: '16px', bgcolor: '#d0d0d0', mx: 0.5 }} />
                        
                        {epo1 && (
                          <Tooltip title="Epo 1 (Zeitraum 1)" arrow>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: getGradeColor(epo1.grade),
                                minWidth: '32px',
                                textAlign: 'center'
                              }}
                            >
                              {epo1.grade.toFixed(1)}
                            </Typography>
                          </Tooltip>
                        )}
                        
                        {epo2 && (
                          <Tooltip title="Epo 2 (Zeitraum 2)" arrow>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: getGradeColor(epo2.grade),
                                minWidth: '32px',
                                textAlign: 'center'
                              }}
                            >
                              {epo2.grade.toFixed(1)}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  );
                })}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Zeitraum-Konfiguration Modal */}
      <Dialog 
        open={periodConfigModalOpen} 
        onClose={() => setPeriodConfigModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1
          }
        }}
      >
        <DialogTitle sx={{ pb: 0.5, pt: 1, px: 1.5, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Zeiträume einstellen
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setPeriodConfigModalOpen(false)}
              sx={{ 
                p: 0,
                width: 20,
                height: 20,
                '& svg': {
                  width: '100%',
                  height: '100%'
                }
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 1.5, pt: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 2 }}>
            Geben Sie an, wie viele Stunden zu jedem Zeitraum gehören. Am Ende werden automatisch Epo 1 und Epo 2 berechnet.
          </Typography>
          
          <TextField
            fullWidth
            label="Zeitraum 1 (Epo 1) - Anzahl Stunden"
            type="number"
            value={tempPeriod1Hours}
            onChange={(e) => setTempPeriod1Hours(e.target.value)}
            sx={{ mb: 2 }}
            inputProps={{ min: 1, max: 1000 }}
            helperText="Anzahl der Stunden für den ersten Zeitraum"
          />
          
          <TextField
            fullWidth
            label="Zeitraum 2 (Epo 2) - Anzahl Stunden"
            type="number"
            value={tempPeriod2Hours}
            onChange={(e) => setTempPeriod2Hours(e.target.value)}
            inputProps={{ min: 1, max: 1000 }}
            helperText="Anzahl der Stunden für den zweiten Zeitraum"
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 1.5, pb: 1.5, pt: 1 }}>
          <Button onClick={() => setPeriodConfigModalOpen(false)} size="small" sx={{ fontSize: '0.75rem' }}>
            Abbrechen
          </Button>
          <Button onClick={savePeriodConfig} variant="contained" size="small" sx={{ fontSize: '0.75rem' }}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* KA Korrekturmodus Dialog */}
      {showKACorrectionMode && (
        <Dialog
          open={showKACorrectionMode}
          onClose={() => setShowKACorrectionMode(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogContent sx={{ p: 0 }}>
            <KACorrectionMode
              kaFilePath={selectedKAFilePath}
              onClose={() => setShowKACorrectionMode(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Lehrer Nachrichten-Box */}
      <TeacherMessageBox
        open={showTeacherMessageBox}
        onClose={() => setShowTeacherMessageBox(false)}
        userId={userId}
      />

      {/* Modal: Unterrichtsstunde – Anweisungen, Folien, AB. X-Button: immer klein, ganz rechts, Icon überdeckt Button. */}
      <Dialog
        open={lessonModalOpen}
        onClose={() => { setLessonModalOpen(false); setLessonModalData(null); setVoraussetzungenGlossarOpen(false); setLessonBoxEdit(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {lessonModalData && (
          <>
            <DialogTitle component="div" sx={{ borderBottom: '1px solid #e0e0e0', pb: 1.5, pr: 5, position: 'relative' }}>
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                {lessonModalData.lessonName}
              </Typography>
              <IconButton
                size="small"
                onClick={() => { setLessonModalOpen(false); setLessonModalData(null); setVoraussetzungenGlossarOpen(false); setLessonBoxEdit(null); }}
                sx={{
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  p: 0.25,
                  minWidth: 28,
                  width: 28,
                  height: 28,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {(() => {
                const lessonName = lessonModalData.lessonName;
                const lessonPath = lessonModalData.lessonPath;
                const baseInstructions = LESSON_INSTRUCTIONS[lessonName]
                  ?? Object.entries(LESSON_INSTRUCTIONS).find(([key]) => lessonName.includes(key) || key.includes(lessonName))?.[1];
                const instructions = { ...baseInstructions, ...(editedLessonInstructions[lessonPath] || {}) } as typeof baseInstructions;
                const allFiles = (lessonModalData.children || []).filter((c: any) => c.type === 'file' && !(c.name && c.name.startsWith('~$')));
                const isEditing = (section: LessonBoxField) => lessonBoxEdit?.lessonPath === lessonPath && lessonBoxEdit?.section === section;
                const startEdit = (section: LessonBoxField) => {
                  const currentText = (instructions as any)?.[section] ?? '';
                  const htmlText = plainTextToEditorHtml(currentText, section);
                  setLessonBoxEdit({ lessonName, lessonPath, section, draft: htmlText, originalDraft: htmlText });
                };
                const sanitizeSavedHtml = (html: string): string => {
                  if (!html || typeof html !== 'string') return html;
                  return html
                    .replace(/\s*contenteditable\s*=\s*["']?(?:true|false)["']?/gi, '')
                    .replace(/\s*data-[a-z-]+\s*=\s*["'][^"']*["']/gi, '');
                };
                const saveEdit = async (e?: React.MouseEvent) => {
                  e?.preventDefault();
                  e?.stopPropagation();
                  if (!lessonBoxEdit) return;
                  const { lessonPath: lp, section, draft, originalDraft } = lessonBoxEdit;
                  if (!draft?.trim() && originalDraft?.trim()) {
                    setLessonBoxEdit(null);
                    return;
                  }
                  const sanitized = sanitizeSavedHtml(draft);
                  if (sanitized === originalDraft || sanitized === sanitizeSavedHtml(originalDraft)) {
                    setLessonBoxEdit(null);
                    return;
                  }
                  const nextOverrides = { ...(editedLessonInstructions[lp] || {}), [section]: sanitized };
                  setEditedLessonInstructions(prev => ({ ...prev, [lp]: nextOverrides }));
                  setLessonBoxEdit(null);
                  try {
                    await fetch('/api/lesson-instructions', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ teacherId: userId, lessonPath: lp, content: nextOverrides })
                    });
                  } catch (_) {
                    showSnackbar('Änderungen konnten nicht gespeichert werden.', 'error');
                  }
                };
                const undoEdit = () => {
                  if (!lessonBoxEdit) return;
                  // Stellt den Zustand beim Öffnen der Bearbeitung wieder her
                  setLessonBoxEdit(prev => prev ? { ...prev, draft: prev.originalDraft } : null);
                };
                const isABByName = (name: string) => /^AB_|Sicherheitsziele/i.test((name || '').replace(/\.[^.]+$/, ''));
                const folienFiles = allFiles.filter((f: any) => /\.(pdf|pptx?|odp)$/i.test(f.name || '') && !isABByName(f.name));
                const abFiles = allFiles.filter((f: any) => !/\.(pdf|pptx?|odp)$/i.test(f.name || '') || isABByName(f.name));

                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* Voraussetzungen – blaue Box immer da, Inhalt nur bei echten Voraussetzungen (nicht bei "Keine fachlichen Voraussetzungen.") */}
                    <Box sx={{ pt: 1.5 }}>
                      <Box sx={{ position: 'relative', bgcolor: '#e3f2fd', borderRadius: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, p: 1.5, pr: 5, border: '1px solid #90caf9', borderBottom: 'none' }}>
                        <Tooltip title="Text bearbeiten">
                          <IconButton size="small" onClick={() => startEdit('voraussetzungen')} sx={{ position: 'absolute', top: 4, right: 4, p: 0.25, minWidth: 28, width: 28, height: 28, color: '#1565c0', '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.08)' } }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {isEditing('voraussetzungen') ? (
                          <>
                            <RichTextEditor
                              key={`edit-voraussetzungen-${lessonName}`}
                              value={lessonBoxEdit?.draft ?? ''}
                              onChange={value => setLessonBoxEdit(prev => {
                                if (!prev) return null;
                                // Verhindern, dass der Editor vorhandenen Inhalt mit leerem Wert überschreibt
                                if (!value?.trim() && prev.originalDraft?.trim()) return prev;
                                return { ...prev, draft: value };
                              })}
                              placeholder="Voraussetzungen eingeben..."
                              rows={4}
                              compact={true}
                            />
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                              <Button size="small" startIcon={<UndoIcon />} onClick={undoEdit} sx={{ color: '#666' }}>Rückgängig</Button>
                              <Button type="button" size="small" onClick={(e) => { e.preventDefault(); saveEdit(e); }} sx={{ color: '#1565c0' }}>Fertig</Button>
                            </Box>
                          </>
                        ) : instructions?.voraussetzungen?.trim() && instructions.voraussetzungen.trim() !== 'Keine fachlichen Voraussetzungen.' ? (
                          <>
                            {renderTextContent(instructions.voraussetzungen, undefined, 1.75, true)}
                            {(() => {
                              const terms = [...instructions.voraussetzungen.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1]).filter((t, i, a) => a.indexOf(t) === i);
                              const withGlossar = terms.filter(t => FACHBEGRIFFE_GLOSSAR[t]);
                              if (withGlossar.length === 0) return null;
                              return (
                                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #90caf9' }}>
                                  <Box
                                    onClick={() => setVoraussetzungenGlossarOpen(v => !v)}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                                  >
                                    {voraussetzungenGlossarOpen ? <ExpandLessIcon sx={{ fontSize: 20, color: '#1565c0' }} /> : <ExpandMoreIcon sx={{ fontSize: 20, color: '#1565c0' }} />}
                                    <Typography component="span" sx={{ fontWeight: 700, color: '#1565c0', fontSize: '1.05rem' }}>
                                      Fachbegriffe (Erklärungen & Beispiele)
                                    </Typography>
                                  </Box>
                                  <Collapse in={voraussetzungenGlossarOpen}>
                                    <Box sx={{ mt: 1 }}>
                                      {withGlossar.map(term => {
                                        const g = FACHBEGRIFFE_GLOSSAR[term];
                                        if (!g) return null;
                                        return (
                                          <Box key={term} sx={{ mb: 1.25 }}>
                                            <Typography component="span" sx={{ fontWeight: 700, color: '#1565c0', fontSize: '1.05rem' }}>{term}</Typography>
                                            <Box sx={{ mt: 0.5, pl: 1, borderLeft: '3px solid #90caf9' }}>
                                              <Typography component="span" sx={{ fontSize: '1rem', color: '#333', display: 'block', mb: 0.25 }}>
                                                <Box component="span" sx={{ fontWeight: 600, color: '#1976d2' }}>Erklärung:</Box> {g.erklärung}
                                              </Typography>
                                              <Typography component="span" sx={{ fontSize: '1rem', color: '#333', display: 'block' }}>
                                                <Box component="span" sx={{ fontWeight: 600, color: '#1976d2' }}>Beispiel:</Box> {g.beispiel}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  </Collapse>
                                </Box>
                              );
                            })()}
                          </>
                        ) : null}
                      </Box>
                    </Box>

                    {/* Material – orangefarbener Kasten; Begriffe orange, nicht bold, mit passendem Icon */}
                    {(instructions?.materialliste || isEditing('materialliste')) && (
                      <Box>
                        <Box sx={{ position: 'relative', bgcolor: '#fff3e0', borderRadius: 0, p: 1.5, pr: 5, border: '1px solid #ffb74d', borderBottom: 'none' }}>
                          <Tooltip title="Text bearbeiten">
                            <IconButton size="small" onClick={() => startEdit('materialliste')} sx={{ position: 'absolute', top: 4, right: 4, p: 0.25, minWidth: 28, width: 28, height: 28, color: '#ed6c02', '&:hover': { bgcolor: 'rgba(237, 108, 2, 0.08)' } }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          {isEditing('materialliste') ? (
                            <>
                              <RichTextEditor
                                key={`edit-materialliste-${lessonName}`}
                                value={lessonBoxEdit?.draft ?? ''}
                                onChange={value => setLessonBoxEdit(prev => {
                                if (!prev) return null;
                                // Verhindern, dass der Editor vorhandenen Inhalt mit leerem Wert überschreibt
                                if (!value?.trim() && prev.originalDraft?.trim()) return prev;
                                return { ...prev, draft: value };
                              })}
                                placeholder="Materialliste eingeben..."
                                rows={3}
                                compact={true}
                              />
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                <Button size="small" startIcon={<UndoIcon />} onClick={undoEdit} sx={{ color: '#666' }}>Rückgängig</Button>
                                <Button type="button" size="small" onClick={(e) => { e.preventDefault(); saveEdit(e); }} sx={{ color: '#ed6c02' }}>Fertig</Button>
                              </Box>
                            </>
                          ) : (
                            <Box sx={{ m: 0, pl: 0, color: '#333', fontSize: '1.15rem', lineHeight: 1.75 }}>
                              {(() => {
                                const raw = instructions!.materialliste!;
                                const looksLikeHtml = raw.trim().length > 0 && (/<[a-z][^>]*>/i.test(raw.trim()) || (raw.includes('<') && raw.includes('>')));
                                return looksLikeHtml ? renderTextContent(raw) : renderMaterialListContent(raw);
                              })()}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Lehrer-Anweisungen (ohne Überschrift), AB nur unten – Materialbegriffe (**) orange */}
                    {instructions?.anweisungen && (
                      <Box>
                        <Box sx={{ position: 'relative', bgcolor: '#f1f8e9', borderRadius: 0, p: 2, pr: 5, border: '1px solid #c5e1a5', borderBottom: 'none' }}>
                          <Tooltip title="Text bearbeiten">
                            <IconButton size="small" onClick={() => startEdit('anweisungen')} sx={{ position: 'absolute', top: 4, right: 4, p: 0.25, minWidth: 28, width: 28, height: 28, color: '#2e7d32', '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.08)' } }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          {isEditing('anweisungen') ? (
                            <>
                              <RichTextEditor
                                key={`edit-anweisungen-${lessonName}`}
                                value={lessonBoxEdit?.draft ?? ''}
                                onChange={value => setLessonBoxEdit(prev => {
                                if (!prev) return null;
                                // Verhindern, dass der Editor vorhandenen Inhalt mit leerem Wert überschreibt
                                if (!value?.trim() && prev.originalDraft?.trim()) return prev;
                                return { ...prev, draft: value };
                              })}
                                placeholder="Lehrer-Anweisungen eingeben..."
                                rows={6}
                                compact={true}
                              />
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                <Button size="small" startIcon={<UndoIcon />} onClick={undoEdit} sx={{ color: '#666' }}>Rückgängig</Button>
                                <Button type="button" size="small" onClick={(e) => { e.preventDefault(); saveEdit(e); }} sx={{ color: '#2e7d32' }}>Fertig</Button>
                              </Box>
                            </>
                          ) : (
                            renderTextContent(instructions.anweisungen, '#ed6c02', 1.85, true)
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Die Nachrichten: Klartexte – ausklappbar (Inhalt optional) */}
                    {(instructions && 'geheimtexte' in instructions) || isEditing('geheimtexte') ? (
                      <Box sx={{ pt: 0 }}>
                        <Box sx={{ position: 'relative', bgcolor: '#fafafa', borderRadius: 0, border: '1px solid #e0e0e0', borderBottom: 'none', pr: 5 }}>
                          <Tooltip title="Text bearbeiten">
                            <IconButton size="small" onClick={() => startEdit('geheimtexte')} sx={{ position: 'absolute', top: 4, right: 4, p: 0.25, minWidth: 28, width: 28, height: 28, color: '#616161', '&:hover': { bgcolor: 'rgba(97, 97, 97, 0.08)' } }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          {isEditing('geheimtexte') ? (
                            <Box sx={{ p: 1.5 }}>
                              <RichTextEditor
                                key={`edit-geheimtexte-${lessonName}`}
                                value={lessonBoxEdit?.draft ?? ''}
                                onChange={value => setLessonBoxEdit(prev => {
                                if (!prev) return null;
                                // Verhindern, dass der Editor vorhandenen Inhalt mit leerem Wert überschreibt
                                if (!value?.trim() && prev.originalDraft?.trim()) return prev;
                                return { ...prev, draft: value };
                              })}
                                placeholder="Klartexte eingeben..."
                                rows={6}
                                compact={true}
                              />
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                <Button size="small" startIcon={<UndoIcon />} onClick={undoEdit} sx={{ color: '#666' }}>Rückgängig</Button>
                                <Button type="button" size="small" onClick={(e) => { e.preventDefault(); saveEdit(e); }} sx={{ color: '#616161' }}>Fertig</Button>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              <Box onClick={() => setGeheimtexteOpen(v => !v)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', p: 1.5, '&:hover': { bgcolor: '#f5f5f5' } }}>
                                {geheimtexteOpen ? <ExpandLessIcon sx={{ fontSize: 20, color: '#616161' }} /> : <ExpandMoreIcon sx={{ fontSize: 20, color: '#616161' }} />}
                                <Typography component="span" sx={{ fontWeight: 700, color: '#424242', fontSize: '1.05rem' }}>Die Nachrichten: Klartexte</Typography>
                              </Box>
                              <Collapse in={geheimtexteOpen}>
                                {(() => {
                                  const raw = (instructions as any)?.geheimtexte || '';
                                  const looksLikeHtml = raw.trim().length > 0 && (/<[a-z][^>]*>/i.test(raw.trim()) || (raw.includes('<') && raw.includes('>')));
                                  return looksLikeHtml ? (
                                    <Box sx={{ px: 1.5, pb: 1.5, fontSize: '0.95rem', color: '#333' }} dangerouslySetInnerHTML={{ __html: raw }} />
                                  ) : (
                                    <Box sx={{ px: 1.5, pb: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.95rem', color: '#333' }}>
                                      {raw.trim() || ''}
                                    </Box>
                                  );
                                })()}
                              </Collapse>
                            </>
                          )}
                        </Box>
                      </Box>
                    ) : null}

                    {/* Gemeinsame Übersicht – Leinwand + Freigabe + Präsentieren */}
                    {lessonModalData && (
                      <Box sx={{ pt: 0.75, pb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                            Gemeinsame Übersicht
                          </Typography>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={(lessonSharedInputSharePaths[lessonModalData.groupId] || []).includes(lessonModalData.lessonPath)}
                                onChange={() => toggleLessonSharedInputShare(lessonModalData.groupId, lessonModalData.lessonPath)}
                                sx={{ py: 0, color: '#2e7d32', '&.Mui-checked': { color: '#2e7d32' } }}
                              />
                            }
                            label={<Typography variant="caption" sx={{ color: '#333' }}>Freigeben</Typography>}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<OpenInNewIcon />}
                            onClick={() => window.open(`/shared-overview?groupId=${encodeURIComponent(lessonModalData.groupId)}&lessonPath=${encodeURIComponent(lessonModalData.lessonPath)}`, '_blank')}
                            sx={{ ml: 0.5, color: '#2e7d32', borderColor: '#2e7d32', '&:hover': { borderColor: '#1b5e20', bgcolor: 'rgba(46, 125, 50, 0.08)' } }}
                          >
                            Präsentieren
                          </Button>
                        </Box>
                        <LessonSharedInputBox groupId={lessonModalData.groupId} lessonPath={lessonModalData.lessonPath} />
                      </Box>
                    )}

                    {/* Folien */}
                    {folienFiles.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2', mb: 1, pt: 1 }}>
                          Folien
                        </Typography>
                        <List dense sx={{ bgcolor: '#f5f5f5', borderRadius: 0, py: 0, border: '1px solid #e3f2fd', borderTop: 'none' }}>
                          {groupFilesByBaseName(folienFiles).map(({ baseName, versions }) => {
                            const pdfFile = getPdfFromGroup(versions);
                            const isPdfShared = pdfFile ? !!fileShares[fileShareKey(pdfFile.path, lessonModalData.groupId)] : false;
                            const sortedVersions = [...versions].sort((a, b) => (a.ext.toLowerCase() === 'pdf' ? -1 : b.ext.toLowerCase() === 'pdf' ? 1 : 0));
                            return (
                              <ListItem key={baseName} sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center', display: 'flex' }}>
                                <ListItemIcon sx={{ minWidth: 28 }}>
                                  <DescriptionIcon fontSize="small" sx={{ color: '#1976d2' }} />
                                </ListItemIcon>
                                <ListItemText primary={baseName} primaryTypographyProps={{ fontSize: '0.9rem' }} sx={{ minWidth: 0, flex: '0 1 25%', overflow: 'hidden' }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}>
                                  {sortedVersions.map(({ ext, file }) => (
                                    <Tooltip key={file.path} title={`${ext === 'pdf' ? 'PDF' : ext.toUpperCase()} öffnen`}>
                                      <IconButton size="small" onClick={() => handleFileClick(file)} sx={{ p: 0.25, minWidth: 28, width: 28, height: 28, borderRadius: 1, color: '#1976d2', '&:hover': { bgcolor: 'action.hover' } }}>
                                        {ext === 'pdf' ? <PictureAsPdfIcon sx={{ fontSize: 18 }} /> : <DescriptionIcon sx={{ fontSize: 18 }} />}
                                      </IconButton>
                                    </Tooltip>
                                  ))}
                                  {pdfFile && (
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          size="small"
                                          checked={isPdfShared}
                                          onChange={() => toggleFileShare(pdfFile.path, lessonModalData.groupId)}
                                          sx={{ py: 0 }}
                                        />
                                      }
                                      label={<Typography variant="caption">Freigeben (PDF)</Typography>}
                                    />
                                  )}
                                </Box>
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    )}

                    {/* Arbeitsblatt (AB) – Kasten nur anzeigen, wenn AB-Dateien existieren; sonst leer lassen */}
                    {abFiles.length > 0 && (
                      <Box>
                        {(instructions?.abAnleitung || isEditing('abAnleitung')) && (
                          <Box sx={{ position: 'relative', bgcolor: '#fff8e1', borderRadius: 0, p: 1.5, pr: 5, border: '1px solid #ffe082', borderBottom: 'none' }}>
                            <Tooltip title="Text bearbeiten">
                              <IconButton size="small" onClick={() => startEdit('abAnleitung')} sx={{ position: 'absolute', top: 4, right: 4, p: 0.25, minWidth: 28, width: 28, height: 28, color: '#f57c00', '&:hover': { bgcolor: 'rgba(245, 124, 0, 0.08)' } }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            {isEditing('abAnleitung') ? (
                              <>
                                <RichTextEditor
                                  key={`edit-abAnleitung-${lessonName}`}
                                  value={lessonBoxEdit?.draft ?? ''}
                                  onChange={value => setLessonBoxEdit(prev => {
                                    if (!prev) return null;
                                    if (!value?.trim() && prev.originalDraft?.trim()) return prev;
                                    return { ...prev, draft: value };
                                  })}
                                  placeholder="Arbeitsblatt-Anleitung eingeben..."
                                  rows={4}
                                  compact={true}
                                />
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                  <Button size="small" startIcon={<UndoIcon />} onClick={undoEdit} sx={{ color: '#666' }}>Rückgängig</Button>
                                  <Button type="button" size="small" onClick={(e) => { e.preventDefault(); saveEdit(e); }} sx={{ color: '#f57c00' }}>Fertig</Button>
                                </Box>
                              </>
                            ) : instructions?.abAnleitung ? (
                              renderTextContent(instructions.abAnleitung, '#ed6c02', 1.75, true)
                            ) : null}
                          </Box>
                        )}
                        <List dense sx={{ bgcolor: '#fffde7', borderRadius: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, py: 0, border: '1px solid #ffe082', borderTop: instructions?.abAnleitung ? 'none' : undefined }}>
                            {groupFilesByBaseName(abFiles).map(({ baseName, versions }) => {
                              const pdfFile = getPdfFromGroup(versions);
                              const isPdfShared = pdfFile ? !!fileShares[fileShareKey(pdfFile.path, lessonModalData.groupId)] : false;
                              const sortedVersions = [...versions].sort((a, b) => (a.ext.toLowerCase() === 'pdf' ? -1 : b.ext.toLowerCase() === 'pdf' ? 1 : 0));
                              return (
                                <ListItem key={baseName} sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center', display: 'flex' }}>
                                  <ListItemIcon sx={{ minWidth: 28 }}>
                                    <DescriptionIcon fontSize="small" sx={{ color: '#f57c00' }} />
                                  </ListItemIcon>
                                  <ListItemText primary={baseName} primaryTypographyProps={{ fontSize: '0.9rem' }} sx={{ minWidth: 0, flex: '0 1 25%', overflow: 'hidden' }} />
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}>
                                    {sortedVersions.map(({ ext, file }) => (
                                      <Tooltip key={file.path} title={`${ext === 'pdf' ? 'PDF' : ext.toUpperCase()} öffnen`}>
                                        <IconButton size="small" onClick={() => handleFileClick(file)} sx={{ p: 0.25, minWidth: 28, width: 28, height: 28, borderRadius: 1, color: '#f57c00', '&:hover': { bgcolor: 'action.hover' } }}>
                                          {ext === 'pdf' ? <PictureAsPdfIcon sx={{ fontSize: 18 }} /> : <DescriptionIcon sx={{ fontSize: 18 }} />}
                                        </IconButton>
                                      </Tooltip>
                                    ))}
                                    {pdfFile && (
                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            size="small"
                                            checked={isPdfShared}
                                            onChange={() => toggleFileShare(pdfFile.path, lessonModalData.groupId)}
                                            sx={{ py: 0 }}
                                          />
                                        }
                                        label={<Typography variant="caption">Freigeben (PDF)</Typography>}
                                      />
                                    )}
                                  </Box>
                                </ListItem>
                              );
                            })}
                        </List>
                      </Box>
                    )}

                    {!instructions && folienFiles.length === 0 && abFiles.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Keine Anweisungen oder Dateien für diese Stunde hinterlegt.
                      </Typography>
                    )}
                  </Box>
                );
              })()}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Dialog zum Senden von Nachrichten an Schüler */}
      <Dialog 
        open={showSendMessageDialog} 
        onClose={() => {
          setShowSendMessageDialog(false);
          setMessageSubject('');
          setMessageContent('');
          setSelectedStudentForMessage(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Nachricht senden
          {selectedStudentForMessage && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
              An: {selectedStudentForMessage.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            inputRef={messageSubjectInputRef}
            label="Betreff"
            fullWidth
            value={messageSubject}
            onChange={(e) => setMessageSubject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && messageSubject && messageContent && !sendingMessage) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            margin="normal"
            required
          />
          <TextField
            label="Nachricht"
            fullWidth
            multiline
            rows={6}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
              // Enter sendet die Nachricht (wenn beide Felder ausgefüllt sind)
              if (e.key === 'Enter' && !e.shiftKey && messageSubject && messageContent && !sendingMessage) {
                e.preventDefault();
                handleSendMessage();
              }
              // Shift+Enter erzeugt eine neue Zeile (Standard-Verhalten)
            }}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSendMessageDialog(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSendMessage();
            }}
            variant="contained"
            disabled={!messageSubject || !messageContent || sendingMessage}
            type="button"
            data-send-message-button
          >
            {sendingMessage ? 'Wird gesendet...' : 'Senden'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Kommentar-Dialog für Schüler */}
      <Dialog 
        open={commentModalOpen} 
        onClose={handleCommentClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1
          }
        }}
      >
        <DialogTitle sx={{ pb: 0.5, pt: 1, px: 1.5, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Kommentar für {commentStudentName}
            </Typography>
            <IconButton 
              size="small" 
              onClick={handleCommentClose}
              sx={{ 
                p: 0,
                width: 20,
                height: 20,
                '& svg': {
                  width: '100%',
                  height: '100%'
                }
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5, pt: 1.5 }}>
          <TextField
            inputRef={commentInputRef}
            label="Kommentar"
            fullWidth
            multiline
            rows={6}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              // Strg+Enter oder Cmd+Enter speichert auch im TextField
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleCommentSave();
              }
            }}
            margin="normal"
            placeholder="Kommentar eingeben... (Enter zum Speichern, Strg+Enter im Textfeld)"
            sx={{ mt: 0 }}
          />
          {/* Vordefinierte Schlagworte */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 1, display: 'block' }}>
              Schnellauswahl:
            </Typography>
            
            {/* Materialien/Heft */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.primary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                Materialien/Heft:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {/* Negative Materialien */}
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#d32f2f', fontWeight: 600, mb: 0.5, display: 'block' }}>
                    Negativ:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {['Fehlende HA', 'Fehlendes Material', 'Heft nicht ordentlich geführt'].map((shortcut: string) => {
                      const hasFehlend = shortcut.toLowerCase().includes('fehlend');
                      const parts = shortcut.split(/(fehlend[^,]*)/i);
                      return (
                        <Chip
                          key={shortcut}
                          label={
                            hasFehlend ? (
                              <span>
                                {parts[0]}
                                <strong>{parts[1]}</strong>
                                {parts[2]}
                              </span>
                            ) : shortcut
                          }
                          size="small"
                          onClick={() => {
                            const current = commentText.trim();
                            const newText = current ? `${current}, ${shortcut}` : shortcut;
                            setCommentText(newText);
                            commentInputRef.current?.focus();
                          }}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '24px',
                            cursor: 'pointer',
                            backgroundColor: '#ffebee',
                            color: '#c62828',
                            border: '1px solid #ef9a9a',
                            '&:hover': {
                              backgroundColor: '#ffcdd2',
                              borderColor: '#e57373'
                            },
                            '& .MuiChip-label': {
                              display: 'flex',
                              alignItems: 'center'
                            }
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
                
                {/* Neutrale Materialien */}
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#616161', fontWeight: 600, mb: 0.5, display: 'block' }}>
                    Neutral:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {['HA unvollständig', 'HA probiert aber zu wenig'].map((shortcut: string) => (
                      <Chip
                        key={shortcut}
                        label={shortcut}
                        size="small"
                        onClick={() => {
                          const current = commentText.trim();
                          const newText = current ? `${current}, ${shortcut}` : shortcut;
                          setCommentText(newText);
                          commentInputRef.current?.focus();
                        }}
                        sx={{ 
                          fontSize: '0.65rem',
                          height: '24px',
                          cursor: 'pointer',
                          backgroundColor: '#f5f5f5',
                          color: '#424242',
                          border: '1px solid #bdbdbd',
                          '&:hover': {
                            backgroundColor: '#eeeeee',
                            borderColor: '#9e9e9e'
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
            
            {/* Trennlinie */}
            <Box sx={{ borderTop: '1px solid #e0e0e0', my: 1.5 }} />
            
            {/* Verhalten */}
            <Box>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.primary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                Verhalten:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {/* Negative Verhalten */}
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#d32f2f', fontWeight: 600, mb: 0.5, display: 'block' }}>
                    Negativ:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {/* Unaufmerksamkeit/Konzentration */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['Sehr unaufmerksam', 'Unaufmerksam', 'Verträumt', 'Abgelenkt', 'Nicht konzentriert gearbeitet'].map((shortcut: string) => (
                        <Chip
                          key={shortcut}
                          label={shortcut}
                          size="small"
                          onClick={() => {
                            const current = commentText.trim();
                            const newText = current ? `${current}, ${shortcut}` : shortcut;
                            setCommentText(newText);
                            commentInputRef.current?.focus();
                          }}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '24px',
                            cursor: 'pointer',
                            backgroundColor: '#ffebee',
                            color: '#c62828',
                            border: '1px solid #ef9a9a',
                            '&:hover': {
                              backgroundColor: '#ffcdd2',
                              borderColor: '#e57373'
                            }
                          }}
                        />
                      ))}
                    </Box>
                    {/* Unruhe/Störungen */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['Sehr unruhig', 'Dauernd aufgestanden', 'Reingerufen', 'Häufig Reingerufen', 'Häufig gestört'].map((shortcut: string) => (
                        <Chip
                          key={shortcut}
                          label={shortcut}
                          size="small"
                          onClick={() => {
                            const current = commentText.trim();
                            const newText = current ? `${current}, ${shortcut}` : shortcut;
                            setCommentText(newText);
                            commentInputRef.current?.focus();
                          }}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '24px',
                            cursor: 'pointer',
                            backgroundColor: '#ffebee',
                            color: '#c62828',
                            border: '1px solid #ef9a9a',
                            '&:hover': {
                              backgroundColor: '#ffcdd2',
                              borderColor: '#e57373'
                            }
                          }}
                        />
                      ))}
                    </Box>
                    {/* Gespräche/Störungen */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['Sehr viele geschwätzt', 'Häufig geschwätzt', 'Abgelenkt durch Nachbarn', 'Nachbarn abgelenkt'].map((shortcut: string) => (
                        <Chip
                          key={shortcut}
                          label={shortcut}
                          size="small"
                          onClick={() => {
                            const current = commentText.trim();
                            const newText = current ? `${current}, ${shortcut}` : shortcut;
                            setCommentText(newText);
                            commentInputRef.current?.focus();
                          }}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '24px',
                            cursor: 'pointer',
                            backgroundColor: '#ffebee',
                            color: '#c62828',
                            border: '1px solid #ef9a9a',
                            '&:hover': {
                              backgroundColor: '#ffcdd2',
                              borderColor: '#e57373'
                            }
                          }}
                        />
                      ))}
                    </Box>
                    {/* Aufgaben/Arbeit */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['Früher eingepackt', 'Aufgaben nicht gewissenhaft bearbeitet'].map((shortcut: string) => (
                        <Chip
                          key={shortcut}
                          label={shortcut}
                          size="small"
                          onClick={() => {
                            const current = commentText.trim();
                            const newText = current ? `${current}, ${shortcut}` : shortcut;
                            setCommentText(newText);
                            commentInputRef.current?.focus();
                          }}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '24px',
                            cursor: 'pointer',
                            backgroundColor: '#ffebee',
                            color: '#c62828',
                            border: '1px solid #ef9a9a',
                            '&:hover': {
                              backgroundColor: '#ffcdd2',
                              borderColor: '#e57373'
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
                
                {/* Positive Verhalten */}
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#2e7d32', fontWeight: 600, mb: 0.5, display: 'block' }}>
                    Positiv:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {/* Arbeit/Konzentration */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['Ruhig gearbeitet', 'Sorgfältig gearbeitet', 'Fleißig gearbeitet', 'Sehr konzentriert', 'Bis zum Ende fleißig'].map((shortcut: string) => (
                        <Chip
                          key={shortcut}
                          label={shortcut}
                          size="small"
                          onClick={() => {
                            const current = commentText.trim();
                            const newText = current ? `${current}, ${shortcut}` : shortcut;
                            setCommentText(newText);
                            commentInputRef.current?.focus();
                          }}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '24px',
                            cursor: 'pointer',
                            backgroundColor: '#e8f5e9',
                            color: '#1b5e20',
                            border: '1px solid #81c784',
                            '&:hover': {
                              backgroundColor: '#c8e6c9',
                              borderColor: '#66bb6a'
                            }
                          }}
                        />
                      ))}
                    </Box>
                    {/* Beiträge/Meldungen */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['Gute Fragen gestellt', 'Engagiert mitgedacht', 'Produktive Beiträge', 'Gewinnbringende Meldungen', 'Kreative Antworten'].map((shortcut: string) => (
                        <Chip
                          key={shortcut}
                          label={shortcut}
                          size="small"
                          onClick={() => {
                            const current = commentText.trim();
                            const newText = current ? `${current}, ${shortcut}` : shortcut;
                            setCommentText(newText);
                            commentInputRef.current?.focus();
                          }}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '24px',
                            cursor: 'pointer',
                            backgroundColor: '#e8f5e9',
                            color: '#1b5e20',
                            border: '1px solid #81c784',
                            '&:hover': {
                              backgroundColor: '#c8e6c9',
                              borderColor: '#66bb6a'
                            }
                          }}
                        />
                      ))}
                    </Box>
                    {/* Präsentation */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['Toll präsentiert'].map((shortcut: string) => (
                        <Chip
                          key={shortcut}
                          label={shortcut}
                          size="small"
                          onClick={() => {
                            const current = commentText.trim();
                            const newText = current ? `${current}, ${shortcut}` : shortcut;
                            setCommentText(newText);
                            commentInputRef.current?.focus();
                          }}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '24px',
                            cursor: 'pointer',
                            backgroundColor: '#e8f5e9',
                            color: '#1b5e20',
                            border: '1px solid #81c784',
                            '&:hover': {
                              backgroundColor: '#c8e6c9',
                              borderColor: '#66bb6a'
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 1.5, pb: 1.5, pt: 1 }}>
          <Button onClick={handleCommentClose} size="small" sx={{ fontSize: '0.75rem' }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleCommentSave} 
            variant="contained" 
            size="small" 
            sx={{ fontSize: '0.75rem' }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCommentSave();
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Flashcard Learning Modal für Lehrer */}
      <FlashcardLearningModal
        open={showFlashcardModal}
        onClose={() => {
          setShowFlashcardModal(false);
          setSelectedFlashcardDeck(null);
        }}
        isTeacher={true}
        teacherDeck={selectedFlashcardDeck}
        teacherId={userId}
      />

      {/* Rätseljahr 2026 Übersicht Dialog */}
      <Dialog
        open={showRiddleOverview}
        onClose={() => setShowRiddleOverview(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '95vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#667eea',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 0.75,
          px: 1.5,
          position: 'relative',
          minHeight: 40
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9rem', pr: 4 }}>
            🎊 Rätseljahr 2026 - Übersicht ({RIDDLES.length} Rätsel)
          </Typography>
          <IconButton
            onClick={() => setShowRiddleOverview(false)}
            size="small"
            sx={{ 
              position: 'absolute',
              right: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'white',
              p: 0.25,
              minWidth: 20,
              width: 20,
              height: 20,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 1, px: 2 }}>
          <TableContainer sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', py: 0.5, width: '4%' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', py: 0.5, width: '8%' }}>Typ</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', py: 0.5, width: '20%' }}>Titel</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', py: 0.5, width: '35%' }}>Frage</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', py: 0.5, width: '20%' }}>Tipp</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', py: 0.5, width: '8%' }}>Lösung</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', py: 0.5, width: '5%' }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {RIDDLES.map((riddle) => (
                  <TableRow key={riddle.id} hover>
                    <TableCell sx={{ py: 0.5, fontWeight: 600 }}>#{riddle.id}</TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Chip 
                        label={riddle.type} 
                        size="small" 
                        sx={{ 
                          bgcolor: riddle.type === 'number' ? '#e3f2fd' : 
                                   riddle.type === 'math' ? '#fff3e0' :
                                   riddle.type === 'logic' ? '#f3e5f5' : '#e8f5e9',
                          fontSize: '0.65rem',
                          height: 20
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>{riddle.title}</TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                        {riddle.question.length > 80 ? `${riddle.question.substring(0, 80)}...` : riddle.question}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#856404' }}>
                        {riddle.hint.length > 60 ? `${riddle.hint.substring(0, 60)}...` : riddle.hint}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.5, fontWeight: 700, color: '#2e7d32', fontSize: '0.85rem' }}>
                      {riddle.answer}
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Tooltip 
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                              {riddle.title}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                              <strong>Frage:</strong> {riddle.question}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem', fontStyle: 'italic' }}>
                              <strong>Tipp:</strong> {riddle.hint}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                              <strong>Lösung:</strong> {riddle.answer}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              {riddle.explanation}
                            </Typography>
                          </Box>
                        }
                        arrow
                        placement="left"
                        componentsProps={{
                          tooltip: {
                            sx: {
                              bgcolor: 'rgba(0, 0, 0, 0.9)',
                              maxWidth: 400,
                              fontSize: '0.75rem',
                              p: 1
                            }
                          }
                        }}
                      >
                        <IconButton size="small" sx={{ p: 0.5 }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setShowRiddleOverview(false)} variant="contained" size="small">
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
          textAlign: 'center',
          py: 1.5,
          px: 2,
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ width: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.4rem', flex: 1, textAlign: 'center' }}>
            🎭 Karnevals-Minigames 🎪
          </Typography>
          <IconButton
            onClick={() => setShowCarnivalGames(false)}
            size="small"
            sx={{ 
              color: 'white',
              p: 0.5,
              minWidth: 28,
              width: 28,
              height: 28,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
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

            {/* Karnevals-Lied-Raten */}
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
                  setTimeout(() => setShowSongGuess(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎵
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Karnevals-Lied-Raten
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Rate die Karnevals-Lieder!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Trennlinie für Gruppenspiele */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
                <Typography variant="h6" sx={{ color: 'white', px: 2 }}>
                  👥 Gruppenspiele (für die ganze Klasse)
                </Typography>
              </Divider>
            </Grid>

            {/* Musik-Stopp-Spiel */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 215, 0, 0.95)',
                  borderRadius: 2,
                  border: '2px solid #FFD700',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowGroupConfetti(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎵
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Musik-Stopp-Spiel
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Musik spielt, stoppt, Karte erscheint!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Simon sagt */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 215, 0, 0.95)',
                  borderRadius: 2,
                  border: '2px solid #FFD700',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowGroupMemory(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎭
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Simon sagt
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Wiederholt die Sequenz von Aktionen!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Stille Post */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 215, 0, 0.95)',
                  borderRadius: 2,
                  border: '2px solid #FFD700',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowGroupQuiz(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🤡
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Stille Post
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Flüstert das Wort weiter!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Bewegungs-Challenge */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 215, 0, 0.95)',
                  borderRadius: 2,
                  border: '2px solid #FFD700',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowGroupDice(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎲
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Bewegungs-Challenge
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Musik stoppt, Bewegungsaufgabe!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Karnevalsumzug */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 215, 0, 0.95)',
                  borderRadius: 2,
                  border: '2px solid #FFD700',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowCarnivalParade(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎪
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Karnevalsumzug
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Spielt einen Umzug nach!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Luftschlangen-Spiel */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 215, 0, 0.95)',
                  borderRadius: 2,
                  border: '2px solid #FFD700',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowStreamerGame(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎊
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Luftschlangen-Rhythmus
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Macht zusammen Aktionen zu den Luftschlangen!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Luftballon-Spiel */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  bgcolor: 'rgba(255, 215, 0, 0.95)',
                  borderRadius: 2,
                  border: '2px solid #FFD700',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }
                }}
                onClick={() => {
                  setShowCarnivalGames(false);
                  setTimeout(() => setShowBalloonGame(true), 300);
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" sx={{ mb: 1, fontSize: '3rem' }}>
                    🎈
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FF1493' }}>
                    Luftballon-Pop
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                    Popst die Ballons!
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

      {/* Karnevals-Lied-Raten Game */}
      <SongGuessModal 
        open={showSongGuess} 
        onClose={() => setShowSongGuess(false)} 
      />

      {/* Gruppen-Konfetti-Challenge */}
      <GroupConfettiModal 
        open={showGroupConfetti} 
        onClose={() => setShowGroupConfetti(false)} 
      />

      {/* Gruppen-Memory-Rennen */}
      <GroupMemoryModal 
        open={showGroupMemory} 
        onClose={() => setShowGroupMemory(false)} 
      />

      {/* Gruppen-Quiz-Battle */}
      <GroupQuizModal 
        open={showGroupQuiz} 
        onClose={() => setShowGroupQuiz(false)} 
      />

      {/* Gruppen-Würfel-Challenge */}
      <GroupDiceModal 
        open={showGroupDice} 
        onClose={() => setShowGroupDice(false)} 
      />

      {/* Karnevalsumzug */}
      <CarnivalParadeModal 
        open={showCarnivalParade} 
        onClose={() => setShowCarnivalParade(false)} 
      />

      {/* Luftschlangen-Spiel */}
      <StreamerGameModal 
        open={showStreamerGame} 
        onClose={() => setShowStreamerGame(false)} 
      />

      {/* Luftballon-Spiel */}
      <BalloonGameModal 
        open={showBalloonGame} 
        onClose={() => setShowBalloonGame(false)} 
      />

      {/* Minigame Test Modal für Lehrer */}
      <Dialog
        open={showMinigame}
        onClose={() => {
          if (!gameStarted || gameOver || gameWon) {
            setShowMinigame(false);
            setGameStarted(false);
            setBalloons([]);
            setScore(0);
            setGameTime(60);
            setGameOver(false);
            setGameWon(false);
            keysPressedRef.current.clear();
            setHoldMessage('');
            setGamePaused(false);
            gamePausedRef.current = false;
            setRequiredKey(null);
            pauseStartTimeRef.current = 0;
            totalPausedTimeRef.current = 0;
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
          textAlign: 'center',
          py: 1.25,
          px: 2,
          position: 'relative',
          minHeight: 44,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ width: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.2rem', flex: 1, textAlign: 'center' }}>
            🎮 Minigame Test
          </Typography>
          <IconButton
            onClick={() => {
              if (!gameStarted || gameOver || gameWon) {
                setShowMinigame(false);
                setGameStarted(false);
                setBalloons([]);
                setScore(0);
                setGameTime(60);
                setGameOver(false);
                setGameWon(false);
                keysPressedRef.current.clear();
                setHoldMessage('');
                setGamePaused(false);
                gamePausedRef.current = false;
                setRequiredKey(null);
                pauseStartTimeRef.current = 0;
                totalPausedTimeRef.current = 0;
              }
            }}
            disabled={gameStarted && !gameOver && !gameWon}
            sx={{ 
              width: 28, 
              height: 28, 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          bgcolor: '#fafafa', 
          pt: 4, 
          pb: 3, 
          px: 3,
          overflow: 'hidden'
        }}>
          {!gameStarted ? (
            <>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: '#333',
                  mb: 0.5,
                  fontSize: '1.5rem'
                }}>
                  🎮 Minigame Test
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                  Lehrer-Modus: Wähle den Schwierigkeitsgrad
                </Typography>
              </Box>

              {/* Difficulty Selector */}
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ fontWeight: 600 }}>Schwierigkeitsgrad</InputLabel>
                  <Select
                    value={selectedMinigameDifficulty}
                    onChange={(e) => setSelectedMinigameDifficulty(e.target.value as 'easy' | 'hard')}
                    label="Schwierigkeitsgrad"
                    disabled={gameStarted}
                    sx={{
                      bgcolor: 'white',
                      fontWeight: 600
                    }}
                  >
                    <MenuItem value="easy">🟢 Leicht (F/J)</MenuItem>
                    <MenuItem value="hard">🔴 Schwer (F/J/D/K)</MenuItem>
                  </Select>
                </FormControl>

                {/* Instructions Card */}
                <Paper sx={{ 
                  p: 2.5, 
                  mb: 3, 
                  bgcolor: 'white',
                  borderRadius: 3,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  border: '1px solid #e0e0e0'
                }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1.5, 
                    color: '#1976d2', 
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    📋 Spielregeln
                  </Typography>
                  {selectedMinigameDifficulty === 'easy' ? (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: '#555', fontSize: '0.875rem', lineHeight: 1.7 }}>
                        • Drücke <strong style={{ color: '#1976d2' }}>F</strong> oder <strong style={{ color: '#1976d2' }}>J</strong> kurz, um die Ballons zu fangen
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: '#555', fontSize: '0.875rem', lineHeight: 1.7 }}>
                        • Schaffe es 1 Minute lang, ohne dass ein Ballon den Boden erreicht
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#d32f2f', fontSize: '0.875rem', lineHeight: 1.7, fontWeight: 600 }}>
                        • ⚠️ Wenn ein Ballon den Boden erreicht, ist das Spiel vorbei!
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: '#555', fontSize: '0.875rem', lineHeight: 1.7 }}>
                        • <strong style={{ color: '#FF9800' }}>Beim Start wird zufällig F oder J gewählt - diese Taste muss gedrückt gehalten werden</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: '#555', fontSize: '0.875rem', lineHeight: 1.7 }}>
                        • <strong>Wenn F gewählt wurde:</strong> Halte F gedrückt, dann erscheinen D, J, K Ballons
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: '#555', fontSize: '0.875rem', lineHeight: 1.7 }}>
                        • <strong>Wenn J gewählt wurde:</strong> Halte J gedrückt, dann erscheinen D, F, K Ballons
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: '#555', fontSize: '0.875rem', lineHeight: 1.7 }}>
                        • Drücke <strong style={{ color: '#1976d2' }}>F</strong> kurz für F-Ballons, <strong style={{ color: '#1976d2' }}>J</strong> kurz für J-Ballons
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: '#555', fontSize: '0.875rem', lineHeight: 1.7 }}>
                        • Halte <strong style={{ color: '#1976d2' }}>F</strong> für D-Ballons, <strong style={{ color: '#1976d2' }}>J</strong> für K-Ballons
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: '#d32f2f', fontSize: '0.875rem', lineHeight: 1.7, fontWeight: 600 }}>
                        • ⚠️ <strong>Wichtig:</strong> Wenn die Taste losgelassen wird, stoppen alle Ballons sofort ihre Bewegung!
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#d32f2f', fontSize: '0.875rem', lineHeight: 1.7, fontWeight: 600 }}>
                        • ⚠️ Wenn ein Ballon den Boden erreicht, ist das Spiel vorbei!
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {/* Start Button */}
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setGameStarted(true);
                    setGameTime(60);
                    setScore(0);
                    setBalloons([]);
                    if (selectedMinigameDifficulty === 'hard') {
                      // Zufällig F oder J wählen
                      const randomKey = Math.random() > 0.5 ? 'f' : 'j';
                      setRequiredKey(randomKey);
                      setNextKey(randomKey);
                      setGamePaused(true);
                      gamePausedRef.current = true;
                      pauseStartTimeRef.current = Date.now();
                      totalPausedTimeRef.current = 0;
                      setHoldMessage(`Halte die ${randomKey.toUpperCase()} Taste dauerhaft gedrückt`);
                    } else {
                      setRequiredKey(null);
                      setNextKey(Math.random() > 0.5 ? 'f' : 'j');
                      setGamePaused(false);
                      gamePausedRef.current = false;
                      setHoldMessage('');
                      pauseStartTimeRef.current = 0;
                      totalPausedTimeRef.current = 0;
                    }
                    setGameOver(false);
                    setGameWon(false);
                    setStartTime(Date.now());
                    keysPressedRef.current.clear();
                  }}
                  disabled={gameStarted}
                  sx={{
                    bgcolor: '#FF9800',
                    color: 'white',
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(255, 152, 0, 0.4)',
                    '&:hover': { 
                      bgcolor: '#F57C00',
                      boxShadow: '0 6px 20px rgba(255, 152, 0, 0.5)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                      color: '#666'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  🚀 Spiel starten!
                </Button>
              </Box>
            </>
          ) : null}
          {gameStarted && (
            <>
              {/* Game Stats Bar */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2,
                p: 1.5,
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    bgcolor: '#e3f2fd', 
                    borderRadius: '50%', 
                    width: 32, 
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 700, fontSize: '1rem' }}>
                      ⏱️
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>
                      Zeit
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 700, lineHeight: 1 }}>
                      {gameTime}s
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    bgcolor: '#fff3e0', 
                    borderRadius: '50%', 
                    width: 32, 
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 700, fontSize: '1rem' }}>
                      🎯
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>
                      Punkte
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 700, lineHeight: 1 }}>
                      {score}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Game Area */}
              <Box
                sx={{
                  position: 'relative',
                  height: 450,
                  background: `
                    linear-gradient(180deg, 
                      #87CEEB 0%, #5B9BD5 8%, #4682B4 15%, #20B2AA 25%,
                      #32CD32 35%, #9ACD32 45%, #FFD700 55%, #FFA500 65%,
                      #8B4513 75%, #654321 85%, #2F4F2F 95%, #1C1C1C 100%
                    )
                  `,
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '4px solid #1976d2',
                  mb: 2,
                  boxShadow: 'inset 0 0 80px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.2)',
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
              >
                {/* Große Meldung für Hard-Modus */}
                {holdMessage && selectedMinigameDifficulty === 'hard' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1000,
                      bgcolor: 'rgba(255, 152, 0, 0.98)',
                      color: 'white',
                      px: 5,
                      py: 3,
                      borderRadius: 4,
                      boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 6px rgba(255,255,255,0.3)',
                      border: '5px solid white',
                      animation: 'pulse 1.2s infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { 
                          transform: 'translate(-50%, -50%) scale(1)',
                          boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 6px rgba(255,255,255,0.3)'
                        },
                        '50%': { 
                          transform: 'translate(-50%, -50%) scale(1.08)',
                          boxShadow: '0 16px 64px rgba(0,0,0,0.7), 0 0 0 8px rgba(255,255,255,0.5)'
                        }
                      },
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 900,
                        textAlign: 'center',
                        textShadow: '3px 3px 8px rgba(0,0,0,0.4)',
                        fontSize: '2.5rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {holdMessage}
                    </Typography>
                  </Box>
                )}
                {balloons.map((balloon) => {
                  // Berechne Fall-Distanz - berücksichtige Pause im Hard-Modus
                  let balloonAge: number;
                  if (selectedMinigameDifficulty === 'hard' && gamePausedRef.current && pauseStartTimeRef.current > 0) {
                    // Im Hard-Modus pausiert: Verwende die Zeit bis zur Pause
                    balloonAge = pauseStartTimeRef.current - balloon.spawnTime;
                  } else {
                    // Normal: Alter des Ballons
                    balloonAge = Date.now() - balloon.spawnTime;
                  }
                  
                  const elapsedSeconds = (Date.now() - startTime) / 1000;
                  const baseSpeed = 12;
                  const speedMultiplier = 1 + (elapsedSeconds / 35) * 2;
                  const currentSpeed = baseSpeed / speedMultiplier;
                  const fallDistance = Math.min(balloonAge / currentSpeed, 410);
                  if (!balloon.caught && fallDistance < 410) {
                    return (
                      <Box
                        key={balloon.id}
                        sx={{
                          position: 'absolute',
                          left: `${balloon.x}%`,
                          top: `${fallDistance}px`,
                          zIndex: 10,
                          width: 80,
                          height: 80,
                          marginLeft: '-40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Box sx={{ fontSize: '5rem', position: 'relative' }}>
                          🎈
                          <Typography sx={{
                            fontSize: '2.2rem',
                            fontWeight: 900,
                            color: (balloon.key === 'f' || balloon.key === 'j') ? '#1565C0' : '#FF9800',
                            position: 'absolute',
                            top: '45%',
                            left: '48%',
                            transform: 'translate(-50%, -55%)',
                            fontFamily: '"Courier New", "Roboto Mono", monospace'
                          }}>
                            {balloon.key.toUpperCase()}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }
                  return null;
                })}
              </Box>
            </>
          )}
          {gameWon && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 3, 
              px: 3,
              mt: 2,
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              borderRadius: 3,
              border: '3px solid #4caf50',
              boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)'
            }}>
              <Typography variant="h4" sx={{ mb: 1.5, color: '#2e7d32', fontWeight: 900, fontSize: '2rem' }}>
                🏆 GEWONNEN! 🎉
              </Typography>
              <Box sx={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'white',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <Typography variant="body1" sx={{ color: '#555', fontSize: '1rem' }}>
                  Punkte:
                </Typography>
                <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 700, fontSize: '1.5rem' }}>
                  {score}
              </Typography>
              </Box>
            </Box>
          )}
          {gameOver && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 3, 
              px: 3,
              mt: 2,
              background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
              borderRadius: 3,
              border: '3px solid #d32f2f',
              boxShadow: '0 8px 24px rgba(211, 47, 47, 0.3)'
            }}>
              <Typography variant="h4" sx={{ mb: 1, color: '#c62828', fontWeight: 900, fontSize: '2rem' }}>
                💥 Game Over! 💥
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.9rem' }}>
                Versuche es nochmal!
              </Typography>
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
                setGameOver(false);
                keysPressedRef.current.clear();
              }}
              size="small"
            >
              Beenden
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog 
        open={resetDialogOpen} 
        onClose={() => {
          setResetDialogOpen(false);
          setResetConfirmationText('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          ⚠️ Alle Bewertungen zurücksetzen?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Diese Aktion setzt <strong>alle Bewertungen und Kommentare</strong> für die Gruppe "{participationGroupName}" zurück.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
            Diese Aktion kann nicht rückgängig gemacht werden!
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Geben Sie <strong>"ZURÜCKSETZEN"</strong> ein, um fortzufahren:
          </Typography>
          <TextField
            fullWidth
            autoFocus
            value={resetConfirmationText}
            onChange={(e) => setResetConfirmationText(e.target.value)}
            placeholder="ZURÜCKSETZEN"
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setResetDialogOpen(false);
              setResetConfirmationText('');
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleResetAllParticipations}
            variant="contained"
            color="error"
            disabled={resetConfirmationText !== 'ZURÜCKSETZEN'}
          >
            Alles zurücksetzen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prüfung erstellen Modal */}
      <Dialog
        open={createExaminationModalOpen}
        onClose={() => {
          setCreateExaminationModalOpen(false);
          setExaminationType('QZ');
          setExaminationFileName('');
          setExamDurationMinutes(5);
          setExaminationFolderPath('');
          setExaminationLearningGroupId('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            if (examinationType && examinationFileName.trim() && examinationFolderPath) {
              handleCreateExamination();
            }
          }
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1.5, 
          pt: 2.5, 
          px: 3, 
          borderBottom: '2px solid #e3f2fd',
          bgcolor: '#f5f9ff'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AssignmentIcon sx={{ color: colors.primary, fontSize: 30 }} />
            <Typography variant="h6" sx={{ fontSize: '1.2rem', fontWeight: 600, color: '#1976d2' }}>
              Prüfung erstellen
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box 
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (examinationType && examinationFileName.trim() && examinationFolderPath) {
                handleCreateExamination();
              }
            }}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            {/* Prüfungstyp */}
            <FormControl fullWidth required>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#666', mb: 0.5 }}>
                Prüfungstyp
              </Typography>
              <FormGroup row sx={{ gap: 1 }}>
                {[
                  { value: 'KA', label: 'Klassenarbeit (KA)' },
                  { value: 'KU', label: 'Kursarbeit (KU)' },
                  { value: 'HU', label: 'Hausaufgabenüberprüfung (HU)' },
                  { value: 'QZ', label: 'Quiz (QZ)' }
                ].map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={examinationType === option.value}
                        onChange={() => {
                          const nextType = examinationType === option.value ? '' : (option.value as 'KA' | 'KU' | 'HU' | 'QZ');
                          setExaminationType(nextType);
                          setExamDurationMinutes(getDefaultExamDurationMinutes(nextType));
                        }}
                      />
                    }
                    label={option.label}
                    sx={{ mr: 1 }}
                  />
                ))}
              </FormGroup>
            </FormControl>

            {/* Dateiname / Titel */}
            <TextField
              fullWidth
              required
              autoFocus
              inputRef={examinationFileNameInputRef}
              label="Dateiname / Titel (ohne Präfix und .html)"
              value={examinationFileName}
              onChange={(e) => setExaminationFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (examinationType && examinationFileName.trim() && examinationFolderPath) {
                    handleCreateExamination();
                  }
                }
              }}
              placeholder="z.B. daten-und-zufall"
              helperText={`Der Dateiname wird automatisch mit ${examinationType ? examinationType + '_' : 'Präfix_'} ergänzt`}
            />

            <TextField
              fullWidth
              type="number"
              label="Zeit (Minuten)"
              value={examDurationMinutes}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setExamDurationMinutes(Math.max(1, value));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (examinationType && examinationFileName.trim() && examinationFolderPath) {
                    handleCreateExamination();
                  }
                }
              }}
              inputProps={{ min: 1, step: 1 }}
              helperText="Wird im Timer der Prüfung übernommen"
            />

            {/* Lerngruppe (optional) */}
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#666', mb: 0.5 }}>
                Lerngruppe (optional)
              </Typography>
              <FormGroup row sx={{ gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={examinationLearningGroupId === ''}
                      onChange={() => setExaminationLearningGroupId('')}
                    />
                  }
                  label="Keine Auswahl"
                />
                {groups.map((group) => (
                  <FormControlLabel
                    key={group.id}
                    control={
                      <Checkbox
                        checked={examinationLearningGroupId === group.id}
                        onChange={() =>
                          setExaminationLearningGroupId(examinationLearningGroupId === group.id ? '' : group.id)
                        }
                      />
                    }
                    label={group.name}
                    sx={{ mr: 1 }}
                  />
                ))}
              </FormGroup>
            </FormControl>

            {/* Ordner - Hierarchische Baumstruktur */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>
                Ordner auswählen <span style={{ color: '#d32f2f' }}>*</span>
              </Typography>
              <Box
                sx={{
                  border: '2px solid #e3f2fd',
                  borderRadius: 2,
                  p: 2,
                  maxHeight: 300,
                  overflow: 'auto',
                  bgcolor: '#fafbff',
                  '&:hover': {
                    borderColor: '#90caf9'
                  }
                }}
              >
                {folderTree ? (
                  <Box>
                    {renderFolderTree(folderTree)}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                    <CircularProgress size={24} sx={{ mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                      Lade Ordnerstruktur...
                    </Typography>
                  </Box>
                )}
              </Box>
              {examinationFolderPath && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#1976d2' }}>
                  Ausgewählt: {examinationFolderPath.replace('git-intern/', '')}
                </Typography>
              )}
              {!folderTree && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Keine Ordner gefunden. Bitte erstellen Sie zuerst einen Ordner im Dateisystem-Manager.
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          px: 3, 
          py: 2, 
          borderTop: '2px solid #e3f2fd',
          bgcolor: '#fafafa',
          gap: 1
        }}>
          <Button
            onClick={() => {
              setCreateExaminationModalOpen(false);
              setExaminationType('QZ');
              setExaminationFileName('');
              setExamDurationMinutes(5);
              setExaminationFolderPath('');
              setExaminationLearningGroupId('');
            }}
            sx={{ 
              color: '#666',
              '&:hover': { bgcolor: '#f0f0f0' }
            }}
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            onClick={handleCreateExamination}
            variant="contained"
            disabled={!examinationType || !examinationFileName || !examinationFolderPath}
            sx={{ 
              bgcolor: colors.primary,
              px: 3,
              '&:hover': { bgcolor: '#1565c0' },
              '&:disabled': { bgcolor: '#ccc' }
            }}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Einzelfragen-Bearbeitung Modal */}
      <Dialog
        open={singleQuestionModalOpen}
        onClose={() => {
          if (!savingQuestion && !loadingQuestions && !savingTitle) {
            setSingleQuestionModalOpen(false);
            setSingleQuestionFilePath('');
            setExaminationQuestions([]);
            setExaminationTitle('');
            setEditingQuestion(null);
          }
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1.5, 
          pt: 2.5, 
          px: 3, 
          borderBottom: '2px solid #e3f2fd',
          bgcolor: '#f5f9ff'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EditIcon sx={{ color: colors.primary, fontSize: 30 }} />
            <Typography variant="h6" sx={{ fontSize: '1.2rem', fontWeight: 600, color: '#1976d2' }}>
              Fragen bearbeiten
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {!loadingQuestions && examinationQuestions.length > 0 && (
            <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid #e3f2fd' }}>
              <TextField
                fullWidth
                label="Titel / Dateiname"
                value={examinationTitle}
                onChange={(e) => setExaminationTitle(e.target.value)}
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              <Button
                onClick={handleSaveTitle}
                variant="contained"
                disabled={savingTitle || !examinationTitle.trim()}
                size="small"
                sx={{
                  bgcolor: colors.primary,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: '#1565c0'
                  },
                  '&:disabled': {
                    bgcolor: '#ccc'
                  }
                }}
              >
                {savingTitle ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                    Speichere...
                  </>
                ) : (
                  'Titel speichern'
                )}
              </Button>
            </Box>
          )}
          {loadingQuestions ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ color: '#666' }}>
                Lade Fragen...
              </Typography>
            </Box>
          ) : examinationQuestions.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                Keine Fragen gefunden. Bitte generieren Sie zuerst Inhalte für diese Prüfung.
              </Typography>
            </Alert>
          ) : editingQuestion ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ 
                bgcolor: '#f5f9ff', 
                p: 2, 
                borderRadius: 2, 
                border: '2px solid #e3f2fd',
                mb: 1
              }}>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#1976d2' }}>
                  Aufgabe {editingQuestion.taskNumber} bearbeiten
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                  {editingQuestion.questionType === 'multiple-choice' ? 'Multiple Choice' : 'Textantwort'}
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                label="Fragentext"
                value={editingQuestion.questionText}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                multiline
                rows={3}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              
              {editingQuestion.questionType === 'multiple-choice' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#333', mt: 1 }}>
                    Antwortoptionen:
                  </Typography>
                  {editingQuestion.options.map((option: string, index: number) => (
                    <TextField
                      key={index}
                      fullWidth
                      label={`Option ${String.fromCharCode(65 + index)}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editingQuestion.options];
                        newOptions[index] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                      }}
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  ))}
                  
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Richtige Antwort</InputLabel>
                    <Select
                      value={editingQuestion.correctAnswer || ''}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
                      label="Richtige Antwort"
                      sx={{
                        borderRadius: 2
                      }}
                    >
                      {editingQuestion.options.map((_: string, index: number) => (
                        <MenuItem key={index} value={String.fromCharCode(65 + index)}>
                          {String.fromCharCode(65 + index)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
              
              <TextField
                fullWidth
                label="Erklärung / Musterlösung"
                value={editingQuestion.explanation || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                multiline
                rows={4}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              
              <Box sx={{ display: 'flex', gap: 1.5, mt: 2, justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => setEditingQuestion(null)}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    borderColor: '#ccc',
                    color: '#666',
                    '&:hover': {
                      borderColor: '#999',
                      bgcolor: '#f5f5f5'
                    }
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => handleSaveQuestion(editingQuestion)}
                  variant="contained"
                  disabled={savingQuestion || !editingQuestion.questionText.trim()}
                  sx={{ 
                    bgcolor: colors.primary,
                    borderRadius: 2,
                    px: 3,
                    '&:hover': { 
                      bgcolor: '#1565c0' 
                    },
                    '&:disabled': {
                      bgcolor: '#ccc'
                    }
                  }}
                >
                  {savingQuestion ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                      Speichere...
                    </>
                  ) : (
                    'Speichern'
                  )}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {examinationQuestions.map((question) => (
                <Card
                  key={question.taskNumber}
                  sx={{
                    border: '2px solid #e3f2fd',
                    borderRadius: 2,
                    bgcolor: '#fafbff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      borderColor: '#90caf9'
                    }
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: '#1976d2', mb: 0.5 }}>
                          Aufgabe {question.taskNumber}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                          {question.questionType === 'multiple-choice' ? 'Multiple Choice' : 'Textantwort'}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => setEditingQuestion({ ...question })}
                        sx={{
                          bgcolor: colors.primary,
                          color: 'white',
                          p: 0.5,
                          minWidth: 28,
                          width: 28,
                          height: 28,
                          borderRadius: 1.5,
                          '&:hover': {
                            bgcolor: '#1565c0'
                          }
                        }}
                        title="Bearbeiten"
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2, color: '#333', lineHeight: 1.6 }}>
                      {question.questionText}
                    </Typography>
                    {question.questionType === 'multiple-choice' && question.options.length > 0 && (
                      <Box sx={{ 
                        bgcolor: '#f5f5f5', 
                        p: 2, 
                        borderRadius: 2,
                        border: '1px solid #e0e0e0'
                      }}>
                        {question.options.map((option: string, index: number) => (
                          <Typography 
                            key={index} 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.9rem', 
                              mb: 0.5,
                              fontWeight: question.correctAnswer === String.fromCharCode(65 + index) ? 600 : 400,
                              color: question.correctAnswer === String.fromCharCode(65 + index) ? '#2e7d32' : '#555'
                            }}
                          >
                            <strong>{String.fromCharCode(65 + index)}:</strong> {option}
                            {question.correctAnswer === String.fromCharCode(65 + index) && (
                              <span style={{ marginLeft: 8, color: '#2e7d32' }}>✓</span>
                            )}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};


export default TeacherDashboard; 