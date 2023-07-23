const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const fileToTail = process.argv[2];

if (!fileToTail) {
    console.error('Error: Please provide the filename/path as a command-line argument.');
    console.error('Example: node server.js /path/to/your/file.log');
    process.exit(1);
}

fs.access(fileToTail, fs.constants.R_OK, (err) => {
    if (err) {
        console.error('Error: The specified file is not accessible or does not exist.');
        process.exit(1);
    }

    const indexPath = path.join(__dirname, 'index.html');

    function sendSSEEvent(res, line) {
        res.write(`data: ${line}\n\n`);
    }

    const server = http.createServer((req, res) => {
        if (req.url === '/sse-server') {
            // Set headers for SSE
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });

            const tailProcess = exec(`tail -n 0 -F ${fileToTail}`);
            const rl = readline.createInterface({
                input: tailProcess.stdout,
                output: process.stdout,
                terminal: false,
            });
            rl.on('line', (line) => {
                sendSSEEvent(res, line);
            });
            tailProcess.on('error', (error) => {
                console.error('Tail process error:', error);
            });
            req.on('close', () => {
                console.log('Client disconnected');
                tailProcess.kill();
            });
        } else if (req.url === '/') {
            fs.readFile(indexPath, (err, content) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading index.html');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content);
                }
            });
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    const PORT = 3000;
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
