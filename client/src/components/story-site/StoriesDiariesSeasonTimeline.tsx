import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
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
  getSiteTimelineDay,
  getSiteTimelineDayFraction,
  groupSitesByYearAndMonth,
  getMonthSeason,
  TIMELINE_SEASON_META,
  type StorySiteCategoryId,
  type TimelineSeasonId,
} from '../../lib/storySiteCategories';
import { formatIsoDateDe } from '../../lib/storyPageDate';
import { STORY_SCRAPBOOK_BG, STORY_TIMELINE_MAX_WIDTH } from '../../lib/storyPageLayout';

export const TIMELINE_MAX_WIDTH = STORY_TIMELINE_MAX_WIDTH;
const TIMELINE_AXIS_WIDTH = 80;
const CARD_MAX_WIDTH = 168;
const EMPTY_MONTH_HEIGHT = 62;
const MIN_MONTH_ROW_HEIGHT = 62;
const MAX_DAY_HORIZONTAL_OFFSET = 52;

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
  const label = `${MONTH_LABELS[month - 1]} · ${meta.label}`;

  return (
    <Box
      title={label}
      aria-label={label}
      sx={{
        width: TIMELINE_AXIS_WIDTH,
        flexShrink: 0,
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0.4,
        background: meta.axisBg,
        borderLeft: `1.5px solid ${meta.axisBorder}`,
        borderRight: `1.5px solid ${meta.axisBorder}`,
        py: 0.75,
        px: 0.35,
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: meta.iconRing,
          border: `1px solid ${meta.axisBorder}`,
          flexShrink: 0,
        }}
      >
        <SeasonIcon sx={{ fontSize: 18, color: meta.iconColor }} aria-hidden />
      </Box>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.68rem',
          color: meta.iconColor,
          letterSpacing: '0.04em',
          lineHeight: 1.1,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {MONTH_LABELS[month - 1]}
      </Typography>
    </Box>
  );
}

function CategoryHeaderLabel({ categoryId }: { categoryId: StorySiteCategoryId }) {
  const cat = getStorySiteCategoryDef(categoryId);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 0,
        py: 0.25,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.4,
          borderRadius: 1,
          bgcolor: cat.bg,
          border: `1px solid ${cat.border}`,
          boxShadow: `0 1px 4px ${cat.border}`,
        }}
      >
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cat.color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: cat.text, lineHeight: 1 }}>
          {cat.shortLabel}
        </Typography>
      </Box>
    </Box>
  );
}

/** Kopfzeile mit Kategorie-Labels — gleiches Flex-Raster wie die Monatszeilen. */
function TimelineCategoryHeader({ year }: { year: number }) {
  const leftCategories = TIMELINE_CATEGORY_COLUMNS.filter((id) => getCategoryTimelineColumnIndex(id) <= 1);
  const rightCategories = TIMELINE_CATEGORY_COLUMNS.filter((id) => getCategoryTimelineColumnIndex(id) >= 3);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        width: '100%',
        px: 0.25,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 1,
          alignItems: 'center',
        }}
      >
        {leftCategories.map((id) => (
          <CategoryHeaderLabel key={id} categoryId={id} />
        ))}
      </Box>
      <Box
        sx={{
          width: TIMELINE_AXIS_WIDTH,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(250, 246, 238, 0.85)',
          borderLeft: '1.5px solid rgba(93, 64, 55, 0.12)',
          borderRight: '1.5px solid rgba(93, 64, 55, 0.12)',
          minHeight: 28,
          py: 0.5,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Segoe Script", "Snell Roundhand", "Bradley Hand", cursive',
            fontWeight: 700,
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
            color: '#4e342e',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          {year}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 1,
          alignItems: 'center',
        }}
      >
        {rightCategories.map((id) => (
          <CategoryHeaderLabel key={id} categoryId={id} />
        ))}
      </Box>
    </Box>
  );
}

function temporalCardOffsetSx(col: 0 | 1 | 3 | 4, dayFraction: number) {
  const isLeft = col <= 1;
  if (isLeft) {
    return { ml: `${dayFraction * MAX_DAY_HORIZONTAL_OFFSET}px` };
  }
  return { mr: `${(1 - dayFraction) * MAX_DAY_HORIZONTAL_OFFSET}px` };
}

function MonthSideColumns({
  columns,
  byColumn,
  year,
  month,
  editable,
  showActions,
  onOpenSite,
  onOpenPreview,
  onOpenEditor,
  onDeleteSite,
  onCategoryChange,
  py,
}: {
  columns: readonly (0 | 1 | 3 | 4)[];
  byColumn: Map<0 | 1 | 3 | 4, StorySite[]>;
  year: number;
  month: number;
  editable?: boolean;
  showActions: boolean;
  onOpenSite: (id: string) => void;
  onOpenPreview?: (id: string, e: React.MouseEvent) => void;
  onOpenEditor?: (id: string) => void;
  onDeleteSite?: (id: string, e: React.MouseEvent) => void;
  onCategoryChange?: (id: string, category: StorySiteCategoryId) => void;
  py: number;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: 1,
        py,
        px: 0.25,
        alignSelf: 'stretch',
      }}
    >
      {columns.map((col) => {
        const layout = COLUMN_LAYOUT[col];
        const sites = [...(byColumn.get(col) ?? [])].sort((a, b) =>
          getSiteTimelineIsoDate(a).localeCompare(getSiteTimelineIsoDate(b)),
        );

        return (
          <Box
            key={col}
            sx={{
              minWidth: 0,
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: layout.alignItems,
              justifyContent: 'flex-start',
              px: layout.px,
            }}
          >
            {sites.map((site, index) => {
              const day = getSiteTimelineDay(site);
              const prevDay = index > 0 ? getSiteTimelineDay(sites[index - 1]) : 1;
              const dayFraction = getSiteTimelineDayFraction(site, year, month);
              const leadFlex = index === 0 ? Math.max(0, day - 1) : Math.max(1, day - prevDay);

              return (
                <React.Fragment key={site.id}>
                  {leadFlex > 0 ? (
                    <Box
                      sx={{
                        flex: `${leadFlex} 1 0`,
                        minHeight: index === 0 ? 2 : 4,
                        maxHeight: index === 0 ? 36 : 28,
                        width: '100%',
                      }}
                    />
                  ) : null}
                  <TimelineSiteCard
                    site={site}
                    editable={editable}
                    showActions={showActions}
                    align={layout.cardAlign}
                    offsetSx={temporalCardOffsetSx(col, dayFraction)}
                    onOpenSite={onOpenSite}
                    onOpenPreview={onOpenPreview}
                    onOpenEditor={onOpenEditor}
                    onDeleteSite={onDeleteSite}
                    onCategoryChange={onCategoryChange}
                  />
                </React.Fragment>
              );
            })}
          </Box>
        );
      })}
    </Box>
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

type TimelineSiteCardProps = {
  site: StorySite;
  editable?: boolean;
  showActions: boolean;
  align: 'left' | 'right';
  offsetSx?: Record<string, unknown>;
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
  offsetSx,
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
        borderRadius: 1.5,
        border: `1.5px solid ${category.border}`,
        bgcolor: category.bg,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease',
        boxShadow: `0 2px 8px ${category.border}`,
        ...(align === 'right'
          ? { borderRight: `3px solid ${category.color}` }
          : { borderLeft: `3px solid ${category.color}` }),
        '&:hover': { boxShadow: `0 4px 14px ${category.border}` },
        ...offsetSx,
      }}
    >
      <Box sx={{ px: 1, py: 0.7 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
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
          sx={{ color: category.text, fontSize: '0.62rem', mt: 0.2, fontWeight: 600, opacity: 0.9 }}
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
  year,
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
  year: number;
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

  const rowPy = hasEntries ? 0.6 : 0.5;
  const rowMinHeight = hasEntries
    ? Math.max(MIN_MONTH_ROW_HEIGHT, 68 + Math.max(0, monthSites.length - 1) * 10)
    : EMPTY_MONTH_HEIGHT;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        width: '100%',
        minHeight: rowMinHeight,
        borderBottom: '1px solid rgba(93, 64, 55, 0.08)',
        bgcolor: hasEntries ? seasonMeta.rowBg : seasonMeta.emptyRowBg,
      }}
    >
      <MonthSideColumns
        columns={[0, 1]}
        byColumn={byColumn}
        year={year}
        month={month}
        editable={editable}
        showActions={showActions}
        onOpenSite={onOpenSite}
        onOpenPreview={onOpenPreview}
        onOpenEditor={onOpenEditor}
        onDeleteSite={onDeleteSite}
        onCategoryChange={onCategoryChange}
        py={rowPy}
      />
      <MonthAxisCell month={month} />
      <MonthSideColumns
        columns={[3, 4]}
        byColumn={byColumn}
        year={year}
        month={month}
        editable={editable}
        showActions={showActions}
        onOpenSite={onOpenSite}
        onOpenPreview={onOpenPreview}
        onOpenEditor={onOpenEditor}
        onDeleteSite={onDeleteSite}
        onCategoryChange={onCategoryChange}
        py={rowPy}
      />
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

  return (
    <Box sx={{ mb: 5, width: '100%', '&:not(:first-of-type)': { pt: 2, borderTop: '1px solid rgba(93, 64, 55, 0.1)' } }}>
      <Box
        sx={{
          background: STORY_SCRAPBOOK_BG,
          borderBottom: '1px solid rgba(93, 64, 55, 0.1)',
          py: 0.85,
        }}
      >
        <TimelineCategoryHeader year={year} />
      </Box>
          {MONTH_LABELS.map((_, i) => {
            const month = i + 1;
            return (
              <MonthRow
                key={month}
                year={year}
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
