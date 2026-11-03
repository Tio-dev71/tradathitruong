import * as THREE from 'three';
import type { AvatarConfig, PlayerRole } from '../types/game';

export interface AvatarRig {
  root: THREE.Group;
  head: THREE.Group;
  body: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  nametagSprite: THREE.Sprite;
  speechSprite: THREE.Sprite;
  speakingSprite: THREE.Sprite;
  updateAnimation: (time: number, isMoving: boolean, isRunning: boolean, isSitting: boolean, emote?: string) => void;
  updateNametag: (nickname: string, role: PlayerRole) => void;
  showSpeech: (text: string, durationMs?: number) => void;
  hideSpeech: () => void;
  setSpeaking: (isSpeaking: boolean) => void;
}

export function createNametagTexture(nickname: string, role: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 160);

  // Background badge pill
  ctx.fillStyle = 'rgba(28, 20, 12, 0.85)';
  ctx.beginPath();
  ctx.roundRect(40, 20, 432, 120, 30);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Role pill
  ctx.fillStyle = '#b35d43';
  ctx.beginPath();
  ctx.roundRect(110, 32, 292, 36, 18);
  ctx.fill();

  ctx.fillStyle = '#fff7e0';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(role, 256, 58);

  // Nickname
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(nickname, 256, 114);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createPlayerSpeechTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 256);

  const cleanText = text.trim();
  const isShort = cleanText.length <= 8;
  const fontSize = isShort ? 46 : cleanText.length <= 22 ? 32 : 24;
  const lineHeight = fontSize + 8;
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  // Multiline wrapping
  const words = cleanText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;
    if (width > 400 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= 3) break;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine && lines.length < 3) {
    lines.push(currentLine);
  }

  // Draw speech bubble (rounded rectangle + tail)
  const bubbleX = 28;
  const bubbleY = 16;
  const bubbleW = 456;
  const bubbleH = 164;
  const radius = 24;

  // 1. Shadow for visual separation
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  // Bubble background fill
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, radius);
  ctx.fill();

  // Pointer tail pointing down towards the avatar's nametag/head
  ctx.beginPath();
  ctx.moveTo(234, bubbleY + bubbleH - 1);
  ctx.lineTo(256, bubbleY + bubbleH + 34);
  ctx.lineTo(278, bubbleY + bubbleH - 1);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // 2. Thick comic border
  ctx.strokeStyle = '#2b1810';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, radius);
  ctx.stroke();

  // Pointer tail stroke
  ctx.beginPath();
  ctx.moveTo(233, bubbleY + bubbleH - 2);
  ctx.lineTo(256, bubbleY + bubbleH + 34);
  ctx.lineTo(279, bubbleY + bubbleH - 2);
  ctx.stroke();

  // Seamless joint patch between bubble and pointer tail
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(235, bubbleY + bubbleH - 5, 42, 8);

  // 3. Render Text
  ctx.fillStyle = '#1c120c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const totalTextHeight = lines.length * lineHeight;
  const centerY = bubbleY + bubbleH / 2;
  const startY = centerY - totalTextHeight / 2 + lineHeight / 2;

  lines.forEach((lineText, idx) => {
    ctx.fillText(lineText, 256, startY + idx * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function createSpeakingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.font = '54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎙️', 64, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function buildChibiAvatar(config: AvatarConfig, nickname: string, role: PlayerRole): AvatarRig {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: config.skinTone || '#fcd5b5',
    roughness: 0.6,
  });
  const outfitMat = new THREE.MeshStandardMaterial({
    color: config.outfitColor || '#2e86de',
    roughness: 0.7,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: config.pantsColor || '#2c3e50',
    roughness: 0.8,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: config.hairColor || '#1a1a1a',
    roughness: 0.6,
  });

  // --- Head Group ---
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.05;

  // Head sphere
  const headGeo = new THREE.SphereGeometry(0.36, 16, 16);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const highlightGeo = new THREE.SphereGeometry(0.015, 6, 6);

  [-0.12, 0.12].forEach((x) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(x, 0.04, 0.32);
    eye.scale.set(1, 1.3, 0.5);
    headGroup.add(eye);

    const highlight = new THREE.Mesh(highlightGeo, eyeHighlightMat);
    highlight.position.set(x + 0.015, 0.07, 0.34);
    headGroup.add(highlight);
  });

  // Smile mouth
  const mouthGeo = new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI);
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0xa83232 });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.position.set(0, -0.1, 0.33);
  mouth.rotation.x = Math.PI / 2;
  mouth.rotation.z = Math.PI;
  headGroup.add(mouth);

  // Cheeks (blush)
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8888, transparent: true, opacity: 0.55 });
  const blushGeo = new THREE.CircleGeometry(0.05, 10);
  [-0.19, 0.19].forEach((x) => {
    const blush = new THREE.Mesh(blushGeo, blushMat);
    blush.position.set(x, -0.04, 0.32);
    blush.rotation.y = x > 0 ? 0.35 : -0.35;
    headGroup.add(blush);
  });

  // Hair Style
  const hairGroup = new THREE.Group();
  if (config.hairStyle === 'short') {
    const capGeo = new THREE.SphereGeometry(0.38, 14, 14, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const cap = new THREE.Mesh(capGeo, hairMat);
    cap.position.y = 0.02;
    cap.castShadow = true;
    hairGroup.add(cap);
  } else if (config.hairStyle === 'spiky') {
    const baseGeo = new THREE.SphereGeometry(0.37, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    hairGroup.add(new THREE.Mesh(baseGeo, hairMat));
    for (let i = 0; i < 7; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 5), hairMat);
      const angle = (i / 7) * Math.PI - Math.PI / 2;
      spike.position.set(Math.sin(angle) * 0.28, 0.32, Math.cos(angle) * 0.2 - 0.05);
      spike.rotation.z = -angle * 0.5;
      hairGroup.add(spike);
    }
  } else if (config.hairStyle === 'bun') {
    const baseGeo = new THREE.SphereGeometry(0.38, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.6);
    hairGroup.add(new THREE.Mesh(baseGeo, hairMat));
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), hairMat);
    bun.position.set(0, 0.42, -0.05);
    hairGroup.add(bun);
  } else if (config.hairStyle === 'ponytail') {
    const baseGeo = new THREE.SphereGeometry(0.38, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.6);
    hairGroup.add(new THREE.Mesh(baseGeo, hairMat));
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.35, 8), hairMat);
    tail.position.set(0, 0.22, -0.4);
    tail.rotation.x = -0.6;
    hairGroup.add(tail);
  } else {
    // 'bob'
    const bobGeo = new THREE.SphereGeometry(0.39, 14, 14, 0, Math.PI * 2, 0, Math.PI / 1.4);
    const bob = new THREE.Mesh(bobGeo, hairMat);
    bob.position.y = 0.02;
    bob.castShadow = true;
    hairGroup.add(bob);
  }
  headGroup.add(hairGroup);

  // Glasses accessory if chosen
  if (config.accessory === 'glasses') {
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    [-0.12, 0.12].forEach((x) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 12), rimMat);
      rim.position.set(x, 0.04, 0.35);
      headGroup.add(rim);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.012), rimMat);
    bridge.position.set(0, 0.04, 0.35);
    headGroup.add(bridge);
  }

  root.add(headGroup);

  // --- Torso / Body ---
  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 12);
  const bodyMesh = new THREE.Mesh(bodyGeo, outfitMat);
  bodyMesh.position.y = 0.58;
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // --- Arms ---
  const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 8);
  armGeo.translate(0, -0.19, 0); // pivot at shoulder

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.32, 0.75, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, outfitMat);
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  root.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 0.75, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, outfitMat);
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  root.add(rightArm);

  // --- Legs ---
  const legGeo = new THREE.CylinderGeometry(0.08, 0.075, 0.42, 8);
  legGeo.translate(0, -0.21, 0); // pivot at hip

  const shoeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.18);
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.13, 0.42, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.38, 0.03);
  leftShoe.castShadow = true;
  leftLeg.add(leftShoe);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.13, 0.42, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.38, 0.03);
  rightShoe.castShadow = true;
  rightLeg.add(rightShoe);
  root.add(rightLeg);

  // --- Floating 3D Nametag & Role Sprite ---
  const nametagTex = createNametagTexture(nickname, role);
  const spriteMat = new THREE.SpriteMaterial({ map: nametagTex, depthTest: false });
  const nametagSprite = new THREE.Sprite(spriteMat);
  nametagSprite.position.set(0, 1.75, 0);
  nametagSprite.scale.set(1.5, 0.5, 1);
  root.add(nametagSprite);

  // --- Overhead Chat Speech Bubble Sprite ---
  const speechSpriteMat = new THREE.SpriteMaterial({ depthTest: false, transparent: true });
  const speechSprite = new THREE.Sprite(speechSpriteMat);
  speechSprite.position.set(0, 2.45, 0);
  speechSprite.scale.set(1.75, 0.88, 1);
  speechSprite.renderOrder = 1000;
  speechSprite.visible = false;
  root.add(speechSprite);

  // --- Speaking Indicator Sprite (Microphone Icon) ---
  const speakingTex = createSpeakingTexture();
  const speakingMat = new THREE.SpriteMaterial({ map: speakingTex, depthTest: false, transparent: true });
  const speakingSprite = new THREE.Sprite(speakingMat);
  speakingSprite.position.set(0.65, 1.88, 0);
  speakingSprite.scale.set(0.32, 0.32, 1);
  speakingSprite.renderOrder = 1001;
  speakingSprite.visible = false;
  root.add(speakingSprite);

  const setSpeaking = (isSpeaking: boolean) => {
    speakingSprite.visible = isSpeaking;
  };

  let speechTimeout: NodeJS.Timeout | null = null;

  const showSpeech = (text: string, durationMs = 5000) => {
    if (!text || !text.trim()) return;

    if (speechTimeout) {
      clearTimeout(speechTimeout);
      speechTimeout = null;
    }

    if (speechSprite.material.map) {
      speechSprite.material.map.dispose();
    }

    const tex = createPlayerSpeechTexture(text);
    speechSprite.material.map = tex;
    speechSprite.material.needsUpdate = true;
    speechSprite.visible = true;

    speechTimeout = setTimeout(() => {
      speechSprite.visible = false;
      speechTimeout = null;
    }, durationMs);
  };

  const hideSpeech = () => {
    if (speechTimeout) {
      clearTimeout(speechTimeout);
      speechTimeout = null;
    }
    speechSprite.visible = false;
  };

  // --- Animation Update Method ---
  const updateAnimation = (time: number, isMoving: boolean, isRunning: boolean, isSitting: boolean, emote?: string) => {
    if (isSitting) {
      // Clean sitting posture aligned on top of stool
      root.position.y = 0.02;
      // In Three.js, for limbs extending downwards (y < 0), a negative rotation around X swings them forward (+Z)
      leftLeg.rotation.x = -Math.PI / 2.4;
      rightLeg.rotation.x = -Math.PI / 2.4;
      // Hands resting comfortably forward on thighs/knees
      leftArm.rotation.x = -0.45;
      leftArm.rotation.z = 0.15;
      rightArm.rotation.x = -0.45;
      rightArm.rotation.z = -0.15;
      headGroup.position.y = 1.05 + Math.sin(time * 2) * 0.015;
      headGroup.rotation.y = Math.sin(time * 0.8) * 0.08;
      bodyMesh.rotation.x = -0.04;
      return;
    }

    // Jump pose if in air
    if (root.position.y > 0.06) {
      leftLeg.rotation.x = -0.42;
      rightLeg.rotation.x = -0.22;
      leftArm.rotation.x = -0.55;
      leftArm.rotation.z = 0.28;
      rightArm.rotation.x = -0.55;
      rightArm.rotation.z = -0.28;
      headGroup.position.y = 1.05;
      bodyMesh.rotation.x = -0.06;
      return;
    } else {
      root.position.y = 0;
    }

    // Emote Animations (Hand actions swing forward towards +Z where the face is)
    if (emote === 'wave') {
      // Right hand waves forward and up in front of the avatar
      rightArm.rotation.x = -Math.PI * 0.82;
      rightArm.rotation.z = -Math.sin(time * 12) * 0.35 - 0.2;
      leftArm.rotation.x = -0.1;
      leftArm.rotation.z = 0.1;
      headGroup.rotation.y = Math.sin(time * 4) * 0.2;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      return;
    }

    if (emote === 'laugh') {
      headGroup.rotation.x = 0.15 + Math.sin(time * 18) * 0.15;
      bodyMesh.scale.y = 1 + Math.sin(time * 18) * 0.08;
      // Hands hold stomach in front
      leftArm.rotation.x = -0.4;
      leftArm.rotation.z = 0.3 + Math.sin(time * 18) * 0.1;
      rightArm.rotation.x = -0.4;
      rightArm.rotation.z = -0.3 - Math.sin(time * 18) * 0.1;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      return;
    }

    if (emote === 'sip_tea') {
      // Right hand raises cup forward to mouth
      rightArm.rotation.x = -1.25 + Math.sin(time * 3) * 0.08;
      rightArm.rotation.z = -0.25;
      leftArm.rotation.x = -0.2;
      leftArm.rotation.z = 0.2;
      headGroup.rotation.x = -0.15 + Math.sin(time * 3) * 0.05;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      return;
    }

    if (emote === 'shrug') {
      headGroup.rotation.z = 0.25;
      leftArm.rotation.z = 0.75;
      rightArm.rotation.z = -0.75;
      leftArm.rotation.x = -0.3;
      rightArm.rotation.x = -0.3;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      return;
    }

    if (emote === 'cheer') {
      // Both arms raised high and forward in celebration
      leftArm.rotation.x = -Math.PI * 0.85;
      rightArm.rotation.x = -Math.PI * 0.85;
      leftArm.rotation.z = 0.35 + Math.sin(time * 10) * 0.15;
      rightArm.rotation.z = -0.35 - Math.sin(time * 10) * 0.15;
      headGroup.position.y = 1.05 + Math.abs(Math.sin(time * 8)) * 0.08;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      return;
    }

    if (isMoving) {
      const freq = isRunning ? 14 : 9;
      const amp = isRunning ? 0.8 : 0.55;

      // Leg swing: negative angle swings leg forward (+Z)
      leftLeg.rotation.x = -Math.sin(time * freq) * amp;
      rightLeg.rotation.x = Math.sin(time * freq) * amp;

      // Arm swing (natural cross-body: opposite to leg)
      // When left leg steps forward (negative rotation), left arm swings back (positive rotation)
      leftArm.rotation.x = Math.sin(time * freq) * amp;
      rightArm.rotation.x = -Math.sin(time * freq) * amp;

      // Vertical bounce & forward lean
      headGroup.position.y = 1.05 + Math.abs(Math.sin(time * freq)) * 0.04;
      bodyMesh.rotation.x = isRunning ? -0.1 : -0.04;
    } else {
      // Idle breathing & slight head bobbing
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.x = -0.05;
      leftArm.rotation.z = 0.08;
      rightArm.rotation.x = -0.05;
      rightArm.rotation.z = -0.08;
      headGroup.position.y = 1.05 + Math.sin(time * 2.5) * 0.02;
      bodyMesh.rotation.x = 0;
    }

    if (speakingSprite.visible) {
      speakingSprite.scale.setScalar(0.32 + Math.sin(time * 12) * 0.04);
    }
  };

  const updateNametag = (newNickname: string, newRole: PlayerRole) => {
    const newTex = createNametagTexture(newNickname, newRole);
    nametagSprite.material.map = newTex;
    nametagSprite.material.needsUpdate = true;
  };

  return {
    root,
    head: headGroup,
    body: bodyMesh,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    nametagSprite,
    speechSprite,
    speakingSprite,
    updateAnimation,
    updateNametag,
    showSpeech,
    hideSpeech,
    setSpeaking,
  };
}

