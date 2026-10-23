import { useGameRoom } from './useGameRoom';

export function useCrosswordRoom() {
  return useGameRoom({ namespace: '/crossword', configPath: '/api/crossword/config', sessionKey: 'crosswordSession' });
}
