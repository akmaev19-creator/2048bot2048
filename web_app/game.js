// ========== ИНТЕГРАЦИЯ С TELEGRAM WEB APP ==========

// Основной объект Telegram Web App
let tg = null;
let tgUser = null;
let isTgInitialized = false;

// Функция инициализации Telegram
function initTelegram() {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        
        // Развернуть на весь экран и показать интерфейс
        tg.expand();
        tg.ready();
        
        // Получаем данные пользователя
        tgUser = tg.initDataUnsafe?.user;
        
        if (tgUser) {
            // Заполняем информацию в интерфейсе
            document.getElementById('userName').textContent = tgUser.first_name || 'Игрок';
            document.getElementById('displayName').textContent = tgUser.first_name || 'Игрок';
            document.getElementById('userId').textContent = tgUser.id;
            
            // Устанавливаем аватар
            const avatarEl = document.getElementById('userAvatar');
            if (tgUser.first_name) {
                avatarEl.textContent = tgUser.first_name.charAt(0).toUpperCase();
            }
            
            // Загружаем сохраненный прогресс пользователя
            loadUserProgress();
            
            // Загружаем таблицу рекордов
            loadTopRecords();
            
            // Скрываем кнопку "Начать игру" (в Telegram игра запускается сразу)
            document.getElementById('boardOverlay').style.display = 'none';
        }
        
        // Настраиваем цветовую схему Telegram
        applyTelegramTheme();
        isTgInitialized = true;
        
        console.log('✅ Telegram Web App инициализирован');
    } else {
        console.log('ℹ️ Запущено вне Telegram, используем локальный режим');
        // Заглушка для локального тестирования
        document.getElementById('userName').textContent = 'Локальный режим';
        document.getElementById('displayName').textContent = 'Локальный игрок';
    }
}

// Применяем тему Telegram (светлая/темная)
function applyTelegramTheme() {
    if (!tg) return;
    
    const theme = tg.colorScheme; // 'light' или 'dark'
    const themeMap = {
        'light': 'light',
        'dark': 'dark'
    };
    
    if (themeMap[theme]) {
        setGameTheme(themeMap[theme]);
        document.getElementById('themeIndicator').innerHTML = 
            `<i class="fas fa-circle"></i> ${theme === 'light' ? 'Светлая' : 'Темная'}`;
    }
}

// Загружает сохраненный прогресс пользователя с сервера (бота)
async function loadUserProgress() {
    if (!tgUser) return;
    
    try {
        // Отправляем запрос вашему боту на Railway
        const response = await fetch('https://akmaev19-creator.github.io/2048bot2048/web_app/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: tgUser.id })
        });
        
        if (response.ok) {
            const data = await response.json();
            // data должна содержать: bestScore, gamesPlayed, currentBoard, currentScore
            if (data.bestScore) {
                document.getElementById('bestScore').textContent = data.bestScore;
                document.getElementById('sessionBest').textContent = data.bestScore;
            }
            if (data.gamesPlayed) {
                document.getElementById('gamesPlayed').textContent = data.gamesPlayed;
            }
            if (data.currentBoard) {
                // Восстанавливаем сохраненную игру
                board = data.currentBoard;
                score = data.currentScore || 0;
                updateBoardView();
                updateScore();
            }
            console.log('✅ Прогресс загружен');
        }
    } catch (error) {
        console.log('⚠️ Не удалось загрузить прогресс:', error);
    }
}

// Сохраняет текущий прогресс на сервер (боту)
async function saveUserProgress() {
    if (!tgUser) return;
    
    const progressData = {
        userId: tgUser.id,
        username: tgUser.username || tgUser.first_name,
        bestScore: Math.max(parseInt(document.getElementById('bestScore').textContent), score),
        currentScore: score,
        currentBoard: board,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Отправляем данные вашему боту на Railway
        const response = await fetch('https://akmaev19-creator.github.io/2048bot2048/web_app/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progressData)
        });
        
        if (response.ok) {
            console.log('✅ Прогресс сохранен');
            // Показываем уведомление
            showGameMessage('Прогресс сохранен в облаке!', 'success');
        }
    } catch (error) {
        console.log('⚠️ Ошибка сохранения:', error);
        showGameMessage('Ошибка сохранения', 'error');
    }
}

// Загружает топ рекордов
async function loadTopRecords() {
    try {
        const response = await fetch('https://akmaev19-creator.github.io/2048bot2048/web_app/');
        if (response.ok) {
            const records = await response.json();
            updateRecordsList(records);
        }
    } catch (error) {
        console.log('⚠️ Не удалось загрузить рекорды');
    }
}

// Обновляет список рекордов в интерфейсе
function updateRecordsList(records) {
    const recordsList = document.getElementById('recordsList');
    recordsList.innerHTML = '';
    
    records.slice(0, 5).forEach((record, index) => {
        const recordEl = document.createElement('div');
        recordEl.className = 'record-item';
        recordEl.innerHTML = `
            <div class="record-rank">${index + 1}</div>
            <div class="record-user">${record.username}</div>
            <div class="record-score">${record.score}</div>
        `;
        recordsList.appendChild(recordEl);
    });
}

// Отправляет финальный результат при завершении игры
async function sendFinalScore(finalScore) {
    if (!tgUser) return;
    
    const gameResult = {
        userId: tgUser.id,
        username: tgUser.username || tgUser.first_name,
        score: finalScore,
        board: board,
        date: new Date().toISOString()
    };
    
    // Отправляем данные через Telegram Web App (бот получит как web_app_data)
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify(gameResult));
        console.log('✅ Результат отправлен боту');
    }
    
    // Дублируем сохранение прогресса
    await saveUserProgress();
}

// Инициализируем Telegram при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram Web App
    initTelegram();
    
    // Инициализация игры (ваш существующий код)
    initGame();
    
    // Добавляем обработчики новых кнопок
    document.getElementById('saveProgressBtn').addEventListener('click', saveUserProgress);
    document.getElementById('backToBotBtn').addEventListener('click', function() {
        if (tg && tg.close) {
            tg.close();
        }
    });
    
    // Инициализация выбора темы
    initThemeSelector();
});
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
  // ========== ДОБАВЛЯЕМ УПРАВЛЕНИЕ СВАЙПАМИ ==========

let touchStartX = 0;
let touchStartY = 0;
const minSwipeDistance = 30; // Минимальное расстояние для распознавания свайпа

// Обработка начала касания
gameBoard.addEventListener('touchstart', function(event) {
    // Отключаем стандартное поведение (например, прокрутку страницы)
    event.preventDefault();
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: false }); // Важно для preventDefault()

// Обработка движения пальца и окончания свайпа
gameBoard.addEventListener('touchend', function(event) {
    event.preventDefault();
    if (!touchStartX || !touchStartY) return;

    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;

    // Вычисляем разницу
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Сбрасываем координаты начала
    touchStartX = 0;
    touchStartY = 0;

    // Определяем направление (какая ось изменена больше?)
    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Горизонтальный свайп
        if (Math.abs(diffX) < minSwipeDistance) return; // Слишком короткий
        if (diffX > 0) {
            // Свайп вправо
            makeMove('right');
        } else {
            // Свайп влево
            makeMove('left');
        }
    } else {
        // Вертикальный свайп
        if (Math.abs(diffY) < minSwipeDistance) return; // Слишком короткий
        if (diffY > 0) {
            // Свайп вниз
            makeMove('down');
        } else {
            // Свайп вверх
            makeMove('up');
        }
    }
}, { passive: false });

// Функция для обработки хода (объединяет логику клавиш и свайпов)
function makeMove(direction) {
    const moved = moveTiles(direction);
    if (moved) {
        addRandomTile();
        updateBoardView();
        updateScore();
        checkGameStatus();
    }
}
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
    let direction;
    switch(event.key) {
        case 'ArrowUp': direction = 'up'; break;
        case 'ArrowDown': direction = 'down'; break;
        case 'ArrowLeft': direction = 'left'; break;
        case 'ArrowRight': direction = 'right'; break;
        default: return; // Игнорируем другие клавиши
    }
    // Используем новую универсальную функцию makeMove
    makeMove(direction);
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
