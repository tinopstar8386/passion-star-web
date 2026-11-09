import fs from 'fs';

const content = fs.readFileSync('2fa.html', 'utf8');
const lines = content.split('\n');

for (let i = 620; i <= 655; i++) {
    console.log(`${i}: ${lines[i-1]}`);
}
