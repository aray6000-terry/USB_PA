/**
 * 優德美科技 - 本機靜態伺服器 (相容 Node.js v6 ~ 最新版本，零第三方相依)
 */
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var PORT = process.env.PORT || 3000;
var PUBLIC_DIR = path.join(__dirname, 'public');

// 若 public 目錄不存在，則以根目錄作為公開靜態資源
var ROOT_DIR = __dirname;

var MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

var server = http.createServer(function (req, res) {
  var parsedUrl = url.parse(req.url);
  var pathname = parsedUrl.pathname;
  
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  var safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  var filePath = path.join(ROOT_DIR, safePath);
  
  // 檢查檔案是否存在
  fs.stat(filePath, function (err, stats) {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + pathname);
      return;
    }
    
    var ext = path.extname(filePath).toLowerCase();
    var contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    
    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

function startServer(port) {
  server.listen(port, function () {
    console.log('====================================================');
    console.log('優德美績效考核與專案積分管理系統伺服器已啟動！');
    console.log('請於瀏覽器開啟： http://localhost:' + port);
    console.log('====================================================');
  });
}

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    var nextPort = PORT + 1;
    if (PORT === 3000) nextPort = 8080;
    else if (PORT === 8080) nextPort = 8888;
    console.log('連接埠 ' + PORT + ' 已被佔用，嘗試切換至 ' + nextPort + '...');
    PORT = nextPort;
    startServer(PORT);
  } else {
    console.error('伺服器錯誤:', err);
  }
});

startServer(PORT);
