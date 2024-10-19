import { removeEpisodeNumber } from '../utils.js';

export default function extractFromUrl(url) {
    try {
        console.log('Extracting from URL:', url);
        const parsedUrl = new URL(url);
        const decodedPath = decodeURIComponent(parsedUrl.pathname);
        const pathSegments = decodedPath.split('/').filter(segment => segment !== '');
        console.log('Decoded path segments:', pathSegments);

        let fullAnimeTitle, episodeNumber;

        // Check if the URL contains 'episode' in the path
        if (pathSegments.includes('episode')) {
            const episodeIndex = pathSegments.indexOf('episode');
            fullAnimeTitle = pathSegments.slice(episodeIndex + 1).join('-');
            
            // Extract episode number
            const episodeMatch = fullAnimeTitle.match(/(?:episode-|حلقة-)(\d+)/i);
            episodeNumber = episodeMatch ? episodeMatch[1] : null;

            // Remove episode information from fullAnimeTitle
            fullAnimeTitle = fullAnimeTitle.replace(/(?:episode-|حلقة-)\d+/i, '').replace(/-+$/, '');
        } else {
            fullAnimeTitle = pathSegments[pathSegments.length - 1];
            const episodeMatch = fullAnimeTitle.match(/(?:episode-|حلقة-)(\d+)/i);
            episodeNumber = episodeMatch ? episodeMatch[1] : null;
            fullAnimeTitle = fullAnimeTitle.replace(/(?:episode-|حلقة-)\d+/i, '').replace(/-+$/, '');
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