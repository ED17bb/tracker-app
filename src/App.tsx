import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Dumbbell, 
  Calendar as CalendarIcon, 
  X,
  TrendingUp,
  User,
  Activity,
  Skull, 
  ArrowLeft,
  History,
  Camera,
  AlertTriangle,
  Info
} from 'lucide-react';

// Firebase Imports
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
  onSnapshot 
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


const isConfigValid = firebaseConfig.apiKey !== "TU_API_KEY";

let app, auth, db;
if (isConfigValid) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const BODY_ZONES = {
  "Pecho": ["Press Banca", "Press Inclinado", "Aperturas", "Flexiones", "Cruce de Poleas"],
  "Espalda": ["Dominadas", "Remo con Barra", "Jalón al Pecho", "Remo Gironda", "Peso Muerto"],
  "Piernas": ["Sentadilla", "Prensa", "Extensiones de Cuádriceps", "Curl Femoral", "Gemelos"],
  "Brazos": ["Curl con Barra", "Curl Martillo", "Extensiones de Tríceps", "Press Francés"],
  "Antebrazos": ["Curl de Muñeca", "Curl Inverso", "Paseo del Granjero"],
  "Abdomen": ["Crunch", "Plancha", "Elevación de Piernas", "Rueda Abdominal"]
};

const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
const formatDateKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        const scale = MAX / img.width;
        canvas.width = MAX;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

const Header = ({ title, subtitle, onBack }) => (
  <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 p-4 sticky top-0 z-30 w-full">
    <div className="max-w-md mx-auto flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="bg-slate-700 p-2 rounded-full text-white active:scale-90 transition-transform">
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="overflow-hidden">
        <h1 className="text-xl font-bold text-white leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{subtitle}</p>}
      </div>
    </div>
  </header>
);

const HomeView = ({ onNavigate }) => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 space-y-8">
    <div className="text-center">
      <div className="bg-blue-600 p-5 rounded-[2rem] inline-block mb-4 shadow-2xl shadow-blue-500/20 animate-pulse">
        <Activity size={48} className="text-white" />
      </div>
      <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">GymPro</h1>
      <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-bold">Fuerza Progresiva</p>
    </div>
    
    <div className="grid grid-cols-1 w-full max-w-sm gap-3">
      {[
        { id: 'profile', label: 'Mi Perfil', icon: User, color: 'bg-indigo-600', desc: 'Antropometría' },
        { id: 'workout', label: 'Entrenamiento', icon: Dumbbell, color: 'bg-blue-600', desc: 'Registro diario' },
        { id: 'failure', label: 'Modo Fallo', icon: Skull, color: 'bg-rose-600', desc: 'Récords (PR)' },
        { id: 'charts', label: 'Gráficas', icon: TrendingUp, color: 'bg-emerald-600', desc: 'Evolución' },
        { id: 'history', label: 'Historial', icon: History, color: 'bg-amber-600', desc: 'Fotos y Meses' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className="bg-slate-800/50 hover:bg-slate-800 p-4 rounded-3xl flex items-center gap-4 border border-slate-700/50 active:scale-95 transition-all text-left group"
        >
          <div className={`${item.color} p-3 rounded-2xl text-white shadow-lg group-hover:rotate-6 transition-transform`}><item.icon size={20}/></div>
          <div>
            <span className="block font-bold text-slate-100">{item.label}</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{item.desc}</span>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const ProfileView = ({ user, onBack }) => {
  const [p, setP] = useState({ gender: 'male', height: '', weight: '', neck: '', waist: '', hip: '', chest: '', arms: '', thigh: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && db) getDoc(doc(db, 'profile', user.uid)).then(s => s.exists() && setP(s.data()));
  }, [user]);

  const fat = useMemo(() => {
    const { gender, height, neck, waist, hip } = p;
    const h = parseFloat(height), n = parseFloat(neck), w = parseFloat(waist), hi = parseFloat(hip);
    if (!h || !n || !w) return null;
    if (gender === 'male') return (495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.1554 * Math.log10(h)) - 450).toFixed(1);
    return hi ? (495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.22100 * Math.log10(h)) - 450).toFixed(1) : null;
  }, [p]);

  const save = async () => {
    if (user && db) { setSaving(true); await setDoc(doc(db, 'profile', user.uid), { ...p, calculatedFat: fat }); setSaving(false); }
  };

  const Field = ({ label, field, unit }) => (
    <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
      <label className="text-[9px] text-slate-500 uppercase font-black mb-1 block tracking-widest">{label}</label>
      <div className="flex items-baseline gap-1">
        <input type="number" value={p[field] || ''} onChange={e => setP({...p, [field]: e.target.value})} className="bg-transparent text-white font-bold text-xl w-full outline-none" placeholder="0" />
        <span className="text-[10px] text-slate-600 font-black uppercase">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Header title="Perfil" subtitle="Antropometría" onBack={onBack} />
      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => setP({...p, gender: g})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${p.gender === g ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>{g === 'male' ? 'Hombre' : 'Mujer'}</button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-6 rounded-[2.5rem] flex justify-between items-center shadow-xl">
          <div>
            <div className="text-white/70 font-black text-[10px] uppercase tracking-widest">Grasa Corporal</div>
            <p className="text-[9px] text-white/50 uppercase font-bold">Cálculo Navy EEUU</p>
          </div>
          <div className="text-4xl font-black text-white">{fat || '--'}<span className="text-sm ml-1 opacity-50">%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3"><Field label="Altura" field="height" unit="cm" /><Field label="Peso" field="weight" unit="kg" /></div>
        <div className="grid grid-cols-3 gap-3"><Field label="Cuello" field="neck" unit="cm" /><Field label="Abdomen" field="waist" unit="cm" />{p.gender === 'female' && <Field label="Cadera" field="hip" unit="cm" />}</div>
        <div className="grid grid-cols-2 gap-3"><Field label="Pecho" field="chest" unit="cm" /><Field label="Brazos" field="arms" unit="cm" /><Field label="Muslo" field="thigh" unit="cm" />{p.gender === 'male' && <Field label="Cadera" field="hip" unit="cm" />}</div>
        <button onClick={save} disabled={saving} className="w-full bg-indigo-600 py-5 rounded-[2rem] font-black text-white mt-4 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">{saving ? 'Guardando...' : 'Guardar Datos'}</button>
      </main>
    </div>
  );
};

const WorkoutView = ({ user, workouts, onBack }) => {
  const [date, setDate] = useState(new Date());
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({ zone: '', name: '', sets: '', reps: '', weight: '' });
  const [open, setOpen] = useState(false);

  const y = date.getFullYear(), m = date.getMonth();
  const trained = useMemo(() => Object.keys(workouts).filter(k => {
    const [ky, km] = k.split('-').map(Number);
    return ky === y && km === m + 1 && workouts[k]?.length > 0;
  }).length, [workouts, y, m]);

  const lastWeight = useMemo(() => {
    if (!form.name) return null;
    const entries = Object.entries(workouts).filter(([dk, d]) => dk !== sel && d.some(ex => ex.name === form.name)).sort((a,b) => b[0].localeCompare(a[0]));
    if (entries.length > 0) {
      const lastEx = entries[0][1].find(ex => ex.name === form.name);
      return { weight: lastEx.weight, date: entries[0][0] };
    }
    return null;
  }, [form.name, workouts, sel]);

  const add = async () => {
    if (!form.name || !form.weight || !sel || !db) return;
    const item = { id: Date.now(), ...form, weight: parseFloat(form.weight) };
    await setDoc(doc(db, 'workouts', user.uid, 'days', sel), { exercises: [...(workouts[sel] || []), item] });
    setForm({ ...form, sets: '', reps: '', weight: '' });
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Header title="Entrenamiento" subtitle="Registro Diario" onBack={onBack} />
      <main className="max-w-md mx-auto p-4">
        <div className="flex justify-between items-center mb-6 bg-slate-800 p-2 rounded-2xl border border-slate-700">
          <button className="p-2" onClick={() => setDate(new Date(y, m - 1, 1))}><ChevronLeft/></button>
          <span className="font-black text-white uppercase tracking-widest text-xs">{months[m]} {y}</span>
          <button className="p-2" onClick={() => setDate(new Date(y, m + 1, 1))}><ChevronRight/></button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center mb-6">
          {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-[10px] text-slate-500 font-black">{d}</div>)}
          {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, i) => <div key={i} />)}
          {Array.from({ length: getDaysInMonth(y, m) }).map((_, i) => {
            const d = i + 1, k = formatDateKey(y, m, d);
            const active = workouts[k]?.length > 0;
            return <button key={d} onClick={() => { setSel(k); setOpen(true); }} className={`aspect-square rounded-2xl text-xs font-black transition-all border ${active ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700/50 text-slate-600'}`}>{d}</button>;
          })}
        </div>
        <div className="bg-slate-800/50 rounded-[2.5rem] p-8 text-center border border-slate-700 shadow-xl">
          <div className="text-5xl font-black text-blue-500">{trained}</div>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-3">Días entrenados este mes</p>
        </div>

        {open && sel && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-end">
            <div className="bg-slate-900 w-full rounded-t-[3rem] p-6 max-h-[92vh] flex flex-col border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-blue-400 uppercase tracking-widest">{sel}</h2>
                <button onClick={() => setOpen(false)} className="p-3 bg-slate-800 rounded-full text-white"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto mb-6 space-y-3">
                {workouts[sel]?.map(ex => (
                  <div key={ex.id} className="bg-slate-800/80 p-4 rounded-2xl flex justify-between items-center border border-slate-700">
                    <div>
                      <p className="font-black text-slate-100 uppercase text-xs tracking-tight">{ex.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{ex.sets}x{ex.reps} — <span className="text-blue-400">{ex.weight}kg</span></p>
                    </div>
                    <button onClick={async () => { const upd = workouts[sel].filter(e => e.id !== ex.id); await setDoc(doc(db, 'workouts', user.uid, 'days', sel), { exercises: upd }); }} className="text-slate-600 p-2"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
              <div className="space-y-4 bg-slate-800 p-6 rounded-[2.5rem] border border-slate-700">
                {lastWeight && <div className="flex items-center gap-2 bg-blue-900/30 p-2 rounded-xl text-[10px] text-blue-300 font-black uppercase"><Info size={14} /><span>Último: {lastWeight.weight}kg ({lastWeight.date})</span></div>}
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value, name: ''})} className="bg-slate-900 p-4 rounded-2xl text-xs text-white font-black border-none"><option value="">Zona...</option>{Object.keys(BODY_ZONES).map(z => <option key={z} value={z}>{z}</option>)}</select>
                  <select value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-slate-900 p-4 rounded-2xl text-xs text-white font-black border-none"><option value="">Ejercicio...</option>{form.zone && BODY_ZONES[form.zone].map(e => <option key={e} value={e}>{e}</option>)}</select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" placeholder="S" value={form.sets} onChange={e=>setForm({...form, sets: e.target.value})} className="bg-slate-900 p-4 rounded-2xl text-center font-black text-white"/>
                  <input type="number" placeholder="R" value={form.reps} onChange={e=>setForm({...form, reps: e.target.value})} className="bg-slate-900 p-4 rounded-2xl text-center font-black text-white"/>
                  <input type="number" placeholder="Kg" value={form.weight} onChange={e=>setForm({...form, weight: e.target.value})} className="bg-slate-900 p-4 rounded-2xl text-center font-black text-white"/>
                </div>
                <button onClick={add} className="w-full bg-blue-600 py-5 rounded-[2rem] font-black text-white shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">Añadir Serie</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const ChartsView = ({ workouts, onBack }) => {
  const [sel, setSel] = useState('');
  const list = useMemo(() => { const n = new Set(); Object.values(workouts).forEach(dl => dl.forEach(ex => n.add(ex.name))); return Array.from(n).sort(); }, [workouts]);
  const data = useMemo(() => {
    if (!sel) return [];
    return Object.entries(workouts).filter(([, l]) => l.some(ex => ex.name === sel)).map(([date, l]) => ({ date, weight: Math.max(...l.filter(ex => ex.name === sel).map(ex => ex.weight)) })).sort((a,b) => a.date.localeCompare(b.date));
  }, [workouts, sel]);
  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Header title="Evolución" subtitle="Progreso de Cargas" onBack={onBack} />
      <main className="max-w-md mx-auto p-4">
        <select value={sel} onChange={e => setSel(e.target.value)} className="w-full bg-slate-800 p-5 rounded-[2rem] mb-6 font-black text-white border border-slate-700 appearance-none shadow-xl tracking-widest text-xs"><option value="">Selecciona Ejercicio...</option>{list.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
        {data.length > 1 ? (
          <div className="bg-slate-800/50 p-8 rounded-[3rem] h-80 flex items-end justify-between gap-2 border border-slate-700 shadow-inner overflow-x-auto">
            {data.map((d, i) => (<div key={i} className="bg-blue-500 min-w-[12px] w-full rounded-t-full relative group transition-all" style={{ height: `${(d.weight / Math.max(...data.map(x=>x.weight))) * 100}%` }}><div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] bg-slate-900 p-2 rounded-xl font-black border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-2xl">{d.weight}kg</div></div>))}
          </div>
        ) : <div className="text-center py-20 opacity-20 italic font-black text-white"><Activity size={64} className="mx-auto mb-4"/><p className="uppercase tracking-[0.2em] text-[10px]">Datos insuficientes</p></div>}
      </main>
    </div>
  );
};

const FailureView = ({ user, workouts, onBack }) => {
  const [list, setList] = useState({});
  const [f, setF] = useState({ name: '', weight: '', reps: '' });
  useEffect(() => { if (user && db) onSnapshot(collection(db, 'failures', user.uid, 'records'), s => { const d = {}; s.forEach(doc => d[doc.id] = doc.data()); setList(d); }); }, [user]);
  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Header title="Modo Fallo" subtitle="Récords Personales" onBack={onBack} />
      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="bg-rose-950/20 p-6 rounded-[2.5rem] border border-rose-500/20 shadow-xl">
          <h3 className="font-black text-rose-500 mb-4 flex items-center gap-2 uppercase tracking-tighter text-sm"><Skull size={20}/> Nuevo PR</h3>
          <div className="space-y-4">
            <select value={f.name} onChange={e => setF({...f, name: e.target.value})} className="w-full bg-slate-900 p-4 rounded-2xl text-white outline-none font-black text-xs border-none"><option value="">Ejercicio...</option>{Array.from(new Set(Object.values(workouts).flat().map(e=>e.name))).map(n=><option key={n} value={n}>{n}</option>)}</select>
            <div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Kg" value={f.weight} onChange={e=>setF({...f, weight: e.target.value})} className="bg-slate-900 p-4 rounded-2xl text-center font-black text-white border-none"/><input type="number" placeholder="Reps" value={f.reps} onChange={e=>setF({...f, reps: e.target.value})} className="bg-slate-900 p-4 rounded-2xl text-center font-black text-white border-none"/></div>
            <button onClick={async () => { if (f.name && f.weight && db) { const w = parseFloat(f.weight), r = parseInt(f.reps); await setDoc(doc(db, 'failures', user.uid, 'records', f.name), { weight: w, reps: r, date: new Date().toLocaleDateString(), oneRM: Math.round(w * (1 + r / 30)) }); setF({ name: '', weight: '', reps: '' }); } }} className="w-full bg-rose-600 p-5 rounded-[2rem] font-black text-white shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs">Registrar PR</button>
          </div>
        </div>
        {Object.entries(list).map(([name, d]) => (
          <div key={name} className="bg-slate-800/80 p-5 rounded-3xl flex justify-between border border-slate-700 shadow-lg items-center"><div><p className="font-black text-slate-100 uppercase text-xs tracking-tight">{name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{d.date}</p></div><div className="text-right"><p className="font-black text-rose-500 text-3xl italic">{d.weight}kg</p><p className="text-[10px] text-emerald-500 font-black">1RM: {d.oneRM}kg</p></div></div>
        ))}
      </main>
    </div>
  );
};

const HistoryView = ({ user, workouts, onBack }) => {
  const [photos, setPhotos] = useState({});
  const [up, setUp] = useState(null);
  const [zoom, setZoom] = useState(null);
  const fileRef = useRef(null);
  const selRef = useRef(null);
  useEffect(() => { if (user && db) onSnapshot(collection(db, 'photos', user.uid, 'monthly'), s => { const d = {}; s.forEach(doc => d[doc.id] = doc.data()); setPhotos(d); }); }, [user]);
  const history = useMemo(() => {
    const res = []; const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(), y = d.getFullYear(), total = getDaysInMonth(y, m);
      let count = 0;
      Object.keys(workouts).forEach(k => { const [ky, km] = k.split('-').map(Number); if (ky === y && km === m + 1 && workouts[k]?.length > 0) count++; });
      res.push({ key: `${y}-${m}`, month: months[m], year: y, pct: Math.round((count / total) * 100) });
    }
    return res;
  }, [workouts]);
  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Header title="Historial" subtitle="Constancia Visual" onBack={onBack} />
      <main className="max-w-md mx-auto p-4 space-y-4">
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f && selRef.current && db) { setUp(selRef.current); const b64 = await compressImage(f); await setDoc(doc(db, 'photos', user.uid, 'monthly', selRef.current), { image: b64, date: new Date().toLocaleDateString() }); setUp(null); } }} />
        {history.map(item => (
          <div key={item.key} className="bg-slate-800 p-5 rounded-[2rem] border border-slate-700 flex justify-between items-center shadow-lg"><div><h3 className="font-black text-white text-lg tracking-tighter uppercase italic">{item.month} {item.year}</h3><div className="text-amber-500 font-black text-xl">{item.pct}% <span className="text-[9px] text-slate-500 font-black uppercase">Cumplido</span></div></div><div className="flex flex-col items-end">{photos[item.key] ? <img src={photos[item.key].image} onClick={() => setZoom(photos[item.key].image)} className="w-20 h-20 object-cover rounded-[1.5rem] border-2 border-slate-600 shadow-xl" alt="Progress" /> : <button onClick={() => { selRef.current = item.key; fileRef.current?.click(); }} className="w-20 h-20 bg-slate-700/30 rounded-[1.5rem] border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">{up === item.key ? <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent animate-spin rounded-full"/> : <Camera size={24}/>}</button>}</div></div>
        ))}
      </main>
      {zoom && <div className="fixed inset-0 z-50 bg-black/98 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setZoom(null)}><img src={zoom} className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-slate-700" alt="Zoom" /></div>}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [workouts, setWorkouts] = useState({});
  const [loading, setLoading] = useState(true);

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
      const d = {}; s.forEach(doc => d[doc.id] = doc.data().exercises || []);
      setWorkouts(d); setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  if (!isConfigValid) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white"><AlertTriangle size={64} className="text-amber-500 mb-8 animate-bounce" /><h1 className="text-2xl font-black mb-4 uppercase">Falta Configuración</h1><p className="text-slate-500 text-sm">Ernesto, pon tus llaves de Firebase en el código.</p></div>;

  if (loading && !user) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black italic space-y-4"><Dumbbell size={48} className="text-blue-500 animate-spin" /><span className="tracking-[0.3em] uppercase text-[10px]">Iniciando Motor...</span></div>;

  const views = {
    home: <HomeView onNavigate={setView} />,
    profile: <ProfileView user={user} onBack={() => setView('home')} />,
    workout: <WorkoutView user={user} workouts={workouts} onBack={() => setView('home')} />,
    failure: <FailureView user={user} workouts={workouts} onBack={() => setView('home')} />,
    charts: <ChartsView workouts={workouts} onBack={() => setView('home')} />,
    history: <HistoryView user={user} workouts={workouts} onBack={() => setView('home')} />,
  };

  return (
    <div className="font-sans text-slate-100 min-h-screen bg-slate-900 selection:bg-blue-600/30">
      <div className="max-w-md mx-auto min-h-screen shadow-2xl border-x border-slate-800/50">
        {views[view] || views.home}
      </div>
    </div>
  );
}