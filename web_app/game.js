// ========== МИНИМАЛЬНАЯ ИГРОВАЯ ЛОГИКА 2048 ==========

let board = []; // Игровое поле 4x4
let score = 0;
const GRID_SIZE = 4;

// DOM-элементы
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const messageElement = document.getElementById('message');
const restartBtn = document.getElementById('restart-btn');

// Инициализация игры
function initGame() {
    // Создаем пустое поле 4x4
    board = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    updateScore();
    messageElement.textContent = '';
    
    // Очищаем и заново рисуем поле
    gameBoard.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.id = `cell-${r}-${c}`;
            gameBoard.appendChild(cell);
        }
    }
    
    // Добавляем 2 начальные плитки
    addRandomTile();
    addRandomTile();
    updateBoardView();
    
    // Добавляем обработчик клавиш (стрелки)
    document.addEventListener('keydown', handleKeyPress);
    
    // Обработчик кнопки рестарта
    restartBtn.addEventListener('click', initGame);
}

// Добавляет плитку (2 с вероятностью 90%, 4 - 10%) в случайную пустую клетку
function addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === 0) {
                emptyCells.push({r, c});
            }
        }
    }
    if (emptyCells.length > 0) {
        const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
}

// Отображает состояние массива board на экране
function updateBoardView() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            const value = board[r][c];
            cell.textContent = value === 0 ? '' : value;
            cell.className = 'cell'; // Сбрасываем классы
            if (value > 0) {
                cell.classList.add(`tile-${value}`);
            }
        }
    }
}

// Обновляет счет на экране
function updateScore() {
    scoreElement.textContent = score;
}

// Обработка нажатия клавиш (движение)
function handleKeyPress(event) {
    let moved = false;
    switch(event.key) {
        case 'ArrowUp': moved = moveTiles('up'); break;
        case 'ArrowDown': moved = moveTiles('down'); break;
        case 'ArrowLeft': moved = moveTiles('left'); break;
        case 'ArrowRight': moved = moveTiles('right'); break;
        default: return; // Не стрелка — игнорируем
    }
    
    if (moved) {
        addRandomTile();
        updateBoardView();
        updateScore();
        checkGameStatus();
    }
}

// Логика движения плиток (упрощенная реализация)
function moveTiles(direction) {
    let moved = false;
    const oldBoard = JSON.parse(JSON.stringify(board)); // Копия доски для сравнения

    // Алгоритм движения: берем строки/столбцы, фильтруем нули, сливаем одинаковые
    for (let i = 0; i < GRID_SIZE; i++) {
        let line = [];
        
        // Формируем строку/столбец в зависимости от направления
        if (direction === 'left') line = board[i].filter(val => val !== 0);
        if (direction === 'right') line = board[i].filter(val => val !== 0).reverse();
        if (direction === 'up') {
            for (let j = 0; j < GRID_SIZE; j++) line.push(board[j][i]);
            line = line.filter(val => val !== 0);
        }
        if (direction === 'down') {
            for (let j = GRID_SIZE - 1; j >= 0; j--) line.push(board[j][i]);
            line = line.filter(val => val !== 0);
        }

        // Сливаем одинаковые соседние числа
        const mergedLine = [];
        for (let j = 0; j < line.length; j++) {
            if (j < line.length - 1 && line[j] === line[j + 1]) {
                mergedLine.push(line[j] * 2);
                score += line[j] * 2; // Добавляем очки за слияние
                j++; // Пропускаем следующую плитку (она уже слита)
            } else {
                mergedLine.push(line[j]);
            }
        }

        // Заполняем оставшееся место нулями
        while (mergedLine.length < GRID_SIZE) mergedLine.push(0);

        // Возвращаем на доску в правильном порядке
        if (direction === 'left') board[i] = mergedLine;
        if (direction === 'right') board[i] = mergedLine.reverse();
        if (direction === 'up') {
            for (let j = 0; j < GRID_SIZE; j++) board[j][i] = mergedLine[j];
        }
        if (direction === 'down') {
            mergedLine.reverse();
            for (let j = 0; j < GRID_SIZE; j++) board[j][i] = mergedLine[j];
        }
    }

    // Проверяем, изменилась ли доска
    moved = JSON.stringify(oldBoard) !== JSON.stringify(board);
    return moved;
}

// Проверка состояния игры (победа/поражение)
function checkGameStatus() {
    // Проверка на победу (плитка 2048)
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === 2048) {
                messageElement.textContent = '🎉 ПОБЕДА! Вы собрали 2048!';
                return;
            }
        }
    }

    // Проверка на наличие ходов
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === 0) return; // Есть пустая клетка — игра продолжается
            // Есть возможное слияние с соседом
            if (c < GRID_SIZE - 1 && board[r][c] === board[r][c + 1]) return;
            if (r < GRID_SIZE - 1 && board[r][c] === board[r + 1][c]) return;
        }
    }

    // Если дошли сюда — ходов нет
    messageElement.textContent = '💥 ИГРА ОКОНЧЕНА. Нажми "Новая игра"';
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
// Запускаем игру, когда страница загрузится
window.addEventListener('DOMContentLoaded', initGame);
