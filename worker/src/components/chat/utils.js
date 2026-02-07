// Parse DB timestamp (stored as UTC without timezone indicator)
export function parseUTCTimestamp(timestamp) {
  if (!timestamp) return new Date();
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  return new Date(utcTimestamp);
}
