#!/bin/bash

echo "🚀 Начинаем деплой на Vercel..."

# Проверяем, установлен ли Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI не установлен. Устанавливаем..."
    npm install -g vercel
fi

# Проверяем, что мы в корневой папке проекта
if [ ! -f "vercel.json" ]; then
    echo "❌ Файл vercel.json не найден. Убедитесь, что вы в корневой папке проекта."
    exit 1
fi

echo "✅ Конфигурация найдена"
echo "📋 Проверяем структуру проекта..."

# Проверяем наличие основных файлов
if [ ! -f "frontend/package.json" ]; then
    echo "❌ frontend/package.json не найден"
    exit 1
fi

if [ ! -f "backend/server.py" ]; then
    echo "❌ backend/server.py не найден"
    exit 1
fi

echo "✅ Структура проекта корректна"

# Запускаем деплой
echo "🌐 Запускаем деплой на Vercel..."
vercel --prod

echo "✅ Деплой завершен!"
echo "📝 Не забудьте настроить переменные окружения в Vercel Dashboard:"
echo "   - MONGO_URL"
echo "   - DB_NAME" 
echo "   - CORS_ORIGINS"
echo "   - REACT_APP_BACKEND_URL" 