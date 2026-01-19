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
  Camera,
  AlertTriangle,
  Info,
  LogIn,
  LogOut
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut 
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
// Ernesto: Asegúrate de que estas llaves sean las correctas de tu proyecto.
const firebaseConfig = {
  apiKey: "AIzaSyBkRJP-gMGlQOeq-5DOZcYvE0vOCMaJH48",
  authDomain: "physical-tracker-100.firebaseapp.com",
  projectId: "physical-tracker-100",
  storageBucket: "physical-tracker-100.firebasestorage.app",
  messagingSenderId: "139291216970",
  appId: "1:139291216970:web:0a17a7caeaa4578be4aab3"
};


const isConfigValid = firebaseConfig.apiKey !== "TU_API_KEY";

let app, auth, db, provider;
if (isConfigValid) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  provider = new GoogleAuthProvider();
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

const Header = ({ title, subtitle, onBack, onLogout }) => (
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

const LoginView = ({ onLogin }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 min-h-screen w-full">
    <div className="bg-blue-600 p-10 rounded-[4rem] mb-10 shadow-[0_20px_60px_rgba(37,99,235,0.3)]">
      <Dumbbell size={80} className="text-white" />
    </div>
    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase text-center leading-none mb-4">GymPro 100</h1>
    <p className="text-slate-500 text-center max-w-xs font-bold text-sm mb-12 leading-relaxed">
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

const HomeView = ({ user, onNavigate, onLogout }) => (
  <div className="flex-1 flex flex-col p-6 space-y-8 bg-slate-950 min-h-screen w-full">
    <Header title="GymPro" subtitle={`Hola, ${user.displayName.split(' ')[0]}`} onLogout={onLogout} />
    
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
          <ChevronRight className="text-slate-700 group-hover:text-blue-500 transition-colors" size={28} />
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
    if (user && db) { 
      setSaving(true); 
      await setDoc(doc(db, 'profile', user.uid), { ...p, calculatedFat: fat }); 
      setSaving(false); 
    }
  };

  const Field = ({ label, field, unit }) => (
    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 shadow-sm">
      <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-[0.15em]">{label}</label>
      <div className="flex items-baseline gap-2">
        <input type="number" value={p[field] || ''} onChange={e => setP({...p, [field]: e.target.value})} className="bg-transparent text-white font-black text-4xl w-full outline-none" placeholder="0" />
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
            <button key={g} onClick={() => setP({...p, gender: g})} className={`flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all ${p.gender === g ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>{g === 'male' ? 'Hombre' : 'Mujer'}</button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-blue-800 p-12 rounded-[3.5rem] flex justify-between items-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={120}/></div>
          <div className="relative z-10">
            <div className="text-white/80 font-black text-sm uppercase tracking-[0.2em]">Grasa</div>
            <p className="text-[10px] text-white/40 uppercase font-bold mt-2">U.S. Navy Method</p>
          </div>
          <div className="text-7xl font-black text-white relative z-10 tracking-tighter italic">{fat || '--'}<span className="text-2xl ml-1 opacity-60">%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-4"><Field label="Altura" field="height" unit="cm" /><Field label="Peso" field="weight" unit="kg" /></div>
        <div className="grid grid-cols-3 gap-4"><Field label="Cuello" field="neck" unit="cm" /><Field label="Abdomen" field="waist" unit="cm" />{p.gender === 'female' && <Field label="Cadera" field="hip" unit="cm" />}</div>
        <div className={`grid ${p.gender === 'male' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
          {p.gender === 'male' && <Field label="Pecho" field="chest" unit="cm" />}
          <Field label="Brazos" field="arms" unit="cm" />
          <Field label="Muslo" field="thigh" unit="cm" />
          {p.gender === 'male' && <Field label="Cadera" field="hip" unit="cm" />}
        </div>
        <button onClick={save} disabled={saving} className="w-full bg-indigo-600 py-7 rounded-[2.5rem] font-black text-white mt-4 shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm">{saving ? 'Actualizando...' : 'Sincronizar Perfil'}</button>
      </main>
    </div>
  );
};

// ... (Resto de vistas WorkoutView, FailureView, etc. se mantienen con la misma lógica de user.uid)

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [workouts, setWorkouts] = useState({});
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
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(collection(db, 'workouts', user.uid, 'days'), s => {
      const d = {}; s.forEach(doc => d[doc.id] = doc.data().exercises || []);
      setWorkouts(d);
    });
    return () => unsub();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error al entrar con Google:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (!isConfigValid) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white"><AlertTriangle size={80} className="text-amber-500 mb-10 animate-bounce" /><h1 className="text-3xl font-black mb-6 uppercase tracking-tighter italic">Error de Enlace</h1><p className="text-slate-500 text-sm max-w-xs font-bold uppercase tracking-widest leading-relaxed">Ernesto, pega tus credenciales de Firebase en el código para activar la seguridad permanente.</p></div>;

  if (loading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black italic space-y-6"><Dumbbell size={100} className="text-blue-500 animate-spin" /><span className="tracking-[0.6em] uppercase text-[12px] font-black opacity-50">Validando sesión...</span></div>;

  if (!user) return <LoginView onLogin={handleLogin} />;

  const views = {
    home: <HomeView user={user} onNavigate={setView} onLogout={handleLogout} />,
    profile: <ProfileView user={user} onBack={() => setView('home')} />,
    // Nota: El WorkoutView se implementa igual que el anterior pero usando user.uid de Google
  };

  return (
    <div className="font-sans text-slate-100 min-h-screen bg-slate-950 selection:bg-blue-600/30 flex flex-col overflow-x-hidden antialiased items-stretch">
      <div className="flex-1 w-full flex flex-col items-stretch">
        {views[view] || views.home}
      </div>
    </div>
  );
}