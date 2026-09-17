// ── Crash-safety nets — registered before ANYTHING else in the app,
//    since this is the true entry point. ──
process.on('uncaughtException', (err) => {
    console.error(`[Uncaught exception] ${err.message}`);
    console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
    console.error(`[Unhandled rejection] ${reason?.message || reason}`);
});

// ── Global HTTP safety net ──
// Many plugins call third-party download/AI APIs directly via axios
// without setting their own timeout. Since every `require('axios')`
// across the whole project resolves to this same module instance,
// setting a default here means NO outgoing request anywhere in the
// bot can hang forever waiting on a dead/slow API — it fails after
// 25s instead, so the command can report an error instead of
// silently freezing. Any file that sets its own `timeout` still
// takes priority over this default.
const axios = require('axios');
axios.defaults.timeout = 25000;

const express = require('express');
const app = express();
const port = process.env.PORT || 8000;
const bodyParser = require('body-parser');
const cors = require('cors');

app.use(cors());
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' }));
app.use('/media', express.static(require('path').join(__dirname, 'media')));

const pairRouter = require('./main');
app.use('/', pairRouter);

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});

// ============================================
// 💤 KEEP-ALIVE SELF-PING
// ============================================
// Heroku Eco dynos sleep after 30 minutes with NO incoming web traffic.
// A WhatsApp bot's actual work (messages) never touches Heroku's router,
// so a bot that's quietly working in the background still looks "idle"
// to Heroku and gets put to sleep — which kills every active WhatsApp
// connection at once. This pings the app's own public URL every 20
// minutes (safely under the 30-min threshold) to keep it awake.
//
// NOTE: this is a mitigation, not a 100% guarantee — if the dyno somehow
// does go to sleep, this code isn't running either (nothing is), so it
// can't wake itself back up. For an actual 100%-reliable fix, also point
// a free external monitor (UptimeRobot, cron-job.org, etc.) at
// `${APP_URL}/ping` every ~20 minutes — being outside Heroku entirely,
// that keeps working even in the one case this can't.
const config = require('./config');
if (config.APP_URL) {
    const KEEP_ALIVE_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
    const https = require('https');
    setInterval(() => {
        try {
            https.get(`${config.APP_URL}/ping`, (res) => {
                res.resume(); // drain response, don't hold the socket open
            }).on('error', (e) => {
                console.error('[KeepAlive] Self-ping failed:', e.message);
            });
        } catch (e) {
            console.error('[KeepAlive] Self-ping error:', e.message);
        }
    }, KEEP_ALIVE_INTERVAL_MS);
    console.log(`💤 Keep-alive self-ping active → ${config.APP_URL}/ping every 20 min`);
} else {
    console.log('⚠️  APP_URL not set — keep-alive self-ping disabled. Set APP_URL in Config Vars, and/or add an external uptime monitor, or this dyno may sleep and drop all WhatsApp connections.');
}

module.exports = app;
