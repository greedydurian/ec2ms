import fs from 'fs';
import crypto from 'crypto';
import inquirer from 'inquirer';

const algorithm = 'aes-256-cbc';

export async function getUserPassphrase(customMessage = 'Enter your passphrase:') {
    const { passphrase } = await inquirer.prompt([
        {
            type: 'password',
            name: 'passphrase',
            message: customMessage,
        },
    ]);
    return passphrase;
}

function getKeyFromPassphrase(passphrase) {
    return crypto.pbkdf2Sync(passphrase, 'your-salt', 100000, 32, 'sha512');
}

export async function saveSession(sessionData, passphrase) {
    const key = getKeyFromPassphrase(passphrase);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(sessionData), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const encryptedSessionData = {
        iv: iv.toString('hex'),
        content: encrypted,
    };

    fs.writeFileSync('session.json', JSON.stringify(encryptedSessionData));
}

export async function loadSession(passphrase = null) {
    if (fs.existsSync('session.json')) {
        const encryptedSessionDataRaw = fs.readFileSync('session.json', 'utf8');
        if (!encryptedSessionDataRaw) {
            console.log('Session file is empty. Starting a new session.');
            return null;
        }

        const encryptedSessionData = JSON.parse(encryptedSessionDataRaw);
        
        if (!encryptedSessionData.iv || !encryptedSessionData.content) {
            console.log('Session file is corrupted. Starting a new session.');
            return null;
        }

        if (!passphrase) {
            throw new Error('Passphrase required to decrypt session.');
        }

        const key = getKeyFromPassphrase(passphrase);

        const decipher = crypto.createDecipheriv(
            algorithm, 
            key, 
            Buffer.from(encryptedSessionData.iv, 'hex')
        );

        let decrypted = decipher.update(encryptedSessionData.content, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } else {
        console.log('No session file found. Starting a new session.');
        return null;
    }
}
