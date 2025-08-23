import { GameObject } from '../app/types';

export function getThemeAwareImageSrc(
  obj: GameObject, 
  isDarkMode: boolean
): string {
  const baseType = obj.type === 'bag' ? 'cornholebag' : 'cornholeball';
  const stateMap: { [key: number]: string } = { 0: 'empty', 1: 'half', 2: 'full' };
  const state = stateMap[obj.state];
  
  // Only use -inv versions for empty state in dark mode
  if (state === 'empty' && isDarkMode) {
    return `/${baseType}-empty-inv.png`;
  }
  
  return `/${baseType}-${state}.png`;
}

export function getSuccessImageSrc(isDarkMode: boolean): string {
  return isDarkMode ? '/success-inv.png' : '/success.png';
}