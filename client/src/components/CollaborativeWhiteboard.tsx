import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { 
  People as PeopleIcon, 
  Wifi as WifiIcon, 
  WifiOff as WifiOffIcon,
  Sync as SyncIcon
} from '@mui/icons-material';

interface CollaborativeUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}

interface CollaborativeWhiteboardProps {
  groupId: string;
  onUserJoin?: (user: CollaborativeUser) => void;
  onUserLeave?: (userId: string) => void;
  onCursorMove?: (userId: string, x: number, y: number) => void;
  onObjectChange?: (objects: any[]) => void;
}

const CollaborativeWhiteboard: React.FC<CollaborativeWhiteboardProps> = ({
  groupId,
  onUserJoin,
  onUserLeave,
  onCursorMove,
  onObjectChange
}) => {
  const [users, setUsers] = useState<CollaborativeUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/whiteboard/${groupId}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsSyncing(false);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setIsConnected(false);
    }
  }, [groupId]);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'user_joined':
        setUsers(prev => {
          const existingUser = prev.find(u => u.id === data.user.id);
          if (existingUser) {
            return prev.map(u => u.id === data.user.id ? { ...u, isActive: true } : u);
          }
          return [...prev, { ...data.user, isActive: true }];
        });
        onUserJoin?.(data.user);
        break;

      case 'user_left':
        setUsers(prev => prev.map(u => 
          u.id === data.userId ? { ...u, isActive: false } : u
        ));
        onUserLeave?.(data.userId);
        break;

      case 'cursor_move':
        setUsers(prev => prev.map(u => 
          u.id === data.userId ? { ...u, cursor: { x: data.x, y: data.y } } : u
        ));
        onCursorMove?.(data.userId, data.x, data.y);
        break;

      case 'objects_update':
        onObjectChange?.(data.objects);
        setLastSyncTime(new Date());
        break;

      case 'sync_request':
        // Send current state to requesting user
        sendMessage({
          type: 'objects_sync',
          objects: data.objects || []
        });
        break;
    }
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const sendCursorMove = (x: number, y: number) => {
    sendMessage({
      type: 'cursor_move',
      x,
      y
    });
  };

  const sendObjectsUpdate = (objects: any[]) => {
    setIsSyncing(true);
    sendMessage({
      type: 'objects_update',
      objects
    });
  };

  const requestSync = () => {
    sendMessage({
      type: 'sync_request'
    });
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 10, 
      left: 10, 
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }}>
      {/* Connection Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isConnected ? 'Verbunden' : 'Getrennt'}>
          <IconButton size="small" color={isConnected ? 'success' : 'error'}>
            {isConnected ? <WifiIcon /> : <WifiOffIcon />}
          </IconButton>
        </Tooltip>
        
        {isSyncing && (
          <Tooltip title="Synchronisiere...">
            <IconButton size="small">
              <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Active Users */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
          Aktive Benutzer ({users.filter(u => u.isActive).length})
        </Typography>
        {users.filter(u => u.isActive).map(user => (
          <Chip
            key={user.id}
            label={user.name}
            size="small"
            sx={{
              backgroundColor: user.color,
              color: 'white',
              fontSize: '0.7rem',
              height: 20,
              '& .MuiChip-label': {
                px: 1
              }
            }}
          />
        ))}
      </Box>

      {/* Last Sync Time */}
      {lastSyncTime && (
        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.6rem' }}>
          Letzte Sync: {lastSyncTime.toLocaleTimeString()}
        </Typography>
      )}

      {/* Sync Button */}
      <Tooltip title="Manuell synchronisieren">
        <IconButton 
          size="small" 
          onClick={requestSync}
          disabled={!isConnected}
        >
          <SyncIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default CollaborativeWhiteboard;
