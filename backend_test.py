import requests
import sys
from datetime import datetime
import json

class AnimeAPITester:
    def __init__(self, base_url="https://animewave-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, params=None, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Try to parse JSON response
                try:
                    json_data = response.json()
                    if isinstance(json_data, dict):
                        if 'results' in json_data:
                            print(f"   Results count: {len(json_data['results'])}")
                            if json_data['results']:
                                first_item = json_data['results'][0]
                                print(f"   Sample title: {first_item.get('title', 'N/A')}")
                        elif 'total' in json_data:
                            print(f"   Total items: {json_data['total']}")
                        elif 'genres' in json_data:
                            print(f"   Genres count: {len(json_data['genres'])}")
                        elif 'message' in json_data:
                            print(f"   Message: {json_data['message']}")
                        elif 'id' in json_data:
                            print(f"   Created ID: {json_data['id']}")
                    return True, json_data
                except json.JSONDecodeError:
                    print(f"   Response: {response.text[:200]}...")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}...")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout (30s)")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_recent_anime(self):
        """Test recent anime endpoint"""
        return self.run_test("Recent Anime", "GET", "anime/recent", 200, params={"limit": 12})

    def test_anime_list_basic(self):
        """Test basic anime list"""
        return self.run_test("Anime List (Basic)", "GET", "anime/list", 200, params={"limit": 20})

    def test_anime_list_with_filters(self):
        """Test anime list with filters"""
        params = {
            "limit": 10,
            "types": "anime-serial",
            "sort": "updated_at",
            "order": "desc"
        }
        return self.run_test("Anime List (Filtered)", "GET", "anime/list", 200, params=params)

    def test_anime_search(self):
        """Test anime search"""
        params = {
            "title": "Naruto",
            "limit": 10
        }
        return self.run_test("Anime Search", "GET", "anime/search", 200, params=params)

    def test_anime_search_empty_query(self):
        """Test anime search with empty query (should fail)"""
        params = {"query": ""}
        return self.run_test("Anime Search (Empty Query)", "GET", "anime/search", 422, params=params)

    def test_anime_list_invalid_sort(self):
        """Test anime list with invalid sort parameter"""
        params = {
            "limit": 10,
            "sort": "invalid_sort"
        }
        return self.run_test("Anime List (Invalid Sort)", "GET", "anime/list", 422, params=params)

    def test_anime_list_year_filter(self):
        """Test anime list with year filter"""
        params = {
            "limit": 10,
            "year": 2024,
            "sort": "updated_at",
            "order": "desc"
        }
        return self.run_test("Anime List (Year Filter)", "GET", "anime/list", 200, params=params)

    def test_anime_list_anime_kind_filter(self):
        """Test anime list with anime_kind filter"""
        params = {
            "limit": 10,
            "anime_kind": "tv",
            "sort": "updated_at",
            "order": "desc"
        }
        return self.run_test("Anime List (Anime Kind Filter)", "GET", "anime/list", 200, params=params)

    # NEW ENDPOINTS TESTING
    def test_anime_search_corrected(self):
        """Test corrected anime search endpoint with title parameter"""
        params = {"title": "Наруто", "limit": 10}
        return self.run_test("Anime Search (Corrected)", "GET", "anime/search", 200, params=params)

    def test_anime_genres(self):
        """Test anime genres endpoint"""
        return self.run_test("Anime Genres", "GET", "anime/genres", 200)

    def test_anime_details(self):
        """Test anime details endpoint - first get an anime ID, then test details"""
        # First get an anime list to get a valid ID
        success, data = self.run_test("Get Anime for Details Test", "GET", "anime/list", 200, params={"limit": 1})
        if success and data.get('results'):
            anime_id = data['results'][0]['id']
            return self.run_test("Anime Details", "GET", f"anime/{anime_id}", 200)
        else:
            print("❌ Could not get anime ID for details test")
            return False, {}

    def test_add_to_history(self):
        """Test adding item to watch history"""
        data = {
            "user_id": "test_user",
            "anime_id": "test_anime_123",
            "anime_title": "Test Anime",
            "anime_image": "https://example.com/image.jpg",
            "progress": 0,
            "season": 1,
            "episode": 1
        }
        return self.run_test("Add to History", "POST", "history", 200, data=data)

    def test_get_user_history(self):
        """Test getting user history"""
        return self.run_test("Get User History", "GET", "history/test_user", 200, params={"limit": 10})

    def test_add_to_favorites(self):
        """Test adding item to favorites"""
        data = {
            "user_id": "test_user",
            "anime_id": "test_anime_fav_123",
            "anime_title": "Test Favorite Anime",
            "anime_image": "https://example.com/image.jpg"
        }
        return self.run_test("Add to Favorites", "POST", "favorites", 200, data=data)

    def test_get_user_favorites(self):
        """Test getting user favorites"""
        return self.run_test("Get User Favorites", "GET", "favorites/test_user", 200, params={"limit": 10})

    def test_remove_from_favorites(self):
        """Test removing item from favorites"""
        return self.run_test("Remove from Favorites", "DELETE", "favorites/test_user/test_anime_fav_123", 200)

    def test_remove_from_history(self):
        """Test removing item from history"""
        return self.run_test("Remove from History", "DELETE", "history/test_user/test_anime_123", 200)

def main():
    print("🚀 Starting AnimeWave API Testing...")
    print("=" * 50)
    
    # Setup
    tester = AnimeAPITester()
    
    # Run all tests
    print("\n📋 Running Backend API Tests:")
    
    # Basic functionality tests
    tester.test_root_endpoint()
    tester.test_recent_anime()
    tester.test_anime_list_basic()
    tester.test_anime_list_with_filters()
    tester.test_anime_search()
    
    # NEW: Test corrected search endpoint
    tester.test_anime_search_corrected()
    
    # NEW: Test genres endpoint
    tester.test_anime_genres()
    
    # NEW: Test anime details endpoint
    tester.test_anime_details()
    
    # NEW: Test history functionality
    tester.test_add_to_history()
    tester.test_get_user_history()
    
    # NEW: Test favorites functionality
    tester.test_add_to_favorites()
    tester.test_get_user_favorites()
    
    # Edge case tests
    tester.test_anime_search_empty_query()
    tester.test_anime_list_invalid_sort()
    
    # Filter tests
    tester.test_anime_list_year_filter()
    tester.test_anime_list_anime_kind_filter()
    
    # NEW: Test deletion functionality (should be last)
    tester.test_remove_from_favorites()
    tester.test_remove_from_history()

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_tests} test(s) failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())