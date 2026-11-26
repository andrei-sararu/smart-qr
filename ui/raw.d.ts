declare module '*.html?raw' {const content:string;export default content;}
declare module '*.js?raw' {const content:string;export default content;}
declare module 'qrcode' {const qr:{toString(text:string,options:{type:'svg';width:number;margin:number;errorCorrectionLevel:'M'}):Promise<string>};export default qr;}
declare module '*.css?raw' {const content:string;export default content;}

declare module '*.txt?raw' {const content:string;export default content;}
