'use client';

import { useState, useEffect } from 'react';
import { DollarSign, FileText, Download, MoreHorizontal, Plus, X } from 'lucide-react';
import { roomNumber, floorLabel, roomLabel, bedDisplayLabel, standaloneRoomNums, parseRoomString, bedTypeDisplay } from '@/lib/propertyTypes';
import { bookingPayments } from '@/lib/bookingPayments';
import { formatPLN } from '@/lib/currency';

const INITIAL_PAYMENTS: any[] = [];

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  // Paid bookings (bot and portal), shown as their rent and deposit payments (see bookingPayments)
  const [paidBookings, setPaidBookings] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [roomOverrides, setRoomOverrides] = useState<Record<string, any>>({});
  const [selectedPropId, setSelectedPropId] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedBed, setSelectedBed] = useState('');
  const [formData, setFormData] = useState({
    student: '',
    amount: '',
    type: 'Rent',
    status: 'Completed',
    date: new Date().toISOString().split('T')[0]
  });

    useEffect(() => {
    const saved = localStorage.getItem('hms_payments');
    if (saved) {
      try {
        setPayments(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse payments");
      }
    }
    
    fetch('/api/v1-bot-bookings?where[type][equals]=bed_hold&where[status][equals]=paid&limit=1000&depth=0&sort=-updatedAt')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.docs) setPaidBookings(data.docs); })
      .catch(e => console.error(e));

    fetch('/api/v1-students?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setStudents(data.docs);
    });

    fetch('/api/v1-properties?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setProperties(data.docs);
    });

    fetch('/api/v1-room-overrides?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        const overrides: any = {};
        data.docs.forEach((doc: any) => overrides[doc.overrideKey] = doc);
        setRoomOverrides(overrides);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedPropId && selectedFloor && selectedRoom && selectedBed) {
      const prop = properties.find(p => p.id.toString() === selectedPropId);
      if (prop) {
        const roomStr = `Room ${selectedRoom} - Bed ${selectedBed}`;
        const student = students.find(s => s.property === prop.name && s.room === roomStr);
        if (student) {
          setFormData(prev => ({ ...prev, student: student.name }));
        } else {
          setFormData(prev => ({ ...prev, student: '' }));
        }
      }
    }
  }, [selectedPropId, selectedFloor, selectedRoom, selectedBed, properties, students]);

  const closeAndResetModal = () => {
    setIsAddModalOpen(false);
    setSelectedPropId('');
    setSelectedFloor('');
    setSelectedRoom('');
    setSelectedBed('');
    setFormData({ student: '', amount: '', type: 'Rent', status: 'Completed', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find(p => p.id.toString() === selectedPropId);
    const propName = prop ? prop.name : '';
    const roomStr = (selectedPropId && selectedFloor && selectedRoom && selectedBed) 
        ? `Room ${selectedRoom} - Bed ${selectedBed}` : '';

    const newPayment = {
      id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      student: formData.student,
      property: propName,
      room: roomStr,
      amount: parseFloat(formData.amount),
      type: formData.type,
      status: formData.status,
      date: formData.date
    };
    
    const updated = [newPayment, ...payments];
    setPayments(updated);
    localStorage.setItem('hms_payments', JSON.stringify(updated));
    closeAndResetModal();
  };

  const bookingRows = bookingPayments(paidBookings, roomOverrides);
  const allPayments = [...bookingRows, ...payments].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const filteredPayments = allPayments.filter(p => {
    let match = true;
    if (monthFilter && !p.date.startsWith(monthFilter)) match = false;
    if (statusFilter && p.status !== statusFilter) match = false;
    if (typeFilter && p.type !== typeFilter) match = false;
    
    if (propertyFilter !== 'all' && p.property !== propertyFilter) match = false;
    
    if (floorFilter !== 'all' && p.room) {
      if (parseRoomString(p.room)?.floor !== floorFilter) match = false;
    }

    return match;
  });

  // Calculate KPIs based on filtered data (or total data if preferred, but filtered makes sense)
  // Deposits are refundable, so they are totalled apart from revenue
  const totalRevenue = filteredPayments.filter(p => p.status === 'Completed' && p.type !== 'Deposit').reduce((sum, p) => sum + p.amount, 0);
  const totalDeposits = filteredPayments.filter(p => p.status === 'Completed' && p.type === 'Deposit').reduce((sum, p) => sum + p.amount, 0);
  const depositCount = filteredPayments.filter(p => p.status === 'Completed' && p.type === 'Deposit').length;
  const pendingAmount = filteredPayments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = filteredPayments.filter(p => p.status === 'Pending').length;
  const failedAmount = filteredPayments.filter(p => p.status === 'Failed').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Payment Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track and record transactions across all properties.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Revenue {monthFilter ? `(${monthFilter})` : '(All Time)'}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatPLN(totalRevenue, { decimals: true })}</p>
          <span className="text-xs font-medium text-green-600 mt-2 block">Completed payments, deposits not included</span>
        </div>
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Deposits {monthFilter ? `(${monthFilter})` : '(All Time)'}</p>
          <p className="text-3xl font-bold text-blue-600">{formatPLN(totalDeposits, { decimals: true })}</p>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 block">{depositCount} {depositCount === 1 ? 'deposit' : 'deposits'} received (refundable)</span>
        </div>
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Pending Payments</p>
          <p className="text-3xl font-bold text-orange-600">{formatPLN(pendingAmount, { decimals: true })}</p>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 block">{pendingCount} students with past due</span>
        </div>
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Failed Transactions</p>
          <p className="text-3xl font-bold text-red-600">{formatPLN(failedAmount, { decimals: true })}</p>
          <span className="text-xs font-medium text-red-600 mt-2 block">Action required</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Recent Transactions</h3>
          <div className="flex items-center gap-2">
            <select
              value={propertyFilter}
              onChange={(e) => {
                setPropertyFilter(e.target.value);
                setFloorFilter('all');
              }}
              className="border border-gray-300 dark:border-gray-700 rounded-md text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Properties</option>
              {properties.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            {propertyFilter !== 'all' && (
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-md text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Floors</option>
                {Array.from({ length: properties.find(p => p.name === propertyFilter)?.floors || 1 }).map((_, i) => (
                  <option key={i} value={String(i + 1)}>{floorLabel(properties.find(p => p.name === propertyFilter), i + 1)}</option>
                ))}
                <option value="S">Outside floors</option>
              </select>
            )}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 rounded-md text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All Types</option>
              <option value="Rent">Rent</option>
              <option value="Deposit">Deposit</option>
              <option value="Fee">Fee</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 rounded-md text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
            <input 
              type="month" 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 rounded-md text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {(monthFilter || statusFilter || typeFilter || propertyFilter !== 'all') && (
              <button 
                onClick={() => { setMonthFilter(''); setStatusFilter(''); setTypeFilter(''); setPropertyFilter('all'); setFloorFilter('all'); }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 ml-1"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700 dark:text-gray-300">
            <thead className="bg-white dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Transaction ID</th>
                <th scope="col" className="px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Student</th>
                <th scope="col" className="px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Type</th>
                <th scope="col" className="px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Amount</th>
                <th scope="col" className="px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Date</th>
                <th scope="col" className="px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Status</th>
                <th scope="col" className="px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-900">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                      {trx.id}
                      {trx.bookingRef && <div className="font-sans text-xs text-blue-600 dark:text-blue-400">Booking {trx.bookingRef} (paid)</div>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{trx.student}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{trx.property}{trx.room ? ` - ${trx.room}` : ''}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <FileText className="h-4 w-4" /> {trx.type}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      {formatPLN(trx.amount, { decimals: true })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">{trx.date}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        trx.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        trx.status === 'Pending' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                        'bg-red-50 text-red-700 ring-red-600/10'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No transactions found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Record New Payment</h3>
              <button 
                onClick={() => closeAndResetModal()}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-full p-1 border border-gray-200 dark:border-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.student}
                    onChange={(e) => {
                      setFormData({...formData, student: e.target.value});
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    autoComplete="off"
                  />
                  {showStudentDropdown && formData.student && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-800 max-h-48 overflow-y-auto">
                      {students.filter(s => s.name.toLowerCase().includes(formData.student.toLowerCase())).length > 0 ? (
                        students.filter(s => s.name.toLowerCase().includes(formData.student.toLowerCase())).map(s => (
                          <div 
                            key={s.id}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                            onClick={() => {
                              setFormData({
                                ...formData, 
                                student: s.name
                              });
                              if (s.property && s.room && s.room !== 'Unassigned') {
                                const prop = properties.find(p => p.name === s.property);
                                if (prop) {
                                  setSelectedPropId(prop.id.toString());
                                  const parsed = parseRoomString(s.room);
                                  if (parsed) {
                                    setSelectedFloor(parsed.floor);
                                    setSelectedRoom(parsed.roomNum);
                                    setSelectedBed(parsed.bed);
                                  }
                                }
                              } else {
                                setSelectedPropId('');
                                setSelectedFloor('');
                                setSelectedRoom('');
                                setSelectedBed('');
                              }
                              setShowStudentDropdown(false);
                            }}
                          >
                            <div className="font-medium">{s.name}</div>
                            {(s.property || s.room) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{s.property}{s.room ? ` - ${s.room}` : ''}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No students found</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property</label>
                  <select 
                    value={selectedPropId} 
                    onChange={e => { setSelectedPropId(e.target.value); setSelectedFloor(''); setSelectedRoom(''); setSelectedBed(''); setFormData(prev => ({...prev, student: ''})); }} 
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Floor</label>
                  <select 
                    value={selectedFloor} 
                    onChange={e => { setSelectedFloor(e.target.value); setSelectedRoom(''); setSelectedBed(''); setFormData(prev => ({...prev, student: ''})); }} 
                    disabled={!selectedPropId}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 dark:bg-gray-800"
                  >
                    <option value="">Select Floor</option>
                    {selectedPropId && Array.from({ length: properties.find(p => p.id.toString() === selectedPropId)?.floors || 0 }).map((_, i) => (
                      <option key={i+1} value={i+1}>{floorLabel(properties.find(p => p.id.toString() === selectedPropId), i+1)}</option>
                    ))}
{selectedPropId && standaloneRoomNums(roomOverrides, selectedPropId).length > 0 && <option value="S">Outside floors</option>}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room</label>
                  <select 
                    value={selectedRoom} 
                    onChange={e => { setSelectedRoom(e.target.value); setSelectedBed(''); setFormData(prev => ({...prev, student: ''})); }}
                    disabled={!selectedFloor}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 dark:bg-gray-800"
                  >
                    <option value="">Select Room</option>
                    {selectedFloor && Array.from({ length: properties.find(p => p.id.toString() === selectedPropId)?.roomsPerFloor?.[parseInt(selectedFloor) - 1] || 0 }).map((_, i) => {
                      const rNum = String(roomNumber(selectedFloor, i));
                      return <option key={rNum} value={rNum}>{roomLabel(properties.find(p => p.id.toString() === selectedPropId), rNum, roomOverrides[`${selectedPropId}-${rNum}`])}</option>
                    })}
{selectedFloor === 'S' && standaloneRoomNums(roomOverrides, selectedPropId).map(rNum => (
  <option key={rNum} value={rNum}>{roomLabel(properties.find(p => p.id.toString() === selectedPropId), rNum, roomOverrides[`${selectedPropId}-${rNum}`])}</option>
))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bed</label>
                  <select 
                    value={selectedBed} 
                    onChange={e => setSelectedBed(e.target.value)}
                    disabled={!selectedRoom}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 dark:bg-gray-800"
                  >
                    <option value="">Select Bed</option>
                    {selectedRoom && (() => {
                      const prop = properties.find(p => p.id.toString() === selectedPropId);
                      const override = roomOverrides[`${selectedPropId}-${selectedRoom}`];
                      const beds = override?.beds || (prop?.bedsPerFloor ? prop.bedsPerFloor[parseInt(selectedFloor) - 1] : prop?.bedsPerRoom) || 0;
                      return Array.from({ length: beds }).map((_, i) => (
                        <option key={i+1} value={String.fromCharCode(65 + i)}>{bedDisplayLabel(override, i)} ({bedTypeDisplay(override?.bedTypes, override?.bunkPositions, i).replace(' Bed', '')})</option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (PLN)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  >
                    <option value="Rent">Rent</option>
                    <option value="Deposit">Deposit</option>
                    <option value="Fee">Fee</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 mt-6">
                <button 
                  type="button"
                  onClick={() => closeAndResetModal()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
