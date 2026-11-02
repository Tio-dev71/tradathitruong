import * as THREE from 'three';
import { soundEngine } from '../services/soundEngine';

export interface DramaSpot {
  posA: THREE.Vector3;
  posB: THREE.Vector3;
  lookAtA: THREE.Vector3;
  lookAtB: THREE.Vector3;
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
  private bubbleA!: THREE.Sprite;

  // Character B: Chiến Thần Bắt Đáy (Áo vàng)
  private charB = new THREE.Group();
  private headB = new THREE.Group();
  private bodyB!: THREE.Mesh;
  private leftArmB = new THREE.Group();
  private rightArmB = new THREE.Group();
  private bubbleB!: THREE.Sprite;

  // State
  private status: 'hidden' | 'arguing' | 'cooling_down' = 'hidden';
  private timer = 0;
  private nextEventCountdown = 25 + Math.random() * 20; // First event triggers after ~25-45s
  private onChatCallback?: (text: string) => void;

  // Potential drama spots along the street and sidewalks
  private spots: DramaSpot[] = [
    // Spot 0: Vỉa hè đối diện quán trà (ngã tư vạch kẻ đường)
    {
      posA: new THREE.Vector3(-1.8, 0, 5.0),
      posB: new THREE.Vector3(-0.6, 0, 5.0),
      lookAtA: new THREE.Vector3(-0.6, 0, 5.0),
      lookAtB: new THREE.Vector3(-1.8, 0, 5.0),
    },
    // Spot 1: Vỉa hè góc phố cạnh Tiệm Vàng DJN
    {
      posA: new THREE.Vector3(6.5, 0, -3.2),
      posB: new THREE.Vector3(7.5, 0, -3.2),
      lookAtA: new THREE.Vector3(7.5, 0, -3.2),
      lookAtB: new THREE.Vector3(6.5, 0, -3.2),
    },
    // Spot 2: Gần cổng chào làng bên lề đường
    {
      posA: new THREE.Vector3(-7.2, 0, 3.8),
      posB: new THREE.Vector3(-6.0, 0, 3.8),
      lookAtA: new THREE.Vector3(-6.0, 0, 3.8),
      lookAtB: new THREE.Vector3(-7.2, 0, 3.8),
    },
    // Spot 3: Góc cột điện đèn đường qua phố
    {
      posA: new THREE.Vector3(2.2, 0, 4.2),
      posB: new THREE.Vector3(3.2, 0, 4.2),
      lookAtA: new THREE.Vector3(3.2, 0, 4.2),
      lookAtB: new THREE.Vector3(2.2, 0, 4.2),
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

    // Left Arm (Points finger forward)
    this.leftArmA.position.set(0.3, 0.78, 0);
    const armGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 6);
    armGeom.translate(0, -0.19, 0);
    const armL = new THREE.Mesh(armGeom, shirtMat);
    armL.castShadow = true;
    this.leftArmA.add(armL);
    this.charA.add(this.leftArmA);

    // Right Arm
    this.rightArmA.position.set(-0.3, 0.78, 0);
    const armR = new THREE.Mesh(armGeom, shirtMat);
    armR.castShadow = true;
    this.rightArmA.add(armR);
    this.charA.add(this.rightArmA);

    // Legs
    const legGeom = new THREE.CylinderGeometry(0.08, 0.075, 0.42, 6);
    legGeom.translate(0, -0.21, 0);
    const legL = new THREE.Mesh(legGeom, pantsMat);
    legL.position.set(0.12, 0.42, 0);
    legL.castShadow = true;
    this.charA.add(legL);

    const legR = new THREE.Mesh(legGeom, pantsMat);
    legR.position.set(-0.12, 0.42, 0);
    legR.castShadow = true;
    this.charA.add(legR);

    // Speech Bubble Sprite
    this.bubbleA = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createBubbleTexture('Mày bảo ai đu đỉnh?!', '#d90429'),
        transparent: true,
      })
    );
    this.bubbleA.scale.set(3.2, 1.4, 1);
    this.bubbleA.position.set(0, 1.85, 0);
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
    const legL = new THREE.Mesh(legGeom, pantsMat);
    legL.position.set(0.12, 0.42, 0);
    legL.castShadow = true;
    this.charB.add(legL);

    const legR = new THREE.Mesh(legGeom, pantsMat);
    legR.position.set(-0.12, 0.42, 0);
    legR.castShadow = true;
    this.charB.add(legR);

    // Speech Bubble Sprite
    this.bubbleB = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createBubbleTexture('Thích bắt đáy không?! Vào đây!', '#e76f51'),
        transparent: true,
      })
    );
    this.bubbleB.scale.set(3.2, 1.4, 1);
    this.bubbleB.position.set(0, 1.85, 0);
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

  // Trigger a dramatic Vietnamese street argument
  public async triggerDrama(): Promise<void> {
    if (this.status !== 'hidden') return;

    // 1. Pick a random drama spot
    const spot = this.spots[Math.floor(Math.random() * this.spots.length)];
    this.charA.position.copy(spot.posA);
    this.charB.position.copy(spot.posB);
    this.charA.lookAt(spot.lookAtA);
    this.charB.lookAt(spot.lookAtB);

    this.root.visible = true;
    this.status = 'arguing';

    // 2. Play audio chuinhau1.mp3 or chuinhau2.mp3
    const arg = await soundEngine.playStreetArgument();
    this.timer = arg.duration + 2.0;

    // 3. Update speech bubbles
    this.updateBubble(this.bubbleA, arg.textA, '#d90429');
    this.updateBubble(this.bubbleB, arg.textB, '#e76f51');

    // 4. Notify in chat
    if (this.onChatCallback) {
      this.onChatCallback(`🗣️ Cãi vã đường phố: "${arg.summary}"`);
    }
  }

  public update(delta: number, timeSec: number) {
    // Automatic recurring trigger loop
    if (this.status === 'hidden') {
      this.nextEventCountdown -= delta;
      if (this.nextEventCountdown <= 0) {
        this.nextEventCountdown = 45 + Math.random() * 35; // Next event in 45-80s
        this.triggerDrama();
      }
      return;
    }

    this.timer -= delta;

    if (this.status === 'arguing') {
      // High-energy aggressive arguing gestures:
      // Character A points finger and leans in
      this.leftArmA.rotation.x = -Math.PI / 2 + Math.sin(timeSec * 14) * 0.25;
      this.leftArmA.rotation.z = Math.sin(timeSec * 10) * 0.15;
      this.rightArmA.rotation.x = -0.3 + Math.cos(timeSec * 12) * 0.2;
      this.headA.rotation.x = 0.2 + Math.sin(timeSec * 12) * 0.12;
      this.headA.rotation.z = Math.sin(timeSec * 10) * 0.08;
      this.charA.position.y = Math.abs(Math.sin(timeSec * 10)) * 0.05;

      // Character B puffs chest, gestures defensively with fists, shakes head left/right
      this.leftArmB.rotation.z = 0.7 + Math.sin(timeSec * 12) * 0.2;
      this.leftArmB.rotation.x = -0.4;
      this.rightArmB.rotation.z = -0.7 - Math.sin(timeSec * 12) * 0.2;
      this.rightArmB.rotation.x = -0.4;
      this.headB.rotation.y = Math.sin(timeSec * 10) * 0.35;
      this.headB.rotation.x = -0.15;
      this.charB.position.y = Math.abs(Math.cos(timeSec * 10)) * 0.04;

      // Transition to cooling down near the end
      if (this.timer <= 1.8) {
        this.status = 'cooling_down';
        this.updateBubble(this.bubbleA, 'Hừ! Bố mày nhớ mặt đấy!', '#6c757d');
        this.updateBubble(this.bubbleB, 'Biến đi cho rảnh nợ!', '#6c757d');
      }
    } else if (this.status === 'cooling_down') {
      // Settle arms, look away
      this.leftArmA.rotation.x = -0.1;
      this.rightArmA.rotation.x = -0.1;
      this.leftArmB.rotation.z = 0.1;
      this.rightArmB.rotation.z = -0.1;
      this.headA.rotation.set(0, 0, 0);
      this.headB.rotation.set(0, 0, 0);
      this.charA.position.y = 0;
      this.charB.position.y = 0;

      if (this.timer <= 0) {
        this.status = 'hidden';
        this.root.visible = false;
      }
    }
  }

  public dispose() {
    this.scene.remove(this.root);
  }
}
