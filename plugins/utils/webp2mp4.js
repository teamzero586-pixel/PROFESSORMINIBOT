const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

function runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath, args);
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-300)}`));
        });
    });
}

async function webp2mp4(buffer) {
    const tmp = os.tmpdir();
    const inPath = path.join(tmp, `in_${Date.now()}.webp`);
    const outPath = path.join(tmp, `out_${Date.now()}.mp4`);
    fs.writeFileSync(inPath, buffer);
    try {
        await runFfmpeg(['-y', '-i', inPath, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', outPath]);
        return fs.readFileSync(outPath);
    } finally {
        try { fs.unlinkSync(inPath); } catch (e) {}
        try { fs.unlinkSync(outPath); } catch (e) {}
    }
}

async function webp2png(buffer) {
    const tmp = os.tmpdir();
    const inPath = path.join(tmp, `in_${Date.now()}.webp`);
    const outPath = path.join(tmp, `out_${Date.now()}.png`);
    fs.writeFileSync(inPath, buffer);
    try {
        await runFfmpeg(['-y', '-i', inPath, outPath]);
        return fs.readFileSync(outPath);
    } finally {
        try { fs.unlinkSync(inPath); } catch (e) {}
        try { fs.unlinkSync(outPath); } catch (e) {}
    }
}

module.exports = { webp2mp4, webp2png };
