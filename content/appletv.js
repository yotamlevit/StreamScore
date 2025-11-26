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
     * Creates a container div and inserts it before the Trailers/Episodes section
     * @param {string} contentType - 'movie' or 'series' to determine which section to target
     * @returns {Element|null} Container element
     */
    function findInjectionContainer(contentType = 'movie') {
        // Check if we already created a container
        const existingContainer = document.querySelector('.streamscore-appletv-container');
        if (existingContainer) {
            debugLog('Found existing StreamScore container');
            return existingContainer;
        }

        // For movies: inject before "Trailers" section
        // For TV shows: inject before "Episodes" section
        const targetLabel = contentType === 'movie' ? 'Trailers' : 'Episodes';
        const targetSection = document.querySelector(`.section[aria-label="${targetLabel}"]`);

        if (targetSection) {
            debugLog(`Found ${targetLabel} section, creating container before it`);
            
            // Create a container div for our widget
            const container = document.createElement('div');
            container.className = 'streamscore-appletv-container';
            container.style.cssText = 'margin: 20px 0; padding: 0 48px;';
            
            // Insert before the target section
            targetSection.parentNode.insertBefore(container, targetSection);
            
            debugLog('Container created and inserted successfully');
            return container;
        }

        debugLog(`No ${targetLabel} section found on Apple TV+ page`);
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

            const container = findInjectionContainer(titleInfo.type);
            if (!container) {
                debugLog('No injection container found');
                return;
            }

            showLoadingWidget(container);

            try {
                const ratings = await getRatings(titleInfo.title, titleInfo.year, titleInfo.type);
                debugLog('Received ratings:', ratings);

                if (ratings && ratings.success) {
                    const widgetContainer = findInjectionContainer(titleInfo.type);
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
                const errorContainer = findInjectionContainer(titleInfo.type);
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
                
                // Clean up old container if navigating away from a detail page
                const container = document.querySelector('.streamscore-appletv-container');
                if (container) {
                    debugLog('Removing old widget container');
                    container.remove();
                }
                
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
