import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MannequinScale, WardrobeItem } from '../types';

interface MannequinCanvasProps {
  scale: MannequinScale;
  topColors: string[];
  bottomColors: string[];
  shoesColors: string[];
  hasTop: boolean;
  hasBottom: boolean;
  hasShoes: boolean;
  activeTopItem?: WardrobeItem;
  activeBottomItem?: WardrobeItem;
  activeShoesItem?: WardrobeItem;
}

// Fallback helper to draw rounded rectangles on HTML Canvas context
const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
};

export default function MannequinCanvas({
  scale,
  topColors,
  bottomColors,
  shoesColors,
  hasTop,
  hasBottom,
  hasShoes,
  activeTopItem,
  activeBottomItem,
  activeShoesItem,
}: MannequinCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRotating, setIsRotating] = useState(true);

  // Keep refs of mesh parts we need to animate or scale dynamically
  const mannequinGroupRef = useRef<THREE.Group | null>(null);
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const neckMeshRef = useRef<THREE.Mesh | null>(null);
  const baseChestMeshRef = useRef<THREE.Mesh | null>(null);  // Skin Torso Base
  const chestMeshRef = useRef<THREE.Mesh | null>(null);      // Physical Layer Shirt Torso
  const baseWaistMeshRef = useRef<THREE.Mesh | null>(null);  // Skin Waist Base
  const waistMeshRef = useRef<THREE.Mesh | null>(null);      // Physical Layer Shirt Waist
  const leftShoulderMeshRef = useRef<THREE.Mesh | null>(null);
  const rightShoulderMeshRef = useRef<THREE.Mesh | null>(null);
  const leftArmMeshRef = useRef<THREE.Mesh | null>(null);    // Left arm base limb (skin)
  const rightArmMeshRef = useRef<THREE.Mesh | null>(null);  // Right arm base limb (skin)
  const leftSleeveMeshRef = useRef<THREE.Mesh | null>(null); // Physical dynamic t-shirt sleeve
  const rightSleeveMeshRef = useRef<THREE.Mesh | null>(null);// Physical dynamic t-shirt sleeve
  const basePelvisMeshRef = useRef<THREE.Mesh | null>(null); // Skin Pelvis Base
  const pelvisMeshRef = useRef<THREE.Mesh | null>(null);     // Physical Layer Pants Hips
  const baseLeftLegMeshRef = useRef<THREE.Mesh | null>(null);// Skin Left Leg Base
  const baseRightLegMeshRef = useRef<THREE.Mesh | null>(null);// Skin Right Leg Base
  const leftLegMeshRef = useRef<THREE.Mesh | null>(null);    // Physical Layer Pants Left Leg
  const rightLegMeshRef = useRef<THREE.Mesh | null>(null);   // Physical Layer Pants Right Leg
  const leftShoeMeshRef = useRef<THREE.Mesh | null>(null);   // Physical shoes
  const rightShoeMeshRef = useRef<THREE.Mesh | null>(null);  // Physical shoes

  // Texture canvas helpers to avoid creating new textures constantly
  const topTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const bottomTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const shoesTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Helper function to darken/brighten hex colors for realistic depth
  const adjustColorBrightness = (hex: string, percent: number) => {
    let num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
  };

  // Helper to draw realistic fabrics, graphics, pockets, laces, and logos
  const createRealisticTexture = (
    category: 'Top' | 'Bottom' | 'Shoes',
    item: WardrobeItem | undefined,
    colors: string[],
    hasItem: boolean,
    defaultColors: string[],
    textureRef: React.MutableRefObject<THREE.CanvasTexture | null>
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; // High definition textures!
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      if (textureRef.current) textureRef.current.dispose();
      const texture = new THREE.CanvasTexture(canvas);
      textureRef.current = texture;
      return texture;
    }

    const activeColors = hasItem && colors.length > 0 ? colors : defaultColors;
    const primaryColor = activeColors[0];
    const secondaryColor = activeColors[1] || adjustColorBrightness(primaryColor, -15);
    const accentColor = activeColors[2] || adjustColorBrightness(secondaryColor, -10);

    // 1. Draw base gradient/solid
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, secondaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Draw modern high-quality fabric fabric weave weave pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = 0; x < 512; x += 4) {
      ctx.fillRect(x, 0, 2, 512);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let y = 0; y < 512; y += 4) {
      ctx.fillRect(0, y, 512, 2);
    }

    // 3. Draw dual side joints stitching lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(35, 0); ctx.lineTo(35, 512);
    ctx.moveTo(477, 0); ctx.lineTo(477, 512);
    ctx.stroke();

    const labelLower = item?.label?.toLowerCase() || '';

    // 4. Overlays based on category styling
    if (category === 'Top') {
      // Draw crewneck neck collar trim
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(256, 40, 75, 0, Math.PI, false);
      ctx.stroke();

      // Horizontal yoke seam lines
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(0, 90); ctx.lineTo(512, 90);
      ctx.stroke();
      ctx.setLineDash([]);

      if (item && item.imageUrl) {
        // High fidelity user uploaded custom decal mapping
        const image = new Image();
        image.src = item.imageUrl;
        image.onload = () => {
          const size = 130;
          const px = 256 - size / 2;
          const py = 180;

          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.35)';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          drawRoundRect(ctx, px - 6, py - 6, size + 12, size + 12, 10);
          ctx.fill();
          ctx.restore();

          ctx.drawImage(image, px, py, size, size);

          // Branded description label
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('DESIGNER CUSTOM-FIT', 256, py + size + 12);
          ctx.fillText(`ID: ${item.id.substring(5, 12).toUpperCase()}`, 256, py + size + 22);

          texture.needsUpdate = true;
        };
      } else if (labelLower.includes('sunset') || labelLower.includes('coral')) {
        // Retro Sunrise sunset print on chest center front (middle maps to front-facing)
        const sunY = 220;
        const r = 60;

        ctx.fillStyle = '#f43f5e'; // neon sun
        ctx.beginPath();
        ctx.arc(256, sunY, r, 0, Math.PI * 2);
        ctx.fill();

        // horizontal retro screenline slots
        ctx.fillStyle = primaryColor;
        for (let sy = sunY - r; sy < sunY + r; sy += 16) {
          ctx.fillRect(256 - r, sy, r * 2, 4);
        }

        // Ocean wave outlines
        ctx.strokeStyle = '#ffe4e6';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let waveY = sunY + r - 12; waveY <= sunY + r + 15; waveY += 10) {
          ctx.moveTo(180, waveY);
          for (let wx = 180; wx <= 332; wx += 8) {
            ctx.lineTo(wx, waveY + Math.sin(wx * 0.12) * 2.5);
          }
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SUNSET LOOKBOOK', 256, sunY + 95);
      } else if (labelLower.includes('purple') || labelLower.includes('cyber') || labelLower.includes('jersey')) {
        // Circuit line geometric patterns + massive glowing jersey badge numbers
        ctx.strokeStyle = '#22d3ee'; // cyberpunk blue lines
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(70, 110);
        ctx.lineTo(150, 240);
        ctx.lineTo(100, 240);
        ctx.moveTo(442, 110);
        ctx.lineTo(362, 240);
        ctx.lineTo(412, 240);
        ctx.stroke();

        ctx.fillStyle = 'rgba(244, 63, 94, 0.9)'; // magenta orange glow
        ctx.font = 'bold 72px "Space Grotesk"';
        ctx.textAlign = 'center';
        ctx.fillText('99', 256, 255);

        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('ATELIER AUTOMATED // CH77', 256, 282);

        // Bold athletic side racing stripes
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(45, 0, 10, 512);
        ctx.fillRect(457, 0, 10, 512);
      } else if (labelLower.includes('fleece') || labelLower.includes('green') || labelLower.includes('forest')) {
        // Polar fleece textures, zippers, breast stash covers
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(100, 140, 110, 120);
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(100, 140, 110, 120);

        ctx.fillStyle = '#a7f3d0';
        ctx.fillRect(145, 152, 24, 7);

        // Center seam half zip
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(256, 40);
        ctx.lineTo(256, 215);
        ctx.stroke();

        // metal pull tab
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        drawRoundRect(ctx, 251, 202, 10, 16, 2);
        ctx.fill();

        // Ribbed wrist seam cuffs
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 480, 512, 32);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 2;
        for (let cx = 0; cx < 512; cx += 15) {
          ctx.beginPath();
          ctx.moveTo(cx, 480);
          ctx.lineTo(cx, 512);
          ctx.stroke();
        }
      } else {
        // Generic Tops (e.g. uploaded plain top): neat small smart clip logo print
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        drawRoundRect(ctx, 310, 160, 80, 90, 4);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = 'semibold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CYBER ATELIER', 256, 275);
      }
    } else if (category === 'Bottom') {
      // Bottom Trouser detailed segments
      if (labelLower.includes('jeans') || labelLower.includes('indigo') || labelLower.includes('denim')) {
        // Golden heavy contrast stitching down joints
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(42, 0); ctx.lineTo(42, 512);
        ctx.moveTo(48, 0); ctx.lineTo(48, 512);
        ctx.moveTo(470, 0); ctx.lineTo(470, 512);
        ctx.moveTo(464, 0); ctx.lineTo(464, 512);
        ctx.stroke();
        ctx.setLineDash([]);

        // Front fly seam curve
        ctx.beginPath();
        ctx.moveTo(256, 0);
        ctx.lineTo(256, 175);
        ctx.quadraticCurveTo(256, 220, 210, 220);
        ctx.stroke();

        // Denim hip crease whiskers
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 12;
        for (let wy = 70; wy <= 160; wy += 30) {
          ctx.beginPath();
          ctx.moveTo(50, wy);
          ctx.quadraticCurveTo(140, wy + 25, 215, wy - 5);
          ctx.moveTo(462, wy);
          ctx.quadraticCurveTo(372, wy + 25, 297, wy - 5);
          ctx.stroke();
        }

        // Pocket brass rivets
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(62, 45, 6, 0, Math.PI * 2);
        ctx.arc(450, 45, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (labelLower.includes('chino') || labelLower.includes('joggers') || labelLower.includes('sand')) {
        // Elastic waistband ribs, real white drawstrings, side hand pockets
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(35, 100); ctx.lineTo(130, 170);
        ctx.moveTo(477, 100); ctx.lineTo(382, 170);
        ctx.stroke();

        // Waistband
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, 0, 512, 42);

        // Hanging shoelace drawstring ropes
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(235, 25);
        ctx.bezierCurveTo(225, 75, 245, 130, 230, 165);
        ctx.moveTo(275, 25);
        ctx.bezierCurveTo(285, 75, 265, 130, 280, 165);
        ctx.stroke();

        // Black tips
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(226, 159, 8, 12);
        ctx.fillRect(276, 159, 8, 12);

        // Bottom cuffs
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 475, 512, 37);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 2;
        for (let lx = 0; lx < 512; lx += 15) {
          ctx.beginPath();
          ctx.moveTo(lx, 475);
          ctx.lineTo(lx, 512);
          ctx.stroke();
        }
      } else if (labelLower.includes('cargo') || labelLower.includes('slacks') || labelLower.includes('grey')) {
        // High fidelity side utility thigh cargo flaps
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;

        // Left cargo
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        drawRoundRect(ctx, 45, 195, 115, 145, 8);
        ctx.fill();
        ctx.stroke();

        // Left flap
        ctx.fillStyle = accentColor;
        ctx.fillRect(40, 185, 125, 30);
        ctx.strokeRect(40, 185, 125, 30);

        ctx.fillStyle = '#000000';
        ctx.fillRect(92, 212, 20, 22);

        // Right cargo
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        drawRoundRect(ctx, 352, 195, 115, 145, 8);
        ctx.fill();
        ctx.stroke();

        // Right flap
        ctx.fillStyle = accentColor;
        ctx.fillRect(347, 185, 125, 30);
        ctx.strokeRect(347, 185, 125, 30);

        ctx.fillStyle = '#000000';
        ctx.fillRect(399, 212, 20, 22);

        // Belt waistband loops
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 10, 512, 26);
      } else {
        // Sweatpants sporty athletic racing track stripes down sides
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(35, 0, 16, 512);
        ctx.fillRect(461, 0, 16, 512);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(51, 0, 6, 512);
        ctx.fillRect(455, 0, 6, 512);
      }
    } else if (category === 'Shoes') {
      // Sneakers and Runners specific details
      if (labelLower.includes('runners') || labelLower.includes('obsidian') || labelLower.includes('tech')) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 512, 512);

        // Neon mesh glow panels
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
        ctx.lineWidth = 4;
        for (let i = 50; i < 480; i += 70) {
          ctx.beginPath();
          ctx.moveTo(i, 40);
          ctx.lineTo(i + 35, 270);
          ctx.lineTo(i - 35, 270);
          ctx.stroke();
        }

        // Green sporty swooshing outline
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(110, 310);
        ctx.bezierCurveTo(210, 395, 320, 330, 410, 390);
        ctx.stroke();

        // Diagonal running shoelaces (Z-laces mapped to trainer tongue wrapping)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        for (let ly = 70; ly < 230; ly += 32) {
          ctx.beginPath();
          ctx.moveTo(215, ly);
          ctx.lineTo(297, ly + 20);
          ctx.moveTo(297, ly);
          ctx.lineTo(215, ly + 20);
          ctx.stroke();

          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(211 - 4, ly - 4, 8, 8);
          ctx.fillRect(301 - 4, ly - 4, 8, 8);
        }
      } else if (labelLower.includes('retro') || labelLower.includes('trainers') || labelLower.includes('off-white')) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 512, 512);

        // Toe overlap cap
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(256, 450, 130, Math.PI, 0, false);
        ctx.fill();

        ctx.fillStyle = '#ef4444'; // Red side chevron stripes
        ctx.beginPath();
        ctx.moveTo(115, 210);
        ctx.lineTo(215, 315);
        ctx.lineTo(195, 315);
        ctx.lineTo(95, 210);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(155, 190);
        ctx.lineTo(255, 295);
        ctx.lineTo(235, 295);
        ctx.lineTo(135, 190);
        ctx.fill();

        // Retro trainers flat white wide lace straps
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 15;
        ctx.lineCap = 'square';
        for (let ly = 100; ly < 270; ly += 35) {
          ctx.beginPath();
          ctx.moveTo(195, ly);
          ctx.lineTo(317, ly);
          ctx.stroke();

          // stitched detailing
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(195, ly);
          ctx.lineTo(317, ly);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.setLineDash([]);
          ctx.lineWidth = 15;
        }
      } else {
        // Plain default laces
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        for (let ly = 110; ly < 290; ly += 45) {
          ctx.beginPath();
          ctx.moveTo(195, ly);
          ctx.lineTo(317, ly + 15);
          ctx.moveTo(317, ly);
          ctx.lineTo(195, ly + 15);
          ctx.stroke();
        }
      }
    }

    if (textureRef.current) {
      textureRef.current.dispose();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureRef.current = texture;
    return texture;
  };

  // Update textures whenever clothing colors/presence/item references change
  useEffect(() => {
    const topTex = createRealisticTexture('Top', activeTopItem, topColors, hasTop, ['#f1f5f9', '#cbd5e1'], topTextureRef);
    const bottomTex = createRealisticTexture('Bottom', activeBottomItem, bottomColors, hasBottom, ['#475569', '#1e293b'], bottomTextureRef);
    const shoesTex = createRealisticTexture('Shoes', activeShoesItem, shoesColors, hasShoes, ['#0f172a', '#334155'], shoesTextureRef);

    if (chestMeshRef.current && chestMeshRef.current.material) {
      const mat = chestMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = topTex;
      mat.needsUpdate = true;
    }
    if (waistMeshRef.current && waistMeshRef.current.material) {
      const mat = waistMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = topTex; // Waist blend
      mat.needsUpdate = true;
    }
    if (leftLegMeshRef.current && leftLegMeshRef.current.material) {
      const mat = leftLegMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = bottomTex;
      mat.needsUpdate = true;
    }
    if (rightLegMeshRef.current && rightLegMeshRef.current.material) {
      const mat = rightLegMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = bottomTex;
      mat.needsUpdate = true;
    }
    if (leftShoeMeshRef.current && leftShoeMeshRef.current.material) {
      const mat = leftShoeMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = shoesTex;
      mat.needsUpdate = true;
    }
    if (rightShoeMeshRef.current && rightShoeMeshRef.current.material) {
      const mat = rightShoeMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = shoesTex;
      mat.needsUpdate = true;
    }

    // Toggle the physical garment layer visibility dynamically
    if (chestMeshRef.current) chestMeshRef.current.visible = hasTop;
    if (waistMeshRef.current) waistMeshRef.current.visible = hasTop;
    if (leftSleeveMeshRef.current) leftSleeveMeshRef.current.visible = hasTop;
    if (rightSleeveMeshRef.current) rightSleeveMeshRef.current.visible = hasTop;
    if (pelvisMeshRef.current) pelvisMeshRef.current.visible = hasBottom;
    if (leftLegMeshRef.current) leftLegMeshRef.current.visible = hasBottom;
    if (rightLegMeshRef.current) rightLegMeshRef.current.visible = hasBottom;
    if (leftShoeMeshRef.current) leftShoeMeshRef.current.visible = hasShoes;
    if (rightShoeMeshRef.current) rightShoeMeshRef.current.visible = hasShoes;
    
  }, [topColors, bottomColors, shoesColors, hasTop, hasBottom, hasShoes, activeTopItem, activeBottomItem, activeShoesItem]);

  // Handle live scale slider changes
  useEffect(() => {
    const mannequin = mannequinGroupRef.current;
    if (!mannequin) return;

    // Apply scale modifications to the corresponding joints dynamically
    const h = scale.height;              // range: 0.8 to 1.5
    const w = scale.shoulderWidth;       // range: 0.7 to 1.5
    const b = scale.waistBuild;          // range: 0.6 to 1.5

    // Adjust base chest / upper body X/Z scale (shoulder width)
    if (baseChestMeshRef.current) {
      baseChestMeshRef.current.scale.set(w, 1.0, (w + b) / 2);
    }
    // Adjust base waist X/Z scale (waist thickness)
    if (baseWaistMeshRef.current) {
      baseWaistMeshRef.current.scale.set(b, 1.0, b);
    }

    // Shoulder sphere joints shift position left/right matching chest scale width
    if (leftShoulderMeshRef.current) {
      leftShoulderMeshRef.current.position.x = -0.45 * w;
      leftShoulderMeshRef.current.scale.set(w * 0.9, w * 0.9, w * 0.9);
    }
    if (rightShoulderMeshRef.current) {
      rightShoulderMeshRef.current.position.x = 0.45 * w;
      rightShoulderMeshRef.current.scale.set(w * 0.9, w * 0.9, w * 0.9);
    }

    // Arm positioning adapts to shoulder width
    if (leftArmMeshRef.current) {
      leftArmMeshRef.current.position.x = -0.6 * w;
      leftArmMeshRef.current.scale.set(0.9, h, 0.9);
    }
    if (rightArmMeshRef.current) {
      rightArmMeshRef.current.position.x = 0.6 * w;
      rightArmMeshRef.current.scale.set(0.9, h, 0.9);
    }

    // Adjust heights and positions of legs based on Height slider
    if (basePelvisMeshRef.current) {
      basePelvisMeshRef.current.scale.set(b * 1.05, 1.0, b * 1.05);
    }

    if (baseLeftLegMeshRef.current) {
      baseLeftLegMeshRef.current.scale.set(b * 0.95, h, b * 0.95);
      baseLeftLegMeshRef.current.position.y = -0.35 - (0.32 * h);
    }
    if (baseRightLegMeshRef.current) {
      baseRightLegMeshRef.current.scale.set(b * 0.95, h, b * 0.95);
      baseRightLegMeshRef.current.position.y = -0.35 - (0.32 * h);
    }

    // Shoes position shifts down dynamically matching the legs height scale
    const legOffset = -0.35 - (0.64 * h);
    if (leftShoeMeshRef.current) {
      leftShoeMeshRef.current.position.y = legOffset - 0.08;
      leftShoeMeshRef.current.scale.set(1, 1, 1 + (h - 1) * 0.2);
    }
    if (rightShoeMeshRef.current) {
      rightShoeMeshRef.current.position.y = legOffset - 0.08;
      rightShoeMeshRef.current.scale.set(1, 1, 1 + (h - 1) * 0.2);
    }

    // Adapt entire height setup to prevent floor sinking: Float the group
    mannequin.position.y = (0.5 * h) - 0.4;

  }, [scale]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 450;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to blend nicely in absolute overlay card

    // CAMERA
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 3.2);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // AMBIENT AND DIRECTIONAL LIGHTS (Refining technical studio tone)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa5b4fc, 0.45); // Cool cyber tint
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    // STUDIO FLOOR / GRID
    const gridHelper = new THREE.GridHelper(8, 20, 0x6366f1, 0x334155);
    gridHelper.position.y = -1.25;
    if (gridHelper.material instanceof THREE.Material) {
      gridHelper.material.opacity = 0.25;
      gridHelper.material.transparent = true;
    }
    scene.add(gridHelper);

    // MANNEQUIN GROUP CREATION
    const mannequinGroup = new THREE.Group();
    scene.add(mannequinGroup);
    mannequinGroupRef.current = mannequinGroup;

    // Materials
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Clean porcelain matte glaze
      roughness: 0.35,
      metalness: 0.1,
    });

    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.3,
    });

    // Create Initial Gradient Textures
    const topTex = createRealisticTexture('Top', activeTopItem, topColors, hasTop, ['#f1f5f9', '#cbd5e1'], topTextureRef);
    const bottomTex = createRealisticTexture('Bottom', activeBottomItem, bottomColors, hasBottom, ['#475569', '#1e293b'], bottomTextureRef);
    const shoesTex = createRealisticTexture('Shoes', activeShoesItem, shoesColors, hasShoes, ['#0f172a', '#334155'], shoesTextureRef);

    const clothingTopMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.6,
      metalness: 0.05,
    });

    const clothingBottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      roughness: 0.7,
      metalness: 0.02,
    });

    const clothingShoesMat = new THREE.MeshStandardMaterial({
      map: shoesTex,
      roughness: 0.4,
      metalness: 0.1,
    });

    // Geometries
    const headGeo = new THREE.SphereGeometry(0.24, 32, 24);
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.15, 16);
    const shoulderGeo = new THREE.SphereGeometry(0.085, 16, 16);
    const armGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.5, 16); // slightly slimmer base arm

    // 1. Skin Base Geometries (Anatomy underneath)
    const baseChestGeo = new THREE.CylinderGeometry(0.26, 0.20, 0.5, 32);
    const baseWaistGeo = new THREE.CylinderGeometry(0.20, 0.19, 0.08, 32);
    const basePelvisGeo = new THREE.CylinderGeometry(0.19, 0.20, 0.18, 32);
    const baseLegGeo = new THREE.CylinderGeometry(0.085, 0.07, 0.6, 24);
    const baseFootGeo = new THREE.BoxGeometry(0.10, 0.08, 0.22); // naked foot inside shoe

    // 2. Overlay Clothing Geometries (Slightly larger dimensions to wrap skin layers physically)
    const shirtTorsoGeo = new THREE.CylinderGeometry(0.275, 0.215, 0.51, 32);  // wraps chest
    const shirtCollarGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.03, 24);   // neck collar trim
    const shirtWaistGeo = new THREE.CylinderGeometry(0.21, 0.20, 0.09, 32);    // wraps waist
    const shirtSleeveGeo = new THREE.CylinderGeometry(0.078, 0.072, 0.22, 16); // sleeves overlapping upper arm
    
    const pantsPelvisGeo = new THREE.CylinderGeometry(0.20, 0.21, 0.19, 32);   // trouser seat wrapping hips
    const pantsLegGeo = new THREE.CylinderGeometry(0.095, 0.08, 0.58, 24);     // pants leg cylinders

    // Sneaker/boot component dimensions for dual-layered footwear
    const shoeSoleGeo = new THREE.BoxGeometry(0.13, 0.04, 0.28);  // chunky sneaker sole
    const shoeUpperGeo = new THREE.BoxGeometry(0.124, 0.08, 0.27); // colorful upper fabric top

    // 1. Head (Porcelain Skin)
    const head = new THREE.Mesh(headGeo, skinMaterial);
    head.position.y = 0.74;
    head.castShadow = true;
    mannequinGroup.add(head);
    headMeshRef.current = head;

    // 2. Neck (Porcelain Skin joint)
    const neck = new THREE.Mesh(neckGeo, jointMaterial);
    neck.position.y = 0.58;
    neck.castShadow = true;
    mannequinGroup.add(neck);
    neckMeshRef.current = neck;

    // 3. Base Chest (Bare skin mannequin torso)
    const baseChest = new THREE.Mesh(baseChestGeo, skinMaterial);
    baseChest.position.y = 0.3;
    baseChest.castShadow = true;
    baseChest.receiveShadow = true;
    mannequinGroup.add(baseChest);
    baseChestMeshRef.current = baseChest;

    // --- Physical TOP Garment Layer: Crew Shirt Torso & Neck collar ---
    const shirtTorso = new THREE.Mesh(shirtTorsoGeo, clothingTopMat);
    shirtTorso.castShadow = true;
    shirtTorso.receiveShadow = true;
    baseChest.add(shirtTorso); // Parent-child nested scale tracking!
    chestMeshRef.current = shirtTorso;

    const shirtCollar = new THREE.Mesh(shirtCollarGeo, jointMaterial); // crewneck trim
    shirtCollar.position.y = 0.255;
    shirtCollar.castShadow = true;
    shirtTorso.add(shirtCollar); // child of shirt, turns off organically when shirt is hidden

    // 4. Base Waist Joint (skin)
    const baseWaist = new THREE.Mesh(baseWaistGeo, skinMaterial);
    baseWaist.position.y = 0.01;
    baseWaist.castShadow = true;
    mannequinGroup.add(baseWaist);
    baseWaistMeshRef.current = baseWaist;

    // --- Physical TOP Garment Layer: T-shirt Bottom hem ---
    const shirtWaist = new THREE.Mesh(shirtWaistGeo, clothingTopMat);
    shirtWaist.castShadow = true;
    baseWaist.add(shirtWaist); // Parent-child nested tracking!
    waistMeshRef.current = shirtWaist;

    // 5. Left Shoulder (Joint)
    const leftShoulder = new THREE.Mesh(shoulderGeo, jointMaterial);
    leftShoulder.position.set(-0.45, 0.48, 0);
    mannequinGroup.add(leftShoulder);
    leftShoulderMeshRef.current = leftShoulder;

    // 6. Right Shoulder (Joint)
    const rightShoulder = new THREE.Mesh(shoulderGeo, jointMaterial);
    rightShoulder.position.set(0.45, 0.48, 0);
    mannequinGroup.add(rightShoulder);
    rightShoulderMeshRef.current = rightShoulder;

    // 7. Left Arm (Gently Angled, porcelain bare Skin)
    const leftArm = new THREE.Mesh(armGeo, skinMaterial);
    leftArm.position.set(-0.6, 0.25, 0);
    leftArm.rotation.z = 0.12;
    leftArm.castShadow = true;
    mannequinGroup.add(leftArm);
    leftArmMeshRef.current = leftArm;

    // --- Physical TOP Garment Layer: Left short Sleeve ---
    const leftSleeve = new THREE.Mesh(shirtSleeveGeo, clothingTopMat);
    leftSleeve.position.set(0, 0.12, 0); // covers upper part of the arm
    leftSleeve.castShadow = true;
    leftArm.add(leftSleeve); // Automatically matches position/rotation of arm bone
    leftSleeveMeshRef.current = leftSleeve;

    // 8. Right Arm (Gently Angled, porcelain bare Skin)
    const rightArm = new THREE.Mesh(armGeo, skinMaterial);
    rightArm.position.set(0.6, 0.25, 0);
    rightArm.rotation.z = -0.12;
    rightArm.castShadow = true;
    mannequinGroup.add(rightArm);
    rightArmMeshRef.current = rightArm;

    // --- Physical TOP Garment Layer: Right short Sleeve ---
    const rightSleeve = new THREE.Mesh(shirtSleeveGeo, clothingTopMat);
    rightSleeve.position.set(0, 0.12, 0); // covers upper part of the arm
    rightSleeve.castShadow = true;
    rightArm.add(rightSleeve);
    rightSleeveMeshRef.current = rightSleeve;

    // 9. Base Pelvis (skin hips)
    const basePelvis = new THREE.Mesh(basePelvisGeo, skinMaterial);
    basePelvis.position.y = -0.12;
    basePelvis.castShadow = true;
    mannequinGroup.add(basePelvis);
    basePelvisMeshRef.current = basePelvis;

    // --- Physical BOTTOM Garment Layer: Trousers upper hips seat ---
    const pantsPelvis = new THREE.Mesh(pantsPelvisGeo, clothingBottomMat);
    pantsPelvis.castShadow = true;
    basePelvis.add(pantsPelvis); // Attached directly as a child of basePelvis!
    pelvisMeshRef.current = pantsPelvis;

    // 10. Left Leg Base (skin leg column underneath)
    const baseLeftLeg = new THREE.Mesh(baseLegGeo, skinMaterial);
    baseLeftLeg.position.set(-0.11, -0.45, 0);
    baseLeftLeg.castShadow = true;
    baseLeftLeg.receiveShadow = true;
    mannequinGroup.add(baseLeftLeg);
    baseLeftLegMeshRef.current = baseLeftLeg;

    // --- Physical BOTTOM Garment Layer: Left trouser pant column ---
    const leftPantsLeg = new THREE.Mesh(pantsLegGeo, clothingBottomMat);
    leftPantsLeg.position.set(0, 0, 0); // wraps outer leg perfectly
    leftPantsLeg.castShadow = true;
    leftPantsLeg.receiveShadow = true;
    baseLeftLeg.add(leftPantsLeg); // Child of baseLeftLeg!
    leftLegMeshRef.current = leftPantsLeg;

    // 11. Right Leg Base (skin leg column underneath)
    const baseRightLeg = new THREE.Mesh(baseLegGeo, skinMaterial);
    baseRightLeg.position.set(0.11, -0.45, 0);
    baseRightLeg.castShadow = true;
    baseRightLeg.receiveShadow = true;
    mannequinGroup.add(baseRightLeg);
    baseRightLegMeshRef.current = baseRightLeg;

    // --- Physical BOTTOM Garment Layer: Right trouser pant column ---
    const rightPantsLeg = new THREE.Mesh(pantsLegGeo, clothingBottomMat);
    rightPantsLeg.position.set(0, 0, 0); // wraps outer leg perfectly
    rightPantsLeg.castShadow = true;
    rightPantsLeg.receiveShadow = true;
    baseRightLeg.add(rightPantsLeg); // Child of baseRightLeg!
    rightLegMeshRef.current = rightPantsLeg;

    // 12. Left Designer Sneaker (chunky dual-layered physical shoe)
    const leftShoe = new THREE.Mesh(shoeUpperGeo, clothingShoesMat);
    leftShoe.position.set(-0.11, -0.8, 0.05);
    leftShoe.castShadow = true;
    mannequinGroup.add(leftShoe);
    leftShoeMeshRef.current = leftShoe;

    // Outer sneaker Sole (rubber trim sits underneath)
    const leftSole = new THREE.Mesh(shoeSoleGeo, jointMaterial);
    leftSole.position.set(0, -0.06, 0);
    leftSole.receiveShadow = true;
    leftShoe.add(leftSole);

    // Bare skin foot showing inside shoe throat if unequipped (or fits inside snugly)
    const leftFootBase = new THREE.Mesh(baseFootGeo, skinMaterial);
    leftFootBase.position.set(0, 0, -0.015);
    leftShoe.add(leftFootBase);

    // 13. Right Designer Sneaker 
    const rightShoe = new THREE.Mesh(shoeUpperGeo, clothingShoesMat);
    rightShoe.position.set(0.12, -0.8, 0.05);
    rightShoe.castShadow = true;
    mannequinGroup.add(rightShoe);
    rightShoeMeshRef.current = rightShoe;

    const rightSole = new THREE.Mesh(shoeSoleGeo, jointMaterial);
    rightSole.position.set(0, -0.06, 0);
    rightSole.receiveShadow = true;
    rightShoe.add(rightSole);

    const rightFootBase = new THREE.Mesh(baseFootGeo, skinMaterial);
    rightFootBase.position.set(0, 0, -0.015);
    rightShoe.add(rightFootBase);

    // Set Initial scale values manually
    const h = scale.height;
    const w = scale.shoulderWidth;
    const b = scale.waistBuild;

    baseChest.scale.set(w, 1.0, (w + b) / 2);
    baseWaist.scale.set(b, 1.0, b);
    leftShoulder.position.x = -0.45 * w;
    leftShoulder.scale.set(w * 0.9, w * 0.9, w * 0.9);
    rightShoulder.position.x = 0.45 * w;
    rightShoulder.scale.set(w * 0.9, w * 0.9, w * 0.9);

    leftArm.position.x = -0.6 * w;
    leftArm.scale.set(0.9, h, 0.9);
    rightArm.position.x = 0.6 * w;
    rightArm.scale.set(0.9, h, 0.9);

    basePelvis.scale.set(b * 1.05, 1.0, b * 1.05);
    baseLeftLeg.scale.set(b * 0.95, h, b * 0.95);
    baseLeftLeg.position.y = -0.35 - (0.32 * h);
    baseRightLeg.scale.set(b * 0.95, h, b * 0.95);
    baseRightLeg.position.y = -0.35 - (0.32 * h);

    const shoeOffset = -0.35 - (0.64 * h);
    leftShoe.position.y = shoeOffset - 0.08;
    leftShoe.scale.set(1, 1, 1 + (h - 1) * 0.2);
    rightShoe.position.y = shoeOffset - 0.08;
    rightShoe.scale.set(1, 1, 1 + (h - 1) * 0.2);

    mannequinGroup.position.y = (0.5 * h) - 0.4;

    // INTERACTIVE ROTATION HANDLERS (Sleek drag & swipe rotation)
    let isDragging = false;
    let previousMouseX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      setIsRotating(false);
      previousMouseX = e.clientX;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !mannequinGroup) return;
      const deltaX = e.clientX - previousMouseX;
      mannequinGroup.rotation.y += deltaX * 0.012;
      previousMouseX = e.clientX;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        setIsRotating(false);
        previousMouseX = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !mannequinGroup || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMouseX;
      mannequinGroup.rotation.y += deltaX * 0.012;
      previousMouseX = e.touches[0].clientX;
    };

    // Attach local input events to client canvas directly
    const canvasEl = canvasRef.current;
    canvasEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvasEl.addEventListener('touchstart', onTouchStart, { passive: true });
    canvasEl.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onMouseUp);

    // RESIZE OBSERVER (Adaptive scaling, fulfilling responsive sizing guidelines)
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      const finalH = newHeight || 450;
      renderer.setSize(newWidth, finalH);
      camera.aspect = newWidth / finalH;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(containerRef.current);

    // RENDER LOOP
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Slow elegant rotation when not dragged
      if (!isDragging && mannequinGroup) {
        mannequinGroup.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };
    animate();

    // CLEANUP ON UNMOUNT
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (canvasEl) {
        canvasEl.removeEventListener('mousedown', onMouseDown);
        canvasEl.removeEventListener('touchstart', onTouchStart);
        canvasEl.removeEventListener('touchmove', onTouchMove);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);

      // Clean geometry/material assets
      headGeo.dispose();
      neckGeo.dispose();
      shoulderGeo.dispose();
      armGeo.dispose();
      baseChestGeo.dispose();
      baseWaistGeo.dispose();
      basePelvisGeo.dispose();
      baseLegGeo.dispose();
      baseFootGeo.dispose();
      shirtTorsoGeo.dispose();
      shirtCollarGeo.dispose();
      shirtWaistGeo.dispose();
      shirtSleeveGeo.dispose();
      pantsPelvisGeo.dispose();
      pantsLegGeo.dispose();
      shoeSoleGeo.dispose();
      shoeUpperGeo.dispose();
      skinMaterial.dispose();
      jointMaterial.dispose();
      clothingTopMat.dispose();
      clothingBottomMat.dispose();
      clothingShoesMat.dispose();

      if (topTextureRef.current) topTextureRef.current.dispose();
      if (bottomTextureRef.current) bottomTextureRef.current.dispose();
      if (shoesTextureRef.current) shoesTextureRef.current.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div
      id="3d-mannequin-container"
      ref={containerRef}
      className="relative w-full h-[460px] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing"
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Aesthetic Cyber Studio Margin Accents */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none select-none">
        <span className="text-[10px] font-mono tracking-widest text-[#6366f1] uppercase font-bold">Atelier Engine v1.0</span>
        <span className="text-xs font-sans text-slate-400 font-medium capitalize">
          {hasTop || hasBottom || hasShoes ? "Dressed Avatar Customizer" : "Minimal Base Mannequin"}
        </span>
      </div>

      <div className="absolute bottom-4 right-4 text-right pointer-events-none select-none font-mono text-[9px] text-slate-500 flex flex-col gap-1">
        <span>HEIGHT MOD: {(scale.height).toFixed(2)}x</span>
        <span>SHOULDER MOD: {(scale.shoulderWidth).toFixed(2)}x</span>
        <span>WAIST MOD: {(scale.waistBuild).toFixed(2)}x</span>
      </div>

      <div className="absolute bottom-4 left-4 pointer-events-none select-none text-[10px] font-mono text-slate-400 flex items-center gap-2 bg-slate-950/70 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-full">
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
        Drag model to orbit 360°
      </div>
    </div>
  );
}
