import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [isClicked, setIsClicked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [message, setMessage] = useState('');
  const [xp, setXp] = useState(0);

  // Cihazın mobil olup olmadığını kontrol eden fonksiyon
  const isMobileDevice = () => {
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
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
    if (isMobileDevice()) {
      // Mobil cihazsa, Concordium mobil uygulamasına yönlendir
      window.location.href = 'https://apps.apple.com/us/app/concordium-wallet/id1568889674'; // iOS için
      // Android yönlendirmesi: https://play.google.com/store/apps/details?id=com.concordium.wallet
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
      setMessage('Cüzdan doğrulaması başarısız.');
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
        {isClicked ? 'Geri Sayım Başladı' : 'Tıkla'}
      </button>
      
      {isClicked && (
        <div className="timer">
          Geri sayım: {formatTime(timeLeft)}
        </div>
      )}

      {/* Cüzdan Açma Bölümü */}
      <div className="concordium-wallet">
        <h2>Concordium Cüzdan Aç (Mobil/Web)</h2>
        <button onClick={redirectToWallet}>Cüzdan Aç</button>
        <p>{message}</p>
        {xp > 0 && <p>Toplam XP: {xp}</p>}
      </div>

      {/* Concordium Bilgi Bölümü */}
      <div className="concordium-info">
        <h2>Concordium'u Takip Et</h2>
        <p>Daha fazla bilgi almak ve Concordium ile ilgili güncellemeleri takip etmek için:</p>
        <ul>
          <li>
            <a href="https://www.concordium.com" target="_blank" rel="noopener noreferrer">
              Concordium Resmi Web Sitesi
            </a>
          </li>
          <li>
            <a href="https://www.twitter.com/concordium" target="_blank" rel="noopener noreferrer">
              Concordium Twitter Hesabı
            </a>
          </li>
         
        </ul>
      </div>
    </div>
  );
}

export default App;
