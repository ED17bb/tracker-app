import { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Dumbbell, 
  X,
  TrendingUp,
  User,
  Activity,
  Skull, 
  ArrowLeft,
  History,
  LogIn,
  LogOut,
  Minus,
  Plus,
  Calendar,
  FileText
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  type User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";

// --- CONFIGURACIÓN DE TU FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBkRJP-gMGlQOeq-5DOZcYvE0vOCMaJH48",
  authDomain: "physical-tracker-100.firebaseapp.com",
  projectId: "physical-tracker-100",
  storageBucket: "physical-tracker-100.firebasestorage.app",
  messagingSenderId: "139291216970",
  appId: "1:139291216970:web:0a17a7caeaa4578be4aab3"
};


// --- DECLARACIONES GLOBALES ---
declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;

const getFinalConfig = () => {
  if (firebaseConfig.apiKey !== "TU_API_KEY") return firebaseConfig;
  if (typeof __firebase_config !== 'undefined' && __firebase_config) return JSON.parse(__firebase_config);
  return firebaseConfig;
};

const finalConfig = getFinalConfig();
const isConfigValid = finalConfig.apiKey !== "TU_API_KEY";

const app = initializeApp(finalConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'gympro-ernesto-final';
const appId = rawAppId.replace(/[^a-zA-Z0-9_-]/g, '_');

// --- INTERFACES ---
interface Exercise {
  id: number;
  zone: string;
  name: string;
  sets: string;
  reps: string;
  weight: number;
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
  timestamp?: number;
}

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
  "Full Body": ["Burpees", "Thrusters", "Clean & Press", "Zancadas", "Salto al Cajón"]
};

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
const formatDateKey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// --- COMPONENTES ATÓMICOS (Fuera para evitar pérdida de foco) ---

const Field = ({ label, value, field, unit, onChange }: { label: string, value: string, field: keyof ProfileData, unit: string, onChange: (f: keyof ProfileData, v: string) => void }) => (
  <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 shadow-sm transition-all focus-within:border-blue-500/50">
    <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-[0.15em]">{label}</label>
    <div className="flex items-baseline gap-2">
      <input 
        type="number" 
        value={value} 
        onChange={e => onChange(field, e.target.value)} 
        className="bg-transparent text-white font-black text-4xl w-full outline-none" 
        placeholder="0" 
      />
      <span className="text-xs text-blue-500 font-black uppercase">{unit}</span>
    </div>
  </div>
);

const Header = ({ title, subtitle, onBack, onLogout }: { title: string, subtitle?: string, onBack?: () => void, onLogout?: () => void }) => (
  <header className="bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 p-5 sticky top-0 z-30 w-full shadow-lg">
    <div className="w-full flex items-center gap-5">
      {onBack ? (
        <button onClick={onBack} className="bg-slate-700 p-3 rounded-2xl text-white active:scale-90 transition-all shadow-inner">
          <ArrowLeft size={24} />
        </button>
      ) : (
        <button onClick={onLogout} className="bg-slate-700/50 p-3 rounded-2xl text-slate-400 active:scale-90 transition-all">
          <LogOut size={20} />
        </button>
      )}
      <div className="flex-1 overflow-hidden">
        <h1 className="text-2xl font-black text-white leading-tight truncate tracking-tight uppercase italic">{title}</h1>
        {subtitle && <p className="text-[10px] text-blue-400 uppercase font-black tracking-[0.2em]">{subtitle}</p>}
      </div>
    </div>
  </header>
);

const InputBlock = ({ label, value, unit, onAdjust }: { label: string, value: string, unit: string, onAdjust: (amt: number) => void }) => (
  <div className="bg-slate-900 p-5 rounded-[2.5rem] border border-white/5 shadow-inner flex flex-col items-center w-full">
    <span className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4">{label}</span>
    <div className="flex items-center justify-between w-full px-4">
      <button type="button" onClick={() => onAdjust(-1)} className="w-14 h-14 flex items-center justify-center bg-slate-800 rounded-full text-white active:bg-blue-600 active:scale-90 transition-all shadow-md">
        <Minus size={24}/>
      </button>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-white font-black text-5xl">{value}</span>
        <span className="text-xs text-blue-500 font-black uppercase">{unit}</span>
      </div>
      <button type="button" onClick={() => onAdjust(1)} className="w-14 h-14 flex items-center justify-center bg-slate-800 rounded-full text-white active:bg-blue-600 active:scale-90 transition-all shadow-md">
        <Plus size={24}/>
      </button>
    </div>
  </div>
);

// --- VISTAS ---

const LoginView = ({ onLogin }: { onLogin: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 min-h-screen w-full text-white">
    <div className="bg-blue-600 p-10 rounded-[4rem] mb-10 shadow-[0_20px_60px_rgba(37,99,235,0.3)]">
      <Dumbbell size={80} className="text-white" />
    </div>
    <h1 className="text-5xl font-black italic tracking-tighter uppercase text-center leading-none mb-4">GymPro 100</h1>
    <p className="text-slate-500 text-center max-w-xs font-bold text-sm mb-12 leading-relaxed opacity-70">
      Tus datos ahora estarán protegidos para siempre con tu cuenta de Google.
    </p>
    <button 
      onClick={onLogin}
      className="w-full max-w-sm bg-white text-slate-900 font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm"
    >
      <LogIn size={24} />
      Entrar con Google
    </button>
  </div>
);

const HomeView = ({ user, onNavigate, onLogout }: { user: FirebaseUser, onNavigate: (v: string) => void, onLogout: () => void }) => (
  <div className="flex-1 flex flex-col p-6 space-y-8 bg-slate-950 min-h-screen w-full">
    <Header title="GymPro" subtitle={`Hola, ${user.displayName?.split(' ')[0]}`} onLogout={onLogout} />
    <div className="grid grid-cols-1 w-full gap-5">
      {[
        { id: 'profile', label: 'Biometría', icon: User, color: 'bg-indigo-600', desc: 'Grasa y Medidas' },
        { id: 'workout', label: 'Entrenamiento', icon: Dumbbell, color: 'bg-blue-600', desc: 'Series y Repeticiones' },
        { id: 'failure', label: 'Modo Fallo', icon: Skull, color: 'bg-rose-600', desc: 'Records Personales' },
        { id: 'charts', label: 'Análisis', icon: TrendingUp, color: 'bg-emerald-600', desc: 'Gráficas de Peso' },
        { id: 'history', label: 'Galería', icon: History, color: 'bg-amber-600', desc: 'Fotos y Logros' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className="bg-slate-800/40 hover:bg-slate-800 p-7 rounded-[2.5rem] flex items-center gap-6 border border-slate-700/50 active:scale-95 transition-all text-left group shadow-xl w-full"
        >
          <div className={`${item.color} p-4 rounded-3xl text-white shadow-lg group-hover:scale-110 transition-transform`}><item.icon size={32}/></div>
          <div className="flex-1">
            <span className="block font-black text-slate-100 text-2xl tracking-tight italic uppercase">{item.label}</span>
            <span className="text-[11px] text-slate-500 uppercase font-black tracking-widest mt-1 opacity-80">{item.desc}</span>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const ProfileView = ({ user, onBack }: { user: FirebaseUser, onBack: () => void }) => {
  const [p, setP] = useState<ProfileData>({ gender: 'male', height: '', weight: '', neck: '', waist: '', hip: '', chest: '', arms: '', thigh: '' });
  const [history, setHistory] = useState<ProfileData[]>([]);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Cargar perfil actual
    getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data')).then(s => {
      if (s.exists()) setP(s.data() as ProfileData);
    });

    // Cargar historial
    const qHistory = collection(db, 'artifacts', appId, 'users', user.uid, 'biometry_history');
    const unsub = onSnapshot(qHistory, (s) => {
      const docs = s.docs.map(d => ({ ...d.data(), id: d.id } as ProfileData & { id: string }));
      docs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setHistory(docs);
    });

    return () => unsub();
  }, [user]);

  const fat = useMemo(() => {
    const { gender, height, neck, waist, hip } = p;
    const h = parseFloat(height), n = parseFloat(neck), w = parseFloat(waist), hi = parseFloat(hip);
    if (!h || !n || !w) return null;
    if (gender === 'male') return (495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.1554 * Math.log10(h)) - 450).toFixed(1);
    return hi ? (495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.22100 * Math.log10(h)) - 450).toFixed(1) : null;
  }, [p]);

  const handleFieldChange = (field: keyof ProfileData, val: string) => {
    setP(prev => ({ ...prev, [field]: val }));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const now = Date.now();
    
    // GUARDADO ESPECIAL: Quitamos la altura del historial tal como pidió Ernesto
    const { height, ...historyData } = p;
    const finalHistoryData = { ...historyData, calculatedFat: fat, timestamp: now };
    const finalProfileData = { ...p, calculatedFat: fat, timestamp: now };
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), finalProfileData);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'biometry_history', now.toString()), finalHistoryData);
      setSaving(false);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'biometry_history', id));
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-h-screen w-full">
      <Header title="Biometría" subtitle="Composición Corporal" onBack={onBack} />
      <main className="p-6 space-y-6 w-full pb-20">
        <div className="flex bg-slate-800 p-2 rounded-[2rem] border border-slate-700">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => setP({...p, gender: g})} className={`flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all ${p.gender === g ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500'}`}>{g === 'male' ? 'Hombre' : 'Mujer'}</button>
          ))}
        </div>
        
        <div className="bg-gradient-to-br from-indigo-600 to-blue-800 p-10 rounded-[3.5rem] flex justify-between items-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={100} className="text-white" /></div>
          <div className="relative z-10"><div className="text-white/80 font-black text-xs uppercase tracking-[0.2em]">Grasa Actual</div><p className="text-[9px] text-white/40 uppercase font-bold mt-1 leading-none">Navy Method</p></div>
          <div className="text-7xl font-black text-white relative z-10 tracking-tighter italic">{fat || '--'}<span className="text-2xl ml-1 opacity-60">%</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Altura" value={String(p.height || '')} field="height" unit="cm" onChange={handleFieldChange} />
          <Field label="Peso" value={String(p.weight || '')} field="weight" unit="kg" onChange={handleFieldChange} />
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <Field label="Cuello" value={String(p.neck || '')} field="neck" unit="cm" onChange={handleFieldChange} />
          <Field label="Abdomen" value={String(p.waist || '')} field="waist" unit="cm" onChange={handleFieldChange} />
          {p.gender === 'female' && <Field label="Cadera" value={String(p.hip || '')} field="hip" unit="cm" onChange={handleFieldChange} />}
        </div>
        
        <div className={`grid ${p.gender === 'male' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
          {p.gender === 'male' && <Field label="Pecho" value={String(p.chest || '')} field="chest" unit="cm" onChange={handleFieldChange} />}
          <Field label="Brazos" value={String(p.arms || '')} field="arms" unit="cm" onChange={handleFieldChange} />
          <Field label="Muslo" value={String(p.thigh || '')} field="thigh" unit="cm" onChange={handleFieldChange} />
          {p.gender === 'male' && <Field label="Cadera" value={String(p.hip || '')} field="hip" unit="cm" onChange={handleFieldChange} />}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowHistory(true)} className="bg-slate-800 p-6 rounded-[2.5rem] text-slate-400 border border-slate-700 active:scale-95 transition-all">
            <FileText size={24} />
          </button>
          <button onClick={save} disabled={saving} className="flex-1 bg-indigo-600 py-7 rounded-[2.5rem] font-black text-white shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm italic">
            {saving ? 'GUARDANDO...' : 'SINCRONIZAR DATOS'}
          </button>
        </div>

        {/* MODAL DE BITÁCORA */}
        {showHistory && (
          <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
            <header className="p-8 flex justify-between items-center border-b border-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20"><History size={24}/></div>
                <div>
                  <h2 className="text-white font-black text-2xl uppercase tracking-tighter italic leading-none">Bitácora</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Historial de Medidas</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="bg-slate-800 p-4 rounded-full text-white active:scale-90"><X size={24}/></button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {history.length > 0 ? history.map((entry: any, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-inner group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-blue-500">
                      <Calendar size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{new Date(entry.timestamp || 0).toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => deleteHistoryItem(entry.id)} className="text-slate-700 hover:text-rose-500 p-1"><Trash2 size={16}/></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Peso y Grasa</div>
                      <div className="text-white font-black text-2xl italic tracking-tighter uppercase">
                        {entry.weight}kg <span className="text-blue-500 ml-1">{entry.calculatedFat}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-[8px] text-slate-600 font-black uppercase block">Abd</span><span className="text-slate-300 font-bold text-xs">{entry.waist}cm</span></div>
                      <div><span className="text-[8px] text-slate-600 font-black uppercase block">Brazo</span><span className="text-slate-300 font-bold text-xs">{entry.arms}cm</span></div>
                      <div><span className="text-[8px] text-slate-600 font-black uppercase block">Cuello</span><span className="text-slate-300 font-bold text-xs">{entry.neck}cm</span></div>
                      <div><span className="text-[8px] text-slate-600 font-black uppercase block">Muslo</span><span className="text-slate-300 font-bold text-xs">{entry.thigh}cm</span></div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <FileText size={80} className="text-white" />
                  <p className="mt-4 font-black uppercase text-xs tracking-widest text-white">Sin registros aún</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const WorkoutView = ({ user, workouts, onBack }: { user: FirebaseUser, workouts: Record<string, Exercise[]>, onBack: () => void }) => {
  const [date, setDate] = useState(new Date());
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ zone: '', name: '', customName: '', sets: '0', reps: '0', weight: '0' });
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const y = date.getFullYear(), m = date.getMonth();
  const daysInMonth = getDaysInMonth(y, m);
  const trainedDaysCount = useMemo(() => Object.keys(workouts).filter(k => {
    const [ky, km] = k.split('-').map(Number);
    return ky === y && km === m + 1 && (workouts[k])?.length > 0;
  }).length, [workouts, y, m]);

  const add = async () => {
    const finalName = form.name === 'Otro' ? form.customName : form.name;
    if (!form.zone || !finalName || !sel || !user) { setMsg("¡Faltan datos!"); setTimeout(()=>setMsg(null), 1500); return; }
    setIsSaving(true);
    const item: Exercise = { id: Date.now(), zone: form.zone, name: finalName, sets: form.sets, reps: form.reps, weight: parseFloat(form.weight) || 0 };
    try {
      const current = workouts[sel] || [];
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'days', sel), { exercises: [...current, item] });
      setForm(prev => ({ ...prev, sets: '0', reps: '0', weight: '0', customName: '' }));
      setMsg("¡AGREGADO!"); setTimeout(() => setMsg(null), 1000);
    } catch (e) { setMsg("Error Firebase"); } finally { setIsSaving(false); }
  };

  const adjustValue = (field: 'sets' | 'reps' | 'weight', amt: number) => {
    setForm(prev => {
      const val = parseFloat(prev[field]) || 0;
      return { ...prev, [field]: (Math.max(0, val + amt)).toString() };
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-h-screen w-full">
      <Header title="Entrenamiento" subtitle="Registro de Progreso" onBack={onBack} />
      <main className="p-4 w-full flex-1 flex flex-col items-stretch space-y-6 text-white">
        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-[2rem] border border-white/5 shadow-xl">
          <button type="button" onClick={() => setDate(new Date(y, m - 1, 1))} className="p-5 bg-slate-800 rounded-2xl text-blue-500 active:scale-90"><ChevronLeft size={28}/></button>
          <span className="font-black uppercase tracking-widest italic">{months[m]} {y}</span>
          <button type="button" onClick={() => setDate(new Date(y, m + 1, 1))} className="p-5 bg-slate-800 rounded-2xl text-blue-500 active:scale-90"><ChevronRight size={28}/></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-lg w-full">
              <div className="text-5xl font-black text-white italic">{trainedDaysCount}</div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">Días</p>
           </div>
           <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-lg w-full">
              <div className="text-5xl font-black text-white italic">{Math.round((trainedDaysCount / daysInMonth) * 100)}%</div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">Mes</p>
           </div>
        </div>
        <div className="grid grid-cols-7 gap-3 pb-4">
          {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-[12px] text-slate-700 font-black uppercase text-center">{d}</div>)}
          {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, i) => <div key={i} />)}
          {Array.from({ length: getDaysInMonth(y, m) }).map((_, i) => {
            const dNum = i + 1;
            const k = formatDateKey(y, m, dNum);
            const active = (workouts[k])?.length > 0;
            return (
              <button key={dNum} onClick={() => { setSel(k); setOpen(true); }} className={`aspect-square rounded-[1.25rem] text-base font-black transition-all border-2 flex items-center justify-center active:scale-90 ${active ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900/40 border-white/5 text-slate-700'}`}>{dNum}</button>
            );
          })}
        </div>
        {open && sel && (
          <div className="fixed inset-0 z-50 bg-slate-950/98 flex items-end">
            <div className="bg-slate-900 w-full rounded-t-[4rem] p-6 max-h-[98vh] flex flex-col border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6 px-4">
                <h2 className="font-black text-3xl uppercase tracking-tighter italic text-white leading-none">{sel}</h2>
                <button type="button" onClick={() => setOpen(false)} className="p-5 bg-slate-800 rounded-full text-white active:scale-90"><X size={28}/></button>
              </div>
              <div className="flex-1 overflow-y-auto mb-6 space-y-4 px-2">
                {(workouts[sel] || []).length > 0 ? (workouts[sel] || []).map((ex) => (
                  <div key={ex.id} className="bg-slate-800/60 p-7 rounded-[2.5rem] flex justify-between items-center border border-white/5 shadow-md w-full">
                    <div>
                      <p className="font-black text-white uppercase text-xl italic tracking-tight">{ex.name}</p>
                      <p className="text-xs text-blue-400 font-bold mt-2 uppercase tracking-widest">{ex.sets}S x {ex.reps}R — <span className="text-white text-lg font-black">{ex.weight}kg</span></p>
                    </div>
                    <button type="button" onClick={async () => {
                      const upd = workouts[sel].filter(e => e.id !== ex.id);
                      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'days', sel), { exercises: upd });
                    }} className="text-slate-600 p-4 bg-slate-700/30 rounded-2xl hover:text-rose-500 transition-colors"><Trash2 size={24}/></button>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-10"><Dumbbell size={80} className="text-white" /><p className="mt-4 font-black uppercase text-xs text-white">Sin ejercicios aún</p></div>
                )}
              </div>
              <div className="space-y-4 bg-slate-950/80 p-6 rounded-[3rem] border border-white/5 shadow-2xl mb-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value, name: ''})} className="bg-slate-900 p-5 rounded-2xl text-xs text-white font-black border border-white/5 appearance-none shadow-md outline-none"><option value="">ZONA...</option>{Object.keys(BODY_ZONES).map(z => <option key={z} value={z}>{z}</option>)}</select>
                  <select value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-xs text-white font-black border border-white/5 appearance-none shadow-md outline-none"><option value="">EJERCICIO...</option>{form.zone && BODY_ZONES[form.zone].map(e => <option key={e} value={e}>{e}</option>)}<option value="Otro">Otro...</option></select>
                </div>
                {form.name === 'Otro' && <input type="text" placeholder="¿Qué ejercicio?" value={form.customName} onChange={e=>setForm({...form, customName: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-center font-black text-white text-lg w-full border border-blue-500/30 outline-none text-white" />}
                <div className="flex flex-col gap-4">
                  <InputBlock label="SERIES LOGRADAS" value={form.sets} unit="S" onAdjust={(amt) => adjustValue('sets', amt)} />
                  <InputBlock label="REPETICIONES" value={form.reps} unit="R" onAdjust={(amt) => adjustValue('reps', amt)} />
                  <InputBlock label="PESO CARGADO" value={form.weight} unit="KG" onAdjust={(amt) => adjustValue('weight', amt)} />
                </div>
                <button type="button" onClick={add} disabled={isSaving} className={`w-full py-7 rounded-[2.5rem] font-black text-white shadow-xl uppercase tracking-[0.2em] italic active:scale-95 transition-all ${msg ? 'bg-amber-600' : 'bg-blue-600'}`}>
                  {isSaving ? 'PROCESANDO...' : (msg || 'AGREGAR')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
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
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'days'), s => {
      const d: Record<string, Exercise[]> = {};
      s.forEach(docSnap => {
        const data = docSnap.data();
        d[docSnap.id] = (data.exercises || []) as Exercise[];
      });
      setWorkouts(d);
    });
    return () => unsub();
  }, [user]);

  const handleLogin = async () => { if (auth && provider) await signInWithPopup(auth, provider).catch(console.error); };
  const handleLogout = () => auth && signOut(auth);

  if (!isConfigValid) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white"><Dumbbell size={80} className="text-amber-500 mb-10 animate-bounce" /><h1 className="text-3xl font-black mb-6 uppercase italic">Error de Enlace</h1><p className="text-slate-500 text-sm max-w-xs font-bold leading-relaxed text-white/50">Ernesto, pega tus llaves de Firebase en el código para activar la seguridad permanente.</p></div>;

  if (loading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black italic space-y-6"><Dumbbell size={100} className="text-blue-500 animate-spin" /><span className="tracking-[0.6em] uppercase text-[12px] font-black opacity-50">Validando sesión...</span></div>;

  if (!user) return <LoginView onLogin={handleLogin} />;

  const renderView = () => {
    switch(view) {
      case 'profile': return <ProfileView user={user} onBack={() => setView('home')} />;
      case 'workout': return <WorkoutView user={user} workouts={workouts} onBack={() => setView('home')} />;
      case 'failure': return (
        <div className="p-10 text-white text-center font-black">
          <Header title="Récords" onBack={() => setView('home')} />
          <Skull size={40} className="mx-auto mb-4 text-rose-500" />
          PRÓXIMAMENTE
        </div>
      );
      case 'charts': return (
        <div className="p-10 text-white text-center font-black">
          <Header title="Análisis" onBack={() => setView('home')} />
          <TrendingUp size={40} className="mx-auto mb-4 text-emerald-500" />
          PRÓXIMAMENTE
        </div>
      );
      case 'history': return (
        <div className="p-10 text-white text-center font-black">
          <Header title="Galería" onBack={() => setView('home')} />
          <Activity size={40} className="mx-auto mb-4 text-amber-500" />
          PRÓXIMAMENTE
        </div>
      );
      default: return <HomeView user={user} onNavigate={setView} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="font-sans text-slate-100 min-h-screen bg-slate-950 selection:bg-blue-600/30 flex flex-col overflow-x-hidden antialiased items-stretch">
      <div className="flex-1 w-full flex flex-col items-stretch">
        {renderView()}
      </div>
    </div>
  );
}