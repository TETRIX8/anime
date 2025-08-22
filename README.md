# Anime Streaming Platform

Современная платформа для просмотра аниме с React фронтендом и FastAPI бэкендом.

## 🚀 Быстрый старт

### Деплой на Vercel
Проект настроен для автоматического деплоя на Vercel. См. [DEPLOY.md](./DEPLOY.md) для подробных инструкций.

### Локальная разработка

1. **Клонируйте репозиторий**
```bash
git clone <your-repo-url>
cd anime
```

2. **Настройте бэкенд**
```bash
cd backend
pip install -r requirements.txt
# Создайте .env файл с переменными окружения
python server.py
```

3. **Настройте фронтенд**
```bash
cd frontend
npm install
# Создайте .env файл с REACT_APP_BACKEND_URL
npm start
```

## 🛠 Технологии

### Фронтенд
- React 19
- Tailwind CSS
- Radix UI
- React Router
- Axios

### Бэкенд
- FastAPI
- MongoDB (Motor)
- Python 3.11
- Mangum (для Vercel)

## 📁 Структура проекта

```
├── frontend/          # React приложение
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # FastAPI сервер
│   ├── server.py
│   └── requirements.txt
├── vercel.json        # Конфигурация Vercel
├── DEPLOY.md          # Инструкции по деплою
└── README.md
```

## 🔧 Переменные окружения

### Бэкенд (.env)
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=anime_db
CORS_ORIGINS=http://localhost:3000,https://your-domain.vercel.app
```

### Фронтенд (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## 📖 Документация

- [Инструкции по деплою](./DEPLOY.md)
- [API документация](./backend/server.py)

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 📄 Лицензия

MIT License
