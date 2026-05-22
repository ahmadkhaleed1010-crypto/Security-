const { Client, GatewayIntentBits, PermissionsBitField, AuditLogEvent } = require('discord.js');

// 1. تعريف البوت مع تصحيح الخطأ (إضافة intents:)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

const spamMap = new Map();

client.once('ready', () => {
    console.log(`[STATUS] البوت شغال الآن وجاهز للحماية باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const discordInvite = /(discord\.gg|discord\.com\/invite)/i;
    if (discordInvite.test(message.content)) {
        await message.delete().catch(() => {});
        await message.member.ban({
            reason: 'إرسال رابط ديسكورد تخريبي'
        }).catch(() => {});
        return;
    }

    if (message.mentions.users.size >= 5) {
        await message.delete().catch(() => {});
        await message.member.timeout(30 * 60 * 1000, 'سبام منشن').catch(() => {});
        return;
    }

    const authorId = message.author.id;
    const currentTime = Date.now();
    const timeLimit = 5000;
    const maxMessages = 5;

    if (!spamMap.has(authorId)) {
        spamMap.set(authorId, { count: 1, lastMessageTime: currentTime });
    } else {
        const userData = spamMap.get(authorId);
        if (currentTime - userData.lastMessageTime < timeLimit) {
            userData.count++;
            if (userData.count >= maxMessages) {
                await message.delete().catch(() => {});
                await message.member.timeout(10 * 60 * 1000, 'إرسال رسائل سريعة (سبام)').catch(() => {});
                spamMap.delete(authorId);
                return;
            }
        } else {
            userData.count = 1;
            userData.lastMessageTime = currentTime;
        }
    }
});

async function punishWrecker(guild, memberId, reason) {
    try {
        const member = await guild.members.fetch(memberId).catch(() => null);
        if (!member) return;

        if (memberId === guild.ownerId || memberId === client.user.id) return;

        if (!member.manageable) {
            console.log(`[WARNING] لا يمكن للبوت معاقبة ${member.user.tag}، تأكد من رفع رتبة البوت لأعلى شيء!`);
            return;
        }

        const rolesToRemove = [];
        member.roles.cache.forEach(role => {
            if (role.name === '@everyone') return;
            if (role.permissions.has(PermissionsBitField.Flags.Administrator) ||
                role.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
                role.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                rolesToRemove.push(role.id);
            }
        });

        if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove).catch(() => {});
        }

        await guild.members.ban(memberId, { reason: `نظام الحماية: ${reason}` }).catch(() => {});
        console.log(`[SUCCESS] تم تبنيد المخرب ${member.user.tag} بسبب: ${reason}`);

    } catch (error) {
        console.error(error);
    }
}

client.on('channelDelete', async (channel) => {
    const fetchedLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
    if (!fetchedLogs) return;
    const log = fetchedLogs.entries.first();
    if (!log) return;
    if (log.executor.id === channel.guild.ownerId || log.executor.id === client.user.id) return;
    await punishWrecker(channel.guild, log.executor.id, 'حذف روم بدون إذن');
});

client.on('guildMemberRemove', async (member) => {
    const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick }).catch(() => null);
    if (!fetchedLogs) return;
    const log = fetchedLogs.entries.first();
    if (!log) return;
    if (log.executor.id === member.guild.ownerId || log.executor.id === client.user.id) return;
    await punishWrecker(member.guild, log.executor.id, 'طرد عضو بدون إذن');
});

client.on('guildBanAdd', async (ban) => {
    const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
    if (!fetchedLogs) return;
    const log = fetchedLogs.entries.first();
    if (!log) return;
    if (log.executor.id === ban.guild.ownerId || log.executor.id === client.user.id) return;
    await punishWrecker(ban.guild, log.executor.id, 'تبنيد الأعضاء بدون إذن');
});

// ضع التوكن الجديد الخاص بك هنا
client.login('MTUwNzQwMTkzOTY0NDg0NjM1MA.G1r7xR.pgOzrR3jh4ZfqdTlIyjbz2LGF_0fVvNBkGNvos');
