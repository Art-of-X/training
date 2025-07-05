<template>
  <div ref="container" class="fixed top-0 left-0 w-full h-full -z-10"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { useColorMode } from '#imports';

const container = ref(null);

let renderer, scene, camera, animationFrameId, raycaster, room, ambientLight;
const bouncingXs = [];
const roomSize = 20;
const clock = new THREE.Clock();
const colorMode = useColorMode();

const themeSettings = {
  light: {
    background: 0xffffff,
    ambientIntensity: 2,
  },
  dark: {
    background: 0x0f172a, // secondary-900
    ambientIntensity: 0.8,
  }
};

// --- Initialization Functions ---
function init() {
  const currentTheme = themeSettings[colorMode.value];

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(currentTheme.background);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 15;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  container.value.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();

  // Room
  createRoom();

  // Lights
  createLights();

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onClick);
}

function createRoom() {
  const roomGeometry = new THREE.BoxGeometry(roomSize, roomSize, roomSize);
  const roomMaterial = new THREE.MeshStandardMaterial({
    color: themeSettings[colorMode.value].background,
    side: THREE.BackSide,
    metalness: 0,
    roughness: 1
  });
  room = new THREE.Mesh(roomGeometry, roomMaterial);
  room.receiveShadow = true;
  scene.add(room);
}

function createLights() {
  ambientLight = new THREE.AmbientLight(0xffffff, themeSettings[colorMode.value].ambientIntensity);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 200, 1000);
  pointLight.position.set(0, 0, 20);
  pointLight.castShadow = true;
  pointLight.shadow.mapSize.width = 4096;
  pointLight.shadow.mapSize.height = 4096;
  pointLight.shadow.camera.near = 0.5;
  pointLight.shadow.camera.far = 50;
  pointLight.shadow.radius = 25;
  pointLight.shadow.blurSamples = 25;
  pointLight.shadow.bias = -0.0001;
  scene.add(pointLight);
}

// --- Interaction ---
function onClick(event) {
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);

  const halfRoomSize = roomSize / 2;
  const buffer = 2; // Keep it away from the edge
  intersectPoint.x = Math.max(-halfRoomSize + buffer, Math.min(halfRoomSize - buffer, intersectPoint.x));
  intersectPoint.y = Math.max(-halfRoomSize + buffer, Math.min(halfRoomSize - buffer, intersectPoint.y));
  
  createBouncingX(intersectPoint);
}

function createX() {
    const barLength = 2;
    const barWidth = 0.3;

    const hue = Math.random();
    const saturation = 0.9 + Math.random() * 0.1;
    const lightness = 0.4 + Math.random() * 0.4;
    const randomColor = new THREE.Color().setHSL(hue, saturation, lightness);

    const material = new THREE.MeshStandardMaterial({
        color: randomColor,
        metalness: 0.2,
        roughness: 1,
    });

    const barGeometry = new THREE.BoxGeometry(barWidth, barLength, barWidth);

    const bar1 = new THREE.Mesh(barGeometry, material);
    bar1.castShadow = true;
    bar1.receiveShadow = true;
    bar1.rotation.z = Math.PI / 4;
    
    const bar2 = new THREE.Mesh(barGeometry, material);
    bar2.castShadow = true;
    bar2.receiveShadow = true;
    bar2.rotation.z = -Math.PI / 4;

    const xGroup = new THREE.Group();
    xGroup.add(bar1);
    xGroup.add(bar2);

    return xGroup;
}


function createBouncingX(position) {
    const x = createX();
    
    x.position.copy(position);

    x.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
    );
    x.userData.angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
    );

    bouncingXs.push(x);
    scene.add(x);
}

// --- Animation & Updates ---
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  bouncingXs.forEach(x => {
    x.position.add(x.userData.velocity.clone().multiplyScalar(deltaTime));

    x.rotation.x += x.userData.angularVelocity.x * deltaTime;
    x.rotation.y += x.userData.angularVelocity.y * deltaTime;
    x.rotation.z += x.userData.angularVelocity.z * deltaTime;

    const halfRoomSize = roomSize / 2;

    if (x.position.x > halfRoomSize || x.position.x < -halfRoomSize) {
        x.userData.velocity.x *= -1;
    }
    if (x.position.y > halfRoomSize || x.position.y < -halfRoomSize) {
        x.userData.velocity.y *= -1;
    }
    if (x.position.z > halfRoomSize || x.position.z < -halfRoomSize) {
        x.userData.velocity.z *= -1;
    }
  });

  for (let i = 0; i < bouncingXs.length; i++) {
    for (let j = i + 1; j < bouncingXs.length; j++) {
        const x1 = bouncingXs[i];
        const x2 = bouncingXs[j];

        if (x1.position.distanceTo(x2.position) < 2) {
            const tempVelocity = x1.userData.velocity.clone();
            x1.userData.velocity.copy(x2.userData.velocity);
            x2.userData.velocity.copy(tempVelocity);
        }
    }
  }

  renderer.render(scene, camera);
}

// --- Lifecycle Hooks ---
onMounted(() => {
  if (container.value) {
    init();
    animate();
    // Add a few initial X's
    for(let i = 0; i < 5; i++) {
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * roomSize,
            (Math.random() - 0.5) * roomSize,
            (Math.random() - 0.5) * roomSize
        );
        createBouncingX(position);
    }
  }
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', onWindowResize);
  if(renderer) {
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
  }
});

function onWindowResize() {
    if(!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

watch(() => colorMode.value, (newMode) => {
  if (!scene || !room || !ambientLight) return;
  const newTheme = themeSettings[newMode];
  
  scene.background.set(newTheme.background);
  room.material.color.set(newTheme.background);
  ambientLight.intensity = newTheme.ambientIntensity;
});
</script> 