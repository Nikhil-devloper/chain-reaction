'use client';

import { useState, useEffect } from 'react';

// Player colors for up to 6 players
const PLAYER_COLORS = {
  1: {bg: 'bg-blue-500', border: 'border-blue-700', text: 'text-blue-800', light: 'bg-blue-200'},
  2: {bg: 'bg-red-500', border: 'border-red-700', text: 'text-red-800', light: 'bg-red-200'},
  3: {bg: 'bg-green-500', border: 'border-green-700', text: 'text-green-800', light: 'bg-green-200'},
  4: {bg: 'bg-purple-500', border: 'border-purple-700', text: 'text-purple-800', light: 'bg-purple-200'},
  5: {bg: 'bg-yellow-500', border: 'border-yellow-700', text: 'text-yellow-800', light: 'bg-yellow-200'},
  6: {bg: 'bg-orange-500', border: 'border-orange-700', text: 'text-orange-800', light: 'bg-orange-200'},
};

// Returns the maximum capacity of a cell based on its position
const getMaxCapacity = (row, col, rows, cols) => {
  // Count the number of possible neighbors
  let neighbors = 4; // Start with maximum (top, right, bottom, left)
  
  // Remove neighbors for edges
  if (row === 0) neighbors--; // No top neighbor
  if (row === rows - 1) neighbors--; // No bottom neighbor
  if (col === 0) neighbors--; // No left neighbor
  if (col === cols - 1) neighbors--; // No right neighbor
  
  return neighbors;
};

// Get adjacent cells (neighbors)
const getAdjacentCells = (row, col, rows, cols) => {
  const adjacentCells = [];
  
  // Check all four directions
  if (row > 0) adjacentCells.push([row - 1, col]); // Top
  if (row < rows - 1) adjacentCells.push([row + 1, col]); // Bottom
  if (col > 0) adjacentCells.push([row, col - 1]); // Left
  if (col < cols - 1) adjacentCells.push([row, col + 1]); // Right
  
  return adjacentCells;
};

const emptyBoard = (rows, cols) =>
  Array(rows)
    .fill()
    .map(() =>
      Array(cols)
        .fill()
        .map(() => ({ count: 0, owner: null }))
    );

export default function Game() {
  const [gridSize, setGridSize] = useState({ rows: 6, cols: 8 });
  const [playerCount, setPlayerCount] = useState(2);
  const [board, setBoard] = useState(emptyBoard(gridSize.rows, gridSize.cols));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [explosionCount, setExplosionCount] = useState(0);
  const [message, setMessage] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  const showMessage = (text, duration = 3000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  };

  const checkGameOver = (board) => {
    // Don't check for game over until at least 3 moves have been made
    if (moveCount < playerCount + 1) return false;
    
    // Track which players have orbs
    const playersWithOrbs = new Set();
    
    // Check if multiple players have orbs on the board
    for (let row = 0; row < gridSize.rows; row++) {
      for (let col = 0; col < gridSize.cols; col++) {
        const cell = board[row][col];
        if (cell.owner !== null && cell.count > 0) {
          playersWithOrbs.add(cell.owner);
        }
        
        // If multiple players have orbs, game continues
        if (playersWithOrbs.size > 1) return false;
      }
    }
    
    // Game is over only if at least one move has been made and only one player has orbs
    if (moveCount > 0 && playersWithOrbs.size === 1) {
      const winningPlayer = Array.from(playersWithOrbs)[0];
      setGameOver(true);
      setWinner(winningPlayer);
      return true;
    }
    
    return false;
  };

  const processChainReaction = (newBoard) => {
    let cellsToExplode = [];
    
    // First pass: identify all cells that need to explode
    for (let row = 0; row < gridSize.rows; row++) {
      for (let col = 0; col < gridSize.cols; col++) {
        const cell = newBoard[row][col];
        const capacity = getMaxCapacity(row, col, gridSize.rows, gridSize.cols);
        
        if (cell.count >= capacity && cell.owner !== null) {
          cellsToExplode.push({ row, col, owner: cell.owner });
        }
      }
    }
    
    // If no cells need to explode, we're done
    if (cellsToExplode.length === 0) {
      return false;
    }
    
    // Second pass: explode all identified cells
    cellsToExplode.forEach(({ row, col, owner }) => {
      // Reset the exploding cell
      newBoard[row][col].count = 0;
      newBoard[row][col].owner = null;
      
      // Add orbs to adjacent cells
      const adjacentCells = getAdjacentCells(row, col, gridSize.rows, gridSize.cols);
      adjacentCells.forEach(([adjRow, adjCol]) => {
        const cell = newBoard[adjRow][adjCol];
        cell.count += 1;
        cell.owner = owner; // Take ownership
      });
      
      setExplosionCount(prev => prev + 1);
    });
    
    return true; // Explosions occurred
  };

  const handleCellClick = (row, col) => {
    if (gameOver || animating) return;
    
    // Get the cell that was clicked
    const cell = board[row][col];
    
    // Only allow clicks on empty cells or cells owned by the current player
    if (cell.owner !== null && cell.owner !== currentPlayer) {
      showMessage(`This cell belongs to Player ${cell.owner}. You can only place orbs in empty cells or your own cells.`);
      return;
    }
    
    setAnimating(true);
    setExplosionCount(0);
    
    // Increment move count
    setMoveCount(moveCount + 1);
    
    // Create a deep copy of the board
    const newBoard = JSON.parse(JSON.stringify(board));
    
    // Update the clicked cell
    newBoard[row][col].count += 1;
    newBoard[row][col].owner = currentPlayer;
    
    // Process chain reactions until no more explosions occur
    let explosionsOccurred = true;
    let safetyCounter = 0;
    const MAX_ITERATIONS = 100;
    
    while (explosionsOccurred && safetyCounter < MAX_ITERATIONS) {
      explosionsOccurred = processChainReaction(newBoard);
      safetyCounter++;
    }
    
    // Update the board
    setBoard(newBoard);
    
    // Check if game is over, otherwise switch players
    if (!checkGameOver(newBoard)) {
      let nextPlayer = currentPlayer + 1;
      if (nextPlayer > playerCount) {
        nextPlayer = 1;
      }
      setCurrentPlayer(nextPlayer);
    }
    
    setTimeout(() => {
      setAnimating(false);
    }, 500);
  };

  // Reset game function
  const resetGame = () => {
    setBoard(emptyBoard(gridSize.rows, gridSize.cols));
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
    setMoveCount(0);
    setExplosionCount(0);
    setGameStarted(true);
    showMessage(`Game started with ${playerCount} players on a ${gridSize.rows}x${gridSize.cols} grid!`);
  };

  const startNewGame = () => {
    setGameStarted(true);
    resetGame();
  };

  // Configuration component for setting up the game
  const GameConfig = () => (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-xl font-bold mb-4">Game Setup</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Grid Size</h3>
          <div className="flex space-x-3 mb-4">
            <button 
              onClick={() => setGridSize({ rows: 6, cols: 8 })}
              className={`px-3 py-1 rounded ${gridSize.rows === 6 && gridSize.cols === 8 ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
            >
              6 x 8
            </button>
            <button 
              onClick={() => setGridSize({ rows: 7, cols: 7 })}
              className={`px-3 py-1 rounded ${gridSize.rows === 7 && gridSize.cols === 7 ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
            >
              7 x 7
            </button>
            <button 
              onClick={() => setGridSize({ rows: 8, cols: 6 })}
              className={`px-3 py-1 rounded ${gridSize.rows === 8 && gridSize.cols === 6 ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
            >
              8 x 6
            </button>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Number of Players</h3>
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 5, 6].map(num => (
              <button 
                key={num}
                onClick={() => setPlayerCount(num)}
                className={`px-3 py-1 rounded ${playerCount === num ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <button
        onClick={startNewGame}
        className="mt-6 w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold"
      >
        Start Game
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Chain Reaction</h1>
        
        {!gameStarted ? (
          <GameConfig />
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <div className={`px-4 py-2 rounded ${PLAYER_COLORS[currentPlayer].light} ${PLAYER_COLORS[currentPlayer].text} font-bold`}>
                Current Player: {currentPlayer}
              </div>
              <div className="flex space-x-2">
                <button
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
                  onClick={resetGame}
                >
                  Restart Game
                </button>
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                  onClick={() => setGameStarted(false)}
                >
                  New Setup
                </button>
              </div>
            </div>

            {/* Game instructions */}
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-sm">
              <p><strong>How to play:</strong> Players take turns placing orbs. When a cell contains more orbs than its capacity, it explodes!</p>
              <p><strong>Cell Capacity:</strong> Based on neighbors - Corners: 2 | Edges: 3 | Middle: 4</p>
              <p><strong>Goal:</strong> Eliminate all of your opponents' orbs from the board.</p>
            </div>

            {/* Player legend */}
            <div className="mb-4 flex flex-wrap gap-2">
              {Array.from({length: playerCount}, (_, i) => i + 1).map(player => (
                <div key={player} className={`px-3 py-1 rounded-full ${PLAYER_COLORS[player].light} ${PLAYER_COLORS[player].text}`}>
                  Player {player}
                </div>
              ))}
            </div>

            {/* Message notification */}
            {message && (
              <div className="mb-4 p-3 bg-white border-l-4 border-blue-500 rounded shadow-md">
                {message}
              </div>
            )}

            <div className="grid gap-1 bg-white p-4 rounded-lg shadow-lg overflow-x-auto">
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((cell, colIndex) => {
                    const playerColor = cell.owner ? PLAYER_COLORS[cell.owner] : null;
                    const isCurrentPlayer = cell.owner === currentPlayer;
                    const isEmpty = cell.owner === null;
                    const capacity = getMaxCapacity(rowIndex, colIndex, gridSize.rows, gridSize.cols);
                    const isFull = cell.count >= capacity;
                    const isNearCapacity = cell.count === capacity - 1 && cell.count > 0;
                    
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200
                          ${playerColor ? playerColor.bg : 'bg-gray-100'}
                          ${playerColor ? playerColor.border : 'border-gray-300'}
                          ${isNearCapacity ? 'ring-2 ring-yellow-400' : ''}
                          ${isFull ? 'ring-2 ring-red-400 animate-pulse' : ''}
                          ${isEmpty || isCurrentPlayer ? 'hover:border-yellow-400 hover:scale-105' : ''}
                          ${animating && cell.count > 0 ? 'animate-bounce' : ''}
                        `}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      >
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Cell capacity indicator */}
                          <span className="absolute top-0 left-1 text-[8px] text-white/80 font-bold">{capacity}</span>
                          
                          {/* Orb count visualization */}
                          {cell.count > 0 && (
                            <div className="flex items-center justify-center">
                              {cell.count === 1 && (
                                <div className="w-6 h-6 rounded-full bg-white/70 shadow-lg"></div>
                              )}
                              {cell.count === 2 && (
                                <div className="flex space-x-1">
                                  <div className="w-5 h-5 rounded-full bg-white/70 shadow-lg"></div>
                                  <div className="w-5 h-5 rounded-full bg-white/70 shadow-lg"></div>
                                </div>
                              )}
                              {cell.count === 3 && (
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="w-4 h-4 rounded-full bg-white/70 shadow-lg"></div>
                                  <div className="w-4 h-4 rounded-full bg-white/70 shadow-lg"></div>
                                  <div className="w-4 h-4 rounded-full bg-white/70 shadow-lg col-span-2 mx-auto"></div>
                                </div>
                              )}
                              {cell.count >= 4 && (
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="w-4 h-4 rounded-full bg-white/70 shadow-lg"></div>
                                  <div className="w-4 h-4 rounded-full bg-white/70 shadow-lg"></div>
                                  <div className="w-4 h-4 rounded-full bg-white/70 shadow-lg"></div>
                                  <div className="w-4 h-4 rounded-full bg-white/70 shadow-lg"></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {gameOver && (
              <div className="mt-4 text-center p-3 rounded bg-yellow-100 text-xl font-bold">
                Game Over! Player {winner} ({Object.keys(PLAYER_COLORS).find(key => parseInt(key) === winner)}) wins!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 