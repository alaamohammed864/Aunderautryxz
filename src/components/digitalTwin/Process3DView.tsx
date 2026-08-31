import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  DigitalTwinProcessState,
  PlcMemoryState,
  SimulationMode,
} from '../../types';
import {
  Box,
  RotateCw,
  Camera,
  Layers,
  Sparkles,
  Zap,
  Plus,
  Play,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

interface Process3DViewProps {
  processState: DigitalTwinProcessState;
  setProcessState: React.Dispatch<React.SetStateAction<DigitalTwinProcessState>>;
  plcMemory: PlcMemoryState;
  onSetPlcInput: (address: string, val: boolean) => void;
  simulationMode: SimulationMode;
}

export const Process3DView: React.FC<Process3DViewProps> = ({
  processState,
  setProcessState,
  plcMemory,
  onSetPlcInput,
  simulationMode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Mesh references for animation
  const conveyorMeshRef = useRef<THREE.Mesh | null>(null);
  const pistonMeshRef = useRef<THREE.Mesh | null>(null);
  const tankWaterMeshRef = useRef<THREE.Mesh | null>(null);
  const motorShaftMeshRef = useRef<THREE.Mesh | null>(null);
  const boxMeshesRef = useRef<THREE.Mesh[]>([]);

  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'sensor' | 'side'>('iso');
  const [debugOverlay, setDebugOverlay] = useState<boolean>(true);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.025);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 10, 16);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(15, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x06b6d4, 1.5, 20);
    pointLight.position.set(0, 6, 2);
    scene.add(pointLight);

    // Factory Floor Grid
    const gridHelper = new THREE.GridHelper(30, 30, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Construct 3D Process Objects

    // 1. Conveyor Assembly
    const conveyorGroup = new THREE.Group();
    const beltGeo = new THREE.BoxGeometry(14, 0.4, 2);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const beltMesh = new THREE.Mesh(beltGeo, beltMat);
    beltMesh.position.set(0, 1.8, 0);
    beltMesh.castShadow = true;
    beltMesh.receiveShadow = true;
    conveyorMeshRef.current = beltMesh;
    conveyorGroup.add(beltMesh);

    // Conveyor Legs
    for (let x of [-5, 0, 5]) {
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const leg1 = new THREE.Mesh(legGeo, legMat);
      leg1.position.set(x, 0.9, 0.8);
      leg1.castShadow = true;
      conveyorGroup.add(leg1);

      const leg2 = new THREE.Mesh(legGeo, legMat);
      leg2.position.set(x, 0.9, -0.8);
      leg2.castShadow = true;
      conveyorGroup.add(leg2);
    }
    scene.add(conveyorGroup);

    // 2. Pneumatic Cylinder & Diverter Piston
    const pistonGroup = new THREE.Group();
    const cylHousingGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 16);
    const cylHousingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.3 });
    const cylHousing = new THREE.Mesh(cylHousingGeo, cylHousingMat);
    cylHousing.rotation.z = Math.PI / 2;
    cylHousing.position.set(0, 2.2, -1.8);
    pistonGroup.add(cylHousing);

    const rodGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 16);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 1.0, roughness: 0.1 });
    const rodMesh = new THREE.Mesh(rodGeo, rodMat);
    rodMesh.rotation.z = Math.PI / 2;
    rodMesh.position.set(0, 2.2, -1.0);
    pistonMeshRef.current = rodMesh;
    pistonGroup.add(rodMesh);
    scene.add(pistonGroup);

    // 3. Photoelectric Optical Sensors (PE-1 & PE-2)
    const sensorGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
    const sensorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5 });
    
    // PE-1 at entrance
    const pe1Mesh = new THREE.Mesh(sensorGeo, sensorMat);
    pe1Mesh.position.set(-4.5, 2.3, 1.2);
    scene.add(pe1Mesh);

    // PE-2 at diverter
    const pe2Mesh = new THREE.Mesh(sensorGeo, sensorMat);
    pe2Mesh.position.set(0, 2.3, 1.2);
    scene.add(pe2Mesh);

    // Laser beam line for PE-1
    const laserMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
    const laserPoints1 = [new THREE.Vector3(-4.5, 2.3, 1.2), new THREE.Vector3(-4.5, 2.3, -1.2)];
    const laserGeo1 = new THREE.BufferGeometry().setFromPoints(laserPoints1);
    const laserLine1 = new THREE.Line(laserGeo1, laserMat);
    scene.add(laserLine1);

    // Laser beam line for PE-2
    const laserPoints2 = [new THREE.Vector3(0, 2.3, 1.2), new THREE.Vector3(0, 2.3, -1.2)];
    const laserGeo2 = new THREE.BufferGeometry().setFromPoints(laserPoints2);
    const laserLine2 = new THREE.Line(laserGeo2, laserMat);
    scene.add(laserLine2);

    // 4. Industrial Liquid Tank
    const tankGroup = new THREE.Group();
    const tankGlassGeo = new THREE.CylinderGeometry(1.6, 1.6, 4, 32, 1, true);
    const tankGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
    });
    const tankGlass = new THREE.Mesh(tankGlassGeo, tankGlassMat);
    tankGlass.position.set(7, 2.5, -4);
    tankGroup.add(tankGlass);

    // Tank water level mesh
    const waterGeo = new THREE.CylinderGeometry(1.55, 1.55, 3.8, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8,
      roughness: 0.2,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(7, 0.8, -4);
    waterMesh.scale.set(1, 0.05, 1);
    tankWaterMeshRef.current = waterMesh;
    tankGroup.add(waterMesh);
    scene.add(tankGroup);

    // 5. 3-Phase Induction Motor Testbench
    const motorGroup = new THREE.Group();
    const motorBodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.8, 24);
    const motorBodyMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.7, roughness: 0.3 });
    const motorBody = new THREE.Mesh(motorBodyGeo, motorBodyMat);
    motorBody.rotation.z = Math.PI / 2;
    motorBody.position.set(-6, 2.2, 0);
    motorGroup.add(motorBody);

    const shaftGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 16);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(-5, 2.2, 0);
    motorShaftMeshRef.current = shaft;
    motorGroup.add(shaft);
    scene.add(motorGroup);

    // Resize handling
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Render Three.js
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update dynamic 3D objects when simulation state updates
  useEffect(() => {
    // 1. Conveyor motor rotation & speed
    const isConvRunning = processState.conveyors[0]?.running;
    if (motorShaftMeshRef.current && isConvRunning && simulationMode === 'RUN') {
      motorShaftMeshRef.current.rotation.x += 0.2;
    }

    // 2. Pneumatic Piston Diverter extension
    const pistonExt = processState.pistons[0]?.extended;
    if (pistonMeshRef.current) {
      const targetZ = pistonExt ? -0.2 : -1.0;
      pistonMeshRef.current.position.z += (targetZ - pistonMeshRef.current.position.z) * 0.25;
    }

    // 3. Tank Liquid Level
    const tankLvl = (processState.tanks[0]?.level || 20) / 100;
    if (tankWaterMeshRef.current) {
      tankWaterMeshRef.current.scale.y = Math.max(0.02, tankLvl);
      tankWaterMeshRef.current.position.y = 0.6 + tankLvl * 1.8;
    }

    // 4. Update Optical Sensors & Workpieces
    if (sceneRef.current) {
      // Remove old box meshes
      boxMeshesRef.current.forEach((m) => sceneRef.current?.remove(m));
      boxMeshesRef.current = [];

      // Add active boxes
      let pe1Triggered = false;
      let pe2Triggered = false;

      processState.workpieces.forEach((wp) => {
        const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const boxMat = new THREE.MeshStandardMaterial({
          color: wp.color === 'red' ? 0xef4444 : wp.color === 'gold' ? 0xeab308 : 0x3b82f6,
          roughness: 0.4,
        });
        const boxMesh = new THREE.Mesh(boxGeo, boxMat);
        boxMesh.position.set(wp.posX, wp.posY, wp.posZ);
        boxMesh.castShadow = true;
        sceneRef.current?.add(boxMesh);
        boxMeshesRef.current.push(boxMesh);

        // Check proximity to sensor 1 (-4.5) and sensor 2 (0)
        if (Math.abs(wp.posX - -4.5) < 0.6) pe1Triggered = true;
        if (Math.abs(wp.posX - 0.0) < 0.6) pe2Triggered = true;
      });

      // Synchronize back to PLC inputs
      if (simulationMode === 'RUN') {
        onSetPlcInput('I0.0', pe1Triggered);
        onSetPlcInput('I0.2', pe2Triggered);
      }
    }
  }, [processState, simulationMode]);

  // Set Camera View Presets
  const setCameraView = (preset: 'iso' | 'top' | 'sensor' | 'side') => {
    setCameraPreset(preset);
    if (!cameraRef.current) return;
    if (preset === 'iso') {
      cameraRef.current.position.set(12, 10, 16);
      cameraRef.current.lookAt(0, 1.5, 0);
    } else if (preset === 'top') {
      cameraRef.current.position.set(0, 22, 0.1);
      cameraRef.current.lookAt(0, 0, 0);
    } else if (preset === 'sensor') {
      cameraRef.current.position.set(0, 4, 5);
      cameraRef.current.lookAt(0, 2, 0);
    } else if (preset === 'side') {
      cameraRef.current.position.set(0, 3, 14);
      cameraRef.current.lookAt(0, 2, 0);
    }
  };

  const spawnNewWorkpiece = () => {
    const isDefect = Math.random() > 0.5;
    const newWp = {
      id: 'wp_' + Math.random().toString(36).substring(2, 7),
      type: 'box' as const,
      color: isDefect ? ('red' as const) : ('blue' as const),
      posX: -6.5,
      posY: 2.4,
      posZ: 0,
      isDefective: isDefect,
    };
    setProcessState((prev) => ({
      ...prev,
      workpieces: [...prev.workpieces, newWp],
    }));
  };

  const clearWorkpieces = () => {
    setProcessState((prev) => ({
      ...prev,
      workpieces: [],
    }));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100 relative select-none">
      {/* 3D Viewport Controls Top Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Process Title & Telemetry */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl">
          <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-700/60 flex items-center justify-center text-sky-400">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white uppercase font-['Rajdhani']">
                Industrial 3D Factory Scene
              </span>
              <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800">
                Live WebGL Sync
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Conveyor Drive: {processState.conveyors[0]?.running ? 'RUNNING (Q0.0)' : 'STOPPED'} • Boxes in transit:{' '}
              {processState.workpieces.length}
            </p>
          </div>
        </div>

        {/* Right: Camera Presets & Interactive Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Camera View Switcher */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1 gap-1 shadow-xl">
            <button
              onClick={() => setCameraView('iso')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                cameraPreset === 'iso' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Isometric
            </button>
            <button
              onClick={() => setCameraView('top')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                cameraPreset === 'top' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Top-Down
            </button>
            <button
              onClick={() => setCameraView('sensor')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                cameraPreset === 'sensor' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sensor Focus
            </button>
          </div>

          {/* Spawn Box Button */}
          <button
            onClick={spawnNewWorkpiece}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-900/40 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Feed Package</span>
          </button>

          <button
            onClick={clearWorkpieces}
            title="Clear Packages"
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Bottom Live I/O HUD Overlay */}
      {debugOverlay && (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Sensor & Actuator Status Pills */}
          <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono shadow-xl flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">PE-1 Entry (I0.0):</span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold ${
                  plcMemory.inputs['I0.0'] ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {plcMemory.inputs['I0.0'] ? 'DETECTED' : 'CLEAR'}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">PE-2 Diverter (I0.2):</span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold ${
                  plcMemory.inputs['I0.2'] ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {plcMemory.inputs['I0.2'] ? 'DEFECT DETECTED' : 'CLEAR'}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Piston Diverter (Q0.1):</span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold ${
                  processState.pistons[0]?.extended ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {processState.pistons[0]?.extended ? 'EXTENDED' : 'RETRACTED'}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Liquid Tank (IW64):</span>
              <span className="text-cyan-400 font-bold">
                {Math.round(processState.tanks[0]?.level || 0)} %
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
