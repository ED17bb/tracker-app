import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Dumbbell, 
  Calendar as CalendarIcon, 
  X,
  TrendingUp,
  User,
  CheckCircle2,
  Activity,
  BarChart2,
  Skull, 
  Ruler,
  ArrowLeft,
  History,
  Camera,
  Maximize2,
  AlertTriangle
} from 'lucide-react';

// Importaciones de Firebase
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";

// --- CONFIGURACIÓN DE TU FIREBASE ---
// ERNESTO: Pega aquí los datos que copiaste de la consola de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBkRJP-gMGlQOeq-5DOZcYvE0vOCMaJH48",
  authDomain: "physical-tracker-100.firebaseapp.com",
  projectId: "physical-tracker-100",
  storageBucket: "physical-tracker-100.firebasestorage.app",
  messagingSenderId: "139291216970",
  appId: "1:139291216970:web:0a17a7caeaa4578be4aab3"
};


// Validación de seguridad
const isConfigValid = firebaseConfig.apiKey !== "TU_API_KEY";

// Inicialización de servicios
let app: any, auth: any, db: any;
if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Error inicializando Firebase:", e);
  }
}

// --- Datos Maestros y Utilidades ---
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
  "Abdomen": ["Crunch", "Plancha", "Elevación de Piernas", "Rueda Abdominal"]
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
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

// --- Componentes Globales ---
const Header = ({ title, subtitle, onBack }: any) => (
  <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-20 w-full">
    <div className="max-w-md mx-auto flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="bg-slate-700 p-2 rounded-full text-white active:bg-slate-600">
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="overflow-hidden">
        <h1 className="text-xl font-bold text-white leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
    </div>
  </header>
);

// --- Vistas ---

const HomeView = ({ onNavigate }: any) => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
    <div className="bg-blue-600 p-4 rounded-3xl mb-4 shadow-xl shadow-blue-500/20">
      <Dumbbell size={40} className="text-white" />
    </div>
    <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2">GYM PRO</h1>
    <p className="text-slate-500 text-xs uppercase tracking-widest mb-8 font-bold">Registro de Fuerza Progresiva</p>
    
    <div className="grid grid-cols-1 w-full max-w-sm gap-4">
      {[
        { id: 'profile', label: 'Mi Perfil', icon: User, color: 'bg-indigo-600', desc: 'Antropometría y grasa' },
        { id: 'workout', label: 'Entrenamiento', icon: Dumbbell, color: 'bg-blue-600', desc: 'Rutina del día' },
        { id: 'failure', label: 'Modo Fallo', icon: Skull, color: 'bg-rose-600', desc: 'Mis Récords Personales' },
        { id: 'charts', label: 'Gráficas', icon: TrendingUp, color: 'bg-emerald-600', desc: 'Análisis de progreso' },
        { id: 'history', label: 'Historial', icon: History, color: 'bg-amber-600', desc: 'Fotos y constancia' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className="bg-slate-800/50 hover:bg-slate-800 p-4 rounded-2xl flex items-center gap-4 border border-slate-700 active:scale-95 transition-all text-left shadow-lg"
        >
          <div className={`${item.color} p-3 rounded-xl text-white shadow-inner`}><item.icon size={20}/></div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-100">{item.label}</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold">{item.desc}</span>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const ProfileView = ({ user, onBack }: any) => {
  const [p, setP] = useState<any>({ gender: 'male', height: '', weight: '', neck: '', waist: '', hip: '', chest: '', arms: '', thigh: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, 'profile', user.uid)).then(s => s.exists() && setP(s.data()));
  }, [user]);

  const fat = useMemo(() => {
    const { gender, height, neck, waist, hip } = p;
    const h = parseFloat(height), n = parseFloat(neck), w = parseFloat(waist), hi = parseFloat(hip);
    if (!h || !n || !w) return null;
    if (gender === 'male') return (495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.1554 * Math.log10(h)) - 450).toFixed(1);
    if (!hi) return null;
    return (495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.22100 * Math.log10(h)) - 450).toFixed(1);
  }, [p]);

  const save = async () => {
    if (!user || !db) return;
    setSaving(true);
    await setDoc(doc(db, 'profile', user.uid), { ...p, calculatedFat: fat });
    setSaving(false);
  };

  const Field = ({ label, field, unit }: any) => (
    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
      <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">{label}</label>
      <div className="flex items-baseline gap-1">
        <input type="number" value={p[field] || ''} onChange={e => setP({...p, [field]: e.target.value})} className="bg-transparent text-white font-bold text-xl w-full outline-none" placeholder="0" />
        <span className="text-xs text-slate-600 font-bold">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 pb-10">
      <Header title="Perfil" subtitle="Antropometría" onBack={onBack} />
      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => setP({...p, gender: g})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${p.gender === g ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>{g === 'male' ? 'Hombre' : 'Mujer'}</button>
          ))}
        </div>
        <div className="bg-indigo-900/30 p-5 rounded-2xl border border-indigo-500/30 flex justify-between items-center shadow-lg">
          <div>
            <div className="text-indigo-400 font-bold text-sm uppercase tracking-tighter">Grasa Corporal</div>
            <p className="text-[10px] text-slate-500">Estimación Marina EEUU</p>
          </div>
          <div className="text-4xl font-black text-white">{fat || '--'}<span className="text-sm text-indigo-400 ml-1">%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3"><Field label="Altura" field="height" unit="cm" /><Field label="Peso" field="weight" unit="kg" /></div>
        <div className="grid grid-cols-3 gap-3"><Field label="Cuello" field="neck" unit="cm" /><Field label="Abdomen" field="waist" unit="cm" />{p.gender === 'female' && <Field label="Cadera" field="hip" unit="cm" />}</div>
        <div className="grid grid-cols-2 gap-3"><Field label="Pecho" field="chest" unit="cm" /><Field label="Brazos" field="arms" unit="cm" /><Field label="Muslo" field="thigh" unit="cm" />{p.gender === 'male' && <Field label="Cadera" field="hip" unit="cm" />}</div>
        <button onClick={save} disabled={saving} className="w-full bg-indigo-600 py-4 rounded-2xl font-black text-white mt-4 shadow-lg active:scale-95 transition-all">{saving ? 'GUARDANDO...' : 'GUARDAR DATOS'}</button>
      </main>
    </div>
  );
};

const WorkoutView = ({ user, workouts, onBack }: any) => {
  const [date, setDate] = useState(new Date());
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ zone: '', name: '', sets: '', reps: '', weight: '' });
  const [open, setOpen] = useState(false);

  const y = date.getFullYear(), m = date.getMonth();
  const trained = useMemo(() => Object.keys(workouts).filter(k => {
    const [ky, km] = k.split('-').map(Number);
    return ky === y && km === m + 1 && workouts[k]?.length > 0;
  }).length, [workouts, y, m]);

  const add = async () => {
    if (!form.name || !form.weight || !sel || !db) return;
    const item = { id: Date.now(), ...form, weight: parseFloat(form.weight) };
    await setDoc(doc(db, 'workouts', user.uid, 'days', sel), { exercises: [...(workouts[sel] || []), item] });
    setForm({ ...form, sets: '', reps: '', weight: '' });
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Header title="Entrenamiento" onBack={onBack} />
      <main className="max-w-md mx-auto p-4">
        <div className="flex justify-between items-center mb-6 bg-slate-800 p-2 rounded-2xl border border-slate-700">
          <button className="p-2 hover:bg-slate-700 rounded-lg text-white" onClick={() => setDate(new Date(y, m - 1, 1))}><ChevronLeft size={24}/></button>
          <span className="font-black capitalize text-white">{months[m]} {y}</span>
          <button className="p-2 hover:bg-slate-700 rounded-lg text-white" onClick={() => setDate(new Date(y, m + 1, 1))}><ChevronRight size={24}/></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-6">
          {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-[10px] text-slate-500 py-2 font-black">{d}</div>)}
          {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: getDaysInMonth(y, m) }).map((_, i) => {
            const day = i + 1, key = formatDateKey(y, m, day);
            const hasData = workouts[key]?.length > 0;
            return (
              <button key={day} onClick={() => { setSel(key); setOpen(true); }} className={`aspect-square rounded-xl text-sm font-black border transition-all flex items-center justify-center ${hasData ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-slate-800/50 border-transparent text-slate-600 hover:bg-slate-800'}`}>{day}</button>
            );
          })}
        </div>
        <div className="bg-slate-800 rounded-[2rem] p-6 text-center border border-slate-700 shadow-2xl">
          <div className="text-5xl font-black text-emerald-400">{trained}</div>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-2">Días entrenados este mes</p>
        </div>

        {open && sel && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-end animate-in fade-in">
            <div className="bg-slate-900 w-full rounded-t-[2.5rem] p-6 max-h-[90vh] flex flex-col border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-xl text-blue-400 flex items-center gap-2"><CalendarIcon size={20}/> {sel}</h2>
                <button onClick={() => setOpen(false)} className="p-2 bg-slate-800 rounded-full text-white"><X/></button>
              </div>
              <div className="flex-1 overflow-y-auto mb-6 space-y-3 px-1">
                {workouts[sel]?.length > 0 ? workouts[sel].map((ex: any) => (
                  <div key={ex.id} className="bg-slate-800/50 p-4 rounded-2xl flex justify-between items-center border border-slate-700 shadow-sm">
                    <div>
                      <p className="font-black text-slate-100 uppercase text-xs tracking-tight">{ex.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">{ex.sets} series x {ex.reps} reps — <span className="text-orange-400">{ex.weight}kg</span></p>
                    </div>
                    <button onClick={async () => {
                      const upd = workouts[sel].filter((e: any) => e.id !== ex.id);
                      if (db) await setDoc(doc(db, 'workouts', user.uid, 'days', sel), { exercises: upd });
                    }} className="text-slate-600 hover:text-rose-500 p-2"><Trash2 size={18}/></button>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 text-white py-10">
                    <Dumbbell size={64}/>
                    <p className="mt-4 font-black text-xs uppercase tracking-widest">Sin registros</p>
                  </div>
                )}
              </div>
              <div className="space-y-4 bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-inner">
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value, name: ''})} className="w-full bg-slate-900 p-4 rounded-xl text-xs border-none outline-none text-white font-black appearance-none">
                    <option value="">ZONA...</option>{Object.keys(BODY_ZONES).map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                  <select value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-900 p-4 rounded-xl text-xs border-none outline-none text-white font-black appearance-none">
                    <option value="">EJERCICIO...</option>{form.zone && BODY_ZONES[form.zone].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="relative"><span className="absolute -top-2 left-2 text-[8px] bg-slate-800 px-1 text-slate-500 font-black uppercase">Sets</span><input type="number" placeholder="0" value={form.sets} onChange={e=>setForm({...form, sets: e.target.value})} className="bg-slate-900 p-3 rounded-xl text-center w-full font-black text-white border border-slate-700"/></div>
                  <div className="relative"><span className="absolute -top-2 left-2 text-[8px] bg-slate-800 px-1 text-slate-500 font-black uppercase">Reps</span><input type="number" placeholder="0" value={form.reps} onChange={e=>setForm({...form, reps: e.target.value})} className="bg-slate-900 p-3 rounded-xl text-center w-full font-black text-white border border-slate-700"/></div>
                  <div className="relative"><span className="absolute -top-2 left-2 text-[8px] bg-slate-800 px-1 text-slate-500 font-black uppercase">Kg</span><input type="number" placeholder="0" value={form.weight} onChange={e=>setForm({...form, weight: e.target.value})} className="bg-slate-900 p-3 rounded-xl text-center w-full font-black text-white border border-slate-700"/></div>
                </div>
                <button onClick={add} className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-black text-white shadow-xl active:scale-95 transition-all">AÑADIR SERIE</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const FailureView = ({ user, workouts, onBack }: any) => {
  const [list, setList] = useState<any>({});
  const [f, setF] = useState({ name: '', weight: '', reps: '' });

  useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(collection(db, 'failures', user.uid, 'records'), s => {
      const d: any = {}; s.forEach(doc => d[doc.id] = doc.data());
      setList(d);
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Header title="Modo Fallo" subtitle="Personal Records" onBack={onBack} />
      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="bg-rose-900/10 p-6 rounded-[2.5rem] border border-rose-500/20 shadow-xl">
          <h3 className="font-black text-rose-400 mb-4 flex items-center gap-2 italic uppercase tracking-tighter"><Skull size={24}/> Nuevo Récord</h3>
          <div className="space-y-4">
            <select value={f.name} onChange={e => setF({...f, name: e.target.value})} className="w-full bg-slate-900 p-4 rounded-xl text-white outline-none font-black text-xs border border-slate-700">
              <option value="">SELECCIONA EJERCICIO...</option>
              {Array.from(new Set(Object.values(workouts).flat().map((e:any)=>e.name))).map((n:any)=><option key={n} value={n}>{n}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Kg" value={f.weight} onChange={e=>setF({...f, weight: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-center font-black text-white border border-slate-700"/>
              <input type="number" placeholder="Reps" value={f.reps} onChange={e=>setF({...f, reps: e.target.value})} className="bg-slate-900 p-4 rounded-xl text-center font-black text-white border border-slate-700"/>
            </div>
            <button onClick={async () => {
              if (!f.name || !f.weight || !db) return;
              const w = parseFloat(f.weight), r = parseInt(f.reps);
              await setDoc(doc(db, 'failures', user.uid, 'records', f.name), { weight: w, reps: r, date: new Date().toLocaleDateString(), oneRM: Math.round(w * (1 + r / 30)) });
              setF({ name: '', weight: '', reps: '' });
            }} className="w-full bg-rose-600 p-5 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-all">REGISTRAR PR</button>
          </div>
        </div>
        {Object.entries(list).map(([name, d]: any) => (
          <div key={name} className="bg-slate-800 p-5 rounded-2xl flex justify-between border border-slate-700 shadow-lg">
            <div>
              <p className="font-black text-slate-100 uppercase text-sm tracking-tight">{name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{d.date}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-rose-500 text-3xl italic">{d.weight}kg</p>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">1RM Est: {d.oneRM}kg</p>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

const HistoryView = ({ user, workouts, onBack }: any) => {
  const [photos, setPhotos] = useState<any>({});
  const [up, setUp] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const fileRef = useRef<any>(null);
  const selRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(collection(db, 'photos', user.uid, 'monthly'), s => {
      const d: any = {}; s.forEach(doc => d[doc.id] = doc.data());
      setPhotos(d);
    });
    return () => unsub();
  }, [user]);

  const history = useMemo(() => {
    const res = []; const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(), y = d.getFullYear(), total = getDaysInMonth(y, m);
      let count = 0;
      Object.keys(workouts).forEach(k => {
        const [ky, km] = k.split('-').map(Number);
        if (ky === y && km === m + 1 && workouts[k]?.length > 0) count++;
      });
      res.push({ key: `${y}-${m}`, month: months[m], year: y, pct: Math.round((count / total) * 100) });
    }
    return res;
  }, [workouts]);

  return (
    <div className="min-h-screen bg-slate-900 pb-20 text-white">
      <Header title="Historial" subtitle="Constancia y Fotos" onBack={onBack} />
      <main className="max-w-md mx-auto p-4 space-y-4">
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={async e => {
          const f = e.target.files?.[0]; if (!f || !selRef.current || !db) return;
          setUp(selRef.current);
          const b64 = await compressImage(f);
          await setDoc(doc(db, 'photos', user.uid, 'monthly', selRef.current), { image: b64, date: new Date().toLocaleDateString() });
          setUp(null);
        }} />
        {history.map(item => (
          <div key={item.key} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-lg">
            <div><h3 className="font-bold capitalize text-lg">{item.month} {item.year}</h3><div className="text-amber-500 font-black text-xl">{item.pct}% <span className="text-[10px] text-slate-500 font-normal">DIAS ENTRENADOS</span></div></div>
            {photos[item.key] ? (
              <img src={photos[item.key].image} onClick={() => setZoom(photos[item.key].image)} className="w-16 h-16 object-cover rounded-xl border-2 border-slate-600" />
            ) : (
              <button onClick={() => { selRef.current = item.key; fileRef.current?.click(); }} className="w-16 h-16 bg-slate-700/50 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">
                {up === item.key ? <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent animate-spin rounded-full"/> : <Camera size={24}/>}
              </button>
            )}
          </div>
        ))}
      </main>
      {zoom && <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setZoom(null)}><img src={zoom} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" /></div>}
    </div>
  );
};

const ChartsView = ({ workouts, onBack }: any) => {
  const [sel, setSel] = useState('');
  const list = useMemo(() => {
    const n = new Set<string>();
    Object.values(workouts).forEach((dl: any) => dl.forEach((ex: any) => n.add(ex.name)));
    return Array.from(n).sort();
  }, [workouts]);

  const data = useMemo(() => {
    if (!sel) return [];
    return Object.entries(workouts).filter(([d, l]: any) => l.some((ex: any) => ex.name === sel))
      .map(([date, l]: any) => ({ date, weight: Math.max(...l.filter((ex: any) => ex.name === sel).map((ex: any) => ex.weight)) }))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workouts, sel]);

  return (
    <div className="min-h-screen bg-slate-900 pb-20 text-white">
      <Header title="Progreso" subtitle="Carga Progresiva" onBack={onBack} />
      <main className="max-w-md mx-auto p-4">
        <select value={sel} onChange={e => setSel(e.target.value)} className="w-full bg-slate-800 p-4 rounded-xl mb-6 border border-slate-700 outline-none">
          <option value="">Seleccionar ejercicio...</option>{list.map(ex => <option key={ex} value={ex}>{ex}</option>)}
        </select>
        {data.length > 1 ? (
          <div className="bg-slate-800 p-6 rounded-[2rem] h-64 flex items-end justify-between gap-1 border border-slate-700 shadow-inner">
            {data.map((d: any, i) => (
              <div key={i} className="bg-emerald-500 w-full rounded-t-lg relative group" style={{ height: `${(d.weight / Math.max(...data.map((x: any)=>x.weight))) * 100}%` }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] bg-slate-900 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{d.weight}kg</div>
              </div>
            ))}
          </div>
        ) : <div className="text-center py-20 opacity-30 italic"><Activity size={48} className="mx-auto mb-4"/><p>Necesitas al menos dos días de datos para graficar.</p></div>}
      </main>
    </div>
  );
};

// --- App Principal ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState('home'); 
  const [workouts, setWorkouts] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // EFECTO DE SENIOR DEV: Inyectar Tailwind CSS si no está presente en el servidor de StackBlitz
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!isConfigValid || !auth) { 
      setLoading(false); 
      return; 
    }
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { 
        try { 
          await signInAnonymously(auth); 
        } catch(e) {
          console.error("Error Auth:", e);
          setLoading(false);
        } 
      }
      else { 
        setUser(u); 
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !isConfigValid || !db) return;
    const unsub = onSnapshot(collection(db, 'workouts', user.uid, 'days'), s => {
      const d: any = {}; 
      s.forEach(doc => d[doc.id] = doc.data().exercises || []);
      setWorkouts(d); 
      setLoading(false);
    }, (err) => {
      console.error("Error Firestore:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (!isConfigValid) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
      <AlertTriangle size={64} className="text-amber-500 mb-8 animate-bounce" />
      <h1 className="text-3xl font-black mb-4 italic tracking-tighter uppercase">Configuración Pendiente</h1>
      <p className="text-slate-500 text-sm max-w-xs font-bold leading-relaxed">
        Ernesto, para que la app "cobre vida" en tu celular, debes copiar tus llaves de Firebase en la línea 40 del archivo <code className="text-blue-400 bg-slate-900 px-1 rounded font-mono">App.tsx</code>.
      </p>
    </div>
  );

  if (loading && !user) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black italic space-y-4">
      <Dumbbell size={48} className="text-blue-500 animate-spin" />
      <span className="tracking-[0.3em] uppercase text-[10px]">Iniciando Motor GymPro...</span>
    </div>
  );

  const views: any = {
    home: <HomeView onNavigate={setView} />,
    profile: <ProfileView user={user} onBack={() => setView('home')} />,
    workout: <WorkoutView user={user} workouts={workouts} onBack={() => setView('home')} />,
    failure: <FailureView user={user} workouts={workouts} onBack={() => setView('home')} />,
    charts: <ChartsView workouts={workouts} onBack={() => setView('home')} />,
    history: <HistoryView user={user} workouts={workouts} onBack={() => setView('home')} />,
  };

  return (
    <div className="font-sans text-slate-100 min-h-screen bg-slate-900 antialiased selection:bg-blue-600/30">
      <div className="max-w-md mx-auto bg-slate-900 min-h-screen relative shadow-2xl">
        {views[view] || views.home}
      </div>
    </div>
  );
}