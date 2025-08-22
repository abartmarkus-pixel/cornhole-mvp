'use client';

import { useState, useEffect } from 'react';
import { Player, GameObject, Game, GameConfig } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { 
  createDefaultPlayer, 
  calculatePoints, 
  getObjectStateLabel, 
  getObjectStateClass, 
  shufflePlayers, 
  checkGameEnd 
} from './utils/gameUtils';
import confetti from 'canvas-confetti';

type Screen = 'home' | 'players' | 'objects' | 'config' | 'game' | 'stats' | 'gameEnd';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [players, setPlayers] = useLocalStorage<Player[]>('cornhole-players', []);
  const [gameHistory, setGameHistory] = useLocalStorage<Game[]>('cornhole-history', []);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  
  // Player selection state
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  
  // Object selection state
  const [bags, setBags] = useState(0);
  const [balls, setBalls] = useState(0);
  
  // Game config state
  const [targetPoints, setTargetPoints] = useState(21);
  
  // Scoring state
  const [currentObjects, setCurrentObjects] = useState<GameObject[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load current game from localStorage on mount
  useEffect(() => {
    const savedGame = localStorage.getItem('cornhole-current-game');
    if (savedGame) {
      try {
        setCurrentGame(JSON.parse(savedGame));
      } catch (e) {
        console.error('Failed to load saved game:', e);
      }
    }
  }, []);

  // Save current game to localStorage whenever it changes
  useEffect(() => {
    if (currentGame) {
      localStorage.setItem('cornhole-current-game', JSON.stringify(currentGame));
    } else {
      localStorage.removeItem('cornhole-current-game');
    }
  }, [currentGame]);

  const addPlayer = () => {
    if (newPlayerName.trim() && players.length < 20) {
      const newPlayer = createDefaultPlayer(newPlayerName.trim());
      setPlayers([...players, newPlayer]);
      setNewPlayerName('');
    }
  };

  const addDemoPlayers = () => {
    const demoNames = ['Alice', 'Bob', 'Charlie', 'Diana'];
    const demoPlayers = demoNames.map(name => createDefaultPlayer(name));
    setPlayers(demoPlayers);
  };

  const togglePlayerSelection = (player: Player) => {
    if (selectedPlayers.some(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else if (selectedPlayers.length < 20) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const generateObjects = (): GameObject[] => {
    const objects: GameObject[] = [];
    // Create objects for ALL players (each player gets the same number of bags and balls)
    for (let playerIndex = 0; playerIndex < selectedPlayers.length; playerIndex++) {
      for (let i = 0; i < bags; i++) {
        objects.push({ type: 'bag', state: 0 });
      }
      for (let i = 0; i < balls; i++) {
        objects.push({ type: 'ball', state: 0 });
      }
    }
    return objects;
  };

  const startGame = () => {
    if (selectedPlayers.length < 2) return;
    
    const shuffledPlayers = shufflePlayers(selectedPlayers);
    const objects = generateObjects();
    
    const newGame: Game = {
      id: Math.random().toString(36).substr(2, 9),
      players: shuffledPlayers,
      gameConfig: {
        targetPoints,
        objects,
      },
      rounds: [],
      currentPlayerIndex: 0,
      currentRound: 1,
      scores: shuffledPlayers.reduce((acc, player) => {
        acc[player.id] = 0;
        return acc;
      }, {} as Record<string, number>),
      isFinished: false,
      winner: null,
      startTime: Date.now(),
    };

    setCurrentGame(newGame);
    setCurrentObjects(objects.map(obj => ({ ...obj, state: 0 })));
    setCurrentScreen('game');
  };

  const handleObjectClick = (index: number) => {
    if (!currentGame || currentGame.isFinished) return;
    
    const newObjects = [...currentObjects];
    newObjects[index].state = ((newObjects[index].state + 1) % 3) as 0 | 1 | 2;
    setCurrentObjects(newObjects);
    setShowConfirm(false);
  };

  const submitRound = () => {
    if (!currentGame || currentGame.isFinished) return;

    // Calculate points for ALL players in this round
    const newScores = { ...currentGame.scores };
    const newRounds = [];

    for (let playerIndex = 0; playerIndex < currentGame.players.length; playerIndex++) {
      const player = currentGame.players[playerIndex];
      
      // Get this player's objects
      const playerObjects = [];
      for (let objIndex = 0; objIndex < (bags + balls); objIndex++) {
        const globalIndex = playerIndex * (bags + balls) + objIndex;
        if (currentObjects[globalIndex]) {
          playerObjects.push(currentObjects[globalIndex]);
        }
      }
      
      // Calculate points for this player
      const playerPoints = calculatePoints(playerObjects);
      
      // Update score
      newScores[player.id] += playerPoints;
      
      // Create round entry for this player
      newRounds.push({
        playerId: player.id,
        objects: [...playerObjects],
        points: playerPoints,
      });
    }

    // Check for game end - set currentPlayerIndex to last player to trigger end-of-round check
    const gameEndCheck = checkGameEnd({
      ...currentGame,
      scores: newScores,
      currentPlayerIndex: currentGame.players.length - 1, // Force end-of-round check
    });

    const updatedGame: Game = {
      ...currentGame,
      rounds: [...currentGame.rounds, ...newRounds],
      scores: newScores,
      currentRound: currentGame.currentRound + 1,
      isFinished: gameEndCheck.isFinished,
      winner: gameEndCheck.winner,
      endTime: gameEndCheck.isFinished ? Date.now() : undefined,
    };

    setCurrentGame(updatedGame);

    if (gameEndCheck.isFinished) {
      // Update game history
      setGameHistory([...gameHistory, updatedGame]);
      // Update player stats - ONLY for players who participated in this game
      const updatedPlayers = players.map(p => {
        // Check if this player participated in the current game
        const participatedInGame = currentGame.players.some(gamePlayer => gamePlayer.id === p.id);
        
        if (participatedInGame) {
          // Calculate player's total points and throws from this game
          const playerFinalScore = updatedGame.scores[p.id];
          const playerTotalThrows = updatedGame.rounds.filter(round => round.playerId === p.id).length * (bags + balls);
          
          // Player participated - update their stats
          const newStats = {
            ...p.stats,
            gamesPlayed: p.stats.gamesPlayed + 1,
            totalPoints: p.stats.totalPoints + playerFinalScore,
            totalThrows: p.stats.totalThrows + playerTotalThrows,
          };
          
          // Calculate new average
          newStats.averagePointsPerGame = newStats.totalPoints / newStats.gamesPlayed;
          
          if (p.id === gameEndCheck.winner) {
            // Winner gets win incremented too
            newStats.wins = p.stats.wins + 1;
          }
          
          return { ...p, stats: newStats };
        } else {
          // Player did not participate - no stats change
          return p;
        }
      });
      setPlayers(updatedPlayers);
      setCurrentScreen('gameEnd');
    } else {
      // Reset ALL objects for next round
      const resetObjects = [];
      for (let playerIndex = 0; playerIndex < currentGame.players.length; playerIndex++) {
        for (let i = 0; i < bags; i++) {
          resetObjects.push({ type: 'bag', state: 0 });
        }
        for (let i = 0; i < balls; i++) {
          resetObjects.push({ type: 'ball', state: 0 });
        }
      }
      setCurrentObjects(resetObjects as GameObject[]);
      setShowConfirm(false);
    }
  };

  const resetGame = () => {
    setCurrentGame(null);
    setSelectedPlayers([]);
    setBags(0);
    setBalls(0);
    setTargetPoints(21);
    setCurrentObjects([]);
    setShowConfirm(false);
    setCurrentScreen('home');
  };

  const currentRoundPoints = calculatePoints(currentObjects);

  // Screen Components
  const renderHomeScreen = () => (
    <div className="text-center organic-decoration relative overflow-hidden min-h-screen flex items-center justify-center">
      
      {/* Background illustration */}
      <img 
        src="/cornholeboard.png" 
        alt="Cornhole Board" 
        className="cornhole-background"
      />
      
      <div className="max-w-2xl mx-auto relative z-10 text-center">
        <h1 className="rubik-doodle-title mb-4">BildungscoRnsulting</h1>
        <p className="code-subtitle text-gray-700 mb-24">Treffsicher in die Bildungslücke</p>
        
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setCurrentScreen('players')}
            className="modern-button touch-manipulation py-6 px-12 text-xl font-bold"
          >
            Neues Spiel
          </button>
          <button
            onClick={() => setCurrentScreen('stats')}
            className="bg-white border border-gray-300 text-gray-700 hover:border-gray-400 py-4 px-8 text-lg font-semibold rounded-full touch-manipulation transition-all"
          >
            Statistiken
          </button>
        </div>
      </div>
    </div>
  );

  const renderPlayerScreen = () => (
    <div className="space-y-8 py-8">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="rubik-doodle-title mb-8">Choose Your Player</h2>
      </div>


      {/* Player List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {players.map((player) => {
          const isSelected = selectedPlayers.some(p => p.id === player.id);
          return (
            <button
              key={player.id}
              onClick={() => togglePlayerSelection(player)}
              className={`text-left transition-all touch-manipulation h-24 flex flex-col justify-center ${
                isSelected 
                  ? 'bg-green-100 shadow-lg rounded-2xl p-6 border border-gray-200' 
                  : 'modern-card hover:shadow-lg'
              }`}
            >
              <div className="font-bold text-lg">{player.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                {player.stats.gamesPlayed} Spiele • {player.stats.wins} Siege
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Player Form */}
      <div className="modern-card">
        <h3 className="font-bold text-lg mb-4">Neuen Spieler hinzufügen</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Name eingeben"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-2xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-base"
            maxLength={20}
            onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button
            onClick={addPlayer}
            disabled={!newPlayerName.trim() || players.length >= 20}
            className="modern-button-outline touch-manipulation px-6 py-3 text-base font-semibold"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Demo Players Button */}
      {players.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Noch keine Spieler vorhanden.</p>
          <button
            onClick={addDemoPlayers}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg touch-manipulation"
          >
            Demo-Spieler hinzufügen
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-8">
        <button
          onClick={() => setCurrentScreen('home')}
          className="modern-button-outline touch-manipulation px-8 py-4 text-lg font-semibold"
        >
          ← Zurück
        </button>
        <button
          onClick={() => setCurrentScreen('objects')}
          disabled={selectedPlayers.length < 2}
          className={`touch-manipulation px-8 py-4 text-lg font-semibold ${
            selectedPlayers.length >= 2
              ? 'modern-button'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed rounded-full'
          }`}
        >
          Weiter
        </button>
      </div>
    </div>
  );

  const renderObjectScreen = () => {
    const totalObjects = bags + balls;
    return (
      <div className="space-y-6 py-8">
        <div className="text-center">
          <h2 className="rubik-doodle-title mb-8">Choose Your Weapons</h2>
        </div>

        {/* Object Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bags */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Bags</h3>
              <p className="text-sm text-gray-600 mb-4">
                Auf Board: 1 Punkt | Versenkt: 3 Punkte
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setBags(Math.max(0, bags - 1))}
                className="modern-button-outline w-12 h-12 rounded-full text-2xl font-bold touch-manipulation"
              >
                -
              </button>
              <span className="text-3xl font-bold w-12 text-center">{bags}</span>
              <button
                onClick={() => setBags(Math.min(10, bags + 1))}
                className="modern-button w-12 h-12 rounded-full text-2xl font-bold touch-manipulation"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: bags }).map((_, i) => (
                <img 
                  key={i} 
                  src="/cornholebag-empty.png" 
                  alt="Cornhole Bag"
                  className="w-16 h-16 object-contain"
                />
              ))}
            </div>
          </div>

          {/* Balls */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Balls</h3>
              <p className="text-sm text-gray-600 mb-4">
                Auf Board: 3 Punkte | Versenkt: 5 Punkte
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setBalls(Math.max(0, balls - 1))}
                className="modern-button-outline w-12 h-12 rounded-full text-2xl font-bold touch-manipulation"
              >
                -
              </button>
              <span className="text-3xl font-bold w-12 text-center">{balls}</span>
              <button
                onClick={() => setBalls(Math.min(10, balls + 1))}
                className="modern-button w-12 h-12 rounded-full text-2xl font-bold touch-manipulation"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: balls }).map((_, i) => (
                <img 
                  key={i} 
                  src="/cornholeball-empty.png" 
                  alt="Cornhole Ball"
                  className="w-16 h-16 object-contain"
                />
              ))}
            </div>
          </div>
        </div>


        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <button
            onClick={() => setCurrentScreen('players')}
            className="modern-button-outline touch-manipulation px-8 py-4 text-lg font-semibold"
          >
            ← Zurück
          </button>
          <button
            onClick={() => setCurrentScreen('config')}
            disabled={totalObjects === 0}
            className={`touch-manipulation px-8 py-4 text-lg font-semibold ${
              totalObjects > 0
                ? 'modern-button'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed rounded-full'
            }`}
          >
            Weiter
          </button>
        </div>
      </div>
    );
  };

  const renderConfigScreen = () => (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <h2 className="rubik-doodle-title mb-8">It&apos;s The Final Countdown</h2>
      </div>

      {/* Target Points Selection */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-center">Winning Score</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[10, 20, 30, 40].map((points) => (
            <button
              key={points}
              onClick={() => setTargetPoints(points)}
              className={`py-4 px-6 rounded-2xl font-bold text-lg touch-manipulation transition-all border ${
                targetPoints === points
                  ? 'bg-green-100 border-gray-200 shadow-lg'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 modern-card'
              }`}
            >
              {points}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={() => setCurrentScreen('objects')}
          className="modern-button-outline touch-manipulation px-8 py-4 text-lg font-semibold"
        >
          ← Zurück
        </button>
        <button
          onClick={startGame}
          className="modern-button touch-manipulation px-8 py-4 text-lg font-semibold"
        >
          Spiel starten!
        </button>
      </div>
    </div>
  );

  const renderGameScreen = () => {
    if (!currentGame || currentGame.isFinished) {
      return renderGameEndScreen();
    }

    const sortedPlayers = [...currentGame.players].sort((a, b) => 
      currentGame.scores[b.id] - currentGame.scores[a.id]
    );

    const getImageSrc = (obj: GameObject) => {
      const baseType = obj.type === 'bag' ? 'cornholebag' : 'cornholeball';
      const stateMap: { [key: number]: string } = { 0: 'empty', 1: 'half', 2: 'full' };
      return `/${baseType}-${stateMap[obj.state]}.png`;
    };

    return (
      <div className="space-y-6">
        {/* Live Score */}
        <div className="modern-card">
          <h3 className="rubik-doodle-title text-center mb-4">Live Score</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sortedPlayers.map((player, index) => {
              // Check if player is truly in first place (not tied)
              const isActualLeader = index === 0 && currentGame.scores[player.id] > currentGame.scores[sortedPlayers[1]?.id] || 0;
              
              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-2xl text-center border transition-all duration-500 ease-in-out transform ${
                    isActualLeader
                      ? 'bg-black text-white border-black' 
                      : 'bg-white border-gray-300'
                  }`}
                  style={{
                    transform: `translateY(${index * 2}px)`,
                    transition: 'all 0.5s ease-in-out'
                  }}
                >
                  <div className="font-bold text-sm">#{index + 1}</div>
                  <div className={`font-medium ${isActualLeader ? 'text-white' : 'text-gray-700'}`}>
                    {player.name}
                  </div>
                  <div className="text-lg font-bold">
                    {currentGame.scores[player.id]}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-3 text-sm text-gray-600">
            Ziel: {currentGame.gameConfig.targetPoints} Punkte | Runde {currentGame.currentRound}
          </div>
        </div>

        {/* Players with Objects */}
        <div className="space-y-4">
          {currentGame.players.map((player, playerIndex) => {
            // Calculate points for this player's objects directly from their specific objects
            let playerRoundPoints = 0;
            
            // Calculate points from bags
            for (let bagIndex = 0; bagIndex < bags; bagIndex++) {
              const objIndex = playerIndex * (bags + balls) + bagIndex;
              const obj = currentObjects[objIndex];
              if (obj && obj.state > 0) {
                if (obj.state === 1) playerRoundPoints += 1; // bag half = 1 point
                if (obj.state === 2) playerRoundPoints += 3; // bag full = 3 points
              }
            }
            
            // Calculate points from balls  
            for (let ballIndex = 0; ballIndex < balls; ballIndex++) {
              const objIndex = playerIndex * (bags + balls) + bags + ballIndex;
              const obj = currentObjects[objIndex];
              if (obj && obj.state > 0) {
                if (obj.state === 1) playerRoundPoints += 3; // ball half = 3 points
                if (obj.state === 2) playerRoundPoints += 5; // ball full = 5 points
              }
            }

            return (
              <div key={player.id} className="modern-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-lg text-gray-700">
                      {player.name}
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {playerRoundPoints} Punkte
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Show ALL selected objects for each player */}
                    {Array.from({ length: bags }).map((_, bagIndex) => (
                      <button
                        key={`bag-${bagIndex}`}
                        onClick={() => handleObjectClick(playerIndex * (bags + balls) + bagIndex)}
                        className="w-12 h-12 touch-manipulation transition-transform hover:scale-105"
                      >
                        <img 
                          src={getImageSrc(currentObjects[playerIndex * (bags + balls) + bagIndex] || {type: 'bag', state: 0})} 
                          alt="bag"
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}
                    {Array.from({ length: balls }).map((_, ballIndex) => (
                      <button
                        key={`ball-${ballIndex}`}
                        onClick={() => handleObjectClick(playerIndex * (bags + balls) + bags + ballIndex)}
                        className="w-12 h-12 touch-manipulation transition-transform hover:scale-105"
                      >
                        <img 
                          src={getImageSrc(currentObjects[playerIndex * (bags + balls) + bags + ballIndex] || {type: 'ball', state: 0})} 
                          alt="ball"
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={submitRound}
            className="modern-button touch-manipulation px-8 py-4 text-lg font-semibold"
          >
            Runde bestätigen
          </button>
        </div>
      </div>
    );
  };

  // Confetti effect for game end
  useEffect(() => {
    if (currentScreen === 'gameEnd' && currentGame?.isFinished) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // since particles fall down, start a bit higher than random
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [currentScreen, currentGame?.isFinished]);

  const renderGameEndScreen = () => {
    if (!currentGame) return null;
    
    const winner = currentGame.players.find(p => p.id === currentGame.winner);
    const sortedPlayers = [...currentGame.players].sort((a, b) => 
      currentGame.scores[b.id] - currentGame.scores[a.id]
    );
    
    return (
      <div className="text-center py-12">
        {/* Success Image */}
        <div className="mb-8">
          <img 
            src="/success.png" 
            alt="Success"
            className="mx-auto max-w-xs w-full object-contain"
          />
        </div>

        {/* Winner Name in Rubik Doodle Shadow Font */}
        {winner && (
          <h1 className="rubik-doodle-title text-6xl mb-8">{winner.name}</h1>
        )}

        {/* Complete Final Results */}
        <div className="modern-card max-w-2xl mx-auto mb-8">
          <h3 className="text-xl font-bold mb-4">Endergebnis</h3>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold">#{index + 1}</span>
                  <span className="font-medium">{player.name}</span>
                </div>
                <span className="font-bold text-lg">{currentGame.scores[player.id]} Punkte</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons with Modern Styling */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={resetGame}
            className="modern-button touch-manipulation px-8 py-4 text-lg font-semibold"
          >
            Neues Spiel
          </button>
          <button
            onClick={() => setCurrentScreen('stats')}
            className="modern-button-outline touch-manipulation px-8 py-4 text-lg font-semibold"
          >
            Statistiken anzeigen
          </button>
        </div>
      </div>
    );
  };

  const renderStatsScreen = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="rubik-doodle-title mb-8">Statistiken</h2>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Noch keine Spieler oder Statistiken vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {players
              .sort((a, b) => {
                if (b.stats.wins !== a.stats.wins) {
                  return b.stats.wins - a.stats.wins;
                }
                return b.stats.totalPoints - a.stats.totalPoints;
              })
              .map((player, index) => (
                <div key={player.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-gray-100 text-gray-700 border border-gray-300">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{player.name}</div>
                        <div className="text-sm text-gray-600">
                          {player.stats.wins} Siege von {player.stats.gamesPlayed} Spielen
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-lg">{player.stats.totalPoints}</div>
                      <div className="text-gray-600">Gesamtpunkte</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{player.stats.averagePointsPerGame.toFixed(1)}</div>
                      <div className="text-gray-600">⌀ Punkte/Spiel</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{player.stats.gamesPlayed}</div>
                      <div className="text-gray-600">Gespielte Spiele</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{player.stats.totalThrows}</div>
                      <div className="text-gray-600">Würfe gesamt</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Games */}
      {gameHistory.length > 0 && (
        <div className="space-y-4">
          <h3 className="rubik-doodle-title text-center mb-4">Letzte Spiele</h3>
          <div className="space-y-2">
            {gameHistory
              .sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime))
              .slice(0, 5)
              .map((game) => {
                const winner = game.players.find(p => p.id === game.winner);
                const duration = game.endTime ? game.endTime - game.startTime : 0;
                
                return (
                  <div key={game.id} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">
                          {winner?.name} gewinnt mit {game.scores[game.winner || '']} Punkten
                        </div>
                        <div className="text-sm text-gray-600">
                          {game.players.map(p => p.name).join(', ')} • 
                          {new Date(game.endTime || game.startTime).toLocaleDateString('de-DE')} • 
                          {Math.round(duration / (1000 * 60))}min
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="text-center pt-6">
        <button
          onClick={() => setCurrentScreen('home')}
          className="modern-button-outline touch-manipulation px-8 py-4 text-lg font-semibold"
        >
          ← Zurück
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        {currentScreen === 'home' && renderHomeScreen()}
        {currentScreen === 'players' && renderPlayerScreen()}
        {currentScreen === 'objects' && renderObjectScreen()}
        {currentScreen === 'config' && renderConfigScreen()}
        {currentScreen === 'game' && renderGameScreen()}
        {currentScreen === 'gameEnd' && renderGameEndScreen()}
        {currentScreen === 'stats' && renderStatsScreen()}
      </main>
    </div>
  );
}