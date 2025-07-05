<template>
  <div ref="container" class="w-full h-full"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { useColorMode } from '#imports';

// Remove props since we don't need hover effect anymore

const container = ref(null);

let renderer, scene, camera, animationFrameId, xObject, styleObserver;
const clock = new THREE.Clock();
const colorMode = useColorMode();
const mouse = new THREE.Vector2();

const themeSettings = {
  light: {
    background: 0xffffff,
    object: 0x0f172a, // secondary-900
    glow: 0x67e8f9, // A cyan color for glowing
  },
  dark: {
    background: 0x0f172a, // secondary-900
    object: 0xffffff,
    glow: 0x0891b2, // A darker cyan for glowing
  }
};

// Function to get primary color from CSS custom properties
const getPrimaryColor = () => {
  if (typeof document === 'undefined') return 0x0f172a;
  
  const rootStyles = getComputedStyle(document.documentElement);
  const primaryHsl = rootStyles.getPropertyValue('--color-primary-500').trim();
  
  if (!primaryHsl) return 0x0f172a;
  
  // Convert HSL to RGB
  const [h, s, l] = primaryHsl.split(' ').map(val => parseFloat(val));
  const sNorm = s / 100;
  const lNorm = l / 100;
  
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return (r << 16) | (g << 8) | b;
};

// Function to update X object colors
const updateXObjectColors = () => {
  if (!xObject) return;
  const primaryColor = getPrimaryColor();
  
  xObject.traverse(child => {
    if (child.isMesh) {
      child.material.color.set(primaryColor);
      child.material.emissive.set(primaryColor);
      child.material.emissiveIntensity = 0.5;
    }
  });
};

// --- Initialization Functions ---
function init() {
  if (!container.value) return;
  const width = container.value.clientWidth;
  const height = 500; // Fixed height for the container

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.z = 5;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.value.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Object
  xObject = createX();
  scene.add(xObject);
  
  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);
}

function createX() {
    const barLength = 2.5;
    const barWidth = 0.4;
    const primaryColor = getPrimaryColor();
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(primaryColor),
        metalness: 0.1,
        roughness: 0.8,
        emissive: new THREE.Color(0x000000),
    });

    const barGeometry = new THREE.BoxGeometry(barWidth, barLength, barWidth);
    const bar1 = new THREE.Mesh(barGeometry, material);
    bar1.rotation.z = Math.PI / 4;
    const bar2 = new THREE.Mesh(barGeometry, material);
    bar2.rotation.z = -Math.PI / 4;

    const xGroup = new THREE.Group();
    xGroup.add(bar1);
    xGroup.add(bar2);

    return xGroup;
}

// --- Interaction ---
function onMouseMove(event) {
  // Normalize mouse position to range [-1, 1]
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// --- Animation & Updates ---
function animate() {
  animationFrameId = requestAnimationFrame(animate);

  if (xObject) {
    // Smoothly rotate towards the mouse position
    const targetRotationY = (mouse.x * Math.PI) / 6;
    const targetRotationX = (-mouse.y * Math.PI) / 6; // Reversed y animation
    
    xObject.rotation.y += (targetRotationY - xObject.rotation.y) * 0.05;
    xObject.rotation.x += (targetRotationX - xObject.rotation.x) * 0.05;
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  if (process.client) {
    init();
    animate();
    
    // Watch for changes in CSS custom properties
    styleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          updateXObjectColors();
        }
      });
    });
    
    styleObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
});

onUnmounted(() => {
  if (process.client) {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', onWindowResize);
    document.removeEventListener('mousemove', onMouseMove);
    if(renderer) {
        renderer.dispose();
        if(container.value && renderer.domElement) {
          // container.value.removeChild(renderer.domElement);
        }
    }
    if(styleObserver) {
        styleObserver.disconnect();
    }
  }
});

function onWindowResize() {
    if(!camera || !renderer || !container.value) return;
    const width = container.value.clientWidth;
    const height = 500; // Fixed height

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

watch(() => colorMode.value, () => {
  updateXObjectColors();
});
</script> 