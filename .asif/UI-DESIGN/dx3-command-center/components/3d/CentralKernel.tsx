'use client';

import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Torus, Text, Stars, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

function RotatingKernel() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Outer ring: clockwise, 20s full rotation (2π / 20 = 0.314 rad/s)
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = time * (Math.PI * 2 / 20);
    }

    // Inner ring: counter-clockwise, 15s full rotation
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -time * (Math.PI * 2 / 15);
    }

    // Pulse sphere: scale 1.0 → 1.05
    if (sphereRef.current) {
      const scale = 1 + Math.sin(time * 2) * 0.05;
      sphereRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group>
      {/* Central glowing sphere */}
      <Sphere ref={sphereRef} args={[1.2, 64, 64]}>
        <MeshDistortMaterial
          color="#ff8c00"
          emissive="#ff6b00"
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.2}
          distort={0.15}
          speed={2}
        />
      </Sphere>

      {/* Inner core glow */}
      <Sphere args={[0.85, 32, 32]}>
        <meshStandardMaterial
          color="#ffaa00"
          emissive="#ff8c00"
          emissiveIntensity={1.2}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {/* Outer Ring - radius 2, clockwise 20s */}
      <Torus ref={ring1Ref} args={[2, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </Torus>

      {/* Inner Ring - radius 1.6, counter-clockwise 15s */}
      <Torus ref={ring2Ref} args={[1.6, 0.04, 16, 100]} rotation={[Math.PI / 3, 0, 0]}>
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.6}
          transparent
          opacity={0.8}
        />
      </Torus>

      {/* Text overlay */}
      <Text
        position={[0, 0.15, 1.6]}
        fontSize={0.28}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.05}
      >
        Dx3
      </Text>
      <Text
        position={[0, -0.15, 1.6]}
        fontSize={0.16}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        KERNEL
      </Text>
      <Text
        position={[0, -0.42, 1.6]}
        fontSize={0.11}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        AI CORE
      </Text>
    </group>
  );
}

function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1.5} color="#ff8c00" />
      <pointLight position={[-5, -5, 5]} intensity={0.8} color="#00ffff" />

      {/* Stars particle field - 5000 particles */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      {/* Main kernel with rotating rings */}
      <RotatingKernel />

      {/* Post-processing bloom effect */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
        />
      </EffectComposer>
    </>
  );
}

export function CentralKernel() {
  return (
    <div className="w-full h-full">
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
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
