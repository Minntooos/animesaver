import urlExtractor from './extractors/urlExtractor.js';
import domExtractor from './extractors/domExtractor.js';
import customExtractor from './extractors/customExtractor.js';

export function removeEpisodeNumber(fullAnimeTitle) {
    const episodeMatch = fullAnimeTitle.match(/-episode-(\d+)/i);
    let episodeNumber = null;
    let animeTitle = fullAnimeTitle;

    if (episodeMatch) {
        episodeNumber = episodeMatch[1];
        animeTitle = fullAnimeTitle.replace(/-episode-\d+/i, '').replace(/-/g, ' ').trim();
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