import * as THREE from 'three';

export interface TeaVendorRig {
  group: THREE.Group;
  head: THREE.Group;
  rightArm: THREE.Group; // holding fan
  fan: THREE.Mesh;
  speechSprite: THREE.Sprite;
  interactPrompt: THREE.Sprite;
  update: (time: number, playerPos: THREE.Vector3, isConversing: boolean) => void;
  showSpeech: (text: string) => void;
  hideSpeech: () => void;
  setInteractPromptVisible: (visible: boolean) => void;
}

export function createSpeechBubbleTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 256);

  // Bubble background
  ctx.fillStyle = 'rgba(255, 253, 245, 0.95)';
  ctx.beginPath();
  ctx.roundRect(20, 20, 472, 180, 24);
  ctx.fill();

  ctx.strokeStyle = '#5a3d28';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Speech bubble pointer arrow pointing down
  ctx.beginPath();
  ctx.moveTo(230, 200);
  ctx.lineTo(256, 240);
  ctx.lineTo(282, 200);
  ctx.fillStyle = 'rgba(255, 253, 245, 0.95)';
  ctx.fill();
  ctx.stroke();

  // Speaker title
  ctx.fillStyle = '#b35d43';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('👵 Cô Bán Trà Đá:', 45, 60);

  // Multiline speech text
  ctx.fillStyle = '#1e241c';
  ctx.font = 'bold 22px sans-serif';

  // Simple text wrapping
  const words = text.split(' ');
  let line = '';
  let y = 100;
  for (const w of words) {
    const testLine = line + w + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 420 && line !== '') {
      ctx.fillText(line, 45, y);
      line = w + ' ';
      y += 32;
      if (y > 180) break;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 45, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createInteractPromptTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 300, 100);

  // Pill
  ctx.fillStyle = 'rgba(28, 20, 12, 0.9)';
  ctx.beginPath();
  ctx.roundRect(15, 15, 270, 70, 35);
  ctx.fill();

  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Key badge [E]
  ctx.fillStyle = '#e67e22';
  ctx.beginPath();
  ctx.roundRect(30, 25, 50, 50, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('E', 55, 60);

  // Label
  ctx.fillStyle = '#f5f6fa';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Trò chuyện', 95, 58);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function buildTeaVendorNPC(): TeaVendorRig {
  const group = new THREE.Group();
  // Situated on the left side of the tea stall under the banyan tree
  group.position.set(-1.8, 0, -1.2);
  group.rotation.y = Math.PI / 4; // Facing slightly forward-right towards incoming players

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfa178, roughness: 0.6 });
  const brownBabaMat = new THREE.MeshStandardMaterial({ color: 0x6e472e, roughness: 0.8 }); // Áo bà ba nâu sẫm
  const blackPantsMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5 }); // Tóc hoa râm
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0x3d5a45, roughness: 0.7 }); // Khăn vấn tóc rêu

  // --- Wooden Stool underneath bà ---
  const stoolGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.45, 12);
  const stoolMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.85 });
  const stool = new THREE.Mesh(stoolGeo, stoolMat);
  stool.position.y = 0.225;
  stool.castShadow = true;
  group.add(stool);

  // --- Lower Body & Legs (Sitting) ---
  const legsGeo = new THREE.BoxGeometry(0.48, 0.3, 0.5);
  const legs = new THREE.Mesh(legsGeo, blackPantsMat);
  legs.position.set(0, 0.45, 0.1);
  legs.castShadow = true;
  group.add(legs);

  // --- Torso (Áo bà ba) ---
  const torsoGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.5, 10);
  const torso = new THREE.Mesh(torsoGeo, brownBabaMat);
  torso.position.set(0, 0.78, 0);
  torso.castShadow = true;
  group.add(torso);

  // Pearl necklace / rustic button details
  const buttonsGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6);
  const buttonsMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
  const buttons = new THREE.Mesh(buttonsGeo, buttonsMat);
  buttons.position.set(0, 0.8, 0.25);
  group.add(buttons);

  // --- Head & Scarf ---
  const head = new THREE.Group();
  head.position.set(0, 1.25, 0);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Hair bun (Búi tóc sau gáy)
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), hairMat);
  bun.position.set(0, 0.05, -0.32);
  head.add(bun);

  // Vietnamese Headband / Khăn vấn
  const scarfGeo = new THREE.TorusGeometry(0.35, 0.06, 8, 20);
  const scarf = new THREE.Mesh(scarfGeo, scarfMat);
  scarf.position.set(0, 0.12, 0);
  scarf.rotation.x = Math.PI / 2;
  head.add(scarf);

  // Cheerful eyes & kind wrinkles
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-0.11, 0.11].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eye.position.set(x, 0.03, 0.31);
    eye.scale.set(1, 0.8, 0.5);
    head.add(eye);
  });

  // Warm smile
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xa83232 })
  );
  smile.position.set(0, -0.1, 0.32);
  smile.rotation.x = Math.PI / 2;
  smile.rotation.z = Math.PI;
  head.add(smile);

  group.add(head);

  // --- Left Arm (resting gently on lap) ---
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.32, 0.95, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.42, 8), brownBabaMat);
  leftArmMesh.position.set(0.05, -0.18, 0.12);
  leftArmMesh.rotation.x = 0.7;
  leftArmMesh.rotation.z = -0.3;
  leftArm.add(leftArmMesh);
  group.add(leftArm);

  // --- Right Arm (Holding bamboo fan quạt nan) ---
  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 0.95, 0);

  const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.4, 8), brownBabaMat);
  rightArmMesh.position.set(0, -0.18, 0.1);
  rightArmMesh.rotation.x = 0.5;
  rightArmMesh.rotation.z = 0.3;
  rightArm.add(rightArmMesh);

  // Traditional Vietnamese Hand Fan (Quạt nan)
  const fanGeo = new THREE.CircleGeometry(0.24, 12, 0, Math.PI);
  const fanMat = new THREE.MeshStandardMaterial({
    color: 0xdeb887,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.position.set(0.15, -0.36, 0.35);
  fan.rotation.y = Math.PI / 2;
  fan.rotation.z = -0.2;
  rightArm.add(fan);

  group.add(rightArm);

  // --- Overhead Nametag for NPC ---
  const npcNametagCanvas = document.createElement('canvas');
  npcNametagCanvas.width = 512;
  npcNametagCanvas.height = 140;
  const nCtx = npcNametagCanvas.getContext('2d')!;
  nCtx.fillStyle = 'rgba(40, 25, 15, 0.9)';
  nCtx.beginPath();
  nCtx.roundRect(30, 20, 452, 100, 25);
  nCtx.fill();
  nCtx.strokeStyle = '#e67e22';
  nCtx.lineWidth = 4;
  nCtx.stroke();

  nCtx.fillStyle = '#f1c40f';
  nCtx.font = 'bold 32px sans-serif';
  nCtx.textAlign = 'center';
  nCtx.fillText('👵 TRÀ ĐÁ THỊ TRƯỜNG', 256, 75);

  const npcNametagTex = new THREE.CanvasTexture(npcNametagCanvas);
  const npcNametagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: npcNametagTex, depthTest: false }));
  npcNametagSprite.position.set(0, 1.85, 0);
  npcNametagSprite.scale.set(1.6, 0.5, 1);
  group.add(npcNametagSprite);

  // --- Interaction Prompt Sprite [E] Trò chuyện ---
  const promptTex = createInteractPromptTexture();
  const interactPrompt = new THREE.Sprite(new THREE.SpriteMaterial({ map: promptTex, depthTest: false }));
  interactPrompt.position.set(0, 2.25, 0);
  interactPrompt.scale.set(1.4, 0.5, 1);
  interactPrompt.visible = false;
  group.add(interactPrompt);

  // --- 3D Speech Bubble Sprite ---
  const initialSpeechTex = createSpeechBubbleTexture('Ơ kìa, lại một chiến thần ghé quán cô à? Uống trà hay xin kèo?');
  const speechSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: initialSpeechTex, depthTest: false }));
  speechSprite.position.set(0, 3.1, 0);
  speechSprite.scale.set(2.8, 1.4, 1);
  speechSprite.visible = false;
  group.add(speechSprite);

  // --- Animation and Proximity Logic ---
  const update = (time: number, playerPos: THREE.Vector3, _isConversing: boolean) => {
    // 1. Natural rhythmic fanning motion with the bamboo fan
    rightArm.rotation.z = Math.sin(time * 3.5) * 0.25;
    rightArm.rotation.x = Math.sin(time * 3.5) * 0.15;

    // 2. Head turning towards player when nearby
    const npcWorldPos = new THREE.Vector3();
    group.getWorldPosition(npcWorldPos);
    const distToPlayer = npcWorldPos.distanceTo(playerPos);

    if (distToPlayer < 7.0) {
      // Look towards player
      const angleToPlayer = Math.atan2(playerPos.x - npcWorldPos.x, playerPos.z - npcWorldPos.z);
      head.rotation.y = angleToPlayer - group.rotation.y;
      // Clamp head turn angle to natural range (-60deg to +60deg)
      head.rotation.y = Math.max(-1.1, Math.min(1.1, head.rotation.y));
    } else {
      // Relaxed idle looking
      head.rotation.y = Math.sin(time * 0.6) * 0.15;
    }

    // 3. Floating bounce on interaction prompt
    if (interactPrompt.visible) {
      interactPrompt.position.y = 2.25 + Math.sin(time * 5) * 0.06;
    }
  };

  const showSpeech = (text: string) => {
    const tex = createSpeechBubbleTexture(text);
    speechSprite.material.map = tex;
    speechSprite.material.needsUpdate = true;
    speechSprite.visible = true;
  };

  const hideSpeech = () => {
    speechSprite.visible = false;
  };

  const setInteractPromptVisible = (visible: boolean) => {
    interactPrompt.visible = visible;
  };

  return {
    group,
    head,
    rightArm,
    fan,
    speechSprite,
    interactPrompt,
    update,
    showSpeech,
    hideSpeech,
    setInteractPromptVisible,
  };
}

