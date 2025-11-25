/**
 * Create and display rating widget
 * @param {Object} ratings - Rating data from background script
 * @param {Element} container - Container element to inject widget into
 */
function createRatingWidget(ratings, container) {
    if (!ratings || !container) {
        debugLog('Cannot create widget: missing ratings or container');
        return;
    }

    debugLog('createRatingWidget called with:', {
        hasImdb: !!ratings.imdb,
        hasRT: !!ratings.rottenTomatoes,
        hasMeta: !!ratings.metacritic,
        imdbRating: ratings.imdb?.rating,
        rtCritic: ratings.rottenTomatoes?.critic,
        fullRatings: ratings
    });

    // Remove any existing widgets first
    removeExistingWidgets();

    // Create widget container
    const widget = document.createElement('div');
    widget.className = 'streamscore-widget';
    widget.setAttribute('data-streamscore', 'true');

    // Build widget content with logo
    let widgetHTML = '<div class="streamscore-header">';

    // Add logo SVG
    widgetHTML += `
        <div class="streamscore-header-brand">
            <svg class="streamscore-logo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="streamscore-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                      fill="url(#streamscore-gradient)" 
                      stroke="url(#streamscore-gradient)" 
                      stroke-width="1.5" 
                      stroke-linejoin="round"/>
            </svg>
            <span class="streamscore-title">StreamScore</span>
        </div>
    `;

    widgetHTML += '<button class="streamscore-close" title="Close">×</button>';
    widgetHTML += '</div>';

    widgetHTML += '<div class="streamscore-content">';

    let hasAnyRating = false;

    // IMDb Rating
    if (ratings.imdb && ratings.imdb.rating) {
        hasAnyRating = true;
        widgetHTML += '<div class="streamscore-rating">';
        widgetHTML += '<div class="streamscore-rating-source">';
        widgetHTML += '<span class="streamscore-logo streamscore-logo-imdb">IMDb</span>';
        widgetHTML += '</div>';
        widgetHTML += '<div class="streamscore-rating-value">';
        widgetHTML += `<span class="streamscore-score">${ratings.imdb.rating}</span>`;
        widgetHTML += '<span class="streamscore-score-max">/10</span>';
        widgetHTML += '</div>';
        if (ratings.imdb.url) {
            widgetHTML += `<a href="${ratings.imdb.url}" target="_blank" rel="noopener" class="streamscore-link">View on IMDb →</a>`;
        }
        widgetHTML += '</div>';
    }

    // Rotten Tomatoes Critic Score
    if (ratings.rottenTomatoes && ratings.rottenTomatoes.critic) {
        hasAnyRating = true;
        const criticScore = parseInt(ratings.rottenTomatoes.critic);
        const criticStatus = criticScore >= 60 ? 'fresh' : 'rotten';

        widgetHTML += '<div class="streamscore-rating">';
        widgetHTML += '<div class="streamscore-rating-source">';
        widgetHTML += `<span class="streamscore-logo streamscore-logo-rt ${criticStatus}">🍅 RT Critics</span>`;
        widgetHTML += '</div>';
        widgetHTML += '<div class="streamscore-rating-value">';
        widgetHTML += `<span class="streamscore-score">${ratings.rottenTomatoes.critic}</span>`;
        widgetHTML += '</div>';
        if (ratings.rottenTomatoes.url) {
            widgetHTML += `<a href="${ratings.rottenTomatoes.url}" target="_blank" rel="noopener" class="streamscore-link">View on RT →</a>`;
        }
        widgetHTML += '</div>';
    }

    // Rotten Tomatoes Audience Score (if available)
    if (ratings.rottenTomatoes && ratings.rottenTomatoes.audience) {
        hasAnyRating = true;
        const audienceScore = parseInt(ratings.rottenTomatoes.audience);
        const audienceStatus = audienceScore >= 60 ? 'fresh' : 'rotten';

        widgetHTML += '<div class="streamscore-rating">';
        widgetHTML += '<div class="streamscore-rating-source">';
        widgetHTML += `<span class="streamscore-logo streamscore-logo-rt-audience ${audienceStatus}">🍿 RT Audience</span>`;
        widgetHTML += '</div>';
        widgetHTML += '<div class="streamscore-rating-value">';
        widgetHTML += `<span class="streamscore-score">${ratings.rottenTomatoes.audience}</span>`;
        widgetHTML += '</div>';
        widgetHTML += '</div>';
    }

    // Metacritic (bonus)
    if (ratings.metacritic) {
        hasAnyRating = true;
        const metaScore = parseInt(ratings.metacritic);
        let metaClass = 'mid';
        if (metaScore >= 75) metaClass = 'high';
        else if (metaScore < 50) metaClass = 'low';

        widgetHTML += '<div class="streamscore-rating">';
        widgetHTML += '<div class="streamscore-rating-source">';
        widgetHTML += '<span class="streamscore-logo streamscore-logo-meta">Metacritic</span>';
        widgetHTML += '</div>';
        widgetHTML += '<div class="streamscore-rating-value">';
        widgetHTML += `<span class="streamscore-score streamscore-meta-${metaClass}">${ratings.metacritic}</span>`;
        widgetHTML += '<span class="streamscore-score-max">/100</span>';
        widgetHTML += '</div>';
        widgetHTML += '</div>';
    }

    // If no ratings available, show message
    if (!hasAnyRating) {
        debugLog('WARNING: No ratings available to display');
        widgetHTML += '<p class="streamscore-error-message">No ratings available for this title</p>';
    }

    widgetHTML += '</div>'; // Close content

    // Set HTML
    widget.innerHTML = widgetHTML;

    // Add close button handler
    const closeBtn = widget.querySelector('.streamscore-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            widget.classList.add('streamscore-widget-hiding');
            setTimeout(() => widget.remove(), 300);
        });
    }

    // Inject widget into container
    container.appendChild(widget);

    // Animate in
    setTimeout(() => {
        widget.classList.add('streamscore-widget-visible');
    }, 100);

    debugLog('Widget created successfully');

    return widget;
}

/**
 * Show error message in widget
 * @param {string} message - Error message
 * @param {Element} container - Container element
 */
function showErrorWidget(message, container) {
    if (!container) return;

    removeExistingWidgets();

    const widget = document.createElement('div');
    widget.className = 'streamscore-widget streamscore-widget-error';
    widget.innerHTML = `
    <div class="streamscore-header">
      <span class="streamscore-title">StreamScore</span>
      <button class="streamscore-close" title="Close">×</button>
    </div>
    <div class="streamscore-content">
      <p class="streamscore-error-message">⚠️ ${message}</p>
    </div>
  `;

    const closeBtn = widget.querySelector('.streamscore-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => widget.remove());
    }

    container.appendChild(widget);
    setTimeout(() => widget.classList.add('streamscore-widget-visible'), 100);
}

/**
 * Show loading state
 * @param {Element} container - Container element
 */
function showLoadingWidget(container) {
    if (!container) return;

    removeExistingWidgets();

    const widget = document.createElement('div');
    widget.className = 'streamscore-widget streamscore-widget-loading';
    widget.innerHTML = `
    <div class="streamscore-header">
      <span class="streamscore-title">StreamScore</span>
    </div>
    <div class="streamscore-content">
      <div class="streamscore-loader"></div>
      <p>Loading ratings...</p>
    </div>
  `;

    container.appendChild(widget);
    setTimeout(() => widget.classList.add('streamscore-widget-visible'), 100);
}
