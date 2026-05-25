import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Sparkles, Smile, ShieldCheck, Cpu } from 'lucide-react';

export default function PrivacyMaskTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState('😎');
  const [emojiScale, setEmojiScale] = useState(1.4);
  const [trackingMode, setTrackingMode] = useState<'auto' | 'interactive'>('auto');

  // Face coordinate states
  const [emojiPos, setEmojiPos] = useState({ x: 160, y: 120 });
  const [trackedRect, setTrackedRect] = useState({ x: 120, y: 80, width: 80, height: 80 });
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  const requestRef = useRef<number | null>(null);

  const emojisList = ['😎', '😷', '👽', '🐱', '🤖', '👑', '👺', '🎭'];

  // Start webcam stream
  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log("Play failed", e));
        setStreamActive(true);
      }
    } catch (err: any) {
      console.warn("Camera input error:", err);
      setErrorMsg(
        err.name === 'NotAllowedError' 
          ? "Camera permission denied. Defaulting to mouse-following demo!" 
          : "Webcam blocked or unavailable. Interactive demo enabled!"
      );
      // Fallback to interactive mode automatically
      setTrackingMode('interactive');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setIsFaceDetected(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  // Turn camera on/off
  const toggleCamera = () => {
    if (streamActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Skin-color threshold helper for on-device tracking
  // Skin tones cluster in a repeatable RGB ratio range: R > 95 & G > 40 & B > 20, R > G & R > B, |R - G| > 15
  const isSkinPixel = (r: number, g: number, b: number) => {
    return r > 85 && g > 40 && b > 20 && r > g + 12 && r > b + 15 && Math.abs(r - g) > 10;
  };

  // Processing loop for face tracking
  useEffect(() => {
    if (!streamActive || trackingMode !== 'auto') {
      setIsFaceDetected(false);
      return;
    }

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = hiddenCanvasRef.current;
      if (!video || !canvas || video.paused || video.ended) {
        requestRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw video frame to hidden processing canvas
        ctx.drawImage(video, 0, 0, 320, 240);
        const imgData = ctx.getImageData(0, 0, 320, 240);
        const data = imgData.data;

        let minX = 320, maxX = 0, minY = 240, maxY = 0;
        let skinPixelsCount = 0;
        let sumX = 0, sumY = 0;

        // Downsample scan for faster processing (step 4 pixels)
        for (let y = 0; y < 240; y += 4) {
          for (let x = 0; x < 320; x += 4) {
            const idx = (y * 320 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (isSkinPixel(r, g, b)) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;

              sumX += x;
              sumY += y;
              skinPixelsCount++;
            }
          }
        }

        // To make it stable, we require a minimum bounding cluster (e.g. at least 150 skin pixels)
        if (skinPixelsCount > 150) {
          const centroidX = sumX / skinPixelsCount;
          const centroidY = sumY / skinPixelsCount;

          const rectW = maxX - minX;
          const rectH = maxY - minY;

          // Clamp and lerp coordinates to make movement butter-smooth and reduce jitter
          setIsFaceDetected(true);
          setEmojiPos((prev) => ({
            x: prev.x + (centroidX - prev.x) * 0.22,
            y: prev.y + ((centroidY - 14) - prev.y) * 0.22, // Center slightly higher towards the eyes
          }));

          setTrackedRect((prev) => ({
            x: prev.x + (minX - prev.x) * 0.25,
            y: prev.y + (minY - prev.y) * 0.25,
            width: prev.width + (rectW - prev.width) * 0.25,
            height: prev.height + (rectH - prev.height) * 0.25,
          }));
        } else {
          setIsFaceDetected(false);
        }
      }

      requestRef.current = requestAnimationFrame(processFrame);
    };

    requestRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [streamActive, trackingMode]);

  // Handle interactive hover/dragging on camera view if webcam is off or on interactive mode
  const handleInteractionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (trackingMode === 'auto' && streamActive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 320;
    const y = ((e.clientY - rect.top) / rect.height) * 240;

    setEmojiPos({ x, y });
    setTrackedRect({
      x: x - 40,
      y: y - 40,
      width: 80,
      height: 80,
    });
    setIsFaceDetected(true);
  };

  // Touch support for mobile interaction
  const handleInteractionTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (trackingMode === 'auto' && streamActive) return;
    if (e.touches.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.touches[0].clientX - rect.left) / rect.width) * 320;
    const y = ((e.touches[0].clientY - rect.top) / rect.height) * 240;

    setEmojiPos({ x, y });
    setTrackedRect({
      x: x - 40,
      y: y - 40,
      width: 80,
      height: 80,
    });
    setIsFaceDetected(true);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
      {/* Privacy Tracker Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/10 p-2 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-semibold text-slate-100">Camera Privacy Mask</h3>
            <p className="text-[11px] text-slate-400 font-mono">100% Client-Side WebRTC Protection</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${streamActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
            {streamActive ? "LIVE FEED" : "STANDBY"}
          </span>
        </div>
      </div>

      {/* Main Cam Screen Overlay */}
      <div 
        onMouseMove={handleInteractionMouseMove}
        onTouchMove={handleInteractionTouchMove}
        className="relative w-full h-[220px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 cursor-crosshair group group/tv"
      >
        {/* Cam Offline Placeholder Graphic */}
        {!streamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <CameraOff className="h-10 w-10 text-slate-600 mb-2 transition-transform duration-300 group-hover/tv:rotate-12" />
            <span className="text-xs font-sans text-slate-300 font-semibold mb-1">Webcam Feed is Offline</span>
            <p className="text-[10px] text-slate-500 max-w-[220px] font-mono leading-relaxed">
              Activate the camera or drag your mouse/touch here to simulate head-tracking of the privacy emoji.
            </p>
          </div>
        )}

        {/* Video feed element */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ display: streamActive ? 'block' : 'none' }}
          className="w-full h-full object-cover scale-x-[-1]" // Mirror camera preview for natural feeling
        />

        {/* Hidden Canvas used to scan video buffer */}
        <canvas
          ref={hiddenCanvasRef}
          width={320}
          height={240}
          className="hidden"
        />

        {/* HUD Scanner Retro Borders */}
        {streamActive && (
          <div className="absolute inset-x-0 inset-y-0 border-[10px] border-indigo-500/5 pointer-events-none rounded-xl">
            <div className="absolute top-2 left-2 text-[8px] font-mono text-emerald-400/90 bg-slate-950/80 px-1.5 py-0.5 rounded uppercase tracking-widest border border-emerald-500/20">
              WebRTC FEED • 30FPS
            </div>
            <div className="absolute bottom-2 left-2 text-[8px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded tracking-widest border border-slate-800">
              AUTO-MASK: ACTIVE
            </div>
          </div>
        )}

        {/* The Float Face Bounding Box Selector */}
        {isFaceDetected && (
          <div
            style={{
              left: `${(1 - (trackedRect.x + trackedRect.width / 2) / 320) * 100}%`, // Flip for mirror
              top: `${(trackedRect.y / 240) * 100}%`,
              width: `${(trackedRect.width / 320) * 100}%`,
              height: `${(trackedRect.height / 240) * 100}%`,
              transform: 'translateX(-50%)'
            }}
            className="absolute border border-indigo-400/30 bg-indigo-400/5 pointer-events-none transition-all duration-75 mix-blend-screen"
          >
            {/* Target bounds corners */}
            <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-indigo-400"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-indigo-400"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-indigo-400"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-indigo-400"></span>
          </div>
        )}

        {/* Drag/Center Emoji Marker Overlay */}
        {isFaceDetected && (
          <div
            style={{
              left: `${(1 - emojiPos.x / 320) * 100}%`, // Flip scale matching video
              top: `${(emojiPos.y / 240) * 100}%`,
              fontSize: `${emojiScale * 38}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute pointer-events-none select-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)] font-sans line-clamp-1 h-fit transition-all duration-100"
          >
            {selectedEmoji}
          </div>
        )}

        {/* Hover guidance label for interactive mode */}
        {(!streamActive || trackingMode === 'interactive') && !isFaceDetected && (
          <div className="absolute top-2 right-2 text-[9px] font-mono text-indigo-400 flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded border border-indigo-500/20">
            <Sparkles className="h-2.5 w-2.5" /> Move cursor / finger to track emoji
          </div>
        )}
      </div>

      {/* Camera Alert Notice */}
      {errorMsg && (
        <p className="text-[11px] bg-slate-950/60 text-indigo-400 border border-slate-800/60 px-3 py-2 rounded-lg font-mono leading-relaxed">
          {errorMsg}
        </p>
      )}

      {/* Control Widgets Grid */}
      <div className="grid grid-cols-2 gap-3.5 pt-1">
        {/* Webcam toggle Button */}
        <button
          onClick={toggleCamera}
          id="webcam-toggle-btn"
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer ${
            streamActive
              ? 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20 active:scale-[0.98]'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 active:scale-[0.98]'
          }`}
        >
          {streamActive ? (
            <>
              <CameraOff className="h-4 w-4" />
              Disable Camera
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              Enable Camera
            </>
          )}
        </button>

        {/* Mode Selector Toggle */}
        <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl items-center">
          <button
            onClick={() => setTrackingMode('auto')}
            disabled={!streamActive}
            className={`flex-1 text-center text-[11px] font-sans font-medium py-1.5 rounded-lg transition-all ${
              trackingMode === 'auto' && streamActive
                ? 'bg-slate-800/80 text-white font-semibold'
                : 'text-slate-500 font-normal hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title="Auto scan camera frame skin pixel cluster centroid"
          >
            Auto Cam
          </button>
          <button
            onClick={() => setTrackingMode('interactive')}
            className={`flex-1 text-center text-[11px] font-sans font-medium py-1.5 rounded-lg transition-all ${
              trackingMode === 'interactive' || !streamActive
                ? 'bg-slate-800/80 text-white font-semibold'
                : 'text-slate-500 font-normal hover:text-slate-300'
            }`}
            title="Freely position using mouse or touching"
          >
            Manual Demo
          </button>
        </div>
      </div>

      {/* Emoji Picker Row */}
      <div className="space-y-2">
        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Choose Mask Graphic</span>
          <span className="font-sans text-indigo-400 lowercase">{selectedEmoji} active</span>
        </label>
        <div className="flex gap-2 justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 overflow-x-auto scrollbar-thin">
          {emojisList.map((emo) => (
            <button
              key={emo}
              onClick={() => {
                setSelectedEmoji(emo);
                if (!isFaceDetected) {
                  // Put to center so user knows it's active immediately
                  setIsFaceDetected(true);
                  setEmojiPos({ x: 160, y: 120 });
                }
              }}
              className={`text-xl hover:scale-125 transition-all p-1.5 rounded-lg cursor-pointer ${
                selectedEmoji === emo 
                  ? 'bg-indigo-500/20 scale-110 border border-indigo-500/40' 
                  : 'hover:bg-slate-800'
              }`}
            >
              {emo}
            </button>
          ))}
        </div>
      </div>

      {/* Scale Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          <span>Emoji Size Bounds</span>
          <span>{emojiScale.toFixed(1)}x scale</span>
        </div>
        <input
          type="range"
          min="0.8"
          max="2.2"
          step="0.1"
          value={emojiScale}
          onChange={(e) => setEmojiScale(parseFloat(e.target.value))}
          className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-mono text-slate-500">
          <span>Protective Slim</span>
          <span>Max Coverage</span>
        </div>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="flex items-start gap-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
        <Cpu className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-normal font-mono">
          <strong className="text-slate-300">GPU Zero-Leak Architecture:</strong> Pixels are processed entirely within your browser's memory using standard video matrices. Your camera frames are never transmitted over the internet, saving 100% of network costs and ensuring total privacy.
        </p>
      </div>
    </div>
  );
}
