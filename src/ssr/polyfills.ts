/**
 * QuickJS polyfills for atob/btoa.
 * 
 * QuickJS has neither browser's atob/btoa nor Node.js's Buffer.
 * The `entities` package (Vue SSR dependency since Vue 3.5.26) uses:
 *   typeof atob == "function" ? atob(s) : Buffer.from(s, "base64")...
 * 
 * By injecting atob, the code takes the browser path and never touches Buffer.
 */
export const quickjsPolyfills = `
if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = function(s) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    s = String(s).replace(/=+$/, '');
    for (var i = 0; i < s.length;) {
      var a = chars.indexOf(s.charAt(i++));
      var b = chars.indexOf(s.charAt(i++));
      var c = chars.indexOf(s.charAt(i++));
      var d = chars.indexOf(s.charAt(i++));
      var n = (a << 18) | (b << 12) | (c << 6) | d;
      output += String.fromCharCode((n >> 16) & 0xFF);
      if (c !== 64) output += String.fromCharCode((n >> 8) & 0xFF);
      if (d !== 64) output += String.fromCharCode(n & 0xFF);
    }
    return output;
  };
}
if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = function(s) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    s = String(s);
    for (var i = 0; i < s.length;) {
      var a = s.charCodeAt(i++);
      var b = i < s.length ? s.charCodeAt(i++) : NaN;
      var c = i < s.length ? s.charCodeAt(i++) : NaN;
      output += chars.charAt(a >> 2);
      output += chars.charAt(((a & 3) << 4) | (b >> 4));
      output += isNaN(b) ? '=' : chars.charAt(((b & 15) << 2) | (c >> 6));
      output += isNaN(c) ? '=' : chars.charAt(c & 63);
    }
    return output;
  };
}
`;
