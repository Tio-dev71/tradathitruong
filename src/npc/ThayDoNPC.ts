import * as THREE from 'three';
import { createSpeechBubbleTexture } from './TeaVendorNPC';

export interface ThayDoRig {
  group: THREE.Group;
  head: THREE.Group;
  bowlGroup: THREE.Group; // plate & bowl being shaken
  speechSprite: THREE.Sprite;
  interactPrompt: THREE.Sprite;
  update: (time: number, playerPos: THREE.Vector3, isConversing: boolean) => void;
  showSpeech: (text: string) => void;
  hideSpeech: () => void;
  setInteractPromptVisible: (visible: boolean) => void;
}

export function createThayDoPromptTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 340, 100);

  // Pill
  ctx.fillStyle = 'rgba(20, 15, 28, 0.9)';
  ctx.beginPath();
  ctx.roundRect(15, 15, 310, 70, 35);
  ctx.fill();

  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Key badge [E]
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.roundRect(30, 25, 50, 50, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('E', 55, 60);

  // Label
  ctx.fillStyle = '#f5f6fa';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🎲 Xóc Đĩa Xin Quẻ', 95, 58);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function buildThayDoNPC(): ThayDoRig {
  const group = new THREE.Group();
  // Situated on the right side of the tree under a bamboo mat
  group.position.set(4.2, 0, 1.8);
  group.rotation.y = -Math.PI / 3; // Facing inwards towards the courtyard

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfa178, roughness: 0.6 });
  const aoTheMat = new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.7 }); // Áo the đen truyền thống
  const khanXepMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 }); // Khăn xếp
  const matMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.95 }); // Chiếu cói
  const redTrayMat = new THREE.MeshStandardMaterial({ color: 0x962d2d, roughness: 0.4 }); // Mâm gỗ đỏ
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.2 }); // Bát sứ trắng

  // 1. Woven Bamboo / Straw Mat (Chiếu cói trải đất)
  const strawMatGeo = new THREE.BoxGeometry(2.0, 0.02, 1.8);
  const strawMatMesh = new THREE.Mesh(strawMatGeo, matMat);
  strawMatMesh.position.y = 0.01;
  strawMatMesh.receiveShadow = true;
  group.add(strawMatMesh);

  // 2. Cross-legged Lower Body (Ngồi xếp bằng trên chiếu)
  const legsGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.22, 10);
  const legs = new THREE.Mesh(legsGeo, aoTheMat);
  legs.position.set(0, 0.12, 0);
  legs.castShadow = true;
  group.add(legs);

  // 3. Torso (Thân áo the)
  const torsoGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.48, 10);
  const torso = new THREE.Mesh(torsoGeo, aoTheMat);
  torso.position.set(0, 0.45, 0);
  torso.castShadow = true;
  group.add(torso);

  // Gold sash / tràng hạt
  const beadGeo = new THREE.TorusGeometry(0.18, 0.02, 6, 16);
  const beadMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6 });
  const beads = new THREE.Mesh(beadGeo, beadMat);
  beads.position.set(0, 0.5, 0.2);
  beads.rotation.x = Math.PI / 4;
  group.add(beads);

  // 4. Head & Khăn Xếp (Turban)
  const head = new THREE.Group();
  head.position.set(0, 0.92, 0);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Khăn xếp đội đầu đặc trưng thầy đồ
  const khanGeo = new THREE.CylinderGeometry(0.33, 0.35, 0.22, 12);
  const khan = new THREE.Mesh(khanGeo, khanXepMat);
  khan.position.set(0, 0.2, 0);
  head.add(khan);

  // Round black sunglasses (Kính râm tròn thầy bói cực ngầu)
  const sunglassMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  [-0.1, 0.1].forEach((x) => {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 10), sunglassMat);
    lens.position.set(x, 0.03, 0.32);
    lens.rotation.x = Math.PI / 2;
    head.add(lens);
  });
  const frameBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.015), sunglassMat);
  frameBar.position.set(0, 0.03, 0.315);
  head.add(frameBar);

  // Chòm râu dê / râu mép hài hước
  const beardGeo = new THREE.ConeGeometry(0.05, 0.15, 5);
  const beardMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const beard = new THREE.Mesh(beardGeo, beardMat);
  beard.position.set(0, -0.16, 0.28);
  beard.rotation.x = -0.2;
  head.add(beard);

  group.add(head);

  // 5. Lacquered Tray & Xóc Đĩa Setup in front of Thầy
  const trayGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 14);
  const tray = new THREE.Mesh(trayGeo, redTrayMat);
  tray.position.set(0, 0.08, 0.55);
  tray.castShadow = true;
  group.add(tray);

  // Shaking Bowl Group (Bát úp vào đĩa để lắc xóc đĩa)
  const bowlGroup = new THREE.Group();
  bowlGroup.position.set(0, 0.12, 0.55);

  const plateGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.03, 12);
  const plate = new THREE.Mesh(plateGeo, bowlMat);
  plate.castShadow = true;
  bowlGroup.add(plate);

  const bowlGeo = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.set(0, 0.02, 0);
  bowl.rotation.x = Math.PI; // Inverted bowl covering the tokens!
  bowl.castShadow = true;
  bowlGroup.add(bowl);

  group.add(bowlGroup);

  // 6. Arms holding the bowl from both sides
  const armMat = aoTheMat;
  const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.42, 6);

  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.28, 0.35, 0.3);
  leftArm.rotation.set(0.6, 0, -0.5);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.28, 0.35, 0.3);
  rightArm.rotation.set(0.6, 0, 0.5);
  group.add(rightArm);

  // Overhead Nametag
  const nametagCanvas = document.createElement('canvas');
  nametagCanvas.width = 512;
  nametagCanvas.height = 140;
  const nCtx = nametagCanvas.getContext('2d')!;
  nCtx.fillStyle = 'rgba(25, 18, 38, 0.9)';
  nCtx.beginPath();
  nCtx.roundRect(30, 20, 452, 100, 25);
  nCtx.fill();
  nCtx.strokeStyle = '#e74c3c';
  nCtx.lineWidth = 4;
  nCtx.stroke();

  nCtx.fillStyle = '#e74c3c';
  nCtx.font = 'bold 30px sans-serif';
  nCtx.textAlign = 'center';
  nCtx.fillText('🎲 THẦY ĐỒ XÓC ĐĨA', 256, 75);

  const nametagTex = new THREE.CanvasTexture(nametagCanvas);
  const nametagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nametagTex, depthTest: false }));
  nametagSprite.position.set(0, 1.7, 0);
  nametagSprite.scale.set(1.6, 0.5, 1);
  group.add(nametagSprite);

  // Interaction Prompt [E] Xóc Đĩa
  const promptTex = createThayDoPromptTexture();
  const interactPrompt = new THREE.Sprite(new THREE.SpriteMaterial({ map: promptTex, depthTest: false }));
  interactPrompt.position.set(0, 2.1, 0);
  interactPrompt.scale.set(1.5, 0.5, 1);
  interactPrompt.visible = false;
  group.add(interactPrompt);

  // Speech Bubble Sprite
  const speechTex = createSpeechBubbleTexture('Vào đây làm một quẻ xóc đĩa xem vận may rủi nào con!');
  const speechSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: speechTex, depthTest: false }));
  speechSprite.position.set(0, 2.8, 0);
  speechSprite.scale.set(2.8, 1.4, 1);
  speechSprite.visible = false;
  group.add(speechSprite);

  // Update Animation (Rhythmic vigorous bowl shaking!)
  const update = (time: number, playerPos: THREE.Vector3, _isConversing: boolean) => {
    // 1. Shaking the bát xóc đĩa up and down rapidly
    bowlGroup.position.y = 0.12 + Math.abs(Math.sin(time * 12)) * 0.08;
    bowlGroup.rotation.z = Math.sin(time * 12) * 0.06;
    bowlGroup.rotation.x = Math.cos(time * 12) * 0.06;

    // 2. Head turning towards player
    const worldPos = new THREE.Vector3();
    group.getWorldPosition(worldPos);
    const distToPlayer = worldPos.distanceTo(playerPos);

    if (distToPlayer < 6.5) {
      const angle = Math.atan2(playerPos.x - worldPos.x, playerPos.z - worldPos.z);
      head.rotation.y = angle - group.rotation.y;
      head.rotation.y = Math.max(-1.1, Math.min(1.1, head.rotation.y));
    } else {
      head.rotation.y = Math.sin(time * 0.8) * 0.1;
    }

    if (interactPrompt.visible) {
      interactPrompt.position.y = 2.1 + Math.sin(time * 5) * 0.05;
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
    bowlGroup,
    speechSprite,
    interactPrompt,
    update,
    showSpeech,
    hideSpeech,
    setInteractPromptVisible,
  };
}
