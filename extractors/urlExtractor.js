import { removeEpisodeNumber } from '../utils.js';

export default function extractFromUrl(url) {
    try {
        console.log('Extracting from URL:', url);
        const parsedUrl = new URL(url);
        const decodedPath = decodeURIComponent(parsedUrl.pathname);
        const pathSegments = decodedPath.split('/').filter(segment => segment !== '');
        console.log('Decoded path segments:', pathSegments);

        let animeTitle, episodeNumber;
  // AniWatchTV.to specific extraction
  if (url.includes('aniwatchtv.to') || url.includes('9animetv.to')) {
    // For URLs like: /watch/im-a-noble-on-the-brink-of-ruin-so-i-might-as-well-try-mastering-magic-19458
    if (pathSegments.includes('watch') && pathSegments.length > 1) {
        const animePathSegment = pathSegments[pathSegments.indexOf('watch') + 1];
        // Remove numeric ID at the end (like -19458)
        animeTitle = animePathSegment
        .split('?')[0]  // Remove query parameters
        .replace(/-\d+$/, '')  // Remove the ID number at the end
        .replace(/-+/g, ' ')    // Remove any remaining numbers
        .replace(/\s+/g, ' ')  // Replace hyphens with spaces
        .trim();  // Clean up extra spaces
        if (url.includes('9animetv.to')) {
           console.log('9animetv URL extracted title:', animeTitle);
        }else{
            console.log('AniWatchTV URL extracted title:', animeTitle);
        }
        
        // We cannot extract episode number from URL reliably
        // Will depend on DOM extraction for this
        episodeNumber = null;
        
        return {
            animeTitle: animeTitle.replace(/-/g, ' ').trim(),
            episodeNumber: episodeNumber
        };
    }

}

        // Get the last path segment which contains the anime info
        const lastSegment = pathSegments[pathSegments.length - 1];
        
        // Extract episode information using improved regex
        const episodeMatch = lastSegment.match(/(.+?)-(episode|حلقة)-(\d+)/i);
        
        if (episodeMatch) {
            // Group 1 contains everything before "episode-" or "حلقة-"
            animeTitle = episodeMatch[1];
            // Group 3 contains the episode number
            episodeNumber = episodeMatch[3];
            
            console.log('Matched anime title:', animeTitle);
            console.log('Matched episode number:', episodeNumber);
        } else {
            // Fallback to old method if the regex doesn't match
            console.log('Regex match failed, using fallback extraction');
            
            if (pathSegments.includes('episode')) {
                const episodeIndex = pathSegments.indexOf('episode');
                const fullPath = pathSegments.slice(episodeIndex + 1).join('-');
                
                // Extract just the part before episode number
                const titleMatch = fullPath.match(/(.+?)-(episode|حلقة)-\d+/i);
                animeTitle = titleMatch ? titleMatch[1] : fullPath;
                
                const epNumMatch = fullPath.match(/(?:episode|حلقة)-(\d+)/i);
                episodeNumber = epNumMatch ? epNumMatch[1] : null;
            } else {
                animeTitle = lastSegment.split(/-(episode|حلقة)-\d+/i)[0] || lastSegment;
                const epNumMatch = lastSegment.match(/(?:episode|حلقة)-(\d+)/i);
                episodeNumber = epNumMatch ? epNumMatch[1] : null;
            }
        }

        // Remove any remaining Arabic characters
        animeTitle = animeTitle.replace(/[\u0600-\u06FF]/g, '').trim();

        console.log('Extracted anime title:', animeTitle);
        console.log('Extracted episode number:', episodeNumber);

        return {
            animeTitle: animeTitle.replace(/-/g, ' ').trim(),
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