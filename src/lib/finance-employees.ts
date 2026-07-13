export const financeEmployeeNames = ['Viraj Sandaruwan', 'Rajith Eranga', 'Pasan Pramuditha'] as const;

export type FinanceEmployeeName = (typeof financeEmployeeNames)[number];

export function normalizeFinanceEmployeeName(name: string) {
  return name === 'Pasan Pramudith' ? 'Pasan Pramuditha' : name;
}
