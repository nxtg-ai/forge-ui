'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Torus, Tube, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// Simplified torus kernel - Custom GLSL shaders to be added in Phase 3
// See DEVELOPMENT-LOG.md for shader implementation details

function RotatingTorus() {
  const torusRef = useRef<THREE.Mesh>(null);
  const spiralRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (torusRef.current) {
      torusRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
      torusRef.current.rotation.y = t * 0.2;
    }

    if (spiralRef.current) {
      spiralRef.current.rotation.z = t * 0.5;
    }
  });

  // Create spiral curve for inner energy
  const spiralCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 100 }, (_, i) => {
      const angle = (i / 100) * Math.PI * 6; // 3 turns
      const radius = 0.8;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (i / 100 - 0.5) * 0.5
      );
    })
  );

  return (
    <group>
      {/* Main Torus with gradient effect */}
      <Torus ref={torusRef} args={[1.5, 0.5, 64, 128]}>
        <MeshDistortMaterial
          color="#06b6d4"
          emissive="#f97316"
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.2}
          distort={0.1}
          speed={2}
        />
      </Torus>

      {/* Inner spiral energy */}
      <mesh ref={spiralRef}>
        <tubeGeometry args={[spiralCurve, 100, 0.05, 8, false]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.8} />
      </mesh>

      {/* Concentric rings */}
      {[0.6, 0.8, 1.0, 1.2].map((radius, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.01, radius + 0.01, 64]} />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.3 - i * 0.05}
          />
        </mesh>
      ))}

      {/* Particle field */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={new Float32Array(
              Array.from({ length: 200 * 3 }, () => (Math.random() - 0.5) * 6)
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          color="#67e8f9"
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1.5} color="#f97316" />
      <pointLight position={[-5, -5, 5]} intensity={0.8} color="#06b6d4" />

      {/* Torus with animations */}
      <RotatingTorus />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  );
}

export function TorusKernel() {
  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>

      {/* Text Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h2
          className="text-4xl font-bold text-white mb-1"
          style={{
            textShadow: `
              0 0 20px rgba(6, 182, 212, 0.8),
              0 0 40px rgba(6, 182, 212, 0.4),
              0 0 60px rgba(6, 182, 212, 0.2)
            `,
            letterSpacing: '0.1em'
          }}
        >
          Dx3
        </h2>
        <div
          className="text-sm font-semibold text-cyan-400"
          style={{ letterSpacing: '0.3em' }}
        >
          KERNEL
        </div>
        <div
          className="text-[10px] text-cyan-300/70 mt-1"
          style={{ letterSpacing: '0.4em' }}
        >
          AI CORE
        </div>
      </div>
    </div>
  );
}
