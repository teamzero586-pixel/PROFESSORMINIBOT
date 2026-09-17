/**
 * Tiny text "box" formatter used by some dev/utility commands for
 * consistent boxed output.
 */
function box(title, body, footer) {
    const lines = [
        `╭━━━《 ${title} 》━━━┈⊷`,
        ...String(body).split('\n').map(l => `┃ ${l}`),
        '╰━━━━━━━━━━━━┈⊷'
    ];
    if (footer) lines.push(footer);
    return lines.join('\n');
}

module.exports = { box };
