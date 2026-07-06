const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const fs = require('fs');

let bot;
let mcData;
let targetPlayer = null;
let followInterval = null;

function loadAllowedPlayers() {
    try {
        if (!fs.existsSync('allowedPlayers.json')) {
            fs.writeFileSync('allowedPlayers.json', JSON.stringify(["sara1634"]), 'utf8');
        }
        const data = fs.readFileSync('allowedPlayers.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.log('Failed to load player list:', err.message);
        return [];
    }
}

function createBot() {
    if (bot) {
        bot.removeAllListeners();
        try { bot.end(); } catch (e) {}
    }

    bot = mineflayer.createBot({
        host: 'error7769.aternos.me',
        port: 29851,
        username: 'Luna', 
        version: false, 
        auth: 'offline' 
    });

    bot.on('login', () => {
        console.log('Bot successfully logged in to the server!');
        mcData = require('minecraft-data')(bot.version);
    });

    bot.on('kick', (reason) => {
        let kickReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
        console.log(`Kicked. Reason: ${kickReason}. Retrying in 5 seconds...`);
        clearInterval(followInterval);
        setTimeout(createBot, 5000);
    });

    bot.on('error', (err) => {
        console.log(`Connection error: ${err.message}`);
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
            console.log('The server might be offline. Please start (Online) the server from Aternos.');
        }
    });

    bot.on('entityHurt', (entity) => {
        if (entity === bot.entity) {
            const attacker = bot.nearestEntity((e) => e !== bot.entity && (e.type === 'hostile' || e.type === 'player'));
            if (attacker) {
                bot.chat('Attacking me? Take this!');
                bot.attack(attacker);
            }
        }
    });

    bot.on('time', () => {
        if (bot.time && bot.time.isNight) {
            goToSleep();
        }
    });

    const jumpInterval = setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => { if (bot.entity) bot.setControlState('jump', false); }, 500);
        }
    }, 5000);

    bot.on('end', () => {
        clearInterval(jumpInterval);
        clearInterval(followInterval);
        console.log('Disconnected from server. Restarting in 5 seconds...');
        setTimeout(createBot, 5000);
    });

    bot.on('chat', (username, message) => {
        const allowedPlayers = loadAllowedPlayers();
        if (!allowedPlayers.includes(username)) return;

        if (message === 'follow') {
            const player = bot.players[username]?.entity;
            if (player) {
                targetPlayer = player;
                bot.chat(`I am now following you, ${username}`);
                startFollowing();
            } else {
                bot.chat("I can't see you!");
            }
        } else if (message === 'stop') {
            targetPlayer = null;
            clearInterval(followInterval);
            bot.clearControlStates();
            bot.chat('I have stopped following.');
        } else if (message.startsWith('fill')) {
            const args = message.split(' ');
            if (args.length === 8) {
                const startX = parseInt(args[1]);
                const startY = parseInt(args[2]);
                const startZ = parseInt(args[3]);
                const endX = parseInt(args[4]);
                const endY = parseInt(args[5]);
                const endZ = parseInt(args[6]);
                const blockName = args[7];

                fillArea(startX, startY, startZ, endX, endY, endZ, blockName);
            }
        }
    });
}

function startFollowing() {
    clearInterval(followInterval);
    followInterval = setInterval(() => {
        if (!targetPlayer || !bot.entity) {
            clearInterval(followInterval);
            return;
        }
        const distance = bot.entity.position.distanceTo(targetPlayer.position);
        if (distance > 2) {
            bot.lookAt(targetPlayer.position.offset(0, targetPlayer.height, 0));
            bot.setControlState('forward', true);
        } else {
            bot.setControlState('forward', false);
        }
    }, 200);
}

async function goToSleep() {
    if (!mcData) return;
    
    const bedBlock = bot.findBlock({
        matching: (block) => block.name.includes('bed'),
        maxDistance: 5
    });

    if (bedBlock) {
        try {
            await bot.sleep(bedBlock);
            bot.chat("I'm going to sleep, good night!");
        } catch (err) {
            console.log(`Failed to sleep: ${err.message}`);
        }
    }
}

async function fillArea(startX, startY, startZ, endX, endY, endZ, blockName) {
    if (!mcData) return;
    const block = mcData.blocksByName[blockName];
    
    if (!block) {
        bot.chat(`Block not found: ${blockName}`);
        return;
    }

    const blockId = block.id;

    for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
        for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
            for (let z = Math.min(startZ, endZ); z <= Math.max(startZ, endZ); z++) {
                const pos = new Vec3(x, y, z);
                try {
                    await bot.equip(blockId, 'hand');
                    await bot.placeBlock(bot.blockAt(pos), new Vec3(0, 1, 0));
                } catch (err) {
                    console.log(`Error placing block: ${err.message}`);
                }
            }
        }
    }
}

createBot();
