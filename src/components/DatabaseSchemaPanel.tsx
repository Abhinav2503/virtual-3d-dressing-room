import { useState } from 'react';
import { Database, Copy, Check, Terminal, ExternalLink, Key } from 'lucide-react';

export default function DatabaseSchemaPanel() {
  const [copied, setCopied] = useState(false);

  const sqlSchema = `-- =======================================================
-- Supabase PostgreSQL Schema for 3D Dressing Room MVP
-- Place this code in your Supabase SQL Editor to bootstrap!
-- =======================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Sub-entities from Supabase Auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    display_name TEXT
);

-- 3. Row Level Security for Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and update their own record" 
    ON public.users 
    FOR ALL 
    USING (auth.uid() = id);

-- 4. Wardrobe Items Table
CREATE TYPE public.clothing_category AS ENUM ('Top', 'Bottom', 'Shoes');

CREATE TABLE public.wardrobe_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    category public.clothing_category NOT NULL,
    dominant_colors TEXT[] NOT NULL, -- Holds array of Hex string values (e.g. ['#FF5733'])
    image_url TEXT, -- Client uploads to Supabase Storage and saves link here
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Row Level Security for Wardrobe
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own wardrobe items" 
    ON public.wardrobe_items 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 6. Calendar Lookbook Table
CREATE TABLE public.calendar_lookbook (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date_string DATE NOT NULL, -- Format: YYYY-MM-DD
    top_id UUID REFERENCES public.wardrobe_items(id) ON DELETE SET NULL,
    bottom_id UUID REFERENCES public.wardrobe_items(id) ON DELETE SET NULL,
    shoes_id UUID REFERENCES public.wardrobe_items(id) ON DELETE SET NULL,
    mannequin_height NUMERIC(3, 2) DEFAULT 1.0 NOT NULL, -- Scales height
    mannequin_shoulder NUMERIC(3, 2) DEFAULT 1.0 NOT NULL, -- Scales shoulders
    mannequin_waist NUMERIC(3, 2) DEFAULT 1.0 NOT NULL, -- Scales waist
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Maintain unique constraint so a user only has one outfit configuration registered per day
    UNIQUE (user_id, date_string)
);

-- 7. Row Level Security for Calendar Lookbook
ALTER TABLE public.calendar_lookbook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own lookup diary" 
    ON public.calendar_lookbook 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 8. Setup Row-Trigger to copy newly registered auth users into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'Fashionista'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between col-span-full">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-semibold text-slate-100">Supabase SQL Schema</h3>
            <p className="text-[10px] text-slate-400 font-mono">Row Level Security & PostgreSQL triggers for MVP production</p>
          </div>
        </div>
        
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 cursor-pointer active:scale-95 transition-all"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy SQL
            </>
          )}
        </button>
      </div>

      {/* SQL Code Display Area */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-850 px-4 py-2 bg-slate-920 select-none">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-500">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            postgres-bootstrap.sql
          </div>
          <span className="text-[9px] font-mono text-emerald-400">PL/pgSQL Trigger Active</span>
        </div>
        <pre className="p-4 overflow-x-auto text-[10px] text-slate-300 font-mono leading-relaxed h-[180px] scrollbar-thin">
          {sqlSchema}
        </pre>
      </div>

      {/* Connectivity quick guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850/80">
          <div className="flex items-center gap-1.5 text-xs font-sans text-slate-300 font-semibold mb-1">
            <Key className="h-4 w-4 text-indigo-400" />
            Configuring Supabase API Client
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
            Initialize the client on-device inside your React layout layer by passing your public secrets locally. This routes wardrobe items:
          </p>
          <code className="block bg-slate-950 border border-slate-850 p-2 rounded-lg text-[9px] font-mono text-indigo-300 mt-2">
            import &#123; createClient &#125; from '@supabase/supabase-js';<br/>
            export const supabase = createClient(URL, KEY);
          </code>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-sans text-slate-300 font-semibold mb-1">
              <ExternalLink className="h-4 w-4 text-indigo-400" />
              Production Hosting Benefits
            </div>
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
              Combine this PostgreSQL architecture with Supabase Storage folders (holding raw photo files) and Supabase's free auth tier for a fully featured 3D dressing room that maintains a <strong>$0 server overhead bill</strong>!
            </p>
          </div>
          <div className="text-[8px] font-mono text-slate-500 text-right mt-2 select-none uppercase">
            Designed for Serverless Scalability
          </div>
        </div>
      </div>
    </div>
  );
}
