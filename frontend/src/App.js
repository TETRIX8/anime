import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Search, Play, Star, Calendar, Clock, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Separator } from "./components/ui/separator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [animeList, setAnimeList] = useState([]);
  const [recentAnime, setRecentAnime] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  // Фильтры
  const [filters, setFilters] = useState({
    type: "",
    anime_kind: "",
    year: "",
    sort: "updated_at",
    order: "desc"
  });

  // Загрузка недавних аниме при запуске
  useEffect(() => {
    loadRecentAnime();
    loadAnimeList();
  }, []);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/anime/search?query=${encodeURIComponent(searchQuery)}`);
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

  const openPlayer = (anime) => {
    setSelectedPlayer(anime);
  };

  const closePlayer = () => {
    setSelectedPlayer(null);
  };

  const AnimeCard = ({ anime }) => (
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
          <Button
            size="sm"
            className="absolute top-3 right-3 bg-purple-600/80 hover:bg-purple-500 text-white border-none backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse hover:animate-none"
            onClick={() => openPlayer(anime)}
          >
            <Play className="w-4 h-4 mr-1" />
            Смотреть
          </Button>
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
      </main>

      {/* Видео плеер модальное окно */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">{selectedPlayer.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePlayer}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={selectedPlayer.link}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
}

export default App;