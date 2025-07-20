<template>
  <div ref="container" class="flex justify-center items-center w-full h-full max-w-full max-h-full min-h-[200px]">
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { useColorMode } from '#imports';

// Props for audio level and mode
const props = defineProps({
  audioLevel: {
    type: Number,
    default: 0
  },
  mode: {
    type: String,
    default: 'idle' // 'idle', 'input', 'output'
  },
  forceReinit: {
    type: Number,
    default: 0
  }
});

const container = ref(null);

let renderer, scene, camera, animationFrameId, xObject, styleObserver;
let xBars = []; // Array to store the four X ends separately
const clock = new THREE.Clock();
const colorMode = useColorMode();


// Animation states
let targetRotationY = 0;
let currentRotationY = 0;
let isFlipping = false;
let currentSide = 'agent'; // Start with 'agent' side (0 degrees)
let baseRotationY = 0; // Base rotation for each side (0 = agent, PI = user)
let continuousRotationOffset = 0; // Continuous subtle rotation

// Z rotation smoothing
let targetRotationZ = 0;
let currentRotationZ = 0;

// Individual bar scaling for asynchronous animation
let barScales = [1, 1, 1, 1]; // Four ends of the X
let barTargetScales = [1, 1, 1, 1];
let barAnimationOffsets = [0, 0.5, 1.0, 1.5]; // Phase offsets for async animation

// Smooth animation state interpolation
let currentOverallScale = 1;
let targetOverallScale = 1;
let currentEmissiveIntensity = [0, 0, 0, 0];
let targetEmissiveIntensity = [0, 0, 0, 0];
let animationBlendFactor = 0.1; // Smoothing factor for all transitions

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

// Function to update X object colors - matching DashboardX behavior
const updateXObjectColors = () => {
  if (!xObject) return;
  const primaryColor = getPrimaryColor();
  
  xObject.traverse(child => {
    if (child.isMesh) {
      child.material.color.set(primaryColor);
      // Keep emissive behavior for audio reactivity, but start with black like DashboardX
      if (props.audioLevel === 0) {
        child.material.emissive.set(0x000000);
        child.material.emissiveIntensity = 0;
      }
    }
  });
};

// --- Initialization Functions ---
function init() {
  if (!container.value) return;
  
  // Get container dimensions with responsive sizing
  const containerRect = container.value.getBoundingClientRect();
  const minSize = 200; // Minimum size in pixels
  const size = Math.max(Math.min(containerRect.width, containerRect.height), minSize);
  const width = size;
  const height = size;

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
}

function createX() {
    const barLength = 2.5;
    const barWidth = 0.4;
    const primaryColor = getPrimaryColor();
    
    // Create material matching DashboardX exactly
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(primaryColor),
        metalness: 0.1,
        roughness: 0.8,
        emissive: new THREE.Color(0x000000), // Start with no emissive like DashboardX
    });

    // Create two full-length bars like DashboardX, but split for audio reactivity
    const barGeometry = new THREE.BoxGeometry(barWidth, barLength, barWidth);
    
    // First diagonal bar (split into two segments)
    const bar1_segment1 = new THREE.Mesh(barGeometry, material.clone());
    const bar1_segment2 = new THREE.Mesh(barGeometry, material.clone());
    bar1_segment1.rotation.z = Math.PI / 4;
    bar1_segment2.rotation.z = Math.PI / 4;
    
    // Second diagonal bar (split into two segments)  
    const bar2_segment1 = new THREE.Mesh(barGeometry, material.clone());
    const bar2_segment2 = new THREE.Mesh(barGeometry, material.clone());
    bar2_segment1.rotation.z = -Math.PI / 4;
    bar2_segment2.rotation.z = -Math.PI / 4;

    // Store references to individual bars for animation
    xBars = [bar1_segment1, bar1_segment2, bar2_segment1, bar2_segment2];

    const xGroup = new THREE.Group();
    xGroup.add(bar1_segment1);
    xGroup.add(bar1_segment2);
    xGroup.add(bar2_segment1);
    xGroup.add(bar2_segment2);

    return xGroup;
}



// --- Animation & Updates ---
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  if (xObject) {
    // Handle mode changes and flipping - 180 degree flips with random axis
    if (props.mode === 'input' && currentSide !== 'user') {
      // Flip to user side (input) - debugging
      console.log('Flipping to USER side, mode:', props.mode, 'currentSide:', currentSide);
      baseRotationY = Math.PI; // 180 degrees flip
      currentSide = 'user';
      isFlipping = true;
      
      // Add random rotation around different axes for visual variety - but smooth return
      if (xObject) {
        xObject.rotation.x += (Math.random() - 0.5) * 0.15; // Reduced X tilt from 0.4 to 0.15
        currentRotationZ = xObject.rotation.z + (Math.random() - 0.5) * 0.4; // Add random Z tilt
        xObject.rotation.z = currentRotationZ;
        targetRotationZ = 0; // Target to return to 0
      }
    } else if (props.mode === 'output' && currentSide !== 'agent') {
      // Flip to agent side (output) - debugging
      console.log('Flipping to AGENT side, mode:', props.mode, 'currentSide:', currentSide);
      baseRotationY = 0; // Back to 0 degrees
      currentSide = 'agent';
      isFlipping = true;
      
      // Add random rotation around different axes for visual variety - but smooth return
      if (xObject) {
        xObject.rotation.x += (Math.random() - 0.5) * 0.15; // Reduced X tilt from 0.4 to 0.15
        currentRotationZ = xObject.rotation.z + (Math.random() - 0.5) * 0.4; // Add random Z tilt
        xObject.rotation.z = currentRotationZ;
        targetRotationZ = 0; // Target to return to 0
      }
    }
    
    // Continuous subtle rotation within limits
    const rotationAmplitude = 0.15; // Max ±8.6 degrees rotation
    const rotationSpeed = 0.8; // Slow oscillation
    continuousRotationOffset = Math.sin(time * rotationSpeed) * rotationAmplitude;
    
    // Combine base rotation (from flips) with continuous oscillation
    targetRotationY = baseRotationY + continuousRotationOffset;
    
    // Smooth Y rotation animation - swift flipping, smooth oscillation
    const rotationDiffY = targetRotationY - currentRotationY;
    if (Math.abs(rotationDiffY) > 0.001) {
      // Use faster interpolation when flipping, slower for continuous oscillation
      const blendSpeed = isFlipping ? (animationBlendFactor * 2) : animationBlendFactor; // Slower flip - 2x speed
      currentRotationY += rotationDiffY * blendSpeed;
      xObject.rotation.y = currentRotationY;
    } else {
      currentRotationY = targetRotationY;
      if (isFlipping) {
        console.log('Flip completed to side:', currentSide, 'rotation:', currentRotationY);
        isFlipping = false; // Mark flip as complete
      }
    }

    // Smooth Z rotation return to 0 - swift but smooth
    const rotationDiffZ = targetRotationZ - currentRotationZ;
    if (Math.abs(rotationDiffZ) > 0.001) {
      currentRotationZ += rotationDiffZ * (animationBlendFactor * 3); // 3x faster return to 0
      xObject.rotation.z = currentRotationZ;
    } else {
      currentRotationZ = targetRotationZ;
    }



    // Calculate target animation values based on current state
    const isIdle = props.mode === 'idle' && props.audioLevel < 0.01;
    const hasAudio = props.audioLevel > 0.01;
    
    // Determine target overall scale
    if (isIdle) {
      // Gentle pulsating for idle - reduced amplitude
      targetOverallScale = 1 + Math.sin(time * 1.5) * 0.03;
    } else {
      // Default scale when not idle
      targetOverallScale = 1;
    }
    
    // Smoothly interpolate overall scale
    currentOverallScale += (targetOverallScale - currentOverallScale) * animationBlendFactor;
    xObject.scale.setScalar(currentOverallScale);

    // Individual bar animations with smooth blending
    if (xBars.length === 4) {
      for (let i = 0; i < 4; i++) {
        // Calculate target values for this bar
        let targetBarScale = 1;
        let targetEmissive = 0;
        
                 if (!isIdle && hasAudio) {
           // Audio-reactive animation - reduced amplitudes
           const phase = time * 8 + barAnimationOffsets[i];
           const baseScale = 1 + props.audioLevel * 0.3; // Reduced from 0.8
           const asyncScale = 1 + Math.sin(phase) * props.audioLevel * 0.1; // Reduced from 0.3
           targetBarScale = baseScale * asyncScale;
           
           // Audio-reactive scaling - reduced amplitude
           const audioScale = 1 + props.audioLevel * 0.1 * Math.sin(phase) * 0.3; // Reduced significantly
           targetBarScale = Math.max(targetBarScale, audioScale);
           
           // Emissive intensity - reduced amplitude
           targetEmissive = props.audioLevel * 0.3 + Math.sin(phase) * props.audioLevel * 0.15; // Reduced from 0.5 and 0.3
           targetEmissive = Math.max(0, Math.min(1, targetEmissive));
         } else if (!isIdle) {
           // Non-idle but no audio - very subtle animation
           const phase = time * 2 + barAnimationOffsets[i];
           targetBarScale = 1 + Math.sin(phase) * 0.01; // Reduced from 0.02
           targetEmissive = 0;
        } else {
          // Idle state - reset to defaults
          targetBarScale = 1;
          targetEmissive = 0;
        }
        
        // Store target values
        barTargetScales[i] = targetBarScale;
        targetEmissiveIntensity[i] = targetEmissive;
        
        // Smooth interpolation towards targets
        barScales[i] += (barTargetScales[i] - barScales[i]) * animationBlendFactor;
        currentEmissiveIntensity[i] += (targetEmissiveIntensity[i] - currentEmissiveIntensity[i]) * animationBlendFactor;
        
        // Apply smoothed values - scale only along the length (Y-axis) to extend bars outward
        // Keep X and Z at 1 to maintain bar thickness and prevent distortion
        xBars[i].scale.set(1, barScales[i], 1);
        
        // Smooth emissive transitions
        if (currentEmissiveIntensity[i] > 0.01) {
          const primaryColor = getPrimaryColor();
          xBars[i].material.emissive.set(primaryColor);
          xBars[i].material.emissiveIntensity = currentEmissiveIntensity[i];
        } else {
          xBars[i].material.emissive.set(0x000000);
          xBars[i].material.emissiveIntensity = 0;
        }
      }
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Function to initialize or reinitialize the scene
const initScene = () => {
  if (process.client && container.value) {
    // Clean up existing scene if it exists
    if (renderer) {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.value && renderer.domElement && container.value.contains(renderer.domElement)) {
        container.value.removeChild(renderer.domElement);
      }
    }
    
    // Initialize fresh scene
    init();
    animate();
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
  if (process.client) {
    initScene();
    
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
    
    // Get container dimensions with responsive sizing
    const containerRect = container.value.getBoundingClientRect();
    const minSize = 200; // Minimum size in pixels
    const size = Math.max(Math.min(containerRect.width, containerRect.height), minSize);
    const width = size;
    const height = size;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

watch(() => colorMode.value, () => {
  updateXObjectColors();
});

// Watch for prop changes
watch(() => props.audioLevel, (newLevel) => {
  // Audio level changes are handled in the animation loop
});

watch(() => props.mode, (newMode) => {
  // Mode changes trigger flipping in the animation loop
});

// Watch for force reinit prop changes
watch(() => props.forceReinit, (newValue, oldValue) => {
  if (newValue !== oldValue && newValue > 0) {
    nextTick(() => {
      initScene();
    });
  }
});
</script> 