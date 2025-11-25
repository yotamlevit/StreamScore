// Debug helper script for StreamScore
// This file helps diagnose what title is being detected on the page

(function () {
    'use strict';

    console.log('%c[StreamScore Debug] Script loaded', 'color: #8b5cf6; font-weight: bold');

    // Add a global function to manually check what title would be detected
    window.StreamScoreDebug = {
        // Check Netflix title detection
        checkNetflix: function () {
            const selectors = [
                '.title-logo',
                '.previewModal--player-titleTreatment-logo',
                'h3.previewModal--metadatAndControls-title',
                '.titleCard-title',
                'h1[data-uia="title-info-title"]',
                '[data-uia="video-title"]',
                '.video-title h4'
            ];

            console.log('%c[StreamScore Debug] Checking Netflix selectors...', 'color: #8b5cf6');

            selectors.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) {
                    const text = el.tagName === 'IMG' ? el.alt : el.textContent;
                    console.log(`✓ Found: ${selector}`, text);
                } else {
                    console.log(`✗ Not found: ${selector}`);
                }
            });

            // Check what URL pattern we're on
            console.log('Current URL:', window.location.href);
            const isBrowse = /\/browse\?jbv=/.test(window.location.href);
            const isTitle = /\/title\//.test(window.location.href);
            console.log('Is browse page:', isBrowse);
            console.log('Is title page:', isTitle);
        },

        // Get current page info
        getPageInfo: function () {
            console.log('%c[StreamScore Debug] Page Information', 'color: #8b5cf6; font-weight: bold');
            console.log('URL:', window.location.href);
            console.log('Platform:', window.location.hostname);

            // Try to detect all potential title elements
            const allText = Array.from(document.querySelectorAll('h1, h2, h3, img[alt]'))
                .map(el => ({
                    tag: el.tagName,
                    selector: el.className ? `.${el.className.split(' ')[0]}` : el.tagName,
                    text: el.tagName === 'IMG' ? el.alt : el.textContent.substring(0, 100)
                }));

            console.table(allText);
        },

        // Show what would be sent to API
        simulateAPICall: function () {
            console.log('%c[StreamScore Debug] Simulating API call...', 'color: #8b5cf6; font-weight: bold');
            // This would need to extract title similar to content scripts
            console.log('Check browser console for actual API calls from background.js');
        }
    };

    console.log('%c[StreamScore Debug] Commands available:', 'color: #8b5cf6; font-weight: bold');
    console.log('- StreamScoreDebug.checkNetflix()  - Check Netflix title detection');
    console.log('- StreamScoreDebug.getPageInfo()   - Get current page information');
    console.log('');
    console.log('Look for [StreamScore] logs to see what the extension is doing');

})();
