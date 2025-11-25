// Popup script for StreamScore extension settings

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveBtn');
    const saveText = document.getElementById('saveText');
    const saveLoader = document.getElementById('saveLoader');
    const statusMessage = document.getElementById('statusMessage');
    const statusIndicator = document.getElementById('statusIndicator');

    // Load saved API key
    loadSettings();

    // Save button click
    saveBtn.addEventListener('click', saveSettings);

    // Enter key to save
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveSettings();
        }
    });

    // Real-time validation indicator
    apiKeyInput.addEventListener('input', () => {
        const key = apiKeyInput.value.trim();
        if (key.length === 0) {
            setStatusIndicator('none');
        } else if (key.length < 8) {
            setStatusIndicator('invalid');
        } else {
            setStatusIndicator('unknown');
        }
    });

    /**
     * Load settings from storage
     */
    async function loadSettings() {
        try {
            const { omdbApiKey } = await chrome.storage.local.get('omdbApiKey');
            if (omdbApiKey) {
                apiKeyInput.value = omdbApiKey;
                setStatusIndicator('valid');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    /**
     * Save settings to storage and validate
     */
    async function saveSettings() {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showStatus('Please enter an API key', 'error');
            return;
        }

        // Show loading
        saveBtn.disabled = true;
        saveText.style.display = 'none';
        saveLoader.style.display = 'inline-block';
        setStatusIndicator('validating');

        try {
            // Validate API key with background script
            const response = await chrome.runtime.sendMessage({
                action: 'validateApiKey',
                apiKey: apiKey
            });

            if (response.valid) {
                // Save to storage
                await chrome.storage.local.set({ omdbApiKey: apiKey });
                setStatusIndicator('valid');
                showStatus('✓ API key saved successfully!', 'success');
            } else {
                setStatusIndicator('invalid');
                showStatus('✗ Invalid API key. Please check and try again.', 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            setStatusIndicator('invalid');
            showStatus('✗ Error validating API key. Please try again.', 'error');
        } finally {
            // Hide loading
            saveBtn.disabled = false;
            saveText.style.display = 'inline';
            saveLoader.style.display = 'none';
        }
    }

    /**
     * Show status message
     * @param {string} message - Message to display
     * @param {string} type - 'success' or 'error'
     */
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message status-${type}`;
        statusMessage.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }

    /**
     * Set status indicator
     * @param {string} status - 'none', 'valid', 'invalid', 'validating', 'unknown'
     */
    function setStatusIndicator(status) {
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(`status-${status}`);
    }
});
