import { useRef, useState, useEffect } from "react";
import { Camera, Square, Play, Pause, Zap } from "lucide-react";
import { API_URL } from "../../constants/api";

export default function CameraCapture({ darkMode, guardia }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [ultimaDeteccion, setUltimaDeteccion] = useState(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const [modoManual, setModoManual] = useState(true); // NUEVO: Modo manual por defecto
  const [frameCongela, setFrameCongelado] = useState(null); // NUEVO: Frame congelado
  const [procesando, setProcesando] = useState(false);

  // Auto-captura cada 1 segundo (solo si está activada)
  useEffect(() => {
    if (!autoCapture || !streaming || modoManual) return;

    const interval = setInterval(() => {
      captureAndDetect();
    }, 1000);

    return () => clearInterval(interval);
  }, [autoCapture, streaming, modoManual]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play()
          .then(() => {
            console.log("✅ Video reproduciéndose");
            setStreaming(true);
            
            // Si está en modo automático, iniciar detección
            if (!modoManual) {
              setAutoCapture(true);
              console.log("🔄 Detección automática iniciada (cada 1 segundo)");
            }
          })
          .catch((err) => console.error("❌ Error al reproducir video:", err));
      }
    } catch (err) {
      console.error("❌ Error al acceder a la cámara:", err);
      alert("No se pudo acceder a la cámara");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
    setAutoCapture(false);
    setFrameCongelado(null);
  };

  // NUEVO: Congelar frame actual (como presionar ESPACIO en p.py)
  const congelarFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    setFrameCongelado(imageData);
    
    console.log("📸 Frame congelado - Listo para analizar");
  };

  // NUEVO: Analizar frame congelado
  const analizarFrameCongelado = async () => {
    if (!frameCongelado) return;

    setProcesando(true);
    await enviarImagen(frameCongelado);
    setProcesando(false);
  };

  // NUEVO: Descartar frame y tomar otro
  const descartarFrame = () => {
    setFrameCongelado(null);
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || procesando) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.95);

    await enviarImagen(imageData);
  };

  const enviarImagen = async (imageData) => {
    try {
      const blob = await fetch(imageData).then((r) => r.blob());
      const formData = new FormData();
      formData.append("image", blob, "capture.jpg");

      console.log("📤 Enviando imagen al detector...");
      const response = await fetch(`${API_URL}/detectar-placa`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.plate) {
        console.log("✅ Placa detectada:", data.plate);

        const registroData = {
          placa: data.plate,
          guardia_id: guardia?.id || 1,
        };

        const registroResponse = await fetch(`${API_URL}/acceso/manual`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registroData),
        });

        if (registroResponse.ok) {
          const registro = await registroResponse.json();
          setUltimaDeteccion({
            placa: data.plate,
            confianza: data.confidence,
            estado: registro.EstadoAutorizacion,
            timestamp: new Date().toLocaleString("es-MX"),
            propietario: registro.NombreCompleto || "Visitante",
            vehiculo: registro.Marca && registro.Modelo 
              ? `${registro.Marca} ${registro.Modelo}`
              : "No registrado",
          });
        }
      } else {
        console.log("⚠️ No se detectó placa:", data.message);
      }
    } catch (error) {
      console.error("❌ Error en detección:", error);
    }
  };

  // NUEVO: Cambiar entre modo manual y automático
  const toggleModo = () => {
    setModoManual(!modoManual);
    setFrameCongelado(null);
    
    if (modoManual) {
      // Cambiando a automático
      if (streaming) {
        setAutoCapture(true);
      }
    } else {
      // Cambiando a manual
      setAutoCapture(false);
    }
  };

  return (
    <div className={`p-6 ${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Camera className="w-6 h-6" />
          Monitor de Acceso Automático
        </h3>
        
        {/* NUEVO: Selector de modo */}
        <div className="flex gap-2">
          <button
            onClick={toggleModo}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              modoManual
                ? darkMode ? "bg-purple-900 text-purple-300" : "bg-purple-100 text-purple-700"
                : darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"
            }`}
          >
            {modoManual ? "🎯 Modo Manual" : "⚡ Modo Automático"}
          </button>
        </div>
      </div>

      {/* Video/Canvas */}
      <div className="relative mb-4">
        <video
          ref={videoRef}
          className={`w-full h-[500px] bg-black object-cover rounded-lg ${
            frameCongelado ? "hidden" : ""
          }`}
          playsInline
        />
        
        {/* NUEVO: Mostrar frame congelado */}
        {frameCongelado && (
          <img
            src={frameCongelado}
            alt="Frame congelado"
            className="w-full h-[500px] object-cover rounded-lg border-4 border-yellow-500"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {!streaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-center text-white">
              <Camera className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p>Cámara detenida</p>
            </div>
          </div>
        )}

        {/* Indicador de modo */}
        {streaming && !frameCongelado && (
          <div className={`absolute top-4 left-4 px-3 py-1 rounded-lg font-semibold ${
            modoManual
              ? "bg-purple-600 text-white"
              : autoCapture
              ? "bg-green-600 text-white animate-pulse"
              : "bg-gray-600 text-white"
          }`}>
            {modoManual ? "🎯 LISTO - Presiona CAPTURAR" : autoCapture ? "🔍 ESCANEANDO (cada 1 seg)" : "⏸️ PAUSADO"}
          </div>
        )}

        {procesando && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold animate-pulse">
            ⏳ Analizando...
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex gap-3 flex-wrap">
        {!streaming ? (
          <button
            onClick={startCamera}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" /> Iniciar Cámara
          </button>
        ) : (
          <>
            {modoManual ? (
              // CONTROLES MODO MANUAL (como p.py)
              <>
                {!frameCongelado ? (
                  <button
                    onClick={congelarFrame}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5" /> 📸 CAPTURAR (como ESPACIO)
                  </button>
                ) : (
                  <>
                    <button
                      onClick={analizarFrameCongelado}
                      disabled={procesando}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Zap className="w-5 h-5" /> 
                      {procesando ? "Analizando..." : "✅ ANALIZAR PLACA"}
                    </button>
                    <button
                      onClick={descartarFrame}
                      disabled={procesando}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      ❌ Descartar
                    </button>
                  </>
                )}
              </>
            ) : (
              // CONTROLES MODO AUTOMÁTICO
              <>
                <button
                  onClick={() => setAutoCapture(!autoCapture)}
                  className={`flex-1 ${
                    autoCapture
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2`}
                >
                  {autoCapture ? (
                    <>
                      <Pause className="w-5 h-5" /> Pausar Detección
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" /> Iniciar Detección
                    </>
                  )}
                </button>
                <button
                  onClick={captureAndDetect}
                  disabled={procesando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  📸 Captura Manual
                </button>
              </>
            )}
            
            <button
              onClick={stopCamera}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              ⏹️ Detener
            </button>
          </>
        )}
      </div>

      {/* INSTRUCCIONES SEGÚN MODO */}
      {streaming && (
        <div className={`mt-4 p-3 rounded-lg ${
          darkMode ? "bg-gray-700" : "bg-gray-100"
        }`}>
          <p className="text-sm">
            {modoManual ? (
              <>
                <strong>🎯 Modo Manual (como p.py):</strong> Enfoca bien la placa, presiona "CAPTURAR" cuando esté perfecta, luego "ANALIZAR".
              </>
            ) : (
              <>
                <strong>⚡ Modo Automático:</strong> El sistema escanea automáticamente cada 1 segundo.
              </>
            )}
          </p>
        </div>
      )}

      {/* Última detección */}
      {ultimaDeteccion && (
        <div className={`mt-6 p-4 rounded-lg ${
          darkMode ? "bg-gray-700" : "bg-gray-100"
        }`}>
          <h4 className="font-bold mb-2">Último Vehículo Detectado:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Placa:</strong> {ultimaDeteccion.placa}
            </div>
            <div>
              <strong>Confianza:</strong> {(ultimaDeteccion.confianza * 100).toFixed(0)}%
            </div>
            <div>
              <strong>Estado:</strong>{" "}
              <span className={
                ultimaDeteccion.estado === "AUTORIZADO"
                  ? "text-green-600 font-bold"
                  : "text-red-600 font-bold"
              }>
                {ultimaDeteccion.estado}
              </span>
            </div>
            <div>
              <strong>Propietario:</strong> {ultimaDeteccion.propietario}
            </div>
            <div className="col-span-2">
              <strong>Vehículo:</strong> {ultimaDeteccion.vehiculo}
            </div>
            <div className="col-span-2 text-xs text-gray-500">
              {ultimaDeteccion.timestamp}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}