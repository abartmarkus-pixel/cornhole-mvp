import { GameObject, Player, Game } from '../types';

export const createDefaultPlayer = (name: string): Player => ({
  id: Math.random().toString(36).substr(2, 9),
  name,
  stats: {
    gamesPlayed: 0,
    wins: 0,
    totalThrows: 0,
    totalPoints: 0,
    averagePointsPerGame: 0,
    hitRates: {
      onBoard: 0,
      sunk: 0,
      airballs: 0,
    },
    totalPlayTime: 0,
    achievements: [],
  },
});

export const calculatePoints = (objects: GameObject[]): number => {
  return objects.reduce((total, obj) => {
    if (obj.state === 0) return total; // Miss
    
    if (obj.type === 'bag') {
      return total + (obj.state === 1 ? 1 : 3); // On board: 1, Sunk: 3
    } else {
      return total + (obj.state === 1 ? 3 : 5); // On board: 3, Sunk: 5
    }
  }, 0);
};

export const getObjectStateLabel = (state: number): string => {
  switch (state) {
    case 0: return 'Miss';
    case 1: return 'Board';
    case 2: return 'Versenkt';
    default: return 'Unknown';
  }
};

export const getObjectStateClass = (state: number): string => {
  switch (state) {
    case 0: return 'object-empty';
    case 1: return 'object-half';
    case 2: return 'object-full';
    default: return 'object-empty';
  }
};

export const shufflePlayers = (players: Player[]): Player[] => {
  return [...players].sort(() => Math.random() - 0.5);
};

export const checkGameEnd = (game: Game): { isFinished: boolean; winner: string | null } => {
  const { scores, gameConfig, players, currentPlayerIndex } = game;
  
  // Only check at end of round (after last player)
  const isLastPlayerOfRound = currentPlayerIndex === players.length - 1;
  
  if (!isLastPlayerOfRound) {
    return { isFinished: false, winner: null };
  }
  
  // Find players who reached target points
  const winners = players.filter(p => scores[p.id] >= gameConfig.targetPoints);
  
  if (winners.length === 1) {
    return { isFinished: true, winner: winners[0].id };
  } else if (winners.length > 1) {
    // Sudden Death: Find highest score among winners
    const highestScore = Math.max(...winners.map(p => scores[p.id]));
    const topWinners = winners.filter(p => scores[p.id] === highestScore);
    
    if (topWinners.length === 1) {
      return { isFinished: true, winner: topWinners[0].id };
    }
  }
  
  return { isFinished: false, winner: null };
};