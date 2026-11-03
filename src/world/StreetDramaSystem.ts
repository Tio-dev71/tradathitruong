import * as THREE from 'three';
import { soundEngine } from '../services/soundEngine';

export interface DramaSpot {
  startA: THREE.Vector3;
  meetA: THREE.Vector3;
  exitA: THREE.Vector3;

  startB: THREE.Vector3;
  meetB: THREE.Vector3;
  exitB: THREE.Vector3;
}

export class StreetDramaSystem {
  public root = new THREE.Group();
  private scene: THREE.Scene;

  // Character A: Trader Đu Đỉnh (Áo đỏ)
  private charA = new THREE.Group();
  private headA = new THREE.Group();
  private bodyA!: THREE.Mesh;
  private leftArmA = new THREE.Group();
  private rightArmA = new THREE.Group();
  private leftLegA = new THREE.Group();
  private rightLegA = new THREE.Group();
  private bubbleA!: THREE.Sprite;

  // Character B: Chiến Thần Bắt Đáy (Áo vàng)
  private charB = new THREE.Group();
  private headB = new THREE.Group();
  private bodyB!: THREE.Mesh;
  private leftArmB = new THREE.Group();
  private rightArmB = new THREE.Group();
  private leftLegB = new THREE.Group();
  private rightLegB = new THREE.Group();
  private bubbleB!: THREE.Sprite;

  // State Machine: hidden -> walking_in -> arguing -> walking_out -> hidden
  private status: 'hidden' | 'walking_in' | 'arguing' | 'walking_out' = 'hidden';
  private timer = 0;
  // Reduced frequency: first event after ~80-120s, subsequent events every 3-5 minutes (180-300s)
  private nextEventCountdown = 85 + Math.random() * 35;
  private onChatCallback?: (text: string) => void;
  private currentSpot!: DramaSpot;

  // 3 Scenic Street spots for characters to walk in, meet, argue, and walk out
  private spots: DramaSpot[] = [
    // Spot 0: Vỉa hè đối diện quán trà (ngã tư vạch kẻ đường)
    {
      startA: new THREE.Vector3(-5.5, 0, 5.0),
      meetA: new THREE.Vector3(-1.6, 0, 5.0),
      exitA: new THREE.Vector3(-7.5, 0, 5.0),

      startB: new THREE.Vector3(3.2, 0, 5.0),
      meetB: new THREE.Vector3(-0.5, 0, 5.0),
      exitB: new THREE.Vector3(5.0, 0, 5.0),
    },
    // Spot 1: Vỉa hè góc phố cạnh Tiệm Vàng DJN
    {
      startA: new THREE.Vector3(3.0, 0, -3.2),
      meetA: new THREE.Vector3(6.2, 0, -3.2),
      exitA: new THREE.Vector3(1.5, 0, -3.2),

      startB: new THREE.Vector3(10.5, 0, -3.2),
      meetB: new THREE.Vector3(7.4, 0, -3.2),
      exitB: new THREE.Vector3(12.0, 0, -3.2),
    },
    // Spot 2: Gần cổng chào làng bên lề đường
    {
      startA: new THREE.Vector3(-10.5, 0, 3.8),
      meetA: new THREE.Vector3(-7.2, 0, 3.8),
      exitA: new THREE.Vector3(-12.5, 0, 3.8),

      startB: new THREE.Vector3(-3.0, 0, 3.8),
      meetB: new THREE.Vector3(-5.9, 0, 3.8),
      exitB: new THREE.Vector3(-1.5, 0, 3.8),
    },
  ];

  constructor(scene: THREE.Scene, onChatCallback?: (text: string) => void) {
    this.scene = scene;
    this.onChatCallback = onChatCallback;

    this.buildCharacterA();
    this.buildCharacterB();

    this.root.add(this.charA);
    this.root.add(this.charB);
    this.root.visible = false;
    this.scene.add(this.root);
  }

  public setChatCallback(cb: (text: string) => void) {
    this.onChatCallback = cb;
  }

  // Build Character A: "Trader Đu Đỉnh" (Áo đỏ, hầm hố)
  private buildCharacterA() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cda7, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.6 }); // Red hoodie
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.8 }); // Dark pants
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.5 });

    // Torso
    this.bodyA = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.55, 8), shirtMat);
    this.bodyA.position.y = 0.6;
    this.bodyA.castShadow = true;
    this.charA.add(this.bodyA);

    // Head
    this.headA.position.y = 1.05;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), skinMat);
    headMesh.castShadow = true;
    this.headA.add(headMesh);

    // Hair
    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    hairMesh.position.y = 0.05;
    this.headA.add(hairMesh);

    // Fierce Eyes & Angry Eyebrows
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    eyeL.position.set(0.09, 0.02, 0.23);
    this.headA.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    eyeR.position.set(-0.09, 0.02, 0.23);
    this.headA.add(eyeR);

    // Angry Brow slant
    const browMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.02), browMat);
    browL.position.set(0.09, 0.07, 0.24);
    browL.rotation.z = -0.3;
    this.headA.add(browL);

    const browR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.02), browMat);
    browR.position.set(-0.09, 0.07, 0.24);
    browR.rotation.z = 0.3;
    this.headA.add(browR);

    this.charA.add(this.headA);

    // Arms with shoulder joints
    const armGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 6);
    armGeom.translate(0, -0.19, 0);

    this.leftArmA.position.set(0.3, 0.78, 0);
    const armL = new THREE.Mesh(armGeom, shirtMat);
    armL.castShadow = true;
    this.leftArmA.add(armL);
    this.charA.add(this.leftArmA);

    this.rightArmA.position.set(-0.3, 0.78, 0);
    const armR = new THREE.Mesh(armGeom, shirtMat);
    armR.castShadow = true;
    this.rightArmA.add(armR);
    this.charA.add(this.rightArmA);

    // Legs with hip joints
    const legGeom = new THREE.CylinderGeometry(0.08, 0.075, 0.42, 6);
    legGeom.translate(0, -0.21, 0);

    this.leftLegA.position.set(0.12, 0.42, 0);
    const legMeshL = new THREE.Mesh(legGeom, pantsMat);
    legMeshL.castShadow = true;
    this.leftLegA.add(legMeshL);
    this.charA.add(this.leftLegA);

    this.rightLegA.position.set(-0.12, 0.42, 0);
    const legMeshR = new THREE.Mesh(legGeom, pantsMat);
    legMeshR.castShadow = true;
    this.rightLegA.add(legMeshR);
    this.charA.add(this.rightLegA);

    // Speech Bubble Sprite
    this.bubbleA = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createBubbleTexture('Mày bảo ai đu đỉnh?!', '#d90429'),
        transparent: true,
      })
    );
    this.bubbleA.scale.set(3.2, 1.4, 1);
    this.bubbleA.position.set(0, 1.85, 0);
    this.bubbleA.visible = false;
    this.charA.add(this.bubbleA);
  }

  // Build Character B: "Chiến Thần Bắt Đáy" (Áo vàng, cãi lại)
  private buildCharacterB() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cda7, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf4a261, roughness: 0.6 }); // Yellowish orange
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x264653, roughness: 0.8 }); // Blue-grey pants
    const capMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.6 }); // Cap

    // Torso
    this.bodyB = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.55, 8), shirtMat);
    this.bodyB.position.y = 0.6;
    this.bodyB.castShadow = true;
    this.charB.add(this.bodyB);

    // Head
    this.headB.position.y = 1.05;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), skinMat);
    headMesh.castShadow = true;
    this.headB.add(headMesh);

    // Baseball cap backwards
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    capDome.position.y = 0.06;
    this.headB.add(capDome);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.16), capMat);
    visor.position.set(0, 0.08, -0.28);
    visor.rotation.x = 0.15;
    this.headB.add(visor);

    // Defiant Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    eyeL.position.set(0.09, 0.02, 0.23);
    this.headB.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    eyeR.position.set(-0.09, 0.02, 0.23);
    this.headB.add(eyeR);

    this.charB.add(this.headB);

    // Arms
    const armGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 6);
    armGeom.translate(0, -0.19, 0);

    this.leftArmB.position.set(0.3, 0.78, 0);
    const armL = new THREE.Mesh(armGeom, shirtMat);
    armL.castShadow = true;
    this.leftArmB.add(armL);
    this.charB.add(this.leftArmB);

    this.rightArmB.position.set(-0.3, 0.78, 0);
    const armR = new THREE.Mesh(armGeom, shirtMat);
    armR.castShadow = true;
    this.rightArmB.add(armR);
    this.charB.add(this.rightArmB);

    // Legs
    const legGeom = new THREE.CylinderGeometry(0.08, 0.075, 0.42, 6);
    legGeom.translate(0, -0.21, 0);

    this.leftLegB.position.set(0.12, 0.42, 0);
    const legMeshL = new THREE.Mesh(legGeom, pantsMat);
    legMeshL.castShadow = true;
    this.leftLegB.add(legMeshL);
    this.charB.add(this.leftLegB);

    this.rightLegB.position.set(-0.12, 0.42, 0);
    const legMeshR = new THREE.Mesh(legGeom, pantsMat);
    legMeshR.castShadow = true;
    this.rightLegB.add(legMeshR);
    this.charB.add(this.rightLegB);

    // Speech Bubble Sprite
    this.bubbleB = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createBubbleTexture('Thích bắt đáy không?! Vào đây!', '#e76f51'),
        transparent: true,
      })
    );
    this.bubbleB.scale.set(3.2, 1.4, 1);
    this.bubbleB.position.set(0, 1.85, 0);
    this.bubbleB.visible = false;
    this.charB.add(this.bubbleB);
  }

  // Create crisp comic speech bubble texture
  private createBubbleTexture(text: string, bgColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 200);

    // Speech bubble pill
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, 130, 24);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Pointer tail
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.moveTo(230, 146);
    ctx.lineTo(256, 185);
    ctx.lineTo(282, 146);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text with stroke shadow for maximum readability
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (text.length > 26) {
      const mid = text.lastIndexOf(' ', 26);
      const l1 = text.substring(0, mid > 0 ? mid : 26);
      const l2 = text.substring(mid > 0 ? mid + 1 : 26);
      ctx.fillText(l1, 256, 60);
      ctx.fillText(l2, 256, 100);
    } else {
      ctx.fillText(text, 256, 80);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private updateBubble(bubble: THREE.Sprite, text: string, color: string) {
    const tex = this.createBubbleTexture(text, color);
    bubble.material.map?.dispose();
    bubble.material.map = tex;
    bubble.material.needsUpdate = true;
    bubble.visible = true;
  }

  // Trigger: Characters spawn at start positions and walk in
  public triggerDrama(): void {
    if (this.status !== 'hidden') return;

    this.currentSpot = this.spots[Math.floor(Math.random() * this.spots.length)];

    // Place them at the outer start positions
    this.charA.position.copy(this.currentSpot.startA);
    this.charB.position.copy(this.currentSpot.startB);

    // Look towards the meeting confrontation point
    this.charA.lookAt(this.currentSpot.meetA);
    this.charB.lookAt(this.currentSpot.meetB);

    this.bubbleA.visible = false;
    this.bubbleB.visible = false;

    this.root.visible = true;
    this.status = 'walking_in';
  }

  // Start the argument once both characters meet
  private async startArguing() {
    this.status = 'arguing';

    // Face each other directly
    this.charA.lookAt(this.charB.position);
    this.charB.lookAt(this.charA.position);

    // Play actual audio chuinhau1.mp3 or chuinhau2.mp3
    const arg = await soundEngine.playStreetArgument();
    this.timer = arg.duration + 2.5;

    // Show speech bubbles
    this.updateBubble(this.bubbleA, arg.textA, '#d90429');
    this.updateBubble(this.bubbleB, arg.textB, '#e76f51');

    if (this.onChatCallback) {
      this.onChatCallback(`🗣️ Cãi vã đường phố: "${arg.summary}"`);
    }
  }

  // Finish arguing: Turn around and walk away
  private startWalkingOut() {
    this.status = 'walking_out';
    this.timer = 5.0; // 5 seconds to walk away

    // Show parting insult bubbles briefly
    this.updateBubble(this.bubbleA, 'Hừ! Nhớ mặt tao đấy!', '#4b5563');
    this.updateBubble(this.bubbleB, 'Biến đi cho rảnh nợ!', '#4b5563');

    // Turn towards exit directions
    this.charA.lookAt(this.currentSpot.exitA);
    this.charB.lookAt(this.currentSpot.exitB);

    setTimeout(() => {
      this.bubbleA.visible = false;
      this.bubbleB.visible = false;
    }, 2000);
  }

  public update(delta: number, timeSec: number) {
    // 1. Idle & countdown between occurrences (calm, rare interval: 3 to 5 minutes)
    if (this.status === 'hidden') {
      this.nextEventCountdown -= delta;
      if (this.nextEventCountdown <= 0) {
        this.nextEventCountdown = 180 + Math.random() * 120; // Next in 180-300s
        this.triggerDrama();
      }
      return;
    }

    const walkSpeed = 1.6; // Walking speed (m/s)

    // 2. WALKING IN: Moving towards meet points
    if (this.status === 'walking_in') {
      const distA = this.charA.position.distanceTo(this.currentSpot.meetA);
      const distB = this.charB.position.distanceTo(this.currentSpot.meetB);

      if (distA > 0.12) {
        const dirA = new THREE.Vector3().subVectors(this.currentSpot.meetA, this.charA.position).normalize();
        this.charA.position.addScaledVector(dirA, Math.min(distA, walkSpeed * delta));
        this.charA.lookAt(this.currentSpot.meetA);
      }
      if (distB > 0.12) {
        const dirB = new THREE.Vector3().subVectors(this.currentSpot.meetB, this.charB.position).normalize();
        this.charB.position.addScaledVector(dirB, Math.min(distB, walkSpeed * delta));
        this.charB.lookAt(this.currentSpot.meetB);
      }

      // Walking limb swing animation
      const swing = Math.sin(timeSec * 8) * 0.55;
      this.leftLegA.rotation.x = swing;
      this.rightLegA.rotation.x = -swing;
      this.leftArmA.rotation.x = -swing * 0.6;
      this.rightArmA.rotation.x = swing * 0.6;

      this.leftLegB.rotation.x = -swing;
      this.rightLegB.rotation.x = swing;
      this.leftArmB.rotation.x = swing * 0.6;
      this.rightArmB.rotation.x = -swing * 0.6;

      // Both reached meeting point -> Begin arguing
      if (distA <= 0.12 && distB <= 0.12) {
        this.leftLegA.rotation.x = 0;
        this.rightLegA.rotation.x = 0;
        this.leftLegB.rotation.x = 0;
        this.rightLegB.rotation.x = 0;
        this.startArguing();
      }
      return;
    }

    // 3. ARGUING: Intensive gesturing in place
    if (this.status === 'arguing') {
      this.timer -= delta;

      // Character A points finger aggressively forward, shaking with anger, head bobbing
      this.leftArmA.rotation.x = -Math.PI / 2 + Math.sin(timeSec * 14) * 0.25;
      this.leftArmA.rotation.z = Math.sin(timeSec * 10) * 0.15;
      this.rightArmA.rotation.x = -0.3 + Math.cos(timeSec * 12) * 0.2;
      this.headA.rotation.x = 0.2 + Math.sin(timeSec * 12) * 0.12;
      this.headA.rotation.z = Math.sin(timeSec * 10) * 0.08;
      this.charA.position.y = Math.abs(Math.sin(timeSec * 10)) * 0.05;

      // Character B puffs chest, gestures defensively with fists, shakes head
      this.leftArmB.rotation.z = 0.7 + Math.sin(timeSec * 12) * 0.2;
      this.leftArmB.rotation.x = -0.4;
      this.rightArmB.rotation.z = -0.7 - Math.sin(timeSec * 12) * 0.2;
      this.rightArmB.rotation.x = -0.4;
      this.headB.rotation.y = Math.sin(timeSec * 10) * 0.35;
      this.headB.rotation.x = -0.15;
      this.charB.position.y = Math.abs(Math.cos(timeSec * 10)) * 0.04;

      if (this.timer <= 0) {
        this.startWalkingOut();
      }
      return;
    }

    // 4. WALKING OUT: Moving away towards exit points
    if (this.status === 'walking_out') {
      this.timer -= delta;
      this.charA.position.y = 0;
      this.charB.position.y = 0;

      const distA = this.charA.position.distanceTo(this.currentSpot.exitA);
      const distB = this.charB.position.distanceTo(this.currentSpot.exitB);

      if (distA > 0.15) {
        const dirA = new THREE.Vector3().subVectors(this.currentSpot.exitA, this.charA.position).normalize();
        this.charA.position.addScaledVector(dirA, Math.min(distA, walkSpeed * delta));
        this.charA.lookAt(this.currentSpot.exitA);
      }
      if (distB > 0.15) {
        const dirB = new THREE.Vector3().subVectors(this.currentSpot.exitB, this.charB.position).normalize();
        this.charB.position.addScaledVector(dirB, Math.min(distB, walkSpeed * delta));
        this.charB.lookAt(this.currentSpot.exitB);
      }

      // Walking limb swing animation
      const swing = Math.sin(timeSec * 7) * 0.5;
      this.leftLegA.rotation.x = swing;
      this.rightLegA.rotation.x = -swing;
      this.leftArmA.rotation.x = -swing * 0.5;
      this.rightArmA.rotation.x = swing * 0.5;

      this.leftLegB.rotation.x = -swing;
      this.rightLegB.rotation.x = swing;
      this.leftArmB.rotation.x = swing * 0.5;
      this.rightArmB.rotation.x = -swing * 0.5;

      this.headA.rotation.set(0, 0, 0);
      this.headB.rotation.set(0, 0, 0);

      // Finished walking out or time expired -> Hide and reset
      if (this.timer <= 0 || (distA <= 0.2 && distB <= 0.2)) {
        this.status = 'hidden';
        this.root.visible = false;
        this.bubbleA.visible = false;
        this.bubbleB.visible = false;
        this.nextEventCountdown = 180 + Math.random() * 120; // 3 to 5 minutes between arguments
      }
    }
  }

  public dispose() {
    this.scene.remove(this.root);
  }
}
