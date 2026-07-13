import { DateRange } from 'react-day-picker';

export type Period = 'AM' | 'PM';

export type TimePickerType = 'hours' | 'minutes' | 'seconds' | '12hours';

export function setDateByType(
  date: Date | undefined,
  value: string,
  type: TimePickerType
) {
  const _date = date ? new Date(date) : new Date();
  switch (type) {
    case 'hours':
      _date.setHours(parseInt(value));
      break;
    case 'minutes':
      _date.setMinutes(parseInt(value));
      break;
    case 'seconds':
      _date.setSeconds(parseInt(value));
      break;
    default:
      break;
  }
  return _date;
}

export function getDateByType(date: Date | undefined, type: TimePickerType) {
  const _date = date ?? new Date();
  switch (type) {
    case 'hours':
      return String(_date.getHours()).padStart(2, '0');
    case 'minutes':
      return String(_date.getMinutes()).padStart(2, '0');
    case 'seconds':
      return String(_date.getSeconds()).padStart(2, '0');
    default:
      return '00';
  }
}

export function getArrowByType(type: 'prev' | 'next', picker: TimePickerType) {
  switch (picker) {
    case 'hours':
      return type === 'prev' ? -1 : 1;
    case 'minutes':
      return type === 'prev' ? -1 : 1;
    case 'seconds':
      return type === 'prev' ? -1 : 1;
    default:
      return 0;
  }
}
