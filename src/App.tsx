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
  Plus
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
  onSnapshot
} from "firebase/firestore";

// --- CONFIGURACIÓN DE TU FIREBASE ---
// Ernesto: Pega tus llaves AQUÍ. 
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

// --- COMPONENTES UI ---

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
  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 min-h-screen w-full">
    <div className="bg-blue-600 p-10 rounded-[4rem] mb-10 shadow-[0_20px_60px_rgba(37,99,235,0.3)]">
      <Dumbbell size={80} className="text-white" />
    </div>
    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase text-center leading-none mb-4">GymPro 100</h1>
    <p className="text-slate-500 text-center max-w-xs font-bold text-sm mb-12 leading-relaxed text-white/50">
      Tu progreso es eterno. Entra con Google para que tus datos nunca desaparezcan.
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data')).then(s => {
        if (s.exists()) setP(s.data() as ProfileData);
      });
    }
  }, [user]);

  const fat = useMemo(() => {
    const { gender, height, neck, waist, hip } = p;
    const h = parseFloat(height), n = parseFloat(neck), w = parseFloat(waist), hi = parseFloat(hip);
    if (!h || !n || !w) return null;
    if (gender === 'male') return (495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.1554 * Math.log10(h)) - 450).toFixed(1);
    return hi ? (495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.22100 * Math.log10(h)) - 450).toFixed(1) : null;
  }, [p]);

  const save = async () => {
    if (user) { 
      setSaving(true); 
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { ...p, calculatedFat: fat }); 
      setSaving(false); 
    }
  };

  const Field = ({ label, field, unit }: { label: string, field: keyof ProfileData, unit: string }) => (
    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 shadow-sm">
      <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-[0.15em]">{label}</label>
      <div className="flex items-baseline gap-2">
        <input type="number" value={String(p[field] || '')} onChange={e => setP({...p, [field]: e.target.value})} className="bg-transparent text-white font-black text-4xl w-full outline-none" placeholder="0" />
        <span className="text-xs text-blue-500 font-black uppercase">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-h-screen w-full">
      <Header title="Biometría" subtitle="Composición Corporal" onBack={onBack} />
      <main className="p-6 space-y-6 w-full">
        <div className="flex bg-slate-800 p-2 rounded-[2rem] border border-slate-700">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => setP({...p, gender: g})} className={`flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all ${p.gender === g ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500'}`}>{g === 'male' ? 'Hombre' : 'Mujer'}</button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-blue-800 p-12 rounded-[3.5rem] flex justify-between items-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={120} className="text-white" /></div>
          <div className="relative z-10"><div className="text-white/80 font-black text-sm uppercase tracking-[0.2em]">Grasa</div><p className="text-[10px] text-white/40 uppercase font-bold mt-2">Navy Method</p></div>
          <div className="text-7xl font-black text-white relative z-10 tracking-tighter italic">{fat || '--'}<span className="text-2xl ml-1 opacity-60">%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-4"><Field label="Altura" field="height" unit="cm" /><Field label="Peso" field="weight" unit="kg" /></div>
        <div className="grid grid-cols-3 gap-4"><Field label="Cuello" field="neck" unit="cm" /><Field label="Abdomen" field="waist" unit="cm" />{p.gender === 'female' && <Field label="Cadera" field="hip" unit="cm" />}</div>
        <div className={`grid ${p.gender === 'male' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
          {p.gender === 'male' && <Field label="Pecho" field="chest" unit="cm" />}
          <Field label="Brazos" field="arms" unit="cm" /><Field label="Muslo" field="thigh" unit="cm" />
          {p.gender === 'male' && <Field label="Cadera" field="hip" unit="cm" />}
        </div>
        <button onClick={save} disabled={saving} className="w-full bg-indigo-600 py-7 rounded-[2.5rem] font-black text-white mt-4 shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm">{saving ? 'Actualizando...' : 'Sincronizar Perfil'}</button>
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
      <main className="p-4 w-full flex-1 flex flex-col items-stretch space-y-6">
        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-[2rem] border border-white/5 shadow-xl">
          <button type="button" onClick={() => setDate(new Date(y, m - 1, 1))} className="p-5 bg-slate-800 rounded-2xl text-blue-500"><ChevronLeft size={28}/></button>
          <span className="font-black text-white uppercase tracking-widest italic">{months[m]} {y}</span>
          <button type="button" onClick={() => setDate(new Date(y, m + 1, 1))} className="p-5 bg-slate-800 rounded-2xl text-blue-500"><ChevronRight size={28}/></button>
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
              <button key={dNum} onClick={() => { setSel(k); setOpen(true); }} className={`aspect-square rounded-[1.25rem] text-base font-black transition-all border-2 flex items-center justify-center ${active ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900/40 border-white/5 text-slate-700'}`}>{dNum}</button>
            );
          })}
        </div>
        {open && sel && (
          <div className="fixed inset-0 z-50 bg-slate-950/98 flex items-end">
            <div className="bg-slate-900 w-full rounded-t-[4rem] p-6 max-h-[98vh] flex flex-col border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6 px-4">
                <h2 className="font-black text-3xl uppercase tracking-tighter italic text-white leading-none">{sel}</h2>
                <button type="button" onClick={() => setOpen(false)} className="p-5 bg-slate-800 rounded-full text-white"><X size={28}/></button>
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
                    }} className="text-slate-600 p-4 bg-slate-700/30 rounded-2xl"><Trash2 size={24}/></button>
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
                {form.name === 'Otro' && <input type="text" placeholder="¿Qué ejercicio?" value={form.customName} onChange={e=>setForm({...form, customName: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-center font-black text-white text-lg w-full border border-blue-500/30 outline-none" />}
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

  if (!isConfigValid) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white"><Dumbbell size={80} className="text-amber-500 mb-10 animate-bounce" /><h1 className="text-3xl font-black mb-6 uppercase italic">Error de Enlace</h1><p className="text-slate-500 text-sm max-w-xs font-bold leading-relaxed">Ernesto, pega tus credenciales de Firebase en el código para activar la seguridad permanente.</p></div>;

  if (loading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black italic space-y-6"><Dumbbell size={100} className="text-blue-500 animate-spin" /><span className="tracking-[0.6em] uppercase text-[12px] font-black opacity-50">Validando sesión...</span></div>;

  if (!user) return <LoginView onLogin={handleLogin} />;

  const renderView = () => {
    switch(view) {
      case 'profile': return <ProfileView user={user} onBack={() => setView('home')} />;
      case 'workout': return <WorkoutView user={user} workouts={workouts} onBack={() => setView('home')} />;
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