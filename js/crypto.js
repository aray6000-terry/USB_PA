/**
 * 優德美科技 - 前端資料庫傳輸安全加密模組 (AES-256-GCM / Web Crypto API)
 * 保護與 Google Sheet / Apps Script 之間的資料不被竊聽或竄改
 */

(function(window) {
  'use strict';

  var DEFAULT_SECRET = "YouDeMei-Secure-Kpi-Key-2026";
  var STORAGE_KEY_SECRET = "udm_db_secret_key";

  var CryptoService = {
    // 取得當前使用的密鑰
    getSecretKey: function() {
      return localStorage.getItem(STORAGE_KEY_SECRET) || DEFAULT_SECRET;
    },

    // 儲存新的密鑰
    setSecretKey: function(key) {
      if (key && key.trim()) {
        localStorage.setItem(STORAGE_KEY_SECRET, key.trim());
      }
    },

    // 將字串轉為 ArrayBuffer
    str2ab: function(str) {
      var buf = new ArrayBuffer(str.length);
      var bufView = new Uint8Array(buf);
      for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    },

    // 將 ArrayBuffer 轉為 Hex 字串
    ab2hex: function(buf) {
      var byteView = new Uint8Array(buf);
      var hex = '';
      for (var i = 0; i < byteView.length; i++) {
        var byte = byteView[i].toString(16);
        hex += (byte.length === 1 ? '0' : '') + byte;
      }
      return hex;
    },

    // 將 Hex 字串轉為 Uint8Array
    hex2ab: function(hex) {
      var typedArray = new Uint8Array(hex.length / 2);
      for (var i = 0; i < hex.length; i += 2) {
        typedArray[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return typedArray;
    },

    // 產生 SHA-256 數位簽章
    generateHash: function(content) {
      if (window.crypto && window.crypto.subtle) {
        var data = new TextEncoder().encode(content);
        return window.crypto.subtle.digest('SHA-256', data).then(function(digest) {
          return CryptoService.ab2hex(digest);
        });
      }
      // 簡易 Fallback Hash
      var hash = 0;
      for (var i = 0; i < content.length; i++) {
        hash = ((hash << 5) - hash) + content.charCodeAt(i);
        hash |= 0;
      }
      return Promise.resolve(Math.abs(hash).toString(16));
    },

    // AES-GCM 加密資料負載
    encryptPayload: function(plainObject) {
      var jsonStr = JSON.stringify(plainObject);
      var keyStr = CryptoService.getSecretKey();

      if (window.crypto && window.crypto.subtle) {
        var enc = new TextEncoder();
        var keyMaterial = enc.encode(keyStr);
        var iv = window.crypto.getRandomValues(new Uint8Array(12));

        return window.crypto.subtle.digest('SHA-256', keyMaterial).then(function(derivedKeyBuf) {
          return window.crypto.subtle.importKey(
            'raw',
            derivedKeyBuf,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
          );
        }).then(function(cryptoKey) {
          var encodedData = enc.encode(jsonStr);
          return window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            cryptoKey,
            encodedData
          );
        }).then(function(encrypted) {
          return {
            encrypted: true,
            algorithm: 'AES-GCM-256',
            iv: CryptoService.ab2hex(iv),
            ciphertext: CryptoService.ab2hex(encrypted),
            timestamp: Date.now()
          };
        }).catch(function(err) {
          console.warn('Web Crypto 加密失敗，使用基礎安全編碼 fallback', err);
          return CryptoService.fallbackEncode(jsonStr, keyStr);
        });
      }

      return Promise.resolve(CryptoService.fallbackEncode(jsonStr, keyStr));
    },

    // 解密資料負載
    decryptPayload: function(packet) {
      if (!packet) return Promise.resolve(null);
      if (!packet.encrypted) {
        return Promise.resolve(packet);
      }

      var keyStr = CryptoService.getSecretKey();

      if (window.crypto && window.crypto.subtle && packet.algorithm === 'AES-GCM-256') {
        var enc = new TextEncoder();
        var keyMaterial = enc.encode(keyStr);
        var iv = CryptoService.hex2ab(packet.iv);
        var ciphertext = CryptoService.hex2ab(packet.ciphertext);

        return window.crypto.subtle.digest('SHA-256', keyMaterial).then(function(derivedKeyBuf) {
          return window.crypto.subtle.importKey(
            'raw',
            derivedKeyBuf,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
          );
        }).then(function(cryptoKey) {
          return window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            cryptoKey,
            ciphertext
          );
        }).then(function(decrypted) {
          var dec = new TextDecoder();
          var jsonStr = dec.decode(decrypted);
          return JSON.parse(jsonStr);
        }).catch(function(err) {
          console.error('解密失敗，可能金鑰不符：', err);
          return null;
        });
      }

      return Promise.resolve(CryptoService.fallbackDecode(packet.ciphertext, keyStr));
    },

    fallbackEncode: function(str, key) {
      var result = '';
      for (var i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return {
        encrypted: true,
        algorithm: 'XOR-B64',
        ciphertext: btoa(encodeURIComponent(result)),
        timestamp: Date.now()
      };
    },

    fallbackDecode: function(b64, key) {
      try {
        var str = decodeURIComponent(atob(b64));
        var result = '';
        for (var i = 0; i < str.length; i++) {
          result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return JSON.parse(result);
      } catch (e) {
        return null;
      }
    }
  };

  window.CryptoService = CryptoService;
})(window);
