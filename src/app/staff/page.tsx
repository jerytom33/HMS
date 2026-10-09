'use client';

import { Users, Building2, Bed, CreditCard, ArrowUpRight, ArrowDownRight, MoreHorizontal, Wrench, Calendar, FileText, AlertCircle, Mail, DollarSign, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { bookingPayments, rentPaymentRows } from '@/lib/bookingPayments';
import { monthlyRent, rentSchedule, warsawDate } from '@/lib/rent';
import { formatPLN } from '@/lib/currency';
import { occupancy, occupancyPercent } from '@/lib/occupancy';

export default function AdminDashboard() {
  const [properties, setProperties] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  // Bed holds and calls from the bot and the portal (v1-bot-bookings)
  const [bookings, setBookings] = useState<any[]>([]);
  // Monthly rent payments recorded on the Rent page
  const [rentPayments, setRentPayments] = useState<any[]>([]);
  // Payments typed in on the Payments page (kept in this browser)
  const [manualPayments, setManualPayments] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  useEffect(() => {
    const json = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null)).catch(() => null);
    json('/api/v1-properties?limit=1000&depth=0').then((d) => d?.docs && setProperties(d.docs));
    json('/api/v1-room-overrides?limit=2000&depth=0').then((d) => d?.docs && setOverrides(d.docs));
    json('/api/v1-bot-bookings?limit=2000&depth=0&sort=-createdAt').then((d) => d?.docs && setBookings(d.docs));
    json('/api/v1-rent-payments?limit=10000&depth=0').then((d) => d?.docs && setRentPayments(d.docs));
    try {
      const saved = localStorage.getItem('hms_payments');
      if (saved) setManualPayments(JSON.parse(saved));
    } catch {}
  }, []);

  // Live bed occupancy from the database, for all properties or the chosen one
  const occ = useMemo(
    () => occupancy(properties, overrides, bookings.filter((b) => b.type === 'bed_hold' && b.status === 'held')),
    [properties, overrides, bookings],
  );
  const selectedOcc = selectedPropertyId === 'all' ? null : occ.properties.find((p) => p.id === selectedPropertyId) || null;
  const shown = selectedOcc || occ.total;
  const totalBeds = shown.totalBeds;
  const filledBeds = shown.takenBeds;
  const occupancySnapshot = occ.properties.map((p) => ({ name: p.name, percent: occupancyPercent(p), takenBeds: p.takenBeds, totalBeds: p.totalBeds, heldBeds: p.heldBeds }));
  const floorStats = selectedOcc?.floors || [];
  const occupancyPercentValue = occupancyPercent(shown);

  const selectedPropertyName = selectedPropertyId === 'all'
    ? 'all'
    : properties.find(p => p.id.toString() === selectedPropertyId)?.name || 'all';

  const unitsByKey = useMemo(() => Object.fromEntries(overrides.map((o) => [o.overrideKey, o])), [overrides]);
  const payments = [...bookingPayments(bookings, unitsByKey), ...rentPaymentRows(rentPayments), ...manualPayments];

  // Monthly rent of tenants with an agreement (see the Rent page)
  const today = warsawDate();
  const rentRows = bookings
    .filter((b) => b.type === 'bed_hold' && b.status === 'paid' && (selectedPropertyId === 'all' || String(b.propertyId) === selectedPropertyId))
    .map((b) => rentSchedule(b, monthlyRent(b, unitsByKey[b.overrideKey]), rentPayments, today))
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const rentOverdue = rentRows.filter((s) => s.overdue.length > 0);
  const rentDueSoon = rentRows.filter((s) => s.next?.status === 'due');
  const filteredPayments = selectedPropertyName === 'all'
    ? payments
    : payments.filter(p => p.property === selectedPropertyName);

  const totalRentRevenue = filteredPayments
    .filter(p => p.status === 'Completed' && p.type === 'Rent')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Deposits are refundable, so they are shown apart from rent revenue
  const totalDeposits = filteredPayments
    .filter(p => p.status === 'Completed' && p.type === 'Deposit')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const rentStat = {
    name: 'Rent Overdue',
    value: `${rentOverdue.length}`,
    note: `${formatPLN(rentOverdue.reduce((s, r) => s + r.overdueAmount, 0))} overdue · ${rentDueSoon.length} due in 7 days`,
    change: '',
    trend: 'up',
  };

  const stats = [
    { name: 'Occupied Beds', value: `${filledBeds} / ${totalBeds}`, note: shown.heldBeds ? `${shown.heldBeds} on hold, awaiting payment` : '', change: '', trend: 'up' },
    { name: 'Total Occupancy', value: `${occupancyPercentValue}%`, note: '', change: '', trend: 'up' },
    { name: 'Vacant Beds', value: (totalBeds - filledBeds).toString(), note: '', change: '', trend: 'up' },
    { name: 'Total Rent Revenue', value: formatPLN(totalRentRevenue, { decimals: true }), note: '', change: '', trend: 'up' },
    { name: 'Total Deposits', value: formatPLN(totalDeposits, { decimals: true }), note: 'Received, refundable', change: '', trend: 'up' },
  ];

  const BOOKING_STATUS: Record<string, string> = { held: 'On hold', paid: 'Paid', cancelled: 'Cancelled' };
  const recentBookings = bookings
    .filter((b) => b.type === 'bed_hold' && (selectedPropertyId === 'all' || String(b.propertyId) === selectedPropertyId))
    .slice(0, 4)
    .map((b) => ({
      id: b.ref,
      student: b.name || `+${b.whatsapp}`,
      property: b.hostel || '–',
      room: [b.room, b.bed].filter(Boolean).join(', ') || '–',
      status: BOOKING_STATUS[b.status] || b.status,
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
        amount: formatPLN(Number(p.amount), { decimals: true }),
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...stats, rentStat].map((stat) => (
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
                  {stat.note && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{stat.note}</p>}
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
                        <div className="text-gray-500 dark:text-gray-400 text-xs">{b.room}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          b.status === 'Paid' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                          b.status === 'On hold' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
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
                        <span className="text-gray-900 dark:text-gray-100">{snap.takenBeds} / {snap.totalBeds} beds ({snap.percent}%)</span>
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
                  const percent = occupancyPercent(fs);
                  return (
                    <div key={fs.name}>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{fs.name}</span>
                        <span className="text-gray-900 dark:text-gray-100">{fs.takenBeds} / {fs.totalBeds} Beds ({percent}%)</span>
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
