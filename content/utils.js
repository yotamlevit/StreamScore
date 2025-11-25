// Shared utilities for all content scripts

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Clean and normalize a title for API querying
 * @param {string} title - Raw title from webpage
 * @returns {string} Cleaned title
 */
function cleanTitle(title) {
    if (!title) return '';

    return title
        .trim()
        // Remove year in parentheses (e.g., "Movie (2023)" -> "Movie")
        .replace(/\s*\(\d{4}\)\s*/g, '')
        // Remove common suffixes
        .replace(/\s*-\s*(Season|Series|Limited Series|Episode).*$/i, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract year from a title or text
 * @param {string} text - Text containing year
 * @returns {string|null} Four-digit year or null
 */
function extractYear(text) {
    if (!text) return null;

    // Look for 4-digit year
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : null;
}

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Element>} The element
 */
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for element: ${selector}`));
        }, timeout);
    });
}

/**
 * Send message to background script to get ratings
 * @param {string} title - Movie/show title
 * @param {string} year - Release year
 * @param {string} type - 'movie' or 'series'
 * @returns {Promise<Object>} Rating data
 */
function getRatings(title, year, type) {
    return new Promise((resolve, reject) => {
        // Check if chrome API is available
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
            reject(new Error('Extension context invalidated. Please refresh this page (F5 or Cmd+R).'));
            return;
        }

        try {
            chrome.runtime.sendMessage(
                {
                    action: 'getRatings',
                    title: title,
                    year: year,
                    type: type
                },
                response => {
                    // Check if extension context was invalidated during the call
                    if (chrome.runtime.lastError) {
                        const errorMsg = chrome.runtime.lastError.message;
                        if (errorMsg.includes('Extension context invalidated')) {
                            reject(new Error('Extension was reloaded. Please refresh this page (F5 or Cmd+R).'));
                        } else {
                            reject(new Error(errorMsg));
                        }
                        return;
                    }

                    if (response && response.error) {
                        reject(new Error(response.error));
                        return;
                    }

                    resolve(response);
                }
            );
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                reject(new Error('Extension was reloaded. Please refresh this page (F5 or Cmd+R).'));
            } else {
                reject(new Error(`Failed to send message: ${error.message}`));
            }
        }
    });
}

/**
 * Remove any existing StreamScore widgets from the page
 */
function removeExistingWidgets() {
    const widgets = document.querySelectorAll('.streamscore-widget');
    widgets.forEach(widget => widget.remove());
}

/**
 * Log debug information (only in development)
 * @param  {...any} args - Arguments to log
 */
function debugLog(...args) {
    if (true) { // Set to false in production
        console.log('[StreamScore]', ...args);
    }
}
