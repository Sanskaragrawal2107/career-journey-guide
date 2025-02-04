import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Create floating particles with different sizes and colors
    const particles = new THREE.Group();
    const particleCount = 150;
    const colors = [0x1E3A8A, 0x3B82F6, 0x60A5FA];
    
    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 0.2 + 0.05;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const material = new THREE.MeshBasicMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.6 
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(
        Math.random() * 30 - 15,
        Math.random() * 30 - 15,
        Math.random() * 30 - 15
      );
      
      // Add custom properties for animation
      (particle as any).speed = Math.random() * 0.02 + 0.01;
      (particle as any).offset = Math.random() * Math.PI * 2;
      
      particles.add(particle);
    }
    scene.add(particles);

    camera.position.z = 10;

    const animate = () => {
      requestAnimationFrame(animate);
      
      particles.children.forEach((particle, index) => {
        // Create flowing motion
        particle.position.y += Math.sin(Date.now() * (particle as any).speed + (particle as any).offset) * 0.02;
        particle.position.x += Math.cos(Date.now() * (particle as any).speed + (particle as any).offset) * 0.01;
        
        // Reset position if particle goes too far
        if (particle.position.y > 15) particle.position.y = -15;
        if (particle.position.x > 15) particle.position.x = -15;
        
        // Rotate particles
        particle.rotation.x += 0.001;
        particle.rotation.y += 0.001;
      });
      
      // Rotate entire particle system slowly
      particles.rotation.y += 0.0005;
      particles.rotation.x += 0.0002;
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 -z-10" />;
};