export const MOVIE_GENRES = {
    // Basic genres for LLM prompt
    BASIC_GENRES: [
        'drama', 'action', 'comedy', 'horror', 'romance', 'thriller',
        'adventure', 'fantasy', 'sci-fi', 'mystery', 'animation',
        'biography', 'western', 'family', 'war', 'music', 'sport'
    ],

    // Complete list from your database
    ALL_GENRES: [
        'Drama', 'Epic', 'Period Drama', 'Prison Drama', 'Crime', 'Gangster',
        'Tragedy', 'Action', 'Action Epic', 'Superhero', 'Thriller',
        'Adventure', 'Fantasy', 'History', 'Biography', 'Romance', 'Western',
        'Family', 'Sci-Fi', 'Mystery', 'Holiday', 'Horror', 'Music', 'War',
        'Animation', 'Comedy', 'Sport', 'Film-Noir', 'Musical', 'Docudrama',
        'Legal Drama', 'Psychological Drama', 'Mountain Adventure', 'Quest',
        'Sword & Sorcery', 'Historical Epic', 'Dark Comedy', 'Drug Crime',
        'Adventure Epic', 'Fantasy Epic', 'True Crime', 'Time Travel',
        'Artificial Intelligence', 'Cyberpunk', 'Dystopian Sci-Fi', 'Gun Fu',
        'Martial Arts', 'Space Sci-Fi', 'Medical Drama', 'Cop Drama',
        'Hard-boiled Detective', 'Police Procedural', 'Serial Killer',
        'Suspense Mystery', 'Feel-Good Romance', 'Holiday Family',
        'Holiday Romance', 'Supernatural Fantasy', 'Desert Adventure',
        'Western Epic', 'Coming-of-Age', 'Caper', 'Workplace Drama',
        'Psychological Thriller', 'Sci-Fi Epic', 'Dark Fantasy', 'Whodunnit',
        'Steampunk', 'One-Person Army Action', 'Computer Animation',
        'Teen Adventure', 'Urban Adventure', 'Anime', 'Fairy Tale',
        'Hand-Drawn Animation', 'Political Thriller', 'Spy', 'Showbiz Drama',
        'Legal Thriller', 'Jungle Adventure', 'Iyashikei', 'Adult Animation',
        'Motorsport', 'Bumbling Detective', 'Classic Musical', 'Jukebox Musical',
        'Quirky Comedy', 'Screwball Comedy', 'Parody', 'Satire', 'Slapstick',
        'Costume Drama', 'Romantic Epic', 'Tragic Romance', 'Animal Adventure',
        'Sea Adventure', 'High-Concept Comedy', 'Teen Drama', 'Korean Drama',
        'Shōjo', 'Slice of Life', 'Boxing', 'Erotic Thriller', 'Steamy Romance',
        'Farce', 'Alien Invasion', 'Body Horror', 'Monster Horror', 'Kaiju',
        'Stoner Comedy', 'Swashbuckler'
    ],

    // Country codes (separate from genres)
    COUNTRIES: [
        'US', 'GB', 'NZ', 'IT', 'ES', 'JP', 'DE', 'CA', 'AU', 'BR', 'FR',
        'IN', 'KR', 'AE', 'HU', 'JO', 'GM', 'MT', 'MA', 'QA', 'CY', 'LB',
        'PL', 'NO', 'ZA', 'MX', 'SUHH', 'XWG', 'TR', 'DZ', 'HK', 'IE',
        'SE', 'BE', 'DK', 'AT'
    ],

    // Language codes (separate from genres)
    LANGUAGES: [
        'am', 'vi', 'ko', 'ru', 'pt', 'da', 'ja', 'hi', 'en', 'it', 'la',
        'es', 'fr', 'de', 'he', 'pl', 'gd', 'sw', 'xh', 'zu', 'cs', 'am',
        'ne', 'ar', 'be', 'yi', 'nl', 'th'
    ]
};

// Genre mapping for fuzzy matching
export const GENRE_MAPPINGS = {
    'funny': 'Comedy',
    'scary': 'Horror',
    'romantic': 'Romance',
    'action-packed': 'Action',
    'thriller': 'Thriller',
    'adventure': 'Adventure',
    'dramatic': 'Drama',
    'animated': 'Animation',
    'superhero': 'Superhero',
    'crime': 'Crime',
    'fantasy': 'Fantasy',
    'sci-fi': 'Sci-Fi',
    'science fiction': 'Sci-Fi',
    'mystery': 'Mystery',
    'western': 'Western',
    'war': 'War',
    'musical': 'Musical',
    'family': 'Family',
    'biography': 'Biography',
    'historical': 'History'
};