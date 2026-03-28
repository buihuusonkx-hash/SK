/**
 * @license
 * Math Matrix Pro - PhiÃªn báº£n chuáº©n hÃ³a 2026
 */

import React, { useState, useEffect } from 'react';
import { PenSquare, FileText, Download, Plus, Trash2, ChevronRight, Sparkles, RefreshCw, CheckCircle, AlertCircle, Settings, X, Key, LogOut, BookOpen, Layout, ListChecks, FileJson } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pickNLCQuestion, pickDSQuestion, pickTLNQuestion, type DSQuestion } from './questionBank';
import { findYeuCau, getAllTopics } from './yeuCauCanDat';
import { exportMatrixWord, exportSpecMatrixWord, exportExamWord } from './exportWord';
import { useMathRender } from './MathText';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Cáº¥u hÃ¬nh há»‡ thá»‘ng ---
const LEVELS = [
  { id: 0, name: 'Nháº­n biáº¿t', color: 'text-emerald-600', bgColor: 'bg-emerald-50', border: 'border-emerald-100', accent: 'bg-emerald-600' },
  { id: 1, name: 'ThÃ´ng hiá»ƒu', color: 'text-amber-600', bgColor: 'bg-amber-50', border: 'border-amber-100', accent: 'bg-amber-600' },
  { id: 2, name: 'Váº­n dá»¥ng', color: 'text-rose-600', bgColor: 'bg-rose-50', border: 'border-rose-100', accent: 'bg-rose-600' },
  { id: 3, name: 'Váº­n dá»¥ng cao', color: 'text-purple-600', bgColor: 'bg-purple-50', border: 'border-purple-100', accent: 'bg-purple-600' }
];

const defaultLevels = () => LEVELS.map(l => ({
  tenMucDo: l.name,
  yeuCau: '',
  qs: { nlc: '', ds: '', tln: '' }
}));

export default function App() {
  const [activeTab, setActiveTab] = useState('nhap-lieu');
  const [data, setData] = useState<any[]>([]);
  const [monHoc, setMonHoc] = useState('ToÃ¡n');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('mmp_logged_in') === 'true');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Khá»Ÿi táº¡o
  useEffect(() => {
    const saved = localStorage.getItem('mmp_data');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        setData([{ tenChuong: '', noiDungs: [{ tenNoiDung: '', soTiet: 0, mucDos: defaultLevels() }] }]);
      }
    } else {
      setData([{ tenChuong: '', noiDungs: [{ tenNoiDung: '', soTiet: 0, mucDos: defaultLevels() }] }]);
    }
  }, []);

  useEffect(() => {
    if (data.length > 0) localStorage.setItem('mmp_data', JSON.stringify(data));
  }, [data]);

  // --- Logic Nghiá»‡p vá»¥ ---
  const countQuestions = (input: string) => {
    if (!input) return 0;
    return input.split(/[,;\s]+/).filter(s => s && /\d/.test(s)).length;
  };

  const getTotals = () => {
    let p1 = 0, p2 = 0, p3 = 0;
    data.forEach(c => c.noiDungs.forEach((nd: any) => {
      // NLC: Tá»•ng tá»« NB, TH, VD
      p1 += countQuestions(nd.mucDos[0].qs.nlc) + countQuestions(nd.mucDos[1].qs.nlc) + countQuestions(nd.mucDos[2].qs.nlc);
      // DS: Äáº¿m sá»‘ cÃ¢u (má»—i cÃ¢u 4 Ã½)
      p2 += countQuestions(nd.mucDos[0].qs.ds);
      // TLN: Tá»•ng tá»« TH, VD, VDC
      p3 += countQuestions(nd.mucDos[1].qs.tln) + countQuestions(nd.mucDos[2].qs.tln) + countQuestions(nd.mucDos[3].qs.tln);
    }));
    return { p1, p2, p3, total: p1 + p2 + p3 };
  };

  const tuDongPhanBo = () => {
    const newData = JSON.parse(JSON.stringify(data));
    const allItems: any[] = [];
    
    // Gom táº¥t cáº£ cÃ¡c Ä‘Æ¡n vá»‹ kiáº¿n thá»©c vÃ o má»™t danh sÃ¡ch pháº³ng
    newData.forEach((c: any, cIdx: number) => {
      c.noiDungs.forEach((nd: any, nIdx: number) => {
        allItems.push({ cIdx, nIdx, soTiet: nd.soTiet || 0, ten: nd.tenNoiDung });
      });
    });

    const totalTiet = allItems.reduce((acc: number, it: any) => acc + it.soTiet, 0);
    if (totalTiet === 0) return alert("Vui lÃ²ng nháº­p 'Sá»‘ tiáº¿t' Ä‘á»ƒ tÃ­nh toÃ¡n!");

    // Reset toÃ n bá»™ dá»¯ liá»‡u cÃ¢u há»i cÅ©
    allItems.forEach((item: any) => {
      const nd = newData[item.cIdx].noiDungs[item.nIdx];
      nd.mucDos.forEach((m: any) => { m.qs.nlc = ''; m.qs.ds = ''; m.qs.tln = ''; });
    });

    // HÃ m bá»• trá»£ phÃ¢n phá»‘i sá»‘ cÃ¢u dá»±a trÃªn tá»· lá»‡ sá»‘ tiáº¿t (Largest Remainder Method)
    const distribute = (totalTarget: number) => {
      const exact = allItems.map((it: any) => (it.soTiet / totalTiet) * totalTarget);
      const fl = exact.map((v: number) => Math.floor(v));
      let remCount = totalTarget - fl.reduce((a: number, b: number) => a + b, 0);
      const diffs = exact.map((v: number, i: number) => ({ r: v - fl[i], i })).sort((a, b) => b.r - a.r);
      for (let k = 0; k < remCount; k++) fl[diffs[k].i]++;
      return fl;
    };

    // 1. PhÃ¢n bá»• ÄÃºng/Sai (Tá»•ng 4 cÃ¢u)
    const allocDS = distribute(4);
    
    // 2. PhÃ¢n bá»• Tráº£ lá»i ngáº¯n (Tá»•ng 6 cÃ¢u: 2 TH - 2 VD - 2 VDC)
    const allocTLN_TH = distribute(2);
    const allocTLN_VD = distribute(2);
    const allocTLN_VDC = distribute(2);

    // 3. PhÃ¢n bá»• Tráº¯c nghiá»‡m NLC (Tá»•ng 12 cÃ¢u: Chia má»©c NB vÃ  TH, bá» VD)
    // Æ¯u tiÃªn cáº¥p 1 cÃ¢u NLC cho cÃ¡c dÃ²ng chÆ°a cÃ³ cÃ¢u DS hoáº·c TLN nÃ o
    let nlcIdx = 1, dsIdx = 1, tlnIdx = 1;
    const allocNLC_Total = distribute(12);

    // --- THá»°C HIá»†N ÄIá»€N Dá»® LIá»†U ---
    allItems.forEach((item: any, idx: number) => {
      const nd = newData[item.cIdx].noiDungs[item.nIdx];

      // GÃ¡n ÄÃºng/Sai (vÃ o má»©c 0 - NB, trong ma tráº­n sáº½ tá»± hiá»ƒu cáº¥u trÃºc 1NB-2TH-1VD)
      for (let k = 0; k < allocDS[idx]; k++) {
        nd.mucDos[0].qs.ds += (nd.mucDos[0].qs.ds ? ', ' : '') + (dsIdx++);
      }

      // GÃ¡n Tráº£ lá»i ngáº¯n
      for (let k = 0; k < allocTLN_TH[idx]; k++) {
        nd.mucDos[1].qs.tln += (nd.mucDos[1].qs.tln ? ', ' : '') + (tlnIdx++);
      }
      for (let k = 0; k < allocTLN_VD[idx]; k++) {
        nd.mucDos[2].qs.tln += (nd.mucDos[2].qs.tln ? ', ' : '') + (tlnIdx++);
      }
      for (let k = 0; k < allocTLN_VDC[idx]; k++) {
        nd.mucDos[3].qs.tln += (nd.mucDos[3].qs.tln ? ', ' : '') + (tlnIdx++);
      }

      // GÃ¡n Tráº¯c nghiá»‡m NLC (Chia 60% NB - 40% TH)
      const nNLC = allocNLC_Total[idx];
      const nNB = Math.ceil(nNLC * 0.6);
      const nTH = nNLC - nNB;

      for (let k = 0; k < nNB; k++) {
        nd.mucDos[0].qs.nlc += (nd.mucDos[0].qs.nlc ? ', ' : '') + (nlcIdx++);
      }
      for (let k = 0; k < nTH; k++) {
        nd.mucDos[1].qs.nlc += (nd.mucDos[1].qs.nlc ? ', ' : '') + (nlcIdx++);
      }
    });

    // --- BÆ¯á»šC CUá»I: KIá»‚M TRA PHá»¦ KÃN ---
    // Náº¿u váº«n cÃ²n dÃ²ng nÃ o "tráº¯ng" cÃ¢u há»i, láº¥y 1 cÃ¢u NLC tá»« dÃ²ng nhiá»u nháº¥t chuyá»ƒn sang
    allItems.forEach((item: any) => {
      const nd = newData[item.cIdx].noiDungs[item.nIdx];
      const totalQ = (nd.mucDos[0].qs.nlc + nd.mucDos[1].qs.nlc + nd.mucDos[0].qs.ds + nd.mucDos[1].qs.tln).length;
      
      if (totalQ === 0) {
        // Cáº¥p "vÃ© vá»›t" 1 cÃ¢u NLC Nháº­n biáº¿t cho dÃ²ng bá»‹ trá»‘ng
        nd.mucDos[0].qs.nlc = "Bá»• sung"; 
      }
    });

    setData(newData);
  };

  const tuDongPhanBoMoi = () => {
    const newData = JSON.parse(JSON.stringify(data));
    const allItems: any[] = [];
    
    // 1. Thu tháº­p táº¥t cáº£ ná»™i dung vÃ o danh sÃ¡ch pháº³ng
    newData.forEach((c: any, cIdx: number) => {
      c.noiDungs.forEach((nd: any, nIdx: number) => {
        allItems.push({ 
          cIdx, 
          nIdx, 
          soTiet: nd.soTiet || 0,
          ten: nd.tenNoiDung 
        });
      });
    });

    // 2. Sáº¯p xáº¿p ná»™i dung theo Sá»‘ tiáº¿t giáº£m dáº§n (ChÆ°Æ¡ng quan trá»ng Ä‘á»©ng trÆ°á»›c)
    allItems.sort((a: any, b: any) => b.soTiet - a.soTiet);

    // 3. Reset toÃ n bá»™ sá»‘ cÃ¢u TLN cÅ©
    allItems.forEach((item: any) => {
      const nd = newData[item.cIdx].noiDungs[item.nIdx];
      nd.mucDos[1].qs.tln = ''; // TH
      nd.mucDos[2].qs.tln = ''; // VD
      nd.mucDos[3].qs.tln = ''; // VDC
    });

    // 4. Äá»‹nh nghÄ©a 6 "vá»‹ trÃ­" cÃ¢u TLN cáº§n phÃ¢n bá»•
    // Má»¥c tiÃªu: 2 cÃ¢u TH, 2 cÃ¢u VD, 2 cÃ¢u VDC
    const slots = [
      { level: 1, label: 'TH' },  // CÃ¢u 17
      { level: 1, label: 'TH' },  // CÃ¢u 18
      { level: 2, label: 'VD' },  // CÃ¢u 19
      { level: 2, label: 'VD' },  // CÃ¢u 20
      { level: 3, label: 'VDC' }, // CÃ¢u 21
      { level: 3, label: 'VDC' }  // CÃ¢u 22
    ];

    // 5. Thuáº­t toÃ¡n phÃ¢n ráº£i: 
    // Má»—i ná»™i dung sáº½ chá»‰ nháº­n Tá»I ÄA 1 cÃ¢u TLN cho Ä‘áº¿n khi háº¿t vÃ²ng.
    let tlnCounter = 17; 
    slots.forEach((slot, index) => {
      const itemIdx = index % allItems.length; 
      const item = allItems[itemIdx];
      
      const nd = newData[item.cIdx].noiDungs[item.nIdx];
      const currentQs = nd.mucDos[slot.level].qs.tln;
      
      nd.mucDos[slot.level].qs.tln = (currentQs ? currentQs + ', ' : '') + tlnCounter;
      tlnCounter++;
    });

    // 6. Cáº­p nháº­t láº¡i State
    setData(newData);
  };

  const addChuong = () => {
    setData([...data, { tenChuong: '', noiDungs: [{ tenNoiDung: '', soTiet: 0, mucDos: defaultLevels() }] }]);
  };

  const removeChuong = (idx: number) => {
    if (data.length > 1) {
      const newData = data.filter((_, i) => i !== idx);
      setData(newData);
    }
  };

  if (!isLoggedIn) return <Login handleLogin={() => setIsLoggedIn(true)} user={loginUser} setUser={setLoginUser} pass={loginPass} setPass={setLoginPass} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 font-sans text-slate-900">
      <Header monHoc={monHoc} setMonHoc={setMonHoc} handleLogout={() => { setIsLoggedIn(false); localStorage.removeItem('mmp_logged_in'); }} />
      
      <div className="flex justify-center gap-2 mb-8 sticky top-4 z-50">
        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full border border-slate-200 shadow-xl flex gap-1">
          {[
            { id: 'nhap-lieu', label: 'Nháº­p liá»‡u', icon: PenSquare, step: 1 },
            { id: 'ma-tran', label: 'Ma tráº­n', icon: Layout, step: 2 },
            { id: 'dac-ta', label: 'Ma tráº­n Ä‘áº·c táº£', icon: ListChecks, step: 3 },
            { id: 'tao-de', label: 'Táº¡o Ä‘á»', icon: FileJson, step: 4 }
          ].map((tab, idx, arr) => (
            <>
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-5 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2",
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black",
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                )}>{tab.step}</span>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
              {idx < arr.length - 1 && <span className="flex items-center text-slate-200 text-xs px-1">â€º</span>}
            </>
          ))}
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'nhap-lieu' && (
            <TabNhapLieu 
              key="nhap-lieu"
              data={data} 
              setData={setData} 
              tuDongPhanBo={tuDongPhanBo} 
              tuDongPhanBoMoi={tuDongPhanBoMoi}
              addChuong={addChuong}
              removeChuong={removeChuong}
              onNext={() => setActiveTab('ma-tran')}
            />
          )}
          {activeTab === 'ma-tran' && <TabMaTran key="ma-tran" data={data} monHoc={monHoc} countQuestions={countQuestions} totals={getTotals()} onPrev={() => setActiveTab('nhap-lieu')} onNext={() => setActiveTab('dac-ta')} />}
          {activeTab === 'dac-ta' && <TabDacTa key="dac-ta" data={data} countQuestions={countQuestions} onPrev={() => setActiveTab('ma-tran')} onNext={() => setActiveTab('tao-de')} />}
          {activeTab === 'tao-de' && <TabTaoDe key="tao-de" data={data} countQuestions={countQuestions} onPrev={() => setActiveTab('dac-ta')} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- CÃ¡c Tab ThÃ nh Pháº§n ---

function TabNhapLieu({ data, setData, tuDongPhanBo, tuDongPhanBoMoi, addChuong, removeChuong, onNext }: any) {
  const updateNoiDung = (cIdx: number, nIdx: number, val: any) => {
    const newData = [...data];
    newData[cIdx].noiDungs[nIdx] = { ...newData[cIdx].noiDungs[nIdx], ...val };
    
    // Auto-fill yÃªu cáº§u cáº§n Ä‘áº¡t khi thay Ä‘á»•i tÃªn bÃ i há»c
    if (val.tenNoiDung !== undefined) {
      const yeuCau = findYeuCau(val.tenNoiDung);
      if (yeuCau) {
        const mucDos = newData[cIdx].noiDungs[nIdx].mucDos;
        const yeuCauMap = [yeuCau.nhanBiet, yeuCau.thongHieu, yeuCau.vanDung, yeuCau.vanDungCao];
        yeuCauMap.forEach((yc, mIdx) => {
          if (!mucDos[mIdx].yeuCau || mucDos[mIdx].yeuCau.trim() === '') {
            mucDos[mIdx].yeuCau = yc;
          }
        });
      }
    }
    
    setData(newData);
  };

  const addNoiDung = (cIdx: number) => {
    const newData = [...data];
    newData[cIdx].noiDungs.push({ tenNoiDung: '', soTiet: 0, mucDos: defaultLevels() });
    setData(newData);
  };

  const removeNoiDung = (cIdx: number, nIdx: number) => {
    if (data[cIdx].noiDungs.length > 1) {
      const newData = [...data];
      newData[cIdx].noiDungs = newData[cIdx].noiDungs.filter((_: any, i: number) => i !== nIdx);
      setData(newData);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <BookOpen className="text-indigo-600" />
            Cáº¥u trÃºc Ä‘á» thi
          </h2>
          <p className="text-xs text-slate-400 mt-1">XÃ¢y dá»±ng ná»™i dung kiáº¿n thá»©c vÃ  phÃ¢n bá»• cÃ¢u há»i</p>
        </div>
        <div className="flex gap-3">
          <button onClick={addChuong} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Plus className="w-4 h-4" /> ThÃªm chÆ°Æ¡ng
          </button>
          <button onClick={tuDongPhanBo} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Sparkles className="w-4 h-4" /> Tá»± Ä‘á»™ng phÃ¢n bá»• (Chuáº©n 2026)
          </button>
          <button onClick={tuDongPhanBoMoi} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
            <RefreshCw className="w-4 h-4" /> PhÃ¢n bá»• TLN (Ráº£i Ä‘á»u)
          </button>
        </div>
      </div>

      {data.map((chuong: any, cIdx: number) => (
        <div key={cIdx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group">
          <button 
            onClick={() => removeChuong(cIdx)}
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
              {cIdx + 1}
            </div>
            <input 
              className="flex-1 text-lg font-bold p-2 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300" 
              placeholder="TÃªn chÆ°Æ¡ng/chá»§ Ä‘á» (vÃ­ dá»¥: ChÆ°Æ¡ng I. á»¨ng dá»¥ng Ä‘áº¡o hÃ m...)" 
              value={chuong.tenChuong} 
              onChange={e => {
                const newData = [...data]; newData[cIdx].tenChuong = e.target.value; setData(newData);
              }} 
            />
          </div>
          
          <div className="space-y-6">
            {chuong.noiDungs.map((nd: any, nIdx: number) => (
              <div key={nIdx} className="ml-6 p-6 border-l-4 border-indigo-500 bg-slate-50/50 rounded-r-2xl relative">
                <button 
                  onClick={() => removeNoiDung(cIdx, nIdx)}
                  className="absolute top-4 right-4 p-1 text-slate-300 hover:text-rose-500"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex gap-4 mb-6">
                  <div className="flex-[3] relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Ná»™i dung bÃ i há»c</label>
                    <input 
                      className="w-full p-3 rounded-xl border border-slate-200 font-semibold bg-white" 
                      placeholder="TÃªn bÃ i há»c/ná»™i dung (VD: TÃ­nh Ä‘Æ¡n Ä‘iá»‡u cá»§a hÃ m sá»‘)" 
                      value={nd.tenNoiDung} 
                      onChange={e => updateNoiDung(cIdx, nIdx, { tenNoiDung: e.target.value })} 
                      list={`topics-${cIdx}-${nIdx}`}
                    />
                    <datalist id={`topics-${cIdx}-${nIdx}`}>
                      {getAllTopics().map((topic: string) => (
                        <option key={topic} value={topic} />
                      ))}
                    </datalist>
                    {nd.tenNoiDung && findYeuCau(nd.tenNoiDung) && (
                      <span className="absolute right-3 top-8 text-emerald-500 text-[9px] font-bold">âœ“ ÄÃ£ tÃ¬m tháº¥y YCCÄ</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 text-center">Sá»‘ tiáº¿t</label>
                    <input className="w-full p-3 rounded-xl border border-slate-200 text-center font-black bg-white" type="number" placeholder="0" value={nd.soTiet || ''} onChange={e => updateNoiDung(cIdx, nIdx, { soTiet: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {nd.mucDos.map((md: any, mIdx: number) => (
                    <div key={mIdx} className={cn("p-4 rounded-2xl border transition-all", LEVELS[mIdx].border, LEVELS[mIdx].bgColor)}>
                      <div className="flex items-center justify-between mb-3">
                        <p className={cn("text-[10px] font-black uppercase", LEVELS[mIdx].color)}>{md.tenMucDo}</p>
                        <div className={cn("w-1.5 h-1.5 rounded-full", LEVELS[mIdx].accent)}></div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">YÃªu cáº§u cáº§n Ä‘áº¡t</label>
                          <textarea 
                            className="w-full p-2 text-[10px] rounded-lg border-none bg-white/70 focus:bg-white transition-all h-20 resize-none" 
                            placeholder="MÃ´ táº£ yÃªu cáº§u..." 
                            value={md.yeuCau} 
                            onChange={e => {
                              const newData = [...data]; newData[cIdx].noiDungs[nIdx].mucDos[mIdx].yeuCau = e.target.value; setData(newData);
                            }} 
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-1.5">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">CÃ¢u NLC</label>
                            <input className="w-full p-2 text-xs rounded-lg border border-slate-100 bg-white" placeholder="1, 2..." value={md.qs.nlc} onChange={e => {
                              const newData = [...data]; newData[cIdx].noiDungs[nIdx].mucDos[mIdx].qs.nlc = e.target.value; setData(newData);
                            }} />
                          </div>
                          
                          {mIdx === 0 && (
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">CÃ¢u ÄÃºng/Sai</label>
                              <input className="w-full p-2 text-xs rounded-lg border border-slate-100 bg-white" placeholder="1..." value={md.qs.ds} onChange={e => {
                                const newData = [...data]; newData[cIdx].noiDungs[nIdx].mucDos[mIdx].qs.ds = e.target.value; setData(newData);
                              }} />
                            </div>
                          )}

                          {mIdx > 0 && (
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">CÃ¢u TL Ngáº¯n</label>
                              <input className="w-full p-2 text-xs rounded-lg border border-slate-100 bg-white" placeholder="1..." value={md.qs.tln} onChange={e => {
                                const newData = [...data]; newData[cIdx].noiDungs[nIdx].mucDos[mIdx].qs.tln = e.target.value; setData(newData);
                              }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => addNoiDung(cIdx)}
              className="ml-6 w-[calc(100%-1.5rem)] py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> ThÃªm ná»™i dung bÃ i há»c
            </button>
          </div>
        </div>
      ))}

      {/* NÃºt Ä‘iá»u hÆ°á»›ng */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm"
        >
          Xem Ma tráº­n Ä‘á» <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

function TabMaTran({ data, monHoc, countQuestions, totals, onPrev, onNext }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl overflow-x-auto"
    >
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black uppercase tracking-tight">MA TRáº¬N Äá»€ KIá»‚M TRA Äá»ŠNH Ká»²</h2>
        <p className="text-slate-500 font-bold mt-1">MÃ”N: {monHoc.toUpperCase()} - Lá»šP 12</p>
        <div className="w-20 h-1 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
      </div>

      <table className="w-full border-collapse border border-slate-300 text-[11px]">
        <thead>
          <tr className="bg-slate-900 text-white text-center">
            <th className="border border-slate-700 p-3" rowSpan={3}>STT</th>
            <th className="border border-slate-700 p-3" rowSpan={3}>Ná»™i dung kiáº¿n thá»©c</th>
            <th className="border border-slate-700 p-3" rowSpan={3}>Sá»‘ tiáº¿t</th>
            <th className="border border-slate-700 p-3" colSpan={3}>Tráº¯c nghiá»‡m (12 cÃ¢u)</th>
            <th className="border border-slate-700 p-3" colSpan={3}>ÄÃºng/Sai (4 cÃ¢u)</th>
            <th className="border border-slate-700 p-3" colSpan={3}>Tráº£ lá»i ngáº¯n (6 cÃ¢u)</th>
            <th className="border border-slate-700 p-3" rowSpan={3}>Tá»•ng</th>
          </tr>
          <tr className="bg-slate-800 text-white">
            <th className="border border-slate-600 p-2 bg-emerald-900/50">NB</th>
            <th className="border border-slate-600 p-2 bg-emerald-900/50">TH</th>
            <th className="border border-slate-600 p-2 bg-emerald-900/50">VD</th>
            <th className="border border-slate-600 p-2 bg-amber-900/50">NB</th>
            <th className="border border-slate-600 p-2 bg-amber-900/50">TH</th>
            <th className="border border-slate-600 p-2 bg-amber-900/50">VD</th>
            <th className="border border-slate-600 p-2 bg-rose-900/50">TH</th>
            <th className="border border-slate-600 p-2 bg-rose-900/50">VD</th>
            <th className="border border-slate-600 p-2 bg-rose-900/50">VDC</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c: any) => c.noiDungs.map((nd: any, nIdx: number) => {
            const rowTotal = nd.mucDos.reduce((acc: number, md: any) => acc + countQuestions(md.qs.nlc) + countQuestions(md.qs.ds) + countQuestions(md.qs.tln), 0);
            return (
              <tr key={nIdx} className="text-center hover:bg-slate-50 transition-colors">
                <td className="border border-slate-200 p-2 text-slate-400">{nIdx + 1}</td>
                <td className="border border-slate-200 p-2 text-left font-bold">{nd.tenNoiDung}</td>
                <td className="border border-slate-200 p-2 font-black text-indigo-600">{nd.soTiet}</td>
                {/* NLC */}
                <td className="border border-slate-200 p-2 text-emerald-700 font-bold bg-emerald-50/30">{countQuestions(nd.mucDos[0].qs.nlc) || ''}</td>
                <td className="border border-slate-200 p-2 text-emerald-700 font-bold bg-emerald-50/30">{countQuestions(nd.mucDos[1].qs.nlc) || ''}</td>
                <td className="border border-slate-200 p-2 text-emerald-700 font-bold bg-emerald-50/30">{countQuestions(nd.mucDos[2].qs.nlc) || ''}</td>
                {/* DS */}
                <td className="border border-slate-200 p-2 text-amber-700 font-bold bg-amber-50/30">{countQuestions(nd.mucDos[0].qs.ds) * 1 || ''}</td>
                <td className="border border-slate-200 p-2 text-amber-700 font-bold bg-amber-50/30">{countQuestions(nd.mucDos[0].qs.ds) * 2 || ''}</td>
                <td className="border border-slate-200 p-2 text-amber-700 font-bold bg-amber-50/30">{countQuestions(nd.mucDos[0].qs.ds) * 1 || ''}</td>
                {/* TLN */}
                <td className="border border-slate-200 p-2 text-rose-700 font-bold bg-rose-50/30">{countQuestions(nd.mucDos[1].qs.tln) || ''}</td>
                <td className="border border-slate-200 p-2 text-rose-700 font-bold bg-rose-50/30">{countQuestions(nd.mucDos[2].qs.tln) || ''}</td>
                <td className="border border-slate-200 p-2 text-rose-700 font-bold bg-rose-50/30">{countQuestions(nd.mucDos[3].qs.tln) || ''}</td>
                <td className="border border-slate-200 p-2 bg-slate-50 font-black text-slate-700">{rowTotal}</td>
              </tr>
            );
          }))}
          <tr className="bg-slate-900 text-white font-black text-center">
            <td colSpan={3} className="p-4">Tá»”NG Cá»˜NG</td>
            <td colSpan={3} className="bg-emerald-900/30">{totals.p1}/12 cÃ¢u</td>
            <td colSpan={3} className="bg-amber-900/30">{totals.p2}/4 cÃ¢u</td>
            <td colSpan={3} className="bg-rose-900/30">{totals.p3}/6 cÃ¢u</td>
            <td className="bg-indigo-600 text-white text-lg">{totals.total}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Pháº§n I (NLC)</p>
          <p className="text-2xl font-black text-emerald-900">{Math.round((totals.p1/22)*100)}% <span className="text-sm font-normal text-emerald-600">tá»•ng sá»‘ cÃ¢u</span></p>
        </div>
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
          <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Pháº§n II (ÄÃºng/Sai)</p>
          <p className="text-2xl font-black text-amber-900">{Math.round((totals.p2/22)*100)}% <span className="text-sm font-normal text-amber-600">tá»•ng sá»‘ cÃ¢u</span></p>
        </div>
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
          <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Pháº§n III (TL Ngáº¯n)</p>
          <p className="text-2xl font-black text-rose-900">{Math.round((totals.p3/22)*100)}% <span className="text-sm font-normal text-rose-600">tá»•ng sá»‘ cÃ¢u</span></p>
        </div>
      </div>

      {/* NÃºt Ä‘iá»u hÆ°á»›ng */}
      <div className="flex justify-between mt-6">
        <button onClick={onPrev} className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all text-slate-600">
          â† Nháº­p liá»‡u
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => exportMatrixWord(data, countQuestions, monHoc)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <FileJson className="w-4 h-4" /> Xuáº¥t Word (.doc)
          </button>
        <button onClick={onNext} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm">
          Xem Ma tráº­n Ä‘áº·c táº£ <ChevronRight className="w-5 h-5" />
        </button>
        </div>
      </div>
    </motion.div>
  );
}

function TabDacTa({ data, countQuestions, onPrev, onNext }: any) {
  // Helper láº¥y yÃªu cáº§u cáº§n Ä‘áº¡t theo má»©c Ä‘á»™
  const getYeuCau = (tenBai: string, mIdx: number, yeuCauNhap: string): { text: string; isAuto: boolean } => {
    if (yeuCauNhap && yeuCauNhap.trim()) return { text: yeuCauNhap, isAuto: false };
    const found = findYeuCau(tenBai);
    if (!found) return { text: '---', isAuto: false };
    const map = [found.nhanBiet, found.thongHieu, found.vanDung, found.vanDungCao];
    return { text: map[mIdx] || '---', isAuto: true };
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl overflow-x-auto"
    >
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black uppercase tracking-tight">Báº¢NG MA TRáº¬N Äáº¶C Táº¢ CHI TIáº¾T Äá»€ KIá»‚M TRA</h2>
        <p className="text-slate-500 font-bold mt-1">HÆ¯á»šNG DáºªN CHáº¤M VÃ€ ÄÃNH GIÃ NÄ‚NG Lá»°C</p>
        <div className="w-20 h-1 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
        <div className="mt-4 flex justify-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-slate-200 inline-block"></span>Nháº­p tay
          </span>
          <span className="flex items-center gap-1.5 text-indigo-500">
            <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300 inline-block"></span>Tá»± Ä‘á»™ng tá»« CSDL chuáº©n
          </span>
        </div>
      </div>

      <table className="w-full border-collapse border border-slate-300 text-[11px]">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="border border-slate-700 p-3 w-12 text-center">STT</th>
            <th className="border border-slate-700 p-3 w-48">Ná»™i dung</th>
            <th className="border border-slate-700 p-3 w-28 text-center">Má»©c Ä‘á»™</th>
            <th className="border border-slate-700 p-3">YÃªu cáº§u cáº§n Ä‘áº¡t</th>
            <th className="border border-slate-700 p-3 w-20 text-center">NLC</th>
            <th className="border border-slate-700 p-3 w-20 text-center">ÄÃºng/Sai</th>
            <th className="border border-slate-700 p-3 w-20 text-center">TL Ngáº¯n</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c: any, cIdx: number) => c.noiDungs.map((nd: any, nIdx: number) => nd.mucDos.map((md: any, mIdx: number) => {
            const { text: yeuCauText, isAuto } = getYeuCau(nd.tenNoiDung, mIdx, md.yeuCau);
            return (
              <tr key={`${cIdx}-${nIdx}-${mIdx}`} className="hover:bg-slate-50 transition-colors">
                {mIdx === 0 && <td rowSpan={4} className="border border-slate-200 p-3 text-center font-bold text-slate-400">{nIdx + 1}</td>}
                {mIdx === 0 && <td rowSpan={4} className="border border-slate-200 p-3 font-bold text-slate-700">{nd.tenNoiDung}</td>}
                <td className={cn("border border-slate-200 p-3 font-bold text-center", LEVELS[mIdx].color)}>{LEVELS[mIdx].name}</td>
                <td className={cn(
                  "border border-slate-200 p-3 text-justify leading-relaxed",
                  isAuto ? "text-indigo-600 italic bg-indigo-50/30" : "text-slate-600"
                )}>
                  {yeuCauText}
                  {isAuto && (
                    <span className="ml-1 text-[8px] font-bold text-indigo-400 not-italic">[auto]</span>
                  )}
                </td>
                <td className="border border-slate-200 p-3 text-center font-bold text-emerald-700 bg-emerald-50/20">{md.qs.nlc || ''}</td>
                <td className="border border-slate-200 p-3 text-center font-bold text-amber-700 bg-amber-50/20">{mIdx === 0 ? (md.qs.ds || '') : ''}</td>
                <td className="border border-slate-200 p-3 text-center font-bold text-rose-700 bg-rose-50/20">{md.qs.tln || ''}</td>
              </tr>
            );
          })))}
        </tbody>
      </table>

      {/* Placeholder for duplicate block removal */}

      {/* NÃºt Ä‘iá»u hÆ°á»›ng */}
      <div className="flex justify-between mt-6">
        <button onClick={onPrev} className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all text-slate-600">
          â† Ma tráº­n
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm">
          Táº¡o Ä‘á» thi <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

function TabTaoDe({ data, countQuestions, onPrev, monHoc = 'ToÃ¡n' }: any) {
  const [exam, setExam] = useState<any[]>([]);
  const mathRef = useMathRender([exam]);

  // HÃ m sinh Ä‘á» dá»±a trÃªn dá»¯ liá»‡u tá»« Ma tráº­n Ä‘áº·c táº£
  const handleGenerateExam = () => {

    let globalStt = 1; // Sá»‘ thá»© tá»± cÃ¢u há»i xuyÃªn suá»‘t

    // TÃ¡ch thÃ nh 3 danh sÃ¡ch táº¡m thá»i cho 3 pháº§n theo chuáº©n 2026
    const part1_NLC: any[] = [];
    const part2_DS: any[] = [];
    const part3_TLN: any[] = [];

    // Duyá»‡t qua toÃ n bá»™ dá»¯ liá»‡u ngÆ°á»i dÃ¹ng Ä‘Ã£ nháº­p
    data.forEach((chuong: any) => {
      chuong.noiDungs.forEach((nd: any) => {
        // --- PHáº¦N I: TRáº®C NGHIá»†M NHIá»€U PHÆ¯Æ NG ÃN (NLC) ---
        nd.mucDos.forEach((md: any, mIdx: number) => {
          const numQ = countQuestions(md.qs.nlc);
          const mucDoTen = LEVELS[mIdx].name;
          for (let i = 0; i < numQ; i++) {
            const q = pickNLCQuestion(nd.tenNoiDung, mucDoTen);
            part1_NLC.push({
              ...q,
              phan: 'I',
              chuong: chuong.tenChuong,
              bai: nd.tenNoiDung,
              mucDo: mucDoTen,
              yeuCau: md.yeuCau,
              stt: globalStt++
            });
          }
        });

        // --- PHáº¦N II: TRáº®C NGHIá»†M ÄÃšNG/SAI (DS) ---
        const numDS = countQuestions(nd.mucDos[0].qs.ds);
        for (let i = 0; i < numDS; i++) {
          const qDS = pickDSQuestion(nd.tenNoiDung);
          part2_DS.push({
            ...qDS,
            phan: 'II',
            chuong: chuong.tenChuong,
            bai: nd.tenNoiDung,
            yeuCau: nd.mucDos[0].yeuCau,
            stt: globalStt++
          });
        }

        // --- PHáº¦N III: TRáº¢ Lá»œI NGáº®N (TLN) ---
        nd.mucDos.forEach((md: any, mIdx: number) => {
          const numTLN = countQuestions(md.qs.tln);
          const mucDoTen = LEVELS[mIdx].name;
          for (let i = 0; i < numTLN; i++) {
            const qTLN = pickTLNQuestion(nd.tenNoiDung, mucDoTen);
            part3_TLN.push({
              ...qTLN,
              phan: 'III',
              chuong: chuong.tenChuong,
              bai: nd.tenNoiDung,
              mucDo: mucDoTen,
              yeuCau: md.yeuCau,
              stt: globalStt++
            });
          }
        });
      });
    });

    // Gá»™p cÃ¡c pháº§n láº¡i vÃ  cáº­p nháº­t state
    setExam([...part1_NLC, ...part2_DS, ...part3_TLN]);
  };

  return (
    <div className="space-y-6" ref={mathRef as any}>
      {/* Header Ä‘iá»u khiá»ƒn */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Sparkles className="text-indigo-600" />
            Sinh Ä‘á» tá»« Ma tráº­n Ä‘áº·c táº£
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            CÃ¢u há»i Ä‘Æ°á»£c chá»n lá»c chÃ­nh xÃ¡c theo: {data.reduce((acc, c) => acc + c.noiDungs.length, 0)} Ä‘Æ¡n vá»‹ kiáº¿n thá»©c Ä‘Ã£ thiáº¿t láº­p.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportExamWord(exam, monHoc)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
          >
            <Download className="w-4 h-4" /> Xuáº¥t Word
          </button>
          <button
            onClick={handleGenerateExam}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl"
          >
            <RefreshCw className="w-5 h-5" /> Táº O Äá»€ THEO Äáº¶C Táº¢
          </button>
        </div>
      </div>

      <AnimatePresence>
        {exam.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="exam-paper rounded-3xl p-16 max-w-[900px] mx-auto relative bg-white shadow-2xl"
          >
            <ExamContent exam={exam} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between mt-6">
        <button onClick={onPrev} className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 rounded-2xl font-bold text-sm text-slate-600">
          â† Quay láº¡i Äáº·c táº£
        </button>
      </div>
    </div>
  );
}

function ExamContent({ exam }: { exam: any[] }) {
  const p1 = exam.filter(q => q.phan === 'I');
  const p2 = exam.filter(q => q.phan === 'II');
  const p3 = exam.filter(q => q.phan === 'III');

  return (
    <div className="relative z-10">
      {p1.length > 0 && (
        <section className="mb-10">
          <h4 className="font-bold mb-4 flex items-center gap-2 text-base">
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHáº¦N I</span>
            CÃ¢u tráº¯c nghiá»‡m nhiá»u phÆ°Æ¡ng Ã¡n lá»±a chá»n.
          </h4>
          {p1.map(q => (
            <div key={q.id} className="mb-6 group">
              <p className="text-sm leading-relaxed mb-2">
                <strong>CÃ¢u {q.stt}.</strong> {q.noiDung}
                <span className="ml-2 text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  [{q.bai} - {q.mucDo}]
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <div key={opt} className="text-sm border border-slate-100 p-2 rounded-lg italic text-slate-500">
                    <strong>{opt}.</strong> ...
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      {p2.length > 0 && (
        <section className="mb-10">
          <h4 className="font-bold mb-4 flex items-center gap-2 text-base">
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHáº¦N II</span>
            CÃ¢u tráº¯c nghiá»‡m Ä‘Ãºng sai.
          </h4>
          {p2.map(q => (
            <div key={q.id} className="mb-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p className="text-sm font-bold mb-3">CÃ¢u {q.stt}. {q.context}</p>
              {q.image && <img src={q.image} className="max-w-xs mx-auto my-4 rounded shadow-sm" />}
              <div className="space-y-2">
                {q.statements?.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100">
                    <span>{['a', 'b', 'c', 'd'][i]}) {s.text}</span>
                    <div className="flex gap-4 text-[10px] font-bold text-slate-300">
                      <span className="border px-2 py-0.5 rounded">ÄÃºng</span>
                      <span className="border px-2 py-0.5 rounded">Sai</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      {p3.length > 0 && (
        <section>
          <h4 className="font-bold mb-4 flex items-center gap-2 text-base">
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHáº¦N III</span>
            CÃ¢u tráº¯c nghiá»‡m tráº£ lá»i ngáº¯n.
          </h4>
          <div className="grid grid-cols-1 gap-6">
            {p3.map(q => (
              <div key={q.id} className="question-card">
                <p className="text-sm">
                  <strong>CÃ¢u {q.stt}.</strong> {q.noiDung}
                  <span className="text-[9px] text-slate-400 ml-2">({q.mucDo})</span>
                </p>
                <div className="mt-2 h-8 w-32 border-b-2 border-dashed border-slate-300 flex items-end pb-1 text-xs text-slate-300">
                  ÄÃ¡p sá»‘: ................
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
// --- CÃ¡c Component giao diá»‡n nhá» ---

function Header({ monHoc, setMonHoc, handleLogout }: any) {
  return (
    <header className="max-w-4xl mx-auto text-center mb-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full mb-4"
      >
        <Sparkles className="w-3 h-3 text-indigo-600" />
        <p className="text-indigo-600 font-black tracking-widest text-[9px] uppercase">CÃ´ng cá»¥ GiÃ¡o dá»¥c ThÃ´ng minh nÄƒm 2026</p>
      </motion.div>
      
      <h1 className="text-5xl font-black text-slate-900 italic tracking-tighter mb-6">
        Ma tráº­n ToÃ¡n há»c. <span className="text-indigo-600 relative">Pro
          <svg className="absolute -bottom-2 left-0 w-full h-2 text-indigo-200" viewBox="0 0 100 10" preserveAspectRatio="none">
            <path d="M0 5 Q 25 0 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
        </span>
      </h1>

      <div className="flex justify-center items-center gap-4">
        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex gap-1">
          {['ToÃ¡n', 'LÃ½', 'HÃ³a há»c'].map(m => (
            <button 
              key={m} 
              onClick={() => setMonHoc(m)} 
              className={cn(
                "px-6 py-1.5 rounded-lg text-xs font-bold transition-all",
                monHoc === m ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-slate-200 mx-2"></div>
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          ÄÄƒng xuáº¥t
        </button>
      </div>
    </header>
  );
}

function Login({ handleLogin, user, setUser, pass, setPass }: any) {
  const [error, setError] = useState('');

  const onLogin = () => {
    if(user === 'Bui Thi KiÃªn' && pass === '12345') {
      localStorage.setItem('mmp_logged_in', 'true');
      handleLogin();
    } else {
      setError('TÃªn Ä‘Äƒng nháº­p hoáº·c máº­t kháº©u khÃ´ng chÃ­nh xÃ¡c!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/10 w-full max-w-md relative z-10 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-500/20 rotate-3">
            <Key className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter">Ma tráº­n ToÃ¡n há»c. <span className="text-indigo-400">Pro</span></h1>
          <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Há»‡ thá»‘ng quáº£n lÃ½ Ä‘á» thi 2026</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input 
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-400 focus:bg-white/10 transition-all placeholder:text-slate-500" 
              placeholder="TÃªn Ä‘Äƒng nháº­p" 
              value={user} 
              onChange={e => setUser(e.target.value)} 
            />
          </div>
          <div className="relative">
            <input 
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-400 focus:bg-white/10 transition-all placeholder:text-slate-500" 
              type="password" 
              placeholder="Máº­t kháº©u" 
              value={pass} 
              onChange={e => setPass(e.target.value)} 
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-rose-400 text-[10px] font-bold text-center flex items-center justify-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {error}
            </motion.p>
          )}

          <button 
            onClick={onLogin} 
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/20 mt-4 active:scale-95"
          >
            ÄÄ‚NG NHáº¬P Há»† THá»NG
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Báº£n quyá»n thuá»™c vá» Smarter Education Tools Â© 2026</p>
        </div>
      </motion.div>
    </div>
  );
}