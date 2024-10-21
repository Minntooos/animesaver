**Anime Saver**

Anime Saver is a browser extension designed to help anime enthusiasts track their watching progress across multiple streaming platforms.

**Features**
- Automatic progress tracking on supported sites
- Multi-site support with varying levels of functionality
- URL and DOM parsing for information extraction
- Filtering options for easy anime management
- Offline backup of watching data
**Supported Sites**
- Full functionality: Gogoanime, xsanime
- Basic functionality: Any anime site with 'episode-number' in the URL
- Limited functionality: 9anime (manual saving only)
**How It Works**
- Anime Saver uses three main methods to extract anime information:
  
1. URL Extraction:

        export default function extractFromUrl(url) {
            try {
                console.log('Extracting from URL:', url);
                const parsedUrl = new URL(url);
                const decodedPath = decodeURIComponent(parsedUrl.pathname);
                const pathSegments = decodedPath.split('/').filter(segment => segment !== '');
                console.log('Decoded path segments:', pathSegments);
                console.log('Decoded path segments:', pathSegments);
                let fullAnimeTitle, episodeNumber;
                let fullAnimeTitle, episodeNumber;
                // Check if the URL contains 'episode' in the path
                if (pathSegments.includes('episode')) {
                    const episodeIndex = pathSegments.indexOf('episode');
                    fullAnimeTitle = pathSegments.slice(episodeIndex + 1).join('-');
                    
                    // Extract episode number
                    const episodeMatch = fullAnimeTitle.match(/(?:episode-|حلقة-)(\d+)/i);
                    episodeNumber = episodeMatch ? episodeMatch[1] : null;
                    episodeNumber = episodeMatch ? episodeMatch[1] : null;
                    // Remove episode information from fullAnimeTitle
                    fullAnimeTitle = fullAnimeTitle.replace(/(?:episode-|حلقة-)\d+/i, '').replace(/-+$/, '');
                } else {
                    fullAnimeTitle = pathSegments[pathSegments.length - 1];
                    const episodeMatch = fullAnimeTitle.match(/(?:episode-|حلقة-)(\d+)/i);
                    episodeNumber = episodeMatch ? episodeMatch[1] : null;
                    fullAnimeTitle = fullAnimeTitle.replace(/(?:episode-|حلقة-)\d+/i, '').replace(/-+$/, '');
                }
                }
                // Remove any remaining Arabic characters
                fullAnimeTitle = fullAnimeTitle.replace(/[\u0600-\u06FF]/g, '').trim();
        
                console.log('Full anime title:', fullAnimeTitle);
                console.log('Episode number:', episodeNumber);
        
                return {
                    animeTitle: fullAnimeTitle.replace(/-/g, ' ').trim(),
                    episodeNumber: episodeNumber || null
                };
            } catch (error) {
                console.error('Error in extractFromUrl:', error);
                return {
                    animeTitle: null,
                    episodeNumber: null
                };
            }
        }

2. DOM Extraction:

        export default function extractFromDom(url, domContent) {
            if (!domContent) return { animeTitle: null, episodeNumber: null };
            if (!domContent) return { animeTitle: null, episodeNumber: null };
            let animeTitle = null;
            let episodeNumber = null;
            let episodeNumber = null;
            // Try to extract from the episodes section first
            const episodesSectionMatch = domContent.match(/<div[^>]*class="[^"]*block_area[^"]*block_area-episodes[^"]*"[^>]*>([\s\S]*?)<\/div>/);
            if (episodesSectionMatch) {
                const episodesSection = episodesSectionMatch[1];
                const activeEpisodeMatch = episodesSection.match(/<a[^>]*class="[^"]*ep-item[^"]*active[^"]*"[^>]*href="([^"]*)"[^>]*data-number="([^"]*)"[^>]*>/);
                if (activeEpisodeMatch) {
                    animeTitle = activeEpisodeMatch[1].split('/').pop().split('?')[0].replace(/-/g, ' ').trim();
                    episodeNumber = activeEpisodeMatch[2];
                }
                }
            }
            // If not found, try other selectors
            if (!animeTitle) {
                const titleMatch = domContent.match(/<(hh2)[^>]*class="[^"]*(?:title|film-name|anime-title)[^"]*"[^>]*>(.*?)<\/\1>/);
                if (titleMatch) {
                    animeTitle = titleMatch[2].replace(/-/g, ' ').trim();
                }
                }
            }
            if (!episodeNumber) {
                const activeEpisodeLinkMatch = domContent.match(/<a[^>]*class="[^"]*ep-item[^"]*(?:active|current)[^"]*"[^>]*data-number="([^"]*)"[^>]*>/);
                if (activeEpisodeLinkMatch) {
                    episodeNumber = activeEpisodeLinkMatch[1];
                }
                }
            }
            console.log('domExtractor: Raw extracted data', { animeTitle, episodeNumber });
        
            return {
                animeTitle: animeTitle || null,
                episodeNumber: episodeNumber || null
            };
        }

3. Custom Site Extraction:

         export default function customExtractor(url, domContent) {
             if (url.includes('specific-anime-site.com')) {
                 const getTextContent = (regex) => {
                     const match = domContent.match(regex);
                     return match ? match[1].trim() : null;
                 };
                 };
                 const animeTitle = getTextContent(/<div class="specific-title-selector"[^>]*>(.*?)<\/div>/);
                 const episodeNumber = getTextContent(/<div class="specific-episode-selector"[^>]*>.*?(\d+)/);
                 const episodeNumber = getTextContent(/<div class="specific-episode-selector"[^>]*>.*?(\d+)/);
                 if (!animeTitle || !episodeNumber) {
                     console.warn('customExtractor: Failed to extract data for specific-anime-site.com.', { animeTitle, episodeNumber });
                 } else {
                     console.log('customExtractor: Successfully extracted data for specific-anime-site.com.', { animeTitle, episodeNumber });
                 }
                 }
                 return {
                     animeTitle,
                     episodeNumber
                 };
             }
             }
             return {
                 animeTitle: null,
                 episodeNumber: null
             };
             };

**Installation**

1. Download the extension from the browser's extension store.

2. Install the extension in your browser.

The extension icon should appear in your browser's toolbar.
Usage
1. Visit a supported anime streaming site.
2. Play an episode of an anime.
3. The extension will automatically save your progress (on fully supported sites).
4. Click on the extension icon to view your saved anime and manage your list.

**Filters**
- All Episodes: Shows all saved episodes.
- Watch Next: Displays anime with more than one episode available to watch next.
- New Episode: Shows anime with only one new episode available.

**Development Status**

The extension is currently under active development.
Future updates will include:
- Improved support for sites without 'episode-number' in the URL
- Enhanced functionality for partially supported sites
- Privacy
- Anime Saver operates entirely client-side and does not send any data to external servers.
Contributing
- Contributions are welcome! Please feel free to submit a Pull Request.
Support
- If you encounter any issues or have any questions, please open an issue on the GitHub repository.
