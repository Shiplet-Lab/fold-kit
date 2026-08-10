import http from "node:http";
http.createServer((_, response) => response.end("ok")).listen(process.env.PORT || 3000);
