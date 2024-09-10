import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [isClicked, setIsClicked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [message, setMessage] = useState('');
  const [xp, setXp] = useState(0);

  // Cihazın Android olup olmadığını kontrol eden fonksiyon
  const isAndroidDevice = () => {
    return /android/i.test(navigator.userAgent);
  };

  // Tıklama işlemi
  const handleClick = () => {
    if (!isClicked) {
      setIsClicked(true);
      const time = 24 * 60 * 60; // 24 saat
      setTimeLeft(time); // Geri sayımı başlat
    }
  };

  // Her saniye geri sayımı güncelle
  useEffect(() => {
    if (timeLeft === 0) {
      setIsClicked(false); // Geri sayım bittiğinde tıklama sıfırlanır
      return;
    }

    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);

      return () => clearInterval(timer); // Temizleme
    }
  }, [timeLeft]);

  // Geri sayımı saat, dakika ve saniye olarak gösterme
  const formatTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${hours}:${minutes}:${seconds}`;
  };

  // Kullanıcıyı cüzdan extension'ına veya mobil uygulamaya yönlendirme
  const redirectToWallet = () => {
    if (isAndroidDevice()) {
      // Android cihazsa, Concordium mobil uygulamasına yönlendir
      window.location.href = 'https://play.google.com/store/apps/details?id=software.concordium.mobilewallet.seedphrase.mainnet';
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      // iOS cihazsa, Concordium iOS uygulamasına yönlendir
      window.location.href = 'https://apps.apple.com/us/app/concordium-wallet/id1568889674';
    } else {
      // Masaüstü cihazlardaysa, Concordium tarayıcı uzantısını aç
      const extensionUrl = 'https://chrome.google.com/webstore/detail/concordium-wallet/mnnkpffndmickbiakofclnpoiajlegmg';
      window.open(extensionUrl, '_blank'); // Tarayıcı uzantısını yeni bir sekmede aç
    }
  };

  // Cüzdan adresini backend'e gönderip +2 XP kazandırma
  const handleWalletVerification = async (address) => {
    const response = await fetch('http://localhost:5000/api/open-wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'testuser', walletAddress: address }),
    });

    const data = await response.json();
    if (data.success) {
      setMessage(data.message);
      setXp(data.xp); // XP'yi güncelle
    } else {
      setMessage('Wallet verification failed.');
    }
  };

  // Cüzdan adresi geri döndüğünde işlemi otomatik başlat
  const handleWalletAddressReturn = useCallback(() => {
    const query = new URLSearchParams(window.location.search);
    const walletAddressFromUrl = query.get('address'); // URL'den cüzdan adresini al
    if (walletAddressFromUrl) {
      handleWalletVerification(walletAddressFromUrl); // Otomatik doğrulama ve backend'e gönderme
    }
  }, []);

  useEffect(() => {
    // Sayfa yüklendiğinde cüzdan adresini kontrol et
    handleWalletAddressReturn();
  }, [handleWalletAddressReturn]);

  return (
    <div className="App">
      {/* Welcome yazısı yukarıdan aşağıya kayarak inecek */}
      <h1 className="welcome">Welcome</h1>

      <button
        className={`concordium-btn ${isClicked ? 'disabled' : ''}`}
        onClick={handleClick}
        disabled={isClicked}
      >
        {isClicked ? 'Countdown Started' : 'Click Here'}
      </button>
      
      {isClicked && (
        <div className="timer">
          Countdown: {formatTime(timeLeft)}
        </div>
      )}

      {/* Cüzdan Açma Bölümü */}
      <div className="concordium-wallet">
        <h2>Open Concordium Wallet (Mobile/Web)</h2>
        <button onClick={redirectToWallet}>Open Wallet</button>
        <p>{message}</p>
        {xp > 0 && <p>Total XP: {xp}</p>}
      </div>

      {/* Concordium Bilgi Bölümü */}
      <div className="concordium-info">
        <h2>Follow Concordium</h2>
        <p>For more information and updates on Concordium, follow:</p>
        <ul>
          <li>
            <a href="https://www.concordium.com" target="_blank" rel="noopener noreferrer">
              Official Concordium Website
            </a>
          </li>
          <li>
            <a href="https://www.twitter.com/concordium" target="_blank" rel="noopener noreferrer">
              Concordium Twitter Account
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;
