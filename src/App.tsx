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
  ChevronRight as ChevronRightIcon,
  Timer,
  Plus,
  Minus,
  Info
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  type User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot,
  type DocumentData
} from "firebase/firestore";

// --- ENVIRONMENT GLOBALS ---
// These are provided by the environment, but we declare them for TypeScript
declare const __firebase_config: string;
declare const __app_id: string;
declare const __initial_auth_token: string | undefined;

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Rule 1: Sanitize appId to avoid segment errors in Firestore
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'physical-tracker-100';
const appId = rawAppId.replace(/\//g, '_');

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

// --- STYLES ---
const cleanTitleStyle: React.CSSProperties = {
  color: 'white',
  fontWeight: 900,
};

// --- UTILITIES ---
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
    reader.onload = (e: any) => {
      const img = new Image();
      img.src = e.target.result;
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

// --- REUSABLE UI COMPONENTS ---

const Header: React.FC<{ title: string; subtitle?: string; onBack?: () => void }> = ({ title, subtitle, onBack }) => (
  <header className="bg-slate-900/95 backdrop-blur-md border-b border-white/5 p-6 sticky top-0 z-40 w-full shadow-lg">
    <div className="flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="bg-slate-800 p-3 rounded-2xl text-orange-500 active:scale-90 transition-all border border-white/5 shadow-inner">
          <ArrowLeft size={24} />
        </button>
      )}
      <div className="flex-1 overflow-hidden text-center">
        <h1 className="text-2xl font-black uppercase italic" style={cleanTitleStyle}>{title}</h1>
        {subtitle && <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">{subtitle}</p>}
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

const InputBlock = ({ 
  label, 
  value, 
  unit, 
  onAdjust 
}: { 
  label: string, 
  value: string, 
  unit: string, 
  onAdjust: (amt: number) => void 
}) => (
  <div className="bg-slate-900 p-5 rounded-[2.5rem] border border-white/5 shadow-inner flex flex-col items-center w-full">
    <span className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4">{label}</span>
    <div className="flex items-center justify-between w-full px-4">
      <button 
        onClick={() => onAdjust(-1)} 
        className="w-14 h-14 flex items-center justify-center bg-slate-800 rounded-full text-white active:bg-orange-600 active:scale-90 transition-all shadow-md"
      >
        <Minus size={24}/>
      </button>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-white font-black text-5xl">{value}</span>
        <span className="text-xs text-orange-500 font-black uppercase">{unit}</span>
      </div>
      <button 
        onClick={() => onAdjust(1)} 
        className="w-14 h-14 flex items-center justify-center bg-slate-800 rounded-full text-white active:bg-orange-600 active:scale-90 transition-all shadow-md"
      >
        <Plus size={24}/>
      </button>
    </div>
  </div>
);

// --- VIEWS ---

const HomeView: React.FC<{ onNavigate: (v: string) => void }> = ({ onNavigate }) => (
  <ViewContainer>
    <div className="flex-1 flex flex-col p-6 space-y-12 justify-center items-center w-full">
      <div className="text-center w-full">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-sky-500 blur-3xl opacity-10 rounded-full animate-pulse"></div>
          <div className="relative bg-slate-900 p-1 rounded-3xl border border-white/10 shadow-2xl overflow-hidden w-20 h-20 flex items-center justify-center">
             <img src="/icon.png" alt="Logo" className="w-full h-full object-cover rounded-2xl" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=PT100'; }} />
          </div>
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-center text-white" style={cleanTitleStyle}>
          Physical Tracker 100
        </h1>
      </div>
      
      <div className="grid grid-cols-1 w-full gap-5">
        {[
          { id: 'profile', label: 'Biometría', icon: User, color: 'from-orange-500 to-orange-600', desc: 'Composición Corporal' },
          { id: 'workout', label: 'Entrenamiento', icon: Dumbbell, color: 'from-orange-600 to-red-700', desc: 'Registro de Sesión' },
          { id: 'failure', label: 'Modo Fallo', icon: Skull, color: 'from-slate-700 to-slate-900', desc: 'Personal Records' },
          { id: 'charts', label: 'Análisis', icon: TrendingUp, color: 'from-orange-400 to-orange-600', desc: 'Carga Progresiva' },
          { id: 'history', label: 'Historial', icon: History, color: 'from-slate-800 to-black', desc: 'Galería Mensual' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="bg-slate-900/40 hover:bg-slate-900/60 p-6 rounded-[2.5rem] flex items-center gap-6 border border-white/5 active:scale-[0.98] transition-all text-left group shadow-xl w-full"
          >
            <div className={`bg-gradient-to-br ${item.color} p-4 rounded-3xl text-white shadow-md group-hover:scale-110 transition-transform`}><item.icon size={30}/></div>
            <div className="flex-1">
              <span className="block font-black text-white text-2xl tracking-tight uppercase italic text-white leading-none">{item.label}</span>
              <span className="text-[11px] text-slate-500 uppercase font-black tracking-widest mt-2 opacity-80">{item.desc}</span>
            </div>
            <ChevronRightIcon className="text-slate-700 group-hover:text-orange-500 transition-colors" size={24} />
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
    if (!user) return;
    const fetchProfile = async () => {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      const snap = await getDoc(docRef);
      if (snap.exists()) setP(snap.data() as ProfileData);
    };
    fetchProfile();
  }, [user]);

  const fat = useMemo(() => {
    const { gender, height, neck, waist, hip } = p;
    const h = parseFloat(height), n = parseFloat(neck), w = parseFloat(waist), hi = parseFloat(hip);
    if (!h || !n || !w) return null;
    if (gender === 'male') return (495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.1554 * Math.log10(h)) - 450).toFixed(1);
    return hi ? (495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.22100 * Math.log10(h)) - 450).toFixed(1) : null;
  }, [p]);

  const save = async () => {
    if(!user) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await setDoc(docRef, { ...p, calculatedFat: fat });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const Field = ({ label, field, unit }: { label: string; field: keyof ProfileData; unit: string }) => (
    <div className="bg-slate-900/60 p-5 rounded-3xl border border-white/5 shadow-inner w-full">
      <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-widest">{label}</label>
      <div className="flex items-baseline gap-2">
        <input type="number" value={p[field] || ''} onChange={e => setP({...p, [field]: e.target.value})} className="bg-transparent text-white font-black text-4xl w-full outline-none" placeholder="0" />
        <span className="text-xs text-orange-500 font-black uppercase">{unit}</span>
      </div>
    </div>
  );

  return (
    <ViewContainer>
      <Header title="Biometría" subtitle="Composición Corporal" onBack={onBack} />
      <main className="p-6 space-y-6 w-full flex-1">
        <div className="flex bg-slate-900 p-2 rounded-[2rem] border border-white/5">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => setP({...p, gender: g})} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${p.gender === g ? 'bg-orange-600 text-white shadow-md' : 'text-slate-600'}`}>{g === 'male' ? 'Hombre' : 'Mujer'}</button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-800/10 border border-orange-500/20 p-10 rounded-[3.5rem] flex justify-between items-center shadow-xl w-full">
          <div><div className="text-orange-500 font-black text-xs uppercase tracking-widest leading-none">Grasa Corporal</div><p className="text-[10px] text-slate-500 uppercase font-bold mt-2">Cálculo Marino</p></div>
          <div className="text-7xl font-black italic text-white">{String(fat || '--')}<span className="text-2xl ml-1 opacity-50">%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-4"><Field label="Altura" field="height" unit="cm" /><Field label="Peso" field="weight" unit="kg" /></div>
        <div className="grid grid-cols-3 gap-3"><Field label="Cuello" field="neck" unit="cm" /><Field label="Abdomen" field="waist" unit="cm" /><Field label="Cadera" field="hip" unit="cm" /></div>
        <div className="grid grid-cols-3 gap-3"><Field label="Pecho" field="chest" unit="cm" /><Field label="Brazos" field="arms" unit="cm" /><Field label="Muslo" field="thigh" unit="cm" /></div>
        <button onClick={save} disabled={saving} className="w-full bg-orange-600 py-7 rounded-[2.5rem] font-black text-white shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest text-sm italic mt-4">{saving ? 'Guardando...' : 'Sincronizar Datos'}</button>
      </main>
    </ViewContainer>
  );
};

const WorkoutView: React.FC<{ user: FirebaseUser; workouts: Record<string, Exercise[]>; onBack: () => void }> = ({ user, workouts, onBack }) => {
  const [date, setDate] = useState(new Date());
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ zone: '', name: '', customName: '', sets: '0', reps: '0', weight: '0', minutes: '0' });
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const y = date.getFullYear(), m = date.getMonth();
  const daysInMonth = getDaysInMonth(y, m);
  const trainedDaysCount = useMemo(() => Object.keys(workouts).filter(k => {
    const [ky, km] = k.split('-').map(Number);
    return ky === y && km === m + 1 && (workouts[k] as Exercise[])?.length > 0;
  }).length, [workouts, y, m]);
  const progressPct = Math.round((trainedDaysCount / daysInMonth) * 100);

  const lastWeightVal = useMemo(() => {
    if (!form.name || !sel || form.name === 'Otro') return null;
    const allEntries = Object.entries(workouts).filter(([dKey, exs]) => dKey !== sel && (exs as Exercise[]).some(ex => ex.name === form.name));
    allEntries.sort((a, b) => b[0].localeCompare(a[0]));
    if (allEntries.length > 0) {
      const found = (allEntries[0][1] as Exercise[]).find(ex => ex.name === form.name);
      return found?.weight || null;
    }
    return null;
  }, [form.name, workouts, sel]);

  const add = async () => {
    const finalName = form.name === 'Otro' ? form.customName : form.name;
    if (!finalName || !sel || !user) return;
    
    setIsSaving(true);
    const isCardio = form.zone === 'Cardio';

    const item: Exercise = { 
      id: Date.now(), 
      zone: form.zone, 
      name: finalName, 
      sets: isCardio ? undefined : form.sets, 
      reps: isCardio ? undefined : form.reps, 
      weight: isCardio ? undefined : (parseFloat(form.weight) || 0), 
      minutes: isCardio ? form.minutes : undefined 
    };

    try {
      const currentDayExs = workouts[sel] || [];
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'days', sel);
      await setDoc(docRef, { exercises: [...currentDayExs, item] });
      setForm(prev => ({ ...prev, name: '', customName: '', sets: '0', reps: '0', weight: '0', minutes: '0' }));
    } catch (e) {
      console.error("Error al guardar serie:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const adjustValue = (field: 'sets' | 'reps' | 'weight' | 'minutes', amt: number) => {
    setForm(prev => {
      const val = parseFloat(prev[field as keyof typeof prev]) || 0;
      const newVal = Math.max(0, val + amt);
      return { ...prev, [field]: (Math.round(newVal * 10) / 10).toString() };
    });
  };

  return (
    <ViewContainer>
      <Header title="Entrenamiento" subtitle="Physical Progress" onBack={onBack} />
      <main className="p-4 w-full flex-1 flex flex-col items-stretch space-y-6">
        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-[2rem] border border-white/5 shadow-xl">
          <button className="p-5 bg-slate-800 rounded-2xl text-orange-500 active:scale-90" onClick={() => setDate(new Date(y, m - 1, 1))}><ChevronLeft size={28}/></button>
          <span className="font-black text-white uppercase tracking-widest text-base italic">{months[m]} {y}</span>
          <button className="p-5 bg-slate-800 rounded-2xl text-orange-500 active:scale-90" onClick={() => setDate(new Date(y, m + 1, 1))}><ChevronRight size={28}/></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-lg w-full">
              <div className="text-5xl font-black text-white italic">{String(trainedDaysCount)}</div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">Días</p>
           </div>
           <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-lg w-full">
              <div className="text-5xl font-black text-white italic">{String(progressPct)}%</div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">Mes</p>
           </div>
        </div>
        <div className="grid grid-cols-7 gap-3 pb-4">
          {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-[12px] text-slate-700 font-black uppercase text-center">{d}</div>)}
          {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, i) => <div key={i} />)}
          {Array.from({ length: getDaysInMonth(y, m) }).map((_, i) => {
            const dayNum = i + 1;
            const k = formatDateKey(y, m, dayNum);
            const active = (workouts[k] as Exercise[])?.length > 0;
            const isToday = new Date().toDateString() === new Date(y, m, dayNum).toDateString();
            return (
              <button key={dayNum} onClick={() => { setSel(k); setOpen(true); }} className={`aspect-square rounded-[1.25rem] text-base font-black transition-all border-2 flex items-center justify-center ${active ? 'bg-orange-600 border-orange-400 text-white shadow-md scale-105' : isToday ? 'border-orange-500 text-orange-500 bg-slate-900' : 'bg-slate-900/40 border-white/5 text-slate-700 hover:text-slate-400'}`}>{dayNum}</button>
            );
          })}
        </div>
        
        {open && sel && (
          <div className="fixed inset-0 z-50 bg-slate-950/98 flex items-end">
            <div className="bg-slate-900 w-full rounded-t-[4rem] p-6 max-h-[98vh] flex flex-col border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6 px-4">
                <h2 className="font-black text-3xl uppercase tracking-tighter italic text-white leading-none">{sel}</h2>
                <button onClick={() => setOpen(false)} className="p-5 bg-slate-800 rounded-full text-white active:scale-90"><X size={28}/></button>
              </div>
              <div className="flex-1 overflow-y-auto mb-6 space-y-4 px-2">
                {(workouts[sel] || []).map((ex) => (
                  <div key={ex.id} className="bg-slate-800/60 p-7 rounded-[2.5rem] flex justify-between items-center border border-white/5 shadow-md w-full">
                    <div>
                      <p className="font-black text-white uppercase text-xl italic tracking-tight">{ex.name}</p>
                      {ex.zone === 'Cardio' ? <p className="text-xs text-orange-500 font-bold mt-2 uppercase flex items-center gap-2"><Timer size={14}/> <span className="text-white text-lg">{ex.minutes} minutos</span></p> : <p className="text-xs text-orange-400 font-bold mt-2 uppercase tracking-widest">{ex.sets}S x {ex.reps}R — <span className="text-white text-lg font-black">{String(ex.weight)}kg</span></p>}
                    </div>
                    <button onClick={async () => {
                      const currentExs = workouts[sel] || [];
                      const upd = currentExs.filter((e: Exercise) => e.id !== ex.id);
                      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'days', sel), { exercises: upd });
                    }} className="text-slate-600 p-4 bg-slate-700/30 rounded-2xl hover:text-rose-500"><Trash2 size={24}/></button>
                  </div>
                ))}
              </div>
              
              <div className="space-y-4 bg-slate-950/80 p-6 rounded-[3rem] border border-white/5 shadow-2xl mb-4 overflow-y-auto">
                {lastWeightVal && (
                  <div className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 px-2">
                    <Info size={14}/> Récord: {String(lastWeightVal)}kg
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value, name: ''})} className="bg-slate-900 p-5 rounded-2xl text-xs text-white font-black border border-white/5 appearance-none shadow-md"><option value="">ZONA...</option>{Object.keys(BODY_ZONES).map(z => <option key={z} value={z}>{z}</option>)}</select>
                  <select value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-xs text-white font-black border border-white/5 appearance-none shadow-md"><option value="">EJERCICIO...</option>{form.zone && BODY_ZONES[form.zone].map(e => <option key={e} value={e}>{e}</option>)}<option value="Otro">Otro...</option></select>
                </div>

                {form.name === 'Otro' && <input type="text" placeholder="Nombre ejercicio..." value={form.customName} onChange={e=>setForm({...form, customName: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-center font-black text-white text-lg w-full border border-orange-500/30" />}

                <div className="flex flex-col gap-4">
                  {form.zone === 'Cardio' ? (
                    <InputBlock label="TIEMPO" value={form.minutes} unit="MIN" onAdjust={(amt) => adjustValue('minutes', amt)} />
                  ) : (
                    <>
                      <InputBlock label="SERIES" value={form.sets} unit="S" onAdjust={(amt) => adjustValue('sets', amt)} />
                      <InputBlock label="REPETICIONES" value={form.reps} unit="R" onAdjust={(amt) => adjustValue('reps', amt)} />
                      <InputBlock label="PESO CARGADO" value={form.weight} unit="KG" onAdjust={(amt) => adjustValue('weight', amt)} />
                    </>
                  )}
                </div>
                
                <button 
                  onClick={add} 
                  disabled={isSaving}
                  className="w-full bg-orange-600 py-7 rounded-[2.5rem] font-black text-white shadow-xl uppercase tracking-[0.2em] text-base italic active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'PROCESANDO...' : (form.zone === 'Cardio' ? 'REGISTRAR CARDIO' : 'AÑADIR SERIE')}
                </button>
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
  
  useEffect(() => { 
    if (!user) return; 
    const qColl = collection(db, 'artifacts', appId, 'users', user.uid, 'failures');
    const unsub = onSnapshot(qColl, s => { 
      const d: Record<string, DocumentData> = {}; 
      s.forEach(docSnap => d[docSnap.id] = docSnap.data()); 
      setList(d); 
    }, (err) => console.error("Fallo snapshot error:", err)); 
    return () => unsub(); 
  }, [user]);

  const savePr = async () => {
    if (!user || !f.name || !f.weight) return;
    const w = parseFloat(f.weight), r = parseInt(f.reps);
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'failures', f.name), { weight: w, reps: r, date: new Date().toLocaleDateString(), oneRM: Math.round(w * (1 + r / 30)) });
    setF({ name: '', weight: '', reps: '' });
  };

  return (
    <ViewContainer>
      <Header title="Fallo" subtitle="Personal Records" onBack={onBack} />
      <main className="p-6 space-y-8 w-full flex-1">
        <div className="bg-orange-950/20 p-10 rounded-[4rem] border border-orange-500/30 shadow-2xl">
          <h3 className="font-black text-orange-500 mb-8 flex items-center gap-4 uppercase tracking-tighter text-xl italic"><Skull size={32}/> Registrar PR</h3>
          <div className="space-y-6">
            <select value={f.name} onChange={e => setF({...f, name: e.target.value})} className="w-full bg-slate-900 p-5 rounded-2xl text-white font-black text-sm border-none shadow-md"><option value="">SELECCIONA EJERCICIO...</option>{Array.from(new Set(Object.values(workouts).flat().map(e=>(e as Exercise).name))).map(n=><option key={n} value={n}>{n}</option>)}</select>
            <div className="grid grid-cols-2 gap-5"><input type="number" placeholder="Kg" value={f.weight} onChange={e=>setF({...f, weight: e.target.value})} className="bg-slate-900 p-6 rounded-2xl text-center font-black text-white text-3xl"/><input type="number" placeholder="Reps" value={f.reps} onChange={e=>setF({...f, reps: e.target.value})} className="bg-slate-900 p-6 rounded-2xl text-center font-black text-white text-3xl"/></div>
            <button onClick={savePr} className="w-full bg-orange-600 py-7 rounded-[2.5rem] font-black text-white shadow-xl uppercase tracking-widest text-xs italic">GUARDAR RECORD</button>
          </div>
        </div>
        <div className="space-y-6">
          {Object.entries(list).map(([name, d]) => (
            <div key={name} className="bg-slate-800/60 p-8 rounded-[3rem] flex justify-between border border-white/5 items-center w-full shadow-2xl"><div><p className="font-black text-white uppercase text-2xl italic leading-none">{name}</p><p className="text-xs text-slate-500 font-black uppercase mt-2 tracking-widest">{String(d.date)}</p></div><div className="text-right"><p className="font-black text-orange-500 text-5xl italic leading-none">{String(d.weight)}kg</p><p className="text-[10px] text-emerald-500 font-black uppercase mt-2">1RM: {String(d.oneRM)}kg</p></div></div>
          ))}
        </div>
      </main>
    </ViewContainer>
  );
};

const ChartsView: React.FC<{ workouts: Record<string, Exercise[]>; onBack: () => void }> = ({ workouts, onBack }) => {
  const [sel, setSel] = useState('');
  const list = useMemo(() => { const n = new Set<string>(); Object.values(workouts).forEach(dl => (dl as Exercise[]).forEach(ex => n.add(ex.name))); return Array.from(n).sort(); }, [workouts]);
  const data = useMemo(() => { if (!sel) return []; return Object.entries(workouts).filter(([, l]) => (l as Exercise[]).some(ex => ex.name === sel)).map(([date, l]) => ({ date, weight: Math.max(...(l as Exercise[]).filter(ex => ex.name === sel).map(ex => ex.weight || 0)) })).sort((a,b) => a.date.localeCompare(b.date)); }, [workouts, sel]);
  return (
    <ViewContainer>
      <Header title="Análisis" subtitle="Rendimiento" onBack={onBack} />
      <main className="p-6 w-full flex-1 flex flex-col items-stretch">
        <select value={sel} onChange={e => setSel(e.target.value)} className="w-full bg-slate-900 p-7 rounded-[2.5rem] mb-10 font-black text-white border border-white/5 appearance-none shadow-2xl tracking-widest text-sm italic"><option value="">SELECCIONA EJERCICIO...</option>{list.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
        {data.length > 1 ? <div className="bg-slate-800/30 p-12 rounded-[4rem] flex-1 min-h-[400px] flex items-end justify-between gap-4 border border-white/5 shadow-inner overflow-x-auto">{data.map((d, i) => (<div key={i} className="bg-orange-500 min-w-[20px] w-full rounded-t-full relative group transition-all" style={{ height: `${(d.weight / Math.max(...data.map(x=>x.weight))) * 100}%` }}><div className="absolute -top-14 left-1/2 -translate-x-1/2 text-xs bg-slate-950 p-3 rounded-2xl font-black border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-20 whitespace-nowrap shadow-2xl">{String(d.weight)}kg</div></div>))}</div> : <div className="text-center flex-1 flex flex-col items-center justify-center opacity-10 font-black text-white w-full"><TrendingUp size={120} className="mb-8"/><p className="uppercase tracking-[0.5em] text-[12px]">Sin datos suficientes</p></div>}
      </main>
    </ViewContainer>
  );
};

const HistoryView: React.FC<{ user: FirebaseUser; workouts: Record<string, Exercise[]>; onBack: () => void }> = ({ user, workouts, onBack }) => {
  const [photos, setPhotos] = useState<Record<string, DocumentData>>({});
  const [up, setUp] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selRef = useRef<string | null>(null);

  useEffect(() => { 
    if (!user) return; 
    const qColl = collection(db, 'artifacts', appId, 'users', user.uid, 'photos');
    const unsub = onSnapshot(qColl, s => { 
      const d: Record<string, DocumentData> = {}; 
      s.forEach(docSnap => d[docSnap.id] = docSnap.data()); 
      setPhotos(d); 
    }, (err) => console.error("Foto snapshot error:", err)); 
    return () => unsub(); 
  }, [user]);

  const historyData = useMemo(() => { const res = []; const now = new Date(); for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const m = d.getMonth(), y = d.getFullYear(), total = getDaysInMonth(y, m); let count = 0; Object.keys(workouts).forEach(k => { const [ky, km] = k.split('-').map(Number); if (ky === y && km === m + 1 && (workouts[k] as Exercise[])?.length > 0) count++; }); res.push({ key: `${y}-${m}`, month: months[m], year: y, pct: Math.round((count / total) * 100) }); } return res; }, [workouts]);
  
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; 
    if (f && selRef.current && user) { 
      setUp(selRef.current); 
      try {
        const b64 = await compressImage(f); 
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'photos', selRef.current), { image: b64, date: new Date().toLocaleDateString() }); 
      } catch (err) { console.error(err); }
      setUp(null); 
    }
  };

  return (
    <ViewContainer>
      <Header title="Historial" subtitle="Logros Visuales" onBack={onBack} />
      <main className="p-6 space-y-6 w-full flex-1 overflow-y-auto pb-10">
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={onUpload} />
        {historyData.map(item => (
          <div key={item.key} className="bg-slate-800/80 p-8 rounded-[3.5rem] border border-white/5 flex justify-between items-center shadow-xl w-full"><div><h3 className="font-black text-white text-3xl uppercase italic leading-none">{item.month}</h3><p className="text-slate-500 font-black text-sm mt-1">{String(item.year)}</p><div className="flex items-center gap-3 mt-4"><div className="text-orange-500 font-black text-4xl leading-none">{String(item.pct)}%</div><div className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-tight">Meta<br/>Cumplida</div></div></div><div className="flex flex-col items-end">{photos[item.key] ? <img src={photos[item.key].image} onClick={() => setZoom(photos[item.key].image)} className="w-32 h-32 object-cover rounded-[2.5rem] border-4 border-slate-700 shadow-2xl active:scale-95 transition-all cursor-pointer" alt="Progress" /> : <button onClick={() => { selRef.current = item.key; fileRef.current?.click(); }} className="w-32 h-32 bg-slate-700/30 rounded-[2.5rem] border-4 border-dashed border-slate-600 flex flex-center items-center justify-center text-slate-600 hover:text-orange-500 active:scale-95 transition-all">{up === item.key ? <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent animate-spin rounded-full"/> : <><Camera size={44}/><span className="text-[8px] font-black uppercase mt-2">Añadir Foto</span></>}</button>}</div></div>
        ))}
      </main>
      {zoom && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoom(null)}>
          <img src={zoom} className="max-w-full max-h-[85vh] rounded-[3rem] shadow-2xl border border-white/10" alt="Zoom" />
        </div>
      )}
    </ViewContainer>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [view, setView] = useState('home'); 
  const [workouts, setWorkouts] = useState<Record<string, Exercise[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error:", e);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qColl = collection(db, 'artifacts', appId, 'users', user.uid, 'days');
    const unsub = onSnapshot(qColl, s => {
      const d: Record<string, Exercise[]> = {};
      s.forEach(docSnap => d[docSnap.id] = (docSnap.data().exercises || []) as Exercise[]);
      setWorkouts(d);
    }, (err) => console.error("Snapshot error:", err));
    return () => unsub();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black italic space-y-8"><div className="relative"><div className="bg-slate-900 p-1 rounded-3xl border border-white/10 mb-2 w-20 h-20 overflow-hidden flex items-center justify-center shadow-xl shadow-orange-500/10"><img src="/icon.png" alt="Logo" className="w-full h-full object-cover animate-pulse" /></div></div><span className="tracking-[0.8em] uppercase text-[10px] font-black opacity-40">Physical Tracker 100</span></div>;

  const views: Record<string, React.ReactElement> = {
    home: <HomeView onNavigate={setView} />,
    profile: user ? <ProfileView user={user} onBack={() => setView('home')} /> : <div className="p-10 text-white font-black uppercase text-center text-xs">Iniciando sesión...</div>,
    workout: user ? <WorkoutView user={user} workouts={workouts} onBack={() => setView('home')} /> : <div className="p-10 text-white font-black uppercase text-center text-xs">Iniciando sesión...</div>,
    failure: user ? <FailureView user={user} workouts={workouts} onBack={() => setView('home')} /> : <div className="p-10 text-white font-black uppercase text-center text-xs">Iniciando sesión...</div>,
    charts: <ChartsView workouts={workouts} onBack={() => setView('home')} />,
    history: user ? <HistoryView user={user} workouts={workouts} onBack={() => setView('home')} /> : <div className="p-10 text-white font-black uppercase text-center text-xs">Iniciando sesión...</div>,
  };

  return (
    <div className="font-sans text-slate-100 min-h-screen bg-slate-950 selection:bg-orange-500/30 flex flex-col items-stretch">
      <div className="flex-1 w-full flex flex-col items-stretch">
        {views[view] || views.home}
      </div>
    </div>
  );
}