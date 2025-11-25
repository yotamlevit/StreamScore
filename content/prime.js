// Amazon Prime Video content script for StreamScore
// Detects movie/show titles on preview pages and injects ratings

(function () {
    'use strict';

    debugLog('Prime Video script loaded');

    let currentTitle = null;
    let processingTimeout = null;

    /**
     * Extract title information from Prime Video page
     * @returns {Object|null} Title data or null
     */
    function extractTitleInfo() {
        // Prime Video selectors
        const selectors = [
            'h1[data-automation-id="title"]',
            'h1.dv-node-dp-title',
            '.title .av-detail-section h1',
            '[data-testid="title-text"]',
            'h1.atv-detail-title'
        ];

        let titleElement = null;
        let titleText = '';

        for (const selector of selectors) {
            titleElement = document.querySelector(selector);
            if (titleElement) {
                titleText = titleElement.textContent || titleElement.innerText || '';
                if (titleText.trim()) {
                    debugLog('Found Prime Video title:', selector, titleText);
                    break;
                }
            }
        }

        if (!titleText) {
            debugLog('No title found on Prime Video page');
            return null;
        }

        titleText = cleanTitle(titleText);

        // Extract year from metadata
        let year = null;
        const metadataSelectors = [
            '[data-automation-id="release-year-badge"]',
            '.releaseYear',
            '.av-detail-section .av-badges'
        ];

        for (const selector of metadataSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                year = extractYear(element.textContent);
                if (year) break;
            }
        }

        // Check metadata text for year
        const metadataText = document.body.textContent;
        if (!year) {
            year = extractYear(metadataText);
        }

        // Determine type
        let type = 'movie';
        const seriesIndicators = [
            '[data-automation-id="episode-list"]',
            '.av-episode-meta-info',
            'button[aria-label*="Season"]',
            '.dv-episode-list'
        ];

        for (const selector of seriesIndicators) {
            if (document.querySelector(selector)) {
                type = 'series';
                break;
            }
        }

        // Check for series keywords in page
        if (metadataText.toLowerCase().includes('season ') ||
            metadataText.toLowerCase().includes('episode ')) {
            type = 'series';
        }

        return {
            title: titleText,
            year: year,
            type: type
        };
    }

    /**
     * Find injection container for Prime Video
     * @returns {Element|null} Container element
     */
    function findInjectionContainer() {
        const containers = [
            '[data-automation-id="detail-synopsis"]',
            '.dv-node-dp-synopsis',
            '.av-detail-section',
            '.dv-dp-node-meta-info'
        ];

        for (const selector of containers) {
            const container = document.querySelector(selector);
            if (container && !container.querySelector('.streamscore-widget')) {
                debugLog('Found Prime Video injection container:', selector);
                return container;
            }
        }

        // Fallback
        const fallback = document.querySelector('[class*="detail"]');
        if (fallback && !fallback.querySelector('.streamscore-widget')) {
            return fallback;
        }

        debugLog('No suitable injection container found on Prime Video');
        return null;
    }

    /**
     * Process Prime Video page
     */
    async function processPage() {
        if (processingTimeout) {
            clearTimeout(processingTimeout);
        }

        processingTimeout = setTimeout(async () => {
            const titleInfo = extractTitleInfo();

            if (!titleInfo) {
                debugLog('No title info extracted from Prime Video');
                return;
            }

            if (currentTitle === titleInfo.title) {
                debugLog('Same title, skipping');
                return;
            }

            currentTitle = titleInfo.title;
            debugLog('Processing Prime Video title:', titleInfo);

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
                            widget.setAttribute('data-platform', 'prime');
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
     * Initialize Prime Video observer
     */
    function init() {
        debugLog('Initializing Prime Video observer');

        processPage();

        // Watch for SPA navigation
        const observer = new MutationObserver(debounce(() => {
            debugLog('Prime Video DOM changed');
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
                debugLog('Prime Video URL changed:', url);
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
