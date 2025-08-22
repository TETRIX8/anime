#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка конфигурации проекта...\n');

// Проверяем основные файлы
const requiredFiles = [
  'vercel.json',
  'frontend/package.json',
  'backend/server.py',
  'backend/requirements.txt'
];

let allGood = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - НЕ НАЙДЕН`);
    allGood = false;
  }
});

// Проверяем vercel.json
if (fs.existsSync('vercel.json')) {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    console.log('\n📋 Конфигурация Vercel:');
    console.log(`   - Версия: ${vercelConfig.version}`);
    console.log(`   - Количество сборок: ${vercelConfig.builds?.length || 0}`);
    console.log(`   - Количество маршрутов: ${vercelConfig.routes?.length || 0}`);
  } catch (error) {
    console.log('❌ Ошибка чтения vercel.json');
    allGood = false;
  }
}

// Проверяем package.json фронтенда
if (fs.existsSync('frontend/package.json')) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
    console.log('\n📦 Фронтенд:');
    console.log(`   - Название: ${packageJson.name}`);
    console.log(`   - Версия: ${packageJson.version}`);
    console.log(`   - Скрипты: ${Object.keys(packageJson.scripts || {}).join(', ')}`);
  } catch (error) {
    console.log('❌ Ошибка чтения frontend/package.json');
    allGood = false;
  }
}

// Проверяем requirements.txt
if (fs.existsSync('backend/requirements.txt')) {
  const requirements = fs.readFileSync('backend/requirements.txt', 'utf8');
  const hasMangum = requirements.includes('mangum');
  console.log('\n🐍 Бэкенд:');
  console.log(`   - Mangum: ${hasMangum ? '✅' : '❌'}`);
  console.log(`   - FastAPI: ${requirements.includes('fastapi') ? '✅' : '❌'}`);
}

console.log('\n📝 Переменные окружения для настройки в Vercel:');
console.log('   Бэкенд:');
console.log('   - MONGO_URL');
console.log('   - DB_NAME');
console.log('   - CORS_ORIGINS');
console.log('   Фронтенд:');
console.log('   - REACT_APP_BACKEND_URL');

if (allGood) {
  console.log('\n🎉 Все проверки пройдены! Проект готов к деплою.');
  console.log('💡 Запустите: ./deploy.sh');
} else {
  console.log('\n⚠️  Обнаружены проблемы. Исправьте их перед деплоем.');
  process.exit(1);
} 