import React from 'react';

interface TeacherDashboardProps {
  userId: string;
  onLogout: () => void;
}

export default function TeacherDashboard({ userId, onLogout }: TeacherDashboardProps) {
  return (
    <div>
      <h1>Teacher Dashboard</h1>
      <p>Dashboard wird geladen...</p>
      <p>User ID: {userId}</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
} 