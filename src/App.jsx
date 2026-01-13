import './index.css'; // <--- AGREGA ESTA LÍNEA AQUÍ
import React, { useState, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';

// Configuración del worker de PDF.js
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const categoryColors = {
  'Restaurantes': '#ef4444', 'Delivery': '#f97316', 'Transporte': '#eab308',
  'Inversiones': '#22c55e', 'Compras': '#3b82f6', 'Supermercado': '#8b5cf6',
  'Conveniencia': '#ec4899', 'Viajes': '#06b6d4', 'Salud': '#14b8a6',
  'Entretenimiento': '#f43f5e', 'Cafés': '#a855f7', 'Comida': '#84cc16',
  'Apuestas': '#6366f1', 'Servicios': '#64748b', 'Gobierno': '#78716c',
  'Telecomunicaciones': '#0d9488', 'Gasolina': '#d97706', 'Transferencias': '#94a3b8',
  'Suscripciones': '#7c3aed', 'Educación': '#2563eb', 'Hogar': '#059669',
  'Mascotas': '#db2777', 'Gimnasio': '#dc2626', 'Otros': '#64748b',
};

const essentialCategories = ['Supermercado', 'Salud', 'Transporte', 'Servicios', 'Telecomunicaciones', 'Educación', 'Hogar', 'Gasolina'];
const nonEssentialCategories = ['Restaurantes', 'Delivery', 'Entretenimiento', 'Compras', 'Cafés', 'Apuestas', 'Viajes', 'Suscripciones'];

const countries = [
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: '$' },
  { code: 'MX', name: 'México', currency: 'MXN', symbol: '$' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$' },
  { code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$' },
  { code: 'PE', name: 'Perú', currency: 'PEN', symbol: 'S/' },
  { code: 'BR', name: 'Brasil', currency: 'BRL', symbol: 'R$' },
  { code: 'US', name: 'Estados Unidos', currency: 'USD', symbol: '$' },
  { code: 'ES', name: 'España', currency: 'EUR', symbol: '€' },
];

const outputCurrencies = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' },
  { code: 'COP', symbol: '$' }, { code: 'MXN', symbol: '$' },
];

export default function FinanceAppUltra() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [country, setCountry] = useState(null);
  const [outputCurrency, setOutputCurrency] = useState('USD');
  const [transactions, setTransactions] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState(35);
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [savingsGoal, setSavingsGoal] = useState(10000);
  const [currentSavings, setCurrentSavings] = useState(5000);
  const [monthlyDebt, setMonthlyDebt] = useState(0);

  // --- LÓGICA DE ARCHIVOS ---
  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target.files || []);
    setFiles(prev => [...prev, ...droppedFiles.filter(f => f.name.endsWith('.pdf') || f.name.endsWith('.csv'))]);
  }, []);

  const parsePDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  };

  const parseCSV = (file) => new Promise((resolve, reject) => {
    Papa.parse(file, { header: true, complete: (results) => resolve(results.data), error: reject });
  });

  const formatTransactions = (rawTxns) => {
    return rawTxns.map((t, idx) => ({
      id: idx, 
      date: t.date || 'Desconocida', 
      description: t.description || '',
      amount: parseFloat(t.amount) || 0, 
      category: t.category || 'Otros',
      merchant: t.merchant || t.description?.split(' ')[0] || 'Desconocido',
      month: t.date ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(t.date.split('-')[1]) - 1] : 'Desconocido',
      dayOfWeek: t.date ? new Date(t.date).getDay() : 0,
      dayOfMonth: t.date ? parseInt(t.date.split('-')[2]) : 1,
      hour: t.time ? parseInt(t.time.split(':')[0]) : 12,
      weekOfMonth: t.date ? Math.ceil(parseInt(t.date.split('-')[2]) / 7) : 1,
    }));
  };

  const processFiles = async () => {
    setProcessing(true);
    setStep(3);
    try {
      let allRawData = [];
      for (const file of files) {
        setProcessingStatus(`Leyendo: ${file.name}`);
        const content = file.name.endsWith('.pdf') ? await parsePDF(file) : JSON.stringify(await parseCSV(file));
        allRawData.push({ type: file.name.endsWith('.pdf') ? 'pdf' : 'csv', content, filename: file.name });
      }

      setProcessingStatus('Analizando con IA...');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'categorize',
          context: `País: ${country?.name}. Moneda salida: ${outputCurrency}.`,
          messages: [{ role: 'user', content: `Extrae transacciones de este texto:\n${allRawData.map(d => d.content.substring(0, 5000)).join('\n')}` }],
        }),
      });

      if (!response.ok) throw new Error('Error en la comunicación con la API');
      
      const data = await response.json();
      const aiResponse = (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(aiResponse);

      if (parsed.transactions?.length) {
        setTransactions(formatTransactions(parsed.transactions));
        setTimeout(() => { setStep(4); setProcessing(false); }, 1000);
      } else {
        throw new Error('No se detectaron transacciones válidas');
      }
    } catch (error) {
      console.error("Error en procesamiento:", error);
      setProcessingStatus('Error. Generando datos de simulación...');
      setTransactions(generateSampleTransactions());
      setTimeout(() => { setStep(4); setProcessing(false); }, 1500);
    }
  };

  // --- GENERACIÓN DE EJEMPLOS ---
  const generateSampleTransactions = () => {
    const cats = ['Restaurantes', 'Supermercado', 'Transporte', 'Entretenimiento', 'Inversiones'];
    const months = ['Sep', 'Oct', 'Nov', 'Dec'];
    const txns = [];
    for (let i = 0; i < 100; i++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const monthIdx = Math.floor(i / 25);
      txns.push({
        id: i, date: `2025-${String(9 + monthIdx).padStart(2, '0')}-15`,
        description: `Compra en ${cat}`, amount: Math.round((Math.random() * 50 + 5) * 100) / 100,
        category: cat, merchant: 'Tienda Local', month: months[monthIdx], dayOfWeek: 3, dayOfMonth: 15, hour: 12, weekOfMonth: 2
      });
    }
    return txns;
  };

  // --- CÁLCULOS FINANCIEROS (Usememo para rendimiento) ---
  const filteredTransactions = useMemo(() => selectedMonth === 'all' ? transactions : transactions.filter(t => t.month === selectedMonth), [transactions, selectedMonth]);
  const monthsList = useMemo(() => [...new Set(transactions.map(t => t.month))].filter(m => m !== 'Desconocido'), [transactions]);
  const monthCount = selectedMonth === 'all' ? Math.max(monthsList.length, 1) : 1;
  const currencySymbol = useMemo(() => outputCurrencies.find(c => c.code === outputCurrency)?.symbol || '$', [outputCurrency]);

  const categoryTotals = useMemo(() => filteredTransactions.reduce((acc, t) => {
    if (t.amount > 0) acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {}), [filteredTransactions]);

  const pieData = useMemo(() => Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value), [categoryTotals]);
  const totalSpent = useMemo(() => filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0), [filteredTransactions]);
  const totalInvestments = useMemo(() => filteredTransactions.filter(t => t.category === 'Inversiones' && t.amount > 0).reduce((sum, t) => sum + t.amount, 0), [filteredTransactions]);
  const avgMonthlySpending = (totalSpent - totalInvestments) / monthCount;

  const needsVsWants = useMemo(() => {
    const needs = filteredTransactions.filter(t => essentialCategories.includes(t.category) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const wants = filteredTransactions.filter(t => nonEssentialCategories.includes(t.category) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const total = needs + wants;
    return { needsPercent: total > 0 ? Math.round(needs / total * 100) : 0, wantsPercent: total > 0 ? Math.round(wants / total * 100) : 0 };
  }, [filteredTransactions]);

  const savingsRate = useMemo(() => {
    const netIncome = monthlyIncome - monthlyDebt;
    const spent = avgMonthlySpending;
    const rate = netIncome > 0 ? ((netIncome - spent) / netIncome * 100) : 0;
    return { rate: Math.round(rate), color: rate >= 20 ? '#22c55e' : rate >= 10 ? '#3b82f6' : '#ef4444' };
  }, [monthlyIncome, monthlyDebt, avgMonthlySpending]);

  const emergencyFund = useMemo(() => {
    const covered = avgMonthlySpending > 0 ? currentSavings / avgMonthlySpending : 0;
    return { months: Math.round(covered * 10) / 10, color: covered >= 6 ? '#22c55e' : covered >= 3 ? '#eab308' : '#ef4444' };
  }, [avgMonthlySpending, currentSavings]);

  const alerts = useMemo(() => {
    const list = [];
    if (savingsRate.rate < 0) list.push({ type: 'critical', icon: '🚨', message: `Déficit detectado: ${savingsRate.rate}%` });
    if (emergencyFund.months < 3) list.push({ type: 'warning', icon: '🏦', message: `Fondo de emergencia bajo: ${emergencyFund.months} meses` });
    if (needsVsWants.wantsPercent > 50) list.push({ type: 'info', icon: '💡', message: `Gasto en deseos alto (${needsVsWants.wantsPercent}%)` });
    return list;
  }, [savingsRate, emergencyFund, needsVsWants]);

  // --- CHAT ---
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          context: `Ingreso: ${monthlyIncome}, Gastos: ${avgMonthlySpending}, Ahorros: ${currentSavings}.`,
          messages: [...chatMessages, { role: 'user', content: userMsg }],
        }),
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content?.[0]?.text || 'No pude procesar tu mensaje.' }]);
    } catch { 
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión.' }]); 
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
      <style>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>

      {/* PASO 1: DROPZONE */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto py-24 px-6 text-center">
          <div className="text-7xl mb-6">💰</div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent">Finance Analyzer Ultra</h1>
          <p className="text-slate-400 mb-10 text-lg">Sube tus extractos y deja que la IA trabaje por ti.</p>
          <div 
            className="border-2 border-dashed border-white/20 rounded-3xl p-16 cursor-pointer hover:border-blue-500/50 transition-all bg-white/5"
            onClick={() => document.getElementById('fileInput').click()}
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input id="fileInput" type="file" multiple accept=".pdf,.csv" onChange={handleFileDrop} className="hidden" />
            <div className="text-2xl font-semibold mb-2">📄 Arrastra tus archivos</div>
            <p className="text-slate-500 text-sm">PDF o CSV soportados</p>
          </div>
          {files.length > 0 && (
            <div className="mt-8 text-left space-y-2">
              {files.map((f, i) => (
                <div key={i} className="bg-white/5 p-3 rounded-xl flex justify-between items-center border border-white/5">
                  <span className="truncate">{f.name}</span>
                  <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 ml-4">✕</button>
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={() => setStep(2)} 
            disabled={!files.length}
            className={`mt-10 w-full py-4 rounded-2xl font-bold transition-all ${files.length ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90' : 'bg-white/10 opacity-50 cursor-not-allowed'}`}
          >
            Configurar Perfil →
          </button>
        </div>
      )}

      {/* PASO 2: PERFIL */}
      {step === 2 && (
        <div className="max-w-xl mx-auto py-20 px-6">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">👤 Tu Perfil Financiero</h2>
          <div className="space-y-4">
            <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nombre" value={userName} onChange={(e) => setUserName(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none" type="number" placeholder="Edad" value={userAge} onChange={(e) => setUserAge(parseInt(e.target.value))} />
              <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none" type="number" placeholder="Ingreso mensual" value={monthlyIncome} onChange={(e) => setMonthlyIncome(parseInt(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none" type="number" placeholder="Ahorros totales" value={currentSavings} onChange={(e) => setCurrentSavings(parseInt(e.target.value))} />
              <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none" type="number" placeholder="Deuda mensual" value={monthlyDebt} onChange={(e) => setMonthlyDebt(parseInt(e.target.value))} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {countries.map(c => <button key={c.code} className={`px-4 py-2 rounded-lg border transition-all ${country?.code === c.code ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10'}`} onClick={() => setCountry(c)}>{c.code}</button>)}
            </div>
          </div>
          <button 
            onClick={processFiles} 
            disabled={!country}
            className={`mt-10 w-full py-4 rounded-2xl font-bold ${country ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-900/20' : 'bg-white/10 opacity-50'}`}
          >
            ¡Empezar Análisis! 🚀
          </button>
        </div>
      )}

      {/* PASO 3: PROCESANDO */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin mb-6"></div>
          <p className="text-xl text-slate-400 font-medium tracking-wide">{processingStatus}</p>
        </div>
      )}

      {/* PASO 4: DASHBOARD PRINCIPAL */}
      {step === 4 && (
        <div className="max-w-[1400px] mx-auto p-6 lg:p-10">
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{userName || 'Mi Panel'}</h1>
              <p className="text-slate-500 mt-1">{transactions.length} movimientos analizados en {outputCurrency}</p>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
              {['dashboard', 'análisis', 'alertas', 'chat'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-xl font-semibold capitalize transition-all border ${activeTab === tab ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </header>

          {/* BANNER DE SALUD */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-1 bg-white/5 rounded-3xl p-6 border border-white/10 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{backgroundColor: `${savingsRate.color}20`, color: savingsRate.color}}>✓</div>
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tasa Ahorro</div>
                <div className="text-2xl font-bold" style={{color: savingsRate.color}}>{savingsRate.rate}%</div>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white/5 rounded-3xl p-4 border border-white/10 flex items-center gap-4 overflow-x-auto no-scrollbar">
              {alerts.map((a, i) => (
                <div key={i} className={`flex-shrink-0 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm border ${a.type === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                  <span>{a.icon}</span> {a.message}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
            <button className={`px-4 py-2 rounded-lg text-sm font-bold border ${selectedMonth === 'all' ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10'}`} onClick={() => setSelectedMonth('all')}>Todos</button>
            {monthsList.map(m => <button key={m} className={`px-4 py-2 rounded-lg text-sm font-bold border ${selectedMonth === m ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10'}`} onClick={() => setSelectedMonth(m)}>{m}</button>)}
          </div>

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Gasto Total', val: totalSpent, col: '#f87171' },
                  { label: 'Promedio Mensual', val: avgMonthlySpending, col: '#a78bfa' },
                  { label: 'Fondo Emergencia', val: `${emergencyFund.months} meses`, col: emergencyFund.color, raw: true },
                  { label: 'Inversiones', val: totalInvestments, col: '#4ade80' }
                ].map((k, i) => (
                  <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/10">
                    <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-tighter">{k.label}</div>
                    <div className="text-2xl font-bold font-mono" style={{color: k.col}}>
                      {k.raw ? k.val : `${currencySymbol}${Math.round(k.val).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10">
                  <h3 className="text-lg font-bold mb-6">Categorización de Gastos</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} dataKey="value" paddingAngle={5}>
                          {pieData.map((e, i) => <Cell key={i} fill={categoryColors[e.name] || '#64748b'} stroke="none" />)}
                        </Pie>
                        <Tooltip contentStyle={{background: '#1e293b', borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10">
                  <h3 className="text-lg font-bold mb-6">Necesidades vs Deseos</h3>
                  <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{name: 'Balance', needs: needsVsWants.needsPercent, wants: needsVsWants.wantsPercent}]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="needs" name="Necesidades (%)" fill="#4ade80" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="wants" name="Deseos (%)" fill="#fb923c" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CHAT */}
          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto bg-white/5 rounded-[40px] border border-white/10 flex flex-col h-[700px] overflow-hidden">
              <div className="p-8 border-b border-white/10 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-xl">🤖</div>
                <h3 className="font-bold">Asesor IA Personalizado</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-500 py-20">
                    <p>Hazme cualquier pregunta sobre tus gastos o metas.</p>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-6 py-4 rounded-3xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-slate-200 rounded-tl-none'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="text-xs text-blue-400 font-bold animate-pulse">Escribiendo...</div>}
              </div>
              <div className="p-6 bg-white/5 flex gap-4">
                <input 
                  className="flex-1 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:border-blue-500 transition-all" 
                  placeholder="Escribe aquí..." 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} className="bg-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all">Enviar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
