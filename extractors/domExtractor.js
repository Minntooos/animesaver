export default function extractFromDom(url, domContent) {
    if (!domContent) return { animeTitle: null, episodeNumber: null };

    let animeTitle = null;
    let episodeNumber = null;
 // Check for AniWatchTV.to
 if (url.includes('aniwatchtv.to')) {
    // Extract episode number from the active episode selector
    const activeEpMatch = domContent.match(/<a[^>]*class="[^"]*ep-item[^"]*active[^"]*"[^>]*data-number="([^"]*)"[^>]*/);
    if (activeEpMatch) {
        episodeNumber = activeEpMatch[1];
        console.log('AniWatchTV episode number:', episodeNumber);
    }
    
    // Extract anime title from the film name heading
    const titleMatch = domContent.match(/<h2 class="film-name">\s*<a[^>]*title="([^"]+)"/);
    if (titleMatch) {
        animeTitle = titleMatch[1];
        // Remove any numeric ID at the end if present
        animeTitle = animeTitle.replace(/\s+\d+$/, '');
        console.log('AniWatchTV anime title:', animeTitle);
    }
    
    if (animeTitle || episodeNumber) {
        return {
            animeTitle: animeTitle,
            episodeNumber: episodeNumber
        };
    }
}
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

    // If not found, try other selectors
    if (!animeTitle) {
        const titleMatch = domContent.match(/<(h1|h2)[^>]*class="[^"]*(?:title|film-name|anime-title)[^"]*"[^>]*>(.*?)<\/\1>/);
        if (titleMatch) {
            animeTitle = titleMatch[2].replace(/-/g, ' ').trim();
        }
    }

    if (!episodeNumber) {
        const activeEpisodeLinkMatch = domContent.match(/<a[^>]*class="[^"]*ep-item[^"]*(?:active|current)[^"]*"[^>]*data-number="([^"]*)"[^>]*>/);
        if (activeEpisodeLinkMatch) {
            episodeNumber = activeEpisodeLinkMatch[1];
        }
    }

    console.log('domExtractor: Raw extracted data', { animeTitle, episodeNumber });

    return {
        animeTitle: animeTitle || null,
        episodeNumber: episodeNumber || null
    };
}