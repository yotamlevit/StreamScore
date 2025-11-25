// Apple TV+ content script for StreamScore
// Detects movie/show titles on preview pages and injects ratings

(function () {
    'use strict';

    debugLog('Apple TV+ script loaded');

    let currentTitle = null;
    let processingTimeout = null;

    /**
     * Extract title information from Apple TV+ page
     * @returns {Object|null} Title data or null
     */
    function extractTitleInfo() {
        // Apple TV+ selectors
        const selectors = [
            'h1.product-header__title',
            'h1[data-test-id="product-title"]',
            '.product-header h1',
            'h1.episode-header__title',
            '.canvas-header__title h1'
        ];

        let titleElement = null;
        let titleText = '';

        for (const selector of selectors) {
            titleElement = document.querySelector(selector);
            if (titleElement) {
                titleText = titleElement.textContent || titleElement.innerText || '';
                if (titleText.trim()) {
                    debugLog('Found Apple TV+ title:', selector, titleText);
                    break;
                }
            }
        }

        if (!titleText) {
            debugLog('No title found on Apple TV+ page');
            return null;
        }

        titleText = cleanTitle(titleText);

        // Extract year from metadata
        let year = null;
        const metadataSelectors = [
            '.product-header__metadata',
            '.product-header__info',
            '[data-test-id="product-metadata"]'
        ];

        for (const selector of metadataSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                year = extractYear(element.textContent);
                if (year) break;
            }
        }

        // Determine type based on URL and page elements
        let type = 'movie';
        const currentUrl = window.location.href;

        if (currentUrl.includes('/show/')) {
            type = 'series';
        } else if (currentUrl.includes('/movie/')) {
            type = 'movie';
        }

        // Also check for season/episode indicators
        const seriesIndicators = [
            '.episode-list',
            '[data-test-id="season-selector"]',
            '.episode-lockup'
        ];

        for (const selector of seriesIndicators) {
            if (document.querySelector(selector)) {
                type = 'series';
                break;
            }
        }

        return {
            title: titleText,
            year: year,
            type: type
        };
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
