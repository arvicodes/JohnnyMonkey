import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
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
  LocalRestaurant as LocalRestaurantIcon,
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
  LocalSchool as LocalSchoolIcon,
  LocalUniversity as LocalUniversityIcon,
  LocalMall as LocalMallIcon,
  LocalTheater as LocalTheaterIcon,
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
  LocalTraffic as LocalTrafficIcon,
  LocalUtility as LocalUtilityIcon,
  LocalWorkspacePremium as LocalWorkspacePremiumIcon,
  LocalZone as LocalZoneIcon,
  School as SchoolIcon,
  Book as BookIcon,
  Topic as TopicIcon,
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
  VolumeMute as VolumeMuteIcon
} from '@mui/icons-material';

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

interface LearningGroup {
  id: string;
  name: string;
}

export const LearningGroupPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [group, setGroup] = useState<LearningGroup | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentDetails, setAssignmentDetails] = useState<any[]>([]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const fetchGroupDetails = async () => {
    try {
      const response = await fetch(`/api/learning-groups/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGroup(data);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/learning-groups/${id}/assignments`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Hilfsfunktion: Hole den Namen für einen Assignment-Typ und eine refId
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

  // Lade Details (Namen) zu allen Assignments
  useEffect(() => {
    if (assignments.length === 0) {
      setAssignmentDetails([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const details = await Promise.all(assignments.map(async (a) => {
        const name = await fetchNameForAssignment(a.type, a.refId);
        return { ...a, name };
      }));
      if (!cancelled) setAssignmentDetails(details);
    })();
    return () => { cancelled = true; };
  }, [assignments]);

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
      fetchAssignments();
    }
  }, [id]);

  if (!group) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              color="inherit"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Link>
            <Typography color="text.primary">{group.name}</Typography>
          </Breadcrumbs>
        </Box>
        <Typography variant="h4" component="h1">
          {group.name}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="group tabs">
          <Tab label="Übersicht" />
          <Tab label="Notenschemata" />
          <Tab label="Schüler" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography>Übersicht der Lerngruppe</Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography variant="h6">Zugeordnete Inhalte aus „Meine Fächer“</Typography>
            {assignmentDetails.length === 0 && <Typography>Keine Inhalte zugeordnet.</Typography>}
            {assignmentDetails.length > 0 && (
              <Box>
                {['subject', 'block', 'unit', 'topic', 'lesson'].map(type => {
                  const items = assignmentDetails.filter(a => a.type === type);
                  if (items.length === 0) return null;
                  let label = '';
                  if (type === 'subject') label = 'Fächer';
                  if (type === 'block') label = 'Blöcke';
                  if (type === 'unit') label = 'Units';
                  if (type === 'topic') label = 'Themen';
                  if (type === 'lesson') label = 'Stunden';
                  return (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>{label}</Typography>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {items.map(a => (
                          a.name === 'Ein einfacher Einstieg' ? (
                            <li key={a.type + a.refId}>
                              <a
                                href="/material/3D-Druck-Intro.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                {a.name}
                              </a>
                            </li>
                          ) : (
                            <li key={a.type + a.refId}>{a.name || a.refId}</li>
                          )
                        ))}
                      </ul>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <GradingSchemaManager groupId={id!} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography variant="h6">Schülerliste</Typography>
            {/* Hier könnte eine echte Schülerliste stehen */}
            <Typography variant="body2" color="text.secondary">(Platzhalter für Schülerliste)</Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography variant="h6">Zugeordnete Inhalte</Typography>
            {assignmentDetails.length === 0 && <Typography>Keine Inhalte zugeordnet.</Typography>}
            {assignmentDetails.length > 0 && (
              <Box>
                {['subject', 'block', 'unit', 'topic', 'lesson'].map(type => {
                  const items = assignmentDetails.filter(a => a.type === type);
                  if (items.length === 0) return null;
                  let label = '';
                  if (type === 'subject') label = 'Fächer';
                  if (type === 'block') label = 'Blöcke';
                  if (type === 'unit') label = 'Units';
                  if (type === 'topic') label = 'Themen';
                  if (type === 'lesson') label = 'Stunden';
                  return (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>{label}</Typography>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {items.map(a => (
                          a.name === 'Ein einfacher Einstieg' ? (
                            <li key={a.type + a.refId}>
                              <a
                                href="/material/3D-Druck-Intro.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                {a.name}
                              </a>
                            </li>
                          ) : (
                            <li key={a.type + a.refId}>{a.name || a.refId}</li>
                          )
                        ))}
                      </ul>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}; 