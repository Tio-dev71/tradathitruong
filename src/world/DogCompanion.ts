import * as THREE from 'three';
import { soundEngine } from '../services/soundEngine';

export class DogCompanion {
  public group = new THREE.Group();
  private scene: THREE.Scene;

  // Body parts
  private head = new THREE.Group();
  private tail = new THREE.Mesh();
  private earL = new THREE.Mesh();
  private earR = new THREE.Mesh();
  private speechBubble!: THREE.Sprite;
  private interactPrompt!: THREE.Sprite;

  private isBarking = false;
  private barkTimer = 0;
  private bubbleTimer = 0;
  private isNearPlayer = false;

  constructor(scene: THREE.Scene, position = new THREE.Vector3(-4.2, 0, 0.8)) {
    this.scene = scene;
    this.group.position.copy(position);
    this.group.rotation.y = 0.4; // Facing towards the tea stall tables

    this.buildDogMesh();
    this.buildSprites();
    this.scene.add(this.group);
  }

  private buildDogMesh() {
    const furMat = new THREE.MeshStandardMaterial({ color: 0xd4883b, roughness: 0.7 }); // Golden brown Vietnamese puppy fur
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf6dfb3, roughness: 0.7 }); // Cream belly
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f1915, roughness: 0.5 }); // Dark nose & eyes
    const matCloth = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }); // Bamboo mat

    // Bamboo resting mat under the dog
    const mat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 1.2), matCloth);
    mat.position.y = 0.01;
    mat.receiveShadow = true;
    this.group.add(mat);

    // Dog Torso (Sitting posture)
    const bodyGeo = new THREE.BoxGeometry(0.36, 0.38, 0.65);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.set(0, 0.32, 0);
    body.rotation.x = -0.15;
    body.castShadow = true;
    this.group.add(body);

    // Cream Belly
    const bellyGeo = new THREE.BoxGeometry(0.26, 0.2, 0.45);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.28, 0.05);
    this.group.add(belly);

    // Head Group
    this.head.position.set(0, 0.55, 0.3);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), furMat);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.18), bellyMat);
    snout.position.set(0, -0.04, 0.18);
    snout.castShadow = true;
    this.head.add(snout);

    // Black Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), darkMat);
    nose.position.set(0, 0.01, 0.28);
    this.head.add(nose);

    // Big Cute Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), darkMat);
    eyeL.position.set(0.09, 0.06, 0.17);
    this.head.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), darkMat);
    eyeR.position.set(-0.09, 0.06, 0.17);
    this.head.add(eyeR);

    // Eye highlights
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const shineL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), whiteMat);
    shineL.position.set(0.1, 0.08, 0.2);
    this.head.add(shineL);
    const shineR = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), whiteMat);
    shineR.position.set(-0.08, 0.08, 0.2);
    this.head.add(shineR);

    // Floppy Cute Ears
    const earGeo = new THREE.BoxGeometry(0.08, 0.18, 0.04);
    this.earL = new THREE.Mesh(earGeo, furMat);
    this.earL.position.set(0.2, 0.1, 0);
    this.earL.rotation.z = -0.35;
    this.head.add(this.earL);

    this.earR = new THREE.Mesh(earGeo, furMat);
    this.earR.position.set(-0.2, 0.1, 0);
    this.earR.rotation.z = 0.35;
    this.head.add(this.earR);

    this.group.add(this.head);

    // Front Paws
    const pawGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.28, 6);
    const pawFL = new THREE.Mesh(pawGeo, furMat);
    pawFL.position.set(0.12, 0.14, 0.24);
    pawFL.castShadow = true;
    this.group.add(pawFL);

    const pawFR = new THREE.Mesh(pawGeo, furMat);
    pawFR.position.set(-0.12, 0.14, 0.24);
    pawFR.castShadow = true;
    this.group.add(pawFR);

    // Back Paws (Sitting flat)
    const pawBackGeo = new THREE.BoxGeometry(0.14, 0.1, 0.25);
    const pawBL = new THREE.Mesh(pawBackGeo, furMat);
    pawBL.position.set(0.2, 0.06, -0.15);
    pawBL.castShadow = true;
    this.group.add(pawBL);

    const pawBR = new THREE.Mesh(pawBackGeo, furMat);
    pawBR.position.set(-0.2, 0.06, -0.15);
    pawBR.castShadow = true;
    this.group.add(pawBR);

    // Wagging Curled Tail
    const tailGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.35, 6);
    tailGeo.translate(0, 0.16, 0);
    this.tail = new THREE.Mesh(tailGeo, furMat);
    this.tail.position.set(0, 0.35, -0.32);
    this.tail.rotation.x = -0.8;
    this.tail.castShadow = true;
    this.group.add(this.tail);
  }

  private buildSprites() {
    // 1. Speech bubble
    const bubbleCanvas = document.createElement('canvas');
    bubbleCanvas.width = 384;
    bubbleCanvas.height = 140;
    const bCtx = bubbleCanvas.getContext('2d')!;
    bCtx.fillStyle = 'rgba(255, 253, 245, 0.95)';
    bCtx.beginPath();
    bCtx.roundRect(10, 10, 364, 90, 20);
    bCtx.fill();
    bCtx.strokeStyle = '#5a3d28';
    bCtx.lineWidth = 4;
    bCtx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(175, 100);
    bCtx.lineTo(192, 130);
    bCtx.lineTo(210, 100);
    bCtx.fill();
    bCtx.stroke();

    bCtx.fillStyle = '#b35d43';
    bCtx.font = 'bold 24px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('🐕 Gâu! Gâu gâu!', 192, 60);

    const bubbleTex = new THREE.CanvasTexture(bubbleCanvas);
    this.speechBubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true }));
    this.speechBubble.scale.set(2.4, 0.9, 1);
    this.speechBubble.position.set(0, 1.4, 0.2);
    this.speechBubble.visible = false;
    this.group.add(this.speechBubble);

    // 2. Interact prompt
    const promptCanvas = document.createElement('canvas');
    promptCanvas.width = 320;
    promptCanvas.height = 90;
    const pCtx = promptCanvas.getContext('2d')!;
    pCtx.fillStyle = 'rgba(28, 20, 12, 0.9)';
    pCtx.beginPath();
    pCtx.roundRect(10, 10, 300, 70, 20);
    pCtx.fill();
    pCtx.strokeStyle = '#f59e0b';
    pCtx.lineWidth = 3;
    pCtx.stroke();

    pCtx.fillStyle = '#fef3c7';
    pCtx.font = 'bold 22px sans-serif';
    pCtx.textAlign = 'center';
    pCtx.fillText('[E] Xoa đầu Cậu Vàng', 160, 52);

    const promptTex = new THREE.CanvasTexture(promptCanvas);
    this.interactPrompt = new THREE.Sprite(new THREE.SpriteMaterial({ map: promptTex, transparent: true }));
    this.interactPrompt.scale.set(2.2, 0.65, 1);
    this.interactPrompt.position.set(0, 1.1, 0.2);
    this.interactPrompt.visible = false;
    this.group.add(this.interactPrompt);
  }

  // Trigger dog barking
  public bark() {
    if (this.isBarking) return;
    this.isBarking = true;
    this.barkTimer = 3.5;
    this.bubbleTimer = 3.5;
    this.speechBubble.visible = true;
    soundEngine.playDogBark();
  }

  // Player interacts with the dog
  public interact(onChat?: (msg: string) => void) {
    this.bark();
    const CHEER_PHRASES = [
      '🐕 Cậu Vàng vẫy đuôi hớn hở: "Gâu gâu! (Chào đại gia, chúc phiên nay nến xanh dựng đứng!)"',
      '🐕 Cậu Vàng dụi đầu xin ăn: "Gâu gâu! (Uống chén trà đá rồi gồng lãi x2 x3 nhé!)"',
      '🐕 Cậu Vàng sủa mừng: "Gâu! (Đừng all-in, giữ vững kỷ luật là thắng!)"',
    ];
    const phrase = CHEER_PHRASES[Math.floor(Math.random() * CHEER_PHRASES.length)];
    onChat?.(phrase);
  }

  public update(timeSec: number, playerPos: THREE.Vector3) {
    const distToPlayer = playerPos.distanceTo(this.group.position);
    this.isNearPlayer = distToPlayer < 2.4;
    this.interactPrompt.visible = this.isNearPlayer && !this.speechBubble.visible;

    // Head turns slightly towards player when nearby
    if (this.isNearPlayer) {
      const localPlayerPos = playerPos.clone().sub(this.group.position);
      const angle = Math.atan2(localPlayerPos.x, localPlayerPos.z);
      this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, angle - this.group.rotation.y, 0.08);
    } else {
      this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, Math.sin(timeSec * 0.8) * 0.1, 0.05);
    }

    if (this.isBarking) {
      this.barkTimer -= 0.016;
      // Fast tail wagging when barking
      this.tail.rotation.z = Math.sin(timeSec * 28) * 0.6;
      this.head.rotation.x = -0.2 + Math.abs(Math.sin(timeSec * 16)) * 0.25;

      if (this.barkTimer <= 0) {
        this.isBarking = false;
      }
    } else {
      // Gentle lazy tail wagging while resting
      this.tail.rotation.z = Math.sin(timeSec * 3.5) * 0.25;
      this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, 0, 0.1);
    }

    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= 0.016;
      if (this.bubbleTimer <= 0) {
        this.speechBubble.visible = false;
      }
    }
  }

  public get position(): THREE.Vector3 {
    return this.group.position;
  }
}

