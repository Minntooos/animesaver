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
    const historyButton = document.getElementById('historyButton'); // Added history button ref
    const historyModal = document.getElementById('historyModal'); // Added history modal ref
    const closeHistoryButton = document.getElementById('closeHistoryButton'); // Added history close button ref

    guideButton.addEventListener('click', openGuideModal);
    historyButton.addEventListener('click', openHistoryModal); // Added listener for history button
    closeHistoryButton.addEventListener('click', () => closeModal('historyModal')); // Added listener for history close button

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
        // Also close history modal on outside click
        if (event.target === historyModal) {
            closeModal('historyModal');
        }
    });
    const closeButton = document.getElementById('close-button'); // Settings modal close button
    closeButton.addEventListener('click', () => {
        closeModal('settingsModal');
    }); 


    saveSettingsButton.addEventListener('click', saveSettings);

    // Load saved settings and data
    loadSettings(); // This calls loadAnimeGroups indirectly after applying settings
    loadAlphabetButtons();
    // Initial load is handled by loadSettings -> applySettings -> loadAnimeGroups
    // loadAnimeGroups is called within loadSettings -> applySettings
    // Set initial active sort button after initial load completes (moved inside loadAnimeGroups or called after it finishes)
    // Removed the problematic .then() call here as loadAnimeGroups no longer returns a Promise
    // The necessary updates (updateAnimeCount, sortDisplayedCards) are called at the end of loadAnimeGroups.
    // We still need to set the default active sort button after the initial load.
    // Let's ensure loadSettings triggers the load and then we set the button.
    // The loadSettings -> applySettings -> loadAnimeGroups chain handles the initial load.
    // We can set the default sort button after loadSettings completes.
    chrome.storage.sync.get(['cardSize'], function(items) { // Assuming loadSettings finished
        // This might run too early. A better approach might be needed if timing is an issue.
        // For now, let's assume loadAnimeGroups called by loadSettings finishes before this.
         if (!document.querySelector('.sort-button.active')) { // Only set if no button is active yet
            document.getElementById('sortNewest').classList.add('active');
         }
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
    const currentLetter = document.querySelector('#alphabetList button.active')?.dataset.letter || 'All'; // Added fallback
    // Removed date filter preservation
    loadAnimeGroups(currentLetter, filterValue);
    // updateAnimeCount and sortDisplayedCards are called within loadAnimeGroups now
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
// Modified loadAnimeGroups: Removed Promise structure as it's not strictly needed here
// and was causing issues with the resolveCard parameter in createCard.
// Removed startDate and endDate parameters
function loadAnimeGroups(filterLetter = 'All', filter = 'all') {
    console.log('Loading anime groups with filter:', filter, 'letter:', filterLetter);
    chrome.storage.sync.get(null, function(data) {
        const animeCardsContainer = document.getElementById('animeCards');
        animeCardsContainer.innerHTML = ''; // Clear previous cards

        // Corrected processGroup function definition placement
        function processGroup(groupName, episodes) {
            if (filterLetter === 'All' || groupName.charAt(0).toUpperCase() === filterLetter) {
                episodes.forEach(episode => {
                    // Removed Date Filtering Logic

                    // Create card (no date filter check needed here)
                    const card = createCard(groupName, episode);
                    if (card) {
                        card.episode = episode;
                        animeCardsContainer.appendChild(card);
                        // Apply status filter visibility *after* creating the card
                        updateCardVisibility(card, episode, filter);
                    }
                }); // End forEach
            } // End if
        } // End processGroup function

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
        // } <-- Removed extra closing brace from previous incorrect edit

        // After processing all groups, update count and sort
        updateAnimeCount();
        sortDisplayedCards(); // Sort cards after loading/filtering
        // Removed resolveLoadGroups() call
        // Note: updateAnimeCount and sortDisplayedCards are called *after* iterating through all data
    });
    // Removed outer Promise return
}

// Function to open and populate the history modal
function openHistoryModal() {
    const historyEntriesContainer = document.getElementById('historyEntries');
    historyEntriesContainer.innerHTML = '<p>Loading history...</p>'; // Show loading message

    chrome.storage.sync.get(null, function(data) {
        let allEpisodes = [];

        // Consolidate episodes from all formats (similar to handleSearch consolidation)
        const processedChunkGroups = new Set();
        const settingKeys = new Set(['autoSave', 'saveNext', 'delayTime', 'darkMode', 'cardSize', 'activeFilter', 'animeGroups']);

        for (const key in data) {
            if (key.endsWith('_info')) {
                const groupName = key.replace('_info', '');
                if (settingKeys.has(groupName)) continue;
                processedChunkGroups.add(groupName);
                const info = data[key];
                if (info && typeof info.chunks === 'number') {
                    for (let i = 0; i < info.chunks; i++) {
                        const chunkKey = `${groupName}_chunk_${i}`;
                        if (data[chunkKey] && Array.isArray(data[chunkKey])) {
                            // Add groupName to each episode for context
                            data[chunkKey].forEach(ep => ep.groupName = groupName);
                            allEpisodes = allEpisodes.concat(data[chunkKey]);
                        }
                    }
                }
            }
        }

        if (data.animeGroups && typeof data.animeGroups === 'object') {
            for (const groupName in data.animeGroups) {
                if (!processedChunkGroups.has(groupName) && Array.isArray(data.animeGroups[groupName])) {
                    data.animeGroups[groupName].forEach(ep => ep.groupName = groupName);
                    allEpisodes = allEpisodes.concat(data.animeGroups[groupName]);
                }
            }
        }

        for (const key in data) {
            if (settingKeys.has(key) || key.endsWith('_info') || key.includes('_chunk_') || processedChunkGroups.has(key) || key === 'animeGroups') {
                continue;
            }
            if (Array.isArray(data[key]) && data[key].length > 0) {
                 // Check if these episodes were already added via another format (less likely now but safe)
                 const groupName = key;
                 const episodesToAdd = data[key].filter(ep => !allEpisodes.some(existingEp => existingEp.url === ep.url));
                 episodesToAdd.forEach(ep => ep.groupName = groupName);
                 allEpisodes = allEpisodes.concat(episodesToAdd);
            }
        }

        // Filter out any invalid entries and sort by dateAdded (newest first)
        allEpisodes = allEpisodes.filter(ep => ep && ep.dateAdded && ep.title); // Ensure essential fields exist
        allEpisodes.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

        // Populate the modal
        historyEntriesContainer.innerHTML = ''; // Clear loading message
        if (allEpisodes.length === 0) {
            historyEntriesContainer.innerHTML = '<p>No history found.</p>';
        } else {
            allEpisodes.forEach(episode => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('history-entry');

                const titleSpan = document.createElement('span');
                titleSpan.classList.add('title');
                // Attempt to display a cleaner title if possible
                let displayTitle = episode.title.includes(`Episode ${episode.episode}`)
                                   ? episode.title
                                   : `${extractAnimeName(episode.title, episode.url).replace(/-/g, ' ')} Episode ${episode.episode}`;
                titleSpan.textContent = displayTitle;
                titleSpan.title = episode.title; // Show full title on hover

                const dateSpan = document.createElement('span');
                dateSpan.classList.add('date');
                // Format date nicely
                try {
                   dateSpan.textContent = new Date(episode.dateAdded).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                } catch (e) {
                   dateSpan.textContent = 'Invalid Date';
                }


                entryDiv.appendChild(titleSpan);
                entryDiv.appendChild(dateSpan);
                historyEntriesContainer.appendChild(entryDiv);
            });
        }

        // Display the modal
        historyModal.style.display = 'block';
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

// Modified createCard: Removed resolveCard parameter entirely
function createCard(groupName, episode) { 
    
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
            // Removed resolveCard() call
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
                    // Removed resolveCard() call
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
             // Removed resolveCard() call
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
    // Removed date filter preservation
    
    // Load groups with letter and status filters
    loadAnimeGroups(letter, currentFilter);
     // updateAnimeCount and sortDisplayedCards are called within loadAnimeGroups now
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
    // Enhanced: Also remove colons and handle smart quotes explicitly
    return str.toLowerCase()
              .replace(/['’]/g, '') // Remove apostrophes (both types)
              .replace(/[",.“”:]/g, '') // Remove quotes, periods/commas, colons, smart quotes
              .replace(/-/g, ' ')      // Replace hyphens with spaces
              .replace(/\s+/g, ' ')   // Collapse multiple spaces
              .trim();
}

function handleSearch() {
    const rawSearchTerm = document.getElementById('searchInput').value;
    const normalizedSearchTerm = normalizeSearchString(rawSearchTerm);
    const animeCardsContainer = document.getElementById('animeCards');
    animeCardsContainer.innerHTML = ''; // Clear previous cards

    chrome.storage.sync.get(null, function(data) {
        const animeData = {}; // Store episodes keyed by normalized group name
        const settingKeys = new Set(['autoSave', 'saveNext', 'delayTime', 'darkMode', 'cardSize', 'activeFilter', 'animeGroups']); // Add any other non-anime keys

        // --- Step 1: Consolidate all anime data ---
        const processedChunkGroups = new Set(); // Track original group names handled by _info/_chunk logic

        for (const key in data) {
            if (key.endsWith('_info')) {
                const groupName = key.replace('_info', '');
                // Skip if groupName itself is a setting key (unlikely but safe)
                if (settingKeys.has(groupName)) continue;

                const normalizedGroupName = normalizeSearchString(groupName);
                processedChunkGroups.add(groupName); // Mark original group name as handled by chunk logic

                const info = data[key];
                let groupEpisodes = [];
                // Ensure info and info.chunks are valid before looping
                if (info && typeof info.chunks === 'number') {
                    for (let i = 0; i < info.chunks; i++) {
                        const chunkKey = `${groupName}_chunk_${i}`;
                        if (data[chunkKey] && Array.isArray(data[chunkKey])) {
                            groupEpisodes = groupEpisodes.concat(data[chunkKey]);
                        }
                    }
                }

                if (groupEpisodes.length > 0) {
                    if (!animeData[normalizedGroupName]) {
                        animeData[normalizedGroupName] = { episodes: [], originalNames: new Set() };
                    }
                    // Add episodes, ensuring they have minimum required fields (like url, title, episode)
                    const validEpisodes = groupEpisodes.filter(ep => ep && ep.url && ep.title && ep.episode);
                    animeData[normalizedGroupName].episodes.push(...validEpisodes);
                    animeData[normalizedGroupName].originalNames.add(groupName);
                }
            }
        }

        // Process old format (animeGroups) - add to consolidated data
        if (data.animeGroups && typeof data.animeGroups === 'object') {
            for (const groupName in data.animeGroups) {
                // Avoid adding if already processed via chunks or if it's not an array
                if (!processedChunkGroups.has(groupName) && Array.isArray(data.animeGroups[groupName])) {
                     const normalizedGroupName = normalizeSearchString(groupName);
                     if (!animeData[normalizedGroupName]) {
                         animeData[normalizedGroupName] = { episodes: [], originalNames: new Set() };
                     }
                     const validEpisodes = data.animeGroups[groupName].filter(ep => ep && ep.url && ep.title && ep.episode);
                     animeData[normalizedGroupName].episodes.push(...validEpisodes);
                     animeData[normalizedGroupName].originalNames.add(groupName);
                }
            }
        }

        // Process remaining keys as potential single entries
        for (const key in data) {
            // Skip if it's a setting, an info/chunk key, handled by chunk logic, or the animeGroups container itself
            if (settingKeys.has(key) || key.endsWith('_info') || key.includes('_chunk_') || processedChunkGroups.has(key) || key === 'animeGroups') {
                continue;
            }

            // Check if it's a non-empty array (potential anime group)
            if (Array.isArray(data[key]) && data[key].length > 0) {
                const groupName = key;
                const normalizedGroupName = normalizeSearchString(groupName);

                 // If this normalized name wasn't added by chunks/animeGroups, add its episodes
                 if (!animeData[normalizedGroupName]) {
                     animeData[normalizedGroupName] = { episodes: [], originalNames: new Set() };
                     const validEpisodes = data[key].filter(ep => ep && ep.url && ep.title && ep.episode);
                     animeData[normalizedGroupName].episodes.push(...validEpisodes);
                     animeData[normalizedGroupName].originalNames.add(groupName);
                 } else {
                     // If normalized name exists, check if this specific original key name was already added
                     // This prevents adding the same data twice if e.g. "anime-x" (chunk) and "anime-x" (single) exist
                     if (!animeData[normalizedGroupName].originalNames.has(groupName)) {
                         const validEpisodes = data[key].filter(ep => ep && ep.url && ep.title && ep.episode);
                         animeData[normalizedGroupName].episodes.push(...validEpisodes);
                         animeData[normalizedGroupName].originalNames.add(groupName);
                     }
                 }
            }
        }

        // --- Step 2: Search through consolidated data ---
        let count = 0;
        for (const normalizedGroupName in animeData) {
            const groupData = animeData[normalizedGroupName];
            // Deduplicate episodes within the group based on URL or title+episode as a fallback
            const uniqueEpisodes = [];
            const seenKeys = new Set();
            groupData.episodes.forEach(episode => {
                const key = episode.url || `${episode.title}_${episode.episode}`;
                if (!seenKeys.has(key)) {
                    uniqueEpisodes.push(episode);
                    seenKeys.add(key);
                }
            });

            // Use the first original name found for card creation consistency
            const representativeOriginalName = groupData.originalNames.values().next().value || normalizedGroupName;

            uniqueEpisodes.forEach(episode => {
                // We already have the normalizedGroupName from the loop key
                const normalizedEpisodeTitle = normalizeSearchString(episode.title);

                // Get and normalize the extracted name (used for display/fallback)
                let normalizedExtractedName = '';
                 let extractedNameForDisplay = ''; // Keep original extracted name for card title if needed
                try {
                    // Use the representativeOriginalName for consistency if extracting from title later
                    extractedNameForDisplay = extractAnimeName(episode.title, episode.url) || representativeOriginalName;
                    // Normalize the name extracted for display/fallback for searching purposes
                    normalizedExtractedName = normalizeSearchString(extractedNameForDisplay);
                } catch (e) {
                    console.warn(`Error extracting name for search/display: ${episode.title}`, e);
                    // Fallback to normalized group name if extraction fails
                    normalizedExtractedName = normalizedGroupName;
                }

                // Combine all normalized parts into one searchable string
                const searchableText = `${normalizedGroupName} ${normalizedEpisodeTitle} ${normalizedExtractedName}`.trim();

                 // --- Debug Logging ---
                 if (representativeOriginalName.toLowerCase().includes('the-beginning-after-the-end')) {
                    console.log(`--- Debug Search: The Beginning After the End ---`);
                    console.log(`Search Term (Normalized): "${normalizedSearchTerm}"`);
                    console.log(`Normalized Group Name: "${normalizedGroupName}"`);
                    console.log(`Normalized Episode Title: "${normalizedEpisodeTitle}"`);
                    console.log(`Normalized Extracted Name: "${normalizedExtractedName}"`);
                    console.log(`Combined Searchable Text: "${searchableText}"`);
                    console.log(`Match Found: ${normalizedSearchTerm && searchableText.includes(normalizedSearchTerm)}`);
                    console.log(`-----------------------------------------------`);
                }
                 // --- End Debug Logging ---

                // Perform search only if search term is not empty and a match is found in the combined text
                if (normalizedSearchTerm && searchableText.includes(normalizedSearchTerm)) {
                    // Use the representative original name for card creation
                    const card = createCard(representativeOriginalName, episode);
                     if (card) { // Ensure card creation succeeded
                        animeCardsContainer.appendChild(card);
                        count++;
                    }
                }
            });
        }


        // --- Step 3: Update UI ---
        // If search term is empty, load all groups respecting current filters
        if (!normalizedSearchTerm) {
             const currentFilter = document.querySelector('.filter-button.active')?.dataset.filter || 'all';
             const currentLetter = document.querySelector('#alphabetList button.active')?.dataset.letter || 'All';
             // Removed date filter parameters
             loadAnimeGroups(currentLetter, currentFilter);
             return; // Exit early
        }

        // If search term is present, we've already added matching cards.
        // Removed the secondary date filtering pass on search results.

        updateAnimeCount(); // Update counts based on *visible* cards after search filtering
        if (count === 0 && normalizedSearchTerm) { // Show message only if a search was performed and yielded no results
            const message = document.createElement('p');
            message.textContent = 'No anime episodes found matching your search.';
            message.style.textAlign = 'center';
            message.style.marginTop = '20px';
            animeCardsContainer.appendChild(message);
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
