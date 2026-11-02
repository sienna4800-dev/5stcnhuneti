import React, { useEffect, useState, useRef } from 'react';
import { Room } from '../types.ts';
import { generateQRCodeDataUrl } from '../utils/qrCodeGenerator.ts';
import { Download, Printer, X, Copy, Check, QrCode, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface RoomQRModalProps {
  room: Room;
  onClose: () => void;
  onInspectNow: (room: Room) => void;
}

export const RoomQRModal: React.FC<RoomQRModalProps> = ({ room, onClose, onInspectNow }) => {
  const { settings } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Check if operational HTTPS URL is configured
  const isCustomUrlConfigured = Boolean(
    settings.publicAppUrl && settings.publicAppUrl.trim().startsWith('https://')
  );

  const baseUrl = isCustomUrlConfigured
    ? settings.publicAppUrl!.trim().replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : 'https://uneti-5s.edu.vn');

  // Stable URL without any sensitive user tokens
  const targetUrl = `${baseUrl}?room=${encodeURIComponent(room.id)}`;

  useEffect(() => {
    generateQRCodeDataUrl(targetUrl).then(setQrDataUrl).catch(console.error);
  }, [targetUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `5S_QR_${room.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-slate-900 text-base">Thẻ QR Định danh 5S</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ mã QR"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if publicAppUrl is not yet configured */}
        {!isCustomUrlConfigured && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">QR thử nghiệm — chưa cấu hình URL vận hành:</span>
              <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                Mã QR này đang sử dụng địa chỉ môi trường xem trước (preview run.app). Vui lòng cấu hình "URL vận hành công khai" (định dạng HTTPS) trong phần Cài đặt trước khi in dán cố định tại phòng.
              </p>
            </div>
          </div>
        )}

        {/* Printable Card Area */}
        <div className="p-4 sm:p-6 flex flex-col items-center text-center" ref={printRef}>
          {/* Card Border Frame for Printing/Lamination */}
          <div className="w-full bg-linear-to-b from-blue-50/60 to-white p-5 rounded-2xl border-2 border-blue-800 shadow-sm flex flex-col items-center">
            {/* Institution Badge */}
            <p className="text-[10px] font-bold tracking-widest text-blue-900 uppercase">
              {settings.universityName}
            </p>
            <h4 className="text-xs font-extrabold text-blue-800 uppercase tracking-wide mt-0.5">
              {settings.facultyName}
            </h4>

            {/* Room Name & Internal Code */}
            <div className="mt-4 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 bg-blue-700 text-white rounded-md tracking-wider">
                MÃ NỘI BỘ: {room.id}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1.5">{room.name}</h2>
              {room.location && (
                <p className="text-xs text-slate-500 font-medium">Vị trí: {room.location}</p>
              )}
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs my-2">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Mã QR định danh ${room.name}`}
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                />
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-xs text-slate-400">
                  Đang tạo mã QR...
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-600 mt-1">
              Quét mã bằng camera điện thoại hoặc ứng dụng 5S để mở trực tiếp phiếu kiểm tra khu vực này.
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-full">
              {targetUrl}
            </p>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép!' : 'Chép link'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPNG}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải ảnh PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In thẻ</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onInspectNow(room);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <span>Bắt đầu kiểm tra ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
