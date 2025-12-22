import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Dumbbell, 
  X,
  TrendingUp,
  User,
  Skull, 
  ArrowLeft,
  History,
  Camera,
  AlertTriangle,
  Info,
  ChevronRight as ChevronRightIcon,
  Timer
} from 'lucide-react';

// Firebase Imports
import { initializeApp, type FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot,
  type Firestore,
  type DocumentData
} from "firebase/firestore";

// --- INTERFACES ---
interface Exercise {
  id: number;
  zone: string;
  name: string;
  sets?: string;
  reps?: string;
  weight?: number;
  minutes?: string;
}

interface ProfileData {
  gender: string;
  height: string;
  weight: string;
  neck: string;
  waist: string;
  hip: string;
  chest: string;
  arms: string;
  thigh: string;
  calculatedFat?: string | null;
}

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBkRJP-gMGlQOeq-5DOZcYvE0vOCMaJH48",
  authDomain: "physical-tracker-100.firebaseapp.com",
  projectId: "physical-tracker-100",
  storageBucket: "physical-tracker-100.firebasestorage.app",
  messagingSenderId: "139291216970",
  appId: "1:139291216970:web:0a17a7caeaa4578be4aab3"
};


const isConfigValid = firebaseConfig.apiKey !== "TU_API_KEY";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isConfigValid) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const cleanTitleStyle: React.CSSProperties = {
  color: 'white',
  fontWeight: 900,
};

// --- UTILIDADES ---
const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const BODY_ZONES: Record<string, string[]> = {
  "Pecho": ["Press Banca", "Press Inclinado", "Aperturas", "Flexiones", "Cruce de Poleas"],
  "Espalda": ["Dominadas", "Remo con Barra", "Jalón al Pecho", "Remo Gironda", "Peso Muerto"],
  "Piernas": ["Sentadilla", "Prensa", "Extensiones de Cuádriceps", "Curl Femoral", "Gemelos"],
  "Brazos": ["Curl con Barra", "Curl Martillo", "Extensiones de Tríceps", "Press Francés"],
  "Antebrazos": ["Curl de Muñeca", "Curl Inverso", "Paseo del Granjero"],
  "Abdomen": ["Crunch", "Plancha", "Elevación de Piernas", "Rueda Abdominal"],
  "Full Body": ["Burpees", "Thrusters", "Clean & Press", "Zancadas", "Salto al Cajón"],
  "Cardio": ["Cinta de Correr", "Bicicleta", "Elíptica", "Remo", "Cuerda", "Natación"]
};

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
const formatDateKey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        const scale = MAX / img.width;
        canvas.width = MAX;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        }
      };
    };
  });
};

// --- COMPONENTES UI ---

const Header: React.FC<{ title: string; subtitle?: string; onBack?: () => void }> = ({ title, subtitle, onBack }) => (
  <header className="bg-slate-900/90 backdrop-blur-md border-b border-white/5 p-6 sticky top-0 z-40 w-full shadow-lg">
    <div className="flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="bg-slate-800 p-2.5 rounded-xl text-orange-500 active:scale-90 transition-all border border-white/5 shadow-inner">
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="flex-1 overflow-hidden text-center">
        <h1 className="text-xl font-black uppercase italic" style={cleanTitleStyle}>{title}</h1>
        {subtitle && <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">{subtitle}</p>}
      </div>
      {onBack && <div className="w-10" />}
    </div>
  </header>
);

const ViewContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 w-full bg-slate-950 flex flex-col items-stretch overflow-x-hidden animate-in fade-in duration-300 min-h-screen">
    {children}
  </div>
);

// --- VISTAS ---

const HomeView: React.FC<{ onNavigate: (v: string) => void }> = ({ onNavigate }) => (
  <ViewContainer>
    <div className="flex-1 flex flex-col p-8 space-y-10 justify-center items-center">
      <div className="text-center">
        <div className="relative inline-block mb-6">
          <div className="relative bg-slate-900 p-1 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-24 h-24 flex items-center justify-center">
             <img src="/icon.png" alt="Logo" className="w-full h-full object-cover rounded-xl" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=PT100'; }} />
          </div>
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none max-w-[300px] mx-auto text-center text-white">
          Physical Tracker 100
        </h1>
      </div>
      <div className="grid grid-cols-1 w-full gap-4 max-w-sm">
        {[
          { id: 'profile', label: 'Biometría', icon: User, color: 'from-orange-500/80 to-orange-600/80', desc: 'Composición Corporal' },
          { id: 'workout', label: 'Entrenamiento', icon: Dumbbell, color: 'from-orange-600/80 to-red-700/80', desc: 'Registro de Sesión' },
          { id: 'failure', label: 'Modo Fallo', icon: Skull, color: 'from-slate-700 to-slate-900', desc: 'Personal Records' },
          { id: 'charts', label: 'Análisis', icon: TrendingUp, color: 'from-orange-400 to-orange-600', desc: 'Carga Progresiva' },
          { id: 'history', label: 'Historial', icon: History, color: 'from-slate-800 to-black', desc: 'Galería Mensual' },
        ].map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} className="bg-slate-900/40 hover:bg-slate-900/60 p-5 rounded-3xl flex items-center gap-5 border border-white/5 active:scale-[0.98] transition-all text-left group shadow-lg">
            <div className={`bg-gradient-to-br ${item.color} p-3.5 rounded-2xl text-white shadow-md group-hover:scale-105 transition-transform`}><item.icon size={24}/></div>
            <div className="flex-1">
              <span className="block font-black text-white text-lg tracking-tight uppercase italic">{item.label}</span>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1 opacity-70">{item.desc}</span>
            </div>
            <ChevronRightIcon className="text-slate-700 group-hover:text-orange-500 transition-colors" size={20} />
          </button>
        ))}
      </div>
    </div>
  </ViewContainer>
);

const ProfileView: React.FC<{ user: FirebaseUser; onBack: () => void }> = ({ user, onBack }) => {
  const [p, setP] = useState<ProfileData>({ gender: 'male', height: '', weight: '', neck: '', waist: '', hip: '', chest: '', arms: '', thigh: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && db) { getDoc(doc(db, 'profile', user.uid)).then(s => s.exists() && setP(s.data() as ProfileData)); }
  }, [user]);

  const fat = useMemo(() => {
    const { gender, height, neck, waist, hip } = p;
    const h = parseFloat(height), n = parseFloat(neck), w = parseFloat(waist), hi = parseFloat(hip);
    if (!h || !n || !w) return null;
    if (gender === 'male') return (495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.1554 * Math.log10(h)) - 450).toFixed(1);
    return hi ? (495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.22100 * Math.log10(h)) - 450).toFixed(1) : null;
  }, [p]);

  const Field: React.FC<{ label: string; field: keyof ProfileData; unit: string }> = ({ label, field, unit }) => (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 shadow-inner">
      <label className="text-[9px] text-slate-500 uppercase font-black mb-1 block tracking-widest">{label}</label>
      <div className="flex items-baseline gap-2">
        <input type="number" value={p[field] || ''} onChange={e => setP({...p, [field]: e.target.value})} className="bg-transparent text-white font-black text-2xl w-full outline-none" placeholder="0" />
        <span className="text-[10px] text-orange-500 font-black uppercase">{unit}</span>
      </div>
    </div>
  );

  return (
    <ViewContainer>
      <Header title="Biometría" subtitle="Composición Corporal" onBack={onBack} />
      <main className="p-6 space-y-5 w-full max-w-xl mx-auto pb-10">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => setP({...p, gender: g})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${p.gender === g ? 'bg-orange-600 text-white shadow-md' : 'text-slate-600'}`}>{g === 'male' ? 'Hombre' : 'Mujer'}</button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-800/10 border border-orange-500/20 p-8 rounded-[2.5rem] flex justify-between items-center shadow-xl">
          <div><div className="text-orange-500 font-black text-[10px] uppercase tracking-widest">Grasa Corporal</div><p className="text-[8px] text-slate-500 uppercase font-bold mt-1">Cálculo Marino</p></div>
          <div className="text-5xl font-black italic text-white">{fat || '--'}<span className="text-lg ml-1 opacity-50">%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3"><Field label="Altura" field="height" unit="cm" /><Field label="Peso" field="weight" unit="kg" /></div>
        <div className="grid grid-cols-3 gap-3"><Field label="Cuello" field="neck" unit="cm" /><Field label="Abdomen" field="waist" unit="cm" /><Field label="Cadera" field="hip" unit="cm" /></div>
        <div className="grid grid-cols-3 gap-3"><Field label="Pecho" field="chest" unit="cm" /><Field label="Brazos" field="arms" unit="cm" /><Field label="Muslo" field="thigh" unit="cm" /></div>
        <button onClick={async () => { setSaving(true); await setDoc(doc(db, 'profile', user.uid), { ...p, calculatedFat: fat }); setSaving(false); }} disabled={saving} className="w-full bg-orange-600 py-6 rounded-3xl font-black text-white shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest text-xs italic mt-4">{saving ? 'Guardando...' : 'Sincronizar Datos'}</button>
      </main>
    </ViewContainer>
  );
};

const WorkoutView: React.FC<{ user: FirebaseUser; workouts: Record<string, Exercise[]>; onBack: () => void }> = ({ user, workouts, onBack }) => {
  const [date, setDate] = useState(new Date());
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ zone: '', name: '', sets: '', reps: '', weight: '', minutes: '' });
  const [open, setOpen] = useState(false);

  const y = date.getFullYear(), m = date.getMonth();
  const daysInMonth = getDaysInMonth(y, m);
  const trainedDaysCount = useMemo(() => Object.keys(workouts).filter(k => {
    const [ky, km] = k.split('-').map(Number);
    return ky === y && km === m + 1 && (workouts[k] as Exercise[])?.length > 0;
  }).length, [workouts, y, m]);
  const progressPct = Math.round((trainedDaysCount / daysInMonth) * 100);

  const lastWeight = useMemo(() => {
    if (!form.name || !sel) return null;
    const entries = Object.entries(workouts).filter(([dk, d]) => dk !== sel && (d as Exercise[]).some(ex => ex.name === form.name)).sort((a,b) => b[0].localeCompare(a[0]));
    if (entries.length > 0) {
      const lastEx = (entries[0][1] as Exercise[]).find(ex => ex.name === form.name);
      return lastEx ? { weight: lastEx.weight, date: entries[0][0] } : null;
    }
    return null;
  }, [form.name, workouts, sel]);

  const add = async () => {
    if (!form.name || !sel || !db) return;
    const isCardio = form.zone === 'Cardio';
    const item: Exercise = { 
      id: Date.now(), zone: form.zone, name: form.name, 
      sets: isCardio ? undefined : form.sets, reps: isCardio ? undefined : form.reps, 
      weight: isCardio ? undefined : parseFloat(form.weight), minutes: isCardio ? form.minutes : undefined
    };
    await setDoc(doc(db, 'workouts', user.uid, 'days', sel), { exercises: [...(workouts[sel] || []), item] });
    setForm({ ...form, sets: '', reps: '', weight: '', minutes: '' });
  };

  return (
    <ViewContainer>
      <Header title="Entrenamiento" subtitle="Physical Progress" onBack={onBack} />
      <main className="p-6 w-full flex-1 flex flex-col max-w-2xl mx-auto pb-10">
        <div className="flex justify-between items-center mb-8 bg-slate-900/50 p-2.5 rounded-2xl border border-white/5 shadow-xl">
          <button className="p-4 bg-slate-800 rounded-xl text-orange-500" onClick={() => setDate(new Date(y, m - 1, 1))}><ChevronLeft size={24}/></button>
          <span className="font-black text-white uppercase tracking-widest text-xs italic">{months[m]} {y}</span>
          <button className="p-4 bg-slate-800 rounded-xl text-orange-500" onClick={() => setDate(new Date(y, m + 1, 1))}><ChevronRight size={24}/></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-8">
           <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 text-center shadow-lg"><div className="text-3xl font-black text-white italic">{trainedDaysCount}</div><p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Días Entrenados</p></div>
           <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 text-center shadow-lg"><div className="text-3xl font-black text-white italic">{progressPct}%</div><p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Consistencia</p></div>
        </div>
        <div className="grid grid-cols-7 gap-2.5 mb-8">
          {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-[10px] text-slate-700 font-black uppercase text-center">{d}</div>)}
          {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, i) => <div key={i} />)}
          {Array.from({ length: getDaysInMonth(y, m) }).map((_, i) => {
            const d = i + 1, k = formatDateKey(y, m, d);
            const active = (workouts[k] as Exercise[])?.length > 0;
            const isToday = new Date().toDateString() === new Date(y, m, d).toDateString();
            return (
              <button key={d} onClick={() => { setSel(k); setOpen(true); }} className={`aspect-square rounded-xl text-sm font-black transition-all border flex items-center justify-center ${active ? 'bg-orange-600 border-orange-400 text-white shadow-md' : isToday ? 'border-orange-500 text-orange-500 bg-slate-900' : 'bg-slate-900/40 border-white/5 text-slate-700 hover:text-slate-400'}`}>{d}</button>
            );
          })}
        </div>
        {open && sel && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 flex items-end">
            <div className="bg-slate-900 w-full rounded-t-[4rem] p-8 max-h-[92vh] flex flex-col border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6 px-2"><h2 className="font-black text-2xl uppercase tracking-tighter italic text-white">{sel}</h2><button onClick={() => setOpen(false)} className="p-4 bg-slate-800 rounded-full text-white"><X size={24}/></button></div>
              <div className="flex-1 overflow-y-auto mb-8 space-y-4 px-2">
                {workouts[sel]?.map((ex) => (
                  <div key={ex.id} className="bg-slate-800/60 p-6 rounded-2xl flex justify-between items-center border border-white/5 shadow-md">
                    <div><p className="font-black text-white uppercase text-base italic tracking-tight">{ex.name}</p>{ex.zone === 'Cardio' ? <p className="text-[10px] text-orange-500 font-bold mt-1 uppercase flex items-center gap-1"><Timer size={12}/> <span className="text-white">{ex.minutes} minutos</span></p> : <p className="text-[10px] text-orange-500 font-bold mt-1 uppercase">{ex.sets}x{ex.reps} — <span className="text-white">{ex.weight}kg</span></p>}</div>
                    <button onClick={async () => { const upd = workouts[sel].filter((e: any) => e.id !== ex.id); await setDoc(doc(db, 'workouts', user.uid, 'days', sel), { exercises: upd }); }} className="text-slate-600 p-3 bg-slate-700/30 rounded-xl hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                  </div>
                ))}
              </div>
              <div className="space-y-4 bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                {!form.zone.includes('Cardio') && lastWeight && <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Info size={14}/> Récord: {lastWeight.weight}kg</div>}
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value, name: ''})} className="bg-slate-900 p-4 rounded-xl text-[10px] text-white font-black border-none"><option value="">ZONA...</option>{Object.keys(BODY_ZONES).map(z => <option key={z} value={z}>{z}</option>)}</select>
                  <select value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-[10px] text-white font-black border-none"><option value="">EJERCICIO...</option>{form.zone && BODY_ZONES[form.zone].map(e => <option key={e} value={e}>{e}</option>)}</select>
                </div>
                {form.zone === 'Cardio' ? <input type="number" placeholder="Minutos..." value={form.minutes} onChange={e=>setForm({...form, minutes: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-center font-black text-white text-xl w-full border border-white/5" /> : <div className="grid grid-cols-3 gap-3">
                    <input type="number" placeholder="S" value={form.sets} onChange={e=>setForm({...form, sets: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-center font-black text-white text-xl w-full"/><input type="number" placeholder="R" value={form.reps} onChange={e=>setForm({...form, reps: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-center font-black text-white text-xl w-full"/><input type="number" placeholder="Kg" value={form.weight} onChange={e=>setForm({...form, weight: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-center font-black text-white text-xl w-full"/>
                  </div>}
                <button onClick={add} className="w-full bg-orange-600 py-5 rounded-2xl font-black text-white shadow-xl uppercase tracking-widest text-[10px] italic">{form.zone === 'Cardio' ? 'REGISTRAR CARDIO' : 'AÑADIR SERIE'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ViewContainer>
  );
};

const FailureView: React.FC<{ user: FirebaseUser; workouts: Record<string, Exercise[]>; onBack: () => void }> = ({ user, workouts, onBack }) => {
  const [list, setList] = useState<Record<string, DocumentData>>({});
  const [f, setF] = useState({ name: '', weight: '', reps: '' });
  useEffect(() => { if (user && db) return onSnapshot(collection(db, 'failures', user.uid, 'records'), s => { const d: Record<string, DocumentData> = {}; s.forEach(docSnap => d[docSnap.id] = docSnap.data()); setList(d); }); }, [user]);
  return (
    <ViewContainer>
      <Header title="Fallo" subtitle="Personal Records" onBack={onBack} />
      <main className="p-6 space-y-8 w-full flex-1 max-w-2xl mx-auto">
        <div className="bg-orange-950/20 p-8 rounded-[3rem] border border-orange-500/30">
          <h3 className="font-black text-orange-500 mb-6 flex items-center gap-3 uppercase tracking-tighter text-xl italic"><Skull size={20}/> Registrar PR</h3>
          <div className="space-y-4">
            <select value={f.name} onChange={e => setF({...f, name: e.target.value})} className="w-full bg-slate-900 p-4 rounded-xl text-white font-black text-xs border-none"><option value="">EJERCICIO...</option>{Array.from(new Set(Object.values(workouts).flat().map(e=>(e as Exercise).name))).map(n=><option key={n} value={n}>{n}</option>)}</select>
            <div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Kg" value={f.weight} onChange={e=>setF({...f, weight: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-center font-black text-white text-xl"/><input type="number" placeholder="Reps" value={f.reps} onChange={e=>setF({...f, reps: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-center font-black text-white text-xl"/></div>
            <button onClick={async () => { if (f.name && f.weight && db) { const w = parseFloat(f.weight), r = parseInt(f.reps); await setDoc(doc(db, 'failures', user.uid, 'records', f.name), { weight: w, reps: r, date: new Date().toLocaleDateString(), oneRM: Math.round(w * (1 + r / 30)) }); setF({ name: '', weight: '', reps: '' }); } }} className="w-full bg-orange-600 py-5 rounded-2xl font-black text-white shadow-xl uppercase tracking-widest text-xs italic">GUARDAR RECORD</button>
          </div>
        </div>
        <div className="space-y-4">
          {Object.entries(list).map(([name, d]) => (
            <div key={name} className="bg-slate-800/60 p-6 rounded-2xl flex justify-between border border-white/5 items-center"><div><p className="font-black text-white uppercase text-base italic">{name}</p><p className="text-[9px] text-slate-500 font-black uppercase">{d.date}</p></div><div className="text-right"><p className="font-black text-orange-500 text-4xl italic">{d.weight}kg</p><p className="text-[9px] text-emerald-500 font-black uppercase">1RM: {d.oneRM}kg</p></div></div>
          ))}
        </div>
      </main>
    </ViewContainer>
  );
};

const ChartsView: React.FC<{ workouts: Record<string, Exercise[]>; onBack: () => void }> = ({ workouts, onBack }) => {
  const [sel, setSel] = useState('');
  const list = useMemo(() => { const n = new Set<string>(); Object.values(workouts).forEach(dl => (dl as Exercise[]).forEach(ex => n.add(ex.name))); return Array.from(n).sort(); }, [workouts]);
  const data = useMemo(() => {
    if (!sel) return [];
    return Object.entries(workouts).filter(([, l]) => (l as Exercise[]).some(ex => ex.name === sel)).map(([date, l]) => ({ date, weight: Math.max(...(l as Exercise[]).filter(ex => ex.name === sel).map(ex => ex.weight || 0)) })).sort((a,b) => a.date.localeCompare(b.date));
  }, [workouts, sel]);
  return (
    <ViewContainer>
      <Header title="Análisis" subtitle="Rendimiento" onBack={onBack} />
      <main className="p-6 w-full flex-1 flex flex-col max-w-2xl mx-auto">
        <select value={sel} onChange={e => setSel(e.target.value)} className="w-full bg-slate-900 p-6 rounded-2xl mb-8 font-black text-white border border-white/5 appearance-none shadow-2xl tracking-widest text-xs italic"><option value="">SELECCIONA EJERCICIO...</option>{list.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
        {data.length > 1 ? <div className="bg-slate-800/30 p-10 rounded-[3rem] flex-1 min-h-[300px] flex items-end justify-between gap-4 border border-white/5 shadow-inner overflow-x-auto">{data.map((d, i) => (<div key={i} className="bg-orange-500 min-w-[15px] w-full rounded-t-full relative group transition-all" style={{ height: `${(d.weight / Math.max(...data.map(x=>x.weight))) * 100}%` }}><div className="absolute -top-12 left-1/2 -translate-x-1/2 text-[9px] bg-slate-950 p-2 rounded-xl font-black border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-20 whitespace-nowrap">{d.weight}kg</div></div>))}</div> : <div className="text-center flex-1 flex flex-col items-center justify-center opacity-10 font-black text-white"><TrendingUp size={100} className="mb-4"/><p className="uppercase tracking-[0.4em] text-[10px]">Sin datos suficientes</p></div>}
      </main>
    </ViewContainer>
  );
};

const HistoryView: React.FC<{ user: FirebaseUser; workouts: Record<string, Exercise[]>; onBack: () => void }> = ({ user, workouts, onBack }) => {
  const [photos, setPhotos] = useState<Record<string, DocumentData>>({});
  const [up, setUp] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selRef = useRef<string | null>(null);
  useEffect(() => { if (user && db) return onSnapshot(collection(db, 'photos', user.uid, 'monthly'), s => { const d: Record<string, DocumentData> = {}; s.forEach(docSnap => d[docSnap.id] = docSnap.data()); setPhotos(d); }); }, [user]);
  const historyData = useMemo(() => {
    const res = []; const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(), y = d.getFullYear(), total = getDaysInMonth(y, m);
      let count = 0;
      Object.keys(workouts).forEach(k => { const [ky, km] = k.split('-').map(Number); if (ky === y && km === m + 1 && (workouts[k] as Exercise[])?.length > 0) count++; });
      res.push({ key: `${y}-${m}`, month: months[m], year: y, pct: Math.round((count / total) * 100) });
    }
    return res;
  }, [workouts]);
  return (
    <ViewContainer>
      <Header title="Historial" subtitle="Identidad Visual" onBack={onBack} />
      <main className="p-6 space-y-5 w-full flex-1 overflow-y-auto max-w-2xl mx-auto pb-10">
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f && selRef.current && db) { setUp(selRef.current); const b64 = await compressImage(f); await setDoc(doc(db, 'photos', user.uid, 'monthly', selRef.current), { image: b64, date: new Date().toLocaleDateString() }); setUp(null); } }} />
        {historyData.map(item => (
          <div key={item.key} className="bg-slate-800/80 p-6 rounded-[2.5rem] border border-white/5 flex justify-between items-center shadow-xl">
            <div><h3 className="font-black text-white text-xl uppercase italic">{item.month} {item.year}</h3><div className="flex items-center gap-2 mt-1"><div className="text-orange-500 font-black text-2xl">{item.pct}%</div><div className="text-[8px] text-slate-500 font-black uppercase">Hecho</div></div></div>
            <div className="flex flex-col items-end">{photos[item.key] ? <img src={photos[item.key].image} className="w-20 h-20 object-cover rounded-2xl border-2 border-slate-700 shadow-xl" alt="Progress" /> : <button onClick={() => { selRef.current = item.key; fileRef.current?.click(); }} className="w-20 h-20 bg-slate-700/30 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 hover:text-amber-500 active:scale-95 transition-all">{up === item.key ? <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent animate-spin rounded-full"/> : <Camera size={28}/>}</button>}</div>
          </div>
        ))}
      </main>
    </ViewContainer>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [view, setView] = useState('home'); 
  const [workouts, setWorkouts] = useState<Record<string, Exercise[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!isConfigValid || !auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { try { await signInAnonymously(auth); } catch(e) { setLoading(false); } }
      else { setUser(u); }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !isConfigValid || !db) return;
    const unsub = onSnapshot(collection(db, 'workouts', user.uid, 'days'), s => {
      const d: Record<string, Exercise[]> = {}; s.forEach(docSnap => d[docSnap.id] = (docSnap.data().exercises || []) as Exercise[]);
      setWorkouts(d); setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  if (!isConfigValid) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white"><AlertTriangle size={64} className="text-amber-500 mb-8 animate-bounce" /><h1 className="text-2xl font-black mb-4 italic tracking-tighter uppercase">Faltan Credenciales</h1><p className="text-slate-500 text-sm max-w-xs font-bold leading-relaxed">Copia tus llaves de Firebase en el código para iniciar el sistema.</p></div>;

  if (loading && !user) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black italic space-y-6"><div className="relative"><div className="bg-slate-900 p-1 rounded-3xl border border-white/10 mb-2 w-16 h-16 overflow-hidden flex items-center justify-center shadow-xl"><img src="/icon.png" alt="Logo" className="w-full h-full object-cover animate-pulse" /></div></div><span className="tracking-[0.4em] uppercase text-[9px] font-black opacity-40">Iniciando Physical Tracker 100</span></div>;

  const views: Record<string, React.ReactElement> = {
    home: <HomeView onNavigate={setView} />,
    profile: user ? <ProfileView user={user} onBack={() => setView('home')} /> : <div>Error</div>,
    workout: user ? <WorkoutView user={user} workouts={workouts} onBack={() => setView('home')} /> : <div>Error</div>,
    failure: user ? <FailureView user={user} workouts={workouts} onBack={() => setView('home')} /> : <div>Error</div>,
    charts: <ChartsView workouts={workouts} onBack={() => setView('home')} />,
    history: user ? <HistoryView user={user} workouts={workouts} onBack={() => setView('home')} /> : <div>Error</div>,
  };

  return (
    <div className="font-sans text-slate-100 min-h-screen bg-slate-950 selection:bg-orange-500/30 flex flex-col items-stretch">
      <div className="flex-1 w-full flex flex-col items-stretch">
        {views[view] || views.home}
      </div>
    </div>
  );
}