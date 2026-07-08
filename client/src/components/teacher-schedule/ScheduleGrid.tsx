import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Divider,
} from '@mui/material';
import { Close as CloseIcon, AccessTime as AccessTimeIcon } from '@mui/icons-material';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { DAY_LABELS, type PeriodTime } from '../../lib/periodTimes';
import { resolveLearningGroupDisplayStyle } from '../../lib/learningGroupAppearance';
import { schedulePx, scheduleRem } from './scheduleUiScale';

export type ScheduleGroup = {
  id: string;
  name: string;
  iconEmoji?: string | null;
  color?: string | null;
};

export type ScheduleSlotData = {
  groupId: string;
  dayOfWeek: number;
  periodNumber: number;
  lessonPath?: string | null;
};

const WEEKDAYS = [1, 2, 3, 4, 5] as const;

function slotKey(day: number, period: number) {
  return `${day}-${period}`;
}

function DraggableGroupChip({ group, slotCount }: { group: ScheduleGroup; slotCount?: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `group-${group.id}`,
    data: { group },
  });
  const style = resolveLearningGroupDisplayStyle(group, '#1976d2');

  return (
    <Chip
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
          <span>{group.iconEmoji || '👥'}</span>
          <span>{group.name}</span>
          {slotCount != null && slotCount > 0 && (
            <span style={{ opacity: 0.7, fontSize: scheduleRem(0.6) }}>×{slotCount}</span>
          )}
        </Box>
      }
      size="small"
      sx={{
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        height: schedulePx(22),
        bgcolor: style.boxBg,
        border: style.boxBorder,
        fontWeight: 600,
        fontSize: scheduleRem(0.65),
        '& .MuiChip-label': { px: scheduleRem(0.75), py: 0 },
        '&:active': { cursor: 'grabbing' },
      }}
    />
  );
}

function DroppableCell({
  day,
  period,
  slot,
  group,
  onRemove,
}: {
  day: number;
  period: number;
  slot?: ScheduleSlotData;
  group?: ScheduleGroup;
  onRemove: (day: number, period: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotKey(day, period),
    data: { day, period },
  });

  const style = group ? resolveLearningGroupDisplayStyle(group, '#1976d2') : null;

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      sx={{
        minHeight: schedulePx(28),
        height: schedulePx(28),
        p: 0,
        bgcolor: isOver ? 'action.hover' : slot ? style?.boxBg : 'background.paper',
        border: isOver ? '2px dashed #1976d2' : slot ? style?.boxBorder : '1px dashed #ddd',
        borderRadius: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'background 0.12s',
        overflow: 'hidden',
      }}
    >
      {group && slot ? (
        <>
          <Typography
            sx={{
              fontSize: scheduleRem(0.58),
              fontWeight: 700,
              lineHeight: 1,
              px: 0.35,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {group.iconEmoji || '👥'} {group.name}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onRemove(day, period)}
            sx={{ position: 'absolute', top: 0, right: 0, width: schedulePx(14), height: schedulePx(14), p: 0 }}
            aria-label="Entfernen"
          >
            <CloseIcon sx={{ fontSize: schedulePx(10) }} />
          </IconButton>
        </>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: scheduleRem(0.55), lineHeight: 1 }}>
          +
        </Typography>
      )}
    </Paper>
  );
}

interface ScheduleGridProps {
  groups: ScheduleGroup[];
  slots: ScheduleSlotData[];
  periodTimes: PeriodTime[];
  onChange: (slots: ScheduleSlotData[]) => void;
  startWindow: number;
  endWindow: number;
  onStartWindowChange: (v: number) => void;
  onEndWindowChange: (v: number) => void;
  onOpenZeittafel: () => void;
}

export default function ScheduleGrid({
  groups,
  slots,
  periodTimes,
  onChange,
  startWindow,
  endWindow,
  onStartWindowChange,
  onEndWindowChange,
  onOpenZeittafel,
}: ScheduleGridProps) {
  const [activeGroup, setActiveGroup] = React.useState<ScheduleGroup | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const slotCountByGroup = slots.reduce<Record<string, number>>((acc, s) => {
    acc[s.groupId] = (acc[s.groupId] || 0) + 1;
    return acc;
  }, {});

  const getSlot = (day: number, period: number) =>
    slots.find((s) => s.dayOfWeek === day && s.periodNumber === period);

  const getGroup = (groupId: string) => groups.find((g) => g.id === groupId);

  const handleDragStart = (event: DragStartEvent) => {
    const group = event.active.data.current?.group as ScheduleGroup | undefined;
    if (group) setActiveGroup(group);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGroup(null);
    const group = event.active.data.current?.group as ScheduleGroup | undefined;
    if (!group || !event.over) return;

    const overId = String(event.over.id);
    const [dayStr, periodStr] = overId.split('-');
    const dayOfWeek = parseInt(dayStr, 10);
    const periodNumber = parseInt(periodStr, 10);
    if (!dayOfWeek || !periodNumber) return;

    const existingAtTarget = slots.find(
      (s) => s.dayOfWeek === dayOfWeek && s.periodNumber === periodNumber
    );
    if (existingAtTarget?.groupId === group.id) return;

    const withoutTarget = slots.filter(
      (s) => !(s.dayOfWeek === dayOfWeek && s.periodNumber === periodNumber)
    );

    onChange([
      ...withoutTarget,
      { groupId: group.id, dayOfWeek, periodNumber, lessonPath: null },
    ]);
  };

  const handleRemove = (day: number, period: number) => {
    onChange(slots.filter((s) => !(s.dayOfWeek === day && s.periodNumber === period)));
  };

  const periods = periodTimes.length ? periodTimes : [{ period: 1, start: '', end: '' }];

  const numberFieldSx = {
    width: schedulePx(44),
    '& .MuiOutlinedInput-root': { height: schedulePx(24), borderRadius: scheduleRem(0.75) },
    '& .MuiInputBase-input': {
      py: 0,
      px: 0.5,
      textAlign: 'center',
      fontSize: scheduleRem(0.75),
      fontWeight: 600,
    },
  } as const;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: scheduleRem(0.75) }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: scheduleRem(0.5),
            px: scheduleRem(1),
            py: scheduleRem(0.5),
            bgcolor: '#f5f7fa',
            borderRadius: scheduleRem(1.25),
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: scheduleRem(0.75),
              flexWrap: 'nowrap',
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: scheduleRem(0.75), flex: '1 1 75%', minWidth: 0 }}>
              <AccessTimeIcon sx={{ fontSize: schedulePx(15), color: 'text.secondary', opacity: 0.65, flexShrink: 0 }} />

              <Tooltip title="So viel früher vor Stundenbeginn öffnet sich die Stunde">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: scheduleRem(0.4), flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: scheduleRem(0.68) }}>
                    Start
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={startWindow}
                    onChange={(e) => onStartWindowChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    inputProps={{ min: 0, max: 60, 'aria-label': 'Startfenster' }}
                    sx={numberFieldSx}
                  />
                  <Typography variant="caption" sx={{ fontSize: scheduleRem(0.62), color: 'text.disabled' }}>min</Typography>
                </Box>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ height: schedulePx(18), alignSelf: 'center' }} />

              <Tooltip title="So lange nach Stundenbeginn bleibt die Stunde offen">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: scheduleRem(0.4), flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: scheduleRem(0.68) }}>
                    Ende
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={endWindow}
                    onChange={(e) => onEndWindowChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    inputProps={{ min: 0, max: 60, 'aria-label': 'Endfenster' }}
                    sx={numberFieldSx}
                  />
                  <Typography variant="caption" sx={{ fontSize: scheduleRem(0.62), color: 'text.disabled' }}>min</Typography>
                </Box>
              </Tooltip>
            </Box>

            <Tooltip title="Unterrichtszeiten am Johannes-Gymnasium">
              <Button
                size="small"
                variant="outlined"
                onClick={onOpenZeittafel}
                sx={{
                  flex: '0 0 25%',
                  width: '25%',
                  maxWidth: '25%',
                  minWidth: 0,
                  ml: 'auto',
                  px: scheduleRem(0.35),
                  py: 0,
                  height: schedulePx(24),
                  fontSize: scheduleRem(0.54),
                  lineHeight: 1.1,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'rgba(25, 118, 210, 0.35)',
                  color: 'primary.main',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.06)', borderColor: 'primary.main' },
                }}
              >
                Zeittafel Johnny
              </Button>
            </Tooltip>
          </Box>

          {groups.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: scheduleRem(0.4), pt: scheduleRem(0.15) }}>
              {groups.map((g) => (
                <DraggableGroupChip key={g.id} group={g} slotCount={slotCountByGroup[g.id]} />
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `${schedulePx(22)}px repeat(5, minmax(0, 1fr))`,
              gap: scheduleRem(0.35),
              minWidth: 0,
            }}
          >
            <Box />
            {WEEKDAYS.map((d) => (
              <Typography
                key={d}
                variant="caption"
                sx={{ textAlign: 'center', fontWeight: 700, fontSize: scheduleRem(0.65), lineHeight: 1.2 }}
              >
                {DAY_LABELS[d]}
              </Typography>
            ))}

            {periods.map((p) => (
              <React.Fragment key={p.period}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: scheduleRem(0.62),
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    pr: 0.25,
                  }}
                >
                  {p.period}
                </Typography>
                {WEEKDAYS.map((d) => {
                  const slot = getSlot(d, p.period);
                  const group = slot ? getGroup(slot.groupId) : undefined;
                  return (
                    <DroppableCell
                      key={slotKey(d, p.period)}
                      day={d}
                      period={p.period}
                      slot={slot}
                      group={group}
                      onRemove={handleRemove}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </Box>
        </Box>
      </Box>

      <DragOverlay>
        {activeGroup ? (
          <Chip
            label={`${activeGroup.iconEmoji || '👥'} ${activeGroup.name}`}
            size="small"
            sx={{ cursor: 'grabbing', fontWeight: 600, height: schedulePx(22), fontSize: scheduleRem(0.65) }}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
