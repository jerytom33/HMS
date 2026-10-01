'use client';

import { Users, Building2, Bed, CreditCard, ArrowUpRight, ArrowDownRight, MoreHorizontal, Wrench, Calendar, FileText, AlertCircle, Mail, DollarSign, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

export default function AdminDashboard() {
  const [properties, setProperties] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [roomOverrides, setRoomOverrides] = useState<Record<string, any>>({});
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  useEffect(() => {
    const savedProperties = localStorage.getItem('hms_properties');
    if (savedProperties) {
      try { setProperties(JSON.parse(savedProperties)); } catch(e) {}
    }

    const savedStudents = localStorage.getItem('hms_students');
    if (savedStudents) {
      try { setStudents(JSON.parse(savedStudents)); } catch(e) {}
    }

    const savedOverrides = localStorage.getItem('hms_room_overrides');
    if (savedOverrides) {
      try { setRoomOverrides(JSON.parse(savedOverrides)); } catch(e) {}
    }

    const savedPayments = localStorage.getItem('hms_payments');
    if (savedPayments) {
      try { setPayments(JSON.parse(savedPayments)); } catch(e) {}
    }
  }, []);

  const { totalBeds, filledBeds, occupancySnapshot, floorStats } = useMemo(() => {
    let tBeds = 0;
    let fBeds = 0;
    const snapshot: { name: string, percent: number }[] = [];
    const floors: { floor: number, totalBeds: number, filledBeds: number }[] = [];

    const propsToProcess = selectedPropertyId === 'all' 
      ? properties 
      : properties.filter(p => p.id.toString() === selectedPropertyId);

    propsToProcess.forEach(p => {
      let pTotal = 0;
      let pFilled = 0;
      const floorsCount = p.floors || 1;
      
      for (let f = 1; f <= floorsCount; f++) {
        let roomsOnFloor = 0;
        if (p.roomsPerFloor && p.roomsPerFloor.length >= f) {
          roomsOnFloor = p.roomsPerFloor[f-1];
        } else {
          const baseRooms = Math.floor((p.rooms || 0) / floorsCount);
          const extra = (p.rooms || 0) % floorsCount;
          roomsOnFloor = f <= extra ? baseRooms + 1 : baseRooms;
        }
        
        const defaultBeds = (p.isCustomBedsPerFloor && p.bedsPerFloor?.length >= f) ? (p.bedsPerFloor[f-1] || 2) : (p.beds || 2);
        
        let fTotal = 0;
        let fFilled = 0;

        for(let i=0; i<roomsOnFloor; i++) {
          const roomNum = (f * 100) + i + 1;
          const overrideKey = `${p.id}-${roomNum}`;
          const override = roomOverrides[overrideKey];
          
          const rBeds = override?.beds !== undefined ? override.beds : defaultBeds;
          const rFilled = override?.filledBeds !== undefined ? override.filledBeds : (override?.status === 'occupied' ? rBeds : 0);
          
          fTotal += rBeds;
          fFilled += rFilled;
        }
        
        pTotal += fTotal;
        pFilled += fFilled;
        
        if (selectedPropertyId !== 'all') {
          floors.push({ floor: f, totalBeds: fTotal, filledBeds: fFilled });
        }
      }
      
      tBeds += pTotal;
      fBeds += pFilled;
      snapshot.push({
        name: p.name,
        percent: pTotal > 0 ? Math.round((pFilled / pTotal) * 100) : 0
      });
    });

    return { totalBeds: tBeds, filledBeds: fBeds, occupancySnapshot: snapshot, floorStats: floors };
  }, [properties, roomOverrides, selectedPropertyId]);

  const occupancyPercent = totalBeds > 0 ? Math.round((filledBeds / totalBeds) * 100) : 0;

  const selectedPropertyName = selectedPropertyId === 'all' 
    ? 'all' 
    : properties.find(p => p.id.toString() === selectedPropertyId)?.name || 'all';

  const filteredStudents = selectedPropertyName === 'all' 
    ? students 
    : students.filter(s => s.property === selectedPropertyName);

  const studentNamesInProperty = new Set(filteredStudents.map(s => s.name));
  const filteredPayments = selectedPropertyName === 'all'
    ? payments
    : payments.filter(p => studentNamesInProperty.has(p.student));
  
  const totalRentRevenue = filteredPayments
    .filter(p => p.status === 'Completed' && p.type === 'Rent')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const stats = [
    { name: 'Total Occupancy', value: `${occupancyPercent}%`, change: '', trend: 'up' },
    { name: 'Active Bookings', value: filledBeds.toString(), change: '', trend: 'up' },
    { name: 'Vacant Beds', value: (totalBeds - filledBeds).toString(), change: '', trend: 'up' },
    { name: 'Total Rent Revenue', value: `€${totalRentRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, change: '', trend: 'up' },
  ];

  const recentBookings = filteredStudents.slice(-4).reverse().map((s) => ({
    id: `BKG-${s.id ? s.id.toString().slice(-6) : Math.floor(100000 + Math.random() * 900000)}`,
    student: s.name,
    property: s.property || 'Unassigned',
    room: s.room || 'Unassigned',
    status: s.status === 'Active' ? 'Checked In' : 'Pending',
    date: new Date().toLocaleDateString()
  }));

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const collectedAmount = filteredPayments.filter(p => p.status === 'Completed').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const collectionStatus = totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0;

  const overduePayments = filteredPayments
    .filter(p => p.status === 'Pending' || p.status === 'Failed')
    .slice(0, 3)
    .map(p => {
      let daysText = p.status;
      if (p.date) {
        const days = Math.floor((Date.now() - new Date(p.date).getTime()) / (1000 * 3600 * 24));
        if (days > 0) daysText = `${days} days overdue`;
      }
      return {
        student: p.student,
        amount: `€${Number(p.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
        days: daysText
      };
    });

  const mockMaintenance = [
    { id: 'MT-091', issue: 'Leaking Faucet', room: '201-A', priority: 'Medium', status: 'In Progress' },
    { id: 'MT-092', issue: 'AC Not Cooling', room: '304-C', priority: 'High', status: 'Pending' },
  ];

  const mockCheckInOut = [
    { type: 'Check-in', student: 'Emma Davis', room: '105-B', time: '14:00 Today' },
    { type: 'Check-out', student: 'Michael Chang', room: '412-A', time: '10:00 Today' },
  ];

  const mockPendingDocs = [
    { student: 'Liam Brown', missing: 'Rental Agreement' },
    { student: 'Olivia Taylor', missing: 'ID Proof' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Overview</h1>
        <div className="flex gap-2">
          <select 
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="text-sm border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 outline-none border"
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id.toString()}>{p.name}</option>
            ))}
          </select>
          <button className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-900 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{stat.name}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stat.value}</p>
                    {stat.change && (
                      <span className={`text-sm font-medium flex items-center ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Layout for details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* === ROW 1 === */}
        {/* Recent Bookings */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">Recent Bookings</h3>
              <Link href="/staff/bookings" className="text-sm text-blue-600 hover:text-blue-500 font-medium">View all</Link>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-950">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">ID</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">Student</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">Property & Room</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-900">
                  {recentBookings.length > 0 ? recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-gray-500 dark:text-gray-400">{b.id}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{b.student}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-gray-900 dark:text-gray-100">{b.property}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">{b.room !== 'Unassigned' && !b.room.startsWith('Room') ? `Room ${b.room}` : b.room}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          b.status === 'Checked In' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                          b.status === 'Pending Review' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                          'bg-blue-50 text-blue-700 ring-blue-700/10'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No recent bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Occupancy Snapshot / Floor Details */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 p-6 flex-1">
            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100 mb-4">
              {selectedPropertyId === 'all' ? 'Occupancy Snapshot' : 'Floor Occupancy'}
            </h3>
            
            {selectedPropertyId === 'all' ? (
              occupancySnapshot.length > 0 ? (
                <div className="space-y-4">
                  {occupancySnapshot.map(snap => (
                    <div key={snap.name}>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{snap.name}</span>
                        <span className="text-gray-900 dark:text-gray-100">{snap.percent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${snap.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No properties added yet.
                </div>
              )
            ) : (
              <div className="space-y-4">
                {floorStats.map(fs => {
                  const percent = fs.totalBeds > 0 ? Math.round((fs.filledBeds / fs.totalBeds) * 100) : 0;
                  return (
                    <div key={fs.floor}>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Floor {fs.floor}</span>
                        <span className="text-gray-900 dark:text-gray-100">{fs.filledBeds} / {fs.totalBeds} Beds ({percent}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* === ROW 2 === */}
        {/* Payment Collection */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 p-6 flex-1">
            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Financials
            </h3>
            <div className="mb-6">
              <div className="flex justify-between text-sm font-medium mb-1">
                <span className="text-gray-700 dark:text-gray-300">Collection Status</span>
                <span className="text-green-600">{collectionStatus}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${collectionStatus}%` }}></div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overdue Payments</h4>
              {overduePayments.length > 0 ? overduePayments.map((due, idx) => (
                <div key={idx} className="flex justify-between items-center bg-red-50/50 p-2 rounded border border-red-100">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{due.student}</div>
                    <div className="text-xs text-red-600">{due.days}</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{due.amount}</div>
                </div>
              )) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-2 text-center">No overdue payments</div>
              )}
            </div>
          </div>
        </div>

        {/* Today's Check-ins & Check-outs */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col flex-1">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Today's Schedule
              </h3>
            </div>
            <div className="divide-y divide-gray-100 flex-1 flex flex-col justify-center">
              {mockCheckInOut.map((item, idx) => (
                <div key={idx} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{item.student}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Room {item.room}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${item.type === 'Check-in' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                      {item.type}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Maintenance */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col flex-1">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Maintenance
              </h3>
            </div>
            <div className="divide-y divide-gray-100 flex-1 flex flex-col justify-center">
              {mockMaintenance.map(mt => (
                <div key={mt.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{mt.issue}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Room {mt.room}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${mt.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {mt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === ROW 3 === */}
        {/* Quick Actions */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 flex-1">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">Quick Actions</h3>
            </div>
            <div className="p-2 space-y-1">
              <Link href="/staff/students/add" className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 rounded-md">Register New Student</Link>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 rounded-md">Create Maintenance Ticket</button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 rounded-md">Review Pending Documents</button>
            </div>
          </div>
        </div>

        {/* Pending Documents */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 p-6 flex-1">
            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Action Required
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockPendingDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-950 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{doc.student}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Missing: <span className="font-medium text-gray-700 dark:text-gray-300">{doc.missing}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
