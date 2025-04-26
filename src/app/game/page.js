'use client';

import { useState, useEffect } from 'react';

const GRID_ROWS = 6;
const GRID_COLS = 8;

// Returns the maximum capacity of a cell based on its position
const getMaxCapacity = (row, col) => {
  // Count the number of possible neighbors
  let neighbors = 4; // Start with maximum (top, right, bottom, left)
  
  // Remove neighbors for edges
  if (row === 0) neighbors--; // No top neighbor
  if (row === GRID_ROWS - 1) neighbors--; // No bottom neighbor
  if (col === 0) neighbors--; // No left neighbor
  if (col === GRID_COLS - 1) neighbors--; // No right neighbor
  
  return neighbors;
};

// Get adjacent cells (neighbors)
const getAdjacentCells = (row, col) => {
  const adjacentCells = [];
  
  // Check all four directions
  if (row > 0) adjacentCells.push([row - 1, col]); // Top
  if (row < GRID_ROWS - 1) adjacentCells.push([row + 1, col]); // Bottom
  if (col > 0) adjacentCells.push([row, col - 1]); // Left
  if (col < GRID_COLS - 1) adjacentCells.push([row, col + 1]); // Right
  
  return adjacentCells;
};

const emptyBoard = () =>
  Array(GRID_ROWS)
    .fill()
    .map(() =>
      Array(GRID_COLS)
        .fill()
        .map(() => ({ count: 0, owner: null }))
    );

export default function Game() {
  const [board, setBoard] = useState(emptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [explosionCount, setExplosionCount] = useState(0);

  const checkGameOver = (board) => {
    // Don't check for game over until at least 3 moves have been made
    if (moveCount < 3) return false;
    
    let player1HasOrbs = false;
    let player2HasOrbs = false;
    
    // Check if both players have orbs on the board
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = board[row][col];
        if (cell.owner === 1 && cell.count > 0) player1HasOrbs = true;
        if (cell.owner === 2 && cell.count > 0) player2HasOrbs = true;
        
        // If both players have orbs, game continues
        if (player1HasOrbs && player2HasOrbs) return false;
      }
    }
    
    // Game is over only if at least one move has been made and one player has no orbs
    if (moveCount > 0) {
      if (!player1HasOrbs && player2HasOrbs) {
        setGameOver(true);
        setWinner(2);
        return true;
      }
      if (!player2HasOrbs && player1HasOrbs) {
        setGameOver(true);
        setWinner(1);
        return true;
      }
    }
    
    return false;
  };

  const processChainReaction = (newBoard) => {
    let cellsToExplode = [];
    
    // First pass: identify all cells that need to explode
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = newBoard[row][col];
        const capacity = getMaxCapacity(row, col);
        
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
      const adjacentCells = getAdjacentCells(row, col);
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
      console.log('Cannot click: cell owned by other player', cell);
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
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      console.log('Switching to player', nextPlayer);
      setCurrentPlayer(nextPlayer);
    }
    
    setTimeout(() => {
      setAnimating(false);
    }, 500);
  };

  // Reset game function
  const resetGame = () => {
    setBoard(emptyBoard());
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
    setMoveCount(0);
    setExplosionCount(0);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Chain Reaction</h1>
        <div className="mb-4 flex justify-between items-center">
          <div className={`px-4 py-2 rounded ${currentPlayer === 1 ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'} font-bold`}>
            Current Player: {currentPlayer}
          </div>
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            onClick={resetGame}
          >
            Restart Game
          </button>
        </div>

        {/* Game instructions */}
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-sm">
          <p><strong>How to play:</strong> Players take turns placing orbs. When a cell contains more orbs than its capacity, it explodes!</p>
          <p><strong>Cell Capacity:</strong> Based on neighbors - Corners: 2 | Edges: 3 | Middle: 4</p>
          <p><strong>Goal:</strong> Eliminate all of your opponent's orbs from the board.</p>
        </div>

        <div className="grid gap-1 bg-white p-4 rounded-lg shadow-lg">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((cell, colIndex) => {
                const isPlayer1 = cell.owner === 1;
                const isPlayer2 = cell.owner === 2;
                const isCurrentPlayer = cell.owner === currentPlayer;
                const isEmpty = cell.owner === null;
                const capacity = getMaxCapacity(rowIndex, colIndex);
                const isFull = cell.count >= capacity;
                const isNearCapacity = cell.count === capacity - 1 && cell.count > 0;
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200
                      ${isPlayer1 ? 'bg-blue-500 border-blue-700' : ''}
                      ${isPlayer2 ? 'bg-red-500 border-red-700' : ''}
                      ${isEmpty ? 'bg-gray-100 border-gray-300' : ''}
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
            Game Over! {winner === 1 ? 'Player 1 (Blue)' : 'Player 2 (Red)'} wins!
          </div>
        )}
      </div>
    </div>
  );
} 