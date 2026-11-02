import React, { useState, useEffect, useRef } from 'react';
import { Room } from '../types.ts';
import { X, Camera, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
  rooms: Room[];
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ rooms, onClose, onSelectRoom }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualSelectedRoomId, setManualSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Attempt camera access
    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Trình duyệt không hỗ trợ truy cập camera trực tiếp.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err: any) {
        console.warn('Camera access error:', err);
        setCameraError(
          'Không thể khởi động camera hoặc chưa được cấp quyền. Bạn có thể chọn phòng nhanh từ danh sách bên dưới.'
        );
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSimulateScan = (roomId: string) => {
    onSelectRoom(roomId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-slate-900 text-base">Quét mã QR Khu vực 5S</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-5 flex flex-col items-center">
          {cameraActive ? (
            <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Overlay targeting frame */}
              <div className="absolute inset-0 border-2 border-white/40 flex items-center justify-center p-8">
                <div className="w-56 h-56 border-2 border-emerald-400 rounded-xl relative shadow-lg animate-pulse">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
                </div>
              </div>
              <p className="absolute bottom-3 text-xs text-white/90 bg-black/60 px-3 py-1 rounded-full font-medium">
                Hướng camera về phía mã QR tại phòng
              </p>
            </div>
          ) : (
            <div className="w-full aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-xs text-slate-600 max-w-xs">{cameraError}</p>
            </div>
          )}

          {/* Quick Room Select Fallback as strictly required */}
          <div className="w-full mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hoặc chọn trực tiếp phòng để kiểm tra:
            </label>
            <div className="flex gap-2">
              <select
                value={manualSelectedRoomId}
                onChange={(e) => setManualSelectedRoomId(e.target.value)}
                className="flex-1 bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.id}] {r.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleSimulateScan(manualSelectedRoomId)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <span>Mở</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
