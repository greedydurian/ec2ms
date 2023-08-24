import os from 'os';
import inquirer from 'inquirer';
import shell from 'shelljs';
import { spawn } from 'child_process'; // Import the spawn function
import fs from 'fs';

const cacheFilePath = './cachedTags.json';

let cachedTags = {};

function loadCachedTags() {
    if (fs.existsSync(cacheFilePath)) {
        cachedTags = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    }
}

function saveCachedTags() {
    fs.writeFileSync(cacheFilePath, JSON.stringify(cachedTags));
}


async function askForInstance() {
    loadCachedTags();

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Do you want to use a saved tag or enter new values?',
            choices: [...Object.keys(cachedTags), 'Enter new values'],
            default: 'Enter new values'
        }
    ]);

    if (action !== 'Enter new values') {
        return cachedTags[action];
    }

    const address = await inquirer.prompt({
        type: 'input',
        name: 'address',
        message: 'Enter the EC2 address:'
    });

    const username = await inquirer.prompt({
        type: 'input',
        name: 'username',
        message: 'Enter the SSH username for this instance:',
        default: 'ubuntu'
    });

    const { tag } = await inquirer.prompt({
        type: 'input',
        name: 'tag',
        message: 'Save these inputs under which tag?'
    });

    const instance = {
        address: address.address,
        username: username.username
    };

    cachedTags[tag] = instance;
    saveCachedTags();

    return instance;
}


(async function() {
    const instances = [];
    const { numOfInstances } = await inquirer.prompt({
        type: 'input',
        name: 'numOfInstances',
        message: 'How many EC2 instances do you want to connect to?',
        validate: value => !isNaN(value) ? true : 'Please enter a valid number.'
    });

    for (let i = 0; i < numOfInstances; i++) {
        const instance = await askForInstance();
        instances.push(instance);
    }

    const { pem } = await inquirer.prompt({
        type: 'input',
        name: 'pem',
        message: 'Enter the PEM file name (with path if not in the current directory):'
    });

    const { osChoice } = await inquirer.prompt({
        type: 'list',
        name: 'osChoice',
        message: 'Choose your Operating System:',
        choices: ['macOS', 'Linux', 'Windows'],
        default: os.platform() === 'darwin' ? 'macOS' : (os.platform() === 'win32' ? 'Windows' : 'Linux')
    });

    for (let { address, username } of instances) {
        let cmd, args;
        const sshCommand = `ssh -v -i "${pem}" ${username}@${address.trim()}`;
    
        if (osChoice === 'macOS') {
            cmd = 'osascript';
            args = ['-e', `tell app "Terminal" to do script "ssh -v -i \\"${pem}\\" ${username}@${address.trim()}"`];
        } else if (osChoice === 'Linux') {
            cmd = 'gnome-terminal';
            args = ['--', `${sshCommand}`];
        } else if (osChoice === 'Windows') {
            cmd = 'cmd.exe';
            args = [
                '/c',
                `start cmd.exe /k ssh -v -i "${pem}" ${username}@${address.trim()} && pause`
            ];
        }
    
        console.log(cmd, args);
        spawn(cmd, args, {
            shell: true,
            detached: true, 
            stdio: 'ignore'  // This change may help with the immediate termination problem
        }).unref(); 
    }
})();