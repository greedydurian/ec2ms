import fs from 'fs';
import inquirer from 'inquirer';

const cacheFilePath = './cachedTags.json';

export let cachedTags = {};

export async function manageTags() {
    loadCachedTags();

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do with the tags?',
            choices: ['Review saved tags', 'Delete a saved tag', 'Back to main menu'],
            default: 'Review saved tags'
        }
    ]);

    if (action === 'Review saved tags') {
        console.log('Current saved tags:', cachedTags);
    } else if (action === 'Delete a saved tag') {
        const { tagToDelete } = await inquirer.prompt([
            {
                type: 'list',
                name: 'tagToDelete',
                message: 'Choose a tag to delete:',
                choices: Object.keys(cachedTags)
            }
        ]);
        deleteTag(tagToDelete);
        console.log(`Tag ${tagToDelete} has been deleted.`);
    } else {
        return;  // Return to the main menu
    }

    await manageTags(); // Loop back to the tag management menu
}

export function loadCachedTags() {
    if (fs.existsSync(cacheFilePath)) {
        cachedTags = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    }
}

export function saveCachedTags() {
    try {
        fs.writeFileSync(cacheFilePath, JSON.stringify(cachedTags, null, 4));
    } catch (error) {
        console.error("Error saving cached tags:", error);
    }
}

export function deleteTag(tag) {
    delete cachedTags[tag];
    saveCachedTags(cachedTags);
}