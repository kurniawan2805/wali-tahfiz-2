/**
 * dateUtils.ts
 * Utility to calculate child age dynamically from birth year and birth month
 */

export interface MonthOption {
  value: number;
  label: string;
}

export const MONTHS_INDO: MonthOption[] = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" }
];

/**
 * Calculates child age string in Indonesian dynamically based on birth month and year.
 * e.g., "4 Tahun", "2.5 Tahun", "1 Tahun 2 Bulan", "8 Bulan"
 */
export function calculateAge(birthYear: number, birthMonth: number): string {
  const currentYear = 2026;
  const currentMonth = 5; // May (1-indexed)

  let totalMonths = (currentYear - birthYear) * 12 + (currentMonth - birthMonth);
  if (totalMonths < 0) {
    totalMonths = 0;
  }

  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  if (years === 0) {
    return `${remainingMonths} Bulan`;
  }

  if (remainingMonths === 0) {
    return `${years} Tahun`;
  }

  // Handle perfect halves (e.g. 6 months -> .5)
  if (remainingMonths === 6) {
    return `${years}.5 Tahun`;
  }

  // Return years and months
  return `${years} Tahun ${remainingMonths} Bulan`;
}

/**
 * Generates selectable years list up to the current year.
 */
export function getYearsList(range: number = 15): number[] {
  const currentYear = 2026;
  const years: number[] = [];
  for (let i = 0; i < range; i++) {
    years.push(currentYear - i);
  }
  return years;
}
