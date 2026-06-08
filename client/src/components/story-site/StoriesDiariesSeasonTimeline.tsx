import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteOutlineIcon,
  Lock as LockIcon,
  ArrowDropDown as ArrowDropDownIcon,
  AcUnit as AcUnitIcon,
  LocalFlorist as LocalFloristIcon,
  WbSunny as WbSunnyIcon,
  Park as ParkIcon,
} from '@mui/icons-material';
import type { StorySite } from '../../lib/storySitesStorage';
import {
  STORY_SITE_CATEGORIES,
  MONTH_LABELS,
  TIMELINE_CATEGORY_COLUMNS,
  resolveStorySiteCategory,
  getStorySiteCategoryDef,
  getCategoryTimelineColumnIndex,
  getSiteTimelineIsoDate,
  groupSitesByYearAndMonth,
  getMonthSeason,
  TIMELINE_SEASON_META,
  type StorySiteCategoryId,
  type TimelineSeasonId,
} from '../../lib/storySiteCategories';
import { formatIsoDateDe } from '../../lib/storyPageDate';
import { STORY_SCRAPBOOK_BG } from '../../lib/storyPageLayout';

export const TIMELINE_GRID_COLUMNS =
  'minmax(0, 1fr) minmax(0, 1fr) 72px minmax(0, 1fr) minmax(0, 1fr)';

const TIMELINE_MAX_WIDTH = 1000;
const CARD_MAX_WIDTH = 148;
const EMPTY_MONTH_HEIGHT = 56;
const MIN_MONTH_ROW_HEIGHT = 56;

/** Mittlere Spalten leicht zur Achse, äußere an den Seiten. */
const COLUMN_LAYOUT: Record<
  0 | 1 | 3 | 4,
  { alignItems: 'flex-start' | 'flex-end'; cardAlign: 'left' | 'right'; px: number }
> = {
  0: { alignItems: 'flex-start', cardAlign: 'left', px: 0.35 },
  1: { alignItems: 'flex-end', cardAlign: 'right', px: 0.5 },
  3: { alignItems: 'flex-start', cardAlign: 'left', px: 0.5 },
  4: { alignItems: 'flex-end', cardAlign: 'right', px: 0.35 },
};

const SEASON_ICONS: Record<TimelineSeasonId, typeof AcUnitIcon> = {
  winter: AcUnitIcon,
  spring: LocalFloristIcon,
  summer: WbSunnyIcon,
  autumn: ParkIcon,
};

function MonthAxisCell({ month }: { month: number }) {
  const season = getMonthSeason(month);
  const meta = TIMELINE_SEASON_META[season];
  const SeasonIcon = SEASON_ICONS[season];

  return (
    <Tooltip title={`${MONTH_LABELS[month - 1]} · ${meta.label}`} placement="right">
      <Box
        sx={{
          gridColumn: 3,
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.3,
          bgcolor: meta.axisBg,
          borderLeft: `1px solid ${meta.axisBorder}`,
          borderRight: `1px solid ${meta.axisBorder}`,
          minHeight: MIN_MONTH_ROW_HEIGHT,
          py: 0.75,
          px: 0.25,
        }}
      >
        <SeasonIcon sx={{ fontSize: 17, color: meta.iconColor, opacity: 0.85 }} aria-hidden />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.64rem',
            color: 'rgba(78, 52, 46, 0.75)',
            letterSpacing: '0.03em',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          {MONTH_LABELS[month - 1]}
        </Typography>
      </Box>
    </Tooltip>
  );
}

type StoriesDiariesSeasonTimelineProps = {
  sites: StorySite[];
  editable?: boolean;
  urlaubUnlocked?: boolean;
  hiddenUrlaubCount?: number;
  onOpenSite: (id: string) => void;
  onOpenPreview?: (id: string, e: React.MouseEvent) => void;
  onOpenEditor?: (id: string) => void;
  onDeleteSite?: (id: string, e: React.MouseEvent) => void;
  onCategoryChange?: (id: string, category: StorySiteCategoryId) => void;
  onRequestUrlaubUnlock?: () => void;
};

function CategoryColumnHeader() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: TIMELINE_GRID_COLUMNS,
        columnGap: 1,
        mb: 0.75,
        width: '100%',
      }}
    >
      {TIMELINE_CATEGORY_COLUMNS.map((id) => {
        const cat = getStorySiteCategoryDef(id);
        const col = getCategoryTimelineColumnIndex(id);
        const gridColumn = col + 1;
        const inward = col === 1 || col === 3;
        return (
          <Box
            key={id}
            sx={{
              gridColumn,
              textAlign: 'center',
              minWidth: 0,
              display: 'flex',
              justifyContent: inward ? (col === 1 ? 'flex-end' : 'flex-start') : col === 0 ? 'flex-start' : 'flex-end',
              px: inward ? 0.35 : 0,
            }}
          >
            <Chip
              label={cat.shortLabel}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: cat.bg,
                color: cat.text,
                border: `1px solid ${cat.border}`,
                maxWidth: '100%',
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

type TimelineSiteCardProps = {
  site: StorySite;
  editable?: boolean;
  showActions: boolean;
  align: 'left' | 'right';
  onOpenSite: (id: string) => void;
  onOpenPreview?: (id: string, e: React.MouseEvent) => void;
  onOpenEditor?: (id: string) => void;
  onDeleteSite?: (id: string, e: React.MouseEvent) => void;
  onCategoryChange?: (id: string, category: StorySiteCategoryId) => void;
};

function TimelineSiteCard({
  site,
  editable,
  showActions,
  align,
  onOpenSite,
  onOpenPreview,
  onOpenEditor,
  onDeleteSite,
  onCategoryChange,
}: TimelineSiteCardProps) {
  const categoryId = resolveStorySiteCategory(site);
  const category = getStorySiteCategoryDef(categoryId);
  const dateLabel = formatIsoDateDe(getSiteTimelineIsoDate(site));
  const [catAnchor, setCatAnchor] = useState<HTMLElement | null>(null);

  return (
    <Paper
      elevation={0}
      onClick={() => onOpenSite(site.id)}
      sx={{
        width: '100%',
        maxWidth: CARD_MAX_WIDTH,
        ml: align === 'right' ? 'auto' : 0,
        mr: align === 'left' ? 'auto' : 0,
        cursor: 'pointer',
        borderRadius: 1.25,
        border: `1px solid ${category.border}`,
        bgcolor: 'rgba(255,255,255,0.75)',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease',
        ...(align === 'right'
          ? { borderRight: `2px solid ${category.color}` }
          : { borderLeft: `2px solid ${category.color}` }),
        '&:hover': { boxShadow: '0 2px 8px rgba(93, 64, 55, 0.1)' },
      }}
    >
      <Box sx={{ px: 0.9, py: 0.6 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.74rem',
            color: category.text,
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {site.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontSize: '0.6rem', mt: 0.15 }}
          noWrap
        >
          {dateLabel}
        </Typography>
      </Box>

      {showActions || (editable && onCategoryChange) ? (
        <Stack
          direction="row"
          spacing={0}
          justifyContent="flex-end"
          sx={{
            px: 0.25,
            py: 0.15,
            borderTop: `1px solid rgba(93, 64, 55, 0.1)`,
            bgcolor: 'rgba(255,255,255,0.5)',
            minHeight: 18,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {editable && onCategoryChange ? (
            <>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setCatAnchor(e.currentTarget);
                }}
                sx={{ p: 0.2, color: category.text }}
                aria-label="Kategorie"
              >
                <ArrowDropDownIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Menu anchorEl={catAnchor} open={Boolean(catAnchor)} onClose={() => setCatAnchor(null)}>
                {STORY_SITE_CATEGORIES.map((c) => (
                  <MenuItem
                    key={c.id}
                    selected={c.id === categoryId}
                    onClick={() => {
                      onCategoryChange(site.id, c.id);
                      setCatAnchor(null);
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color }} />
                    </ListItemIcon>
                    <ListItemText primary={c.label} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : null}
          {onOpenPreview ? (
            <IconButton size="small" onClick={(e) => onOpenPreview(site.id, e)} sx={{ p: 0.2 }}>
              <OpenInNewIcon sx={{ fontSize: 12 }} />
            </IconButton>
          ) : null}
          {onOpenEditor ? (
            <IconButton size="small" onClick={() => onOpenEditor(site.id)} sx={{ p: 0.2 }}>
              <EditIcon sx={{ fontSize: 12 }} />
            </IconButton>
          ) : null}
          {onDeleteSite ? (
            <IconButton size="small" color="error" onClick={(e) => onDeleteSite(site.id, e)} sx={{ p: 0.2 }}>
              <DeleteOutlineIcon sx={{ fontSize: 12 }} />
            </IconButton>
          ) : null}
        </Stack>
      ) : null}
    </Paper>
  );
}

function MonthRow({
  month,
  monthSites,
  editable,
  showActions,
  onOpenSite,
  onOpenPreview,
  onOpenEditor,
  onDeleteSite,
  onCategoryChange,
}: {
  month: number;
  monthSites: StorySite[];
  editable?: boolean;
  showActions: boolean;
  onOpenSite: (id: string) => void;
  onOpenPreview?: (id: string, e: React.MouseEvent) => void;
  onOpenEditor?: (id: string) => void;
  onDeleteSite?: (id: string, e: React.MouseEvent) => void;
  onCategoryChange?: (id: string, category: StorySiteCategoryId) => void;
}) {
  const byColumn = useMemo(() => {
    const map = new Map<0 | 1 | 3 | 4, StorySite[]>();
    for (const col of [0, 1, 3, 4] as const) map.set(col, []);
    for (const site of monthSites) {
      const col = getCategoryTimelineColumnIndex(resolveStorySiteCategory(site));
      map.get(col)!.push(site);
    }
    return map;
  }, [monthSites]);

  const hasEntries = monthSites.length > 0;
  const season = getMonthSeason(month);
  const seasonMeta = TIMELINE_SEASON_META[season];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: TIMELINE_GRID_COLUMNS,
        columnGap: 1,
        alignItems: 'stretch',
        width: '100%',
        minHeight: hasEntries ? MIN_MONTH_ROW_HEIGHT : EMPTY_MONTH_HEIGHT,
        borderBottom: '1px solid rgba(93, 64, 55, 0.08)',
        bgcolor: hasEntries ? seasonMeta.rowBg : seasonMeta.emptyRowBg,
      }}
    >
      {([0, 1, 3, 4] as const).map((col) => {
        const layout = COLUMN_LAYOUT[col];
        return (
        <Box
          key={col}
          sx={{
            gridColumn: col + 1,
            alignSelf: 'stretch',
            py: hasEntries ? 0.6 : 0.5,
            px: layout.px,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            alignItems: layout.alignItems,
            justifyContent: 'center',
          }}
        >
          {(byColumn.get(col) ?? []).map((site) => (
            <TimelineSiteCard
              key={site.id}
              site={site}
              editable={editable}
              showActions={showActions}
              align={layout.cardAlign}
              onOpenSite={onOpenSite}
              onOpenPreview={onOpenPreview}
              onOpenEditor={onOpenEditor}
              onDeleteSite={onDeleteSite}
              onCategoryChange={onCategoryChange}
            />
          ))}
        </Box>
        );
      })}

      <MonthAxisCell month={month} />
    </Box>
  );
}

function YearTimelineSection({
  year,
  monthsMap,
  editable,
  onOpenSite,
  onOpenPreview,
  onOpenEditor,
  onDeleteSite,
  onCategoryChange,
}: {
  year: number;
  monthsMap: Map<number, StorySite[]>;
  editable?: boolean;
  onOpenSite: (id: string) => void;
  onOpenPreview?: (id: string, e: React.MouseEvent) => void;
  onOpenEditor?: (id: string) => void;
  onDeleteSite?: (id: string, e: React.MouseEvent) => void;
  onCategoryChange?: (id: string, category: StorySiteCategoryId) => void;
}) {
  const showActions = Boolean(editable || onDeleteSite || onOpenPreview || onOpenEditor);
  const entryCount = useMemo(
    () => [...monthsMap.values()].reduce((n, list) => n + list.length, 0),
    [monthsMap],
  );

  return (
    <Box sx={{ mb: 5, width: '100%' }}>
      <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 1.25, px: { xs: 1, sm: 1.5 }, maxWidth: TIMELINE_MAX_WIDTH, mx: 'auto', width: '100%' }}>
        <Typography
          sx={{
            fontFamily: '"Segoe Script", "Snell Roundhand", "Bradley Hand", cursive',
            fontWeight: 700,
            fontSize: { xs: '1.35rem', sm: '1.6rem' },
            color: '#4e342e',
          }}
        >
          {year}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {entryCount} {entryCount === 1 ? 'Eintrag' : 'Einträge'}
        </Typography>
      </Stack>

      <Box sx={{ px: { xs: 0.75, sm: 1 }, maxWidth: TIMELINE_MAX_WIDTH, mx: 'auto', width: '100%' }}>
        <CategoryColumnHeader />
        <Box
          sx={{
            border: '1px solid rgba(93, 64, 55, 0.14)',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'rgba(255,255,255,0.45)',
          }}
        >
          {MONTH_LABELS.map((_, i) => {
            const month = i + 1;
            return (
              <MonthRow
                key={month}
                month={month}
                monthSites={monthsMap.get(month) ?? []}
                editable={editable}
                showActions={showActions}
                onOpenSite={onOpenSite}
                onOpenPreview={onOpenPreview}
                onOpenEditor={onOpenEditor}
                onDeleteSite={onDeleteSite}
                onCategoryChange={onCategoryChange}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export function StoriesDiariesSeasonTimeline({
  sites,
  editable,
  urlaubUnlocked,
  hiddenUrlaubCount = 0,
  onOpenSite,
  onOpenPreview,
  onOpenEditor,
  onDeleteSite,
  onCategoryChange,
  onRequestUrlaubUnlock,
}: StoriesDiariesSeasonTimelineProps) {
  const sitesByYearMonth = useMemo(() => groupSitesByYearAndMonth(sites), [sites]);
  const years = useMemo(() => [...sitesByYearMonth.keys()], [sitesByYearMonth]);

  return (
    <Box sx={{ width: '100%' }}>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={0.75}
        sx={{ mb: 2, gap: 0.75, px: { xs: 1, sm: 1.5 }, maxWidth: TIMELINE_MAX_WIDTH, mx: 'auto', width: '100%' }}
      >
        {TIMELINE_CATEGORY_COLUMNS.map((id) => {
          const cat = getStorySiteCategoryDef(id);
          return (
            <Chip
              key={cat.id}
              label={cat.label}
              size="small"
              sx={{
                bgcolor: cat.bg,
                color: cat.text,
                border: `1px solid ${cat.border}`,
                fontWeight: 700,
                fontSize: '0.72rem',
                height: 24,
              }}
            />
          );
        })}
      </Stack>

      {!urlaubUnlocked && hiddenUrlaubCount > 0 && onRequestUrlaubUnlock ? (
        <Paper
          elevation={0}
          sx={{
            mb: 2.5,
            mx: { xs: 1, sm: 1.5 },
            p: 1.5,
            borderRadius: 2,
            border: '1px dashed rgba(0, 137, 123, 0.45)',
            bgcolor: 'rgba(0, 137, 123, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <LockIcon sx={{ color: '#00695c', fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: '#00695c', fontWeight: 600 }}>
              {hiddenUrlaubCount} Urlaubs-Eintr{hiddenUrlaubCount === 1 ? 'ag' : 'äge'} ausgeblendet
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            onClick={onRequestUrlaubUnlock}
            sx={{
              textTransform: 'none',
              borderColor: '#00897b',
              color: '#00695c',
              '&:hover': { borderColor: '#00695c', bgcolor: 'rgba(0, 137, 123, 0.08)' },
            }}
          >
            Freischalten
          </Button>
        </Paper>
      ) : null}

      {years.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mx: { xs: 1, sm: 1.5 },
            textAlign: 'center',
            borderRadius: 3,
            border: '1px dashed rgba(93, 64, 55, 0.25)',
            background: STORY_SCRAPBOOK_BG,
          }}
        >
          <Typography color="text.secondary">Noch keine Einträge in der Timeline.</Typography>
        </Paper>
      ) : (
        <Box sx={{ width: '100%' }}>
          {years.map((year) => (
            <YearTimelineSection
              key={year}
              year={year}
              monthsMap={sitesByYearMonth.get(year) ?? new Map()}
              editable={editable}
              onOpenSite={onOpenSite}
              onOpenPreview={onOpenPreview}
              onOpenEditor={onOpenEditor}
              onDeleteSite={onDeleteSite}
              onCategoryChange={onCategoryChange}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
