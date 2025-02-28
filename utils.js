import urlExtractor from './extractors/urlExtractor.js';
import domExtractor from './extractors/domExtractor.js';
import customExtractor from './extractors/customExtractor.js';
export function removeEpisodeNumber(fullAnimeTitle) {
    // Match the pattern and extract only the part before episode-X
    const episodeMatch = fullAnimeTitle.match(/(.+?)-(episode|حلقة)-(\d+)/i);
    
    if (episodeMatch) {
        return {
            animeTitle: episodeMatch[1].replace(/-/g, ' ').trim(),
            episodeNumber: episodeMatch[3]
        };
    }
    
    // Fallback to original logic if no match
    const fallbackMatch = fullAnimeTitle.match(/-episode-(\d+)/i);
    let episodeNumber = null;
    let animeTitle = fullAnimeTitle;

    if (fallbackMatch) {
        episodeNumber = fallbackMatch[1];
        // Remove episode-X and anything after it
        animeTitle = fullAnimeTitle.replace(/-episode-\d+.*$/i, '').replace(/-/g, ' ').trim();
    }

    return { animeTitle, episodeNumber };
}
export function extractEpisodeInfo(url, domContent) {
    const extractors = [urlExtractor, domExtractor, customExtractor];
    for (const extractor of extractors) {
        console.log('URL Extractor result:', urlExtractor(url, domContent));
        console.log('DOM Extractor result:', domExtractor(url, domContent));
        console.log('Custom Extractor result:', customExtractor(url, domContent));
        const result = extractor(url, domContent);
        if (result.animeTitle && result.episodeNumber) {
            return result;
        }
    }

    return { animeTitle: null, episodeNumber: null };
}