var fs = require('fs');
var fname, stream;
var stat = {}
var sh = require('child_process');

function log(o) {
  var ts = (new Date()).toISOString().slice(0,13); 
  var fname2 = __dirname + "/logs/log-" + ts + '.jsonl';
  if(fname2 !== fname) {
    if(stream) { 
      stream.end(); 
      setTimeout(() =>
        sh.exec('/usr/bin/xz -9 ' + __dirname + '/' + fname),
        3000);
      fs.writeFile(__dirname + "/public/" + ts.replace(/[^-0-9]/g,'-') + '.json', 
        JSON.stringify(stat), 'utf-8');
      stat = {};
    }
    fname = fname2;
    stream = fs.createWriteStream(fname, {flags: 'a'});
  }
  stat[o.type] = (stat[o.type] | 0) + 1;
  stream.write(JSON.stringify(o) + "\n");
}

require('http').createServer(function(req, res) {
  var o = req.headers;
  if(req.method === "POST") {
    var s = "";
    var logId = ("" + Math.random()).slice(2);
    o.logId = logId;
    o.timestamp = (new Date()).toISOString();
    o.type = "incoming/entries";
    log(o);
    req.on('data', data => s += data);
    req.on('end', function() {
      res.end("");
      try {
        var a = JSON.parse(s);
        if(!Array.isArray(a)) {
          throw Error;
        }
        a.forEach(function(o) {
          if(o.constructor !== Object || o.type === "incoming/entries") {
            log({logId, type: "incoming/error", data: o});
          } else {
            o.logId = logId;
            log(o);
          }
        });
      } catch(e) {
        log({logId,
          type: "incoming/error",
          data: s});
      }
    });
  } else {
    if(req.url.startsWith("/log.js?")) {
      res.end("");
      o.type = "get/" + req.url.slice(8);
      o.timestamp = (new Date()).toISOString();
      log(o);
    } else {
      fs.readFile( __dirname + "/public/" + 
            req.url.slice(1).replace(/[^-a-zA-Z0-9._]/g, ""), 
          (err, data) => res.end(data));
    }
  }
}).listen(8888, o=>console.log('Listening on port 8888'));