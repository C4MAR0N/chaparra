import { createServer } from 'vite';
import config from '../vite.config.ts';
const server=await createServer({...config,configFile:false});
try {
 await server.listen();
 const address=server.httpServer.address();
 if(typeof address!=='object'||address.port!==5180)throw new Error('Puerto incorrecto');
 const page=await fetch('http://127.0.0.1:5180');
 if(page.status!==200)throw new Error('El servidor no responde');
 const entry=await fetch('http://127.0.0.1:5180/src/main.tsx');
 const body=await entry.text();if(entry.status!==200)throw new Error(body);
 const dependencies=[...body.matchAll(/"(\/node_modules\/\.vite\/deps\/[^"?]+[^\"]*)"/g)].map(match=>match[1]);
 if(!dependencies.length)throw new Error('No hay dependencias optimizadas en la entrada');
 for(const dependency of dependencies){const result=await fetch('http://127.0.0.1:5180'+dependency);if(result.status!==200)throw new Error(await result.text());}
 console.log('Servidor de desarrollo comprobado en http://localhost:5180 · HTML, TSX y dependencias optimizadas: 200');
}finally{await server.close();}
