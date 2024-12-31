#!/usr/bin/env node

import chalk from 'chalk';
import { execSync } from 'child_process';
import { chmodSync, readdirSync, statSync } from 'fs';
import * as path from "path";

console.log(chalk.bold('Installing dependencies'));
let res = execSync('npm install');

console.log(chalk.bold('Generating client from production Neris API'));
res = execSync('npm run generate');
console.log(chalk.grey(res.toLocaleString()));

console.log(chalk.bold('Running tests'));
res = execSync('npm test run');
console.log(chalk.grey(res.toLocaleString()));

console.log(chalk.bold('Building the api-client library'));
res = execSync('npm run build');

console.log(chalk.bold('Installing tsx globally for tools'));
execSync('npm install -g tsx');

console.log(chalk.bold('Making tools executable'));
function chmodRecursive(dirPath, mode) {
    chmodSync(dirPath, mode);

    readdirSync(dirPath).forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            chmodRecursive(filePath, mode);
        } else {
            chmodSync(filePath, mode);
        }
    });
}

chmodRecursive("./tools", 0o755); // Set permissions to rwxr-xr-x

console.log(chalk.bold.green('\n✨ Success ✨ \n'));
