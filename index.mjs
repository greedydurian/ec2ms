import os from 'os';
import inquirer from 'inquirer';
import { spawn } from 'child_process'; // Import the spawn function
import fs from 'fs';
import { loadCachedTags, saveCachedTags, manageTags, cachedTags } from './cacheManager.js';
import { monitor, logToFile } from './monitor.js';

(async function() {
    console.log(`
    __  ____  __ ____   ____   ___ 
   / / / /\ \/ // __ \ / __ \ /   |
  / /_/ /  \  // / / // /_/ // /| |
 / __  /   / // /_/ // _, _// ___ |
/_/ /_/   /_//_____//_/ |_|/_/  |_|
                                   
 `   );
})();


async function mainMenu() {
    const { mainChoice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mainChoice',
            message: 'What would you like to do?',
            choices: ['Manage EC2 instances', 'Manage saved tags', 'Exit'],
            default: 'Manage EC2 instances'
        }
    ]);

    switch (mainChoice) {
        case 'Manage EC2 instances':
            await manageEC2Instances();
            break;
        case 'Manage saved tags':
            await manageTags();
            break;
        case 'Exit':
            console.log('Goodbye!');
            process.exit(0);
    }

    await mainMenu();  // loop back to main menu
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
        username: username.username,

    };

    cachedTags[tag] = instance;
    saveCachedTags();

    return instance;
}

async function manageEC2Instances() {
    const instances = [];
    const { numOfInstances } = await inquirer.prompt({
        type: 'input',
        name: 'numOfInstances',
        message: 'How many EC2 instances do you want to connect to?',
        validate: value => !isNaN(value) ? true : 'Please enter a valid number.'
    });

    const { pem } = await inquirer.prompt({
        type: 'input',
        name: 'pem',
        message: 'Enter the PEM file name (with path if not in the current directory):'
    });


    for (let i = 0; i < numOfInstances; i++) {
        const instance = await askForInstance();
        instances.push(instance);
    }

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
            let scriptPart = 'tell application "Terminal" to do script "ssh -v -i ' + pem + ' ' + username + '@' + address.trim() + '"';
            args = ['-e', scriptPart];

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

        let shellOption;

        if (osChoice === 'macOS') {
            shellOption = false;
        } else if (osChoice === 'Windows') {
            shellOption = true;
        }
    
        console.log('executing', cmd, args);
        spawn(cmd, args, {
            shell: shellOption,
            detached: true, 
            stdio: 'inherit'
        }).unref(); 
    }
};

/////////////////////////////////////   Logging ////////////////////////////////////////////////   
    
// Event listener for 'connectionAttempt'
monitor.on('connectionAttempt', (address, username) => {
    const logEntry = `Attempting connection to ${address} as ${username}`;
    console.log(logEntry);
    logToFile('Connection Attempt', logEntry);  // Append the log entry to a file
});

monitor.on('reconnected', (address) => {
    const logEntry = `Successfully reconnected to ${address}.`;
    console.log(`Successfully reconnected to ${address}.`);
    logToFile('Connection Attempt', logEntry); 
});

monitor.on('reconnectFailed', (address) => {
    console.error(`Failed to reconnect to ${address} after multiple attempts.`);
    logToFile('Connection Attempt', logEntry);  
});

mainMenu()
