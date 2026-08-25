/*
  Archivo: script.js
  Descripción: Lógica JavaScript con importación de módulos Three.js (importmap), GLTFLoader (avatar.glb), OrbitControls, carrusel de videoclips y transiciones Persona 3 Reload.
  Fecha de última modificación: 2026-08-24
  Autor: Antigravity
*/

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const initApp = () => {
  // 1. Asegurar reproducción automática de videos de fondo animado (.bg-animated)
  const bgVideos = document.querySelectorAll('.bg-animated');
  bgVideos.forEach(video => {
    video.muted = true;
    video.play().catch(err => {
      console.log('Autoplay video activado tras primera interacción:', err);
    });
  });

  // 2. Lógica de Cortinilla de Transición de Página (#page-transition)
  const pageTransition = document.getElementById('page-transition');
  if (pageTransition) {
    requestAnimationFrame(() => {
      pageTransition.classList.add('exit');
    });

    setTimeout(() => {
      pageTransition.classList.remove('exit', 'active');
    }, 150);
  }

  // Interceptación de enlaces <a> para reproducir la cortinilla estilo Persona 3
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.getAttribute('href');
      if (!targetUrl || targetUrl.startsWith('#') || targetUrl.startsWith('javascript:')) {
        return;
      }
      e.preventDefault();

      if (pageTransition) {
        pageTransition.classList.remove('exit');
        pageTransition.classList.add('active');

        setTimeout(() => {
          window.location.href = targetUrl;
        }, 220);
      } else {
        window.location.href = targetUrl;
      }
    });
  });

  // 3. Lógica del Carrusel de Videoclips con Detención de Audio
  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  if (track && prevBtn && nextBtn) {
    let currentIndex = 0;
    const totalSlides = track.children.length;

    // Pausa limpia vía API postMessage de YouTube para evitar parpadeos visuales
    const stopAllVideos = () => {
      const iframes = document.querySelectorAll('.carousel-track iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } catch (e) {
          console.log('Error enviando comando postMessage a iframe:', e);
        }
      });
    };

    const updateCarousel = () => {
      stopAllVideos();
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
    };

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentIndex < totalSlides - 1) {
        currentIndex++;
        updateCarousel();
      }
    });

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });
  }

  // 4. Motor 3D Three.js + GLTFLoader + OrbitControls en #interactive-3d-asset / #threejs-container
  const container = document.getElementById('threejs-container') || document.getElementById('interactive-3d-asset');
  if (container) {
    const scene = new THREE.Scene();

    // Fondo transparente para integrar el canvas con la tarjeta Bento Grid
    scene.background = null;

    // Cámara Virtual posicionada en toma picada frontal (0, 1.2, 1.25)
    const camera = new THREE.PerspectiveCamera(45, (container.clientWidth / container.clientHeight) || 1, 0.1, 1000);
    camera.position.set(0, 1.2, 1.25);

    // Creación del WebGLRenderer con fondo 100% transparente (alpha: true, setClearColor 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth || 300, container.clientHeight || 240);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // OrbitControls al estilo Sketchfab enfocado en el frente del escritorio
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.autoRotate = false;
    controls.enableZoom = true;
    controls.minDistance = 0.2;
    controls.maxDistance = 15.0;
    controls.zoomSpeed = 1.2;
    controls.enablePan = true;
    controls.panSpeed = 1.0;
    controls.target.set(0, 0.1, 0);
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    // Luces Esenciales (Luz direccional a 3.0 para resaltar polígonos)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Cargar modelo 3D local avatar.glb
    const loader = new GLTFLoader();
    loader.load(
      'assets/models/avatar.glb',
      (gltf) => {
        const model = gltf.scene;

        // Reset previo y rotación de 180° en Y para mostrar la cara frontal verdadera de los objetos
        model.position.set(0, 0, 0);
        model.rotation.set(0, Math.PI, 0);
        model.scale.set(1, 1, 1);

        // Auto-Ajuste Proporcional Inteligente de Escala enfocado en el área de trabajo
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 3.6 / (maxDim || 1);
        
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);

        const center = box.getCenter(new THREE.Vector3());
        model.position.x = -center.x * scaleFactor;
        model.position.y = (-center.y * scaleFactor) - 0.35;
        model.position.z = -center.z * scaleFactor;

        scene.add(model);
      },
      undefined,
      (error) => {
        console.error('Error al cargar avatar.glb por temas de rutas o archivo ausente:', error);
        
        // Respaldo de malla wireframe estilizada P3R
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
          color: 0xd90429,
          wireframe: true,
          emissive: 0x03045e
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        const animateFallback = () => {
          requestAnimationFrame(animateFallback);
          cube.rotation.x += 0.008;
          cube.rotation.y += 0.008;
          controls.update();
          renderer.render(scene, camera);
        };
        animateFallback();
      }
    );

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener('resize', () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
