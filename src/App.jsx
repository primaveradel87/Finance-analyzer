import React, { useState, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, AreaChart, Area, ComposedChart, ScatterChart, Scatter, Treemap, FunnelChart, Funnel, LabelList } from 'recharts';
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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

// Categorías esenciales vs no esenciales
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

  const processFiles = async () => {
    setProcessing(true);
    setStep(3);
    try {
      let allRawData = [];
      for (let i = 0; i < files.length; i++) {
        setProcessingStatus(`Leyendo ${i + 1}/${files.length}: ${files[i].name}`);
        if (files[i].name.endsWith('.pdf')) {
          allRawData.push({ type: 'pdf', content: await parsePDF(files[i]), filename: files[i].name });
        } else {
          allRawData.push({ type: 'csv', content: JSON.stringify(await parseCSV(files[i])), filename: files[i].name });
        }
      }
      setProcessingStatus('Analizando con IA...');
      
      // Usa función serverless para categorizar
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'categorize',
          context: `País: ${country?.name}. Moneda salida: ${outputCurrency}. Tasas: 1 USD = 4200 COP, 17.5 MXN, 0.92 EUR.`,
          messages: [{ role: 'user', content: `Extrae transacciones:\n${allRawData.map(d => `--- ${d.filename} ---\n${d.content.substring(0, 8000)}`).join('\n\n')}\nJSON: {"transactions":[{"date":"2025-01-15","description":"UBER","amount":15.50,"category":"Transporte","merchant":"Uber"}]}` }],
        }),
      });

      const data = await response.json();
      let aiResponse = (data.content?.[0]?.text || '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const parsed = JSON.parse(aiResponse);
        if (parsed.transactions?.length) {
          setTransactions(parsed.transactions.map((t, idx) => ({
            id: idx, date: t.date || 'Unknown', description: t.description || '',
            amount: parseFloat(t.amount) || 0, category: t.category || 'Otros',
            merchant: t.merchant || t.description?.split(' ')[0] || 'Unknown',
            month: t.date ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(t.date.split('-')[1]) - 1] : 'Unknown',
            dayOfWeek: t.date ? new Date(t.date).getDay() : 0,
            dayOfMonth: t.date ? parseInt(t.date.split('-')[2]) : 1,
            hour: t.time ? parseInt(t.time.split(':')[0]) : Math.floor(Math.random() * 14) + 8,
            weekOfMonth: t.date ? Math.ceil(parseInt(t.date.split('-')[2]) / 7) : 1,
          })));
          setTimeout(() => { setStep(4); setProcessing(false); }, 1000);
        } else throw new Error('No transactions');
      } catch {
        setProcessingStatus('Generando datos de ejemplo...');
        setTransactions(generateSampleTransactions());
        setTimeout(() => { setStep(4); setProcessing(false); }, 1500);
      }
    } catch {
      setProcessingStatus('Usando datos de ejemplo...');
      setTransactions(generateSampleTransactions());
      setTimeout(() => { setStep(4); setProcessing(false); }, 1500);
    }
  };

  const generateSampleTransactions = () => {
    const cats = ['Restaurantes', 'Delivery', 'Transporte', 'Supermercado', 'Entretenimiento', 'Inversiones', 'Compras', 'Salud', 'Suscripciones', 'Cafés', 'Servicios', 'Conveniencia'];
    const merchants = { Restaurantes: ['WOK', 'La Braseria', 'McDonalds', 'Crepes', 'PF Changs'], Delivery: ['Rappi', 'Uber Eats', 'Didi Food'], Transporte: ['Uber', 'Didi', 'Gasolina Shell'], Supermercado: ['Exito', 'Carulla', 'D1', 'Jumbo'], Entretenimiento: ['Netflix', 'Spotify', 'Cine Colombia'], Inversiones: ['eToro', 'Tyba'], Compras: ['Amazon', 'MercadoLibre', 'Zara', 'Falabella'], Salud: ['Farmacia', 'Colmedica', 'Droguerias'], Suscripciones: ['Netflix', 'Spotify', 'iCloud', 'ChatGPT', 'YouTube Premium'], Cafés: ['Starbucks', 'Juan Valdez', 'Tostao'], Servicios: ['ETB', 'Claro', 'Gas Natural'], Conveniencia: ['OXXO', 'D1', '7-Eleven'] };
    const months = ['Sep', 'Oct', 'Nov', 'Dec'];
    const txns = [];
    
    for (let i = 0; i < 150; i++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const monthIdx = Math.floor(i / 38);
      const day = Math.floor(Math.random() * 28) + 1;
      const hour = Math.floor(Math.random() * 14) + 8;
      const baseAmount = cat === 'Inversiones' ? 200 + Math.random() * 300 : cat === 'Salud' ? 50 + Math.random() * 200 : cat === 'Suscripciones' ? 5 + Math.random() * 20 : 5 + Math.random() * 80;
      
      txns.push({
        id: i, date: `2025-${String(9 + monthIdx).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        description: `Transacción ${i}`, amount: Math.round(baseAmount * 100) / 100,
        category: cat, merchant: merchants[cat]?.[Math.floor(Math.random() * merchants[cat].length)] || 'Otro',
        month: months[monthIdx], dayOfWeek: (day % 7), dayOfMonth: day, hour, weekOfMonth: Math.ceil(day / 7),
      });
    }
    
    // Add consistent subscriptions
    months.forEach((m, mi) => {
      [{ name: 'Netflix', amt: 15.99 }, { name: 'Spotify', amt: 9.99 }, { name: 'iCloud', amt: 2.99 }, { name: 'ChatGPT', amt: 20 }].forEach((sub, si) => {
        txns.push({ id: 1000 + mi * 10 + si, date: `2025-${String(9 + mi).padStart(2, '0')}-01`, description: sub.name, amount: sub.amt, category: 'Suscripciones', merchant: sub.name, month: m, dayOfWeek: 1, dayOfMonth: 1, hour: 9, weekOfMonth: 1 });
      });
      // Add investment
      txns.push({ id: 2000 + mi, date: `2025-${String(9 + mi).padStart(2, '0')}-15`, description: 'eToro Investment', amount: 300, category: 'Inversiones', merchant: 'eToro', month: m, dayOfWeek: 3, dayOfMonth: 15, hour: 10, weekOfMonth: 3 });
    });
    
    return txns;
  };

  // ========== CALCULATIONS ==========
  const filteredTransactions = selectedMonth === 'all' ? transactions : transactions.filter(t => t.month === selectedMonth);
  const months = useMemo(() => [...new Set(transactions.map(t => t.month))].filter(m => m !== 'Unknown'), [transactions]);
  const monthCount = selectedMonth === 'all' ? Math.max(months.length, 1) : 1;
  
  const categoryTotals = useMemo(() => filteredTransactions.reduce((acc, t) => {
    if (t.amount > 0) acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {}), [filteredTransactions]);

  const pieData = useMemo(() => Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value), [categoryTotals]);

  const totalSpent = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalInvestments = filteredTransactions.filter(t => t.category === 'Inversiones' && t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalRealSpending = totalSpent - totalInvestments;
  const avgMonthlySpending = totalRealSpending / monthCount;
  const currencySymbol = outputCurrencies.find(c => c.code === outputCurrency)?.symbol || '$';

  // ========== ADVANCED ANALYTICS ==========

  // 1. Spending velocity (how fast you spend in the month)
  const spendingVelocity = useMemo(() => {
    const weekData = [1, 2, 3, 4].map(week => {
      const weekTxns = filteredTransactions.filter(t => t.weekOfMonth === week && t.amount > 0 && t.category !== 'Inversiones');
      const total = weekTxns.reduce((s, t) => s + t.amount, 0);
      return { week: `Semana ${week}`, total: Math.round(total * 100) / 100, count: weekTxns.length };
    });
    const velocityTrend = weekData[3]?.total > weekData[0]?.total ? 'acelerando' : 'desacelerando';
    return { weekData, velocityTrend };
  }, [filteredTransactions]);

  // 2. Hour of day analysis
  const hourlySpending = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(h => {
      const hourTxns = filteredTransactions.filter(t => t.hour === h && t.amount > 0);
      return { hour: `${h}:00`, total: Math.round(hourTxns.reduce((s, t) => s + t.amount, 0) * 100) / 100, count: hourTxns.length };
    }).filter(h => h.count > 0);
  }, [filteredTransactions]);

  const peakSpendingHour = useMemo(() => {
    const peak = hourlySpending.reduce((max, h) => h.total > max.total ? h : max, { hour: 'N/A', total: 0 });
    return peak;
  }, [hourlySpending]);

  // 3. Essential vs Non-essential
  const needsVsWants = useMemo(() => {
    const needs = filteredTransactions.filter(t => essentialCategories.includes(t.category) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const wants = filteredTransactions.filter(t => nonEssentialCategories.includes(t.category) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const total = needs + wants;
    return {
      needs: Math.round(needs * 100) / 100,
      wants: Math.round(wants * 100) / 100,
      needsPercent: total > 0 ? Math.round(needs / total * 100) : 0,
      wantsPercent: total > 0 ? Math.round(wants / total * 100) : 0,
      ratio: wants > 0 ? Math.round(needs / wants * 100) / 100 : 0,
      status: (needs / total) >= 0.5 ? 'Saludable' : 'Revisar prioridades',
    };
  }, [filteredTransactions]);

  // 4. Lifestyle creep detection
  const lifestyleCreep = useMemo(() => {
    if (months.length < 2) return { detected: false, change: 0, categories: [] };
    
    const categoryChanges = [];
    const categories = [...new Set(transactions.map(t => t.category))];
    
    categories.forEach(cat => {
      const firstMonth = transactions.filter(t => t.month === months[0] && t.category === cat && t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const lastMonth = transactions.filter(t => t.month === months[months.length - 1] && t.category === cat && t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const change = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth * 100) : 0;
      if (change > 20) categoryChanges.push({ category: cat, change: Math.round(change), firstMonth: Math.round(firstMonth), lastMonth: Math.round(lastMonth) });
    });

    const firstMonthTotal = transactions.filter(t => t.month === months[0] && t.amount > 0 && t.category !== 'Inversiones').reduce((s, t) => s + t.amount, 0);
    const lastMonthTotal = transactions.filter(t => t.month === months[months.length - 1] && t.amount > 0 && t.category !== 'Inversiones').reduce((s, t) => s + t.amount, 0);
    const totalChange = firstMonthTotal > 0 ? ((lastMonthTotal - firstMonthTotal) / firstMonthTotal * 100) : 0;

    return {
      detected: totalChange > 15,
      change: Math.round(totalChange),
      categories: categoryChanges.sort((a, b) => b.change - a.change).slice(0, 5),
      firstMonth: Math.round(firstMonthTotal),
      lastMonth: Math.round(lastMonthTotal),
    };
  }, [transactions, months]);

  // 5. Impulse purchases (transactions > 2x average in non-essential categories)
  const impulsePurchases = useMemo(() => {
    const nonEssentialTxns = filteredTransactions.filter(t => nonEssentialCategories.includes(t.category) && t.amount > 0);
    const avgNonEssential = nonEssentialTxns.length > 0 ? nonEssentialTxns.reduce((s, t) => s + t.amount, 0) / nonEssentialTxns.length : 0;
    const impulse = nonEssentialTxns.filter(t => t.amount > avgNonEssential * 2);
    const total = impulse.reduce((s, t) => s + t.amount, 0);
    return {
      count: impulse.length,
      total: Math.round(total * 100) / 100,
      transactions: impulse.sort((a, b) => b.amount - a.amount).slice(0, 5),
      avgThreshold: Math.round(avgNonEssential * 2 * 100) / 100,
    };
  }, [filteredTransactions]);

  // 6. Spending consistency/volatility
  const spendingVolatility = useMemo(() => {
    const dailySpending = {};
    filteredTransactions.forEach(t => {
      if (t.amount > 0 && t.category !== 'Inversiones') {
        dailySpending[t.date] = (dailySpending[t.date] || 0) + t.amount;
      }
    });
    const values = Object.values(dailySpending);
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const variance = values.length > 0 ? values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length : 0;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? (stdDev / avg * 100) : 0;
    
    return {
      avgDaily: Math.round(avg * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      volatility: Math.round(cv),
      status: cv < 50 ? 'Estable' : cv < 100 ? 'Moderado' : 'Muy variable',
      daysWithSpending: values.length,
    };
  }, [filteredTransactions]);

  // 7. Duplicate/suspicious transactions
  const suspiciousTransactions = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach(t => {
      const key = `${t.date}-${t.amount}-${t.merchant}`;
      grouped[key] = grouped[key] || [];
      grouped[key].push(t);
    });
    const duplicates = Object.values(grouped).filter(g => g.length > 1);
    return {
      count: duplicates.length,
      transactions: duplicates.slice(0, 5).map(g => ({ ...g[0], duplicateCount: g.length })),
      potentialSavings: duplicates.reduce((s, g) => s + g[0].amount * (g.length - 1), 0),
    };
  }, [filteredTransactions]);

  // 8. Emergency fund status
  const emergencyFund = useMemo(() => {
    const monthlyExpenses = avgMonthlySpending;
    const monthsCovered = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0;
    const targetMonths = 6;
    const targetAmount = monthlyExpenses * targetMonths;
    const deficit = Math.max(0, targetAmount - currentSavings);
    return {
      monthsCovered: Math.round(monthsCovered * 10) / 10,
      targetMonths,
      currentAmount: currentSavings,
      targetAmount: Math.round(targetAmount),
      deficit: Math.round(deficit),
      status: monthsCovered >= 6 ? 'Excelente' : monthsCovered >= 3 ? 'Aceptable' : 'Insuficiente',
      statusColor: monthsCovered >= 6 ? '#22c55e' : monthsCovered >= 3 ? '#eab308' : '#ef4444',
    };
  }, [avgMonthlySpending, currentSavings]);

  // 9. Savings rate
  const savingsRate = useMemo(() => {
    const netIncome = monthlyIncome - monthlyDebt;
    const spent = avgMonthlySpending;
    const invested = totalInvestments / monthCount;
    const saved = netIncome - spent;
    const rate = netIncome > 0 ? (saved / netIncome * 100) : 0;
    const investmentRate = netIncome > 0 ? (invested / netIncome * 100) : 0;
    return {
      rate: Math.round(rate),
      amount: Math.round(saved),
      investmentRate: Math.round(investmentRate),
      investmentAmount: Math.round(invested),
      status: rate >= 20 ? 'Excelente' : rate >= 10 ? 'Bueno' : rate >= 0 ? 'Mejorable' : 'Déficit',
      statusColor: rate >= 20 ? '#22c55e' : rate >= 10 ? '#3b82f6' : rate >= 0 ? '#eab308' : '#ef4444',
    };
  }, [monthlyIncome, monthlyDebt, avgMonthlySpending, totalInvestments, monthCount]);

  // 10. Top savings opportunities
  const savingsOpportunities = useMemo(() => {
    const opportunities = [];
    
    // Delivery optimization
    const deliverySpend = (categoryTotals['Delivery'] || 0) / monthCount;
    if (deliverySpend > 50) {
      opportunities.push({
        category: 'Delivery',
        current: Math.round(deliverySpend),
        suggestion: 'Reducir 50%',
        savings: Math.round(deliverySpend * 0.5),
        action: 'Cocina más en casa o recoge tu comida',
        impact: 'Alto',
      });
    }

    // Subscriptions audit
    const subSpend = (categoryTotals['Suscripciones'] || 0) / monthCount;
    if (subSpend > 30) {
      opportunities.push({
        category: 'Suscripciones',
        current: Math.round(subSpend),
        suggestion: 'Auditar servicios',
        savings: Math.round(subSpend * 0.3),
        action: 'Cancela las que no uses regularmente',
        impact: 'Medio',
      });
    }

    // Coffee/cafe spending
    const cafeSpend = (categoryTotals['Cafés'] || 0) / monthCount;
    if (cafeSpend > 20) {
      opportunities.push({
        category: 'Cafés',
        current: Math.round(cafeSpend),
        suggestion: 'Reducir 60%',
        savings: Math.round(cafeSpend * 0.6),
        action: 'Prepara café en casa',
        impact: 'Medio',
      });
    }

    // Convenience stores
    const convSpend = (categoryTotals['Conveniencia'] || 0) / monthCount;
    if (convSpend > 30) {
      opportunities.push({
        category: 'Conveniencia',
        current: Math.round(convSpend),
        suggestion: 'Reducir 70%',
        savings: Math.round(convSpend * 0.7),
        action: 'Planifica compras en supermercado',
        impact: 'Medio',
      });
    }

    // Restaurant spending
    const restSpend = (categoryTotals['Restaurantes'] || 0) / monthCount;
    if (restSpend > 100) {
      opportunities.push({
        category: 'Restaurantes',
        current: Math.round(restSpend),
        suggestion: 'Reducir 30%',
        savings: Math.round(restSpend * 0.3),
        action: 'Limita salidas a fines de semana',
        impact: 'Alto',
      });
    }

    // Small purchases
    if (smallPurchases.percentOfTotal > 10) {
      opportunities.push({
        category: 'Gastos hormiga',
        current: Math.round(smallPurchases.total / monthCount),
        suggestion: 'Reducir 50%',
        savings: Math.round(smallPurchases.total / monthCount * 0.5),
        action: 'Evita compras impulsivas pequeñas',
        impact: 'Medio',
      });
    }

    return opportunities.sort((a, b) => b.savings - a.savings);
  }, [categoryTotals, monthCount]);

  const totalPotentialSavings = savingsOpportunities.reduce((s, o) => s + o.savings, 0);

  // 11. Spending prediction for next month
  const nextMonthPrediction = useMemo(() => {
    if (months.length < 2) return { predicted: avgMonthlySpending, confidence: 'Baja', trend: 'estable' };
    
    const monthlyTotals = months.map(m => 
      transactions.filter(t => t.month === m && t.amount > 0 && t.category !== 'Inversiones').reduce((s, t) => s + t.amount, 0)
    );
    
    const trend = monthlyTotals.length >= 2 
      ? (monthlyTotals[monthlyTotals.length - 1] - monthlyTotals[0]) / monthlyTotals.length
      : 0;
    
    const lastMonth = monthlyTotals[monthlyTotals.length - 1] || avgMonthlySpending;
    const predicted = lastMonth + trend;
    const avg = monthlyTotals.reduce((s, v) => s + v, 0) / monthlyTotals.length;
    const variance = monthlyTotals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / monthlyTotals.length;
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
    
    return {
      predicted: Math.round(predicted),
      confidence: cv < 0.2 ? 'Alta' : cv < 0.4 ? 'Media' : 'Baja',
      trend: trend > 50 ? 'subiendo' : trend < -50 ? 'bajando' : 'estable',
      trendAmount: Math.round(Math.abs(trend)),
    };
  }, [transactions, months, avgMonthlySpending]);

  // 12. Category correlation (what you buy together)
  const categoryCorrelations = useMemo(() => {
    const dailyCategories = {};
    filteredTransactions.forEach(t => {
      if (t.amount > 0) {
        dailyCategories[t.date] = dailyCategories[t.date] || new Set();
        dailyCategories[t.date].add(t.category);
      }
    });
    
    const pairs = {};
    Object.values(dailyCategories).forEach(cats => {
      const catArray = [...cats];
      for (let i = 0; i < catArray.length; i++) {
        for (let j = i + 1; j < catArray.length; j++) {
          const key = [catArray[i], catArray[j]].sort().join(' + ');
          pairs[key] = (pairs[key] || 0) + 1;
        }
      }
    });
    
    return Object.entries(pairs)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredTransactions]);

  // 13. Financial alerts
  const alerts = useMemo(() => {
    const alertList = [];
    
    if (savingsRate.rate < 0) alertList.push({ type: 'critical', icon: '🚨', message: `Estás gastando más de lo que ganas (${Math.abs(savingsRate.rate)}% déficit)` });
    if (savingsRate.rate < 10 && savingsRate.rate >= 0) alertList.push({ type: 'warning', icon: '⚠️', message: `Tu tasa de ahorro es baja (${savingsRate.rate}%). Objetivo: 20%+` });
    if (emergencyFund.monthsCovered < 3) alertList.push({ type: 'warning', icon: '🏦', message: `Fondo de emergencia insuficiente (${emergencyFund.monthsCovered} meses). Meta: 6 meses` });
    if (lifestyleCreep.detected) alertList.push({ type: 'warning', icon: '📈', message: `Lifestyle creep detectado: gastos +${lifestyleCreep.change}% vs primer mes` });
    if (needsVsWants.wantsPercent > 60) alertList.push({ type: 'info', icon: '💡', message: `${needsVsWants.wantsPercent}% de gastos son "deseos". Considera rebalancear` });
    if (impulsePurchases.count > 5) alertList.push({ type: 'info', icon: '🛒', message: `${impulsePurchases.count} compras impulsivas detectadas (${currencySymbol}${impulsePurchases.total})` });
    if (suspiciousTransactions.count > 0) alertList.push({ type: 'info', icon: '🔍', message: `${suspiciousTransactions.count} posibles transacciones duplicadas` });
    if ((categoryTotals['Delivery'] || 0) / monthCount > 150) alertList.push({ type: 'info', icon: '🍕', message: `Alto gasto en delivery: ${currencySymbol}${Math.round((categoryTotals['Delivery'] || 0) / monthCount)}/mes` });
    
    return alertList;
  }, [savingsRate, emergencyFund, lifestyleCreep, needsVsWants, impulsePurchases, suspiciousTransactions, categoryTotals, monthCount, currencySymbol]);

  // Small purchases (reused from before)
  const smallPurchases = useMemo(() => {
    const threshold = 10;
    const small = filteredTransactions.filter(t => t.amount > 0 && t.amount <= threshold);
    const total = small.reduce((s, t) => s + t.amount, 0);
    const byCategory = small.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    return {
      count: small.length, total: Math.round(total * 100) / 100,
      percentOfTotal: totalRealSpending ? Math.round(total / totalRealSpending * 1000) / 10 : 0,
      byCategory: Object.entries(byCategory).map(([cat, val]) => ({ category: cat, value: Math.round(val * 100) / 100 })).sort((a, b) => b.value - a.value),
    };
  }, [filteredTransactions, totalRealSpending]);

  // Subscriptions
  const subscriptions = useMemo(() => {
    const merchantCounts = {};
    transactions.forEach(t => {
      if (t.amount > 0) {
        const key = `${t.merchant}-${t.amount.toFixed(2)}`;
        merchantCounts[key] = merchantCounts[key] || { merchant: t.merchant, amount: t.amount, months: new Set() };
        merchantCounts[key].months.add(t.month);
      }
    });
    return Object.values(merchantCounts).filter(s => s.months.size >= 2).map(s => ({ ...s, frequency: s.months.size, monthlyEstimate: s.amount, yearlyEstimate: s.amount * 12 })).sort((a, b) => b.yearlyEstimate - a.yearlyEstimate);
  }, [transactions]);

  // Top merchants
  const topMerchants = useMemo(() => {
    const merchantTotals = filteredTransactions.reduce((acc, t) => {
      if (t.amount > 0 && t.merchant) {
        acc[t.merchant] = acc[t.merchant] || { total: 0, count: 0, category: t.category };
        acc[t.merchant].total += t.amount; acc[t.merchant].count += 1;
      }
      return acc;
    }, {});
    return Object.entries(merchantTotals).map(([name, data]) => ({ name, total: Math.round(data.total * 100) / 100, count: data.count, category: data.category })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredTransactions]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    return months.map((month, idx) => {
      const total = transactions.filter(t => t.month === month && t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const spending = transactions.filter(t => t.month === month && t.amount > 0 && t.category !== 'Inversiones').reduce((s, t) => s + t.amount, 0);
      const investment = transactions.filter(t => t.month === month && t.category === 'Inversiones' && t.amount > 0).reduce((s, t) => s + t.amount, 0);
      return { month, total: Math.round(total), spending: Math.round(spending), investment: Math.round(investment) };
    });
  }, [transactions, months]);

  // Health score
  const healthScore = useMemo(() => {
    let score = 50;
    if (savingsRate.rate >= 20) score += 15; else if (savingsRate.rate >= 10) score += 10; else if (savingsRate.rate < 0) score -= 15;
    if (emergencyFund.monthsCovered >= 6) score += 15; else if (emergencyFund.monthsCovered >= 3) score += 8;
    if (needsVsWants.needsPercent >= 50) score += 10; else score -= 5;
    if (!lifestyleCreep.detected) score += 5; else score -= 5;
    if (impulsePurchases.count <= 3) score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [savingsRate, emergencyFund, needsVsWants, lifestyleCreep, impulsePurchases]);

  const healthScoreColor = healthScore >= 80 ? '#22c55e' : healthScore >= 60 ? '#eab308' : healthScore >= 40 ? '#f97316' : '#ef4444';
  const healthScoreLabel = healthScore >= 80 ? 'Excelente' : healthScore >= 60 ? 'Bueno' : healthScore >= 40 ? 'Regular' : 'Crítico';

  // Day of week data
  const dayOfWeekData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days.map((day, idx) => {
      const dayTxns = filteredTransactions.filter(t => t.dayOfWeek === idx && t.amount > 0);
      return { day, total: Math.round(dayTxns.reduce((s, t) => s + t.amount, 0)), count: dayTxns.length };
    });
  }, [filteredTransactions]);

  // Benchmark
  const benchmarkComparison = useMemo(() => {
    const myMonthly = {
      'Alimentación': ((categoryTotals['Restaurantes'] || 0) + (categoryTotals['Delivery'] || 0) + (categoryTotals['Supermercado'] || 0) + (categoryTotals['Cafés'] || 0) + (categoryTotals['Conveniencia'] || 0)) / monthCount,
      'Transporte': ((categoryTotals['Transporte'] || 0) + (categoryTotals['Gasolina'] || 0)) / monthCount,
      'Salud': (categoryTotals['Salud'] || 0) / monthCount,
      'Inversión': (categoryTotals['Inversiones'] || 0) / monthCount,
      'Entretenimiento': ((categoryTotals['Entretenimiento'] || 0) + (categoryTotals['Suscripciones'] || 0)) / monthCount,
      'Compras': (categoryTotals['Compras'] || 0) / monthCount,
    };
    return Object.entries(myMonthly).map(([cat, val]) => {
      const benchmarks = { 'Alimentación': 0.15, 'Transporte': 0.08, 'Salud': 0.06, 'Inversión': 0.15, 'Entretenimiento': 0.06, 'Compras': 0.04 };
      return { category: cat, tu: Math.round(val), benchmark: Math.round(monthlyIncome * (benchmarks[cat] || 0.05)) };
    });
  }, [categoryTotals, monthCount, monthlyIncome]);

  // Chat
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    setInputMessage('');
    setIsLoading(true);

    const context = `
USUARIO: ${userName}, ${userAge} años, ${country?.name}
INGRESO: ${currencySymbol}${monthlyIncome}/mes | DEUDA: ${currencySymbol}${monthlyDebt}/mes | AHORROS: ${currencySymbol}${currentSavings}

RESUMEN FINANCIERO:
- Score: ${healthScore}/100 (${healthScoreLabel})
- Tasa de ahorro: ${savingsRate.rate}%
- Fondo emergencia: ${emergencyFund.monthsCovered} meses
- Total gastado: ${currencySymbol}${totalRealSpending.toFixed(0)}
- Promedio mensual: ${currencySymbol}${avgMonthlySpending.toFixed(0)}

ANÁLISIS AVANZADO:
- Necesidades vs Deseos: ${needsVsWants.needsPercent}% / ${needsVsWants.wantsPercent}%
- Lifestyle creep: ${lifestyleCreep.detected ? `+${lifestyleCreep.change}%` : 'No detectado'}
- Compras impulsivas: ${impulsePurchases.count} (${currencySymbol}${impulsePurchases.total})
- Volatilidad: ${spendingVolatility.status} (${spendingVolatility.volatility}%)
- Predicción próximo mes: ${currencySymbol}${nextMonthPrediction.predicted}

TOP OPORTUNIDADES DE AHORRO:
${savingsOpportunities.slice(0, 3).map(o => `- ${o.category}: -${currencySymbol}${o.savings}/mes (${o.action})`).join('\n')}
Total potencial: ${currencySymbol}${totalPotentialSavings}/mes

ALERTAS:
${alerts.map(a => `- ${a.message}`).join('\n')}`;

    try {
      // Usa la función serverless /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          context: context,
          messages: [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: inputMessage }],
        }),
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content?.[0]?.text || 'Error al procesar' }]);
    } catch { setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión. Verifica tu internet.' }]); }
    setIsLoading(false);
  };

  const cardStyle = { background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' };
  const miniCard = { background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px' };
  const buttonPrimary = { padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono&display=swap');
        * { box-sizing: border-box; }
        .btn { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #e2e8f0; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 13px; }
        .btn:hover { background: rgba(255,255,255,0.1); }
        .btn.active { background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-color: transparent; }
        .input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #e2e8f0; font-size: 14px; outline: none; }
        .input:focus { border-color: #3b82f6; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .alert { padding: 12px 16px; border-radius: 10px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        .alert.critical { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); }
        .alert.warning { background: rgba(234,179,8,0.15); border: 1px solid rgba(234,179,8,0.3); }
        .alert.info { background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); }
      `}</style>

      {/* Step 1-3: Setup flow (condensed) */}
      {step === 1 && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>💰</div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 12px 0', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Finance Analyzer Ultra</h1>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>Análisis financiero profundo con IA</p>
          <div style={{ border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '16px', padding: '48px', cursor: 'pointer' }} onClick={() => document.getElementById('fileInput').click()} onDrop={handleFileDrop} onDragOver={(e) => e.preventDefault()}>
            <input id="fileInput" type="file" multiple accept=".pdf,.csv" onChange={handleFileDrop} style={{ display: 'none' }} />
            <p style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>📄 Arrastra tus extractos</p>
            <p style={{ color: '#94a3b8', margin: 0 }}>PDF o CSV</p>
          </div>
          {files.length > 0 && <div style={{ marginTop: '16px', textAlign: 'left' }}>{files.map((f, i) => <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}><span>{f.name}</span><button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button></div>)}</div>}
          <button onClick={() => setStep(2)} disabled={!files.length} style={{ ...buttonPrimary, width: '100%', marginTop: '24px', opacity: files.length ? 1 : 0.5 }}>Continuar →</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '48px 24px' }}>
          <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginBottom: '16px' }}>← Volver</button>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 24px 0' }}>Tu perfil financiero</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <input className="input" placeholder="Tu nombre" value={userName} onChange={(e) => setUserName(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input className="input" type="number" placeholder="Edad" value={userAge} onChange={(e) => setUserAge(parseInt(e.target.value) || 35)} />
              <input className="input" type="number" placeholder="Ingreso mensual" value={monthlyIncome} onChange={(e) => setMonthlyIncome(parseInt(e.target.value) || 5000)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input className="input" type="number" placeholder="Ahorros actuales" value={currentSavings} onChange={(e) => setCurrentSavings(parseInt(e.target.value) || 0)} />
              <input className="input" type="number" placeholder="Meta de ahorro" value={savingsGoal} onChange={(e) => setSavingsGoal(parseInt(e.target.value) || 10000)} />
            </div>
            <input className="input" type="number" placeholder="Deuda mensual (0 si no tienes)" value={monthlyDebt} onChange={(e) => setMonthlyDebt(parseInt(e.target.value) || 0)} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>{countries.map(c => <button key={c.code} className={`btn ${country?.code === c.code ? 'active' : ''}`} onClick={() => setCountry(c)}>{c.code}</button>)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>{outputCurrencies.map(c => <button key={c.code} className={`btn ${outputCurrency === c.code ? 'active' : ''}`} onClick={() => setOutputCurrency(c.code)}>{c.symbol}</button>)}</div>
          </div>
          <button onClick={processFiles} disabled={!country} style={{ ...buttonPrimary, width: '100%', marginTop: '24px', opacity: country ? 1 : 0.5 }}>Analizar 🚀</button>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' }}>
          <div style={{ width: '60px', height: '60px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
          <p style={{ color: '#94a3b8' }}>{processingStatus}</p>
        </div>
      )}

      {/* Step 4: Dashboard */}
      {step === 4 && (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{userName || 'Dashboard'}</h1>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>{transactions.length} transacciones • {outputCurrency}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['dashboard', 'análisis', 'patrones', 'alertas', 'benchmark', 'chat'].map(tab => (
                <button key={tab} className={`btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'dashboard' ? '📊' : tab === 'análisis' ? '📈' : tab === 'patrones' ? '🔍' : tab === 'alertas' ? '🚨' : tab === 'benchmark' ? '🎯' : '🤖'} {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Health Score + Alerts Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: alerts.length > 0 ? '200px 1fr' : '1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', width: '70px', height: '70px' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={healthScoreColor} strokeWidth="8" strokeDasharray={`${healthScore * 2.64} 264`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: healthScoreColor }}>{healthScore}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: healthScoreColor }}>{healthScoreLabel}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Score Financiero</div>
              </div>
            </div>
            {alerts.length > 0 && (
              <div style={{ ...cardStyle, padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {alerts.slice(0, 4).map((a, i) => (
                    <div key={i} style={{ flex: '0 0 auto', padding: '8px 12px', background: a.type === 'critical' ? 'rgba(239,68,68,0.15)' : a.type === 'warning' ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.15)', borderRadius: '8px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {a.icon} {a.message.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Month filter */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button className={`btn ${selectedMonth === 'all' ? 'active' : ''}`} onClick={() => setSelectedMonth('all')}>Todos</button>
            {months.map(m => <button key={m} className={`btn ${selectedMonth === m ? 'active' : ''}`} onClick={() => setSelectedMonth(m)}>{m}</button>)}
          </div>

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Total', value: totalSpent, color: '#3b82f6' },
                  { label: 'Gastos', value: totalRealSpending, color: '#ef4444' },
                  { label: 'Inversión', value: totalInvestments, color: '#22c55e' },
                  { label: 'Promedio/mes', value: avgMonthlySpending, color: '#8b5cf6' },
                  { label: 'Tasa ahorro', value: `${savingsRate.rate}%`, color: savingsRate.statusColor, noSymbol: true },
                  { label: 'Fondo emerg.', value: `${emergencyFund.monthsCovered}m`, color: emergencyFund.statusColor, noSymbol: true },
                ].map((k, i) => (
                  <div key={i} style={{ ...cardStyle, padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{k.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: k.color, fontFamily: "'Space Mono', monospace" }}>
                      {k.noSymbol ? k.value : `${currencySymbol}${Math.round(k.value).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Categorías</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={categoryColors[e.name] || '#64748b'} />)}</Pie><Tooltip formatter={(v) => [`${currencySymbol}${v}`, '']} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} /></PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Tendencia mensual</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" stroke="#64748b" fontSize={10} /><YAxis stroke="#64748b" fontSize={10} /><Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '11px' }} /><Bar dataKey="spending" name="Gastos" fill="#ef4444" radius={[3, 3, 0, 0]} /><Bar dataKey="investment" name="Inversión" fill="#22c55e" radius={[3, 3, 0, 0]} /></BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Necesidades vs Deseos</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={[{ name: 'Necesidades', value: needsVsWants.needs }, { name: 'Deseos', value: needsVsWants.wants }]} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value">
                        <Cell fill="#22c55e" /><Cell fill="#f97316" />
                      </Pie>
                      <Tooltip formatter={(v) => [`${currencySymbol}${Math.round(v)}`, '']} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', marginTop: '-10px' }}>
                    <span style={{ fontSize: '12px', color: needsVsWants.needsPercent >= 50 ? '#22c55e' : '#f97316' }}>{needsVsWants.status}</span>
                  </div>
                </div>
              </div>

              {/* Top merchants & Day of week */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Top comercios</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={topMerchants.slice(0, 7)} layout="vertical"><XAxis type="number" stroke="#64748b" fontSize={10} /><YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={70} /><Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} /><Bar dataKey="total" radius={[0, 3, 3, 0]}>{topMerchants.map((e, i) => <Cell key={i} fill={categoryColors[e.category] || '#64748b'} />)}</Bar></BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Por día de semana</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dayOfWeekData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" stroke="#64748b" fontSize={10} /><YAxis stroke="#64748b" fontSize={10} /><Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} /><Bar dataKey="total" fill="#8b5cf6" radius={[3, 3, 0, 0]} /></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ANÁLISIS TAB */}
          {activeTab === 'análisis' && (
            <>
              {/* Predictions & Velocity */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>🔮 Predicción próximo mes</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={miniCard}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Gasto estimado</div>
                      <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: "'Space Mono', monospace" }}>{currencySymbol}{nextMonthPrediction.predicted.toLocaleString()}</div>
                    </div>
                    <div style={miniCard}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Confianza</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: nextMonthPrediction.confidence === 'Alta' ? '#22c55e' : '#eab308' }}>{nextMonthPrediction.confidence}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#94a3b8' }}>
                    Tendencia: <span style={{ color: nextMonthPrediction.trend === 'subiendo' ? '#ef4444' : nextMonthPrediction.trend === 'bajando' ? '#22c55e' : '#94a3b8' }}>
                      {nextMonthPrediction.trend} {nextMonthPrediction.trendAmount > 0 ? `(${currencySymbol}${nextMonthPrediction.trendAmount}/mes)` : ''}
                    </span>
                  </div>
                </div>

                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>⚡ Velocidad de gasto</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={spendingVelocity.weekData}><XAxis dataKey="week" stroke="#64748b" fontSize={10} /><YAxis stroke="#64748b" fontSize={10} /><Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} /><Bar dataKey="total" fill="#06b6d4" radius={[3, 3, 0, 0]} /></BarChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>Patrón: {spendingVelocity.velocityTrend} hacia fin de mes</div>
                </div>

                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>📊 Volatilidad</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={miniCard}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Gasto diario prom.</div>
                      <div style={{ fontSize: '18px', fontWeight: '700' }}>{currencySymbol}{spendingVolatility.avgDaily}</div>
                    </div>
                    <div style={miniCard}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Variación</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: spendingVolatility.status === 'Estable' ? '#22c55e' : '#eab308' }}>{spendingVolatility.volatility}%</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '13px' }}>Estado: <span style={{ color: spendingVolatility.status === 'Estable' ? '#22c55e' : '#eab308' }}>{spendingVolatility.status}</span></div>
                </div>
              </div>

              {/* Hourly spending */}
              <div style={{ ...cardStyle, marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>🕐 Gastos por hora del día</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={hourlySpending}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="hour" stroke="#64748b" fontSize={10} /><YAxis stroke="#64748b" fontSize={10} /><Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} /><Area type="monotone" dataKey="total" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} /></AreaChart>
                </ResponsiveContainer>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>Hora pico: {peakSpendingHour.hour} ({currencySymbol}{peakSpendingHour.total})</div>
              </div>

              {/* Lifestyle creep */}
              <div style={{ ...cardStyle, background: lifestyleCreep.detected ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>{lifestyleCreep.detected ? '📈 Lifestyle Creep Detectado' : '✅ Sin Lifestyle Creep'}</h3>
                {lifestyleCreep.detected ? (
                  <>
                    <p style={{ fontSize: '13px', color: '#fca5a5', margin: '0 0 12px 0' }}>Tus gastos aumentaron {lifestyleCreep.change}% desde {months[0]} ({currencySymbol}{lifestyleCreep.firstMonth}) hasta {months[months.length - 1]} ({currencySymbol}{lifestyleCreep.lastMonth})</p>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Categorías que más crecieron: {lifestyleCreep.categories.slice(0, 3).map(c => `${c.category} (+${c.change}%)`).join(', ')}
                    </div>
                  </>
                ) : <p style={{ fontSize: '13px', color: '#86efac', margin: 0 }}>Tus gastos se mantienen estables. ¡Buen trabajo!</p>}
              </div>
            </>
          )}

          {/* PATRONES TAB */}
          {activeTab === 'patrones' && (
            <>
              {/* Savings opportunities */}
              <div style={{ ...cardStyle, marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px' }}>💡 Oportunidades de ahorro</h3>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e' }}>+{currencySymbol}{totalPotentialSavings}/mes</span>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {savingsOpportunities.map((o, i) => (
                    <div key={i} style={{ ...miniCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{o.category}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{o.action}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#22c55e', fontWeight: '600' }}>+{currencySymbol}{o.savings}/mes</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Actual: {currencySymbol}{o.current}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscriptions */}
              <div style={{ ...cardStyle, marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🔄 Suscripciones ({currencySymbol}{subscriptions.reduce((s, x) => s + x.monthlyEstimate, 0).toFixed(2)}/mes)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                  {subscriptions.slice(0, 8).map((s, i) => (
                    <div key={i} style={{ ...miniCard, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{s.merchant}</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", color: '#f97316' }}>{currencySymbol}{s.monthlyEstimate}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Small purchases & Impulse */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🐜 Gastos hormiga ({currencySymbol}{smallPurchases.total})</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0' }}>{smallPurchases.count} transacciones &lt;{currencySymbol}10 = {smallPurchases.percentOfTotal}% del total</p>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {smallPurchases.byCategory.slice(0, 4).map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>{c.category}</span>
                        <span style={{ fontFamily: "'Space Mono', monospace" }}>{currencySymbol}{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>⚡ Compras impulsivas ({impulsePurchases.count})</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0' }}>Transacciones &gt;{currencySymbol}{impulsePurchases.avgThreshold} en categorías no esenciales</p>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {impulsePurchases.transactions.slice(0, 4).map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{t.description}</span>
                        <span style={{ fontFamily: "'Space Mono', monospace", color: '#ef4444' }}>{currencySymbol}{t.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Correlations & Suspicious */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🔗 Compras que haces juntas</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {categoryCorrelations.map((c, i) => (
                      <div key={i} style={{ ...miniCard, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px' }}>{c.pair}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{c.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🔍 Posibles duplicados</h3>
                  {suspiciousTransactions.count > 0 ? (
                    <>
                      <p style={{ fontSize: '12px', color: '#eab308', margin: '0 0 12px 0' }}>{suspiciousTransactions.count} transacciones sospechosas (potencial: {currencySymbol}{suspiciousTransactions.potentialSavings.toFixed(2)})</p>
                      {suspiciousTransactions.transactions.map((t, i) => (
                        <div key={i} style={{ fontSize: '12px', marginBottom: '6px' }}>{t.merchant} - {currencySymbol}{t.amount} ({t.duplicateCount}x el {t.date})</div>
                      ))}
                    </>
                  ) : <p style={{ fontSize: '13px', color: '#22c55e' }}>No se detectaron duplicados</p>}
                </div>
              </div>
            </>
          )}

          {/* ALERTAS TAB */}
          {activeTab === 'alertas' && (
            <>
              <div style={{ ...cardStyle, marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>🚨 Centro de Alertas</h3>
                {alerts.length > 0 ? alerts.map((a, i) => (
                  <div key={i} className={`alert ${a.type}`}>
                    <span style={{ fontSize: '20px' }}>{a.icon}</span>
                    <span style={{ fontSize: '14px' }}>{a.message}</span>
                  </div>
                )) : <p style={{ color: '#22c55e' }}>✅ No hay alertas. ¡Tus finanzas están en orden!</p>}
              </div>

              {/* Financial summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>💰 Tasa de Ahorro</h3>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: savingsRate.statusColor, marginBottom: '8px' }}>{savingsRate.rate}%</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>Ahorras {currencySymbol}{savingsRate.amount}/mes</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>Inviertes {currencySymbol}{savingsRate.investmentAmount}/mes ({savingsRate.investmentRate}%)</div>
                  <div style={{ marginTop: '12px', fontSize: '12px' }}>Estado: <span style={{ color: savingsRate.statusColor }}>{savingsRate.status}</span></div>
                </div>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>🏦 Fondo de Emergencia</h3>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: emergencyFund.statusColor, marginBottom: '8px' }}>{emergencyFund.monthsCovered} meses</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>Tienes: {currencySymbol}{emergencyFund.currentAmount.toLocaleString()}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>Meta (6 meses): {currencySymbol}{emergencyFund.targetAmount.toLocaleString()}</div>
                  {emergencyFund.deficit > 0 && <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>Te faltan: {currencySymbol}{emergencyFund.deficit.toLocaleString()}</div>}
                </div>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>🎯 Meta de Ahorro</h3>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>{currencySymbol}{savingsGoal.toLocaleString()}</div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', height: '8px', marginBottom: '8px' }}>
                    <div style={{ background: '#3b82f6', borderRadius: '10px', height: '100%', width: `${Math.min(100, currentSavings / savingsGoal * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>{Math.round(currentSavings / savingsGoal * 100)}% completado</div>
                  {savingsRate.amount > 0 && <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '8px' }}>~{Math.ceil((savingsGoal - currentSavings) / savingsRate.amount)} meses restantes</div>}
                </div>
              </div>
            </>
          )}

          {/* BENCHMARK TAB */}
          {activeTab === 'benchmark' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>Tu vs Benchmark</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={benchmarkComparison.map(b => ({ ...b, tuPct: b.benchmark > 0 ? Math.min(200, b.tu / b.benchmark * 100) : 0, benchPct: 100 }))}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={10} />
                    <PolarRadiusAxis angle={30} domain={[0, 200]} stroke="#64748b" fontSize={9} />
                    <Radar name="Tú" dataKey="tuPct" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    <Radar name="Ideal" dataKey="benchPct" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>Comparación directa</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={benchmarkComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={10} width={80} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="tu" name="Tú" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="benchmark" name="Ideal" fill="#22c55e" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <div style={{ ...cardStyle, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🤖 Asesor Financiero IA</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                {chatMessages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Pregúntame sobre tus finanzas</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                      {['¿Cómo mejoro mi score?', '¿Dónde puedo ahorrar?', 'Analiza mi lifestyle creep', 'Plan para llegar a mi meta'].map((q, i) => <button key={i} className="btn" onClick={() => setInputMessage(q)}>{q}</button>)}
                    </div>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px', padding: '10px 14px' }}>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                  </div>
                ))}
                {isLoading && <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 14px' }}><p style={{ margin: 0, color: '#94a3b8' }}>Analizando...</p></div>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="input" placeholder="Pregunta..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
                <button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()} style={{ ...buttonPrimary, opacity: isLoading || !inputMessage.trim() ? 0.5 : 1 }}>Enviar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
