/*
MIT License

Copyright (c) 2024 Aiso

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { extractEpisodeInfo } from './utils.js';

// Variable to store the current sort order (moved to global scope)
let currentSortOrder = 'newest'; 

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const refreshButton = document.getElementById('refresh');
    const loadFromFileButton = document.getElementById('loadFromFile');
    const fileInput = document.getElementById('fileInput');
    const settingsButton = document.getElementById('settings');
    const settingsModal = document.getElementById('settingsModal');
    const saveSettingsButton = document.getElementById('saveSettings');
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => button.addEventListener('click', handleFilterButtonClick));
    const sortNewestButton = document.getElementById('sortNewest');
    const sortOldestButton = document.getElementById('sortOldest');
    const guideButton = document.getElementById('guideButton');
    guideButton.addEventListener('click', openGuideModal);

    // currentSortOrder is now defined globally

    refreshButton.addEventListener('click', () => {
        refreshAnimeData();
    });
    loadFromFileButton.addEventListener('click', () => {
        fileInput.click(); 
    });
    sortNewestButton.addEventListener('click', () => handleSortButtonClick('newest'));
    sortOldestButton.addEventListener('click', () => handleSortButtonClick('oldest'));

    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                chrome.storage.sync.set(data, function() {
                    console.log('Data loaded from file');
                    loadAnimeGroups();
                    loadAlphabetButtons();
                });
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('Failed to load data. Please ensure the file is a valid JSON.');
            }
        };
        reader.readAsText(file);
    });

    settingsButton.addEventListener('click', openSettingsModal);

    searchInput.addEventListener('input', handleSearch);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === settingsModal) {
            closeModal('settingsModal');
        }
    });
    const closeButton = document.getElementById('close-button');
    closeButton.addEventListener('click', () => {
        closeModal('settingsModal');
    }); 


    saveSettingsButton.addEventListener('click', saveSettings);

    // Load saved settings and data
    loadSettings(); // This calls loadAnimeGroups indirectly after applying settings
    loadAlphabetButtons();
    // Initial load is handled by loadSettings -> applySettings -> loadAnimeGroups
    // Set initial active sort button after initial load completes
    loadAnimeGroups().then(() => {
        updateAnimeCount();
        document.getElementById('sortNewest').classList.add('active'); // Set default active sort button
        sortDisplayedCards(); // Apply initial sort
    });
});

// New function to handle filter button clicks
function handleFilterButtonClick(event) {
    // Remove active class from all filter buttons
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Get the filter value from the data-filter attribute
    const filterValue = event.target.dataset.filter;
    
    // Apply the filter
    const currentLetter = document.querySelector('#alphabetList button.active').dataset.letter;
    loadAnimeGroups(currentLetter, filterValue).then(() => {
        updateAnimeCount();
    });
}

// Function to handle sort button clicks
function handleSortButtonClick(sortBy) {
    if (currentSortOrder === sortBy) return; // No change if already sorted this way

    currentSortOrder = sortBy;

    // Update active class on sort buttons
    document.querySelectorAll('.sort-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(sortBy === 'newest' ? 'sortNewest' : 'sortOldest').classList.add('active');

    sortDisplayedCards(); // Re-sort the cards currently displayed
}

// Function to sort the currently displayed cards in the DOM
function sortDisplayedCards() {
    const animeCardsContainer = document.getElementById('animeCards');
    // Select only cards that are not hidden by filters
    const cards = Array.from(animeCardsContainer.querySelectorAll('.anime-card:not([style*="display: none"])')); 

    cards.sort((a, b) => {
        try {
            // Ensure dataset.episode exists and is valid JSON
            if (!a.dataset.episode || !b.dataset.episode) return 0; 
            const episodeA = JSON.parse(a.dataset.episode);
            const episodeB = JSON.parse(b.dataset.episode);

            // Ensure dateAdded exists and is a valid date string
            if (!episodeA.dateAdded || !episodeB.dateAdded) return 0;
            const dateA = new Date(episodeA.dateAdded);
            const dateB = new Date(episodeB.dateAdded);

            if (isNaN(dateA) || isNaN(dateB)) {
                console.warn('Invalid date found during sort:', episodeA.dateAdded, episodeB.dateAdded);
                return 0; // Keep original order if dates are invalid
            }

            if (currentSortOrder === 'newest') {
                return dateB - dateA; // Descending for newest
            } else {
                return dateA - dateB; // Ascending for oldest
            }
        } catch (error) {
            console.error('Error parsing episode data during sort:', error, a.dataset.episode, b.dataset.episode);
            return 0; // Keep original order on error
        }
    });

    // Re-append sorted cards (only those that were sorted)
    cards.forEach(card => animeCardsContainer.appendChild(card));
}


function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'block';
}
function openGuideModal() {
    let modal = document.getElementById('guideModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'guideModal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Anime Saver Guide</h2>
                <p>Welcome to Anime Saver! Here's a quick guide on how to use the extension:</p>
                <ol>
                    <li>The extension automatically saves your progress when watching anime on Gogoanime.</li>
                    <li>Automatic saving occurs when you click the "Next Episode" button on Gogoanime.</li>
                    <li>For the last episode of a series on Gogoanime, right-click and select "Save to Anime Group" to save it manually.</li>
                    <li>You can also save from other registered sites like xsanime and 9anime, even if the episode number and title aren't in the URL.</li>
                    <li>The extension can save from any site that has the episode number at the end of the URL (e.g., /episode-5).</li>
                    <li>Each time you save, a .json file containing your data will be created as a backup.</li>
                    <li>This backup file can be used to restore your data if the storage is accidentally cleared.</li>
                    <li>Use the search bar to find specific anime titles.</li>
                    <li>Filter episodes using the dropdown menu:
                        <ul style="margin-left: 20px; margin-top: 10px;">
                            <li><strong>All Episodes:</strong> Shows all saved episodes.</li>
                            <li><strong>Watch Next:</strong> Filters animes with more than one episode available to watch next. This is useful for continuing series you're actively watching.</li>
                            <li><strong>New Episode:</strong> Shows animes with only one new episode available. This helps you quickly identify series with recent updates.</li>
                        </ul>
                        <p style="margin-top: 10px;">These filters help you organize your watching experience and prioritize which anime to watch next.</p>
                    </li>
                    <li>Click on an anime card to resume watching from where you left off.</li>
                    <li>Use the alphabet buttons on the left to filter anime by their first letter.</li>
                    <li>Adjust settings by clicking the gear icon in the top right corner.</li>
                    <li>On Gogoanime, right-click on an episode to see the "Check Last Episode" option, which shows the last episode you watched.</li>
                    <li>The extension checks for new episodes at regular intervals. You can also manually check by clicking the refresh button.</li>
                </ol>
                <button id="closeGuideButton">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'block';

    const closeButton = document.getElementById('closeGuideButton');
    closeButton.addEventListener('click', closeGuideModal);

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeGuideModal();
        }
    });
}

function closeGuideModal() {
    const modal = document.getElementById('guideModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

function loadSettings() {
    chrome.storage.sync.get({
        autoSave: true,
        saveNext: false,
        delayTime: 5,
        darkMode: false,
        cardSize: 'medium'
    }, function(items) {
        document.getElementById('autoSave').checked = items.autoSave;
        document.getElementById('saveNext').checked = items.saveNext;
        document.getElementById('delayTime').value = items.delayTime;
        document.getElementById('darkMode').checked = items.darkMode;
        document.getElementById('cardSize').value = items.cardSize;

        applySettings(items);
        loadAnimeGroups(); // Reload anime groups to apply new card size
    });
}
function saveSettings() {
    const settings = {
        autoSave: document.getElementById('autoSave').checked,
        delayTime: parseInt(document.getElementById('delayTime').value),
        saveNext: document.getElementById('saveNext').checked,
        darkMode: document.getElementById('darkMode').checked,
        cardSize: document.getElementById('cardSize').value
    };

    chrome.storage.sync.set(settings, function() {
        console.log('Settings saved');
        applySettings(settings);
        closeModal('settingsModal');
        
        // Force a redraw of the cards
        const animeCardsContainer = document.getElementById('animeCards');
        animeCardsContainer.style.display = 'none';
        void animeCardsContainer.offsetHeight; // Force a reflow
        animeCardsContainer.style.display = '';
    });
}

function applySettings(settings) {
    console.log('Applying settings:', settings);

    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    // Apply card size
    document.body.classList.remove('small-cards', 'medium-cards', 'large-cards');
    document.body.classList.add(`${settings.cardSize}-cards`);

    // Update existing cards
    const cards = document.querySelectorAll('.anime-card');
    cards.forEach(card => {
        card.classList.remove('small-card', 'medium-card', 'large-card');
        card.classList.add(`${settings.cardSize}-card`);
    });

    // Force a reflow to ensure styles are applied
    void document.body.offsetHeight;
}
function loadAlphabetButtons() {
    const alphabetList = document.getElementById('alphabetList');
    alphabetList.innerHTML = ''; // Clear existing buttons

    // Always include the "All" button
    const allButtonLi = document.createElement('li');
    const allButton = document.createElement('button');
    allButton.textContent = 'All';
    allButton.dataset.letter = 'All';
    allButton.classList.add('active');
    allButton.addEventListener('click', () => handleFilter('All'));
    allButtonLi.appendChild(allButton);
    alphabetList.appendChild(allButtonLi);

    // Fetch all data to determine which letters to display
    chrome.storage.sync.get(null, function(data) {
        const letters = new Set();

        // Process new format (chunked data)
        Object.keys(data).forEach(key => {
            if (key.endsWith('_info')) {
                const groupName = key.replace('_info', '');
                if (groupName.length > 0) {
                    const firstLetter = groupName.charAt(0).toUpperCase();
                    if (firstLetter.match(/[A-Z]/)) {
                        letters.add(firstLetter);
                    }
                }
            }
        });

        // Process old format (animeGroups)
        if (data.animeGroups) {
            Object.keys(data.animeGroups).forEach(groupName => {
                if (groupName.length > 0) {
                    const firstLetter = groupName.charAt(0).toUpperCase();
                    if (firstLetter.match(/[A-Z]/)) {
                        letters.add(firstLetter);
                    }
                }
            });
        }

        // Process single entries (not in animeGroups or chunks)
        Object.keys(data).forEach(key => {
            if (!key.endsWith('_info') && !key.includes('_chunk_') && key !== 'animeGroups' && Array.isArray(data[key])) {
                if (key.length > 0) {
                    const firstLetter = key.charAt(0).toUpperCase();
                    if (firstLetter.match(/[A-Z]/)) {
                        letters.add(firstLetter);
                    }
                }
            }
        });

        // Sort letters alphabetically
        const sortedLetters = Array.from(letters).sort();

        sortedLetters.forEach(letter => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = letter;
            button.dataset.letter = letter;
            button.addEventListener('click', () => handleFilter(letter));
            li.appendChild(button);
            alphabetList.appendChild(li);
        });
    });
}

function shouldDisplayEpisode(episode, filter) {
    console.log('Filter:', filter, 'Episode:', episode);
    
    // First check if it's a last episode from aniwatchtv.to
    if (episode.url && episode.url.includes('aniwatchtv.to') && episode.isLastEpisode) {
        // Last episodes should never show in watchNext or newEpisode filters
        return filter === 'all';
    }

    switch (filter) {
        case 'watchNext':
            return episode.nextEpisodeAvailable === true;
        case 'newEpisode':
            return episode.nextEpisodeAvailable === true && 
                   (!episode.episodeAfterNextAvailable || episode.episodeAfterNextAvailable === false);
        default:
            return true;
    }
}
function loadAnimeGroups(filterLetter = 'All', filter = 'all') {
    return new Promise((resolveLoadGroups) => {
        console.log('Loading anime groups with filter:', filter);
        chrome.storage.sync.get(null, function(data) {
            const animeCardsContainer = document.getElementById('animeCards');
            animeCardsContainer.innerHTML = ''; // Clear previous cards

            let cardPromises = [];

            function processGroup(groupName, episodes) {
                if (filterLetter === 'All' || groupName.charAt(0).toUpperCase() === filterLetter) {
                    episodes.forEach(episode => {
                        const cardPromise = new Promise((resolve) => {
                            const card = createCard(groupName, episode, resolve);
                            card.episode = episode; // Store the episode data on the card element
                            animeCardsContainer.appendChild(card);
                        });
                        cardPromises.push(cardPromise);
                    });
                }
            }

            // Process new format (chunked data)
            for (let key in data) {
                if (key.endsWith('_info')) {
                    const groupName = key.replace('_info', '');
                    const info = data[key];
                    let group = [];
                    for (let i = 0; i < info.chunks; i++) {
                        const chunkKey = `${groupName}_chunk_${i}`;
                        if (data[chunkKey]) {
                            group = group.concat(data[chunkKey]);
                        }
                    }
                    processGroup(groupName, group);
                }
            }

            // Process old format (animeGroups)
            if (data.animeGroups) {
                for (let groupName in data.animeGroups) {
                    processGroup(groupName, data.animeGroups[groupName]);
                }
            }

            // Process single entries (not in animeGroups or chunks)
            for (let key in data) {
                if (!key.endsWith('_info') && !key.includes('_chunk_') && key !== 'animeGroups' && Array.isArray(data[key])) {
                    processGroup(key, data[key]);
                }
            }

            // Wait for all cards to be processed before resolving
            Promise.all(cardPromises).then(() => {
                updateAnimeCount();
                sortDisplayedCards(); // Sort cards after loading/filtering
                resolveLoadGroups();
            });
        });
    });
}

function extractAnimeName(title, url) {
    let animeName = '';
    if (url && url.includes('aniwatchtv.to')) {
        const urlParts = url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        animeName = lastPart
            .split('?')[0]  // Remove query parameters
            .replace(/-\d+$/, '')  // Remove the ID number at the end
            .replace(/[0-9]/g, '')  // Remove any remaining numbers
            .replace(/-+/g, ' ')  // Replace hyphens with spaces
            .trim();  // Clean up extra spaces
        return animeName;
    }

    // First, try to extract from the URL
    if (url) {
        const urlParts = url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        // Corrected: Use lastPart to extract the name before episode info
        animeName = lastPart.replace(/-episode-\d+.*$/i, '').trim(); 
        if (animeName) {
             // Return the potentially hyphenated name extracted from URL
            return animeName;
        }
    }

    // If URL extraction fails, try to extract from the title
    if (title) {
        // Remove episode number and common prefixes/suffixes
        let cleanTitle = title.replace(/\s*Episode\s*\d+/i, '')
                              .replace(/\s*\(\d+\)$/, '')
                              .trim();
        // Replace spaces and other non-alphanumeric characters with hyphens
        animeName = cleanTitle.toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }

    return animeName || 'unknown-anime';
}

function generateEpisodeUrl(baseUrl, episodeNumber) {
        // Special handling for aniwatchtv.to URLs
        if (baseUrl.includes('aniwatchtv.to')) {
            // Extract the base anime URL without the episode parameter
            const baseAnimeUrl = baseUrl.split('?')[0];
            
            // For aniwatchtv.to, we can't predict the episode ID parameter
            // So we'll return a special URL format that our availability checker will recognize
            return `${baseAnimeUrl}?ep=next&epnum=${episodeNumber}`;
        }
    const encodedArabic = '%d8%ad%d9%84%d9%82%d8%a9';
    if (baseUrl.includes(encodedArabic)) {
        // Handle URL-encoded Arabic format
        return baseUrl.replace(
            new RegExp(`${encodedArabic}-\\d+`),
            `${encodedArabic}-${episodeNumber}`
        );
    } else if (baseUrl.includes('حلقة')) {
        // Handle non-encoded Arabic format
        return baseUrl.replace(
            /حلقة-\d+/,
            `حلقة-${episodeNumber}`
        );
    } else {
        // Handle English format
        return baseUrl.replace(
            /episode-\d+/,
            `episode-${episodeNumber}`
        );
    }
}

// Make resolveCard optional
function createCard(groupName, episode, resolveCard = null) { 
    
    const card = document.createElement('div');
    card.classList.add('anime-card');
    card.dataset.episode = JSON.stringify(episode);

    // Get the current card size from body class
    const cardSize = document.body.classList.contains('small-cards') ? 'small' :
                     document.body.classList.contains('large-cards') ? 'large' : 'medium';
    card.classList.add(`${cardSize}-card`);

    // Extract anime name from the episode title or URL
    let animeName;
    if (episode.url.includes('aniwatchtv.to')) {
        // For aniwatchtv.to, use the group name directly
        animeName = groupName.replace(/-/g, ' ').trim();
    } else {
        animeName = extractAnimeName(episode.title, episode.url);
    }
// Create cover image
const coverImage = document.createElement('img');

// Use the stored image URL if available, otherwise fall back to the generated URL
coverImage.dataset.src = episode.coverImageUrl || `https://gogocdn.net/cover/${animeName}.png`;
coverImage.alt = animeName;
coverImage.classList.add('anime-card-image');
coverImage.onerror = function() {
    // If the stored image URL fails, try the fallback
    if (episode.coverImageUrl && this.src !== `https://gogocdn.net/cover/${animeName}.png`) {
        console.log(`Stored image failed for: ${animeName}, trying fallback`);
        this.src = `https://gogocdn.net/cover/${animeName}.png`;
    } else {
        // If all fails, use a transparent placeholder
        this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        this.alt = 'Placeholder';
        console.log(`Failed to load any image for: ${animeName}`);
    }
};
    card.appendChild(coverImage);
  // Implement lazy loading
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            observer.unobserve(img);
        }
    });
}, { rootMargin: '0px 0px 50px 0px' });

observer.observe(coverImage);

    const cardContent = document.createElement('div');
    cardContent.classList.add('anime-card-content');
    card.appendChild(cardContent);

    const title = document.createElement('h3');
    title.textContent = animeName;
    cardContent.appendChild(title);

    const episodeInfo = document.createElement('p');
    episodeInfo.textContent = `Episode ${episode.episode}`;
    cardContent.appendChild(episodeInfo);

    const dateLabel = document.createElement('span');
    dateLabel.classList.add('date-label');
    dateLabel.textContent = formatTimeAgo(episode.dateAdded);
    dateLabel.title = 'Click to see exact date';
    dateLabel.style.cursor = 'pointer';
    dateLabel.addEventListener('click', () => showExactDate(episode.dateAdded));
    cardContent.appendChild(dateLabel);

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button');
    deleteButton.textContent = '×';
    deleteButton.title = 'Delete';
    deleteButton.addEventListener('click', () => deleteAnimeGroup(groupName, episode));
    card.appendChild(deleteButton);

    // Add progress bar
    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-bar');
    const progressFill = document.createElement('div');
    progressFill.classList.add('progress-bar-fill');
    progressFill.style.width = `${episode.progress || 0}%`;
    progressBar.appendChild(progressFill);
    cardContent.appendChild(progressBar);

    const episodeLinks = document.createElement('div');
    episodeLinks.classList.add('episode-links');

    // Function to generate episode URL

    // Add link to previous episode
    const prevEpisodeNumber = parseInt(episode.episode) - 1;
    if (prevEpisodeNumber > 0) {
        let prevEpisodeUrl;
    
        // Special handling for aniwatchtv.to URLs
        if (episode.url.includes('aniwatchtv.to')) {
            const baseAnimeUrl = episode.url.split('?')[0]; 
            prevEpisodeUrl = `${baseAnimeUrl}?epnum=${prevEpisodeNumber}`;
        } else {
            prevEpisodeUrl = generateEpisodeUrl(episode.url, prevEpisodeNumber);
        }
        const prevEpisodeLink = document.createElement('a');
        prevEpisodeLink.href = prevEpisodeUrl;
        prevEpisodeLink.textContent = 'Previous';
        prevEpisodeLink.title = 'Previous Episode';
        prevEpisodeLink.target = '_blank';
        prevEpisodeLink.classList.add('prev-episode-link');
        episodeLinks.appendChild(prevEpisodeLink);
    }

    // Add link to watch current episode
    const watchLink = document.createElement('a');
    watchLink.href = episode.url;
    watchLink.textContent = 'Watch';
    watchLink.title = 'Watch Current Episode';
    watchLink.target = '_blank';
    watchLink.classList.add('watch-link');
    episodeLinks.appendChild(watchLink);

    // Add placeholder for next episode link
    const nextPlaceholder = document.createElement('span');
    episodeLinks.appendChild(nextPlaceholder);

    cardContent.appendChild(episodeLinks);

    const img = card.querySelector('img');
    if (img) {
        img.style.width = '100%';
        img.style.height = 'auto';
    }

    // Get the current filter value
    const currentFilter = document.querySelector('.filter-button.active')?.dataset.filter || 'all';
    updateCardVisibility(card, episode, currentFilter);

    // Check if next episode and episode after next are available
    const nextEpisodeNumber = parseInt(episode.episode) + 1;
    const episodeAfterNextNumber = nextEpisodeNumber + 1;
    let nextEpisodeUrl, episodeAfterNextUrl;

    // Special handling for aniwatchtv.to URLs
    if (episode.url.includes('aniwatchtv.to')) {
          // Don't create next episode link if this is marked as the last episode
          if (episode.isLastEpisode) {
            resolveCard();
            return card;
        }
        const baseAnimeUrl = episode.url.split('?')[0];
        nextEpisodeUrl = `${baseAnimeUrl}?epnum=${nextEpisodeNumber}`;
        episodeAfterNextUrl = `${baseAnimeUrl}?epnum=${episodeAfterNextNumber}`;
    } else {
        nextEpisodeUrl = generateEpisodeUrl(episode.url, nextEpisodeNumber);
        episodeAfterNextUrl = generateEpisodeUrl(episode.url, episodeAfterNextNumber);
    }
    const availabilityKey = `nextEpisodeAvailable_${groupName}_${episode.episode}`;
    const afterNextAvailabilityKey = `episodeAfterNextAvailable_${groupName}_${episode.episode}`;

    chrome.storage.local.get([availabilityKey, afterNextAvailabilityKey], (result) => {
        const { isAvailable: nextIsAvailable, lastChecked: nextLastChecked } = result[availabilityKey] || {};
        const { isAvailable: afterNextIsAvailable, lastChecked: afterNextLastChecked } = result[afterNextAvailabilityKey] || {};

        if (nextIsAvailable === undefined || afterNextIsAvailable === undefined || 
            shouldUpdateAvailability(nextLastChecked) || shouldUpdateAvailability(afterNextLastChecked)) {
            checkEpisodeAvailability(nextEpisodeUrl, (isNextAvailable) => {
                checkEpisodeAvailability(episodeAfterNextUrl, (isAfterNextAvailable) => {
                    chrome.storage.local.set({
                        [availabilityKey]: { isAvailable: isNextAvailable, lastChecked: Date.now() },
                        [afterNextAvailabilityKey]: { isAvailable: isAfterNextAvailable, lastChecked: Date.now() }
                    });

                    updateNextEpisodeLink(isNextAvailable, nextEpisodeUrl, nextPlaceholder);
                    // Update the episode object with availability info
                    const updatedEpisode = { 
                        ...episode, 
                        nextEpisodeAvailable: isNextAvailable,
                        episodeAfterNextAvailable: isAfterNextAvailable
                    };
                    
                    // Update the card's dataset with the updated episode
                    card.dataset.episode = JSON.stringify(updatedEpisode);
                    updateCardVisibility(card, updatedEpisode, currentFilter);
                    // Only call resolveCard if it's a function
                    if (typeof resolveCard === 'function') {
                        resolveCard();
                    }
                });
            });
        } else {
            updateNextEpisodeLink(nextIsAvailable, nextEpisodeUrl, nextPlaceholder);
            // Update the episode object with availability info
            const updatedEpisode = { 
                ...episode, 
                nextEpisodeAvailable: nextIsAvailable,
                episodeAfterNextAvailable: afterNextIsAvailable
            };
            
            // Update the card's dataset with the updated episode
            card.dataset.episode = JSON.stringify(updatedEpisode);
            updateCardVisibility(card, updatedEpisode, currentFilter);
            // Only call resolveCard if it's a function
            if (typeof resolveCard === 'function') {
                resolveCard();
            }
        }
    });

  

    return card;
}

function updateCardVisibility(card, episode, currentFilter) {
    if (shouldDisplayEpisode(episode, currentFilter)) {
        card.style.display = '';
    } else {
        card.style.display = 'none';
    }
}

function updateAnimeCount() {
    // Get counts for each filter type
    const allCount = document.querySelectorAll('.anime-card').length;
    
    // Get watch next count
    const watchNextCount = Array.from(document.querySelectorAll('.anime-card')).filter(card => {
        if (!card.dataset.episode) return false;
        try {
            const episode = JSON.parse(card.dataset.episode);
            return shouldDisplayEpisode(episode, 'watchNext');
        } catch (error) {
            console.error('Error parsing episode data:', error, card.dataset.episode);
            return false;
        }
    }).length;
    
    // Get new episode count
    const newEpisodeCount = Array.from(document.querySelectorAll('.anime-card')).filter(card => {
        if (!card.dataset.episode) return false;
        try {
            const episode = JSON.parse(card.dataset.episode);
            return shouldDisplayEpisode(episode, 'newEpisode');
        } catch (error) {
            console.error('Error parsing episode data:', error, card.dataset.episode);
            return false;
        }
    }).length;
    
    // Update badges
    document.querySelector('#filterAll .count-badge').textContent = allCount;
    document.querySelector('#filterWatchNext .count-badge').textContent = watchNextCount;
    document.querySelector('#filterNewEpisode .count-badge').textContent = newEpisodeCount;
}

function applyFilter() {
    const filterValue = document.querySelector('.filter-button.active').dataset.filter;
    const currentLetter = document.querySelector('#alphabetList button.active').dataset.letter;
    console.log('Applying filter:', filterValue);
    
    loadAnimeGroups(currentLetter, filterValue).then(() => {
        updateAnimeCount();
    });
}


function updateNextEpisodeLink(isAvailable, nextEpisodeUrl, placeholder) {
      // Get the card and episode data
      const card = placeholder.closest('.anime-card');
      if (!card) return;
  
      let episodeData;
      try {
          episodeData = JSON.parse(card.dataset.episode);
      } catch (error) {
          console.error('Error parsing episode data:', error);
          return;
      }
        // Don't create next episode link if we're on aniwatchtv.to and it's the last episode
        if (nextEpisodeUrl.includes('aniwatchtv.to')) {
            isAvailable = episodeData.nextEpisodeAvailable;
            console.log('AniWatchTV next episode availability:', isAvailable);
        }
    
    if (isAvailable && !episodeData.isLastEpisode) {
        const nextEpisodeLink = document.createElement('a');
        nextEpisodeLink.href = nextEpisodeUrl;
        nextEpisodeLink.textContent = 'Next';
        nextEpisodeLink.title = 'Next Episode';
        nextEpisodeLink.target = '_blank';
        nextEpisodeLink.classList.add('next-episode-link');
        placeholder.replaceWith(nextEpisodeLink);
    }
}

function deleteAnimeGroup(groupName, episodeToDelete) {
    if (confirm(`Are you sure you want to delete this episode from ${groupName}?`)) {
        chrome.storage.sync.get(null, (data) => {
            let group = [];
            let isChunked = false;
            const chunkKey = `${groupName}_chunk_0`;

            if (data[`${groupName}_info`]) {
                isChunked = true;
                group = data[chunkKey] || [];
            } else if (data.animeGroups && data.animeGroups[groupName]) {
                group = data.animeGroups[groupName];
            } else if (Array.isArray(data[groupName])) {
                group = data[groupName];
            }

            if (group.length > 0) {
                // Remove the episode
                group = group.filter(ep => ep.episode !== episodeToDelete.episode);

                if (group.length === 0) {
                    // If the group is empty after deletion, remove it entirely
                    if (isChunked) {
                        chrome.storage.sync.remove([chunkKey, `${groupName}_info`], () => {
                            console.log(`Removed empty group: ${groupName}`);
                            loadAnimeGroups();
                        });
                    } else if (data.animeGroups) {
                        delete data.animeGroups[groupName];
                        chrome.storage.sync.set({ animeGroups: data.animeGroups }, () => {
                            console.log(`Removed empty group: ${groupName}`);
                            loadAnimeGroups();
                        });
                    } else {
                        chrome.storage.sync.remove(groupName, () => {
                            console.log(`Removed empty group: ${groupName}`);
                            loadAnimeGroups();
                        });
                    }
                } else {
                    // If the group still has episodes, update it
                    if (isChunked) {
                        chrome.storage.sync.set({ [chunkKey]: group, [`${groupName}_info`]: { chunks: 1 } }, () => {
                            console.log(`Updated group: ${groupName}`);
                            loadAnimeGroups();
                        });
                    } else if (data.animeGroups) {
                        data.animeGroups[groupName] = group;
                        chrome.storage.sync.set({ animeGroups: data.animeGroups }, () => {
                            console.log(`Updated group: ${groupName}`);
                            loadAnimeGroups();
                        });
                    } else {
                        chrome.storage.sync.set({ [groupName]: group }, () => {
                            console.log(`Updated group: ${groupName}`);
                            loadAnimeGroups();
                        });
                    }
                }
            } else {
                console.log('Group not found or empty');
            }
        });
    }
}

function showExactDate(dateString) {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleString(); // This will format the date and time according to the user's locale
    alert(`Exact date added: ${formattedDate}`);
}

function formatTimeAgo(dateString) {
    // First, check if dateString is valid and not null/undefined
    if (!dateString) {
        console.warn('Missing date string for formatting time ago.');
        return 'Unknown date';
    }
    const past = new Date(dateString);
    if (isNaN(past.getTime())) {
        console.error('Invalid date string provided:', dateString);
        return 'Invalid date';
    }

    const now = new Date();
    
    // Check if the date is in the future (can happen with system clock issues or bad data)
    if (past > now) {
        // Adjust the year to the current year
        past.setFullYear(now.getFullYear());
    }

    const diffMs = now - past;
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 30) return `${diffDays} days ago`;

    // If it's more than a month, return the actual date
    return past.toLocaleDateString();
}

function handleFilter(letter) {
    // Remove 'active' class from all buttons
    document.querySelectorAll('#alphabetList button').forEach(btn => btn.classList.remove('active'));

    // Add 'active' class to clicked button
    document.querySelector(`#alphabetList button[data-letter="${letter}"]`).classList.add('active');

    // Get the current filter from active filter button
    const currentFilter = document.querySelector('.filter-button.active').dataset.filter;
    
    loadAnimeGroups(letter, currentFilter).then(() => {
        updateAnimeCount();
    });
}

function refreshAnimeData() {
    document.querySelector('.loading-overlay').classList.add('active');
        chrome.storage.sync.get(null, function(data) {
        let refreshPromises = [];

        function processGroup(groupName, episodes) {
            episodes.forEach(episode => {
                const nextEpisodeNumber = parseInt(episode.episode) + 1;
                const episodeAfterNextNumber = nextEpisodeNumber + 1;
                const nextEpisodeUrl = generateEpisodeUrl(episode.url, nextEpisodeNumber);
                const episodeAfterNextUrl = generateEpisodeUrl(episode.url, episodeAfterNextNumber);
                const availabilityKey = `nextEpisodeAvailable_${groupName}_${episode.episode}`;
                const afterNextAvailabilityKey = `episodeAfterNextAvailable_${groupName}_${episode.episode}`;

                const promise = new Promise((resolve) => {
                    checkEpisodeAvailability(nextEpisodeUrl, (isNextAvailable) => {
                        checkEpisodeAvailability(episodeAfterNextUrl, (isAfterNextAvailable) => {
                            chrome.storage.local.set({
                                [availabilityKey]: { isAvailable: isNextAvailable, lastChecked: Date.now() },
                                [afterNextAvailabilityKey]: { isAvailable: isAfterNextAvailable, lastChecked: Date.now() }
                            }, resolve);
                        });
                    });
                });

                refreshPromises.push(promise);
            });
        }


        // Process new format (chunked data)
        for (let key in data) {
            if (key.endsWith('_info')) {
                const groupName = key.replace('_info', '');
                const info = data[key];
                let group = [];
                for (let i = 0; i < info.chunks; i++) {
                    const chunkKey = `${groupName}_chunk_${i}`;
                    if (data[chunkKey]) {
                        group = group.concat(data[chunkKey]);
                    }
                }
                processGroup(groupName, group);
            }
        }
        // Process old format (animeGroups)
        if (data.animeGroups) {
            for (let groupName in data.animeGroups) {
                processGroup(groupName, data.animeGroups[groupName]);
            }
        }
        // Process single entries (not in animeGroups or chunks)
        for (let key in data) {
            if (!key.endsWith('_info') && !key.includes('_chunk_') && key !== 'animeGroups' && Array.isArray(data[key])) {
                processGroup(key, data[key]);
            }
        }
        Promise.all(refreshPromises).then(() => {
            console.log('All next episode availabilities have been checked and updated.');
            const currentFilter = document.querySelector('.filter-button.active').dataset.filter;
            const currentLetter = document.querySelector('#alphabetList button.active').dataset.letter;
            loadAnimeGroups(currentLetter, currentFilter).then(() => {
                updateAnimeCount();
                document.querySelector('.loading-overlay').classList.remove('active');
            });
        });
    });
}

function shouldUpdateAvailability(lastChecked) {
    if (!lastChecked) {
        return true;
    }

    const sixHoursInMs = 6 * 60 * 60 * 1000;
    return (Date.now() - lastChecked) > sixHoursInMs;
}

function splitIntoChunks(array, chunkSize = 100) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

function checkEpisodeAvailability(url, callback) {
    // Use full GET request instead of HEAD to detect redirects
    if (url.includes('aniwatchtv.to')) {
        callback(false);
        return;
    }
    fetch(url, { 
        method: 'GET',
        redirect: 'follow' // Explicitly follow redirects
    })
    .then(response => {
        if (!response.ok) {
            callback(false);
            return;
        }
        
        // Check if we were redirected to a different path
        const responseUrl = new URL(response.url);
        const originalUrl = new URL(url);
        
        // Consider episode available only if:
        // 1. Response is OK (200-299)
        // 2. We're still on the same path or a valid episode path
        // 3. Not redirected to home page, root or error page
        const isValidPath = responseUrl.pathname.includes('-episode-') || 
                           responseUrl.pathname.includes('حلقة-');
        const isSamePath = responseUrl.pathname === originalUrl.pathname;
        const isHomePage = responseUrl.pathname === '/' || 
                          responseUrl.pathname === '/index.html' ||
                          responseUrl.pathname.endsWith('/404') ||
                          responseUrl.pathname.endsWith('/error');
        
        const isAvailable = response.ok && (isSamePath || isValidPath) && !isHomePage;
        
        // For debugging
        console.log('Episode availability check:', {
            originalUrl: url,
            finalUrl: response.url,
            redirected: response.redirected,
            isValidPath,
            isSamePath,
            isHomePage,
            isAvailable
        });
        
        callback(isAvailable);
    })
    .catch((error) => {
        console.error('Error checking episode availability:', error);
        callback(false);
    });
}

// Helper function to normalize names for searching (remove hyphens, collapse spaces)
function normalizeSearchString(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

function handleSearch() {
    // Normalize the search term itself
    const rawSearchTerm = document.getElementById('searchInput').value;
    const normalizedSearchTerm = normalizeSearchString(rawSearchTerm); 
    
    chrome.storage.sync.get(null, function(data) {
        const animeCardsContainer = document.getElementById('animeCards');
        animeCardsContainer.innerHTML = ''; // Clear previous cards
        let count = 0;

        // This function processes a single group of episodes for search matches
        function findMatchesInGroup(groupName, episodes) {
            episodes.forEach(episode => {
                // Normalize potential sources of the anime name from the stored data
                const normalizedGroupName = normalizeSearchString(groupName);
                const normalizedEpisodeTitle = normalizeSearchString(episode.title);
                
                // Derive the name like createCard does, then normalize it
                const extractedNameForSearch = extractAnimeName(episode.title, episode.url);
                const normalizedExtractedName = normalizeSearchString(extractedNameForSearch);

                // Compare normalized search term against all normalized sources
                if (normalizedSearchTerm && 
                    (normalizedGroupName.includes(normalizedSearchTerm) || 
                     normalizedEpisodeTitle.includes(normalizedSearchTerm) ||
                     normalizedExtractedName.includes(normalizedSearchTerm))) 
                {
                    // Match found, create the card
                    const card = createCard(groupName, episode); 
                    animeCardsContainer.appendChild(card);
                    count++;
                }
            }); 
        } 

        let processedKeys = new Set(); // Keep track of keys processed via chunks or animeGroups

        // Process new format (chunked data)
        for (let key in data) {
            if (key.endsWith('_info')) {
                const groupName = key.replace('_info', '');
                processedKeys.add(groupName); // Mark group as processed (even if empty)
                const info = data[key];
                let groupEpisodes = [];
                for (let i = 0; i < info.chunks; i++) {
                    const chunkKey = `${groupName}_chunk_${i}`;
                    if (data[chunkKey]) {
                        groupEpisodes = groupEpisodes.concat(data[chunkKey]);
                        processedKeys.add(chunkKey); // Mark chunk as processed
                    }
                }
                processedKeys.add(key); // Mark info key as processed
                if (groupEpisodes.length > 0) { // Only process if episodes were found
                   findMatchesInGroup(groupName, groupEpisodes); 
                }
            }
        }

        // Process old format (animeGroups)
        if (data.animeGroups) {
            processedKeys.add('animeGroups'); // Mark animeGroups key itself as processed
            for (let groupName in data.animeGroups) {
                 if (!processedKeys.has(groupName)) { // Avoid re-processing if already handled by chunk logic
                    findMatchesInGroup(groupName, data.animeGroups[groupName]);
                    processedKeys.add(groupName); // Mark this specific groupName as processed
                 }
            }
        }

        // Process remaining single entries (ensure they weren't part of chunks/animeGroups)
        for (let key in data) {
            // Check if it's an array, not processed yet, and not a settings/internal key
            if (Array.isArray(data[key]) && 
                !processedKeys.has(key) && 
                !key.endsWith('_info') && 
                !key.includes('_chunk_') && 
                !['autoSave', 'saveNext', 'delayTime', 'darkMode', 'cardSize', 'animeGroups'].includes(key)) 
            {
                findMatchesInGroup(key, data[key]);
                // No need to add to processedKeys here as we iterate all remaining keys once
            }
        }

        // Update anime count display (using the count variable)
        // Note: updateAnimeCount() might recount based on DOM, which is fine after cards are added.
        updateAnimeCount(); 
        if (count === 0 && normalizedSearchTerm) { // Show message only if a search was performed
            const message = document.createElement('p');
            message.textContent = 'No anime episodes found matching your search.';
            message.style.textAlign = 'center';
            message.style.marginTop = '20px';
            animeCardsContainer.appendChild(message);
        } else if (count === 0 && !normalizedSearchTerm) {
             // If search is empty and still no cards, maybe show a generic empty message?
             // Or rely on loadAnimeGroups to handle the initial empty state. Let's keep it simple for now.
        }
        
        sortDisplayedCards(); // Sort the displayed search results
    }); // Close chrome.storage.sync.get callback
}

document.getElementById('clearStorage').addEventListener('click', () => {
    if (confirm('Warning: This will clear all anime data. Proceed?')) {
        chrome.runtime.sendMessage({action: 'clearStorage'}, (response) => {
            if (response && response.success) {
            console.log('Storage cleared successfully');
            // Optionally, refresh the popup UI here
            loadAnimeGroups();
        } else {
            console.error('Failed to clear storage');
            }
        });
    }
});
