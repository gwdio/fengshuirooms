import type { Units } from '../model/entities.ts'

export const CM_PER_INCH = 2.54

/** Formats a stored length (inches) for display in the given unit system. */
export function formatLength(inches: number, units: Units): string {
  if (units === 'metric') {
    const cm = inches * CM_PER_INCH
    return cm >= 100 ? `${(cm / 100).toFixed(2)} m` : `${Math.round(cm)} cm`
  }
  const rounded = Math.round(inches)
  const ft = Math.floor(rounded / 12)
  const inch = rounded % 12
  if (ft === 0) return `${inch}"`
  return inch === 0 ? `${ft}'` : `${ft}' ${inch}"`
}
