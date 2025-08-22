export type ObjectType = 'bag' | 'ball';
export type ObjectState = 0 | 1 | 2; // 0: miss, 1: on board, 2: sunk

export interface GameObject {
  type: ObjectType;
  state: ObjectState;
}

export interface Player {
  id: string;
  name: string;
  stats: {
    gamesPlayed: number;
    wins: number;
    totalThrows: number;
    totalPoints: number;
    averagePointsPerGame: number;
    hitRates: {
      onBoard: number;
      sunk: number;
      airballs: number;
    };
    totalPlayTime: number;
    achievements: string[];
  };
}

export interface Round {
  playerId: string;
  objects: GameObject[];
  points: number;
}

export interface GameConfig {
  targetPoints: number;
  objects: GameObject[];
}

export interface Game {
  id: string;
  players: Player[];
  gameConfig: GameConfig;
  rounds: Round[];
  currentPlayerIndex: number;
  currentRound: number;
  scores: Record<string, number>;
  isFinished: boolean;
  winner: string | null;
  startTime: number;
  endTime?: number;
}