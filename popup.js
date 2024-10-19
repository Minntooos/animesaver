/*
MIT License

Copyright (c) 2024 Aiso

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { extractEpisodeInfo } from './utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const refreshButton = document.getElementById('refresh');
    const loadFromFileButton = document.getElementById('loadFromFile');
    const fileInput = document.getElementById('fileInput');
    const settingsButton = document.getElementById('settings');
    const settingsModal = document.getElementById('settingsModal');
    const saveSettingsButton = document.getElementById('saveSettings');
    const filterSelect = document.getElementById('filterSelect');
    filterSelect.addEventListener('change', applyFilter);
    const guideButton = document.getElementById('guideButton');
    guideButton.addEventListener('click', openGuideModal);

    refreshButton.addEventListener('click', () => {
        refreshAnimeData();
    });
    loadFromFileButton.addEventListener('click', () => {
        fileInput.click();
    });

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

    saveSettingsButton.addEventListener('click', saveSettings);

    // Load saved settings and data
    loadSettings();
    loadAlphabetButtons();
    loadAnimeGroups().then(() => {
        updateAnimeCount();
    });
});

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
                resolveLoadGroups();
            });
        });
    });
}

function extractAnimeName(title, url) {
    let animeName = '';

    // First, try to extract from the URL
    if (url) {
        const urlParts = url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        animeName = lastPart.split('-episode-')[0];
        if (animeName) {
            return animeName; // URL already has hyphens, so we can return it as is
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
function createCard(groupName, episode, resolveCard) {
    const card = document.createElement('div');
    card.classList.add('anime-card');
    
    // Get the current card size from body class
    const cardSize = document.body.classList.contains('small-cards') ? 'small' :
                     document.body.classList.contains('large-cards') ? 'large' : 'medium';
    card.classList.add(`${cardSize}-card`);

    // Extract anime name from the episode title or URL
    let animeName = extractAnimeName(episode.title, episode.url);
    
    // Create cover image
    const coverImage = document.createElement('img');
    coverImage.dataset.src = `https://gogocdn.net/cover/${animeName}.png`;
    coverImage.alt = animeName;
    coverImage.classList.add('anime-card-image');
    coverImage.onerror = function() {
        this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        this.alt = 'Placeholder';
        console.log(`Failed to load image for: ${animeName}`);
    };
    card.appendChild(coverImage);

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
        const prevEpisodeUrl = generateEpisodeUrl(episode.url, prevEpisodeNumber);
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

    // Check if next episode and episode after next are available
    const nextEpisodeNumber = parseInt(episode.episode) + 1;
    const episodeAfterNextNumber = nextEpisodeNumber + 1;
    const nextEpisodeUrl = generateEpisodeUrl(episode.url, nextEpisodeNumber);
    const episodeAfterNextUrl = generateEpisodeUrl(episode.url, episodeAfterNextNumber);
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
                    updateCardVisibility(card, { 
                        ...episode, 
                        nextEpisodeAvailable: isNextAvailable,
                        episodeAfterNextAvailable: isAfterNextAvailable
                    }, filterSelect.value);
                    resolveCard();
                });
            });
        } else {
            updateNextEpisodeLink(nextIsAvailable, nextEpisodeUrl, nextPlaceholder);
            updateCardVisibility(card, { 
                ...episode, 
                nextEpisodeAvailable: nextIsAvailable,
                episodeAfterNextAvailable: afterNextIsAvailable
            }, filterSelect.value);
            resolveCard();
        }
    });

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
    const visibleCards = document.querySelectorAll('.anime-card:not([style*="display: none"])').length;
    document.getElementById('animeCountValue').textContent = `Anime Count: ${visibleCards}`;
}

function applyFilter() {
    const filterValue = document.getElementById('filterSelect').value;
    const currentLetter = document.querySelector('#alphabetList button.active').dataset.letter;
    console.log('Applying filter:', filterValue);
    
    loadAnimeGroups(currentLetter, filterValue).then(() => {
        updateAnimeCount();
    });
}

function updateNextEpisodeLink(isAvailable, nextEpisodeUrl, placeholder) {
    if (isAvailable) {
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
    // First, check if dateString is valid
    if (!dateString || isNaN(new Date(dateString).getTime())) {
        console.error('Invalid date string:', dateString);
        return 'Unknown date';
    }

    const now = new Date();
    const past = new Date(dateString);

    // Check if the date is in the future (probably due to incorrect year)
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

    loadAnimeGroups(letter);
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
            loadAnimeGroups(); // Reload the anime groups to reflect the updates
            document.querySelector('.loading-overlay').classList.remove('active');        });
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
    fetch(url, { method: 'HEAD' })
        .then(response => {
            callback(response.ok);
        })
        .catch(() => {
            callback(false);
        });
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    chrome.storage.sync.get(null, function(data) {
        const animeCardsContainer = document.getElementById('animeCards');
        animeCardsContainer.innerHTML = ''; // Clear previous cards
        let count = 0;

        function processGroup(groupName, episodes) {
            episodes.forEach(episode => {
                if (episode.title.toLowerCase().includes(searchTerm) || groupName.toLowerCase().includes(searchTerm)) {
                    const card = createCard(groupName, episode);
                    animeCardsContainer.appendChild(card);
                    count++;
                }
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

        // Update anime count
        updateAnimeCount();
        if (count === 0) {
            const message = document.createElement('p');
            message.textContent = 'No anime episodes found.';
            message.style.textAlign = 'center';
            message.style.marginTop = '20px';
            animeCardsContainer.appendChild(message);
        }
    });
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