import logging
import json
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

# ==================== НАСТРОЙКИ ====================
# ТОКЕН БОТА (уже вставлен ваш)
TOKEN = '8472972769:AAEo3E1PduwdIwQ6Kcz1y2Pmc1lCrPEX4kM'
# ===================================================

# Настройка журналирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

# Файлы для хранения данных
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
USERS_FILE = os.path.join(DATA_DIR, "users.json")
RECORDS_FILE = os.path.join(DATA_DIR, "records.json")

# Инициализация пустых файлов данных при запуске
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w') as f:
        json.dump({}, f)
if not os.path.exists(RECORDS_FILE):
    with open(RECORDS_FILE, 'w') as f:
        json.dump([], f)

# ---------- Функции для работы с данными ----------
def get_user_data(user_id):
    """Загружает данные пользователя"""
    try:
        with open(USERS_FILE, 'r') as f:
            data = json.load(f)
    except Exception as e:
        logger.error(f"Ошибка загрузки данных пользователя: {e}")
        data = {}
    user_str = str(user_id)
    if user_str not in data:
        # Данные по умолчанию для нового пользователя
        data[user_str] = {
            'theme': 'light',      # Тема: light, dark, yellow
            'sound': True,         # Звук: Вкл/Выкл
            'score': 0,            # Текущий счет
            'board': None,         # Игровое поле
            'game_active': False   # Идет ли игра
        }
        save_user_data(user_id, data[user_str])
    return data[user_str]

def save_user_data(user_id, user_data):
    """Сохраняет данные пользователя"""
    try:
        with open(USERS_FILE, 'r') as f:
            data = json.load(f)
    except:
        data = {}
    data[str(user_id)] = user_data
    with open(USERS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def update_record(user_id, username, score):
    """Обновляет таблицу рекордов"""
    try:
        with open(RECORDS_FILE, 'r') as f:
            records = json.load(f)
    except:
        records = []
    
    # Ищем существующую запись
    found = False
    for record in records:
        if record['user_id'] == user_id:
            if score > record['score']:
                record['score'] = score
                record['username'] = username
            found = True
            break
    # Если не нашли, добавляем новую
    if not found:
        records.append({'user_id': user_id, 'username': username, 'score': score})
    
    # Сортируем по убыванию и берем топ-10
    records.sort(key=lambda x: x['score'], reverse=True)
    records = records[:10]
    
    with open(RECORDS_FILE, 'w') as f:
        json.dump(records, f, indent=2)

def get_top_records():
    """Возвращает топ-10 рекордов"""
    try:
        with open(RECORDS_FILE, 'r') as f:
            records = json.load(f)
        return records[:10]
    except:
        return []

# ---------- Функции игры 2048 (упрощенные) ----------
def init_game_board():
    """Создает новое игровое поле"""
    return [[0 for _ in range(4)] for _ in range(4)]

def add_new_tile(board):
    """Добавляет новую плитку (2 или 4) в случайную пустую клетку"""
    import random
    empty_cells = [(r, c) for r in range(4) for c in range(4) if board[r][c] == 0]
    if empty_cells:
        r, c = random.choice(empty_cells)
        board[r][c] = 2 if random.random() < 0.9 else 4
    return board

def format_board(board, theme='light'):
    """Форматирует доску в строку с эмодзи"""
    theme_emojis = {
        'light': ['⬜', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '💯'],
        'dark': ['⬛', '1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟', '💯'],
        'yellow': ['🟨', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '💯']
    }
    emojis = theme_emojis.get(theme, theme_emojis['light'])
    board_str = ""
    for row in board:
        for cell in row:
            if cell == 0:
                board_str += emojis[0]
            else:
                idx = min(int(cell).bit_length(), len(emojis)-1)
                board_str += emojis[idx]
        board_str += "\n"
    return board_str

# ---------- Команды бота ----------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    user = update.effective_user
    keyboard = [
        [InlineKeyboardButton("🎮 НАЧАТЬ ИГРУ", callback_data='new_game')],
        [InlineKeyboardButton("🏆 ТАБЛИЦА РЕКОРДОВ", callback_data='show_records')],
        [InlineKeyboardButton("⚙️ НАСТРОЙКИ", callback_data='settings_menu')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"👋 Привет, {user.first_name}!\n"
        "Добро пожаловать в игру 2048 прямо в Telegram!\n\n"
        "🎯 **Цель игры**: объединяй одинаковые числа, чтобы получить плитку 2048!\n"
        "🎨 **Темы**: Светлая, Тёмная, Жёлтая\n"
        "🔊 **Звук**: Можно включить/выключить\n"
        "🏆 **Рекорды**: Попади в топ-10 игроков!\n\n"
        "Нажми кнопку ниже, чтобы начать:",
        reply_markup=reply_markup
    )

async def play(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /play"""
    await start_new_game(update, context, is_command=True)

async def records(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /records"""
    records_list = get_top_records()
    if not records_list:
        await update.message.reply_text("🏆 Таблица рекордов пуста. Будь первым!")
        return
    
    records_text = "🏆 **ТОП-10 РЕКОРДСМЕНОВ** 🏆\n\n"
    for i, record in enumerate(records_list, 1):
        records_text += f"{i}. @{record['username']} — **{record['score']}** очков\n"
    
    await update.message.reply_text(records_text)

# ---------- Основная игровая логика ----------
async def start_new_game(update, context, is_command=False):
    """Запускает новую игру"""
    if is_command:
        user = update.effective_user
        chat_id = update.message.chat_id
    else:
        query = update.callback_query
        await query.answer()
        user = query.from_user
        chat_id = query.message.chat_id
    
    user_data = get_user_data(user.id)
    
    # Создаем новое поле
    board = init_game_board()
    board = add_new_tile(board)
    board = add_new_tile(board)
    
    user_data['board'] = board
    user_data['score'] = 0
    user_data['game_active'] = True
    save_user_data(user.id, user_data)
    
    # Создаем клавиатуру для управления
    keyboard = [
        [InlineKeyboardButton("⬆️", callback_data='move_up')],
        [
            InlineKeyboardButton("⬅️", callback_data='move_left'),
            InlineKeyboardButton("⬇️", callback_data='move_down'),
            InlineKeyboardButton("➡️", callback_data='move_right')
        ],
        [
            InlineKeyboardButton(f"🎨 {user_data['theme'].upper()}", callback_data='change_theme'),
            InlineKeyboardButton(f"🔊 {'ВКЛ' if user_data['sound'] else 'ВЫКЛ'}", callback_data='toggle_sound')
        ],
        [InlineKeyboardButton("😴 СДАЮСЬ", callback_data='surrender')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message_text = f"🎮 **ИГРА НАЧАЛАСЬ!**\n\nСчёт: **0**\n\n{format_board(board, user_data['theme'])}\nИспользуй кнопки ↓ для движения"
    
    if is_command:
        await context.bot.send_message(chat_id=chat_id, text=message_text, reply_markup=reply_markup)
    else:
        await update.callback_query.edit_message_text(text=message_text, reply_markup=reply_markup)

# ---------- Обработчики кнопок ----------
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обрабатывает все нажатия на кнопки"""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    user_data = get_user_data(user.id)
    
    if query.data == 'new_game':
        await start_new_game(update, context)
    
    elif query.data == 'show_records':
        records_list = get_top_records()
        if not records_list:
            await query.edit_message_text("🏆 Таблица рекордов пуста. Сыграй и стань первым!",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🎮 НАЧАТЬ ИГРУ", callback_data='new_game')]]))
            return
        
        records_text = "🏆 **ТОП-10 РЕКОРДСМЕНОВ** 🏆\n\n"
        for i, record in enumerate(records_list, 1):
            records_text += f"{i}. @{record['username']} — **{record['score']}** очков\n"
        
        await query.edit_message_text(records_text,
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 НАЗАД", callback_data='back_to_start')]]))
    
    elif query.data == 'settings_menu':
        keyboard = [
            [InlineKeyboardButton(f"СМЕНИТЬ ТЕМУ (Сейчас: {user_data['theme']})", callback_data='change_theme')],
            [InlineKeyboardButton(f"{'ВЫКЛЮЧИТЬ' if user_data['sound'] else 'ВКЛЮЧИТЬ'} ЗВУК", callback_data='toggle_sound')],
            [InlineKeyboardButton("🔙 НАЗАД", callback_data='back_to_start')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text("⚙️ **НАСТРОЙКИ**\n\nВыбери параметр для изменения:", reply_markup=reply_markup)
    
    elif query.data == 'change_theme':
        themes = ['light', 'dark', 'yellow']
        theme_names = {'light': 'Светлая', 'dark': 'Тёмная', 'yellow': 'Жёлтая'}
        current_idx = themes.index(user_data['theme'])
        new_theme = themes[(current_idx + 1) % len(themes)]
        
        user_data['theme'] = new_theme
        save_user_data(user.id, user_data)
        
        # Если игра активна, обновляем поле
        if user_data['game_active'] and user_data['board']:
            keyboard = [
                [InlineKeyboardButton("⬆️", callback_data='move_up')],
                [
                    InlineKeyboardButton("⬅️", callback_data='move_left'),
                    InlineKeyboardButton("⬇️", callback_data='move_down'),
                    InlineKeyboardButton("➡️", callback_data='move_right')
                ],
                [
                    InlineKeyboardButton(f"🎨 {new_theme.upper()}", callback_data='change_theme'),
                    InlineKeyboardButton(f"🔊 {'ВКЛ' if user_data['sound'] else 'ВЫКЛ'}", callback_data='toggle_sound')
                ],
                [InlineKeyboardButton("😴 СДАЮСЬ", callback_data='surrender')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(
                f"🎮 Тема изменена на: **{theme_names[new_theme]}**\nСчёт: **{user_data['score']}**\n\n{format_board(user_data['board'], new_theme)}",
                reply_markup=reply_markup
            )
        else:
            await query.answer(f"✅ Тема изменена на {theme_names[new_theme]}", show_alert=True)
            await settings_menu(update, context)
    
    elif query.data == 'toggle_sound':
        user_data['sound'] = not user_data['sound']
        save_user_data(user.id, user_data)
        status = "ВКЛЮЧЁН" if user_data['sound'] else "ВЫКЛЮЧЕН"
        await query.answer(f"🔊 Звук {status}", show_alert=True)
    
    elif query.data == 'back_to_start':
        keyboard = [
            [InlineKeyboardButton("🎮 НАЧАТЬ ИГРУ", callback_data='new_game')],
            [InlineKeyboardButton("🏆 ТАБЛИЦА РЕКОРДОВ", callback_data='show_records')],
            [InlineKeyboardButton("⚙️ НАСТРОЙКИ", callback_data='settings_menu')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text("Главное меню:", reply_markup=reply_markup)
    
    elif query.data == 'surrender':
        # Сохраняем результат
        update_record(user.id, user.username or user.first_name, user_data['score'])
        user_data['game_active'] = False
        save_user_data(user.id, user_data)
        
        await query.edit_message_text(
            f"🏁 **ИГРА ОКОНЧЕНА!**\n\nТвой счёт: **{user_data['score']}**\n\nРекорд сохранён!",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🎮 НОВАЯ ИГРА", callback_data='new_game')]])
        )
    
    elif query.data.startswith('move_'):
        # Упрощённая логика движения (для демонстрации)
        if not user_data['game_active']:
            await query.answer("Игра не активна. Начни новую!", show_alert=True)
            return
        
        # Имитация хода - просто добавляем новую плитку
        board = user_data['board']
        board = add_new_tile(board)
        user_data['board'] = board
        user_data['score'] += 10  # Добавляем очки за ход
        save_user_data(user.id, user_data)
        
        # Обновляем сообщение с игрой
        keyboard = [
            [InlineKeyboardButton("⬆️", callback_data='move_up')],
            [
                InlineKeyboardButton("⬅️", callback_data='move_left'),
                InlineKeyboardButton("⬇️", callback_data='move_down'),
                InlineKeyboardButton("➡️", callback_data='move_right')
            ],
            [
                InlineKeyboardButton(f"🎨 {user_data['theme'].upper()}", callback_data='change_theme'),
                InlineKeyboardButton(f"🔊 {'ВКЛ' if user_data['sound'] else 'ВЫКЛ'}", callback_data='toggle_sound')
            ],
            [InlineKeyboardButton("😴 СДАЮСЬ", callback_data='surrender')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            f"🎮 Счёт: **{user_data['score']}**\n\n{format_board(board, user_data['theme'])}",
            reply_markup=reply_markup
        )

# ---------- Запуск бота ----------
def main():
    """Основная функция запуска бота"""
    # Создаём приложение
    application = Application.builder().token(TOKEN).build()
    
    # Регистрируем команды
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("play", play))
    application.add_handler(CommandHandler("records", records))
    
    # Регистрируем обработчик кнопок
    application.add_handler(CallbackQueryHandler(button_handler))
    
    # Запускаем бота
    logger.info("🤖 Бот запускается...")
    application.run_polling()

if __name__ == '__main__':
    main()
