export const formatNumber = (value: number, digits = 1): string =>
  value.toFixed(digits);

export const formatSigned = (value: number): string => {
  const text = value.toFixed(2);
  return value > 0 ? `+${text}` : text;
};

export const zTone = (value: number | null): string => {
  if (value === null || Math.abs(value) < 0.15) return "text-muted-foreground";
  return value > 0 ? "text-positive" : "text-destructive";
};

export const formatStat = (value: number | null, digits = 1): string =>
  value === null ? "—" : formatNumber(value, digits);
