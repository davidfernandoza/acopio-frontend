export function formatThousands(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseThousandsInput(rawValue: string): number | null {
  const digitsOnly = rawValue.replace(/\D/g, '');
  if (!digitsOnly) {
    return null;
  }
  const parsedQuantity = Number(digitsOnly);
  return parsedQuantity >= 1 ? parsedQuantity : null;
}
