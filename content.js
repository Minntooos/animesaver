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


function extractEpisodeInfo() {
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

document.addEventListener('click', function (e) {
    let target = e.target;
    while (target && target.tagName !== 'A') {
        target = target.parentElement;
    }
    if (target && (target.closest('.anime_video_body_episodes_r') || target.closest('.block-post'))) {
        e.preventDefault(); // Prevent the default link behavior

        const nextEpisodeUrl = target.href;
        const currentUrl = window.location.href;

        // Extract current episode number
        const currentEpisodeMatch = currentUrl.match(/(?:episode|حلقة)-(\d+)/);
        if (currentEpisodeMatch) {
            const currentEpisodeNumber = currentEpisodeMatch[1];

            chrome.storage.sync.get({ autoSave: true, saveNext: false }, function (settings) {
                if (settings.autoSave) {
                    chrome.runtime.sendMessage({
                        action: 'saveEpisode',
                        episodeUrl: settings.saveNext ? nextEpisodeUrl : currentUrl,
                        saveNext: settings.saveNext
                    }, function (response) {
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
                    // If autoSave is disabled, just navigate to the next episode
                    window.location.href = nextEpisodeUrl;
                }
            });
        } else {
            // If we couldn't extract the current episode number, just navigate
            window.location.href = nextEpisodeUrl;
        }
    }
}, false);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
    }
    return true;  // Indicates that the response will be sent asynchronously
});