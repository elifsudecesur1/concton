const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const { WalletClient } = require('@concordium/web-sdk'); // Concordium SDK ile entegrasyon

// Telegram bot token
const botToken = '6990731896:AAFPu6kIiCJL-O-9KU9sKANofgq8KJv45qE';
const bot = new TelegramBot(botToken, { polling: true });

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB bağlantısı
mongoose.connect('mongodb://localhost:27017/telegram_click_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Kullanıcı şemasını oluşturma
const userSchema = new mongoose.Schema({
  username: String,
  points: { type: Number, default: 0 },
  lastClickTime: { type: Date, default: null },
  walletAddress: { type: String, default: null }, // Cüzdan adresi
  xp: { type: Number, default: 0 }, // XP puanı
});

const User = mongoose.model('User', userSchema); // Model oluşturma

// Concordium Node'a bağlan
const client = new WalletClient('https://wallet-proxy.mainnet.concordium.com');

// Cüzdan doğrulama fonksiyonu
async function verifyConcordiumWallet(walletAddress) {
  try {
    const accountInfo = await client.getAccountInfo(walletAddress);
    return accountInfo ? true : false; // Cüzdan bilgisi varsa cüzdan açılmış demektir
  } catch (error) {
    console.error('Cüzdan doğrulanamadı:', error);
    return false;
  }
}

// Kullanıcının günlük tıklama iznini kontrol eden fonksiyon
async function canClickAgain(username) {
  const user = await User.findOne({ username });
  const now = new Date();
  if (!user) {
    return true; // İlk kez tıklıyorsa tıklayabilir
  }
  const lastClick = new Date(user.lastClickTime);
  const diff = now - lastClick; // Zaman farkı
  const oneDay = 24 * 60 * 60 * 1000; // 1 gün (milisaniye)
  return diff >= oneDay; // 1 gün geçmişse tekrar tıklayabilir
}

// Kullanıcının tıklama işlemini kaydetme ve puanını artırma
async function handleUserClick(username) {
  let user = await User.findOne({ username });

  if (!user) {
    // Kullanıcı yoksa yeni kullanıcı oluştur
    user = new User({ username, points: 1, lastClickTime: new Date() });
  } else {
    // Kullanıcı varsa puanını artır ve tıklama zamanını güncelle
    user.points += 1;
    user.lastClickTime = new Date();
  }

  await user.save(); // Veritabanına kaydet
  return user;
}

// Telegram botu üzerinden tıklama işlemi
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || `user_${msg.from.id}`; // Kullanıcı adını al, yoksa id'yi kullan

  if (await canClickAgain(username)) {
    const user = await handleUserClick(username);
    bot.sendMessage(chatId, `Başarıyla tıkladınız! Toplam puanınız: ${user.points}`);
  } else {
    bot.sendMessage(chatId, 'Günde sadece bir kez tıklayabilirsiniz. Lütfen yarın tekrar deneyin.');
  }
});

// Front-End'den gelen tıklama isteği API'si
app.post('/api/click', async (req, res) => {
  const { username } = req.body;

  if (await canClickAgain(username)) {
    const user = await handleUserClick(username);
    res.json({ success: true, points: user.points });
  } else {
    res.json({ success: false, message: 'Günde sadece bir kez tıklayabilirsiniz.' });
  }
});

// Kullanıcının puanını alma API'si
app.get('/api/points/:username', async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username });
  
  if (user) {
    res.json({ points: user.points });
  } else {
    res.json({ points: 0 });
  }
});

// Cüzdan açma işlemi API'si
app.post('/api/open-wallet', async (req, res) => {
  const { username, walletAddress } = req.body;

  // Concordium cüzdan adresini doğrula
  const isWalletValid = await verifyConcordiumWallet(walletAddress);

  if (!isWalletValid) {
    return res.status(400).json({ success: false, message: 'Cüzdan doğrulaması başarısız.' });
  }

  let user = await User.findOne({ username });

  if (!user) {
    // Kullanıcı yoksa yeni kullanıcı oluştur ve cüzdan adresini kaydet
    user = new User({ username, walletAddress, xp: 2 }); // +2 XP veriyoruz
  } else {
    // Kullanıcı varsa cüzdan adresini kaydet ve XP'ye +2 ekle
    user.walletAddress = walletAddress;
    user.xp += 2;
  }

  await user.save(); // Veritabanına kaydet
  res.json({ success: true, message: 'Cüzdan doğrulandı ve +2 XP kazanıldı!', xp: user.xp, walletAddress: user.walletAddress });
});

// Kullanıcı bilgilerini alma API'si
app.get('/api/user/:username', async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username });
  
  if (user) {
    res.json({ 
      points: user.points,
      xp: user.xp, // XP puanı
      walletAddress: user.walletAddress // Cüzdan adresi
    });
  } else {
    res.json({ points: 0, xp: 0, walletAddress: null });
  }
});

// Sunucuyu başlat
app.listen(5000, () => {
  console.log('Back-End 5000 portunda çalışıyor.');
});
