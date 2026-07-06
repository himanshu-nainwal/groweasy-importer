'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeFunnelProps {
  isDragging: boolean;
  isProcessing: boolean;
}

export default function ThreeFunnel({ isDragging, isProcessing }: ThreeFunnelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 7;
    camera.position.y = 1.5;
    camera.lookAt(0, -0.5, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Generate Funnel Particles
    const particleCount = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialRadii = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const fallSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random height distribution
      const y = (Math.random() - 0.5) * 8; // -4 to 4
      
      // Radius depends on height (wider at the top, narrower at the bottom to form a funnel)
      const heightPercent = (y + 4) / 8; // 0 to 1
      const baseRadius = 0.5 + heightPercent * 2.8; // narrower at bottom (0.5), wider at top (3.3)
      
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * baseRadius;
      const z = Math.sin(angle) * baseRadius;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialRadii[i] = baseRadius;
      angles[i] = angle;
      speeds[i] = 0.005 + Math.random() * 0.015;
      fallSpeeds[i] = 0.015 + Math.random() * 0.025;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom Canvas Texture for round glowing particles
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(78, 222, 163, 0.8)');
      gradient.addColorStop(1, 'rgba(78, 222, 163, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 16, 16);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // 3. Animation state variables
    let animationFrameId: number;
    let dragTransitionFactor = 0.0; // Interpolation factor for transition states (0 = regular, 1 = dragging/processing)
    
    // 4. Animation Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Target transition factor based on state
      const targetFactor = isProcessing ? 1.0 : (isDragging ? 0.7 : 0.0);
      dragTransitionFactor += (targetFactor - dragTransitionFactor) * 0.08; // smooth easing

      // Rotate overall particle system
      particleSystem.rotation.y += 0.002 + dragTransitionFactor * 0.015;

      const posArr = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        // Fall down along Y
        // When processing/dragging, particles fall faster
        const currentFallSpeed = fallSpeeds[i] * (1.0 + dragTransitionFactor * 3.0);
        posArr[i * 3 + 1] -= currentFallSpeed;

        // Wrap back to top if fallen past threshold
        if (posArr[i * 3 + 1] < -4) {
          posArr[i * 3 + 1] = 4;
          angles[i] = Math.random() * Math.PI * 2;
        }

        const y = posArr[i * 3 + 1];
        const heightPercent = (y + 4) / 8; // 0 to 1

        // Orbit update
        // Swirl faster when dragging
        const swirlSpeed = speeds[i] * (1.0 + dragTransitionFactor * 5.0);
        angles[i] += swirlSpeed;

        // Radius scaling: particles get sucked into the funnel center when dragTransitionFactor is high
        const pullFactor = 1.0 - (dragTransitionFactor * 0.45 * (1.0 - heightPercent));
        const activeRadius = (0.5 + heightPercent * 2.8) * pullFactor;

        // Apply new circular coordinates
        posArr[i * 3] = Math.cos(angles[i]) * activeRadius;
        posArr[i * 3 + 2] = Math.sin(angles[i]) * activeRadius;
      }

      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();

    // 5. Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      texture.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [isDragging, isProcessing]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}
