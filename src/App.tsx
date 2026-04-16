import { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileText, Filter, RotateCcw, Search, ChevronUp, ChevronDown } from 'lucide-react';
import './App.css';
import { estimateMarks, estimateRank } from './utils/rankLogic';
import rawData from './data.json';

interface DataRow {
  Institute: string;
  Program: string;
  Category: string;
  Gender: string;
  Opening: number;
  Closing: number;
  Marks: number;
}

type SortCol = keyof DataRow | 'Status';

function App() {
  const [data] = useState<DataRow[]>(rawData as DataRow[]);
  const [filteredData, setFilteredData] = useState<DataRow[]>(rawData as DataRow[]);
  
  // Filters
  const [category, setCategory] = useState<string>('OPEN');
  const [institute, setInstitute] = useState<string>('All');
  const [gender, setGender] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  
  // Marks / Rank sync
  const [marksStr, setMarksStr] = useState<string>('');
  const [rankStr, setRankStr] = useState<string>('');
  
  // Toggles & Sorting
  const [safeOnly, setSafeOnly] = useState<boolean>(false);
  const [sortCol, setSortCol] = useState<SortCol>('Closing');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Deriving lists for dropdowns
  const institutes = useMemo(() => {
    const list = Array.from(new Set(data.map(d => d.Institute)));
    return ['All', ...list.sort()];
  }, [data]);

  // Sync Logic
  const handleMarksChange = (val: string) => {
    setMarksStr(val);
    if (!val || isNaN(Number(val))) {
      setRankStr('');
      return;
    }
    const r = estimateRank(Number(val), category === 'All' ? 'OPEN' : category);
    setRankStr(r.toString());
  };

  const handleRankChange = (val: string) => {
    setRankStr(val);
    if (!val || isNaN(Number(val))) {
      setMarksStr('');
      return;
    }
    const m = estimateMarks(Number(val), category === 'All' ? 'OPEN' : category);
    setMarksStr(m.toString());
  };

  // Re-sync if category changes
  useEffect(() => {
    if (marksStr && !isNaN(Number(marksStr))) {
      const r = estimateRank(Number(marksStr), category === 'All' ? 'OPEN' : category);
      setRankStr(r.toString());
    } else if (rankStr && !isNaN(Number(rankStr))) {
      const m = estimateMarks(Number(rankStr), category === 'All' ? 'OPEN' : category);
      setMarksStr(m.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Filter application
  const applyFilters = useCallback(() => {
    let result = [...data];
    if (category !== 'All') result = result.filter(d => d.Category === category);
    if (institute !== 'All') result = result.filter(d => d.Institute === institute);
    if (gender !== 'All') result = result.filter(d => d.Gender === gender);
    if (search.trim() !== '') {
      const lower = search.toLowerCase();
      result = result.filter(d => d.Program.toLowerCase().includes(lower));
    }
    
    if (safeOnly && rankStr && !isNaN(Number(rankStr))) {
      const myRank = Number(rankStr);
      result = result.filter(d => myRank <= d.Closing);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valA: any = a[sortCol as keyof DataRow];
      let valB: any = b[sortCol as keyof DataRow];
      
      if (sortCol === 'Status') {
         // Status sorting logic
         const r = Number(rankStr);
         const statA = (!isNaN(r) && r <= a.Closing) ? 1 : 0;
         const statB = (!isNaN(r) && r <= b.Closing) ? 1 : 0;
         valA = statA; valB = statB;
      }
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    setFilteredData(result);
  }, [data, category, institute, gender, search, safeOnly, rankStr, sortCol, sortDir]);

  // Trigger filters when safe filter or sort column changes
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const resetFilters = () => {
    setCategory('OPEN');
    setInstitute('All');
    setGender('All');
    setSearch('');
    setMarksStr('');
    setRankStr('');
    setSafeOnly(false);
    setSortCol('Closing');
    setSortDir('asc');
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Export functions
  const exportCSV = () => {
    const csvData = filteredData.map(d => ({
      ...d,
      Status: getStatus(d.Closing)
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'josaa_predictions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.text("JoSAA Rank Predictions", 14, 15);
    
    const tableColumn = ["Institute", "Program", "Category", "Gender", "Closing", "Min Marks", "Status"];
    const tableRows = filteredData.map(d => [
      d.Institute,
      d.Program,
      d.Category,
      d.Gender,
      d.Closing,
      d.Marks,
      getStatus(d.Closing)
    ]);

    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 240, 255] }
    });
    
    doc.save(`josaa_predictions.pdf`);
  };

  const getStatus = (closing: number) => {
    if (!rankStr || isNaN(Number(rankStr))) return "-";
    return Number(rankStr) <= closing ? "Safe" : "Reach";
  };

  const renderSortIcon = (col: SortCol) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="app-container">
      {/* Sidebar Controls */}
      <aside className="glass-panel">
        <header>
          <h1 className="glow-title">IIT Predictor</h1>
          <div className="subtitle">JEE Advanced 2026 Engine</div>
        </header>

        <div className="section-title">
          <Filter size={18} /> Your Profile
        </div>
        
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="OPEN">OPEN</option>
            <option value="OBC-NCL">OBC-NCL</option>
            <option value="EWS">EWS</option>
          </select>
        </div>

        <div className="row-group">
          <div className="form-group">
            <label>Expected Marks</label>
            <input 
              type="number" 
              placeholder="e.g. 150" 
              value={marksStr}
              onChange={e => handleMarksChange(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Expected Rank</label>
            <input 
              type="number" 
              placeholder="e.g. 4000" 
              value={rankStr}
              onChange={e => handleRankChange(e.target.value)} 
            />
          </div>
        </div>

        <div className="section-title" style={{ marginTop: '2rem' }}>
          <Search size={18} /> Advanced Filters
        </div>

        <div className="form-group">
          <label>Gender Pool</label>
          <select value={gender} onChange={e => setGender(e.target.value)}>
            <option value="All">All Pools</option>
            <option value="Gender-Neutral">Gender-Neutral</option>
            <option value="Female-only">Female-only</option>
          </select>
        </div>

        <div className="form-group">
          <label>Institute</label>
          <select value={institute} onChange={e => setInstitute(e.target.value)}>
            {institutes.map(inst => <option key={inst} value={inst}>{inst}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Search Branch</label>
          <input 
            type="text" 
            placeholder="e.g. Computer Science" 
            value={search}
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <label className="checkbox-group">
          <input 
            type="checkbox" 
            checked={safeOnly}
            onChange={e => setSafeOnly(e.target.checked)}
          />
          <span>Show Only Safe Colleges</span>
        </label>

        <div style={{ marginTop: '2rem' }}>
          <button className="btn btn-primary" onClick={applyFilters}>
            <Search size={16} /> Predict Colleges
          </button>
          <button className="btn btn-secondary" onClick={resetFilters}>
            <RotateCcw size={16} /> Reset Engine
          </button>
        </div>
      </aside>

      {/* Main Table Content */}
      <main className="main-content">
        <div className="toolbar">
          <div className="stat-pill">
            {filteredData.length} Programs Found
          </div>
          <div className="actions">
            <button className="btn-icon" onClick={exportCSV} title="Export to CSV">
              <Download size={16} /> CSV
            </button>
            <button className="btn-icon" onClick={exportPDF} title="Export to PDF">
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('Institute')}>
                  Institute {renderSortIcon('Institute')}
                </th>
                <th onClick={() => handleSort('Program')}>
                  Program {renderSortIcon('Program')}
                </th>
                <th onClick={() => handleSort('Category')}>
                  Category {renderSortIcon('Category')}
                </th>
                <th onClick={() => handleSort('Gender')}>
                  Gender {renderSortIcon('Gender')}
                </th>
                <th onClick={() => handleSort('Closing')}>
                  Closing {renderSortIcon('Closing')}
                </th>
                <th onClick={() => handleSort('Marks')}>
                  Min Marks {renderSortIcon('Marks')}
                </th>
                <th onClick={() => handleSort('Status')}>
                  Status {renderSortIcon('Status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => {
                  const status = getStatus(row.Closing);
                  let statusClass = 'status-neutral';
                  if (status === 'Safe') statusClass = 'status-safe';
                  else if (status === 'Reach') statusClass = 'status-reach';
                  
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500, color: '#fff' }}>{row.Institute}</td>
                      <td>{row.Program}</td>
                      <td>{row.Category}</td>
                      <td>{row.Gender}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{row.Closing}</td>
                      <td>{row.Marks}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>{status}</span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No matching programs found. Adjust your filters to find predictions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default App;
