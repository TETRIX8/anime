from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Kodik API configuration
KODIK_API_URL = "https://kodikapi.com"
KODIK_TOKEN = "54eb773d434f45f4c9bb462bc3ce0342"

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic models
class Translation(BaseModel):
    id: int
    title: str
    type: str

class AnimeItem(BaseModel):
    id: str
    type: str
    link: str
    title: str
    title_orig: Optional[str] = None
    other_title: Optional[str] = None
    translation: Optional[Translation] = None
    translations: Optional[List[Translation]] = []  # Добавляем список всех озвучек
    year: Optional[int] = None
    last_season: Optional[int] = None
    last_episode: Optional[int] = None
    episodes_count: Optional[int] = None
    quality: Optional[str] = None
    screenshots: Optional[List[str]] = None
    kinopoisk_id: Optional[str] = None
    imdb_id: Optional[str] = None
    shikimori_id: Optional[str] = None
    worldart_link: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AnimeListResponse(BaseModel):
    time: str
    total: int
    prev_page: Optional[str] = None
    next_page: Optional[str] = None
    results: List[AnimeItem]

class WatchHistoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    anime_id: str
    anime_title: str
    anime_image: Optional[str] = None
    watched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    progress: Optional[int] = 0  # прогресс в секундах
    season: Optional[int] = None
    episode: Optional[int] = None

class WatchHistoryCreate(BaseModel):
    user_id: str
    anime_id: str
    anime_title: str
    anime_image: Optional[str] = None
    progress: Optional[int] = 0
    season: Optional[int] = None
    episode: Optional[int] = None

class FavoriteItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    anime_id: str
    anime_title: str
    anime_image: Optional[str] = None
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FavoriteCreate(BaseModel):
    user_id: str
    anime_id: str
    anime_title: str
    anime_image: Optional[str] = None

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def group_anime_by_title(raw_results: List[Dict]) -> List[Dict]:
    """Группирует аниме по названию и собирает все озвучки в один элемент"""
    grouped = defaultdict(lambda: {
        'translations': [],
        'links': {},  # словарь translation_id -> link
        'item': None
    })
    
    for item in raw_results:
        # Используем комбинацию title + year как уникальный ключ
        key = f"{item.get('title', '')}__{item.get('year', 'unknown')}"
        
        if grouped[key]['item'] is None:
            # Первый элемент для этого аниме - используем как основу
            grouped[key]['item'] = item.copy()
        
        # Добавляем перевод в список
        if item.get('translation'):
            translation = item['translation']
            # Проверяем что такого перевода еще нет
            existing_translation_ids = [t['id'] for t in grouped[key]['translations']]
            if translation['id'] not in existing_translation_ids:
                grouped[key]['translations'].append(translation)
                grouped[key]['links'][str(translation['id'])] = item.get('link', '')
    
    # Формируем финальный список
    result = []
    for group_data in grouped.values():
        item = group_data['item']
        if item:
            # Добавляем список всех переводов
            item['translations'] = group_data['translations']
            item['translation_links'] = group_data['links']
            
            # Основной перевод остается первым в списке
            if group_data['translations']:
                item['translation'] = group_data['translations'][0]
                item['link'] = group_data['links'].get(str(group_data['translations'][0]['id']), item.get('link', ''))
            
            result.append(item)
    
    return result

# API endpoints
@api_router.get("/")
async def root():
    return {"message": "Anime Wave API"}

@api_router.get("/anime/list", response_model=AnimeListResponse)
async def get_anime_list(
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("updated_at", regex="^(updated_at|created_at)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    types: Optional[str] = Query(None),
    anime_kind: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    translation_id: Optional[str] = Query(None),
    camrip: Optional[bool] = Query(None),
    countries: Optional[str] = Query(None),
    with_material_data: bool = Query(True),
    with_episodes_data: bool = Query(False),
    next_token: Optional[str] = Query(None, alias="next")
):
    """Получить список аниме с Kodik API с группировкой дубликатов"""
    try:
        # Увеличиваем лимит для получения большего количества данных перед группировкой
        api_limit = min(limit * 3, 100)  # Получаем в 3 раза больше для группировки
        
        # Построить параметры запроса
        params = {
            "token": KODIK_TOKEN,
            "limit": api_limit,
            "sort": sort,
            "order": order,
            "with_material_data": with_material_data,
            "with_episodes_data": with_episodes_data
        }
        
        # Добавить опциональные параметры
        if types:
            params["types"] = types
        if anime_kind:
            params["anime_kind"] = anime_kind
        if year:
            params["year"] = year
        if translation_id:
            params["translation_id"] = translation_id
        if camrip is not None:
            params["camrip"] = camrip
        if countries:
            params["countries"] = countries
        if next_token:
            params["next"] = next_token
            
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{KODIK_API_URL}/list", params=params)
            response.raise_for_status()
            data = response.json()
            
            # Группируем аниме по названию
            grouped_results = group_anime_by_title(data.get("results", []))
            
            # Ограничиваем результат запрошенным лимитом
            limited_results = grouped_results[:limit]
            
            # Формируем ответ
            return AnimeListResponse(
                time=data.get("time", "0ms"),
                total=len(grouped_results),
                prev_page=data.get("prev_page"),
                next_page=data.get("next_page"),
                results=limited_results
            )
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка запроса к Kodik API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@api_router.get("/anime/search", response_model=AnimeListResponse)
async def search_anime(
    query: str = Query(..., min_length=1, alias="title"),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("updated_at", regex="^(updated_at|created_at)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    types: Optional[str] = Query(None),
    anime_kind: Optional[str] = Query(None),
    with_material_data: bool = Query(True)
):
    """Поиск аниме по названию с группировкой дубликатов"""
    try:
        # Увеличиваем лимит для группировки
        api_limit = min(limit * 3, 100)
        
        params = {
            "token": KODIK_TOKEN,
            "title": query,
            "limit": api_limit,
            "sort": sort,
            "order": order,
            "with_material_data": with_material_data
        }
        
        if types:
            params["types"] = types
        if anime_kind:
            params["anime_kind"] = anime_kind
            
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{KODIK_API_URL}/search", params=params)
            response.raise_for_status()
            data = response.json()
            
            # Группируем результаты поиска
            grouped_results = group_anime_by_title(data.get("results", []))
            
            # Ограничиваем результат
            limited_results = grouped_results[:limit]
            
            return AnimeListResponse(
                time=data.get("time", "0ms"),
                total=len(grouped_results),
                prev_page=data.get("prev_page"),
                next_page=data.get("next_page"),
                results=limited_results
            )
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка поиска: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@api_router.get("/anime/recent")
async def get_recent_anime(
    limit: int = Query(12, ge=1, le=50)
):
    """Получить недавние новинки с группировкой"""
    try:
        # Увеличиваем лимит для группировки
        api_limit = min(limit * 2, 50)
        
        params = {
            "token": KODIK_TOKEN,
            "limit": api_limit,
            "sort": "updated_at",
            "order": "desc",
            "with_material_data": True,
            "types": "anime-serial,anime"
        }
            
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{KODIK_API_URL}/list", params=params)
            response.raise_for_status()
            data = response.json()
            
            # Группируем новинки
            grouped_results = group_anime_by_title(data.get("results", []))
            
            # Ограничиваем результат
            limited_results = grouped_results[:limit]
            
            return {"results": limited_results}
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения новинок: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@api_router.get("/anime/{anime_id}")
async def get_anime_details(anime_id: str):
    """Получить детальную информацию об аниме со всеми доступными озвучками"""
    try:
        params = {
            "token": KODIK_TOKEN,
            "id": anime_id,
            "with_material_data": True,
            "with_episodes_data": True
        }
            
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{KODIK_API_URL}/list", params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("results"):
                base_anime = data["results"][0]
                
                # Ищем все озвучки для этого аниме по названию
                search_params = {
                    "token": KODIK_TOKEN,
                    "title": base_anime.get("title", ""),
                    "limit": 50,
                    "with_material_data": True
                }
                
                search_response = await client.get(f"{KODIK_API_URL}/search", params=search_params)
                search_data = search_response.json()
                
                # Группируем все найденные варианты
                all_variants = search_data.get("results", [])
                grouped = group_anime_by_title(all_variants)
                
                # Находим нужный элемент
                for anime in grouped:
                    if anime.get("id") == anime_id or anime.get("title") == base_anime.get("title"):
                        return anime
                
                # Если не найден в группированных, возвращаем оригинальный
                return base_anime
            else:
                raise HTTPException(status_code=404, detail="Аниме не найдено")
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения деталей: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

# История просмотра
@api_router.post("/history", response_model=WatchHistoryItem)
async def add_to_history(item: WatchHistoryCreate):
    """Добавить элемент в историю просмотра"""
    try:
        # Проверить если уже есть запись для этого аниме у пользователя
        existing = await db.watch_history.find_one({
            "user_id": item.user_id,
            "anime_id": item.anime_id
        })
        
        if existing:
            # Обновить существующую запись
            update_data = {
                "watched_at": datetime.now(timezone.utc).isoformat(),
                "progress": item.progress,
                "season": item.season,
                "episode": item.episode
            }
            await db.watch_history.update_one(
                {"_id": existing["_id"]},
                {"$set": update_data}
            )
            existing.update(update_data)
            return WatchHistoryItem(**existing)
        else:
            # Создать новую запись
            history_item = WatchHistoryItem(**item.dict())
            history_dict = prepare_for_mongo(history_item.dict())
            await db.watch_history.insert_one(history_dict)
            return history_item
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения истории: {str(e)}")

@api_router.get("/history/{user_id}", response_model=List[WatchHistoryItem])
async def get_user_history(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Получить историю просмотра пользователя"""
    try:
        cursor = db.watch_history.find({"user_id": user_id}).sort("watched_at", -1).skip(skip).limit(limit)
        history = await cursor.to_list(length=limit)
        
        # Преобразовать даты обратно
        for item in history:
            if isinstance(item.get('watched_at'), str):
                item['watched_at'] = datetime.fromisoformat(item['watched_at'])
        
        return [WatchHistoryItem(**item) for item in history]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения истории: {str(e)}")

@api_router.delete("/history/{user_id}/{anime_id}")
async def remove_from_history(user_id: str, anime_id: str):
    """Удалить элемент из истории"""
    try:
        result = await db.watch_history.delete_one({
            "user_id": user_id,
            "anime_id": anime_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Элемент не найден в истории")
            
        return {"message": "Элемент удален из истории"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка удаления из истории: {str(e)}")

# Избранное
@api_router.post("/favorites", response_model=FavoriteItem)
async def add_to_favorites(item: FavoriteCreate):
    """Добавить в избранное"""
    try:
        # Проверить если уже в избранном
        existing = await db.favorites.find_one({
            "user_id": item.user_id,
            "anime_id": item.anime_id
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Аниме уже в избранном")
        
        favorite_item = FavoriteItem(**item.dict())
        favorite_dict = prepare_for_mongo(favorite_item.dict())
        await db.favorites.insert_one(favorite_dict)
        return favorite_item
        
    except Exception as e:
        if "уже в избранном" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Ошибка добавления в избранное: {str(e)}")

@api_router.get("/favorites/{user_id}", response_model=List[FavoriteItem])
async def get_user_favorites(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Получить избранное пользователя"""
    try:
        cursor = db.favorites.find({"user_id": user_id}).sort("added_at", -1).skip(skip).limit(limit)
        favorites = await cursor.to_list(length=limit)
        
        # Преобразовать даты обратно
        for item in favorites:
            if isinstance(item.get('added_at'), str):
                item['added_at'] = datetime.fromisoformat(item['added_at'])
        
        return [FavoriteItem(**item) for item in favorites]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения избранного: {str(e)}")

@api_router.delete("/favorites/{user_id}/{anime_id}")
async def remove_from_favorites(user_id: str, anime_id: str):
    """Удалить из избранного"""
    try:
        result = await db.favorites.delete_one({
            "user_id": user_id,
            "anime_id": anime_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Элемент не найден в избранном")
            
        return {"message": "Элемент удален из избранного"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка удаления из избранного: {str(e)}")

# Жанры и категории
@api_router.get("/anime/genres")
async def get_anime_genres():
    """Получить популярные жанры аниме"""
    try:
        # Получить список аниме и извлечь уникальные жанры
        params = {
            "token": KODIK_TOKEN,
            "limit": 100,
            "with_material_data": True,
            "types": "anime-serial,anime"
        }
            
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{KODIK_API_URL}/list", params=params)
            response.raise_for_status()
            data = response.json()
            
            # Собрать уникальные жанры из material_data
            genres = set()
            for anime in data.get("results", []):
                # Добавляем типы аниме как жанры
                if anime.get("type"):
                    if anime["type"] == "anime-serial":
                        genres.add("Сериалы")
                    elif anime["type"] == "anime":
                        genres.add("Фильмы")
                
                # Добавляем годы как категории
                if anime.get("year"):
                    if anime["year"] >= 2020:
                        genres.add("Новые (2020+)")
                    elif anime["year"] >= 2010:
                        genres.add("Современные (2010-2019)")
                    else:
                        genres.add("Классика (до 2010)")
            
            # Добавить популярные жанры
            popular_genres = [
                "Экшен", "Приключения", "Комедия", "Драма", "Фэнтези", 
                "Романтика", "Научная фантастика", "Спорт", "Повседневность",
                "Школа", "Сверхъестественное", "Мистика", "Ужасы"
            ]
            
            genres.update(popular_genres)
            
            return {"genres": sorted(list(genres))}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения жанров: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()