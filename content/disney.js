// Disney+ content script for StreamScore
// Detects movie/show titles on preview pages and injects ratings

(function () {
    'use strict';

    debugLog('Disney+ script loaded');

    let currentTitle = null;
    let processingTimeout = null;

    /**
     * Extract title information from Disney+ page
     * @returns {Object|null} Title data or null
     */
    function extractTitleInfo() {
        // Disney+ selectors
        const selectors = [
            'h1[data-testid="details__title"]',
            'h1.title-field',
            '.title-treatment',
            '[data-gv2elementid*="title"]',
            'h1.video-title'
        ];

        let titleElement = null;
        let titleText = '';

        for (const selector of selectors) {
            titleElement = document.querySelector(selector);
            if (titleElement) {
                titleText = titleElement.textContent || titleElement.innerText || '';
                if (titleText.trim()) {
                    debugLog('Found Disney+ title:', selector, titleText);
                    break;
                }
            }
        }

        if (!titleText) {
            debugLog('No title found on Disney+ page');
            return null;
        }

        titleText = cleanTitle(titleText);

        // Extract year
        let year = null;
        const yearSelectors = [
            '[data-testid="details__title-year"]',
            '.meta-info .year',
            '.subtitle-field'
        ];

        for (const selector of yearSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                year = extractYear(element.textContent);
                if (year) break;
            }
        }

        // Determine type
        let type = 'movie';
        const seriesIndicators = [
            '[data-testid="season-selector"]',
            '.episode-list',
            'button[aria-label*="Season"]'
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
     * Find injection container for Disney+
     * @returns {Element|null} Container element
     */
    function findInjectionContainer() {
        const containers = [
            '[data-testid="details__description-container"]',
            '.details-container',
            '.title-info-container',
            '.content-meta'
        ];

        for (const selector of containers) {
            const container = document.querySelector(selector);
            if (container && !container.querySelector('.streamscore-widget')) {
                debugLog('Found Disney+ injection container:', selector);
                return container;
            }
        }

        // Fallback: try to find any suitable container
        const fallback = document.querySelector('[class*="detail"]');
        if (fallback && !fallback.querySelector('.streamscore-widget')) {
            return fallback;
        }

        debugLog('No suitable injection container found on Disney+');
        return null;
    }

    /**
     * Process Disney+ page
     */
    async function processPage() {
        if (processingTimeout) {
            clearTimeout(processingTimeout);
        }

        processingTimeout = setTimeout(async () => {
            const titleInfo = extractTitleInfo();

            if (!titleInfo) {
                debugLog('No title info extracted from Disney+');
                return;
            }

            if (currentTitle === titleInfo.title) {
                debugLog('Same title, skipping');
                return;
            }

            currentTitle = titleInfo.title;
            debugLog('Processing Disney+ title:', titleInfo);

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
                            widget.setAttribute('data-platform', 'disney');
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
     * Initialize Disney+ observer
     */
    function init() {
        debugLog('Initializing Disney+ observer');

        processPage();

        // Watch for SPA navigation
        const observer = new MutationObserver(debounce(() => {
            debugLog('Disney+ DOM changed');
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
                debugLog('Disney+ URL changed:', url);
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
