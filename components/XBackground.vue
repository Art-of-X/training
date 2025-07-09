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

    // Exact X-shape wall collision detection
    const halfRoomSize = roomSize / 2;
    const bounceFactor = -1;
    const positionOffset = 0.1;

    // Function to get the extreme points of the X shape in world coordinates
    function getXExtremePoints(xObject) {
        const points = [];
        // Sample points along both diagonal bars
        for (let bar = 0; bar < 2; bar++) {
            for (let t = 0; t <= 10; t++) {
                const progress = t / 10;
                let localPoint;
                
                if (bar === 0) { // First diagonal
                    localPoint = new THREE.Vector3(
                        (progress - 0.5) * 2,
                        (progress - 0.5) * 2,
                        0
                    );
                } else { // Second diagonal
                    localPoint = new THREE.Vector3(
                        (progress - 0.5) * 2,
                        (0.5 - progress) * 2,
                        0
                    );
                }
                
                const worldPoint = localPoint.applyMatrix4(xObject.matrixWorld);
                points.push(worldPoint);
            }
        }
        return points;
    }

    const xPoints = getXExtremePoints(x);
    
    // Check each point against walls
    for (const point of xPoints) {
        // X walls
        if (point.x <= -halfRoomSize) {
            x.userData.velocity.x = Math.abs(x.userData.velocity.x);
            x.position.x += positionOffset;
            x.userData.angularVelocity.y += (Math.random() - 0.5) * 0.5;
            break;
        }
        if (point.x >= halfRoomSize) {
            x.userData.velocity.x = -Math.abs(x.userData.velocity.x);
            x.position.x -= positionOffset;
            x.userData.angularVelocity.y += (Math.random() - 0.5) * 0.5;
            break;
        }
    }
    
    for (const point of xPoints) {
        // Y walls
        if (point.y <= -halfRoomSize) {
            x.userData.velocity.y = Math.abs(x.userData.velocity.y);
            x.position.y += positionOffset;
            x.userData.angularVelocity.x += (Math.random() - 0.5) * 0.5;
            break;
        }
        if (point.y >= halfRoomSize) {
            x.userData.velocity.y = -Math.abs(x.userData.velocity.y);
            x.position.y -= positionOffset;
            x.userData.angularVelocity.x += (Math.random() - 0.5) * 0.5;
            break;
        }
    }

    for (const point of xPoints) {
        // Z walls
        if (point.z <= -halfRoomSize) {
            x.userData.velocity.z = Math.abs(x.userData.velocity.z);
            x.position.z += positionOffset;
            x.userData.angularVelocity.y += (Math.random() - 0.5) * 0.5;
            break;
        }
        if (point.z >= halfRoomSize) {
            x.userData.velocity.z = -Math.abs(x.userData.velocity.z);
            x.position.z -= positionOffset;
            x.userData.angularVelocity.y += (Math.random() - 0.5) * 0.5;
            break;
        }
    }
  });

  // Exact X-shape collision detection
  for (let i = 0; i < bouncingXs.length; i++) {
    for (let j = i + 1; j < bouncingXs.length; j++) {
        const x1 = bouncingXs[i];
        const x2 = bouncingXs[j];

        // Check if X shapes are close enough to potentially collide
        const distance = x1.position.distanceTo(x2.position);
        if (distance < 3) {
            let collision = false;

            // Function to check if a point is inside a rotated box (X bar)
            function pointInXBar(point, xObject, barIndex) {
                const localPoint = point.clone();
                const inverseMatrix = new THREE.Matrix4().copy(xObject.matrixWorld).invert();
                localPoint.applyMatrix4(inverseMatrix);
                
                // Bar dimensions
                const barLength = 2;
                const barWidth = 0.3;
                
                // Check if point is within the bar bounds considering rotation
                if (barIndex === 0) { // First diagonal bar (45 degrees)
                    const rotatedPoint = localPoint.clone();
                    rotatedPoint.applyAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4);
                    return Math.abs(rotatedPoint.x) <= barWidth/2 && 
                           Math.abs(rotatedPoint.y) <= barLength/2 && 
                           Math.abs(rotatedPoint.z) <= barWidth/2;
                } else { // Second diagonal bar (-45 degrees)
                    const rotatedPoint = localPoint.clone();
                    rotatedPoint.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4);
                    return Math.abs(rotatedPoint.x) <= barWidth/2 && 
                           Math.abs(rotatedPoint.y) <= barLength/2 && 
                           Math.abs(rotatedPoint.z) <= barWidth/2;
                }
            }

            // Generate points along X1's bars and check if they intersect with X2's bars
            const testResolution = 10;
            for (let bar = 0; bar < 2; bar++) {
                for (let t = 0; t <= testResolution; t++) {
                    const progress = t / testResolution;
                    let localPoint;
                    
                    if (bar === 0) { // First diagonal
                        localPoint = new THREE.Vector3(
                            (progress - 0.5) * 2,
                            (progress - 0.5) * 2,
                            0
                        );
                    } else { // Second diagonal
                        localPoint = new THREE.Vector3(
                            (progress - 0.5) * 2,
                            (0.5 - progress) * 2,
                            0
                        );
                    }
                    
                    const worldPoint = localPoint.applyMatrix4(x1.matrixWorld);
                    
                    // Check if this point intersects with either bar of X2
                    if (pointInXBar(worldPoint, x2, 0) || pointInXBar(worldPoint, x2, 1)) {
                        collision = true;
                        break;
                    }
                }
                if (collision) break;
            }

            if (collision) {
                // Nudge apart to avoid sticking
                const direction = new THREE.Vector3().subVectors(x1.position, x2.position).normalize();
                x1.position.add(direction.clone().multiplyScalar(0.15));
                x2.position.add(direction.clone().multiplyScalar(-0.15));

                // Realistic elastic collision
                const tempVelocity = x1.userData.velocity.clone();
                x1.userData.velocity.copy(x2.userData.velocity);
                x2.userData.velocity.copy(tempVelocity);

                // Add some randomness to angular velocity for more dynamic bouncing
                const tempAngular = x1.userData.angularVelocity.clone();
                x1.userData.angularVelocity.copy(x2.userData.angularVelocity);
                x2.userData.angularVelocity.copy(tempAngular);
            }
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