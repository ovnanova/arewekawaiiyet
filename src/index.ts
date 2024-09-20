import { AtpAgent } from '@atproto/api';
import axios from 'axios';
import { CronJob } from 'cron';
import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import util from 'util';

dotenv.config();

const execPromise = util.promisify(exec);

const agent = new AtpAgent({
    service: 'https://bsky.social',
})

async function fetchRawFile(): Promise<string> {
    try {
        const response = await axios.get(process.env.GITHUB_RAW_URL!);
        return response.data;
    } catch (error: any) {
        console.error('Error fetching raw file:', error.message);
        throw error;
    }
}

function updateStaticHTML(status: string): void {
    try {
        const htmlPath = path.resolve(process.env.HTML_PATH!);
        let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

        htmlContent = htmlContent.replace(/<span id="status">.*<\/span>/, `<span id="status">${status}</span>`);

        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log('Updated static HTML with status:', status);
    } catch (error: any) {
        console.error('Error updating static HTML:', error.message);
    }
}

function updateLogo(): void {
    try {
        fs.copyFileSync(path.resolve(process.env.KAWAII_LOGO_PATH!), path.resolve(process.env.LOGO_PATH!));
        console.log('Logo updated successfully.');
    } catch (error: any) {
        console.error('Error updating logo:', error.message);
    }
}

async function commitAndPushChanges(message: string): Promise<void> {
    try {
        await execPromise('git add .');
        console.log('Staged changes.');

        await execPromise(`git commit -m "${message}"`);
        console.log('Committed changes.');

        await execPromise('git push origin main');
        console.log('Pushed changes to GitHub.');
    } catch (error: any) {
        if (error.stderr && error.stderr.includes('nothing to commit')) {
            console.log('No changes to commit.');
        } else {
            console.error('Error committing and pushing changes:', error.stderr || error.message);
            throw error;
        }
    }
}

async function main() {
    try {
        const fileContent = await fetchRawFile();
        const searchRegex = /const\s+kawaii\s*=\s*useKawaiiMode\(\)/;
        const hasLine = searchRegex.test(fileContent);

        if (hasLine) {
            await agent.login({ identifier: process.env.BLUESKY_USERNAME!, password: process.env.BLUESKY_PASSWORD! })
            await agent.post({
                text: "bluesky is かわいい again we are so back °˖✧◝٩( ᐛ )و◜✧˖°"
            });
            console.log("Posted YES")

            updateStaticHTML('YES');
            updateLogo();
            await commitAndPushChanges('bluesky is かわいい again we are so back');

            process.exit(0);
        } else {
            await agent.login({ identifier: process.env.BLUESKY_USERNAME!, password: process.env.BLUESKY_PASSWORD! })
            await agent.post({
                text: "no ╥﹏╥"
            });
            console.log("Posted NO")
        }
    }
    catch (error) {
        console.error('An error occurred in the main function:', error);
        process.exit(1);
    }
}

main();

const scheduleExpression = '0 */4 * * *';

const job = new CronJob(scheduleExpression, main);

job.start();