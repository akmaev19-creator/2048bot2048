from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

# Файлы для хранения данных
DATA_DIR = "data"
USERS_FILE = os.path.join(DATA_DIR, "users_progress.json")
RECORDS_FILE = os.path.join(DATA_DIR, "records.json")

# API для сохранения прогресса из игры
@app.route('/api/save-progress', methods=['POST'])
def api_save_progress():
    try:
        data = request.json
        user_id = str(data['userId'])
        
        # Загружаем существующие данные
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, 'r') as f:
                users_data = json.load(f)
        else:
            users_data = {}
        
        # Обновляем или создаем запись пользователя
        if user_id not in users_data:
            users_data[user_id] = {
                'bestScore': 0,
                'gamesPlayed': 0,
                'lastPlayed': None
            }
        
        # Обновляем лучший счет
        current_score = data.get('currentScore', 0)
        if current_score > users_data[user_id]['bestScore']:
            users_data[user_id]['bestScore'] = current_score
        
        # Увеличиваем счетчик игр
        users_data[user_id]['gamesPlayed'] += 1
        users_data[user_id]['lastPlayed'] = data.get('timestamp')
        
        # Сохраняем текущую доску (если есть)
        if 'currentBoard' in data:
            users_data[user_id]['currentBoard'] = data['currentBoard']
            users_data[user_id]['currentScore'] = current_score
        
        # Сохраняем в файл
        with open(USERS_FILE, 'w') as f:
            json.dump(users_data, f, indent=2)
        
        # Обновляем рекорды, если это новый рекорд
        update_records(user_id, data.get('username', 'Player'), current_score)
        
        return jsonify({'status': 'success', 'message': 'Progress saved'})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# API для загрузки прогресса
@app.route('/api/get-progress', methods=['POST'])
def api_get_progress():
    try:
        data = request.json
        user_id = str(data['userId'])
        
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, 'r') as f:
                users_data = json.load(f)
            
            if user_id in users_data:
                return jsonify(users_data[user_id])
        
        return jsonify({'bestScore': 0, 'gamesPlayed': 0})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# API для получения топ-рекордов
@app.route('/api/top-records', methods=['GET'])
def api_top_records():
    try:
        if os.path.exists(RECORDS_FILE):
            with open(RECORDS_FILE, 'r') as f:
                records = json.load(f)
            # Возвращаем топ-10
            return jsonify(sorted(records, key=lambda x: x['score'], reverse=True)[:10])
        return jsonify([])
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Функция обновления рекордов
def update_records(user_id, username, score):
    try:
        if os.path.exists(RECORDS_FILE):
            with open(RECORDS_FILE, 'r') as f:
                records = json.load(f)
        else:
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
            records.append({
                'user_id': user_id,
                'username': username,
                'score': score,
                'date': datetime.now().isoformat()
            })
        
        # Сортируем по убыванию и сохраняем топ-20
        records.sort(key=lambda x: x['score'], reverse=True)
        records = records[:20]
        
        with open(RECORDS_FILE, 'w') as f:
            json.dump(records, f, indent=2)
    
    except Exception as e:
        print(f"Error updating records: {e}")

# Запускаем Flask вместе с ботом
if __name__ == '__main__':
    # Запускаем Flask на порту 5000
    from threading import Thread
    flask_thread = Thread(target=lambda: app.run(host='0.0.0.0', port=5000))
    flask_thread.start()
    
    # Запускаем вашего Telegram бота (существующий код)
    # main()  # Ваша существующая функция запуска бота
