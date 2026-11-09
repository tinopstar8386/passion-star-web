import fs from 'fs';

const content = fs.readFileSync('2fa.html', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
    if (l.includes('id="loginScreen"')) {
        console.log(`Line ${i + 1}`);
        console.log(lines.slice(i, i + 35).map((x, j) => `${i + j + 1}: ${x}`).join('\n'));
    }
});
