import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

/** Deep-Link zur Lerngruppe: leitet ins Dashboard mit fokussierter Gruppe um. */
export default function LearningGroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const hasLogin = localStorage.getItem('loginCode');
    if (!hasLogin) {
      navigate('/', { replace: true });
      return;
    }
    if (!id) {
      navigate('/dashboard', { replace: true });
      return;
    }
    navigate('/dashboard', { replace: true, state: { focusGroupId: id } });
  }, [id, navigate]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <CircularProgress />
    </Box>
  );
}
