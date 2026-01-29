/**
 * Format student name to show only first name and last name (without middle names)
 * @param fullName - Full name string (e.g., "Moritz Friedrich Becker")
 * @returns Formatted name (e.g., "Moritz Becker")
 */
export const formatStudentName = (fullName: string): string => {
  if (!fullName || !fullName.trim()) return '';
  const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  // Return first name + last name (skip middle names)
  return `${parts[0]} ${parts[parts.length - 1]}`;
};
