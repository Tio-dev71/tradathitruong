import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildChibiAvatar } from '../player/AvatarBuilder';
import { soundEngine } from '../services/soundEngine';
import type { AvatarConfig, PlayerRole } from '../types/game';

interface Props {
  onComplete: (nickname: string, role: PlayerRole, avatar: AvatarConfig) => void;
}

const ROLES: PlayerRole[] = [
  'Trader Tập Sự',
  'Thợ Săn Kèo',
  'Cao Thủ Đu Đỉnh',
  'Chiến Thần Bắt Đáy',
  'Nhà Tiên Tri Nến',
  'Ông Chú Ngồi Hóng',
  'Cá Mập Giả Nghèo',
];

const HAIR_STYLES = ['short', 'spiky', 'bob', 'bun', 'ponytail'] as const;

const OUTFIT_COLORS = [
  '#2e86de', // Blue
  '#ee5253', // Red
  '#10ac84', // Green
  '#ff9f43', // Orange
  '#5f27cd', // Purple
  '#341f97', // Navy
  '#333333', // Dark
];

const HAIR_COLORS = [
  '#1a1a1a', // Black
  '#543821', // Brown
  '#d4a359', // Blonde/Caramel
  '#8e44ad', // Purple
  '#c0392b', // Auburn
];

export const CharacterCreationModal: React.FC<Props> = ({ onComplete }) => {
  const [nickname, setNickname] = useState('Chiến Thần Sài Gòn');
  const [role, setRole] = useState<PlayerRole>('Cao Thủ Đu Đỉnh');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('male');
  const [hairStyle, setHairStyle] = useState<'short' | 'spiky' | 'bob' | 'bun' | 'ponytail'>('spiky');
  const [hairColor, setHairColor] = useState('#1a1a1a');
  const [outfitColor, setOutfitColor] = useState('#2e86de');
  const [pantsColor, setPantsColor] = useState('#2c3e50');
  const [accessory, setAccessory] = useState<'glasses' | 'cap' | 'none'>('glasses');

  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; avatarGroup?: THREE.Group } | null>(null);

  // Initialize 3D Preview
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const container = previewCanvasRef.current;
    const width = container.clientWidth || 280;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2d1f14);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.1, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Warm studio lights for avatar
    const ambientLight = new THREE.AmbientLight(0xfff0dd, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffddaa, 1.4);
    keyLight.position.set(2, 3, 2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x70a1ff, 0.8);
    rimLight.position.set(-2, 2, -2);
    scene.add(rimLight);

    sceneRef.current = { scene, camera, renderer };

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (sceneRef.current?.avatarGroup) {
        sceneRef.current.avatarGroup.rotation.y += 0.012; // Gentle auto-rotate
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, []);

  // Update avatar preview whenever options change
  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene } = sceneRef.current;

    if (sceneRef.current.avatarGroup) {
      scene.remove(sceneRef.current.avatarGroup);
    }

    const config: AvatarConfig = {
      gender,
      hairStyle,
      hairColor,
      outfitColor,
      pantsColor,
      skinTone: '#fcd5b5',
      accessory,
    };

    const rig = buildChibiAvatar(config, nickname || 'Bạn Mới', role);
    rig.root.position.y = -0.1;
    scene.add(rig.root);
    sceneRef.current.avatarGroup = rig.root;
  }, [gender, hairStyle, hairColor, outfitColor, pantsColor, accessory, nickname, role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playUiClick();
    soundEngine.playCupClink();

    const config: AvatarConfig = {
      gender,
      hairStyle,
      hairColor,
      outfitColor,
      pantsColor,
      skinTone: '#fcd5b5',
      accessory,
    };

    onComplete(nickname.trim() || 'Khách Uống Trà', role, config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#3a2618] to-[#20150d] border-2 border-[#d4af37]/70 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.3)] text-[#fff8ee]">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-1 rounded-full bg-[#b35d43] text-amber-200 text-xs font-semibold tracking-wider uppercase mb-2">
            Social 3D Sandbox
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-amber-300 drop-shadow-md">
            CHÀO MỪNG ĐẾN QUÁN TRÀ ĐÁ THỊ TRƯỜNG
          </h1>
          <p className="text-sm sm:text-base text-amber-100/80 italic mt-1 font-serif">
            "Ngồi xuống uống chén trà, nghe bà soi thị trường."
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: 3D Preview */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-amber-600/40 bg-[#24170e] shadow-inner flex items-center justify-center">
              <div ref={previewCanvasRef} className="w-full h-full" />
              <div className="absolute bottom-2 left-2 text-[11px] text-amber-200/60 bg-black/60 px-2 py-0.5 rounded-full">
                Xoay 360° tự động
              </div>
            </div>
            <p className="text-xs text-amber-300/70 mt-2 text-center">
              Diện mạo 3D hiển thị trước các người chơi khác trong quán
            </p>
          </div>

          {/* Right Column: Customization Controls */}
          <div className="md:col-span-7 space-y-4">
            {/* Nickname */}
            <div>
              <label className="block text-xs font-bold text-amber-300 uppercase mb-1">
                Biệt Danh (Tối đa 20 ký tự)
              </label>
              <input
                type="text"
                maxLength={20}
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-amber-500/40 focus:border-amber-400 focus:outline-none text-white font-medium"
                placeholder="Nhập biệt danh của bạn..."
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-bold text-amber-300 uppercase mb-1">
                Vai Trò Khởi Tạo
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as PlayerRole)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-amber-500/40 focus:border-amber-400 focus:outline-none text-amber-200 font-medium"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-[#2c1a0e] text-amber-100">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Hair Style & Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase mb-1">
                  Kiểu Tóc
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setHairStyle(style)}
                      className={`px-2.5 py-1 text-xs rounded-lg border capitalize transition ${
                        hairStyle === style
                          ? 'bg-amber-500 text-black font-bold border-amber-300 shadow'
                          : 'bg-black/30 text-amber-200/80 border-amber-800/60 hover:bg-black/50'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase mb-1">
                  Phụ Kiện
                </label>
                <div className="flex gap-1.5">
                  {(['none', 'glasses'] as const).map((acc) => (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => setAccessory(acc)}
                      className={`px-3 py-1 text-xs rounded-lg border capitalize transition ${
                        accessory === acc
                          ? 'bg-amber-500 text-black font-bold border-amber-300 shadow'
                          : 'bg-black/30 text-amber-200/80 border-amber-800/60'
                      }`}
                    >
                      {acc === 'glasses' ? 'Kính Râm' : 'Không'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-3 gap-3">
              {/* Outfit color */}
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase mb-1">Màu Áo</label>
                <div className="flex gap-1.5 flex-wrap">
                  {OUTFIT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setOutfitColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        outfitColor === c ? 'border-white scale-110 shadow' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Hair color */}
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase mb-1">Màu Tóc</label>
                <div className="flex gap-1.5 flex-wrap">
                  {HAIR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setHairColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        hairColor === c ? 'border-white scale-110 shadow' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Pants */}
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase mb-1">Màu Quần</label>
                <div className="flex gap-1.5 flex-wrap">
                  {['#2c3e50', '#1a1a1a', '#4a4a4a', '#8b5a2b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPantsColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        pantsColor === c ? 'border-white scale-110 shadow' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Enter Button */}
            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-stone-950 font-black text-lg tracking-wide hover:brightness-110 active:scale-[0.98] transition shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer"
              >
                VÀO QUÁN UỐNG TRÀ 🍵
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

