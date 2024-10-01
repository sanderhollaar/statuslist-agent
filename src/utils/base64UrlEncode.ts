export function base64UrlEncode(buffer: Uint8Array): string {
    return btoa(Array.from(buffer, b => String.fromCharCode(b)).join(''))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}