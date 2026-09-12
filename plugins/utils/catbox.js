const axios = require('axios');
const FormData = require('form-data');

/**
 * Uploads a Buffer to catbox.moe (free, no-signup file host) and returns
 * the public URL. Used by commands that need a real URL for a generated
 * image/file (e.g. to hand off to a third-party API that requires a URL
 * input rather than raw bytes).
 */
async function uploadToCatbox(buffer, filename = 'file') {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, filename);

        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        const url = typeof res.data === 'string' ? res.data.trim() : '';
        if (!url.startsWith('http')) {
            throw new Error('Catbox did not return a valid URL');
        }
        return url;
    } catch (e) {
        throw new Error(`Upload failed: ${e.message}`);
    }
}

module.exports = { uploadToCatbox };
