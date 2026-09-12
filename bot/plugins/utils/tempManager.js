const fs = require('fs');
const os = require('os');
const path = require('path');

const TEMP_DIR = path.join(os.tmpdir(), 'ahmadshahzad-md-temp');

function getTempDir() {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    return TEMP_DIR;
}

function deleteTempFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (e) {
        // non-fatal — temp files get cleaned by the OS eventually anyway
    }
}

module.exports = { getTempDir, deleteTempFile };
