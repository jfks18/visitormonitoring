// Manila timezone helpers
export function toManilaDateTime(input?: string | Date | null): string {
  if (!input) return '-';
  const d = input instanceof Date ? input : new Date(input as any);
  if (isNaN(d.getTime())) return String(input);
  return d.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
}

export function toManilaDate(input?: string | Date | null): string {
  if (!input) return '-';
  const d = input instanceof Date ? input : new Date(input as any);
  if (isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' });
}
