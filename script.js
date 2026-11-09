// Navegação e seleção de dificuldade
const difficultyButtons = document.querySelectorAll('.difficulty-card');
difficultyButtons.forEach(button => {
  button.addEventListener('click', () => {
    localStorage.setItem('velhaDificuldade', button.dataset.level);
    window.location.href = 'jogo.html';
  });
});

// Lógica do jogo
const boardElement = document.querySelector('#board');
if (boardElement) {
  const cells = [...document.querySelectorAll('.cell')];
  const statusElement = document.querySelector('#status');
  const moveElement = document.querySelector('#moveCount');
  const levelElement = document.querySelector('#levelIndicator');

  let board = Array(9).fill('');
  let gameOver = false;
  let playerTurn = true;
  let moves = 0;
  let scores = JSON.parse(localStorage.getItem('velhaPlacar') || '{"player":0,"draw":0,"ai":0}');
  const difficulty = localStorage.getItem('velhaDificuldade') || 'medio';
  const names = { facil: 'FÁCIL', medio: 'MÉDIO', dificil: 'DIFÍCIL' };
  levelElement.textContent = 'NÍVEL ' + names[difficulty];

  function updateScores() {
    document.querySelector('#playerScore').textContent = scores.player;
    document.querySelector('#drawScore').textContent = scores.draw;
    document.querySelector('#aiScore').textContent = scores.ai;
    localStorage.setItem('velhaPlacar', JSON.stringify(scores));
  }
  updateScores();

  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function getWinner(state) {
    for (const line of wins) {
      const [a,b,c] = line;
      if (state[a] && state[a] === state[b] && state[a] === state[c]) {
        return { winner: state[a], line };
      }
    }
    return null;
  }

  function render() {
    cells.forEach((cell, index) => {
      cell.textContent = board[index];
      cell.className = 'cell' + (board[index] === 'O' ? ' o' : '');
      cell.disabled = Boolean(board[index]) || gameOver || !playerTurn;
    });
    moveElement.textContent = moves;
  }

  function setStatus(message, type = '') {
    statusElement.innerHTML = '<span class="status-dot"></span>' + message;
    if (type === 'win') statusElement.style.color = '#b7aaff';
    else if (type === 'lose') statusElement.style.color = '#8ce7e1';
    else statusElement.style.color = '#c2cce0';
  }

  function finish(result) {
    gameOver = true;
    if (result === 'X') {
      scores.player++;
      setStatus('Você venceu! Excelente estratégia!', 'win');
    } else if (result === 'O') {
      scores.ai++;
      setStatus('A IA venceu desta vez. Tente novamente!', 'lose');
    } else {
      scores.draw++;
      setStatus('Deu velha! A partida terminou empatada.');
    }
    const win = getWinner(board);
    if (win) win.line.forEach(index => cells[index].classList.add('winner'));
    updateScores();
    render();
  }

  function checkEnd() {
    const result = getWinner(board);
    if (result) {
      finish(result.winner);
      return true;
    }
    if (board.every(cell => cell !== '')) {
      finish('draw');
      return true;
    }
    return false;
  }

  function availableMoves(state) {
    return state.map((value, index) => value === '' ? index : null).filter(value => value !== null);
  }

  function randomMove(state) {
    const options = availableMoves(state);
    return options[Math.floor(Math.random() * options.length)];
  }

  function findWinningMove(state, symbol) {
    for (const index of availableMoves(state)) {
      const copy = [...state];
      copy[index] = symbol;
      if (getWinner(copy)) return index;
    }
    return null;
  }

  // Fácil: escolha aleatória. Médio: vence se puder, bloqueia e prioriza o centro.
  function mediumMove() {
    let move = findWinningMove(board, 'O');
    if (move !== null) return move;
    move = findWinningMove(board, 'X');
    if (move !== null) return move;
    if (board[4] === '') return 4;
    const corners = [0,2,6,8].filter(i => board[i] === '');
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    return randomMove(board);
  }

  // Difícil: minimax, que avalia todas as possibilidades até o fim da partida.
  function minimax(state, isMaximizing, depth) {
    const result = getWinner(state);
    if (result?.winner === 'O') return 10 - depth;
    if (result?.winner === 'X') return depth - 10;
    if (state.every(cell => cell !== '')) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (const index of availableMoves(state)) {
        state[index] = 'O';
        best = Math.max(best, minimax(state, false, depth + 1));
        state[index] = '';
      }
      return best;
    } else {
      let best = Infinity;
      for (const index of availableMoves(state)) {
        state[index] = 'X';
        best = Math.min(best, minimax(state, true, depth + 1));
        state[index] = '';
      }
      return best;
    }
  }

  function hardMove() {
    let bestScore = -Infinity;
    let bestMoves = [];
    for (const index of availableMoves(board)) {
      board[index] = 'O';
      const score = minimax(board, false, 0);
      board[index] = '';
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [index];
      } else if (score === bestScore) {
        bestMoves.push(index);
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function aiPlay() {
    if (gameOver) return;
    let choice;
    if (difficulty === 'facil') choice = randomMove(board);
    else if (difficulty === 'dificil') choice = hardMove();
    else choice = mediumMove();

    if (choice === undefined) return;
    board[choice] = 'O';
    moves++;
    playerTurn = true;
    render();
    if (!checkEnd()) setStatus('Sua vez! Escolha uma casa.');
  }

  function playerPlay(index) {
    if (gameOver || !playerTurn || board[index] !== '') return;
    board[index] = 'X';
    moves++;
    playerTurn = false;
    render();
    if (checkEnd()) return;
    setStatus('A IA está pensando...');
    window.setTimeout(aiPlay, 450);
  }

  cells.forEach(cell => {
    cell.addEventListener('click', () => playerPlay(Number(cell.dataset.index)));
  });

  function newGame() {
    board = Array(9).fill('');
    gameOver = false;
    playerTurn = true;
    moves = 0;
    cells.forEach(cell => cell.classList.remove('winner'));
    setStatus('Sua vez! Escolha uma casa.');
    render();
  }

  document.querySelector('#newGame').addEventListener('click', newGame);
  document.querySelector('#resetScore').addEventListener('click', () => {
    scores = { player: 0, draw: 0, ai: 0 };
    updateScores();
    newGame();
  });

  render();
}
