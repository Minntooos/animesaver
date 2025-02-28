// content.js
// content.js
function showDialog(message, buttons, options = {}) {
    const dialog = document.createElement('div');
    const dialogContent = document.createElement('div');
    
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    dialogContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
        max-width: 80%;
        width: 400px;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    let headerHtml = '';
    if (options.title) {
        headerHtml = `<h2 style="margin-top: 0; margin-bottom: 15px; color: #333;">${options.title}</h2>`;
    }
    
    let imageHtml = '';
    if (options.image) {
        imageHtml = `<img src="${options.image}" alt="Dialog image" style="max-width: 100%; height: auto; margin-bottom: 15px;">`;
    }
    
    dialogContent.innerHTML = `
        ${headerHtml}
        ${imageHtml}
        <p style="margin-bottom: 20px; color: #555; line-height: 1.5;">${message}</p>
        <div style="display: flex; justify-content: flex-end;">
            ${buttons.map(button => `
                <button style="
                    margin-left: 10px;
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    background-color: ${button.primary ? '#007bff' : '#6c757d'};
                    color: white;
                    cursor: pointer;
                    transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='${button.primary ? '#0056b3' : '#5a6268'}'"
                onmouseout="this.style.backgroundColor='${button.primary ? '#007bff' : '#6c757d'}'"
                >${button.text}</button>
            `).join('')}
        </div>
    `;
    
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);

    const buttonElements = dialogContent.querySelectorAll('button');
    buttonElements.forEach((button, index) => {
        button.addEventListener('click', () => {
            buttons[index].onClick();
            document.body.removeChild(dialog);
        });
    });

    // Close dialog when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            document.body.removeChild(dialog);
        }
    });

    // Close dialog with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(dialog);
        }
    });
}
const ANIWATCHTV_PROTECTION_KEY = 'aniwatch_last_processed';

let processingAniWatchPage = false;

function extractEpisodeInfo() {
    if (window.location.href.includes('aniwatchtv.to')) {
        const activeEpisode = document.querySelector('.ssl-item.ep-item.active, .ssl-item.ep-item[class*="active"]');
        if (activeEpisode) {
            const episodeNumber = activeEpisode.getAttribute('data-number');
            const episodeTitle = activeEpisode.getAttribute('title') || activeEpisode.querySelector('.ep-name')?.textContent;
            
            // Get anime title from heading
            const animeHeading = document.querySelector('h2.film-name a.dynamic-name');
            let animeTitle = animeHeading ? animeHeading.getAttribute('title') : null;
            
            // Clean up the title - remove any numeric ID at the end
            if (animeTitle) {
                animeTitle = animeTitle.replace(/\s+\d+$/, '').trim();
            }
            
            return {
                animeTitle: animeTitle,
                episodeNumber: episodeNumber,
                episodeTitle: episodeTitle,
                url: window.location.href
            };
        }
    }

    // Check for GoGoAnime-style elements
    const episodesSection = document.querySelector('.block_area.block_area-episodes');
    if (episodesSection) {
        const activeEpisode = episodesSection.querySelector('.ep-item.active');
        if (activeEpisode) {
            const animeTitle = activeEpisode.getAttribute('href').split('/').pop().split('?')[0];
            const episodeNumber = activeEpisode.getAttribute('data-number');
            const episodeTitle = activeEpisode.getAttribute('title');

            return {
                animeTitle: animeTitle.replace(/-/g, ' ').trim(),
                episodeNumber,
                episodeTitle,
                url: window.location.href
            };
        }
    }

    // Check for new site elements
    const blockPost = document.querySelector('.block-post');
    if (blockPost) {
        const link = blockPost.querySelector('a');
        if (link) {
            const url = link.getAttribute('href');
            const title = link.getAttribute('title');
            const episodeSpan = blockPost.querySelector('.episode');
            const episodeNumber = episodeSpan ? episodeSpan.textContent.match(/\d+/)[0] : null;
            const animeTitle = title.replace(/حلقة \d+/, '').trim();

            return {
                animeTitle,
                episodeNumber,
                episodeTitle: title,
                url
            };
        }
    }
    


    return null;
}
if (window.location.href.includes('aniwatchtv.to')) {
    // On page load, check if this is a refresh/reload
    window.addEventListener('load', function() {
        const currentUrl = window.location.href.split('#')[0];
        const lastUrl = sessionStorage.getItem('aniwatchtv_last_url');
        
        if (lastUrl === currentUrl) {
            console.log('Page reload detected, preventing auto-save');
            sessionStorage.setItem('aniwatchtv_prevent_save', 'true');
        } else {
            console.log('New page navigation detected');
            sessionStorage.setItem('aniwatchtv_last_url', currentUrl);
            sessionStorage.removeItem('aniwatchtv_prevent_save');
        }
    });
}
document.addEventListener('click', function (e) {
    let target = e.target;
    const clickedElement = target.closest('a[rel="next"], a[rel="prev"], .ep-item');
    if (!clickedElement) return;
   // Handle aniwatchtv.to episode links
   if (target && target.classList.contains('ep-item')) {
    // Check if we're on aniwatchtv.to and prevent default only there
    if (window.location.href.includes('aniwatchtv.to')) {
        e.preventDefault(); // Prevent the default link behavior
        
        // If we're already processing or prevention flag is set, ignore this click
        if (processingAniWatchPage || sessionStorage.getItem('aniwatchtv_prevent_save') === 'true') {
            console.log('Preventing operation due to protection flags');
            return;
        }
        
        const nextEpisodeUrl = target.href;
        
        // Critical check: Don't navigate to the current URL (prevent refresh loop)
        if (nextEpisodeUrl === window.location.href) {
            console.log('Preventing navigation to current URL');
            return;
        }
        
        // Set processing flag and update sessionStorage
        processingAniWatchPage = true;
        sessionStorage.setItem(ANIWATCHTV_PROTECTION_KEY, JSON.stringify({
            url: window.location.href.split('#')[0],
            timestamp: Date.now()
        }));
        
        // Directly navigate to next episode without trying to save current episode
        console.log('Navigating to:', nextEpisodeUrl);
        window.location.href = nextEpisodeUrl;
        
        // Reset processing flag after a delay
        setTimeout(() => {
            processingAniWatchPage = false;
        }, 3000);
    }
}
else if (clickedElement.getAttribute('rel') === 'next' || 
clickedElement.closest('.anime_video_body_episodes_r') ||
clickedElement.closest('.block-post')) {
        e.preventDefault(); // Prevent the default link behavior

        const nextEpisodeUrl = clickedElement.href;
        const currentUrl = window.location.href;
        console.log('Navigation clicked:', {
            nextEpisodeUrl,
            currentUrl,
            isNextButton: clickedElement.getAttribute('rel') === 'next'
        });
        // Extract current episode number
        const currentEpisodeMatch = currentUrl.match(/(?:episode|حلقة)-(\d+)/);
        if (currentEpisodeMatch) {
            const currentEpisodeNumber = currentEpisodeMatch[1];

            chrome.storage.sync.get({ autoSave: true, saveNext: false }, function (settings) {
                if (settings.autoSave) {
                    console.log('Auto-save is enabled, saving episode...');

                    chrome.runtime.sendMessage({
                        action: 'saveEpisode',
                        episodeUrl: settings.saveNext ? nextEpisodeUrl : currentUrl,
                        saveNext: settings.saveNext
                    }, function (response) {
                        console.log('Save response:', response);

                        if (response && response.success) {
                            // If save was successful, navigate to the next episode
                            window.location.href = nextEpisodeUrl;
                        } else {
                            console.error('Failed to save the episode.');
                            // Optionally, navigate even if saving failed
                            window.location.href = nextEpisodeUrl;
                        }
                    });
                } else {
                    console.log('Auto-save is disabled, navigating directly...');

                    // If autoSave is disabled, just navigate to the next episode
                    window.location.href = nextEpisodeUrl;
                }
            });
        } else {
            // If we couldn't extract the current episode number, just navigate
            window.location.href = nextEpisodeUrl;
        }
    }
},  { capture: true });

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
     // For AniWatchTV, check if we've processed this page recently or have prevention flag
     if (window.location.href.includes('aniwatchtv.to')) {
        if (sessionStorage.getItem('aniwatchtv_prevent_save') === 'true') {
            console.log('Blocking message processing due to prevention flag');
            // Return empty response for actions that would trigger a save
            if (request.action === "getEpisodeInfo" || request.action === "getCurrentUrl") {
                sendResponse(null);
                return true;
            }
        }
        
        const lastProcessedData = sessionStorage.getItem(ANIWATCHTV_PROTECTION_KEY);
        const lastProcessed = lastProcessedData ? JSON.parse(lastProcessedData) : null;
        const now = Date.now();
        
        if (lastProcessed && (now - lastProcessed.timestamp) < 5000) {
            if (request.action === "getCurrentUrl" || request.action === "getEpisodeInfo" || request.action === "getPageDOM") {
                console.log('Preventing processing during cooldown period');
                sendResponse(null);
                return true;
            }
        }
    }
    if (request.action === "getCurrentUrl") {
        sendResponse({ url: window.location.href });
    } else if (request.action === "getEpisodeInfo") {
        sendResponse(extractEpisodeInfo());
    } else if (request.action === "showLastEpisodeDialog") {
        showDialog(
            `Last saved episode: ${request.lastEpisode}\nCurrent episode: ${request.currentEpisode}\n\nDo you want to go to the last episode?`,
            [
                {
                    text: "Yes",
                    onClick: () => {
                        const lastEpisodeUrl = request.url.replace(
                            /(?:episode|حلقة)-\d+/,
                            `${request.url.includes('حلقة') ? 'حلقة' : 'episode'}-${request.lastEpisode}`
                        );
                        window.location.href = lastEpisodeUrl;
                    },
                    primary: true
                },
                {
                    text: "No",
                    onClick: () => {}
                }
            ],
            {
                title: `${request.groupName} - Last Episode: ${request.lastEpisode}, Current Episode: ${request.currentEpisode}`
            }
        );
    } else if (request.action === "showNoEpisodesMessage") {
        showDialog(
            `No episodes saved yet for "${request.animeTitle}".`,
            [{text: "OK", onClick: () => {}, primary: true}],
            {title: "No Episodes Found"}
        );
    } else if (request.action === "showErrorMessage") {
        showDialog(
            request.message,
            [{text: "OK", onClick: () => {}, primary: true}],
            {title: "Error"}
        );
    } else if (request.action === "getPageDOM") {
        sendResponse(document.documentElement.outerHTML);
    }
    return true;  // Indicates that the response will be sent asynchronously
});