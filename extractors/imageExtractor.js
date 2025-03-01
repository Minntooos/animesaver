/**
 * Extracts cover image URL from various anime sites
 * @param {string} url - The anime episode URL
 * @param {string} domContent - The DOM content of the page
 * @param {string} animeName - The anime name for fallback
 * @returns {string} - The cover image URL
 */
export default function extractImageUrl(url, domContent, animeName) {
    // Default fallback image URL
    let imageUrl = `https://gogocdn.net/cover/${animeName}.png`;
    
    try {
        if (!domContent) return imageUrl;
        
        // Extract domain to determine which site-specific logic to use
        const domain = new URL(url).hostname;
        
        // GoGoAnime.by
        if (domain.includes('gogoanime.by')) {
            const imgMatch = domContent.match(/<div class="thumb">\s*<img src="([^"]+)"/);
            if (imgMatch && imgMatch[1]) {
                console.log('Extracted image URL from gogoanime.by:', imgMatch[1]);
                return imgMatch[1];
            }
        }
        
        // AniWatchTV.to
        else if (domain.includes('aniwatchtv.to')) {
            const imgMatch = domContent.match(/<div class="film-poster">\s*<img src="([^"]+)" class="film-poster-img"/);
            if (imgMatch && imgMatch[1]) {
                console.log('Extracted image URL from aniwatchtv.to:', imgMatch[1]);
                return imgMatch[1];
            }
        } else if (domain.includes('9animetv.to')) {
            const imgMatch = domContent.match(/<div class="film-poster">\s*<img src="([^"]+)" class="film-poster-img"/);
            if (imgMatch && imgMatch[1]) {
                console.log('Extracted image URL from 9animetv.to:', imgMatch[1]);
                return imgMatch[1];
            }
        }    else if (domain.includes('animeslayer.art')) {
            const imgMatch = domContent.match(/<div class="thumb">\s*<a href="[^"]*"><img[^>]*src="([^"]+)"[^>]*alt="[^"]*"/);
            if (imgMatch && imgMatch[1]) {
                console.log('Extracted image URL from animeslayer.art:', imgMatch[1]);
                return imgMatch[1];
            }
        }
        
        // Add more site-specific extractors here as needed
        
    } catch (error) {
        console.error('Error extracting image URL:', error);
    }
    
    return imageUrl;
}