import React, { useState, useRef, useEffect } from 'react';
import { Shirt, Trash2, Plus, RefreshCw, Layers, Check, Palette, UploadCloud } from 'lucide-react';
import { WardrobeItem, ClothingCategory } from '../types';

interface WardrobeManagerProps {
  wardrobe: WardrobeItem[];
  onAddWardrobeItem: (item: WardrobeItem) => void;
  onDeleteWardrobeItem: (id: string) => void;
  onSelectOutfitItem: (category: ClothingCategory, id: string) => void;
  selectedTopId?: string;
  selectedBottomId?: string;
  selectedShoesId?: string;
  onShuffleOutfit: () => void;
}

export default function WardrobeManager({
  wardrobe,
  onAddWardrobeItem,
  onDeleteWardrobeItem,
  onSelectOutfitItem,
  selectedTopId,
  selectedBottomId,
  selectedShoesId,
  onShuffleOutfit,
}: WardrobeManagerProps) {
  const [activeTab, setActiveTab] = useState<ClothingCategory | 'All'>('All');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('Top');
  const [manualColors, setManualColors] = useState<string[]>(['#4f46e5', '#312e81']);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [colorInput, setColorInput] = useState('#4f46e5');
  const [extractingColors, setExtractingColors] = useState(false);
  const [previewColors, setPreviewColors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImgUrl, setUploadedImgUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize color selection wheel with manual colors array
  const handleColorPickerChange = (color: string) => {
    setColorInput(color);
    const updated = [...manualColors];
    updated[selectedColorIndex] = color;
    setManualColors(updated);
  };

  const addColorSlot = () => {
    if (manualColors.length < 3) {
      setManualColors([...manualColors, '#64748b']);
      setSelectedColorIndex(manualColors.length);
    }
  };

  const removeColorSlot = (index: number) => {
    if (manualColors.length <= 1) return;
    const filtered = manualColors.filter((_, i) => i !== index);
    setManualColors(filtered);
    setSelectedColorIndex(0);
  };

  // 100% Client-Side Dominant Color Extraction from Canvas Pixels
  const extractDominantColors = (imageFile: File) => {
    setExtractingColors(true);
    const imgElement = new Image();
    imgElement.src = URL.createObjectURL(imageFile);

    imgElement.onload = () => {
      // Create a hidden tracking canvas. 
      // Resizing the image to a small scale averages colors and makes the analysis instant
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scanSize = 64; 
      canvas.width = scanSize;
      canvas.height = scanSize;

      if (ctx) {
        ctx.drawImage(imgElement, 0, 0, scanSize, scanSize);
        const { data } = ctx.getImageData(0, 0, scanSize, scanSize);

        // Map colors to buckets to minimize slight chromatic differences
        // Each bucket rounds R, G, B channels to the nearest multiple of 24
        const colorBins: { [hex: string]: number } = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const a = data[i+3];

          // Skip completely transparent or near-transparent pixels
          if (a < 50) continue;

          // Skip absolute white backdrops or extreme grey/black corners to yield clothing saturation
          const sum = r + g + b;
          const isWhiteBackdrop = r > 240 && g > 240 && b > 240;
          const isBlackShadow = r < 15 && g < 15 && b < 15;
          if (isWhiteBackdrop || isBlackShadow) continue;

          // Rounding factor to quantize colors
          const quantFactor = 24;
          const rq = Math.round(r / quantFactor) * quantFactor;
          const gq = Math.round(g / quantFactor) * quantFactor;
          const bq = Math.round(b / quantFactor) * quantFactor;

          // Reconvert bucket to CSS hex tag
          const hex = `#${((1 << 24) + (rq << 16) + (gq << 8) + bq).toString(16).slice(1)}`;
          colorBins[hex] = (colorBins[hex] || 0) + 1;
        }

        // Sort bins by descending frequency
        const sortedBins = Object.entries(colorBins)
          .sort((a, b) => b[1] - a[1])
          .map(([hex]) => hex);

        // Fetch top 2 or 3 colors. If empty, fall back to default palette
        const leadingColors = sortedBins.slice(0, 3);
        if (leadingColors.length === 0) {
          setPreviewColors(['#cbd5e1', '#64748b']);
        } else {
          setPreviewColors(leadingColors);
        }
      }
      setExtractingColors(false);
      URL.revokeObjectURL(imgElement.src);
    };

    imgElement.onerror = () => {
      setExtractingColors(false);
      console.error("Failed to load uploaded image for scanning.");
    };
  };

  // Handle local file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      extractDominantColors(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImgUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      extractDominantColors(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImgUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save item into closet state
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const finalItemName = itemName.trim() || `My Custom ${category}`;
    const colorsToSave = previewColors.length > 0 ? previewColors : manualColors;

    const newItem: WardrobeItem = {
      id: `item-${Date.now()}`,
      label: finalItemName,
      category,
      dominantColors: colorsToSave,
      source: previewColors.length > 0 ? 'upload' : 'manual',
      imageUrl: uploadedImgUrl,
    };

    onAddWardrobeItem(newItem);

    // Reset input fields
    setItemName('');
    setPreviewColors([]);
    setUploadedImgUrl(undefined);
    setManualColors(['#4f46e5', '#312e81']);
    setSelectedColorIndex(0);
    setColorInput('#4f46e5');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter items in the inventory
  const filteredWardrobe = wardrobe.filter((item) => {
    if (activeTab === 'All') return true;
    return item.category === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* 1. Add Wardrobe Item Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-sans font-semibold text-slate-100 flex items-center gap-2 mb-4">
          <span className="bg-[#6366f1]/10 p-1.5 rounded-lg text-[#6366f1]">
            <Plus className="h-4 w-4" />
          </span>
          Add Item to Closet
        </h3>

        <form onSubmit={handleSaveItem} className="space-y-4">
          {/* Label Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Clothing Name</label>
            <input
              type="text"
              placeholder="e.g., Casual Coral Shirt"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Top', 'Bottom', 'Shoes'] as ClothingCategory[]).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-600/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Shirt className={`h-3 w-3 ${cat === 'Shoes' ? 'rotate-90' : ''}`} />
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Upload and Extract Segment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual Drop Area */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Upload & Extract</span>
                <span className="text-[9px] text-[#6366f1] lowercase">canvas analysis</span>
              </label>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <UploadCloud className="h-6 w-6 text-slate-500 mb-1" />
                <span className="text-[11px] font-sans text-slate-300 font-medium">
                  {extractingColors ? "Scanning Pixels..." : "Click or Drag Image"}
                </span>
                <span className="text-[9px] font-mono text-slate-500 mt-0.5 leading-relaxed">
                  Extracts 3 dominant colors
                </span>

                {/* Local preview indicator */}
                {previewColors.length > 0 && (
                  <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex flex-col items-center justify-center p-2">
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mb-1.5 font-semibold">
                      <Check className="h-3 w-3" /> Extracted Successfully
                    </span>
                    <div className="flex gap-2.5">
                      {previewColors.map((color, i) => (
                        <div 
                          key={i} 
                          title={color}
                          style={{ backgroundColor: color }} 
                          className="h-6 w-6 rounded-full border border-slate-700 shadow-md transform hover:scale-110 transition-transform" 
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewColors([]);
                        setUploadedImgUrl(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[9px] font-mono text-slate-400 hover:text-slate-200 mt-2 hover:underline"
                    >
                      Clear Upload
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Color Fallback Picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Manual Color Picker</span>
                <span className="text-[9px] text-slate-500 lowercase">picker fallback</span>
              </label>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex h-28 gap-3 items-center justify-center">
                {/* Active Slots Selection */}
                <div className="flex flex-col gap-1.5 items-center justify-center">
                  <div className="flex gap-1">
                    {manualColors.map((col, idx) => (
                      <div key={idx} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedColorIndex(idx);
                            setColorInput(col);
                            setPreviewColors([]); // Clear upload if editing manually
                          }}
                          style={{ backgroundColor: col }}
                          className={`h-7 w-7 rounded-lg border-2 shadow-sm transition-all flex items-center justify-center ${
                            selectedColorIndex === idx 
                              ? 'border-indigo-500 scale-110 ring-2 ring-indigo-500/20' 
                              : 'border-slate-800 hover:scale-105'
                          }`}
                        >
                          {selectedColorIndex === idx && <Check className="h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />}
                        </button>
                        {manualColors.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeColorSlot(idx);
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 rounded-full h-3.5 w-3.5 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {manualColors.length < 3 && (
                    <button
                      type="button"
                      onClick={addColorSlot}
                      className="text-[9px] font-mono text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded bg-indigo-500/5 mt-1"
                    >
                      + Add Variant Color
                    </button>
                  )}
                </div>

                {/* Color Spectrum native wheel */}
                <div className="flex flex-col items-center justify-center bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                  <input
                    type="color"
                    value={colorInput}
                    onChange={(e) => handleColorPickerChange(e.target.value)}
                    className="h-9 w-9 rounded-md border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase select-none">{colorInput}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] cursor-pointer"
          >
            Save Design to Digital Closet
          </button>
        </form>
      </div>

      {/* 2. Wardrobe Inventory / Outfit Loader */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
        {/* Inventory Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#6366f1]/10 p-1.5 rounded-lg text-[#6366f1]">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-sans font-semibold text-slate-100">Wardrobe Collection</h3>
              <p className="text-[10px] text-slate-400 font-mono">Custom color blocks layered on 3D avatar</p>
            </div>
          </div>

          {/* Shuffle Button */}
          <button
            onClick={onShuffleOutfit}
            id="shuffle-outfit-btn"
            className="flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold hover:scale-105 active:scale-[0.98] transition-all cursor-pointer"
            title="Randomize Outfit"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Shuffle Outfit
          </button>
        </div>

        {/* Category filtering Tab buttons */}
        <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl">
          {(['All', 'Top', 'Bottom', 'Shoes'] as string[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-slate-800 text-slate-100 font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Clothing Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[310px] overflow-y-auto pr-1 select-none scrollbar-thin">
          {filteredWardrobe.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-45">
              <Shirt className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400 font-sans">No items matched this category</p>
              <p className="text-[9px] font-mono text-slate-500 max-w-[180px] mt-1 leading-normal">
                Try custom adding an item using the form above!
              </p>
            </div>
          ) : (
            filteredWardrobe.map((item) => {
              const isSelected = 
                (item.category === 'Top' && selectedTopId === item.id) ||
                (item.category === 'Bottom' && selectedBottomId === item.id) ||
                (item.category === 'Shoes' && selectedShoesId === item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectOutfitItem(item.category, item.id)}
                  className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-[92px] group/item ${
                    isSelected
                      ? 'bg-indigo-950/20 border-[#6366f1] ring-1 ring-[#6366f1]/20'
                      : 'bg-slate-950 border-slate-800/85 hover:border-slate-700 hover:bg-slate-950/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                        item.category === 'Top' 
                          ? 'bg-indigo-500/10 text-indigo-400' 
                          : item.category === 'Bottom' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {item.category}
                      </span>
                      <h4 className="text-xs font-sans font-semibold text-slate-200 mt-1.5 leading-tight group-hover/item:text-slate-100 line-clamp-1">
                        {item.label}
                      </h4>
                    </div>

                    {/* Checkmark or garbage trigger */}
                    <div className="flex gap-1 shadow-sm">
                      {isSelected && (
                        <div className="bg-[#6366f1] text-white p-1 rounded-md">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      
                      {item.source !== 'preset' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWardrobeItem(item.id);
                          }}
                          className="bg-slate-920 border border-slate-800 text-rose-400 hover:text-white hover:bg-rose-600 p-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 cursor-pointer"
                          title="Delete design"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Extract Color Swatches Overlay footer */}
                  <div className="flex items-center justify-between border-t border-slate-800/50 pt-1.5 mt-1.5">
                    <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1 group-hover/item:text-slate-400 tracking-wider">
                      <Palette className="h-3 w-3 text-indigo-400" />
                      {item.dominantColors.length} TONES
                    </span>
                    <div className="flex gap-1.5">
                      {item.dominantColors.map((hex, i) => (
                        <div
                          key={i}
                          style={{ backgroundColor: hex }}
                          title={hex}
                          className="h-3.5 w-3.5 rounded-full border border-slate-800/80 ring-1 ring-white/10"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
