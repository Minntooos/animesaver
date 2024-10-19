import { extractEpisodeInfo, removeEpisodeNumber } from './utils.js';

import extractFromUrl from './extractors/urlExtractor.js';
import extractFromDom from './extractors/domExtractor.js';
import customExtractor from './extractors/customExtractor.js';
console.log("Background script is running");

const saveContextMenuItemId = "saveToAnimeGroup";
let lastEpisodeContextMenuItemId = "lastEpisodeInfo";
function createContextMenu() {
    chrome.contextMenus.removeAll(() => {
        // Context Menu Item 1: Save to Anime Group
        chrome.contextMenus.create({
            id: saveContextMenuItemId,
            title: "Save to Anime Group",
            contexts: ["page"]
        });

        // Context Menu Item 2: Check Last Episode
        chrome.contextMenus.create({
            id: lastEpisodeContextMenuItemId,
            title: "Show Last Episode",
            contexts: ["link"],
            // Correctly URL-encode 'حلقة' which is '%D8%AD%D9%84%D9%82%D8%A9' in URLs
            targetUrlPatterns: [
                "*://*/*-episode-*",
                "*://*/*/%D8%AD%D9%84%D9%82%D8%A9-*"
            ]
        });

        console.log("Context menus created successfully.");
    });
}

// Create context menus on extension installation and update
chrome.runtime.onInstalled.addListener(() => {
    createContextMenu();
    console.log("Extension installed and context menus initialized.");
});
chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === saveContextMenuItemId) {
        // Function to save to Anime Group
        saveToAnimeGroup(tab, false);
    } else if (info.menuItemId === lastEpisodeContextMenuItemId) {
        if (info.linkUrl) {
            checkLastEpisode(info.linkUrl);
        } else {
            console.error('No link URL found');
            showErrorMessage("Unable to check last episode: No link URL found.");
        }
    }
});

async function getDomContent(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        return text;
    } catch (error) {
        console.error('Failed to fetch DOM content:', error);
        return null;
    }
}
function clearStorage() {

    chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
            console.error('Error clearing storage:', chrome.runtime.lastError);
        } else {
            console.log('Storage cleared successfully');
        }
    });
}
async function saveToAnimeGroup(tabOrUrl, isNextEpisode = false) {
    try {
        let url;
        if (typeof tabOrUrl === 'string') {
            url = tabOrUrl;
        } else if (tabOrUrl && tabOrUrl.url) {
            url = tabOrUrl.url;
        } else {
            console.error('Invalid input for saveToAnimeGroup:', tabOrUrl);
            return;
        }

        console.log('Attempting to save URL:', url);

        let animeTitle, episodeNumber;

        // Try URL extractor first
        const urlExtracted = extractFromUrl(url);
        console.log('URL extractor result:', urlExtracted);
        animeTitle = urlExtracted.animeTitle;
        episodeNumber = urlExtracted.episodeNumber;
    
        
        // If URL extractor fails to get the episode number, use content script for DOM extraction
        if (!episodeNumber && tabOrUrl.id) {
            console.log('URL extractor failed to get episode number, trying content script...');
            try {
                const response = await chrome.tabs.sendMessage(tabOrUrl.id, { action: "getEpisodeInfo" });
                console.log('Content script response:', response);
                
                if (response && response.animeTitle && response.episodeNumber) {
                    animeTitle = response.animeTitle || animeTitle;
                    episodeNumber = response.episodeNumber;
                } else {
                    throw new Error('Failed to extract anime title or episode number from content script.');
                }
            } catch (error) {
                console.error('Error in content script extraction:', error);
                return;
            }
        }

        if (!animeTitle || !episodeNumber) {
            console.error('Failed to extract anime title or episode number.');
            console.log('Final animeTitle:', animeTitle);
            console.log('Final episodeNumber:', episodeNumber);
            return;
        }

        // Remove episode number and Arabic word from animeTitle
        const baseAnimeTitle = animeTitle.replace(/(-episode-\d+|\d+-حلقة)$/i, '').trim();
        const fullTitle = `${baseAnimeTitle} Episode ${episodeNumber}`;
        const dateAdded = new Date().toISOString();

        await saveAnimeEpisode(animeTitle, { 
            title: `${animeTitle} Episode ${episodeNumber}`, 
            episode: episodeNumber, 
            url, 
            dateAdded: new Date().toISOString()
        });

        console.log('Episode saved successfully');
    } catch (error) {
        console.error('Error in saveToAnimeGroup:', error);
    }
}
function saveAnimeEpisode(groupName, episodeData) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, function (data) {
            console.log("Current storage data:", data);
            let group = null;
            
            // Remove episode number and Arabic word from groupName
            const cleanedGroupName = groupName.replace(/(-episode-\d+|\d+-حلقة)$/i, '');
            
            // Ensure groupName uses hyphens
            const hyphenatedGroupName = cleanedGroupName.replace(/\s+/g, '-');
            
            console.log("Cleaned group name:", hyphenatedGroupName);

            const chunkKey = `${hyphenatedGroupName}_chunk_0`;
            const infoKey = `${hyphenatedGroupName}_info`;

            // Check for existing group with spaces
            const oldChunkKey = `${cleanedGroupName.replace(/-/g, ' ')}_chunk_0`;
            const oldInfoKey = `${cleanedGroupName.replace(/-/g, ' ')}_info`;

            // Check for old-style group
            if (data.animeGroups && data.animeGroups[hyphenatedGroupName]) {
                group = data.animeGroups[hyphenatedGroupName];
                delete data.animeGroups[hyphenatedGroupName];
            } else if (data[hyphenatedGroupName] && Array.isArray(data[hyphenatedGroupName])) {
                group = data[hyphenatedGroupName];
                delete data[hyphenatedGroupName];
            } else if (data[oldChunkKey]) {
                // Migrate data from old key (with spaces) to new key (with hyphens)
                group = data[oldChunkKey];
                delete data[oldChunkKey];
            } else if (data[chunkKey]) {
                group = data[chunkKey];
            }

            // Ensure dateAdded is a valid ISO string
            const currentDate = new Date().toISOString();

            if (group && group.length > 0) {
                // Update existing episode
                group[0] = {
                    ...group[0],
                    ...episodeData,
                    dateAdded: currentDate // Keep original dateAdded if it exists, otherwise use current date
                };
            } else {
                // Create new group with the episode
                group = [{
                    ...episodeData,
                    dateAdded: currentDate
                }];
            }

            const saveData = {
                [chunkKey]: group,
                [infoKey]: {
                    chunks: 1,
                    currentEpisode: episodeData.episode,
                    nextEpisodeAvailable: false // This will be updated later
                }
            };

            // If animeGroups is empty, remove it
            if (data.animeGroups && Object.keys(data.animeGroups).length === 0) {
                chrome.storage.sync.remove('animeGroups');
            }

            // If old keys exist, remove them
            if (data[oldChunkKey]) chrome.storage.sync.remove(oldChunkKey);
            if (data[oldInfoKey]) chrome.storage.sync.remove(oldInfoKey);

            chrome.storage.sync.set(saveData, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error saving data:", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log("Saved data for:", hyphenatedGroupName);
                    
                    // Check next episode availability
                    const nextEpisodeNumber = parseInt(episodeData.episode) + 1;
                    const nextEpisodeUrl = episodeData.url.replace(
                        /(-episode-\d+|-\d+-حلقة)$/,
                        episodeData.url.includes('حلقة') ? `-${nextEpisodeNumber}-حلقة` : `-episode-${nextEpisodeNumber}`
                    );
                    
                    checkEpisodeAvailability(nextEpisodeUrl, function(isAvailable) {
                        saveData[infoKey].nextEpisodeAvailable = isAvailable;
                        chrome.storage.sync.set({ [infoKey]: saveData[infoKey] }, function() {
                            if (chrome.runtime.lastError) {
                                console.error("Error updating next episode availability:", chrome.runtime.lastError);
                            } else {
                                console.log("Updated next episode availability for:", hyphenatedGroupName);
                            }
                            chrome.storage.sync.get(null, function(allData) {
                                saveDataToFile(allData);
                                resolve();
                            });
                        });
                    });
                }
            });
        });
    });
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

function splitIntoChunks(array) {
    const chunks = [];
    let currentChunk = [];
    for (let item of array) {
        if (JSON.stringify([...currentChunk, item]).length > 7000) {
            chunks.push(currentChunk);
            currentChunk = [item];
        } else {
            currentChunk.push(item);
        }
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    return chunks;
}

function saveDataToFile(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const reader = new FileReader();

    reader.onload = function() {
        const url = reader.result;
        chrome.downloads.download({
            url: url,
            filename: 'anime_groups.json',
            conflictAction: 'overwrite',
            saveAs: false
        }, function(downloadId) {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
            } else {
                console.log('Download started with ID:', downloadId);
            }
        });
    };

    reader.readAsDataURL(blob);
}
function removeEpisodeNumber2(fullAnimeTitle, callback) {
    const episodeMatch = fullAnimeTitle.match(/-episode-[^-]+((-[^-]+){0,})/);
    let episodeNumber = '';
    let animeTitle = fullAnimeTitle;

    if (episodeMatch) {
        episodeNumber = episodeMatch[0].replace('-episode-', '');
        animeTitle = fullAnimeTitle.replace(/-episode-[^-]+((-[^-]+){0,})/g, '');
    }

    if (callback) {
        callback(episodeNumber);
    }
    return animeTitle;
}
function showErrorMessage(message) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "showErrorMessage",
                message: message
            });
        } else {
            console.error('No active tab found to show error message');
        }
    });
}
function checkLastEpisode(url) {
    if (!url) {
        console.error('URL is undefined or empty');
        showErrorMessage("Unable to check last episode: URL is missing.");
        return;
    }

    let fullAnimeTitle, parsedUrl, pathSegments;

    try {
        parsedUrl = new URL(url);
        pathSegments = parsedUrl.pathname.split('/').filter(segment => segment);
        fullAnimeTitle = pathSegments[pathSegments.length - 1];
    } catch (error) {
        console.error('Invalid URL:', url);
        console.error('Error details:', error);
        showErrorMessage("Invalid URL. Unable to check last episode.");
        return;
    }
    
    console.log('Full anime title from URL:', fullAnimeTitle);

    // Check if the URL contains episode information
    if (!fullAnimeTitle || !fullAnimeTitle.includes('-episode-')) {
        console.error('URL does not contain episode information:', url);
        showErrorMessage("Unable to check last episode: URL does not contain episode information.");
        return;
    }

    const animeTitle = fullAnimeTitle.split('-episode-')[0];
    const currentEpisode = fullAnimeTitle.split('-episode-')[1];

    console.log('Extracted anime title:', animeTitle);
    console.log('Extracted current episode:', currentEpisode);

    if (!animeTitle || !currentEpisode) {
        console.error('Invalid anime title or episode:', { animeTitle, currentEpisode });
        showErrorMessage("Unable to check last episode: Invalid anime title or episode number.");
        return;
    }

    const cleanAnimeTitle = animeTitle.toLowerCase();

    chrome.storage.sync.get(null, function (data) {
        console.log('All stored data:', data);

        let matchingKey = null;
        let lastEpisode = null;
        let groupName = null;

        function checkMatch(key, title) {
            const cleanKey = key.replace(/-/g, ' ').toLowerCase();
            const cleanTitle = title.replace(/-/g, ' ').toLowerCase();
            const match = cleanKey === cleanTitle || cleanKey.includes(cleanTitle) || cleanTitle.includes(cleanKey);
            console.log(`Comparing: "${cleanKey}" with "${cleanTitle}" - Match: ${match}`);
            return match;
        }

        // Check new format (with '_info' suffix)
        matchingKey = Object.keys(data).find(key => key.endsWith('_info') && checkMatch(key.replace('_info', ''), cleanAnimeTitle));

        if (matchingKey) {
            groupName = matchingKey.replace('_info', '');
            const groupInfo = data[matchingKey];
            if (groupInfo && groupInfo.currentEpisode) {
                lastEpisode = groupInfo.currentEpisode;
            }
        }

        // Check old format
        if (!lastEpisode) {
            matchingKey = Object.keys(data).find(key => !key.endsWith('_info') && !key.includes('_chunk_') && checkMatch(key, cleanAnimeTitle));
            if (matchingKey) {
                groupName = matchingKey;
                const episodes = data[matchingKey];
                if (Array.isArray(episodes) && episodes.length > 0) {
                    lastEpisode = episodes[episodes.length - 1].episode;
                }
            }
        }

        // Check animeGroups
        if (!lastEpisode && data.animeGroups) {
            Object.keys(data.animeGroups).forEach(key => {
                if (checkMatch(key, cleanAnimeTitle)) {
                    groupName = key;
                    const episodes = data.animeGroups[key];
                    if (Array.isArray(episodes) && episodes.length > 0) {
                        lastEpisode = episodes[episodes.length - 1].episode;
                    }
                }
            });
        }

        console.log('Matching key:', matchingKey);
        console.log('Group name:', groupName);
        console.log('Last episode:', lastEpisode);
        console.log('Current episode:', currentEpisode);

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (lastEpisode) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showLastEpisodeDialog",
                    groupName: groupName || animeTitle,
                    lastEpisode: lastEpisode,
                    currentEpisode: currentEpisode,
                    url: url
                });
            } else {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showNoEpisodesMessage",
                    animeTitle: animeTitle
                });
            }
        });
    });
}
function scheduleNextEpisodeCheck() {
    const checkInterval = 6 * 60 * 60 * 1000; // Check every 6 hours
    setInterval(checkAllNextEpisodes, checkInterval);
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'saveEpisode') {
        chrome.storage.sync.get({ autoSave: true, saveNext: false, delayTime: 5 }, function(settings) {
            if (settings.autoSave) {
                if (settings.saveNext) {
                    const saveFunction = () => saveToAnimeGroup(request.episodeUrl, true);
                    if (settings.delayTime) {
                        setTimeout(saveFunction, settings.delayTime * 1000);
                    } else {
                        saveFunction();
                    }
                } else {
                    saveToAnimeGroup(request.episodeUrl, false);
                }
            }
        });
        sendResponse({success: true});
    }else if(request.action === 'clearStorage') {
        clearStorage();
        sendResponse({success: true});
    }else if (request.action === 'checkNextEpisode') {
        checkEpisodeAvailability(request.nextEpisodeUrl, (isAvailable) => {
            chrome.storage.local.set({
                [`nextEpisodeAvailable_${request.groupName}_${request.episodeNumber}`]: { 
                    isAvailable, 
                    lastChecked: Date.now() 
                }
            });
            sendResponse({ isAvailable: isAvailable });
        });
        return true; // Indicates that the response will be sent asynchronously
    }
    return true;
});
