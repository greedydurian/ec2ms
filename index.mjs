import os from 'os';
import inquirer from 'inquirer';
import { spawn } from 'child_process'; // Import the spawn function
import fs from 'fs';
import { loadCachedTags, saveCachedTags, manageTags, cachedTags } from './cacheManager.js';
import { monitor, logToFile } from './monitor.js';
import { loadSession, saveSession, getUserPassphrase} from './session.js';



(async function() {
    console.log(`
    __  ____  __ ____   ____   ___ 
   / / / /\ \/ // __ \ / __ \ /   |
  / /_/ /  \  // / / // /_/ // /| |
 / __  /   / // /_/ // _, _// ___ |
/_/ /_/   /_//_____//_/ |_|/_/  |_|
                                   
 `   );
})();

let isBusy = false;
let passphrase = null;

async function initializeSession() {
    let sessionData = null; 

    if (fs.existsSync('session.json')) {
        passphrase = await getUserPassphrase('Enter your passphrase to unlock the saved session:');
        sessionData = await loadSession(passphrase); 

        if (!sessionData) {
            console.log('Failed to load session. Starting a new one.');
        }
    } else {
        passphrase = await getUserPassphrase('Set your passphrase:');
        console.log('\x1b[31m%s\x1b[0m', '⚠️ WARNING: Do not forget your passphrase, as it is required to decrypt your session. IF YOU FORGET IT, IT WILL NOT BE RECOVERABLE ⚠️'); 

    }
    await mainMenu(sessionData || null); // call main menu
}

async function mainMenu(sessionData) {
    if (isBusy) {
        return; // Skip calling mainMenu if isBusy is true
    }

    const { mainChoice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mainChoice',
            message: 'What would you like to do?',
            choices: ['Continue from last session', 'Manage EC2 instances', 'Manage saved tags', 'Exit'],
            default: 'Manage EC2 instances'
        }
    ]);

    switch (mainChoice) {
        case 'Continue from last session':
            if (sessionData) {
                await manageEC2Instances(sessionData.instances, sessionData.pem);
            } else {
                console.log('No valid session data found. Starting a new session.');
                await manageEC2Instances();
            }
            break;
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

    await mainMenu();  // Loop back to main menu
}

async function askForInstance() {
    loadCachedTags();

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Do you want to use a saved tag or enter new values? (Eg. test1) ',
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
        message: 'Enter the EC2 address (Eg. ec2-33-44-55-66.ap-southeast-1.compute.amazonaws.com):'
    });

    const username = await inquirer.prompt({
        type: 'input',
        name: 'username',
        message: 'Enter the SSH username for this instance (Eg. ubuntu):',
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

async function manageEC2Instances(savedInstances = null, savedPem = null) {
    let instances;
    let pem;
    isBusy = true;

    if (savedInstances && savedPem) {
        console.log('Continuing from last session...');
        instances = savedInstances;
        pem = savedPem;
        // Use instances and pem to directly connect to EC2
    } else {
        instances = [];
        
        const { numOfInstances } = await inquirer.prompt([
            {
                type: 'input',
                name: 'numOfInstances',
                message: 'How many EC2 instances do you want to connect to?',
                validate: value => !isNaN(value) ? true : 'Please enter a valid number.'
            }
        ]);

        const pemPrompt = await inquirer.prompt([
            {
                type: 'input',
                name: 'pem',
                message: 'Enter the PEM file name (with path if not in the current directory):'
            }
        ]);
        pem = pemPrompt.pem;

        for (let i = 0; i < numOfInstances; i++) {
            const instance = await askForInstance();
            instances.push(instance);
        }
        
        // Save the session data after collecting all necessary details
        saveSession({ instances, pem }, passphrase); 
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
    isBusy = false; 
    monitor.emit('finishedManaging');
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


(async () => {
    try {
        await initializeSession(); // Initiating the main menu for the first time
    } catch (err) {
        console.error('An error occurred:', err);
    }
})();