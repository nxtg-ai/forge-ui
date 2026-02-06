/**
 * Device Pairing Component
 * QR code generation and scanning for multi-device session sharing
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "../../utils/browser-logger";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import {
  QrCode,
  Smartphone,
  Monitor,
  Link2,
  Copy,
  Check,
  X,
  RefreshCw,
  Share2,
  Camera,
} from "lucide-react";

interface SessionShareInfo {
  sessionId: string;
  sessionName: string;
  wsUrl: string;
  projectName: string;
  expiresAt: number;
  token?: string;
}

interface DevicePairingProps {
  sessionInfo: SessionShareInfo;
  onClose: () => void;
  onPairDevice?: (deviceId: string) => void;
  className?: string;
}

export const DevicePairing: React.FC<DevicePairingProps> = ({
  sessionInfo,
  onClose,
  onPairDevice,
  className = "",
}) => {
  const [mode, setMode] = useState<"share" | "scan">("share");
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [qrData, setQrData] = useState("");

  // Generate share URL and QR data
  useEffect(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareData = {
      t: "infinity-terminal",
      s: sessionInfo.sessionId,
      w: sessionInfo.wsUrl,
      n: sessionInfo.sessionName,
      p: sessionInfo.projectName,
      e: sessionInfo.expiresAt,
      k: sessionInfo.token,
    };

    const encoded = btoa(JSON.stringify(shareData));
    const url = `${baseUrl}/terminal/join?d=${encodeURIComponent(encoded)}`;

    setShareUrl(url);
    setQrData(JSON.stringify(shareData));
  }, [sessionInfo]);

  // Copy URL to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy:", err);
    }
  }, [shareUrl]);

  // Share via native share API
  const shareNative = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Terminal: ${sessionInfo.sessionName}`,
          text: "Join my Infinity Terminal session",
          url: shareUrl,
        });
      } catch (err) {
        logger.error("Share failed:", err);
      }
    }
  }, [shareUrl, sessionInfo.sessionName]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${className}`}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">Device Pairing</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setMode("share")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              mode === "share"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4" />
              Share
            </span>
          </button>
          <button
            onClick={() => setMode("scan")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              mode === "scan"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" />
              Scan
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {mode === "share" ? (
              <ShareMode
                key="share"
                sessionInfo={sessionInfo}
                shareUrl={shareUrl}
                qrData={qrData}
                copied={copied}
                onCopy={copyToClipboard}
                onShare={shareNative}
              />
            ) : (
              <ScanMode
                key="scan"
                onScan={(data) => {
                  logger.debug("Scanned:", data);
                  // Handle scanned QR code
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Connected Devices */}
        {pairedDevices.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-800 pt-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">
              Connected Devices ({pairedDevices.length})
            </h4>
            <div className="space-y-2">
              {pairedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg"
                >
                  {device.type === "mobile" ? (
                    <Smartphone className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Monitor className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm flex-1 truncate">{device.name}</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Share mode with QR code
interface ShareModeProps {
  sessionInfo: SessionShareInfo;
  shareUrl: string;
  qrData: string;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
}

const ShareMode: React.FC<ShareModeProps> = ({
  sessionInfo,
  shareUrl,
  qrData,
  copied,
  onCopy,
  onShare,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-4"
  >
    {/* Session Info */}
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-sm font-medium">{sessionInfo.sessionName}</span>
      </div>
      <p className="text-xs text-gray-500">
        Project: {sessionInfo.projectName}
      </p>
    </div>

    {/* QR Code Placeholder (would use a QR library in production) */}
    <div className="flex justify-center">
      <div className="w-48 h-48 bg-white rounded-lg p-3 flex items-center justify-center">
        <QRCodeDisplay data={qrData} size={180} />
      </div>
    </div>

    <p className="text-xs text-center text-gray-500">
      Scan this QR code with another device to join the session
    </p>

    {/* URL Copy */}
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 overflow-hidden">
        <p className="text-xs text-gray-400 truncate font-mono">{shareUrl}</p>
      </div>
      <button
        onClick={onCopy}
        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        title="Copy link"
      >
        {copied ? (
          <Check className="w-5 h-5 text-green-400" />
        ) : (
          <Copy className="w-5 h-5 text-gray-400" />
        )}
      </button>
    </div>

    {/* Native Share (mobile) */}
    {typeof navigator !== "undefined" && "share" in navigator && (
      <button
        onClick={onShare}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share via...
      </button>
    )}

    {/* Expiration notice */}
    <p className="text-[10px] text-center text-gray-600">
      Link expires in {Math.round((sessionInfo.expiresAt - Date.now()) / 60000)}{" "}
      minutes
    </p>
  </motion.div>
);

// Scan mode for joining via QR
interface ScanModeProps {
  onScan: (data: string) => void;
}

const ScanMode: React.FC<ScanModeProps> = ({ onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
        }
      } catch (err) {
        logger.error("Camera access denied:", err);
        setHasCamera(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {hasCamera ? (
        <>
          {/* Camera Preview */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-purple-400 rounded-lg">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-400 rounded-br" />
              </div>
            </div>
            {/* Scanning indicator */}
            {isScanning && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 px-3 py-1 bg-black/50 rounded-full text-xs text-white">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Scanning...
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-center text-gray-500">
            Point your camera at a QR code to join a session
          </p>
        </>
      ) : (
        <div className="py-8 text-center">
          <Camera className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Camera access not available</p>
          <p className="text-xs text-gray-500 mt-1">
            Please allow camera access or enter the session link manually
          </p>
        </div>
      )}

      {/* Manual entry fallback */}
      <div className="pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2">Or enter session link:</p>
        <input
          type="url"
          placeholder="Paste session link here..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text.includes("terminal/join")) {
              onScan(text);
            }
          }}
        />
      </div>
    </motion.div>
  );
};

// QR Code display component (simple ASCII fallback - would use qrcode library in production)
const QRCodeDisplay: React.FC<{ data: string; size: number }> = ({
  data,
  size,
}) => {
  // In production, use a library like 'qrcode' or 'qrcode.react'
  // This is a placeholder that shows a visual representation
  return (
    <div
      className="bg-white flex items-center justify-center"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="text-center p-4">
        <QrCode className="w-24 h-24 text-gray-900 mx-auto mb-2" />
        <p className="text-[8px] text-gray-500 font-mono break-all">
          {data.slice(0, 50)}...
        </p>
      </div>
    </div>
  );
};

// Types
interface PairedDevice {
  id: string;
  name: string;
  type: "mobile" | "desktop";
  connectedAt: Date;
}

export default DevicePairing;
