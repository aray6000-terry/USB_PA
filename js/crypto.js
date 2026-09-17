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

    // 標準 SHA-256 純 JS 算算法 (支援 file:/// 與非 HTTPS 環境)
    sha256Pure: function(ascii) {
      function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
      }
      var mathPow = Math.pow;
      var maxWord = mathPow(2, 32);
      var lengthProperty = 'length';
      var i, j;
      var result = '';
      var words = [];
      var asciiBitLength = ascii[lengthProperty] * 8;
      
      var hash = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
      ];
      
      var k = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
      ];

      ascii = unescape(encodeURIComponent(ascii || ''));
      asciiBitLength = ascii[lengthProperty] * 8;
      ascii += '\x80';
      while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
      for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
      }
      words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
      words[words[lengthProperty]] = (asciiBitLength);
      
      for (j = 0; j < words[lengthProperty];) {
        var w = words.slice(j, j += 16);
        var oldHash = hash.slice(0);
        for (i = 0; i < 64; i++) {
          var w15 = w[i - 15], w2 = w[i - 2];
          var a = hash[0], e = hash[4];
          var temp1 = hash[7]
            + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
            + ((e & hash[5]) ^ ((~e) & hash[6]))
            + k[i]
            + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0);
          var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
            + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          
          hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
        }
        for (i = 0; i < 8; i++) {
          hash[i] = (hash[i] + oldHash[i]) | 0;
        }
      }
      for (i = 0; i < 8; i++) {
        for (j = 3; j >= 0; j--) {
          var b = (hash[i] >> (j * 8)) & 255;
          result += ((b < 16) ? '0' : '') + b.toString(16);
        }
      }
      return result;
    },

    // 產生標準 SHA-256 數位簽章 (優先使用 Web Crypto API，支援離線與無安全上下文環境)
    generateHash: function(content) {
      if (!content) return Promise.resolve('');
      try {
        if (window.crypto && window.crypto.subtle && window.isSecureContext) {
          var data = new TextEncoder().encode(content);
          return window.crypto.subtle.digest('SHA-256', data).then(function(digest) {
            return CryptoService.ab2hex(digest);
          }).catch(function() {
            return CryptoService.sha256Pure(content);
          });
        }
      } catch (e) {
        // 忽略並使用 pure JS fallback
      }
      return Promise.resolve(CryptoService.sha256Pure(content));
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
