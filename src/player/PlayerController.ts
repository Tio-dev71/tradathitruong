import * as THREE from 'three';
import type { CollisionSystem } from '../world/CollisionSystem';
import type { AvatarRig } from './AvatarBuilder';

export class PlayerController {
  public position = new THREE.Vector3(0, 0, 4);
  public rotationY = Math.PI;
  public isMoving = false;
  public isRunning = false;
  public isSitting = false;
  public currentEmote?: string;
  private emoteTimer = 0;

  private walkSpeed = 4.2;
  private runSpeed = 7.8;

  // Camera parameters
  public cameraDistance = 6.2;
  public cameraPitch = 0.38; // vertical angle in radians (cao hơn để góc nhìn thứ 3 thoáng đãng, nhìn rõ phố xá)
  public cameraYaw = 0; // horizontal angle in radians
  private targetCameraPos = new THREE.Vector3();
  public cameraMode: 'third' | 'first' = 'third';
  public onCameraModeChange?: (mode: 'third' | 'first') => void;

  // Camera follow mode in 3rd person: true = bám theo nhân vật; false = tự do xoay bằng chuột
  public autoFollowCamera = true;
  public onCameraFollowModeChange?: (autoFollow: boolean) => void;

  // Jump physics
  public velocityY = 0;
  public isGrounded = true;
  private jumpForce = 6.2;
  private gravity = -18.0;

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

    // On mobile portrait, adjust camera distance for comfortable framing
    if (typeof window !== 'undefined' && window.innerHeight > window.innerWidth) {
      this.cameraDistance = 7.2;
    }

    this.bindEvents();
  }

  public resetKeys() {
    this.keys = {};
    this.isPointerDown = false;
  }

  public toggleCameraMode(): 'third' | 'first' {
    this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
    if (this.cameraMode === 'third') {
      this.cameraDistance = Math.max(4.0, this.cameraDistance);
      this.cameraPitch = Math.max(0.1, Math.min(Math.PI / 2.3, this.cameraPitch));
    } else {
      // First person initial pitch level
      this.cameraPitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraPitch));
    }
    this.onCameraModeChange?.(this.cameraMode);
    return this.cameraMode;
  }

  public setCameraMode(mode: 'third' | 'first') {
    if (this.cameraMode !== mode) {
      this.cameraMode = mode;
      if (this.cameraMode === 'third') {
        this.cameraDistance = Math.max(4.0, this.cameraDistance);
        this.cameraPitch = Math.max(0.1, Math.min(Math.PI / 2.3, this.cameraPitch));
      }
      this.onCameraModeChange?.(this.cameraMode);
    }
  }

  public toggleAutoFollowCamera(): boolean {
    this.autoFollowCamera = !this.autoFollowCamera;
    this.onCameraFollowModeChange?.(this.autoFollowCamera);
    return this.autoFollowCamera;
  }

  public setAutoFollowCamera(autoFollow: boolean) {
    this.autoFollowCamera = autoFollow;
    this.onCameraFollowModeChange?.(this.autoFollowCamera);
  }

  public jump() {
    if (this.isSitting) {
      this.isSitting = false;
    }
    if (this.isGrounded) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
    }
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
      // Don't capture keys if typing in chat input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      // [Space] Jump
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.jump();
        return;
      }

      const k = normalizeKey(e.code, e.key);
      this.keys[k] = true;

      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        this.onInteract?.();
      }

      // [V] Switch between First-Person and Third-Person View
      if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
        this.toggleCameraMode();
      }

      // [C] Toggle Auto-follow vs Free mouse camera in third person
      if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        this.toggleAutoFollowCamera();
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

    // Mouse drag for camera orbit / aim
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
      if (this.cameraMode === 'first') {
        // First-person view: look up and down freely (-78 deg to +78 deg)
        this.cameraPitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraPitch + dy * 0.004));
      } else {
        // Third-person view: stay above ground level with higher vantage angle (up to 42 degrees)
        this.cameraPitch = Math.max(0.10, Math.min(0.72, this.cameraPitch + dy * 0.0035));
      }
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    // Mouse scroll for camera zoom & switching between 1st/3rd person
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.cameraMode === 'first') {
        if (e.deltaY > 25) {
          // Scrolling back zooms out to third person
          this.cameraDistance = 4.0;
          this.toggleCameraMode();
        }
      } else {
        const nextDist = this.cameraDistance + e.deltaY * 0.005;
        if (nextDist < 2.2 && e.deltaY < 0) {
          // Scrolling all the way in enters first-person view
          this.toggleCameraMode();
        } else {
          this.cameraDistance = Math.max(2.5, Math.min(12.0, nextDist));
        }
      }
    }, { passive: false });
  }

  public update(delta: number, avatarRig?: AvatarRig) {
    // 1. Vertical Jump & Gravity Physics
    if (!this.isGrounded || this.position.y > 0 || this.velocityY !== 0) {
      this.velocityY += this.gravity * delta;
      this.position.y += this.velocityY * delta;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }

    // 2. Gather movement and turning inputs
    const keyForward = Boolean(this.keys['KeyW'] || this.keys['ArrowUp']);
    const keyBackward = Boolean(this.keys['KeyS'] || this.keys['ArrowDown']);
    const keyTurnLeft = Boolean(this.keys['KeyA'] || this.keys['ArrowLeft']);
    const keyTurnRight = Boolean(this.keys['KeyD'] || this.keys['ArrowRight']);
    const keyStrafeLeft = Boolean(this.keys['KeyQ']);

    // Mobile joystick input
    const joyForward = -this.joystickVector.y; // positive when pushed up
    const joyTurn = this.joystickVector.x; // positive when pushed right

    this.isRunning = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const speed = this.isRunning ? this.runSpeed : this.walkSpeed;

    let dirX = 0;
    let dirZ = 0;

    if (this.cameraMode === 'first') {
      // --- FIRST PERSON VIEW ---
      // In first person, camera looks horizontally at (-sin(yaw), -cos(yaw))
      const camFwdX = -Math.sin(this.cameraYaw);
      const camFwdZ = -Math.cos(this.cameraYaw);
      const camRightX = Math.cos(this.cameraYaw);
      const camRightZ = -Math.sin(this.cameraYaw);

      // Turning / steering with A/D or joystick
      const turnSpeed = 3.2;
      let turnInput = 0;
      if (keyTurnLeft) turnInput += 1;
      if (keyTurnRight) turnInput -= 1;
      if (Math.abs(joyTurn) > 0.15) turnInput -= joyTurn;

      if (Math.abs(turnInput) > 0.01) {
        if (this.isSitting) this.isSitting = false;
        this.cameraYaw += turnInput * turnSpeed * delta;
      }

      // W moves forward in the exact look direction; S backpedals
      let moveInput = 0;
      if (keyForward) moveInput += 1;
      if (keyBackward) moveInput -= 0.7; // smooth backpedal
      if (Math.abs(joyForward) > 0.15) moveInput += joyForward;

      if (Math.abs(moveInput) > 0.05 || keyStrafeLeft) {
        dirX += camFwdX * moveInput;
        dirZ += camFwdZ * moveInput;
        if (keyStrafeLeft) {
          dirX -= camRightX * 0.8;
          dirZ -= camRightZ * 0.8;
        }
      }

      // Sync character orientation with camera yaw
      this.rotationY = this.cameraYaw + Math.PI;
    } else if (!this.autoFollowCamera) {
      // --- THIRD PERSON: FREE CAMERA (Cam Tự Do - Xoay bằng chuột, camera không tự xoay) ---
      const camFwdX = -Math.sin(this.cameraYaw);
      const camFwdZ = -Math.cos(this.cameraYaw);
      const camRightX = Math.cos(this.cameraYaw);
      const camRightZ = -Math.sin(this.cameraYaw);

      let fwdInput = 0;
      if (keyForward) fwdInput += 1;
      if (keyBackward) fwdInput -= 0.8;
      if (Math.abs(joyForward) > 0.15) fwdInput += joyForward;

      let sideInput = 0;
      if (keyTurnRight) sideInput += 1;
      if (keyTurnLeft) sideInput -= 1;
      if (Math.abs(joyTurn) > 0.15) sideInput += joyTurn;
      if (keyStrafeLeft) sideInput -= 0.8;

      dirX = camFwdX * fwdInput + camRightX * sideInput;
      dirZ = camFwdZ * fwdInput + camRightZ * sideInput;

      // Smoothly rotate avatar body to face movement direction
      if (Math.hypot(dirX, dirZ) > 0.05) {
        const targetRotY = Math.atan2(dirX, dirZ);
        let diff = targetRotY - this.rotationY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.rotationY += diff * Math.min(1.0, delta * 14);
      }
    } else {
      // --- THIRD PERSON: AUTO-FOLLOW (Cam tự động bám sau lưng nhân vật) ---
      const turnSpeed = 3.4;
      let turnInput = 0;
      if (keyTurnLeft) turnInput += 1;
      if (keyTurnRight) turnInput -= 1;
      if (Math.abs(joyTurn) > 0.15) turnInput -= joyTurn;

      if (Math.abs(turnInput) > 0.01) {
        if (this.isSitting) this.isSitting = false;
        this.rotationY += turnInput * turnSpeed * delta;
      }

      let moveInput = 0;
      if (keyForward) moveInput += 1;
      if (keyBackward) moveInput -= 0.7; // smooth backpedal
      if (Math.abs(joyForward) > 0.15) moveInput += joyForward;

      const fwdX = Math.sin(this.rotationY);
      const fwdZ = Math.cos(this.rotationY);
      const rightX = Math.cos(this.rotationY);
      const rightZ = -Math.sin(this.rotationY);

      dirX = fwdX * moveInput;
      dirZ = fwdZ * moveInput;

      if (keyStrafeLeft) {
        dirX -= rightX * 0.8;
        dirZ -= rightZ * 0.8;
      }

      if (this.isPointerDown && keyForward) {
        this.rotationY = this.cameraYaw + Math.PI;
      }
    }

    const moveLen = Math.hypot(dirX, dirZ);
    this.isMoving = moveLen > 0.05;

    if (this.isMoving) {
      if (this.isSitting) this.isSitting = false;

      const nextX = this.position.x + (dirX / moveLen) * speed * delta;
      const nextZ = this.position.z + (dirZ / moveLen) * speed * delta;

      // Collision resolution
      const resolved = this.collisionSystem.resolveMovement(
        { x: this.position.x, z: this.position.z },
        { x: nextX, z: nextZ },
        0.45
      );

      this.position.x = resolved.x;
      this.position.z = resolved.z;
    }

    // Handle Emote timer
    if (this.emoteTimer > 0) {
      this.emoteTimer -= delta;
      if (this.emoteTimer <= 0) {
        this.currentEmote = undefined;
      }
    }

    // 3. Update avatar position and orientation
    if (avatarRig) {
      avatarRig.root.position.set(this.position.x, this.position.y, this.position.z);
      avatarRig.root.rotation.y = this.rotationY;

      // In first-person view, hide the local avatar to prevent clipping into view
      avatarRig.root.visible = this.cameraMode === 'third';

      if (this.cameraMode === 'third') {
        avatarRig.updateAnimation(performance.now() / 1000, this.isMoving, this.isRunning, this.isSitting, this.currentEmote);
      }
    }

    // 4. Update Camera Position & Follow Orientation
    if (this.cameraMode === 'first') {
      // First Person Camera: placed exactly at avatar eye height
      const eyeHeight = this.isSitting ? 0.85 : 1.18;
      this.camera.position.set(
        this.position.x,
        this.position.y + eyeHeight,
        this.position.z
      );

      // Aim camera towards camera yaw & pitch
      const forwardX = -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch);
      const forwardY = -Math.sin(this.cameraPitch);
      const forwardZ = -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch);

      this.camera.lookAt(
        this.camera.position.x + forwardX * 10,
        this.camera.position.y + forwardY * 10,
        this.camera.position.z + forwardZ * 10
      );
    } else {
      // Third Person Follow Camera:
      // Tự động bám sau lưng nhân vật chỉ khi autoFollowCamera === true và không giữ chuột
      if (this.autoFollowCamera && !this.isPointerDown) {
        const desiredCameraYaw = this.rotationY - Math.PI;
        let diff = desiredCameraYaw - this.cameraYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.cameraYaw += diff * Math.min(1.0, delta * 12);

        // Tự động trả góc nhìn về góc pitch cao (0.38 rad)
        this.cameraPitch += (0.38 - this.cameraPitch) * Math.min(1.0, delta * 3);
      }

      // Height offset cao hơn (+1.8m) cho góc nhìn thứ 3 thoáng đãng
      const offsetX = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
      const offsetY = Math.sin(this.cameraPitch) * this.cameraDistance + 1.8;
      const offsetZ = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

      this.targetCameraPos.set(
        this.position.x + offsetX,
        this.position.y + offsetY,
        this.position.z + offsetZ
      );

      // Smooth camera lag
      this.camera.position.lerp(this.targetCameraPos, Math.min(1.0, delta * 12));
      this.camera.lookAt(this.position.x, this.position.y + 1.25, this.position.z);
    }
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
