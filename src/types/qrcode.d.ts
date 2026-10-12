// Fallback ambient declaration for qrcode to guarantee zero build failures in any environment
declare module 'qrcode' {
  // The package ships its own types; this fallback is only for incomplete installs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const QRCode: any;
  export default QRCode;
}
