const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const fs = require('fs');

function loadAllowedPlayers() {
    try {
        const data = fs.readFileSync('allowedPlayers.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.log('প্লেয়ার তালিকা লোড করতে সমস্যা হয়েছে:', err.message);
        return [];
    }
}

function createBot() {
    const bot = mineflayer.createBot({
        host: 'Botcahn106-2zz6.aternos.me',
        port: 22756,
        username: 'sara1634',
    });

    bot.on('login', () => {
        console.log('বট সার্ভারে লগইন করেছে!');
    });

    bot.on('kicked', (reason) => {
        console.log(`কিক করা হয়েছে: ${reason}`);
        setTimeout(createBot, 5000);
    });

    bot.on('entityHurt', (entity) => {
        if (entity === bot.entity) {
            const attacker = bot.nearestEntity((e) => e !== bot.entity && (e.type === 'hostile' || e.type === 'player'));
            if (attacker) {
                bot.chat('আমাকে আক্রমণ করছিস? ধর!');
                bot.attack(attacker);
            }
        }
    });

    bot.on('time', () => {
        if (bot.time.isNight) {
            goToSleep(bot);
        }
    });

    setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }
    }, 5000);

    let targetPlayer = null;

    bot.on('chat', (username, message) => {
        const allowedPlayers = loadAllowedPlayers();
        if (!allowedPlayers.includes(username)) return;

        if (message === 'follow') {
            const player = bot.players[username]?.entity;
            if (player) {
                targetPlayer = player;
                bot.chat(`আমি এখন আপনাকে ফলো করছি, ${username}`);
                startFollowing();
            }
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

                fillArea(bot, startX, startY, startZ, endX, endY, endZ, blockName);
            }
        }
    });

    function startFollowing() {
        if (!targetPlayer) return;

        bot.lookAt(targetPlayer.position.offset(0, targetPlayer.height, 0));
        bot.setControlState('forward', true);

        setTimeout(startFollowing, 500);
    }

    async function goToSleep(bot) {
        const mcData = require('minecraft-data')(bot.version);
        const bedBlock = bot.findBlock({
            matching: mcData.blocksByName.bed.id,
            maxDistance: 5
        });

        if (bedBlock) {
            try {
                await bot.sleep(bedBlock);
                bot.chat('আমি ঘুমাচ্ছি, গুড নাইট!');
            } catch (err) {
                console.log(`ঘুমাতে সমস্যা হয়েছে: ${err.message}`);
            }
        }
    }

    async function fillArea(bot, startX, startY, startZ, endX, endY, endZ, blockName) {
        const mcData = require('minecraft-data')(bot.version);
        const block = mcData.blocksByName[blockName];
        
        if (!block) {
            bot.chat(`ব্লকটি পাওয়া যায়নি: ${blockName}`);
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
                    } catch(err) {
                        console.log(`ব্লক বসাতে সমস্যা হয়েছে: ${err.message}`);
                    }
                }
            }
        }
    }
}

createBot();
