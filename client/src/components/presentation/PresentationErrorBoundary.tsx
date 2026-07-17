import React from 'react';
import { Box, Button, Typography } from '@mui/material';

type Props = { children: React.ReactNode; label?: string };

type State = { error: Error | null; stack: string };

/**
 * Fängt Render-Fehler (inkl. Too many re-renders) und zeigt den Komponenten-Stack,
 * damit die Ursache nicht im CRA-Overlay ohne Namen stecken bleibt.
 */
export default class PresentationErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, stack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const stack = info.componentStack || '';
    // eslint-disable-next-line no-console
    console.error('[PresentationErrorBoundary]', this.props.label, error, stack);
    this.setState({ stack });
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    return (
      <Box sx={{ p: 3, maxWidth: 720, m: '40px auto', bgcolor: '#fff3e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#e65100' }}>
          Render-Fehler{this.props.label ? ` · ${this.props.label}` : ''}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace' }}>
          {error.message}
        </Typography>
        {stack && (
          <Box
            component="pre"
            sx={{
              fontSize: 11,
              bgcolor: '#fff',
              p: 1.5,
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 280,
              border: '1px solid #ffcc80',
            }}
          >
            {stack}
          </Box>
        )}
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          onClick={() => this.setState({ error: null, stack: '' })}
        >
          Erneut versuchen
        </Button>
      </Box>
    );
  }
}
