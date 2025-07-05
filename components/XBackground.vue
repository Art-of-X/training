<template>
  <div ref="container" class="fixed top-0 left-0 w-full h-full -z-10"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';

const container = ref(null);

let renderer, scene, camera, animationFrameId, raycaster;
const bouncingXs = [];
const roomSize = 30;
const clock = new THREE.Clock();

// --- Initialization Functions ---
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

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
    color: 0xffffff,
    side: THREE.BackSide,
    metalness: 0,
    roughness: 1
  });
  const room = new THREE.Mesh(roomGeometry, roomMaterial);
  room.receiveShadow = true;
  scene.add(room);
}

function createLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
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

    // Generate high intensity colors dynamically
    const hue = Math.random(); // Full hue range
    const saturation = 0.9 + Math.random() * 0.1; // 0.9 to 1.0 for maximum saturation
    const lightness = 0.4 + Math.random() * 0.4;  // 0.4 to 0.8 for bright but not washed out
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
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
    );
    x.userData.angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
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
    const positionOffset = 1.2; 

    if (x.position.x > halfRoomSize - positionOffset) {
        x.position.x = halfRoomSize - positionOffset;
        x.userData.velocity.x *= -1;
    } else if (x.position.x < -halfRoomSize + positionOffset) {
        x.position.x = -halfRoomSize + positionOffset;
        x.userData.velocity.x *= -1;
    }

    if (x.position.y > halfRoomSize - positionOffset) {
        x.position.y = halfRoomSize - positionOffset;
        x.userData.velocity.y *= -1;
    } else if (x.position.y < -halfRoomSize + positionOffset) {
        x.position.y = -halfRoomSize + positionOffset;
        x.userData.velocity.y *= -1;
    }

    if (x.position.z > halfRoomSize - positionOffset) {
        x.position.z = halfRoomSize - positionOffset;
        x.userData.velocity.z *= -1;
    } else if (x.position.z < -halfRoomSize + positionOffset) {
        x.position.z = -halfRoomSize + positionOffset;
        x.userData.velocity.z *= -1;
    }
  });

  for (let i = 0; i < bouncingXs.length; i++) {
    for (let j = i + 1; j < bouncingXs.length; j++) {
        const x1 = bouncingXs[i];
        const x2 = bouncingXs[j];

        const distance = x1.position.distanceTo(x2.position);

        if (distance < 2) { 
            const tempVelocity = x1.userData.velocity.clone();
            x1.userData.velocity.copy(x2.userData.velocity);
            x2.userData.velocity.copy(tempVelocity);

            const tempAngular = x1.userData.angularVelocity.clone();
            x1.userData.angularVelocity.copy(x2.userData.angularVelocity);
            x2.userData.angularVelocity.copy(tempAngular);
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
    for(let i = 0; i < 10; i++) {
        createBouncingX(new THREE.Vector3(
            (Math.random() - 0.5) * roomSize,
            (Math.random() - 0.5) * roomSize,
            (Math.random() - 0.5) * roomSize
        ));
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

</script> 