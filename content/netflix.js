// Netflix content script for StreamScore
// Detects movie/show titles on preview pages and injects ratings

(function () {
    'use strict';

    debugLog('Netflix script loaded');

    let currentTitle = null;
    let processingTimeout = null;

    /**
     * Extract title information from Netflix page
     * @returns {Object|null} Title data or null
     */
    function extractTitleInfo() {
        let titleText = '';

        // PRIORITY 1: Try the page title (most reliable)
        const pageTitle = document.querySelector('title');
        if (pageTitle) {
            const titleContent = pageTitle.textContent;
            // Netflix format: "Title Name - watch on Netflix" or "Title Name | Netflix"
            if (titleContent && !titleContent.startsWith('Netflix')) {
                titleText = titleContent.split(/\s*[-|]\s*/)[0].trim();
                if (titleText && titleText !== 'Netflix') {
                    debugLog('Found title from <title> tag:', titleText);
                }
            }
        }

        // PRIORITY 2: Try About section in preview modal
        if (!titleText) {
            const aboutSection = document.querySelector('.previewModal--section-header');
            if (aboutSection) {
                const strongTag = aboutSection.querySelector('strong');
                if (strongTag) {
                    titleText = strongTag.textContent.trim();
                    if (titleText) {
                        debugLog('Found title from About section <strong>:', titleText);
                    }
                }
            }
        }

        if (!titleText) {
            debugLog('No title found on page');
            return null;
        }

        titleText = cleanTitle(titleText);

        // Extract year from metadata
        let year = null;
        const yearSelectors = [
            '.year', // Common year element
            '[data-uia="item-year"]',
            '.previewModal--metadatAndControls-info .year'
        ];

        for (const selector of yearSelectors) {
            const yearElement = document.querySelector(selector);
            if (yearElement) {
                year = extractYear(yearElement.textContent);
                if (year) break;
            }
        }

        // If no year found in metadata, try to extract from title
        if (!year) {
            year = extractYear(titleText);
        }

        // Determine type (movie or series)
        let type = 'movie';

        // Check for episode selector label (most reliable indicator of TV shows)
        if (document.querySelector('.episodeSelector-label')) {
            type = 'series';
            debugLog('Detected as series: found episodeSelector-label');
        }

        if (type === 'movie') {
            debugLog('Detected as movie (no series indicators found)');
        }

        return {
            title: titleText,
            year: year,
            type: type
        };
    }

    /**
     * Find the best container to inject the widget
     * @param {number} retries - Number of retries left
     * @param {number} delay - Delay between retries in ms
     * @returns {Promise<Element|null>} Container element
     */
    async function findInjectionContainer(retries = 5, delay = 200) {
        // Look for preview modal or title page metadata section
        const containers = [
            '.previewModal--metadatAndControls',
            '.previewModal--info',
            '[data-uia="info-container"]',
            '.title-info-metadata',
            '.supplemental-message-container',
            '.previewModal--container' // Add broader container as fallback
        ];

        for (const selector of containers) {
            const container = document.querySelector(selector);
            if (container && !container.querySelector('.streamscore-widget')) {
                debugLog('Found injection container:', selector);
                return container;
            }
        }

        // If not found and retries left, wait and try again
        if (retries > 0) {
            debugLog(`Container not found, retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return findInjectionContainer(retries - 1, delay);
        }

        debugLog('No suitable injection container found after all retries');
        return null;
    }

    /**
     * Process the current page and inject ratings
     */
    async function processPage() {
        // Clear any pending processing
        if (processingTimeout) {
            clearTimeout(processingTimeout);
        }

        // Debounce to avoid multiple calls
        processingTimeout = setTimeout(async () => {
            const titleInfo = extractTitleInfo();

            if (!titleInfo) {
                debugLog('No title info extracted, skipping');
                return;
            }

            // Skip if same title as before
            if (currentTitle === titleInfo.title) {
                debugLog('Same title as before, skipping');
                return;
            }

            currentTitle = titleInfo.title;
            debugLog('Processing Netflix title:', titleInfo);

            const initialContainer = await findInjectionContainer();
            if (!initialContainer) {
                debugLog('No injection container found');
                return;
            }

            // Show loading state
            showLoadingWidget(initialContainer);

            try {
                // Fetch ratings
                const ratings = await getRatings(titleInfo.title, titleInfo.year, titleInfo.type);
                debugLog('Received ratings:', ratings);
                debugLog('Ratings success flag:', ratings ? ratings.success : 'ratings is null/undefined');

                // Create and inject widget
                if (ratings && ratings.success) {
                    // Try to use the initial container first
                    let targetContainer = initialContainer;

                    // Check if initial container still exists in DOM
                    if (!document.contains(initialContainer)) {
                        debugLog('Initial container removed from DOM, trying to find new one');
                        targetContainer = await findInjectionContainer();
                    }

                    // If still no container, try to find the loading widget and use its parent
                    if (!targetContainer) {
                        const loadingWidget = document.querySelector('.streamscore-widget-loading');
                        if (loadingWidget && loadingWidget.parentElement) {
                            debugLog('Using loading widget parent as container');
                            targetContainer = loadingWidget.parentElement;
                        }
                    }

                    if (targetContainer) {
                        debugLog('Creating widget with ratings in container');
                        const widget = createRatingWidget(ratings, targetContainer);
                        if (widget) {
                            widget.setAttribute('data-platform', 'netflix');
                        }
                        debugLog('Widget created and injected');
                    } else {
                        debugLog('ERROR: No container available, trying final desperate attempt');
                        // Last resort: try to find ANY container
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const finalAttempt = await findInjectionContainer(3, 300);
                        if (finalAttempt) {
                            debugLog('Container found on final attempt');
                            const widget = createRatingWidget(ratings, finalAttempt);
                            if (widget) {
                                widget.setAttribute('data-platform', 'netflix');
                            }
                        } else {
                            showErrorWidget('Could not find container to display ratings', initialContainer);
                        }
                    }
                } else {
                    debugLog('ERROR: Ratings response missing or success=false:', ratings);
                    showErrorWidget('No ratings found for this title', initialContainer);
                }
            } catch (error) {
                debugLog('Error fetching ratings:', error);
                const errorContainer = await findInjectionContainer();
                if (errorContainer) {
                    showErrorWidget(error.message, errorContainer);
                } else if (initialContainer) {
                    showErrorWidget(error.message, initialContainer);
                }
            }
        }, 500); // 500ms debounce
    }

    /**
     * Initialize the Netflix observer
     */
    function init() {
        debugLog('Initializing Netflix observer');

        // Process initial page
        processPage();

        // Watch for navigation and DOM changes (Netflix is an SPA)
        const observer = new MutationObserver(debounce(() => {
            debugLog('DOM changed, reprocessing page');
            processPage();
        }, 1000));

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also listen for URL changes
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                debugLog('URL changed:', url);
                currentTitle = null; // Reset current title
                processPage();
            }
        }).observe(document, { subtree: true, childList: true });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
