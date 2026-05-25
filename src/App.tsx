import { useState, useEffect } from 'react';
import { Sliders, Shirt, Sparkles, RefreshCw } from 'lucide-react';
import MannequinCanvas from './components/MannequinCanvas';
import PrivacyMaskTracker from './components/PrivacyMaskTracker';
import WardrobeManager from './components/WardrobeManager';
import OutfitCalendar from './components/OutfitCalendar';
import DatabaseSchemaPanel from './components/DatabaseSchemaPanel';
import { WardrobeItem, MannequinScale, CalendarEntry, ClothingCategory } from './types';

// Preset high-fidelity digital clothing designs
const INITIAL_PRESET_WARDROBE: WardrobeItem[] = [
  {
    id: 'preset-top-1',
    label: 'Sunset Coral Crewneck',
    category: 'Top',
    dominantColors: ['#f43f5e', '#fb7185', '#ffe4e6'],
    source: 'preset'
  },
  {
    id: 'preset-top-2',
    label: 'Cyberpunk Purple Jersey',
    category: 'Top',
    dominantColors: ['#6366f1', '#4f46e5', '#312e81'],
    source: 'preset'
  },
  {
    id: 'preset-top-3',
    label: 'Forest Green Fleece',
    category: 'Top',
    dominantColors: ['#065f46', '#059669', '#a7f3d0'],
    source: 'preset'
  },
  {
    id: 'preset-bottom-1',
    label: 'Midnight Indigo Jeans',
    category: 'Bottom',
    dominantColors: ['#1e1b4b', '#312e81', '#4338ca'],
    source: 'preset'
  },
  {
    id: 'preset-bottom-2',
    label: 'Suture Sand Chino Joggers',
    category: 'Bottom',
    dominantColors: ['#ccac8b', '#e8d2bd'],
    source: 'preset'
  },
  {
    id: 'preset-bottom-3',
    label: 'Aero Grey Cargo Slacks',
    category: 'Bottom',
    dominantColors: ['#475569', '#64748b', '#94a3b8'],
    source: 'preset'
  },
  {
    id: 'preset-shoes-1',
    label: 'Tech Obsidian Runners',
    category: 'Shoes',
    dominantColors: ['#090d16', '#1e293b'],
    source: 'preset'
  },
  {
    id: 'preset-shoes-2',
    label: 'Off-White Retro Trainers',
    category: 'Shoes',
    dominantColors: ['#f8fafc', '#e2e8f0', '#cbd5e1'],
    source: 'preset'
  }
];

export default function App() {
  // Mannequin sliders model scaling
  const [scale, setScale] = useState<MannequinScale>({
    height: 1.15, // standard sleek mannequin
    shoulderWidth: 1.1,
    waistBuild: 0.95
  });

  // Digital Closet wardrobe items
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);

  // Selection states
  const [selectedTopId, setSelectedTopId] = useState<string | undefined>('preset-top-2');
  const [selectedBottomId, setSelectedBottomId] = useState<string | undefined>('preset-bottom-1');
  const [selectedShoesId, setSelectedShoesId] = useState<string | undefined>('preset-shoes-1');

  // Daily outfits calendar lookbook entries
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  
  // Confetti / Alert indicator for outfits shuffling
  const [shuffledIndicatorState, setShuffledIndicatorState] = useState(false);

  // Initialize data stores from client localStorage to verify $0 server costs persistence
  useEffect(() => {
    const localCloset = localStorage.getItem('dressing_room_closet');
    const localCalendar = localStorage.getItem('dressing_room_calendar');

    if (localCloset) {
      setWardrobe(JSON.parse(localCloset));
    } else {
      setWardrobe(INITIAL_PRESET_WARDROBE);
      localStorage.setItem('dressing_room_closet', JSON.stringify(INITIAL_PRESET_WARDROBE));
    }

    if (localCalendar) {
      setCalendarEntries(JSON.parse(localCalendar));
    } else {
      // Add a couple of initial saved calendar matches for display on May 25, 2026
      const demoCalendarEntries: CalendarEntry[] = [
        {
          dateString: '2026-05-24', // yesterday
          outfit: {
            mannequinScale: { height: 1.15, shoulderWidth: 1.1, waistBuild: 0.95 },
            topId: 'preset-top-1',
            bottomId: 'preset-bottom-2',
            shoesId: 'preset-shoes-1',
            colors: ['#f43f5e', '#ccac8b', '#090d16']
          }
        },
        {
          dateString: '2026-05-25', // today
          outfit: {
            mannequinScale: { height: 1.15, shoulderWidth: 1.1, waistBuild: 0.95 },
            topId: 'preset-top-2',
            bottomId: 'preset-bottom-1',
            shoesId: 'preset-shoes-1',
            colors: ['#6366f1', '#1e1b4b', '#090d16']
          }
        }
      ];
      setCalendarEntries(demoCalendarEntries);
      localStorage.setItem('dressing_room_calendar', JSON.stringify(demoCalendarEntries));
    }
  }, []);

  // Update wardrobe in localstorage whenever mutated
  const handleAddWardrobeItem = (item: WardrobeItem) => {
    const updated = [item, ...wardrobe];
    setWardrobe(updated);
    localStorage.setItem('dressing_room_closet', JSON.stringify(updated));

    // Automatically equip the newly designed custom element standard
    if (item.category === 'Top') setSelectedTopId(item.id);
    if (item.category === 'Bottom') setSelectedBottomId(item.id);
    if (item.category === 'Shoes') setSelectedShoesId(item.id);
  };

  const handleDeleteWardrobeItem = (id: string) => {
    const filtered = wardrobe.filter((i) => i.id !== id);
    setWardrobe(filtered);
    localStorage.setItem('dressing_room_closet', JSON.stringify(filtered));

    // Deselect if active
    if (selectedTopId === id) setSelectedTopId(undefined);
    if (selectedBottomId === id) setSelectedBottomId(undefined);
    if (selectedShoesId === id) setSelectedShoesId(undefined);
  };

  const handleSelectOutfitItem = (category: ClothingCategory, id: string) => {
    if (category === 'Top') {
      setSelectedTopId(selectedTopId === id ? undefined : id);
    } else if (category === 'Bottom') {
      setSelectedBottomId(selectedBottomId === id ? undefined : id);
    } else if (category === 'Shoes') {
      setSelectedShoesId(selectedShoesId === id ? undefined : id);
    }
  };

  // Modern "Shuffle Outfit" generator: Select random valid items and blend colors on mannequin
  const handleShuffleOutfit = () => {
    const tops = wardrobe.filter(i => i.category === 'Top');
    const bottoms = wardrobe.filter(i => i.category === 'Bottom');
    const shoes = wardrobe.filter(i => i.category === 'Shoes');

    if (tops.length > 0) {
      const randTop = tops[Math.floor(Math.random() * tops.length)];
      setSelectedTopId(randTop.id);
    }
    if (bottoms.length > 0) {
      const randBottom = bottoms[Math.floor(Math.random() * bottoms.length)];
      setSelectedBottomId(randBottom.id);
    }
    if (shoes.length > 0) {
      const randShoe = shoes[Math.floor(Math.random() * shoes.length)];
      setSelectedShoesId(randShoe.id);
    }

    // Give visual validation feedback triggering animation
    setShuffledIndicatorState(true);
    setTimeout(() => setShuffledIndicatorState(false), 800);
  };

  // Save outfit details to targeted calendar day
  const handleSaveOutfitToCalendar = (dateString: string) => {
    const primaryActiveColors: string[] = [];
    const activeTopItem = wardrobe.find(i => i.id === selectedTopId);
    if (activeTopItem && activeTopItem.dominantColors.length > 0) {
      primaryActiveColors.push(activeTopItem.dominantColors[0]);
    }
    const activeBottomItem = wardrobe.find(i => i.id === selectedBottomId);
    if (activeBottomItem && activeBottomItem.dominantColors.length > 0) {
      primaryActiveColors.push(activeBottomItem.dominantColors[0]);
    }
    const activeShoeItem = wardrobe.find(i => i.id === selectedShoesId);
    if (activeShoeItem && activeShoeItem.dominantColors.length > 0) {
      primaryActiveColors.push(activeShoeItem.dominantColors[0]);
    }

    const newCalendarEntry: CalendarEntry = {
      dateString,
      outfit: {
        mannequinScale: { ...scale },
        topId: selectedTopId,
        bottomId: selectedBottomId,
        shoesId: selectedShoesId,
        colors: primaryActiveColors.slice(0, 3)
      }
    };

    // Remove any previous record at dateString to allow secure editing/overwrite
    const filtered = calendarEntries.filter(e => e.dateString !== dateString);
    const updatedEntries = [...filtered, newCalendarEntry];
    setCalendarEntries(updatedEntries);
    localStorage.setItem('dressing_room_calendar', JSON.stringify(updatedEntries));
  };

  // Wear Look: Apply historical setup back to live mannequins scale + components
  const handleLoadOutfitFromCalendar = (entry: CalendarEntry) => {
    setScale(entry.outfit.mannequinScale);
    setSelectedTopId(entry.outfit.topId);
    setSelectedBottomId(entry.outfit.bottomId);
    setSelectedShoesId(entry.outfit.shoesId);
  };

  const handleClearCalendarEntry = (dateString: string) => {
    const filtered = calendarEntries.filter(e => e.dateString !== dateString);
    setCalendarEntries(filtered);
    localStorage.setItem('dressing_room_calendar', JSON.stringify(filtered));
  };

  // Extract currently selected outfit dominant colors vectors to feed into ThreeJS materials
  const activeTopItem = wardrobe.find((i) => i.id === selectedTopId);
  const activeBottomItem = wardrobe.find((i) => i.id === selectedBottomId);
  const activeShoesItem = wardrobe.find((i) => i.id === selectedShoesId);

  const topColors = activeTopItem ? activeTopItem.dominantColors : [];
  const bottomColors = activeBottomItem ? activeBottomItem.dominantColors : [];
  const shoesColors = activeShoesItem ? activeShoesItem.dominantColors : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Visual Workspace Accent */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>

      {/* Primary Container Layout */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8 flex-grow">
        
        {/* Header Header Brand, detailing system variables */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                MVP STUDIO RUNTIME
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-400 font-mono">May 2026 Sandbox OK</span>
            </div>
            
            <h1 className="text-2xl font-sans font-bold tracking-tight text-white md:text-3xl">
              Cyber-Atelier <span className="font-light text-slate-400">3D Dressing Room</span>
            </h1>
            
            <p className="text-xs text-slate-400 font-sans mt-1 max-w-2xl leading-relaxed">
              An interactive 3D digital closet featuring human-scale customization, local image-color extraction, and WebRTC biometric face masking. Designed for a <span className="text-indigo-400 font-mono font-semibold">$0 server-bill overhead</span>, processing 100% locally in-browser.
            </p>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-3.5 divide-x divide-slate-800/80 items-center justify-center gap-4">
            <div className="pr-4 text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase block select-none">Closet Inventory</span>
              <span className="text-lg font-sans font-extrabold text-indigo-400">{wardrobe.length} items</span>
            </div>
            <div className="pl-4 text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase block select-none">Calendar Fits</span>
              <span className="text-lg font-sans font-extrabold text-emerald-400">{calendarEntries.length} designs</span>
            </div>
          </div>
        </header>

        {/* Dashboard Panels Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT-SIDEBAR STAGE (12 columns on mobile, 5 on desktop): Mannequin Customizer Canvas */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 3D WebGL Mannequin Visualizer stage */}
            <div className="space-y-4">
              <MannequinCanvas
                scale={scale}
                topColors={topColors}
                bottomColors={bottomColors}
                shoesColors={shoesColors}
                hasTop={!!selectedTopId}
                hasBottom={!!selectedBottomId}
                hasShoes={!!selectedShoesId}
                activeTopItem={activeTopItem}
                activeBottomItem={activeBottomItem}
                activeShoesItem={activeShoesItem}
              />

              {/* Physical mannequin customizer sliders */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#6366f1]/10 p-1.5 rounded-lg text-[#6366f1]">
                      <Sliders className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="text-sm font-sans font-semibold text-slate-100">Mannequin Dimensions</h3>
                  </div>
                  
                  {/* Reset Scales Trigger */}
                  <button
                    onClick={() => setScale({ height: 1.15, shoulderWidth: 1.1, waistBuild: 0.95 })}
                    className="text-[9px] font-mono px-2 py-1 bg-slate-950 hover:bg-slate-850 hover:text-slate-200 border border-slate-800 rounded-lg text-slate-400 transition-all cursor-pointer"
                  >
                    Reset Models
                  </button>
                </div>

                {/* SLIDER 1: Height */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-sans font-medium flex items-center gap-1.5">
                      1. Height Modifier
                    </span>
                    <span className="text-[11px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                      {scale.height.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={scale.height}
                    onChange={(e) => setScale({ ...scale, height: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Petite (0.8x)</span>
                    <span>Standard</span>
                    <span>Athletic (1.5x)</span>
                  </div>
                </div>

                {/* SLIDER 2: Shoulder Width */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-sans font-medium flex items-center gap-1.5">
                      2. Shoulder Width
                    </span>
                    <span className="text-[11px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                      {scale.shoulderWidth.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.5"
                    step="0.05"
                    value={scale.shoulderWidth}
                    onChange={(e) => setScale({ ...scale, shoulderWidth: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Slim (0.7x)</span>
                    <span>Neutral</span>
                    <span>Broad (1.5x)</span>
                  </div>
                </div>

                {/* SLIDER 3: Waist Build */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-sans font-medium flex items-center gap-1.5">
                      3. Waist Build
                    </span>
                    <span className="text-[11px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                      {scale.waistBuild.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.05"
                    value={scale.waistBuild}
                    onChange={(e) => setScale({ ...scale, waistBuild: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Slender (0.6x)</span>
                    <span>Aesthetic</span>
                    <span>Stout (1.5x)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Face Shield webcam Widget */}
            <PrivacyMaskTracker />
          </div>

          {/* RIGHT PANELS WORKSPACE (12 columns on mobile, 7 on desktop): Digital Closet, Shuffling, Lookbook Entries */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Visual Shuffle Alert overlay feedback notification */}
            {shuffledIndicatorState && (
              <div className="bg-indigo-600/25 border border-indigo-500 text-slate-200 p-3 rounded-xl flex items-center gap-2 animate-bounce shadow-lg text-xs leading-none font-sans font-medium h-fit">
                <Sparkles className="h-4 w-4 text-indigo-400 animate-spin" />
                <span className="font-bold">Algorithmic Shuffle Engine:</span> Blended random preset color-swatches onto your mannequin!
              </div>
            )}

            {/* Closet Manager containing Dominant pixels algorithm details */}
            <WardrobeManager
              wardrobe={wardrobe}
              onAddWardrobeItem={handleAddWardrobeItem}
              onDeleteWardrobeItem={handleDeleteWardrobeItem}
              onSelectOutfitItem={handleSelectOutfitItem}
              selectedTopId={selectedTopId}
              selectedBottomId={selectedBottomId}
              selectedShoesId={selectedShoesId}
              onShuffleOutfit={handleShuffleOutfit}
            />

            {/* Month Calendar Lookbook diary */}
            <OutfitCalendar
              calendarEntries={calendarEntries}
              onSaveOutfitToCalendar={handleSaveOutfitToCalendar}
              onLoadOutfitFromCalendar={handleLoadOutfitFromCalendar}
              onClearCalendarEntry={handleClearCalendarEntry}
              activeScale={scale}
              wardrobe={wardrobe}
              selectedTopId={selectedTopId}
              selectedBottomId={selectedBottomId}
              selectedShoesId={selectedShoesId}
            />
          </div>
        </div>

        {/* Supabase PostgreSQL Schema detail Drawer Footer */}
        <section id="database-schema-guide-panel" className="pt-4 border-t border-slate-800">
          <DatabaseSchemaPanel />
        </section>
      </main>

      {/* Humble Footer brand credits */}
      <footer className="border-t border-slate-900 bg-slate-950/80 backdrop-blur-md py-6 text-center text-[10px] font-mono text-slate-500 select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <span>CODENAME: CYBER-ATELIER MVP • LOCAL STORAGE DATA CACHING STAGE ACTIVE</span>
          <span>© 2026 DIGITAL DESIGN ATELIER • ALL SYSTEM INTEGRATIONS SECURE</span>
        </div>
      </footer>
    </div>
  );
}
