from fastapi import FastAPI, APIRouter, HTTPException, Query
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
from datetime import datetime

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
class AnimeItem(BaseModel):
    id: str
    type: str
    link: str
    title: str
    title_orig: Optional[str] = None
    other_title: Optional[str] = None
    translation: Optional[Dict[str, Any]] = None
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
    """Получить список аниме с Kodik API"""
    try:
        # Построить параметры запроса
        params = {
            "token": KODIK_TOKEN,
            "limit": limit,
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
            
            return AnimeListResponse(**data)
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка запроса к Kodik API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@api_router.get("/anime/search", response_model=AnimeListResponse)
async def search_anime(
    query: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("updated_at", regex="^(updated_at|created_at)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    types: Optional[str] = Query(None),
    anime_kind: Optional[str] = Query(None)
):
    """Поиск аниме по названию"""
    try:
        params = {
            "token": KODIK_TOKEN,
            "title": query,
            "limit": limit,
            "sort": sort,
            "order": order,
            "with_material_data": True
        }
        
        if types:
            params["types"] = types
        if anime_kind:
            params["anime_kind"] = anime_kind
            
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{KODIK_API_URL}/search", params=params)
            response.raise_for_status()
            data = response.json()
            
            return AnimeListResponse(**data)
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка поиска: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@api_router.get("/anime/recent")
async def get_recent_anime(
    limit: int = Query(12, ge=1, le=50)
):
    """Получить недавние новинки"""
    try:
        params = {
            "token": KODIK_TOKEN,
            "limit": limit,
            "sort": "updated_at",
            "order": "desc",
            "with_material_data": True,
            "types": "anime-serial,anime"
        }
            
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{KODIK_API_URL}/list", params=params)
            response.raise_for_status()
            data = response.json()
            
            return {"results": data.get("results", [])}
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения новинок: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

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