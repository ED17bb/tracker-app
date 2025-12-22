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
  <header className="bg-slate-800/90 backdrop-blur-xl border-b border-slate-700/50 p-5 sticky top-0 z-30 w-full shadow-lg">
    <div className="w-full flex items-center gap-5">
      {onBack && (
        <button onClick={onBack} className="bg-slate-700 p-3 rounded-2xl text-white active:scale-90 transition-all shadow-inner">
          <ArrowLeft size={22} />
        </button>
      )}
      <div className="overflow-hidden">
        <h1 className="text-2xl font-black text-white leading-tight truncate tracking-tight">{title}</h1>
        {subtitle && <p className="text-[11px] text-blue-400 uppercase font-black tracking-[0.2em]">{subtitle}</p>}
      </div>
    </div>
  </header>
);

const HomeView = ({ onNavigate }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12 bg-gradient-to-b from-slate-900 to-slate-950">
    <div className="text-center">
      <div className="bg-blue-600 p-8 rounded-[3rem] inline-block mb-6 shadow-[0_20px_50px_rgba(37,99,235,0.3)] animate-pulse">
        <Activity size={64} className="text-white" />
      </div>
      <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">GymPro</h1>
      <p className="text-slate-500 text-[12px] uppercase tracking-[0.5em] font-black mt-3">Elite Training</p>
    </div>
    
    <div className="grid grid-cols-1 w-full gap-5">
      {[
        { id: 'profile', label: 'Mi Perfil', icon: User, color: 'bg-indigo-600', desc: 'Antropometría y Grasa' },
        { id: 'workout', label: 'Entrenamiento', icon: Dumbbell, color: 'bg-blue-600', desc: 'Rutina y Series' },
        { id: 'failure', label: 'Modo Fallo', icon: Skull, color: 'bg-rose-600', desc: 'Récords Personales (PR)' },
        { id: 'charts', label: 'Gráficas', icon: TrendingUp, color: 'bg-emerald-600', desc: 'Análisis de Progreso' },
        { id: 'history', label: 'Historial', icon: History, color: 'bg-amber-600', desc: 'Fotos y Logros' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className="bg-slate-800/40 hover:bg-slate-800 p-6 rounded-[2.5rem] flex items-center gap-6 border border-slate-700/50 active:scale-95 transition-all text-left group shadow-xl"
        >
          <div className={`${item.color} p-4 rounded-3xl text-white shadow-lg group-hover:scale-110 transition-transform`}><item.icon size={28}/></div>
          <div className="flex-1">
            <span className="block font-black text-slate-100 text-xl tracking-tight">{item.label}</span>
            <span className="text-[11px] text-slate-500 uppercase font-black tracking-widest mt-1 opacity-80">{item.desc}</span>
          </div>
          <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={24} />
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
    <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 shadow-sm">
      <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-[0.15em]">{label}</label>
      <div className="flex items-baseline gap-2">
        <input type="number" value={p[field] || ''} onChange={e => setP({...p, [field]: e.target.value})} className="bg-transparent text-white font-black text-3xl w-full outline-none" placeholder="0" />
        <span className="text-xs text-slate-600 font-black uppercase">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-900">
      <Header title="Perfil" subtitle="Antropometría" onBack={onBack} />
      <main className="p-6 space-y-6 w-full">
        <div className="flex bg-slate-800 p-2 rounded-[2rem] border border-slate-700">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => setP({...p, gender: g})} className={`flex-1 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all ${p.gender === g ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>{g === 'male' ? 'Hombre' : 'Mujer'}</button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 p-10 rounded-[3rem] flex justify-between items-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={100}/></div>
          <div className="relative z-10">
            <div className="text-white/80 font-black text-xs uppercase tracking-[0.2em]">Grasa Corporal</div>
            <p className="text-[10px] text-white/40 uppercase font-bold mt-1">Cálculo de la Marina</p>
          </div>
          <div className="text-6xl font-black text-white relative z-10 tracking-tighter">{fat || '--'}<span className="text-xl ml-1 opacity-60">%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-4"><Field label="Altura" field="height" unit="cm" /><Field label="Peso" field="weight" unit="kg" /></div>
        <div className="grid grid-cols-3 gap-4"><Field label="Cuello" field="neck" unit="cm" /><Field label="Abdomen" field="waist" unit="cm" />{p.gender === 'female' && <Field label="Cadera" field="hip" unit="cm" />}</div>
        <div className="grid grid-cols-2 gap-4"><Field label="Pecho" field="chest" unit="cm" /><Field label="Brazos" field="arms" unit="cm" /><Field label="Muslo" field="thigh" unit="cm" />{p.gender === 'male' && <Field label="Cadera" field="hip" unit="cm" />}</div>
        <button onClick={save} disabled={saving} className="w-full bg-indigo-600 py-6 rounded-[2.5rem] font-black text-white mt-4 shadow-[0_20px_40px_rgba(79,70,229,0.3)] active:scale-95 transition-all uppercase tracking-[0.2em] text-sm">{saving ? 'Procesando...' : 'Guardar Perfil'}</button>
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
    <div className="flex-1 flex flex-col bg-slate-900">
      <Header title="Entrenamiento" subtitle="Registro Progresivo" onBack={onBack} />
      <main className="p-6 w-full flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-8 bg-slate-800/80 p-3 rounded-[2rem] border border-slate-700/50 shadow-md">
          <button className="p-4 bg-slate-700/50 rounded-2xl active:scale-90 transition-transform" onClick={() => setDate(new Date(y, m - 1, 1))}><ChevronLeft size={24}/></button>
          <span className="font-black text-white uppercase tracking-[0.3em] text-sm">{months[m]} {y}</span>
          <button className="p-4 bg-slate-700/50 rounded-2xl active:scale-90 transition-transform" onClick={() => setDate(new Date(y, m + 1, 1))}><ChevronRight size={24}/></button>
        </div>
        <div className="grid grid-cols-7 gap-3 text-center mb-10">
          {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-[11px] text-slate-500 font-black uppercase tracking-widest">{d}</div>)}
          {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, i) => <div key={i} />)}
          {Array.from({ length: getDaysInMonth(y, m) }).map((_, i) => {
            const d = i + 1, k = formatDateKey(y, m, d);
            const active = workouts[k]?.length > 0;
            const isToday = new Date().toDateString() === new Date(y, m, d).toDateString();
            return (
              <button 
                key={d} 
                onClick={() => { setSel(k); setOpen(true); }} 
                className={`aspect-square rounded-2xl text-sm font-black transition-all border-2 flex items-center justify-center ${active ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-110 z-10' : isToday ? 'bg-slate-800 border-blue-500 text-blue-400' : 'bg-slate-800/40 border-slate-700/30 text-slate-600 hover:border-slate-500'}`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="bg-slate-800/40 rounded-[3rem] p-12 text-center border border-slate-700/50 shadow-2xl mt-auto">
          <div className="text-8xl font-black text-blue-500 tracking-tighter drop-shadow-2xl">{trained}</div>
          <p className="text-[12px] text-slate-400 uppercase font-black tracking-[0.4em] mt-5">Sesiones este mes</p>
        </div>

        {open && sel && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-end">
            <div className="bg-slate-900 w-full rounded-t-[4rem] p-8 max-h-[95vh] flex flex-col border-t border-slate-700/50 shadow-2xl animate-in slide-in-from-bottom duration-500">
              <div className="flex justify-between items-center mb-8 px-4">
                <h2 className="font-black text-2xl text-blue-400 uppercase tracking-[0.2em]">{sel}</h2>
                <button onClick={() => setOpen(false)} className="p-4 bg-slate-800 rounded-full text-white shadow-xl active:rotate-90 transition-transform"><X size={28}/></button>
              </div>
              <div className="flex-1 overflow-y-auto mb-8 space-y-5 px-4">
                {workouts[sel]?.length > 0 ? workouts[sel].map(ex => (
                  <div key={ex.id} className="bg-slate-800/60 p-6 rounded-[2rem] flex justify-between items-center border border-slate-700 shadow-sm group">
                    <div>
                      <p className="font-black text-slate-100 uppercase text-sm tracking-tight">{ex.name}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-2 tracking-widest">{ex.sets} series x {ex.reps} reps — <span className="text-blue-500 font-black">{ex.weight}kg</span></p>
                    </div>
                    <button onClick={async () => { const upd = workouts[sel].filter(e => e.id !== ex.id); await setDoc(doc(db, 'workouts', user.uid, 'days', sel), { exercises: upd }); }} className="text-slate-600 hover:text-rose-500 p-4 bg-slate-700/30 rounded-2xl transition-all"><Trash2 size={24}/></button>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-24 opacity-5">
                    <Dumbbell size={100} className="text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-6 bg-slate-800 p-8 rounded-[3rem] border border-slate-700/50 shadow-inner">
                {lastWeight && <div className="flex items-center gap-3 bg-blue-500/10 p-3 rounded-2xl text-[11px] text-blue-300 font-black uppercase tracking-wider border border-blue-500/20"><Info size={18} /><span>Récord anterior: {lastWeight.weight}kg</span></div>}
                <div className="grid grid-cols-2 gap-4">
                  <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value, name: ''})} className="bg-slate-900 p-5 rounded-2xl text-sm text-white font-black border-none appearance-none shadow-md cursor-pointer"><option value="">Zona Muscular...</option>{Object.keys(BODY_ZONES).map(z => <option key={z} value={z}>{z}</option>)}</select>
                  <select value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-sm text-white font-black border-none appearance-none shadow-md cursor-pointer"><option value="">Ejercicio...</option>{form.zone && BODY_ZONES[form.zone].map(e => <option key={e} value={e}>{e}</option>)}</select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="relative"><input type="number" placeholder="Sets" value={form.sets} onChange={e=>setForm({...form, sets: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-center font-black text-white w-full text-lg"/><span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase bg-slate-900 px-2 font-black text-slate-500">Series</span></div>
                  <div className="relative"><input type="number" placeholder="Reps" value={form.reps} onChange={e=>setForm({...form, reps: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-center font-black text-white w-full text-lg"/><span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase bg-slate-900 px-2 font-black text-slate-500">Reps</span></div>
                  <div className="relative"><input type="number" placeholder="Kg" value={form.weight} onChange={e=>setForm({...form, weight: e.target.value})} className="bg-slate-900 p-5 rounded-2xl text-center font-black text-white w-full text-lg"/><span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase bg-slate-900 px-2 font-black text-slate-500">Kilos</span></div>
                </div>
                <button onClick={add} className="w-full bg-blue-600 py-6 rounded-[2.5rem] font-black text-white shadow-[0_15px_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-[0.3em] text-sm">Añadir Serie</button>
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
    <div className="flex-1 flex flex-col bg-slate-900">
      <Header title="Evolución" subtitle="Progreso de Cargas" onBack={onBack} />
      <main className="p-6 w-full flex-1 flex flex-col">
        <div className="relative">
          <select value={sel} onChange={e => setSel(e.target.value)} className="w-full bg-slate-800 p-7 rounded-[2.5rem] mb-10 font-black text-white border border-slate-700/50 appearance-none shadow-2xl tracking-[0.1em] text-sm"><option value="">Selecciona un Ejercicio...</option>{list.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
          <div className="absolute right-6 top-1/2 -translate-y-[calc(50%+20px)] pointer-events-none text-slate-500"><ChevronRight size={20}/></div>
        </div>
        {data.length > 1 ? (
          <div className="bg-slate-800/30 p-12 rounded-[4rem] flex-1 min-h-[400px] flex items-end justify-between gap-3 border border-slate-700/50 shadow-inner overflow-x-auto custom-scrollbar">
            {data.map((d, i) => (
              <div key={i} className="bg-blue-500 min-w-[18px] w-full rounded-t-full relative group transition-all cursor-pointer hover:bg-blue-400" style={{ height: `${(d.weight / Math.max(...data.map(x=>x.weight))) * 100}%` }}>
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 text-xs bg-slate-950 p-3 rounded-2xl font-black border border-slate-700 opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100 whitespace-nowrap shadow-2xl z-20">{d.weight} kg</div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-500 rotate-45 whitespace-nowrap uppercase tracking-tighter">{d.date.split('-').slice(1).join('/')}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-center flex-1 flex flex-col items-center justify-center opacity-10 italic font-black text-white"><Activity size={120} className="mb-8"/><p className="uppercase tracking-[0.4em] text-[12px]">Sin registros suficientes para graficar</p></div>}
      </main>
    </div>
  );
};

const FailureView = ({ user, workouts, onBack }) => {
  const [list, setList] = useState({});
  const [f, setF] = useState({ name: '', weight: '', reps: '' });
  useEffect(() => { if (user && db) onSnapshot(collection(db, 'failures', user.uid, 'records'), s => { const d = {}; s.forEach(doc => d[doc.id] = doc.data()); setList(d); }); }, [user]);
  return (
    <div className="flex-1 flex flex-col bg-slate-900">
      <Header title="Modo Fallo" subtitle="Récords Personales" onBack={onBack} />
      <main className="p-6 space-y-8 w-full flex-1">
        <div className="bg-rose-950/20 p-10 rounded-[4rem] border border-rose-500/30 shadow-[0_25px_60px_rgba(225,29,72,0.15)]">
          <h3 className="font-black text-rose-500 mb-8 flex items-center gap-3 uppercase tracking-tighter text-lg italic"><Skull size={28}/> Registrar Nuevo PR</h3>
          <div className="space-y-5">
            <select value={f.name} onChange={e => setF({...f, name: e.target.value})} className="w-full bg-slate-900 p-5 rounded-[1.5rem] text-white outline-none font-black text-xs border-none appearance-none shadow-md"><option value="">Selecciona Ejercicio...</option>{Array.from(new Set(Object.values(workouts).flat().map(e=>e.name))).map(n=><option key={n} value={n}>{n}</option>)}</select>
            <div className="grid grid-cols-2 gap-5"><input type="number" placeholder="Peso (Kg)" value={f.weight} onChange={e=>setF({...f, weight: e.target.value})} className="bg-slate-900 p-5 rounded-[1.5rem] text-center font-black text-white border-none text-xl"/><input type="number" placeholder="Repeticiones" value={f.reps} onChange={e=>setF({...f, reps: e.target.value})} className="bg-slate-900 p-5 rounded-[1.5rem] text-center font-black text-white border-none text-xl"/></div>
            <button onClick={async () => { if (f.name && f.weight && db) { const w = parseFloat(f.weight), r = parseInt(f.reps); await setDoc(doc(db, 'failures', user.uid, 'records', f.name), { weight: w, reps: r, date: new Date().toLocaleDateString(), oneRM: Math.round(w * (1 + r / 30)) }); setF({ name: '', weight: '', reps: '' }); } }} className="w-full bg-rose-600 py-6 rounded-[2.5rem] font-black text-white shadow-xl active:scale-95 transition-all uppercase tracking-[0.3em] text-sm mt-4">Guardar Record</button>
          </div>
        </div>
        <div className="space-y-5 flex-1">
          {Object.entries(list).map(([name, d]) => (
            <div key={name} className="bg-slate-800/60 p-8 rounded-[3rem] flex justify-between border border-slate-700/50 shadow-2xl items-center transform hover:scale-[1.02] transition-transform">
              <div><p className="font-black text-slate-100 uppercase text-base tracking-tight">{name}</p><p className="text-[11px] text-slate-500 font-black uppercase mt-2 tracking-widest">{d.date}</p></div>
              <div className="text-right"><p className="font-black text-rose-500 text-5xl italic tracking-tighter leading-none">{d.weight} <span className="text-sm">kg</span></p><p className="text-[11px] text-emerald-500 font-black uppercase mt-3 tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full inline-block">1RM Est: {d.oneRM}kg</p></div>
            </div>
          ))}
        </div>
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
    <div className="flex-1 flex flex-col bg-slate-900">
      <Header title="Historial" subtitle="Constancia Visual" onBack={onBack} />
      <main className="p-6 space-y-6 w-full flex-1 overflow-y-auto">
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f && selRef.current && db) { setUp(selRef.current); const b64 = await compressImage(f); await setDoc(doc(db, 'photos', user.uid, 'monthly', selRef.current), { image: b64, date: new Date().toLocaleDateString() }); setUp(null); } }} />
        {history.map(item => (
          <div key={item.key} className="bg-slate-800/80 p-8 rounded-[3.5rem] border border-slate-700/50 flex justify-between items-center shadow-2xl group transition-all">
            <div>
              <h3 className="font-black text-white text-2xl tracking-tighter uppercase italic">{item.month} {item.year}</h3>
              <div className="flex items-center gap-3 mt-2">
                <div className="text-amber-500 font-black text-3xl">{item.pct}%</div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] leading-tight">Meta Mensual<br/>Alcanzada</div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              {photos[item.key] ? (
                <div className="relative group cursor-pointer" onClick={() => setZoom(photos[item.key].image)}>
                  <img src={photos[item.key].image} className="w-28 h-28 object-cover rounded-[2.5rem] border-4 border-slate-700 shadow-[0_15px_30px_rgba(0,0,0,0.5)] active:scale-90 transition-transform" alt="Progress" />
                  <div className="absolute inset-0 bg-blue-600/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Activity className="text-white" size={30}/></div>
                </div>
              ) : (
                <button onClick={() => { selRef.current = item.key; fileRef.current?.click(); }} className="w-28 h-28 bg-slate-700/30 rounded-[2.5rem] border-4 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-600 hover:text-amber-500 hover:border-amber-500/50 transition-all group active:scale-95">
                  {up === item.key ? <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent animate-spin rounded-full"/> : <><Camera size={36}/><span className="text-[8px] font-black uppercase mt-2 tracking-widest">Añadir Foto</span></>}
                </button>
              )}
            </div>
          </div>
        ))}
      </main>
      {zoom && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setZoom(null)}>
          <button className="absolute top-10 right-10 text-white bg-slate-800 p-5 rounded-full shadow-2xl border border-slate-700"><X size={32}/></button>
          <img src={zoom} className="max-w-full max-h-[80vh] rounded-[3rem] shadow-[0_0_100px_rgba(37,99,235,0.2)] border border-slate-700 transform animate-in zoom-in duration-300" alt="Zoom" />
          <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-xs mt-10">Toca para cerrar</p>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [workouts, setWorkouts] = useState({});
  const [loading, setLoading] = useState(true);

  // Inyectar Tailwind CSS CDN para asegurar que todos los estilos funcionen
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
      const d = {}; s.forEach(doc => d[doc.id] = doc.data().exercises || []);
      setWorkouts(d); setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  if (!isConfigValid) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
      <AlertTriangle size={80} className="text-amber-500 mb-10 animate-bounce" />
      <h1 className="text-3xl font-black mb-6 uppercase tracking-tighter italic">Error de Enlace</h1>
      <p className="text-slate-500 text-sm max-w-xs leading-relaxed font-bold uppercase tracking-widest">Ernesto, asegúrate de haber pegado tus credenciales de Firebase en el código de App.jsx.</p>
    </div>
  );

  if (loading && !user) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black italic space-y-6">
      <div className="relative">
        <Dumbbell size={80} className="text-blue-500 animate-spin" />
        <Activity size={30} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <span className="tracking-[0.6em] uppercase text-[12px] font-black opacity-50">Cargando GymPro...</span>
    </div>
  );

  const views = {
    home: <HomeView onNavigate={setView} />,
    profile: <ProfileView user={user} onBack={() => setView('home')} />,
    workout: <WorkoutView user={user} workouts={workouts} onBack={() => setView('home')} />,
    failure: <FailureView user={user} workouts={workouts} onBack={() => setView('home')} />,
    charts: <ChartsView workouts={workouts} onBack={() => setView('home')} />,
    history: <HistoryView user={user} workouts={workouts} onBack={() => setView('home')} />,
  };

  return (
    <div className="font-sans text-slate-100 min-h-screen bg-slate-900 selection:bg-blue-600/30 flex flex-col overflow-x-hidden antialiased">
      {/* El contenedor ahora ocupa el 100% del ancho siempre */}
      <div className="flex-1 w-full flex flex-col">
        {views[view] || views.home}
      </div>
    </div>
  );
}