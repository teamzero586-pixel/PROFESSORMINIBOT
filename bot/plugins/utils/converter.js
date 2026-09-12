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

/**
 * Converts an audio Buffer (any ffmpeg-readable format — m4a, ogg, wav, etc.)
 * into an MP3 Buffer. `sourceExt` is only used to pick a sensible temp
 * filename; ffmpeg detects the real format from the file content itself.
 */
async function toAudio(buffer, sourceExt = 'm4a') {
    const tmp = os.tmpdir();
    const inPath = path.join(tmp, `conv_in_${Date.now()}.${sourceExt}`);
    const outPath = path.join(tmp, `conv_out_${Date.now()}.mp3`);
    fs.writeFileSync(inPath, buffer);
    try {
        await runFfmpeg(['-y', '-i', inPath, '-vn', '-ar', '44100', '-ac', '2', '-b:a', '128k', outPath]);
        return fs.readFileSync(outPath);
    } finally {
        try { fs.unlinkSync(inPath); } catch (e) {}
        try { fs.unlinkSync(outPath); } catch (e) {}
    }
}

module.exports = { toAudio };
