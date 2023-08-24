const cacheFilePath = './cachedTags.json';

let cachedTags = {};

export function loadCachedTags() {
    if (fs.existsSync(cacheFilePath)) {
        cachedTags = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    }
}

export function saveCachedTags() {
    fs.writeFileSync(cacheFilePath, JSON.stringify(cachedTags));
}
