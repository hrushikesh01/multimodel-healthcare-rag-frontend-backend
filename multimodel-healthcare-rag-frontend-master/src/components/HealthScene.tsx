import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

function DNA() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.01;
      group.current.rotation.z += 0.005;
    }
  });

  const count = 10;
  const radius = 1;
  const height = 4;

  return (
    <group ref={group}>
      {Array.from({ length: count }).map((_, i) => {
        const y = (i / count) * height - height / 2;
        const angle = (i / count) * Math.PI * 4;
        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;
        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;

        return (
          <group key={i} position={[0, y, 0]}>
            <mesh position={[x1, 0, z1]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[x2, 0, z2]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} />
            </mesh>
            <mesh rotation={[0, 0, angle]} position={[0, 0, 0]}>
              <boxGeometry args={[radius * 2, 0.02, 0.02]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Heartbeat() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (mesh.current) {
      const scale = 1 + Math.sin(time * 3) * 0.1;
      mesh.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Sphere ref={mesh} args={[1, 64, 64]}>
      <MeshDistortMaterial
        color="#ef4444"
        speed={2}
        distort={0.4}
        radius={1}
      />
    </Sphere>
  );
}

export default function HealthScene({ type = 'dna' }: { type?: 'dna' | 'heart' }) {
  return (
    <div className="w-full h-full min-h-[300px] relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} />
        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
          {type === 'dna' ? <DNA /> : <Heartbeat />}
        </Float>
      </Canvas>
    </div>
  );
}
