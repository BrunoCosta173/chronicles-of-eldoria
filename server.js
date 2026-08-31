const http=require('http'), fs=require('fs'), path=require('path');
const ROOT=__dirname, PORT=8080;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.json':'application/json'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/') p='/index.html';
  const file=path.join(ROOT,path.normalize(p));
  if(!file.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
  fs.readFile(file,(err,data)=>{
    if(err){ res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(data);
  });
}).listen(PORT,'127.0.0.1',()=>console.log('Eldoria server on http://localhost:'+PORT));
