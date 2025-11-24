import { useState, useRef, useEffect } from "react";
import { Camera, StopCircle, Loader2, XCircle } from "lucide-react";
import { API_URL } from "../../constants/api";

export default function CameraCapture({ darkMode, onDetectionSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  
  const [streaming, setStreaming] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const captureInterval = 1; // Fijo en 1 segundo
  
  // Iniciar cámara
  const startCamera = async () => {
    try {
      setError("");
      console.log("🎥 Solicitando acceso a la cámara...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment"
        }
      });
      
      console.log("✅ Cámara obtenida");
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              console.log("✅ Video reproduciéndose");
              setStreaming(true);
              
              // ✅ INICIAR DETECCIÓN AUTOMÁTICA AL ABRIR LA CÁMARA
              setAutoCapture(true);
              console.log("🔄 Detección automática iniciada (cada 1 segundo)");
            })
            .catch(err => {
              console.error("Error al reproducir video:", err);
              setError("Error al iniciar la reproducción del video");
            });
        };
      }
    } catch (err) {
      console.error("❌ Error al acceder a la cámara:", err);
      if (err.name === 'NotAllowedError') {
        setError("Permiso de cámara denegado. Por favor, permite el acceso a la cámara.");
      } else if (err.name === 'NotFoundError') {
        setError("No se encontró ninguna cámara en el dispositivo.");
      } else {
        setError("No se pudo acceder a la cámara. " + err.message);
      }
    }
  };

  // Detener cámara
  const stopCamera = () => {
    // Detener auto-captura primero
    if (autoCapture) {
      setAutoCapture(false);
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
      console.log("🛑 Cámara detenida");
    }
  };

  // Capturar y detectar placa
  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log("⚠️ Referencias no disponibles");
      return;
    }

    if (videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      console.log("⚠️ Video no listo");
      return;
    }

    if (capturing) {
      console.log("⚠️ Ya hay una captura en proceso");
      return;
    }

    setCapturing(true);
    setError("");

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Image = imageData.split(',')[1];

      console.log("📸 Escaneando placa...");

      const response = await fetch(`${API_URL}/detectar-placa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image })
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Placa detectada:", result.plate);
        
        if (onDetectionSuccess) {
          onDetectionSuccess(result);
        }
        
        setError("");
      } else {
        // No mostrar error si no detecta (es normal en modo auto)
        console.log("⚪ No se detectó placa en este frame");
      }
    } catch (err) {
      console.error("❌ Error en captura:", err);
      // Solo mostrar error si es crítico
      if (!err.message.includes('fetch')) {
        setError("Error al procesar. Verifica los servidores.");
      }
    } finally {
      setCapturing(false);
    }
  };

  // Efecto para auto-captura
  useEffect(() => {
    if (autoCapture && streaming) {
      // Primera captura inmediata
      captureAndDetect();
      
      // Luego cada segundo
      intervalRef.current = setInterval(() => {
        captureAndDetect();
      }, captureInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoCapture, streaming]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Video de la cámara */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${streaming ? 'block' : 'hidden'}`}
        />
        
        {!streaming && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center p-8">
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Cámara detenida</p>
            </div>
          </div>
        )}
        
        {/* Indicador de detección automática */}
        {streaming && autoCapture && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <span className="font-semibold">🔍 ESCANEANDO (cada 1 seg)</span>
          </div>
        )}
        
        {/* Overlay de captura */}
        {capturing && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-semibold">Analizando...</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controles simplificados */}
      <div className="flex gap-3">
        {!streaming ? (
          <button
            onClick={startCamera}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Iniciar Cámara y Detección
          </button>
        ) : (
          <>
            <button
              onClick={captureAndDetect}
              disabled={capturing}
              className={`flex-1 ${
                capturing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2`}
            >
              <Camera className="w-5 h-5" />
              Captura Manual
            </button>
            
            <button
              onClick={stopCamera}
              className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <StopCircle className="w-5 h-5" />
              Detener
            </button>
          </>
        )}
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className={`${
          darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
        } p-4 rounded-lg flex items-center gap-3`}>
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}