import * as THREE from 'three';
import type { CollisionSystem } from '../world/CollisionSystem';
import type { AvatarRig } from './AvatarBuilder';

export class PlayerController {
  public position = new THREE.Vector3(0, 0, 4);
  public rotationY = 0;
  public isMoving = false;
  public isRunning = false;
  public isSitting = false;
  public currentEmote?: string;
  private emoteTimer = 0;

  private walkSpeed = 4.2;
  private runSpeed = 7.8;

  // Third-person camera parameters
  public cameraDistance = 6.5;
  public cameraPitch = 0.35; // vertical angle in radians (above ground)
  public cameraYaw = 0; // horizontal angle in radians
  private targetCameraPos = new THREE.Vector3();

  // Input states
  private keys: Record<string, boolean> = {};
  public joystickVector = { x: 0, y: 0 }; // for mobile virtual joystick

  private collisionSystem: CollisionSystem;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private isPointerDown = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  public onInteract?: () => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    collisionSystem: CollisionSystem,
    initialPos: { x: number; y: number; z: number } = { x: 0, y: 0, z: 4 }
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.collisionSystem = collisionSystem;
    this.position.set(initialPos.x, initialPos.y, initialPos.z);

    this.bindEvents();
  }

  public resetKeys() {
    this.keys = {};
    this.isPointerDown = false;
  }

  private bindEvents() {
    const normalizeKey = (code: string, key: string): string => {
      const lower = key ? key.toLowerCase() : '';
      if (code === 'KeyW' || lower === 'w') return 'KeyW';
      if (code === 'KeyS' || lower === 's') return 'KeyS';
      if (code === 'KeyA' || lower === 'a') return 'KeyA';
      if (code === 'KeyD' || lower === 'd') return 'KeyD';
      return code;
    };

    window.addEventListener('keydown', (e) => {
      // Don't capture WASD if typing in chat input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      const k = normalizeKey(e.code, e.key);
      this.keys[k] = true;

      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        this.onInteract?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = normalizeKey(e.code, e.key);
      this.keys[k] = false;
      // Also clear standard code
      this.keys[e.code] = false;
    });

    // Reset all pressed keys when window loses focus or user switches tabs
    window.addEventListener('blur', () => {
      this.resetKeys();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.resetKeys();
      }
    });

    // Mouse drag for camera orbit
    this.domElement.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.cameraYaw -= dx * 0.005;
      this.cameraPitch = Math.max(0.1, Math.min(Math.PI / 2.3, this.cameraPitch + dy * 0.004));
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    // Mouse scroll for camera zoom
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(3.2, Math.min(12.0, this.cameraDistance + e.deltaY * 0.005));
    }, { passive: false });
  }

  public update(delta: number, avatarRig?: AvatarRig) {
    // 1. Gather movement vector
    let moveForward = 0;
    let moveRight = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveForward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveForward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveRight -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveRight += 1;

    // Mobile joystick input
    if (Math.abs(this.joystickVector.y) > 0.1) moveForward -= this.joystickVector.y;
    if (Math.abs(this.joystickVector.x) > 0.1) moveRight += this.joystickVector.x;

    this.isRunning = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const speed = this.isRunning ? this.runSpeed : this.walkSpeed;

    const inputLength = Math.sqrt(moveForward * moveForward + moveRight * moveRight);
    this.isMoving = inputLength > 0.1;

    if (this.isMoving) {
      if (this.isSitting) {
        // Stand up if moving
        this.isSitting = false;
      }

      const normX = moveRight / inputLength;
      const normZ = -moveForward / inputLength;

      // Transform direction relative to camera angle
      const sinYaw = Math.sin(this.cameraYaw);
      const cosYaw = Math.cos(this.cameraYaw);

      const worldDirX = normX * cosYaw - normZ * sinYaw;
      const worldDirZ = normX * sinYaw + normZ * cosYaw;

      // Target position
      const nextX = this.position.x + worldDirX * speed * delta;
      const nextZ = this.position.z + worldDirZ * speed * delta;

      // Collision resolution
      const resolved = this.collisionSystem.resolveMovement(
        { x: this.position.x, z: this.position.z },
        { x: nextX, z: nextZ },
        0.45
      );

      this.position.x = resolved.x;
      this.position.z = resolved.z;

      // Smoothly rotate avatar towards movement direction
      const targetAngle = Math.atan2(worldDirX, worldDirZ);
      let angleDiff = targetAngle - this.rotationY;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.rotationY += angleDiff * Math.min(1.0, delta * 12);
    }

    // Handle Emote timer
    if (this.emoteTimer > 0) {
      this.emoteTimer -= delta;
      if (this.emoteTimer <= 0) {
        this.currentEmote = undefined;
      }
    }

    // 2. Update avatar position and orientation
    if (avatarRig) {
      avatarRig.root.position.x = this.position.x;
      avatarRig.root.position.z = this.position.z;
      avatarRig.root.rotation.y = this.rotationY;
      avatarRig.updateAnimation(performance.now() / 1000, this.isMoving, this.isRunning, this.isSitting, this.currentEmote);
    }

    // 3. Update third-person camera position
    const offsetX = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const offsetY = Math.sin(this.cameraPitch) * this.cameraDistance + 1.2;
    const offsetZ = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    this.targetCameraPos.set(
      this.position.x + offsetX,
      this.position.y + offsetY,
      this.position.z + offsetZ
    );

    // Smooth camera lag
    this.camera.position.lerp(this.targetCameraPos, Math.min(1.0, delta * 8));
    this.camera.lookAt(this.position.x, this.position.y + 1.2, this.position.z);
  }

  public playEmote(emote: string) {
    this.currentEmote = emote;
    this.emoteTimer = 3.5;
  }

  public setSitting(sitting: boolean, seatPos?: { x: number; y: number; z: number }, facingY?: number) {
    this.isSitting = sitting;
    if (sitting && seatPos) {
      this.position.x = seatPos.x;
      this.position.z = seatPos.z;
      if (facingY !== undefined) {
        this.rotationY = facingY;
      }
    }
  }
}
