// Background service worker for StreamScore extension
// Handles API requests to OMDb and rating data caching

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ratingCache = new Map();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRatings') {
    handleGetRatings(request.title, request.year, request.type)
      .then(sendResponse)
      .catch(error => {
        console.error('Error fetching ratings:', error);
        sendResponse({ error: error.message });
      });
    return true; // Will respond asynchronously
  }

  if (request.action === 'validateApiKey') {
    validateApiKey(request.apiKey)
      .then(sendResponse)
      .catch(error => {
        console.error('Error validating API key:', error);
        sendResponse({ valid: false, error: error.message });
      });
    return true;
  }
});

/**
 * Fetch ratings for a movie or TV show
 * @param {string} title - Movie or show title
 * @param {string} year - Release year (optional)
 * @param {string} type - 'movie' or 'series'
 * @returns {Promise<Object>} Rating data
 */
async function handleGetRatings(title, year, type) {
  if (!title) {
    throw new Error('Title is required');
  }

  // Check cache first
  const cacheKey = `${title}_${year || ''}_${type || ''}`.toLowerCase();
  const cached = ratingCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached ratings for:', title);
    return cached.data;
  }

  // Get API key from storage
  const { omdbApiKey } = await chrome.storage.local.get('omdbApiKey');

  if (!omdbApiKey) {
    throw new Error('API key not set. Please configure your OMDb API key in the extension popup.');
  }

  // Fetch from OMDb API
  const ratings = await fetchFromOMDb(title, year, type, omdbApiKey);

  // Cache the result
  ratingCache.set(cacheKey, {
    data: ratings,
    timestamp: Date.now()
  });

  return ratings;
}

/**
 * Fetch data from OMDb API
 * @param {string} title - Movie or show title
 * @param {string} year - Release year
 * @param {string} type - 'movie' or 'series'
 * @param {string} apiKey - OMDb API key
 * @returns {Promise<Object>} Rating data
 */
async function fetchFromOMDb(title, year, type, apiKey) {
  const params = new URLSearchParams({
    apikey: apiKey,
    t: title,
    plot: 'short'
  });

  // Add type if specified
  if (type) {
    params.set('type', type);
  }

  // Add year only for movies, not for series
  // Netflix shows end year for series, but OMDb uses start year
  if (year && type !== 'series') {
    params.set('y', year);
  }

  const url = `https://www.omdbapi.com/?${params.toString()}`;

  console.log('[StreamScore] Fetching from OMDb:', { title, year, type, url });

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'False') {
      const errorMsg = data.Error || 'Not found';
      console.log('[StreamScore] OMDb search failed:', errorMsg, 'for title:', title);
      throw new Error(`Could not find "${title}". Try checking the title on IMDb directly.`);
    }

    console.log('[StreamScore] Successfully fetched data:', data.Title);

    // Parse ratings from OMDb
    const imdbRating = data.imdbRating !== 'N/A' ? data.imdbRating : null;
    const imdbVotes = data.imdbVotes !== 'N/A' ? data.imdbVotes : null;

    let rottenTomatoesCritic = null;
    let rottenTomatoesAudience = null;
    let metacritic = null;

    // Extract ratings from the Ratings array
    if (data.Ratings && Array.isArray(data.Ratings)) {
      data.Ratings.forEach(rating => {
        if (rating.Source === 'Rotten Tomatoes') {
          rottenTomatoesCritic = rating.Value;
        } else if (rating.Source === 'Metacritic') {
          metacritic = rating.Value;
        }
      });
    }

    // Note: OMDb doesn't provide RT Audience score directly
    // We'll show what we have

    // Construct URLs
    const imdbId = data.imdbID;
    const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : null;

    // Construct Rotten Tomatoes URL
    const rtSlug = createRottenTomatoesSlug(data.Title, data.Type);
    const rtUrl = `https://www.rottentomatoes.com/${rtSlug}`;

    return {
      success: true,
      title: data.Title,
      year: data.Year,
      type: data.Type,
      imdb: {
        rating: imdbRating,
        votes: imdbVotes,
        url: imdbUrl
      },
      rottenTomatoes: {
        critic: rottenTomatoesCritic,
        audience: rottenTomatoesAudience, // Will be null as OMDb doesn't provide it
        url: rtUrl
      },
      metacritic: metacritic,
      poster: data.Poster !== 'N/A' ? data.Poster : null,
      plot: data.Plot !== 'N/A' ? data.Plot : null
    };
  } catch (error) {
    console.error('[StreamScore] OMDb API error:', error);
    throw error;
  }
}

/**
 * Create a Rotten Tomatoes URL slug from title
 * @param {string} title - Movie or show title
 * @param {string} type - 'movie' or 'series'
 * @returns {string} URL slug
 */
function createRottenTomatoesSlug(title, type) {
  // Convert title to lowercase and replace spaces with underscores
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '_'); // Replace spaces with underscores

  // Determine prefix based on type
  const prefix = type === 'movie' ? 'm' : 'tv';

  return `${prefix}/${slug}`;
}

/**
 * Validate an OMDb API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateApiKey(apiKey) {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key cannot be empty' };
  }

  try {
    // Test the API key with a simple request
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&t=Inception`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'False' && data.Error && data.Error.includes('Invalid API key')) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Clear old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ratingCache.entries()) {
    if (now - value.timestamp >= CACHE_DURATION) {
      ratingCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Check every hour
