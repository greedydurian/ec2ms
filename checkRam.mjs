#!/usr/bin/env node

import inquirer from 'inquirer';
import { Client } from 'ssh2';
import fs from 'fs';

export async function checkRAM({ address, username, pem }) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', function () {
      console.log('SSH Client :: ready');
      conn.exec('free -m', function (err, stream) {
        if (err) reject(err);
        let output = '';
        stream.on('close', function () {
          console.log('Stream :: close');
          conn.end();
          resolve(output);
        })
        .on('data', function (data) {
          output += data.toString();
        });
      });
    }).connect({
      host: address,
      port: 22,
      username: username,
      privateKey: fs.readFileSync(pem)
    });
  });
}

// Function to get EC2 details and PEM file
export async function getPemFile() {
    const { pemPath } = await inquirer.prompt([
        {
            type: 'input',
            name: 'pemPath',
            message: 'Enter the path to your PEM file:'
        }
    ]);
    return pemPath;
}

export function displayRamBarChart(ramDetails) {
  const lines = ramDetails.split('\n');
  if (lines.length < 2) {
    return;
  }

  const headers = lines[0].trim().split(/\s+/);
  const values = lines[1].trim().split(/\s+/).slice(1);

  if (headers.length !== values.length) {

    return;
  }

  const maxBarLength = 50; // you can adjust this
  const maxValue = Math.max(...values.slice(1).map(Number));

  console.log('RAM Usage Bar Chart:');
  for (let i = 0; i < headers.length; i++) { // Start from 0 now since we sliced the values array
    const label = headers[i];
    const value = Number(values[i]);
    const barLength = Math.round((value / maxValue) * maxBarLength);
    const bar = '#'.repeat(barLength);
    console.log(`${label}: [${bar}] ${value} MB`);
  }
}

// Function to prompt user for EC2 details and check RAM
export async function checkRAMandMemory() {
    // Ask for EC2 Address
    const { address } = await inquirer.prompt({
        type: 'input',
        name: 'address',
        message: 'Enter the EC2 address (e.g., ec2-33-44-55-66.ap-southeast-1.compute.amazonaws.com):'
    });

    // Ask for EC2 SSH Username
    const { username } = await inquirer.prompt({
        type: 'input',
        name: 'username',
        message: 'Enter the SSH username for this instance (e.g., ubuntu):',
        default: 'ubuntu'
    });

    // Ask for path to PEM file
    const pem = await getPemFile();

    // Fetch and display RAM
    const ram = await checkRAM({ address, username, pem });
    displayRamBarChart(ram);

    console.log(`RAM details for ${address}: `, ram);
}
