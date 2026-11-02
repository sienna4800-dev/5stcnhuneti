import QRCode from 'qrcode';

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1e3a8a', // Deep Blue
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}
