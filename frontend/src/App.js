import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Search, Play, Star, Calendar, Clock, Filter, ChevronDown, ChevronUp, Heart, History, Home, ArrowLeft, BookOpen, Tv, Film, Volume2 } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Separator } from "./components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Генерация случайного user_id для демо
const USER_ID = localStorage.getItem('user_id') || (() => {
  const id = 'user_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('user_id', id);
  return id;
})();

// Главная страница
const HomePage = () => {
  const [animeList, setAnimeList] = useState([]);
  const [recentAnime, setRecentAnime] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [genres, setGenres] = useState([]);
  const navigate = useNavigate();
  
  // Фильтры
  const [filters, setFilters] = useState({
    type: "",
    anime_kind: "",
    year: "",
    sort: "updated_at",
    order: "desc"
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadRecentAnime(),
      loadAnimeList(),
      loadUserHistory(),
      loadUserFavorites(),
      loadGenres()
    ]);
  };

  const loadRecentAnime = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/anime/recent?limit=12`);
      setRecentAnime(response.data.results || []);
    } catch (error) {
      console.error("Ошибка загрузки новинок:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnimeList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "20");
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await axios.get(`${API}/anime/list?${params}`);
      setAnimeList(response.data.results || []);
    } catch (error) {
      console.error("Ошибка загрузки аниме:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserHistory = async () => {
    try {
      const response = await axios.get(`${API}/history/${USER_ID}?limit=10`);
      setHistory(response.data || []);
    } catch (error) {
      console.error("Ошибка загрузки истории:", error);
    }
  };

  const loadUserFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites/${USER_ID}?limit=10`);
      setFavorites(response.data || []);
    } catch (error) {
      console.error("Ошибка загрузки избранного:", error);
    }
  };

  const loadGenres = async () => {
    try {
      const response = await axios.get(`${API}/anime/genres`);
      setGenres(response.data.genres || []);
    } catch (error) {
      console.error("Ошибка загрузки жанров:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/anime/search?title=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.results || []);
    } catch (error) {
      console.error("Ошибка поиска:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (Object.values(filters).some(v => v)) {
      loadAnimeList();
    }
  }, [filters]);

  const addToHistory = async (anime) => {
    try {
      await axios.post(`${API}/history`, {
        user_id: USER_ID,
        anime_id: anime.id,
        anime_title: anime.title,
        anime_image: anime.screenshots?.[0] || null
      });
      loadUserHistory(); // Обновить историю
    } catch (error) {
      console.error("Ошибка добавления в историю:", error);
    }
  };

  const toggleFavorite = async (anime) => {
    try {
      const isFavorite = favorites.some(fav => fav.anime_id === anime.id);
      
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${USER_ID}/${anime.id}`);
      } else {
        await axios.post(`${API}/favorites`, {
          user_id: USER_ID,
          anime_id: anime.id,
          anime_title: anime.title,
          anime_image: anime.screenshots?.[0] || null
        });
      }
      
      loadUserFavorites(); // Обновить избранное
    } catch (error) {
      console.error("Ошибка работы с избранным:", error);
    }
  };

  const watchAnime = (anime) => {
    addToHistory(anime);
    navigate(`/watch/${anime.id}`);
  };

  const AnimeCard = ({ anime, showFavoriteButton = true }) => {
    const isFavorite = favorites.some(fav => fav.anime_id === anime.id);
    const translationsCount = anime.translations ? anime.translations.length : 1;
    
    return (
      <Card className="anime-card group relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-purple-900/20 to-pink-900/20 border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {anime.screenshots && anime.screenshots.length > 0 && (
          <div className="relative overflow-hidden">
            <img 
              src={anime.screenshots[0]} 
              alt={anime.title}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Индикатор количества озвучек */}
            {translationsCount > 1 && (
              <div className="absolute top-3 left-3 bg-blue-600/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center">
                <Volume2 className="w-3 h-3 mr-1" />
                {translationsCount}
              </div>
            )}
            
            <div className="absolute top-3 right-3 flex space-x-2">
              {showFavoriteButton && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                    isFavorite ? 'text-red-400 hover:text-red-300' : 'text-white hover:text-red-400'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(anime);
                  }}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
              )}
              
              <Button
                size="sm"
                className="bg-purple-600/80 hover:bg-purple-500 text-white border-none backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse hover:animate-none"
                onClick={() => watchAnime(anime)}
              >
                <Play className="w-4 h-4 mr-1" />
                Смотреть
              </Button>
            </div>
          </div>
        )}
        
        <CardHeader className="relative z-10 pb-2">
          <CardTitle className="text-white text-sm line-clamp-2 group-hover:text-purple-200 transition-colors">
            {anime.title}
          </CardTitle>
          {anime.title_orig && (
            <CardDescription className="text-slate-400 text-xs line-clamp-1">
              {anime.title_orig}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="relative z-10 pt-0 space-y-2">
          <div className="flex flex-wrap gap-1">
            {anime.year && (
              <Badge variant="secondary" className="text-xs bg-slate-700/50 text-slate-300 border-slate-600">
                <Calendar className="w-3 h-3 mr-1" />
                {anime.year}
              </Badge>
            )}
            {anime.type && (
              <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
                {anime.type === 'anime-serial' ? 'Сериал' : anime.type === 'anime' ? 'Фильм' : anime.type}
              </Badge>
            )}
            {anime.quality && (
              <Badge className="text-xs bg-emerald-600/80 text-white">
                {anime.quality}
              </Badge>
            )}
          </div>
          
          {anime.translation && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <span className="text-amber-400">🎤</span>
              {anime.translation.title}
              {translationsCount > 1 && (
                <span className="text-blue-400">+{translationsCount - 1}</span>
              )}
            </div>
          )}
          
          {anime.episodes_count && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Clock className="w-3 h-3" />
              {anime.episodes_count} серий
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent anime-glow">
                🌸 AnimeWave
              </h1>
            </div>
            
            <div className="flex items-center space-x-4 flex-1 max-w-md ml-8">
              <div className="relative flex-1">
                <Input
                  placeholder="Поиск аниме..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20"
                />
                <Button
                  size="sm"
                  onClick={handleSearch}
                  className="absolute right-1 top-1 h-8 bg-purple-600 hover:bg-purple-500"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Filter className="w-4 h-4 mr-2" />
              Фильтры
              {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </div>
          
          {/* Фильтры */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 animate-slide-down">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="">Все типы</SelectItem>
                    <SelectItem value="anime-serial">Сериалы</SelectItem>
                    <SelectItem value="anime">Фильмы</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.anime_kind} onValueChange={(value) => handleFilterChange('anime_kind', value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Жанр" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="">Все жанры</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                    <SelectItem value="ova">OVA</SelectItem>
                    <SelectItem value="ona">ONA</SelectItem>
                    <SelectItem value="movie">Фильм</SelectItem>
                    <SelectItem value="special">Спешл</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Год" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="">Любой год</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.sort} onValueChange={(value) => handleFilterChange('sort', value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Сортировка" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="updated_at">По обновлению</SelectItem>
                    <SelectItem value="created_at">По добавлению</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.order} onValueChange={(value) => handleFilterChange('order', value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Порядок" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="desc">Сначала новые</SelectItem>
                    <SelectItem value="asc">Сначала старые</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border-slate-700">
            <TabsTrigger value="home" className="data-[state=active]:bg-purple-600">
              <Home className="w-4 h-4 mr-2" />
              Главная
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              <History className="w-4 h-4 mr-2" />
              История
            </TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-purple-600">
              <Heart className="w-4 h-4 mr-2" />
              Избранное
            </TabsTrigger>
            <TabsTrigger value="genres" className="data-[state=active]:bg-purple-600">
              <BookOpen className="w-4 h-4 mr-2" />
              Жанры
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-8">
            {/* Результаты поиска */}
            {searchResults.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Результаты поиска</h2>
                  <Badge className="bg-purple-600 text-white">
                    {searchResults.length} найдено
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {searchResults.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>
                <Separator className="mt-8 bg-slate-700" />
              </section>
            )}

            {/* Недавние новинки */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Star className="w-6 h-6 mr-2 text-amber-400" />
                Недавние новинки
              </h2>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <Card key={i} className="animate-pulse bg-slate-800/50 border-slate-700">
                      <div className="h-48 bg-slate-700 rounded-t-lg"></div>
                      <CardHeader>
                        <div className="h-4 bg-slate-700 rounded"></div>
                        <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {recentAnime.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>
              )}
            </section>

            {/* Каталог аниме */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Каталог аниме</h2>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(20)].map((_, i) => (
                    <Card key={i} className="animate-pulse bg-slate-800/50 border-slate-700">
                      <div className="h-48 bg-slate-700 rounded-t-lg"></div>
                      <CardHeader>
                        <div className="h-4 bg-slate-700 rounded"></div>
                        <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {animeList.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <History className="w-6 h-6 mr-2 text-blue-400" />
              История просмотра
            </h2>
            {history.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {history.map((item) => (
                  <AnimeCard 
                    key={item.id} 
                    anime={{
                      id: item.anime_id,
                      title: item.anime_title,
                      screenshots: item.anime_image ? [item.anime_image] : []
                    }} 
                    showFavoriteButton={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>История просмотра пуста</p>
                <p className="text-sm mt-2">Начните смотреть аниме, чтобы увидеть историю здесь</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Heart className="w-6 h-6 mr-2 text-red-400" />
              Избранное
            </h2>
            {favorites.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {favorites.map((item) => (
                  <AnimeCard 
                    key={item.id} 
                    anime={{
                      id: item.anime_id,
                      title: item.anime_title,
                      screenshots: item.anime_image ? [item.anime_image] : []
                    }} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Heart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Избранное пусто</p>
                <p className="text-sm mt-2">Добавьте аниме в избранное, нажав на сердечко</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="genres" className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-green-400" />
              Жанры и категории
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {genres.map((genre, index) => (
                <Card key={index} className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">
                      {genre.includes('Сериалы') ? <Tv className="w-8 h-8 mx-auto text-purple-400" /> :
                       genre.includes('Фильмы') ? <Film className="w-8 h-8 mx-auto text-pink-400" /> :
                       <BookOpen className="w-8 h-8 mx-auto text-blue-400" />}
                    </div>
                    <p className="text-white text-sm font-medium">{genre}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="text-center text-slate-400">
            <p className="mb-2">© 2025 AnimeWave - Лучшие аниме онлайн</p>
            <p className="text-sm">Смотри аниме в высоком качестве с русской озвучкой</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Страница видео плеера
const WatchPage = () => {
  const { animeId } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTranslation, setSelectedTranslation] = useState(null);

  useEffect(() => {
    loadAnimeDetails();
  }, [animeId]);

  const loadAnimeDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/anime/${animeId}`);
      const animeData = response.data;
      setAnime(animeData);
      
      // Устанавливаем первую озвучку как выбранную по умолчанию
      if (animeData.translations && animeData.translations.length > 0) {
        setSelectedTranslation(animeData.translations[0]);
      } else if (animeData.translation) {
        setSelectedTranslation(animeData.translation);
      }
    } catch (error) {
      console.error("Ошибка загрузки деталей аниме:", error);
      setError("Не удалось загрузить аниме");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslationChange = (translation) => {
    setSelectedTranslation(translation);
  };

  const getCurrentLink = () => {
    if (!anime) return "";
    
    if (selectedTranslation && anime.translation_links) {
      return anime.translation_links[selectedTranslation.id.toString()] || anime.link;
    }
    
    return anime.link;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка плеера...</p>
        </div>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || "Аниме не найдено"}</p>
          <Button onClick={() => navigate('/')} className="bg-purple-600 hover:bg-purple-500">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться на главную
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header с кнопкой возврата */}
      <header className="bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          
          <h1 className="text-xl font-bold text-white truncate max-w-md">
            {anime.title}
          </h1>
          
          {/* Выбор озвучки */}
          {anime.translations && anime.translations.length > 1 && (
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <Select 
                value={selectedTranslation?.id.toString()} 
                onValueChange={(value) => {
                  const translation = anime.translations.find(t => t.id.toString() === value);
                  if (translation) handleTranslationChange(translation);
                }}
              >
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Озвучка" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {anime.translations.map((translation) => (
                    <SelectItem key={translation.id} value={translation.id.toString()}>
                      {translation.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      {/* Видео плеер */}
      <div className="container mx-auto px-4 py-6">
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
          <iframe
            src={getCurrentLink()}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            className="rounded-lg"
            title={anime.title}
          />
        </div>

        {/* Информация об аниме */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Постер и основная информация */}
          <div className="lg:col-span-1">
            {anime.screenshots && anime.screenshots[0] && (
              <img 
                src={anime.screenshots[0]} 
                alt={anime.title}
                className="w-full rounded-lg mb-4"
              />
            )}
          </div>

          {/* Детали */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{anime.title}</h2>
              {anime.title_orig && (
                <p className="text-slate-400 mb-4">{anime.title_orig}</p>
              )}
              {anime.other_title && (
                <p className="text-slate-500 text-sm mb-4">{anime.other_title}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {anime.year && (
                <Badge className="bg-slate-700 text-white">
                  <Calendar className="w-3 h-3 mr-1" />
                  {anime.year}
                </Badge>
              )}
              {anime.type && (
                <Badge className="bg-purple-600 text-white">
                  {anime.type === 'anime-serial' ? 'Сериал' : anime.type === 'anime' ? 'Фильм' : anime.type}
                </Badge>
              )}
              {anime.quality && (
                <Badge className="bg-emerald-600 text-white">
                  {anime.quality}
                </Badge>
              )}
              {anime.episodes_count && (
                <Badge className="bg-blue-600 text-white">
                  <Clock className="w-3 h-3 mr-1" />
                  {anime.episodes_count} серий
                </Badge>
              )}
            </div>

            {/* Доступные озвучки */}
            {anime.translations && anime.translations.length > 0 && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2 flex items-center">
                  <Volume2 className="w-4 h-4 mr-2" />
                  Доступные озвучки ({anime.translations.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {anime.translations.map((translation) => (
                    <Button
                      key={translation.id}
                      variant={selectedTranslation?.id === translation.id ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${
                        selectedTranslation?.id === translation.id 
                          ? "bg-purple-600 hover:bg-purple-500" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700"
                      }`}
                      onClick={() => handleTranslationChange(translation)}
                    >
                      {translation.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Ссылки */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Ссылки</h3>
              <div className="space-y-1">
                {anime.kinopoisk_id && (
                  <p className="text-slate-300 text-sm">Кинопоиск ID: {anime.kinopoisk_id}</p>
                )}
                {anime.shikimori_id && (
                  <p className="text-slate-300 text-sm">Shikimori ID: {anime.shikimori_id}</p>
                )}
                {anime.imdb_id && (
                  <p className="text-slate-300 text-sm">IMDB ID: {anime.imdb_id}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/watch/:animeId" element={<WatchPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;