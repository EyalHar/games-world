import { useGameRoom } from './useGameRoom';

export function useEretzIrRoom() {
  const room = useGameRoom({ configPath: '/api/eretz-ir/config', sessionKey: 'eretzIrSession' });
  return { ...room, playerId: room.session?.playerId ?? null };
}
