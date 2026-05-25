import { useState } from 'react';
import { Calendar as CalendarIcon, Save, Sparkles, Footprints, Trash2, ArrowUpRight } from 'lucide-react';
import { CalendarEntry, MannequinScale, WardrobeItem } from '../types';

interface OutfitCalendarProps {
  calendarEntries: CalendarEntry[];
  onSaveOutfitToCalendar: (dateString: string) => void;
  onLoadOutfitFromCalendar: (entry: CalendarEntry) => void;
  onClearCalendarEntry: (dateString: string) => void;
  activeScale: MannequinScale;
  wardrobe: WardrobeItem[];
  selectedTopId?: string;
  selectedBottomId?: string;
  selectedShoesId?: string;
}

export default function OutfitCalendar({
  calendarEntries,
  onSaveOutfitToCalendar,
  onLoadOutfitFromCalendar,
  onClearCalendarEntry,
  activeScale,
  wardrobe,
  selectedTopId,
  selectedBottomId,
  selectedShoesId,
}: OutfitCalendarProps) {
  // Setup display target (Current month is May 2026)
  const [currentYear] = useState(2026);
  const [currentMonth] = useState(4); // 0-indexed, so 4 is May
  const [selectedDay, setSelectedDay] = useState<number>(25); // Target May 25, 2026 based on metadata

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = 31; // May has 31 days
  const startDayOfWeek = 5; // May 1, 2026 starts on a Friday (5 in 0-indexed Sunday=0)

  // Get active items to show in active panel preview
  const activeTop = wardrobe.find(i => i.id === selectedTopId);
  const activeBottom = wardrobe.find(i => i.id === selectedBottomId);
  const activeShoes = wardrobe.find(i => i.id === selectedShoesId);

  // Pad the start of calendar grid with empty cells
  const calendarCells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }

  // Get date helper formatted string
  const formatDateString = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  const getEntryForDay = (day: number) => {
    const dateStr = formatDateString(day);
    return calendarEntries.find(e => e.dateString === dateStr);
  };

  const activeDateString = formatDateString(selectedDay);
  const selectedDayEntry = calendarEntries.find(e => e.dateString === activeDateString);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-5">
      {/* Lookbook Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#6366f1]/10 p-1.5 rounded-lg text-[#6366f1]">
            <CalendarIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-semibold text-slate-100">Daily Lookbook Calendar</h3>
            <p className="text-[10px] text-slate-400 font-mono">Plan & archive your custom fits daily</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2.5 py-1 bg-slate-950 border border-slate-800 text-indigo-400 rounded-full">
          {monthNames[currentMonth]} {currentYear}
        </span>
      </div>

      {/* Grid calendar */}
      <div className="space-y-2">
        {/* Days of week */}
        <div className="grid grid-cols-7 text-center text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 py-1.5 bg-slate-950/40 rounded-lg">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 gap-1.5 select-none font-mono">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-[46px] rounded-xl opacity-0" />;
            }

            const isSelected = selectedDay === day;
            const entry = getEntryForDay(day);
            const dateStr = formatDateString(day);

            // Accumulate colors of the saved items in the calendar cell
            const savedTones: string[] = [];
            if (entry) {
              savedTones.push(...entry.outfit.colors);
            }

            return (
              <button
                type="button"
                key={`day-${day}`}
                onClick={() => setSelectedDay(day)}
                className={`relative h-[46px] rounded-xl border flex flex-col items-center justify-between py-1 px-1 transition-all group cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/20 border-[#6366f1] ring-1 ring-[#6366f1]/20'
                    : entry
                    ? 'bg-slate-950 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/70'
                    : 'bg-slate-950/40 border-transparent hover:border-slate-800 hover:bg-slate-950/60'
                }`}
              >
                {/* Day Numeric Indicator */}
                <span className={`text-[10px] font-bold ${
                  isSelected 
                    ? 'text-indigo-400 font-extrabold' 
                    : entry 
                    ? 'text-slate-200' 
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}>
                  {day}
                </span>

                {/* Micro dots of wardrobe outfit colors */}
                <div className="flex gap-0.5 justify-center">
                  {savedTones.length > 0 ? (
                    savedTones.map((color, i) => (
                      <span 
                        key={i} 
                        style={{ backgroundColor: color }} 
                        className="h-1.5 w-1.5 rounded-full border border-slate-950" 
                      />
                    ))
                  ) : (
                    // Subtle inactive spacing dot
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-800 opacity-20" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Pane for Selected Date & Action Triggers */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3.5">
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/60">
          <div className="text-xs font-sans text-slate-300 font-semibold uppercase tracking-wider">
            {monthNames[currentMonth]} {selectedDay}, {currentYear}
          </div>
          <span className="text-[9px] font-mono text-slate-500">
            {selectedDayEntry ? "Outfit Locked" : "No Fit Programmed"}
          </span>
        </div>

        {selectedDayEntry ? (
          /* Active Saved Fit Info Panel */
          <div className="space-y-3">
            <div className="text-[10px] font-mono text-slate-400 capitalize">
              Saved Outfitting Composition:
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center select-none">
              <div className="bg-slate-900 border border-slate-800/60 p-1.5 rounded-lg flex flex-col justify-between">
                <span className="text-[8px] font-mono text-indigo-400 uppercase font-bold">Top</span>
                <span className="text-[10px] text-slate-300 truncate font-semibold">
                  {wardrobe.find(i => i.id === selectedDayEntry.outfit.topId)?.label || "No shirt"}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800/60 p-1.5 rounded-lg flex flex-col justify-between">
                <span className="text-[8px] font-mono text-emerald-400 uppercase font-bold">Bottom</span>
                <span className="text-[10px] text-slate-300 truncate font-semibold">
                  {wardrobe.find(i => i.id === selectedDayEntry.outfit.bottomId)?.label || "No trousers"}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800/60 p-1.5 rounded-lg flex flex-col justify-between">
                <span className="text-[8px] font-mono text-amber-400 uppercase font-bold">Shoes</span>
                <span className="text-[10px] text-slate-300 truncate font-semibold">
                  {wardrobe.find(i => i.id === selectedDayEntry.outfit.shoesId)?.label || "No footwear"}
                </span>
              </div>
            </div>

            {/* Mannequin Dimensions scale info */}
            <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
              <Footprints className="h-3.5 w-3.5 text-slate-400" />
              Body Customization dimensions saved
            </div>

            {/* Buttons: Wear or Clear saved look */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onLoadOutfitFromCalendar(selectedDayEntry)}
                className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs py-2 rounded-lg font-bold transition-all active:scale-[0.98] cursor-pointer"
                title="Apply look values on avatar"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Wear This Look
              </button>

              <button
                onClick={() => onClearCalendarEntry(activeDateString)}
                className="flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-sans text-xs py-2 rounded-lg font-semibold transition-all cursor-pointer"
                title="Wipe look out"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Date
              </button>
            </div>
          </div>
        ) : (
          /* Empty Saved Info Option State */
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              No outfit programed for this date yet. Select wardrobe items, customize the 3D mannequin scales, and save this style formulation to this day.
            </p>

            {/* Active Workspace summary */}
            <div className="bg-slate-900/60 border border-slate-800/50 p-2.5 rounded-lg flex items-center justify-between text-xs font-sans">
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" /> Ready to Save Outfits:
              </span>
              <span className="text-slate-300 font-semibold font-mono text-[10px]">
                {activeTop ? "Top" : "•"} + {activeBottom ? "Bottom" : "•"} + {activeShoes ? "Shoes" : "•"}
              </span>
            </div>

            {/* Save current fit button */}
            <button
              onClick={() => onSaveOutfitToCalendar(activeDateString)}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 font-sans text-xs py-2 rounded-lg font-semibold transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5 text-indigo-400" />
              Save Current Fit to May {selectedDay}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
