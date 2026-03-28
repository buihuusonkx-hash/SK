/**
 * @license
 * Math Matrix Pro - Phiên bản chuẩn hóa 2026
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

// --- Cấu hình hệ thống ---
const LEVELS = [
  { id: 0, name: 'Nhận biết', color: 'text-emerald-600', bgColor: 'bg-emerald-50', border: 'border-emerald-100', accent: 'bg-emerald-600' },
  { id: 1, name: 'Thông hiểu', color: 'text-amber-600', bgColor: 'bg-amber-50', border: 'border-amber-100', accent: 'bg-amber-600' },
  { id: 2, name: 'Vận dụng', color: 'text-rose-600', bgColor: 'bg-rose-50', border: 'border-rose-100', accent: 'bg-rose-600' },
  { id: 3, name: 'Vận dụng cao', color: 'text-purple-600', bgColor: 'bg-purple-50', border: 'border-purple-100', accent: 'bg-purple-600' }
];

const defaultLevels = () => LEVELS.map(l => ({
  tenMucDo: l.name,
  yeuCau: '',
  qs: { nlc: '', ds: '', tln: '' }
}));

export default function App() {
  const [activeTab, setActiveTab] = useState('nhap-lieu');
  const [data, setData] = useState<any[]>([]);
  const [monHoc, setMonHoc] = useState('Toán');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('mmp_logged_in') === 'true');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Khởi tạo
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

  // --- Logic Nghiệp vụ ---
  const countQuestions = (input: string) => {
    if (!input) return 0;
    return input.split(/[,;\s]+/).filter(s => s && /\d/.test(s)).length;
  };

  const getTotals = () => {
    let p1 = 0, p2 = 0, p3 = 0;
    data.forEach(c => c.noiDungs.forEach((nd: any) => {
      // NLC: Tổng từ NB, TH, VD
      p1 += countQuestions(nd.mucDos[0].qs.nlc) + countQuestions(nd.mucDos[1].qs.nlc) + countQuestions(nd.mucDos[2].qs.nlc);
      // DS: Đếm số câu (mỗi câu 4 ý)
      p2 += countQuestions(nd.mucDos[0].qs.ds);
      // TLN: Tổng từ TH, VD, VDC
      p3 += countQuestions(nd.mucDos[1].qs.tln) + countQuestions(nd.mucDos[2].qs.tln) + countQuestions(nd.mucDos[3].qs.tln);
    }));
    return { p1, p2, p3, total: p1 + p2 + p3 };
  };

  const tuDongPhanBo = () => {
    const newData = JSON.parse(JSON.stringify(data));
    const allItems: any[] = [];
    
    // Gom tất cả các đơn vị kiến thức vào một danh sách phẳng
    newData.forEach((c: any, cIdx: number) => {
      c.noiDungs.forEach((nd: any, nIdx: number) => {
        allItems.push({ cIdx, nIdx, soTiet: nd.soTiet || 0, ten: nd.tenNoiDung });
      });
    });

    const totalTiet = allItems.reduce((acc: number, it: any) => acc + it.soTiet, 0);
    if (totalTiet === 0) return alert("Vui lòng nhập 'Số tiết' để tính toán!");

    // Reset toàn bộ dữ liệu câu hỏi cũ
    allItems.forEach((item: any) => {
      const nd = newData[item.cIdx].noiDungs[item.nIdx];
      nd.mucDos.forEach((m: any) => { m.qs.nlc = ''; m.qs.ds = ''; m.qs.tln = ''; });
    });

    // Hàm bổ trợ phân phối số câu dựa trên tỷ lệ số tiết (Largest Remainder Method)
    const distribute = (totalTarget: number) => {
      const exact = allItems.map((it: any) => (it.soTiet / totalTiet) * totalTarget);
      const fl = exact.map((v: number) => Math.floor(v));
      let remCount = totalTarget - fl.reduce((a: number, b: number) => a + b, 0);
      const diffs = exact.map((v: number, i: number) => ({ r: v - fl[i], i })).sort((a, b) => b.r - a.r);
      for (let k = 0; k < remCount; k++) fl[diffs[k].i]++;
      return fl;
    };

    // 1. Phân bổ Đúng/Sai (Tổng 4 câu)
    const allocDS = distribute(4);
    
    // 2. Phân bổ Trả lời ngắn (Tổng 6 câu: 2 TH - 2 VD - 2 VDC)
    const allocTLN_TH = distribute(2);
    const allocTLN_VD = distribute(2);
    const allocTLN_VDC = distribute(2);

    // 3. Phân bổ Trắc nghiệm NLC (Tổng 12 câu: Chia mức NB và TH, bỏ VD)
    // Ưu tiên cấp 1 câu NLC cho các dòng chưa có câu DS hoặc TLN nào
    let nlcIdx = 1, dsIdx = 1, tlnIdx = 1;
    const allocNLC_Total = distribute(12);

    // --- THỰC HIỆN ĐIỀN DỮ LIỆU ---
    allItems.forEach((item: any, idx: number) => {
      const nd = newData[item.cIdx].noiDungs[item.nIdx];

      // Gán Đúng/Sai (vào mức 0 - NB, trong ma trận sẽ tự hiểu cấu trúc 1NB-2TH-1VD)
      for (let k = 0; k < allocDS[idx]; k++) {
        nd.mucDos[0].qs.ds += (nd.mucDos[0].qs.ds ? ', ' : '') + (dsIdx++);
      }

      // Gán Trả lời ngắn
      for (let k = 0; k < allocTLN_TH[idx]; k++) {
        nd.mucDos[1].qs.tln += (nd.mucDos[1].qs.tln ? ', ' : '') + (tlnIdx++);
      }
      for (let k = 0; k < allocTLN_VD[idx]; k++) {
        nd.mucDos[2].qs.tln += (nd.mucDos[2].qs.tln ? ', ' : '') + (tlnIdx++);
      }
      for (let k = 0; k < allocTLN_VDC[idx]; k++) {
        nd.mucDos[3].qs.tln += (nd.mucDos[3].qs.tln ? ', ' : '') + (tlnIdx++);
      }

      // Gán Trắc nghiệm NLC (Chia 60% NB - 40% TH)
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

    // --- BƯỚC CUỐI: KIỂM TRA PHỦ KÍN ---
    // Nếu vẫn còn dòng nào "trắng" câu hỏi, lấy 1 câu NLC từ dòng nhiều nhất chuyển sang
    allItems.forEach((item: any) => {
      const nd = newData[item.cIdx].noiDungs[item.nIdx];
      const totalQ = (nd.mucDos[0].qs.nlc + nd.mucDos[1].qs.nlc + nd.mucDos[0].qs.ds + nd.mucDos[1].qs.tln).length;
      
      if (totalQ === 0) {
        // Cấp "vé vớt" 1 câu NLC Nhận biết cho dòng bị trống
        nd.mucDos[0].qs.nlc = "Bổ sung"; 
      }
    });

    setData(newData);
  };

  const tuDongPhanBoMoi = () => {
    const newData = JSON.parse(JSON.stringify(data));
    const allItems: any[] = [];
    
    // 1. Thu thập tất cả nội dung vào danh sách phẳng
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

    // 2. Sắp xếp nội dung theo Số tiết giảm dần (Chương quan trọng đứng trước)
    allItems.sort((a: any, b: any) => b.soTiet - a.soTiet);

    // 3. Reset toàn bộ số câu TLN cũ
    allItems.forEach((item: any) => {
      const nd = newData[item.cIdx].noiDungs[item.nIdx];
      nd.mucDos[1].qs.tln = ''; // TH
      nd.mucDos[2].qs.tln = ''; // VD
      nd.mucDos[3].qs.tln = ''; // VDC
    });

    // 4. Định nghĩa 6 "vị trí" câu TLN cần phân bổ
    // Mục tiêu: 2 câu TH, 2 câu VD, 2 câu VDC
    const slots = [
      { level: 1, label: 'TH' },  // Câu 17
      { level: 1, label: 'TH' },  // Câu 18
      { level: 2, label: 'VD' },  // Câu 19
      { level: 2, label: 'VD' },  // Câu 20
      { level: 3, label: 'VDC' }, // Câu 21
      { level: 3, label: 'VDC' }  // Câu 22
    ];

    // 5. Thuật toán phân rải: 
    // Mỗi nội dung sẽ chỉ nhận TỐI ĐA 1 câu TLN cho đến khi hết vòng.
    let tlnCounter = 17; 
    slots.forEach((slot, index) => {
      const itemIdx = index % allItems.length; 
      const item = allItems[itemIdx];
      
      const nd = newData[item.cIdx].noiDungs[item.nIdx];
      const currentQs = nd.mucDos[slot.level].qs.tln;
      
      nd.mucDos[slot.level].qs.tln = (currentQs ? currentQs + ', ' : '') + tlnCounter;
      tlnCounter++;
    });

    // 6. Cập nhật lại State
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
            { id: 'nhap-lieu', label: 'Nhập liệu', icon: PenSquare, step: 1 },
            { id: 'ma-tran', label: 'Ma trận', icon: Layout, step: 2 },
            { id: 'dac-ta', label: 'Ma trận đặc tả', icon: ListChecks, step: 3 },
            { id: 'tao-de', label: 'Tạo đề', icon: FileJson, step: 4 }
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
              {idx < arr.length - 1 && <span className="flex items-center text-slate-200 text-xs px-1">›</span>}
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

// --- Các Tab Thành Phần ---

function TabNhapLieu({ data, setData, tuDongPhanBo, tuDongPhanBoMoi, addChuong, removeChuong, onNext }: any) {
  const updateNoiDung = (cIdx: number, nIdx: number, val: any) => {
    const newData = [...data];
    newData[cIdx].noiDungs[nIdx] = { ...newData[cIdx].noiDungs[nIdx], ...val };
    
    // Auto-fill yêu cầu cần đạt khi thay đổi tên bài học
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
            Cấu trúc đề thi
          </h2>
          <p className="text-xs text-slate-400 mt-1">Xây dựng nội dung kiến thức và phân bổ câu hỏi</p>
        </div>
        <div className="flex gap-3">
          <button onClick={addChuong} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Plus className="w-4 h-4" /> Thêm chương
          </button>
          <button onClick={tuDongPhanBo} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Sparkles className="w-4 h-4" /> Tự động phân bổ (Chuẩn 2026)
          </button>
          <button onClick={tuDongPhanBoMoi} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
            <RefreshCw className="w-4 h-4" /> Phân bổ TLN (Rải đều)
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
              placeholder="Tên chương/chủ đề (ví dụ: Chương I. Ứng dụng đạo hàm...)" 
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nội dung bài học</label>
                    <input 
                      className="w-full p-3 rounded-xl border border-slate-200 font-semibold bg-white" 
                      placeholder="Tên bài học/nội dung (VD: Tính đơn điệu của hàm số)" 
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
                      <span className="absolute right-3 top-8 text-emerald-500 text-[9px] font-bold">✓ Đã tìm thấy YCCĐ</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 text-center">Số tiết</label>
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
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Yêu cầu cần đạt</label>
                          <textarea 
                            className="w-full p-2 text-[10px] rounded-lg border-none bg-white/70 focus:bg-white transition-all h-20 resize-none" 
                            placeholder="Mô tả yêu cầu..." 
                            value={md.yeuCau} 
                            onChange={e => {
                              const newData = [...data]; newData[cIdx].noiDungs[nIdx].mucDos[mIdx].yeuCau = e.target.value; setData(newData);
                            }} 
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-1.5">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Câu NLC</label>
                            <input className="w-full p-2 text-xs rounded-lg border border-slate-100 bg-white" placeholder="1, 2..." value={md.qs.nlc} onChange={e => {
                              const newData = [...data]; newData[cIdx].noiDungs[nIdx].mucDos[mIdx].qs.nlc = e.target.value; setData(newData);
                            }} />
                          </div>
                          
                          {mIdx === 0 && (
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Câu Đúng/Sai</label>
                              <input className="w-full p-2 text-xs rounded-lg border border-slate-100 bg-white" placeholder="1..." value={md.qs.ds} onChange={e => {
                                const newData = [...data]; newData[cIdx].noiDungs[nIdx].mucDos[mIdx].qs.ds = e.target.value; setData(newData);
                              }} />
                            </div>
                          )}

                          {mIdx > 0 && (
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Câu TL Ngắn</label>
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
              <Plus className="w-4 h-4" /> Thêm nội dung bài học
            </button>
          </div>
        </div>
      ))}

      {/* Nút điều hướng */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm"
        >
          Xem Ma trận đề <ChevronRight className="w-5 h-5" />
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
        <h2 className="text-2xl font-black uppercase tracking-tight">MA TRẬN ĐỀ KIỂM TRA ĐỊNH KỲ</h2>
        <p className="text-slate-500 font-bold mt-1">MÔN: {monHoc.toUpperCase()} - LỚP 12</p>
        <div className="w-20 h-1 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
      </div>

      <table className="w-full border-collapse border border-slate-300 text-[11px]">
        <thead>
          <tr className="bg-slate-900 text-white text-center">
            <th className="border border-slate-700 p-3" rowSpan={3}>STT</th>
            <th className="border border-slate-700 p-3" rowSpan={3}>Nội dung kiến thức</th>
            <th className="border border-slate-700 p-3" rowSpan={3}>Số tiết</th>
            <th className="border border-slate-700 p-3" colSpan={3}>Trắc nghiệm (12 câu)</th>
            <th className="border border-slate-700 p-3" colSpan={3}>Đúng/Sai (4 câu)</th>
            <th className="border border-slate-700 p-3" colSpan={3}>Trả lời ngắn (6 câu)</th>
            <th className="border border-slate-700 p-3" rowSpan={3}>Tổng</th>
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
            <td colSpan={3} className="p-4">TỔNG CỘNG</td>
            <td colSpan={3} className="bg-emerald-900/30">{totals.p1}/12 câu</td>
            <td colSpan={3} className="bg-amber-900/30">{totals.p2}/4 câu</td>
            <td colSpan={3} className="bg-rose-900/30">{totals.p3}/6 câu</td>
            <td className="bg-indigo-600 text-white text-lg">{totals.total}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Phần I (NLC)</p>
          <p className="text-2xl font-black text-emerald-900">{Math.round((totals.p1/22)*100)}% <span className="text-sm font-normal text-emerald-600">tổng số câu</span></p>
        </div>
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
          <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Phần II (Đúng/Sai)</p>
          <p className="text-2xl font-black text-amber-900">{Math.round((totals.p2/22)*100)}% <span className="text-sm font-normal text-amber-600">tổng số câu</span></p>
        </div>
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
          <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Phần III (TL Ngắn)</p>
          <p className="text-2xl font-black text-rose-900">{Math.round((totals.p3/22)*100)}% <span className="text-sm font-normal text-rose-600">tổng số câu</span></p>
        </div>
      </div>

      {/* Nút điều hướng */}
      <div className="flex justify-between mt-6">
        <button onClick={onPrev} className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all text-slate-600">
          ← Nhập liệu
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => exportMatrixWord(data, countQuestions, monHoc)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <FileJson className="w-4 h-4" /> Xuất Word (.doc)
          </button>
        <button onClick={onNext} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm">
          Xem Ma trận đặc tả <ChevronRight className="w-5 h-5" />
        </button>
        </div>
      </div>
    </motion.div>
  );
}

function TabDacTa({ data, countQuestions, onPrev, onNext }: any) {
  // Helper lấy yêu cầu cần đạt theo mức độ
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
        <h2 className="text-2xl font-black uppercase tracking-tight">BẢNG MA TRẬN ĐẶC TẢ CHI TIẾT ĐỀ KIỂM TRA</h2>
        <p className="text-slate-500 font-bold mt-1">HƯỚNG DẪN CHẤM VÀ ĐÁNH GIÁ NĂNG LỰC</p>
        <div className="w-20 h-1 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
        <div className="mt-4 flex justify-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-slate-200 inline-block"></span>Nhập tay
          </span>
          <span className="flex items-center gap-1.5 text-indigo-500">
            <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300 inline-block"></span>Tự động từ CSDL chuẩn
          </span>
        </div>
      </div>

      <table className="w-full border-collapse border border-slate-300 text-[11px]">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="border border-slate-700 p-3 w-12 text-center">STT</th>
            <th className="border border-slate-700 p-3 w-48">Nội dung</th>
            <th className="border border-slate-700 p-3 w-28 text-center">Mức độ</th>
            <th className="border border-slate-700 p-3">Yêu cầu cần đạt</th>
            <th className="border border-slate-700 p-3 w-20 text-center">NLC</th>
            <th className="border border-slate-700 p-3 w-20 text-center">Đúng/Sai</th>
            <th className="border border-slate-700 p-3 w-20 text-center">TL Ngắn</th>
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

      {/* Nút điều hướng */}
      <div className="flex justify-between mt-6">
        <button onClick={onPrev} className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all text-slate-600">
          ← Ma trận
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm">
          Tạo đề thi <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

function TabTaoDe({ data, countQuestions, onPrev, monHoc = 'Toán' }: any) {
  const [exam, setExam] = useState<any[]>([]);
  const mathRef = useMathRender([exam]);

  // Hàm sinh đề dựa trên dữ liệu từ Ma trận đặc tả
  const handleGenerateExam = () => {

    let globalStt = 1; // Số thứ tự câu hỏi xuyên suốt

    // Tách thành 3 danh sách tạm thời cho 3 phần theo chuẩn 2026
    const part1_NLC: any[] = [];
    const part2_DS: any[] = [];
    const part3_TLN: any[] = [];

    // Duyệt qua toàn bộ dữ liệu người dùng đã nhập
    data.forEach((chuong: any) => {
      chuong.noiDungs.forEach((nd: any) => {
        // --- PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN (NLC) ---
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

        // --- PHẦN II: TRẮC NGHIỆM ĐÚNG/SAI (DS) ---
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

        // --- PHẦN III: TRẢ LỜI NGẮN (TLN) ---
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

    // Gộp các phần lại và cập nhật state
    setExam([...part1_NLC, ...part2_DS, ...part3_TLN]);
  };

  return (
    <div className="space-y-6" ref={mathRef as any}>
      {/* Header điều khiển */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Sparkles className="text-indigo-600" />
            Sinh đề từ Ma trận đặc tả
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Câu hỏi được chọn lọc chính xác theo: {data.reduce((acc, c) => acc + c.noiDungs.length, 0)} đơn vị kiến thức đã thiết lập.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportExamWord(exam, monHoc)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
          >
            <Download className="w-4 h-4" /> Xuất Word
          </button>
          <button
            onClick={handleGenerateExam}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl"
          >
            <RefreshCw className="w-5 h-5" /> TẠO ĐỀ THEO ĐẶC TẢ
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
          ← Quay lại Đặc tả
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
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHẦN I</span>
            Câu trắc nghiệm nhiều phương án lựa chọn.
          </h4>
          {p1.map(q => (
            <div key={q.id} className="mb-6 group">
              <p className="text-sm leading-relaxed mb-2">
                <strong>Câu {q.stt}.</strong> {q.noiDung}
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
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHẦN II</span>
            Câu trắc nghiệm đúng sai.
          </h4>
          {p2.map(q => (
            <div key={q.id} className="mb-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p className="text-sm font-bold mb-3">Câu {q.stt}. {q.context}</p>
              {q.image && <img src={q.image} className="max-w-xs mx-auto my-4 rounded shadow-sm" />}
              <div className="space-y-2">
                {q.statements?.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100">
                    <span>{['a', 'b', 'c', 'd'][i]}) {s.text}</span>
                    <div className="flex gap-4 text-[10px] font-bold text-slate-300">
                      <span className="border px-2 py-0.5 rounded">Đúng</span>
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
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHẦN III</span>
            Câu trắc nghiệm trả lời ngắn.
          </h4>
          <div className="grid grid-cols-1 gap-6">
            {p3.map(q => (
              <div key={q.id} className="question-card">
                <p className="text-sm">
                  <strong>Câu {q.stt}.</strong> {q.noiDung}
                  <span className="text-[9px] text-slate-400 ml-2">({q.mucDo})</span>
                </p>
                <div className="mt-2 h-8 w-32 border-b-2 border-dashed border-slate-300 flex items-end pb-1 text-xs text-slate-300">
                  Đáp số: ................
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}









    // Tách thành 3 danh sách tạm thời cho 3 phần theo chuẩn 2026
    const part1_NLC: any[] = [];
    const part2_DS: any[] = [];
    const part3_TLN: any[] = [];

    // Duyệt qua toàn bộ dữ liệu người dùng đã nhập
    data.forEach((chuong: any) => {
      chuong.noiDungs.forEach((nd: any) => {
        // --- PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN (NLC) ---
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

        // --- PHẦN II: TRẮC NGHIỆM ĐÚNG/SAI (DS) ---
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

        // --- PHẦN III: TRẢ LỜI NGẮN (TLN) ---
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

    // Gộp các phần lại và cập nhật state
    setExam([...part1_NLC, ...part2_DS, ...part3_TLN]);
  };

  return (
    <div className="space-y-6" ref={mathRef as any}>
      {/* Header điều khiển */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Sparkles className="text-indigo-600" />
            Sinh đề từ Ma trận đặc tả
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Câu hỏi được chọn lọc chính xác theo: {data.reduce((acc, c) => acc + c.noiDungs.length, 0)} đơn vị kiến thức đã thiết lập.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportExamWord(exam, monHoc)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
          >
            <Download className="w-4 h-4" /> Xuất Word
          </button>
          <button
            onClick={handleGenerateExam}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl"
          >
            <RefreshCw className="w-5 h-5" /> TẠO ĐỀ THEO ĐẶC TẢ
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
          ← Quay lại Đặc tả
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
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHẦN I</span>
            Câu trắc nghiệm nhiều phương án lựa chọn.
          </h4>
          {p1.map(q => (
            <div key={q.id} className="mb-6 group">
              <p className="text-sm leading-relaxed mb-2">
                <strong>Câu {q.stt}.</strong> {q.noiDung}
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
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHẦN II</span>
            Câu trắc nghiệm đúng sai.
          </h4>
          {p2.map(q => (
            <div key={q.id} className="mb-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p className="text-sm font-bold mb-3">Câu {q.stt}. {q.context}</p>
              {q.image && <img src={q.image} className="max-w-xs mx-auto my-4 rounded shadow-sm" />}
              <div className="space-y-2">
                {q.statements?.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100">
                    <span>{['a', 'b', 'c', 'd'][i]}) {s.text}</span>
                    <div className="flex gap-4 text-[10px] font-bold text-slate-300">
                      <span className="border px-2 py-0.5 rounded">Đúng</span>
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
            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs">PHẦN III</span>
            Câu trắc nghiệm trả lời ngắn.
          </h4>
          <div className="grid grid-cols-1 gap-6">
            {p3.map(q => (
              <div key={q.id} className="question-card">
                <p className="text-sm">
                  <strong>Câu {q.stt}.</strong> {q.noiDung}
                  <span className="text-[9px] text-slate-400 ml-2">({q.mucDo})</span>
                </p>
                <div className="mt-2 h-8 w-32 border-b-2 border-dashed border-slate-300 flex items-end pb-1 text-xs text-slate-300">
                  Đáp số: ................
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
  const [exam, setExam] = useState<any[]>([]);
  const mathRef = useMathRender([exam]);

  // Hàm bổ trợ lấy câu hỏi từ ngân hàng theo loại
  const pickNLC = (noiDung: string, mucDo: string) => pickNLCQuestion(noiDung, mucDo);
  const pickDS = (noiDung: string): DSQuestion => pickDSQuestion(noiDung);
  const pickTLN = (noiDung: string, mucDo: string) => pickTLNQuestion(noiDung, mucDo);

  const handleGenerateExam = () => {
    const finalExam: any[] = [];
    let nlcCount = 1, dsCount = 1, tlnCount = 0;

    // Duyệt qua từng Chương -> Từng Nội dung trong Data
    data.forEach((chuong: any) => {
      chuong.noiDungs.forEach((nd: any) => {

        // --- 1. Sinh câu Trắc nghiệm nhiều phương án (NLC) ---
        nd.mucDos.forEach((md: any, mIdx: number) => {
          const mucDoTen = LEVELS[mIdx].name;
          const nNLC = countQuestions(md.qs.nlc);
          for (let i = 0; i < nNLC; i++) {
            finalExam.push({
              id: `nlc-${nlcCount}`,
              phan: 'I',
              stt: nlcCount++,
              noiDung: pickNLC(nd.tenNoiDung, mucDoTen),
              mucDo: mucDoTen,
              chuong: chuong.tenChuong,
              bai: nd.tenNoiDung,
              yeuCau: md.yeuCau || '',
              dapAn: 'A'
            });
          }
        });

        // --- 2. Sinh câu Đúng/Sai ---
        const nDS = countQuestions(nd.mucDos[0]?.qs?.ds || '');
        for (let i = 0; i < nDS; i++) {
          const dsQ = pickDS(nd.tenNoiDung);
          finalExam.push({
            id: `ds-${dsCount}`,
            phan: 'II',
            stt: dsCount++,
            context: dsQ.context,
            image: dsQ.image,      // ➤ hình minh họa (nếu có)
            statements: dsQ.statements,
            chuong: chuong.tenChuong,
            bai: nd.tenNoiDung,
            yeuCau: nd.mucDos[0]?.yeuCau || ''
          });
        }

        // --- 3. Sinh câu Trả lời ngắn (tách theo từng mức độ) ---
        const tlnLevelMap = [
          { mIdx: 0, mucDo: 'Nhận biết' },
          { mIdx: 1, mucDo: 'Thông hiểu' },
          { mIdx: 2, mucDo: 'Vận dụng' },
          { mIdx: 3, mucDo: 'Vận dụng cao' }
        ];

        tlnLevelMap.forEach(({ mIdx, mucDo }) => {
          const nTln = countQuestions(nd.mucDos[mIdx]?.qs?.tln || '');
          for (let k = 0; k < nTln; k++) {
            const tlnQ = pickTLN(nd.tenNoiDung, mucDo);
            tlnCount++;
            finalExam.push({
              id: `tln-${tlnCount}`,
              phan: 'III',
              stt: tlnCount,
              noiDung: tlnQ.text,
              image: tlnQ.image,    // ➤ hình minh họa (nếu có)
              mucDo,
              chuong: chuong.tenChuong,
              bai: nd.tenNoiDung,
              yeuCau: nd.mucDos[mIdx]?.yeuCau || '',
              dapAn: tlnQ.answer
            });
          }
        });
      });
    });

    setExam(finalExam);
  };



  return (
    <div className="space-y-6" ref={mathRef as any}>
      <div className="bg-white p-8 rounded-3xl border border-slate-200 flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Sparkles className="text-indigo-600" />
            Sinh đề thi tự động
          </h2>
          <p className="text-xs text-slate-400 mt-1">Đề thi được bốc chính xác theo nội dung và mức độ từ Bảng đặc tả</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => void exportExamWord(exam, monHoc)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Download className="w-4 h-4" /> Xuất Word (.doc)
          </button>
          <button onClick={handleGenerateExam} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl shadow-indigo-100">
            <RefreshCw className="w-5 h-5" /> TẠO ĐỀ NGAY
          </button>
        </div>
      </div>

      <AnimatePresence>
        {exam.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="exam-paper rounded-3xl p-16 max-w-[900px] mx-auto relative overflow-hidden"
          >
            {/* Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] text-[10rem] font-black pointer-events-none select-none"
              style={{ color: 'rgba(11,87,208,0.04)' }}>
              MMP
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="exam-header flex justify-between items-start">
                <div className="text-center text-sm leading-relaxed">
                  <p className="font-bold uppercase">Sở GD&ĐT TP. Hồ Chí Minh</p>
                  <p className="font-bold underline underline-offset-2">Trường THPT Chuyên...</p>
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold uppercase tracking-wide">Đề Kiểm Tra Định Kỳ Năm Học 2025 – 2026</h3>
                  <p className="font-bold text-sm mt-1">Môn: Toán – Lớp 12</p>
                  <p className="italic text-sm" style={{ color: 'var(--md-on-surface-low)' }}>
                    Thời gian làm bài: 90 phút (không kể thời gian phát đề)
                  </p>
                </div>
                <div className="text-center text-sm">
                  <p className="font-bold">Mã đề: <span className="text-blue-700">001</span></p>
                </div>
              </div>

              <div className="space-y-10">
                {/* PHẦN I – NLC */}
                <section className="exam-part-I">
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-base">
                    <span className="exam-part-badge">Phần I</span>
                    Câu trắc nghiệm nhiều phương án lựa chọn.
                    <span className="text-sm font-normal" style={{ color: 'var(--md-on-surface-low)' }}>({exam.filter(q => q.phan === 'I').length} câu)</span>
                  </h4>
                  <p className="text-sm italic mb-5" style={{ color: 'var(--md-on-surface-low)' }}>
                    Thí sinh trả lời từ câu 1 đến câu {exam.filter(q => q.phan === 'I').length}. Mỗi câu hỏi chỉ chọn một phương án.
                  </p>
                  <div>
                    {exam.filter(q => q.phan === 'I').map((q, i) => (
                      <div key={q.id} className="question-card">
                        <p className="leading-relaxed text-sm mb-2">
                          <strong>Câu {i + 1}.</strong> {q.noiDung}
                          {q.mucDo && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}>{q.mucDo}</span>}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {['A', 'B', 'C', 'D'].map(opt => (
                            <span key={opt} className="answer-chip">
                              <strong>{opt}.</strong> <span className="text-slate-400 italic text-xs">...</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* PHẦN II – Đúng/Sai */}
                <section className="exam-part-II">
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-base">
                    <span className="exam-part-badge">Phần II</span>
                    Câu trắc nghiệm đúng sai.
                    <span className="text-sm font-normal" style={{ color: 'var(--md-on-surface-low)' }}>({exam.filter(q => q.phan === 'II').length} câu)</span>
                  </h4>
                  <p className="text-sm italic mb-5" style={{ color: 'var(--md-on-surface-low)' }}>
                    Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn <strong>Đúng</strong> hoặc <strong>Sai</strong>.
                  </p>
                  <div>
                    {exam.filter(q => q.phan === 'II').map((q, i) => (
                      <div key={q.id} className="question-card">
                        <p className="leading-relaxed text-sm mb-3">
                          <strong>Câu {exam.filter((x: any) => x.phan === 'I').length + i + 1}.</strong> {q.context}
                        </p>
                        {/* Hình minh họa (nếu có) */}
                        {q.image && (
                          <figure className="my-3 flex flex-col items-center">
                            <img
                              src={q.image}
                              alt="Hình minh họa"
                              className="max-w-xs rounded-lg border border-slate-200 shadow-sm"
                              style={{ maxHeight: '220px', objectFit: 'contain' }}
                            />
                            <figcaption className="text-[10px] text-slate-400 mt-1 italic">Hình minh họa</figcaption>
                          </figure>
                        )}
                        <div className="ml-2 space-y-2">
                          {(q.statements || []).map((stmt: any, li: number) => (
                            <div key={li} className="ds-statement">
                              <span className="ds-label">{['a', 'b', 'c', 'd'][li]})</span>
                              <span className="text-slate-700 text-sm">{stmt.text}</span>
                              <span className="ml-auto flex items-center gap-3 shrink-0">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold border border-slate-300 rounded px-2 py-0.5 text-slate-400">Đúng</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold border border-slate-300 rounded px-2 py-0.5 text-slate-400">Sai</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* PHẦN III – TLN */}
                <section className="exam-part-III">
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-base">
                    <span className="exam-part-badge">Phần III</span>
                    Câu hỏi trả lời ngắn.
                    <span className="text-sm font-normal" style={{ color: 'var(--md-on-surface-low)' }}>({exam.filter(q => q.phan === 'III').length} câu)</span>
                  </h4>
                  <p className="text-sm italic mb-5" style={{ color: 'var(--md-on-surface-low)' }}>
                    Thí sinh viết đáp án vào ô trống tương ứng.
                  </p>
                  <div>
                    {exam.filter(q => q.phan === 'III').map((q, i) => {
                      const partICount = exam.filter((x: any) => x.phan === 'I').length;
                      const partIICount = exam.filter((x: any) => x.phan === 'II').length;
                      return (
                        <div key={q.id} className="question-card">
                          <p className="leading-relaxed text-sm">
                            <strong>Câu {partICount + partIICount + i + 1}.</strong> {q.noiDung}
                            {q.mucDo && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--md-tertiary-container)', color: '#00696d' }}>{q.mucDo}</span>}
                          </p>
                          {/* Hình minh họa cho câu TLN (nếu có) */}
                          {q.image && (
                            <figure className="my-3 flex flex-col items-center">
                              <img
                                src={q.image}
                                alt="Hình minh họa"
                                className="max-w-xs rounded-lg border border-slate-200 shadow-sm"
                                style={{ maxHeight: '200px', objectFit: 'contain' }}
                              />
                              <figcaption className="text-[10px] text-slate-400 mt-1 italic">Hình minh họa</figcaption>
                            </figure>
                          )}
                          <p className="mt-3 text-sm flex items-center gap-2" style={{ color: 'var(--md-on-surface-low)' }}>
                            <span className="font-semibold">Trả lời:</span>
                            <span className="tln-blank"></span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div className="pt-10 text-center border-t" style={{ borderColor: 'var(--md-outline-variant)' }}>
                  <p className="font-bold italic text-sm">— HẾT —</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--md-on-surface-low)' }}>
                    Thí sinh không được sử dụng tài liệu. Giám thị không giải thích gì thêm.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút quay lại */}
      <div className="flex justify-between mt-6">
        <button onClick={onPrev} className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all text-slate-600">
          ← Ma trận đặc tả
        </button>
      </div>
    </div>
  );
}

// --- Các Component giao diện nhỏ ---

function Header({ monHoc, setMonHoc, handleLogout }: any) {
  return (
    <header className="max-w-4xl mx-auto text-center mb-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full mb-4"
      >
        <Sparkles className="w-3 h-3 text-indigo-600" />
        <p className="text-indigo-600 font-black tracking-widest text-[9px] uppercase">Công cụ Giáo dục Thông minh năm 2026</p>
      </motion.div>
      
      <h1 className="text-5xl font-black text-slate-900 italic tracking-tighter mb-6">
        Ma trận Toán học. <span className="text-indigo-600 relative">Pro
          <svg className="absolute -bottom-2 left-0 w-full h-2 text-indigo-200" viewBox="0 0 100 10" preserveAspectRatio="none">
            <path d="M0 5 Q 25 0 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
        </span>
      </h1>

      <div className="flex justify-center items-center gap-4">
        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex gap-1">
          {['Toán', 'Lý', 'Hóa học'].map(m => (
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
          Đăng xuất
        </button>
      </div>
    </header>
  );
}

function Login({ handleLogin, user, setUser, pass, setPass }: any) {
  const [error, setError] = useState('');

  const onLogin = () => {
    if(user === 'Bui Thi Kiên' && pass === '12345') {
      localStorage.setItem('mmp_logged_in', 'true');
      handleLogin();
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác!');
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
          <h1 className="text-3xl font-black text-white italic tracking-tighter">Ma trận Toán học. <span className="text-indigo-400">Pro</span></h1>
          <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Hệ thống quản lý đề thi 2026</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input 
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-400 focus:bg-white/10 transition-all placeholder:text-slate-500" 
              placeholder="Tên đăng nhập" 
              value={user} 
              onChange={e => setUser(e.target.value)} 
            />
          </div>
          <div className="relative">
            <input 
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-400 focus:bg-white/10 transition-all placeholder:text-slate-500" 
              type="password" 
              placeholder="Mật khẩu" 
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
            ĐĂNG NHẬP HỆ THỐNG
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Bản quyền thuộc về Smarter Education Tools © 2026</p>
        </div>
      </motion.div>
    </div>
  );
}
