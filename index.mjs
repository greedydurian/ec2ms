import os from 'os';
import inquirer from 'inquirer';
import shell from 'shelljs';
import { spawn } from 'child_process'; // Import the spawn function

async function askForInstance() {
    return await inquirer.prompt([
        {
            type: 'input',
            name: 'address',
            message: 'Enter the EC2 address:'
        },
        {
            type: 'input',
            name: 'username',
            message: 'Enter the SSH username for this instance:',
            default: 'ubuntu'
        }
    ]);
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