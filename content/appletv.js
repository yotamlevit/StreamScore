// Apple TV+ content script for StreamScore
// Detects movie/show titles on preview pages and injects ratings

(function () {
    'use strict';

    debugLog('Apple TV+ script loaded');

    let currentTitle = null;
    let processingTimeout = null;

    /**
     * Extract title information from Apple TV+ page using JSON-LD schema
     * @returns {Object|null} Title data or null
     */
    function extractTitleInfo() {
        debugLog('Extracting title info from Apple TV+ schema data');

        // Look for JSON-LD schema scripts
        // Movies: <script id="schema:movie" type="application/ld+json">
        // TV Series: <script id="schema:tv-series" type="application/ld+json">
        const movieSchema = document.querySelector('script#schema\\:movie[type="application/ld+json"]');
        const seriesSchema = document.querySelector('script#schema\\:tv-series[type="application/ld+json"]');

        const schemaElement = movieSchema || seriesSchema;
        
        if (!schemaElement) {
            debugLog('No JSON-LD schema found on Apple TV+ page');
            return null;
        }

        try {
            const schemaData = JSON.parse(schemaElement.textContent);
            debugLog('Parsed schema data:', schemaData);

            // Extract title
            const title = schemaData.name;
            if (!title) {
                debugLog('No title found in schema data');
                return null;
            }

            // Extract year from datePublished (format: "2023-12-15T00:00:00.000Z")
            let year = null;
            if (schemaData.datePublished) {
                const date = new Date(schemaData.datePublished);
                year = date.getFullYear();
                debugLog('Extracted year from datePublished:', year);
            }

            // Determine type from @type field
            let type = 'movie';
            if (schemaData['@type'] === 'TVSeries') {
                type = 'series';
            } else if (schemaData['@type'] === 'Movie') {
                type = 'movie';
            }

            debugLog(`Extracted from schema: title="${title}", year=${year}, type=${type}`);

            return {
                title: cleanTitle(title),
                year: year,
                type: type
            };
        } catch (error) {
            debugLog('Error parsing JSON-LD schema:', error);
            return null;
        }
    }

    /**
     * Find injection container for Apple TV+
     * @returns {Element|null} Container element
     */
    function findInjectionContainer() {
        const containers = [
            '.product-header__info-text',
            '.product-header__metadata-block',
            '[data-test-id="product-description"]',
            '.product-info'
        ];

        for (const selector of containers) {
            const container = document.querySelector(selector);
            if (container && !container.querySelector('.streamscore-widget')) {
                debugLog('Found Apple TV+ injection container:', selector);
                return container;
            }
        }

        // Fallback to product header
        const fallback = document.querySelector('.product-header');
        if (fallback && !fallback.querySelector('.streamscore-widget')) {
            return fallback;
        }

        debugLog('No suitable injection container found on Apple TV+');
        return null;
    }

    /**
     * Process Apple TV+ page
     */
    async function processPage() {
        if (processingTimeout) {
            clearTimeout(processingTimeout);
        }

        processingTimeout = setTimeout(async () => {
            const titleInfo = extractTitleInfo();

            if (!titleInfo) {
                debugLog('No title info extracted from Apple TV+');
                return;
            }

            if (currentTitle === titleInfo.title) {
                debugLog('Same title, skipping');
                return;
            }

            currentTitle = titleInfo.title;
            debugLog('Processing Apple TV+ title:', titleInfo);

            const container = findInjectionContainer();
            if (!container) {
                debugLog('No injection container found');
                return;
            }

            showLoadingWidget(container);

            try {
                const ratings = await getRatings(titleInfo.title, titleInfo.year, titleInfo.type);
                debugLog('Received ratings:', ratings);

                if (ratings && ratings.success) {
                    const widgetContainer = findInjectionContainer();
                    if (widgetContainer) {
                        const widget = createRatingWidget(ratings, widgetContainer);
                        if (widget) {
                            widget.setAttribute('data-platform', 'appletv');
                        }
                    }
                } else {
                    showErrorWidget('No ratings found for this title', container);
                }
            } catch (error) {
                debugLog('Error fetching ratings:', error);
                const errorContainer = findInjectionContainer();
                if (errorContainer) {
                    showErrorWidget(error.message, errorContainer);
                }
            }
        }, 500);
    }

    /**
     * Initialize Apple TV+ observer
     */
    function init() {
        debugLog('Initializing Apple TV+ observer');

        processPage();

        // Watch for SPA navigation
        const observer = new MutationObserver(debounce(() => {
            debugLog('Apple TV+ DOM changed');
            processPage();
        }, 1000));

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // URL change detection
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                debugLog('Apple TV+ URL changed:', url);
                currentTitle = null;
                processPage();
            }
        }).observe(document, { subtree: true, childList: true });
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
